import "dotenv/config";
import { Sequelize } from "sequelize";
import path from "path";
import { fileURLToPath } from "url";
import { defineModels } from "../server/models.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const databaseUrl = process.env.DATABASE_URL;
const dbPath = process.env.DB_PATH || path.join(__dirname, "..", "db", "innova.sqlite");

if (!databaseUrl) {
  console.error("❌ DATABASE_URL no está definida. Define la URL de conexión a PostgreSQL en .env");
  process.exit(1);
}

// SQLite source
const sqliteSequelize = new Sequelize({
  dialect: "sqlite",
  storage: dbPath,
  logging: false,
});

// PostgreSQL target
const postgresSequelize = new Sequelize(databaseUrl, {
  dialect: "postgres",
  dialectOptions: {
    ssl: {
      require: true,
      rejectUnauthorized: false,
    },
  },
  pool: {
    max: 5,
    min: 0,
    acquire: 30000,
    idle: 10000,
  },
  logging: false,
});

async function migrate() {
  try {
    console.log("🔌 Conectando a SQLite:", dbPath);
    const sqliteModels = defineModels(sqliteSequelize);

    console.log("🔌 Conectando a PostgreSQL...");
    const postgresModels = defineModels(postgresSequelize);

    console.log("📦 Sincronizando tablas en PostgreSQL...");
    await postgresSequelize.sync({ force: true });

    const mappings = [
      { name: "Usuarios", sqlite: sqliteModels.Usuario, postgres: postgresModels.Usuario },
      { name: "Recursos", sqlite: sqliteModels.Recurso, postgres: postgresModels.Recurso },
      { name: "Tutorials", sqlite: sqliteModels.Tutorial, postgres: postgresModels.Tutorial },
      { name: "Noticia", sqlite: sqliteModels.Noticia, postgres: postgresModels.Noticia },
    ];

    for (const { name, sqlite, postgres } of mappings) {
      const rows = await sqlite.findAll({ raw: true });
      if (rows.length > 0) {
        await postgres.bulkCreate(rows, { validate: false });
        console.log(`✅ ${name}: ${rows.length} registros migrados.`);
      } else {
        console.log(`⚪ ${name}: sin registros para migrar.`);
      }
    }

    console.log("\n🎉 Migración completada exitosamente.");
  } catch (err) {
    console.error("❌ Error durante la migración:", err.message);
    console.error(err.stack);
    process.exit(1);
  } finally {
    await sqliteSequelize.close();
    await postgresSequelize.close();
  }
}

migrate();
