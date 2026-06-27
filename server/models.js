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
    grados: { type: DataTypes.JSON, allowNull: false, defaultValue: [] },
    tipo: { type: DataTypes.STRING, allowNull: false },
    desc: { type: DataTypes.TEXT, allowNull: false },
    url: { type: DataTypes.STRING, allowNull: true, defaultValue: "" },
    contenidos: { type: DataTypes.JSON, defaultValue: [] },
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

  const AuditoriaSesion = sequelize.define("AuditoriaSesion", {
    usuarioId: { type: DataTypes.INTEGER, allowNull: true },
    usuarioNombre: { type: DataTypes.STRING, allowNull: true },
    usuario: { type: DataTypes.STRING, allowNull: true },
    rol: { type: DataTypes.STRING, allowNull: true },
    accion: { type: DataTypes.STRING, allowNull: false },
    entidad: { type: DataTypes.STRING, allowNull: true },
    entidadId: { type: DataTypes.INTEGER, allowNull: true },
    detalle: { type: DataTypes.TEXT, allowNull: true },
    ip: { type: DataTypes.STRING, allowNull: true },
    userAgent: { type: DataTypes.TEXT, allowNull: true },
    exito: { type: DataTypes.BOOLEAN, defaultValue: true },
  });

  return { Usuario, Recurso, Tutorial, Noticia, AuditoriaSesion };
}
