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
  setTimeout(() => process.exit(1), 1000);
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

    function parseJsonField(value) {
      if (typeof value === "string") {
        try {
          return JSON.parse(value);
        } catch {
          return value;
        }
      }
      return value;
    }

    async function resetSequence(tableName) {
      try {
        await postgresSequelize.query(
          `SELECT setval(pg_get_serial_sequence('"${tableName}"', 'id'), coalesce(max(id), 1), max(id) IS NOT NULL) FROM "${tableName}";`
        );
      } catch (err) {
        console.warn(`⚠️  No se pudo actualizar la secuencia de ${tableName}: ${err.message}`);
      }
    }

    for (const { name, sqlite, postgres } of mappings) {
      const rows = await sqlite.findAll();
      const plainRows = rows.map((row) => {
        const data = row.toJSON();
        if (data.grados !== undefined) data.grados = parseJsonField(data.grados);
        if (data.contenidos !== undefined) data.contenidos = parseJsonField(data.contenidos);
        return data;
      });
      if (plainRows.length > 0) {
        await postgres.bulkCreate(plainRows, { validate: false });
        await resetSequence(name);
        console.log(`✅ ${name}: ${plainRows.length} registros migrados.`);
      } else {
        console.log(`⚪ ${name}: sin registros para migrar.`);
      }
    }

    console.log("\n🎉 Migración completada exitosamente.");
  } catch (err) {
    console.error("❌ Error durante la migración:", err.message);
    console.error(err.stack);
    setTimeout(() => process.exit(1), 1000);
  } finally {
    await sqliteSequelize.close();
    await postgresSequelize.close();
  }
}

migrate();
