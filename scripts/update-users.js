import "dotenv/config";
import { Sequelize } from "sequelize";
import { defineModels } from "../server/models.js";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error("DATABASE_URL no definida en .env");
  setTimeout(() => process.exit(1), 1000);
}

const sequelize = new Sequelize(databaseUrl, {
  dialect: "postgres",
  dialectOptions: {
    ssl: {
      require: true,
      rejectUnauthorized: false,
    },
  },
  logging: console.log,
});

const { Usuario } = defineModels(sequelize);

async function run() {
  try {
    await sequelize.authenticate();
    console.log("Conectado a la base de datos.");

    // 1. Eliminar al docente "FAJARDO DE LA CRUZ LUIS JHON"
    const deleteCount = await Usuario.destroy({
      where: {
        nombre: "FAJARDO DE LA CRUZ LUIS JHON",
        rol: "Docente"
      }
    });
    console.log(`Usuarios docentes eliminados: ${deleteCount}`);

    // 2. Modificar el nombre del admin a "FAJARDO DE LA CRUZ LUIS JHON"
    const [updateCount] = await Usuario.update(
      { nombre: "FAJARDO DE LA CRUZ LUIS JHON" },
      {
        where: {
          rol: "Administrador"
        }
      }
    );
    console.log(`Usuarios administradores modificados: ${updateCount}`);

  } catch (error) {
    console.error("Error ejecutando la actualización:", error);
  } finally {
    await sequelize.close();
  }
}

run();
