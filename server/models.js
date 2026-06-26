import { DataTypes } from "sequelize";

export function defineModels(sequelize) {
  const Usuario = sequelize.define("Usuario", {
    nombre: { type: DataTypes.STRING, allowNull: false },
    usuario: { type: DataTypes.STRING, allowNull: false, unique: true },
    contrasenia: { type: DataTypes.STRING, allowNull: false },
    rol: { type: DataTypes.STRING, allowNull: false }, // "Administrador", "Docente", "Invitado"
  });

  const Recurso = sequelize.define("Recurso", {
    titulo: { type: DataTypes.STRING, allowNull: false },
    area: { type: DataTypes.STRING, allowNull: false },
    grados: {
      type: DataTypes.TEXT,
      allowNull: false,
      get() {
        const raw = this.getDataValue("grados");
        return raw ? JSON.parse(raw) : [];
      },
      set(val) {
        this.setDataValue("grados", JSON.stringify(val));
      }
    },
    tipo: { type: DataTypes.STRING, allowNull: false },
    desc: { type: DataTypes.TEXT, allowNull: false },
    url: { type: DataTypes.STRING, allowNull: true, defaultValue: "" },
    contenidos: {
      type: DataTypes.TEXT,
      defaultValue: "[]",
      get() {
        const raw = this.getDataValue("contenidos");
        return raw ? JSON.parse(raw) : [];
      },
      set(val) {
        this.setDataValue("contenidos", JSON.stringify(val));
      }
    }
  });

  const Tutorial = sequelize.define("Tutorial", {
    titulo: { type: DataTypes.STRING, allowNull: false },
    area: { type: DataTypes.STRING, allowNull: false },
    desc: { type: DataTypes.TEXT, allowNull: false },
    url: { type: DataTypes.STRING, allowNull: false },
    audiencia: { type: DataTypes.STRING, defaultValue: "ambos" }, // "docente" | "estudiante" | "ambos"
  });

  const Noticia = sequelize.define("Noticia", {
    fecha: { type: DataTypes.STRING, allowNull: false },
    titulo: { type: DataTypes.STRING, allowNull: false },
    desc: { type: DataTypes.TEXT, allowNull: false },
    autor: { type: DataTypes.STRING, allowNull: false },
  });

  return { Usuario, Recurso, Tutorial, Noticia };
}
