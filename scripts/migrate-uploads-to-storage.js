import "dotenv/config";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { Sequelize } from "sequelize";
import { defineModels } from "../server/models.js";
import { uploadFile, isStorageEnabled } from "../server/services/storage.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const uploadDir = path.join(__dirname, "..", "uploads");
const databaseUrl = process.env.DATABASE_URL;
const dbPath = process.env.DB_PATH || path.join(__dirname, "..", "db", "innova.sqlite");

if (!isStorageEnabled()) {
  console.error("❌ SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY deben estar definidos en .env");
  setTimeout(() => process.exit(1), 1000);
}

let sequelize;
if (databaseUrl) {
  sequelize = new Sequelize(databaseUrl, {
    dialect: "postgres",
    dialectOptions: {
      ssl: {
        require: true,
        rejectUnauthorized: false,
      },
    },
    pool: { max: 5, min: 0, acquire: 30000, idle: 10000 },
    logging: false,
  });
} else {
  sequelize = new Sequelize({
    dialect: "sqlite",
    storage: dbPath,
    logging: false,
  });
}

const { Recurso } = defineModels(sequelize);

function updateUrl(oldUrl, newUrl) {
  if (!oldUrl || !oldUrl.startsWith("/uploads/")) return oldUrl;
  return newUrl;
}

async function migrateUploads() {
  try {
    await sequelize.authenticate();
    console.log(`🔌 Conectado a ${databaseUrl ? "PostgreSQL" : "SQLite"}.`);

    const recursos = await Recurso.findAll();
    console.log(`📂 ${recursos.length} recursos encontrados.`);

    let migratedCount = 0;

    for (const recurso of recursos) {
      let changed = false;

      // URL principal
      if (recurso.url && recurso.url.startsWith("/uploads/")) {
        const fileName = recurso.url.replace("/uploads/", "");
        const filePath = path.join(uploadDir, fileName);

        if (fs.existsSync(filePath)) {
          const buffer = fs.readFileSync(filePath);
          const mimeType = "application/octet-stream";
          const result = await uploadFile(buffer, fileName, mimeType);
          recurso.url = result.url;
          changed = true;
          migratedCount++;
          console.log(`⬆️  Migrado: ${fileName} → ${result.url}`);
        } else {
          console.warn(`⚠️  Archivo no encontrado: ${filePath}`);
        }
      }

      // Contenidos anidados
      const contenidos = recurso.contenidos || [];
      for (const item of contenidos) {
        if (item.url && item.url.startsWith("/uploads/")) {
          const fileName = item.url.replace("/uploads/", "");
          const filePath = path.join(uploadDir, fileName);

          if (fs.existsSync(filePath)) {
            const buffer = fs.readFileSync(filePath);
            const mimeType = "application/octet-stream";
            const result = await uploadFile(buffer, fileName, mimeType);
            item.url = result.url;
            changed = true;
            migratedCount++;
            console.log(`⬆️  Migrado contenido: ${fileName} → ${result.url}`);
          } else {
            console.warn(`⚠️  Archivo no encontrado: ${filePath}`);
          }
        }
      }

      if (changed) {
        recurso.contenidos = contenidos;
        await recurso.save();
      }
    }

    console.log(`\n🎉 Migración de archivos completada. ${migratedCount} archivos migrados.`);
  } catch (err) {
    console.error("❌ Error durante la migración de archivos:", err.message);
    console.error(err.stack);
    setTimeout(() => process.exit(1), 1000);
  } finally {
    await sequelize.close();
  }
}

migrateUploads();
