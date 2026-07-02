import "dotenv/config";
import express from "express";
import cors from "cors";
import multer from "multer";
import path from "path";
import fs from "fs";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import { fileURLToPath } from "url";
import { Sequelize, Op } from "sequelize";
import { defineModels } from "./server/models.js";
import * as XLSX from "xlsx";
import { uploadFile, deleteFile } from "./server/services/storage.js";
import logger from "./server/services/logger.js";
import { validateBody } from "./server/middleware.js";
import {
  recursoSchema,
  tutorialSchema,
  noticiaSchema,
  usuarioSchema,
  passwordUpdateSchema,
} from "./server/validators.js";
import {
  setAuditoriaModel,
  registrarAuditoria,
  auditoriaFromRequest,
  getClientIp,
  getUserAgent,
} from "./server/services/auditoria.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;
const SECRET_KEY = process.env.JWT_SECRET || "innova-bandera-secret-key-2026";
const isProduction = process.env.NODE_ENV === "production";

if (isProduction && !process.env.JWT_SECRET) {
  logger.error("❌ JWT_SECRET es obligatorio en producción. Defínalo en .env");
  // Le damos 1 segundo al logger para enviar el texto antes de salir
  setTimeout(() => process.exit(1), 1000);
}

const supabaseHost = process.env.SUPABASE_URL
  ? new URL(process.env.SUPABASE_URL).origin
  : null;

// Security headers
app.disable("x-powered-by");
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      frameSrc: ["'self'", "https://www.youtube.com", "https://youtube.com"],
      connectSrc: supabaseHost ? ["'self'", supabaseHost] : ["'self'"],
    },
  },
  crossOriginEmbedderPolicy: false,
}));

// CORS & parse JSON
app.use(cors({
  origin: isProduction
    ? (process.env.CORS_ORIGIN || "").split(",").map((o) => o.trim()).filter(Boolean)
    : true,
  credentials: true,
}));
app.use(express.json());

// --- RATE LIMITERS ---
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isProduction ? 200 : 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Demasiadas peticiones. Intente más tarde." },
});

const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Demasiadas subidas de archivos. Intente más tarde." },
});

const auditoriaLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Demasiadas consultas de auditoría. Intente más tarde." },
});

app.use("/api/", apiLimiter);
app.use("/api/upload", uploadLimiter);
app.use("/api/admin/auditoria", auditoriaLimiter);

// Initialize database connection (Supabase PostgreSQL)
function createSequelizeInstance() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    logger.error("❌ DATABASE_URL no está definida. Es obligatoria para conectar a Supabase PostgreSQL.");
    setTimeout(() => process.exit(1), 1000);
  }

  logger.info("🔌 Conectando a PostgreSQL (Supabase).");
  return new Sequelize(databaseUrl, {
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
}

const sequelize = createSequelizeInstance();

// --- SEQUELIZE SCHEMA DEFINITIONS ---

const { Usuario, Recurso, Tutorial, Noticia, AuditoriaSesion } = defineModels(sequelize);
setAuditoriaModel(AuditoriaSesion);

// --- AUDITED AUTHENTICATION MIDDLEWARE ---

function authenticateToken(req, res, next) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  logger.info(`[AUTH] Petición ${req.method} ${req.path}`, {
    hasAuthHeader: Boolean(authHeader),
    hasToken: Boolean(token),
    ip: getClientIp(req),
  });

  if (!token) {
    logger.info("[AUTH] Denegado: token ausente", { path: req.path, ip: getClientIp(req) });
    if (req.file) {
      fs.unlink(req.file.path, () => { });
      logger.info("[AUTH] Archivo temporal eliminado por falta de token");
    }
    return res.status(401).json({ error: "Token de sesión no proporcionado." });
  }

  jwt.verify(token, SECRET_KEY, (err, decodedUser) => {
    if (err) {
      logger.info(`[AUTH] Denegado: JWT inválido (${err.message})`, { path: req.path, ip: getClientIp(req) });
      if (req.file) {
        fs.unlink(req.file.path, () => { });
        logger.info("[AUTH] Archivo temporal eliminado por token inválido/expirado");
      }
      return res.status(403).json({ error: "Token de sesión inválido o expirado." });
    }
    logger.info(`[AUTH] Verificado: usuario=${decodedUser.usuario}, rol=${decodedUser.rol}`, {
      path: req.path,
      ip: getClientIp(req),
    });
    req.user = decodedUser;
    next();
  });
}

function requireRole(roles) {
  return (req, res, next) => {
    const userRol = req.user ? req.user.rol : "Nulo";
    logger.info("[AUTH] Verificando roles", {
      required: roles,
      userRol,
      path: req.path,
      ip: getClientIp(req),
    });

    if (!req.user || !roles.includes(req.user.rol)) {
      logger.info("[AUTH] Denegado: rol no autorizado", {
        required: roles,
        userRol,
        path: req.path,
        ip: getClientIp(req),
      });
      if (req.file) {
        fs.unlink(req.file.path, () => { });
        logger.info("[AUTH] Archivo temporal eliminado por falta de rol autorizado");
      }
      return res.status(403).json({ error: "No tienes permisos suficientes para esta acción." });
    }
    logger.info("[AUTH] Autorizado", { userRol, path: req.path, ip: getClientIp(req) });
    next();
  };
}

// --- MULTER STORAGE ENGINE ---
const ALLOWED_MIME_TYPES = [
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
  "video/mp4",
  "video/webm",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
];

function cleanFileName(originalName) {
  const name = path.basename(originalName || "archivo");
  const ext = path.extname(name).toLowerCase();
  let base = path.basename(name, ext).replace(/[^a-zA-Z0-9_-]/g, "_").substring(0, 100);
  if (!base) base = "archivo";
  return `${base}${ext}`;
}

function generateFileName(originalName) {
  return `${Date.now()}-${cleanFileName(originalName)}`;
}

const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Tipo de archivo no permitido: ${file.mimetype}`));
    }
  },
});

// --- AUTHENTICATION API ROUTES ---

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: "Demasiados intentos. Intente en 15 minutos." },
});

app.post("/api/auth/register", authenticateToken, requireRole(["Administrador"]), validateBody(usuarioSchema), async (req, res) => {
  try {
    const { nombre, usuario, contrasenia, contrasena, password, rol } = req.body;
    const passwordInput = contrasenia || contrasena || password;

    const hash = bcrypt.hashSync(passwordInput, 10);
    const user = await Usuario.create({ nombre, usuario, contrasenia: hash, rol });

    await auditoriaFromRequest(req, {
      usuarioId: req.user.id,
      usuarioNombre: req.user.nombre,
      usuario: req.user.usuario,
      rol: req.user.rol,
      accion: "USUARIO_CREADO",
      entidad: "usuario",
      entidadId: user.id,
      detalle: `Usuario "${usuario}" creado con rol ${rol}`,
      exito: true,
    });

    res.status(201).json({ success: true, user: { id: user.id, usuario: user.usuario, rol: user.rol } });
  } catch (err) {
    await auditoriaFromRequest(req, {
      usuarioId: req.user?.id,
      usuarioNombre: req.user?.nombre,
      usuario: req.user?.usuario,
      rol: req.user?.rol,
      accion: "USUARIO_CREADO",
      entidad: "usuario",
      detalle: `Error al crear usuario: ${err.message}`,
      exito: false,
    });

    if (err.name === "SequelizeUniqueConstraintError") {
      return res.status(400).json({ error: "El nombre de usuario ya está registrado." });
    }
    logger.error("Error al registrar usuario", { error: err.message, stack: err.stack });
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/auth/users", authenticateToken, requireRole(["Administrador"]), async (req, res) => {
  try {
    const list = await Usuario.findAll({
      attributes: ["id", "nombre", "usuario", "rol"],
      order: [["id", "DESC"]]
    });
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete("/api/auth/users/:id", authenticateToken, requireRole(["Administrador"]), async (req, res) => {
  try {
    const { id } = req.params;
    if (String(req.user.id) === String(id)) {
      return res.status(400).json({ error: "No puedes eliminar tu propio usuario administrador." });
    }
    const user = await Usuario.findByPk(id);
    if (!user) {
      return res.status(404).json({ error: "Usuario no encontrado" });
    }
    if (user.usuario === "admin") {
      return res.status(400).json({ error: "No se puede eliminar el usuario administrador principal." });
    }
    await user.destroy();

    await auditoriaFromRequest(req, {
      usuarioId: req.user.id,
      usuarioNombre: req.user.nombre,
      usuario: req.user.usuario,
      rol: req.user.rol,
      accion: "USUARIO_ELIMINADO",
      entidad: "usuario",
      entidadId: Number(id),
      detalle: `Usuario "${user.usuario}" eliminado`,
      exito: true,
    });

    res.json({ success: true });
  } catch (err) {
    logger.error("Error al eliminar usuario", { error: err.message, stack: err.stack });
    res.status(500).json({ error: err.message });
  }
});

app.put("/api/auth/users/:id/password", authenticateToken, requireRole(["Administrador"]), validateBody(passwordUpdateSchema), async (req, res) => {
  try {
    const { id } = req.params;
    const { contrasenia, contrasena, password } = req.body;
    const passwordInput = contrasenia || contrasena || password;

    const user = await Usuario.findByPk(id);
    if (!user) {
      return res.status(404).json({ error: "Usuario no encontrado" });
    }

    const hash = bcrypt.hashSync(passwordInput, 10);
    user.contrasenia = hash;
    await user.save();

    await auditoriaFromRequest(req, {
      usuarioId: req.user.id,
      usuarioNombre: req.user.nombre,
      usuario: req.user.usuario,
      rol: req.user.rol,
      accion: "CONTRASENA_ACTUALIZADA",
      entidad: "usuario",
      entidadId: Number(id),
      detalle: `Contraseña actualizada para usuario "${user.usuario}"`,
      exito: true,
    });

    res.json({ success: true });
  } catch (err) {
    logger.error("Error al actualizar contraseña", { error: err.message, stack: err.stack });
    res.status(500).json({ error: err.message });
  }
});

const uploadExcel = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }
});

app.post("/api/docentes/bulk-upload", authenticateToken, requireRole(["Administrador"]), uploadExcel.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No se ha proporcionado ningún archivo." });
    }

    const workbook = XLSX.read(req.file.buffer, { type: "buffer" });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];

    const rawRows = XLSX.utils.sheet_to_json(worksheet);

    if (rawRows.length === 0) {
      return res.status(400).json({ error: "El archivo Excel está vacío o no contiene filas válidas." });
    }

    const createdUsers = [];
    const duplicateUsers = [];
    const invalidRows = [];

    for (let i = 0; i < rawRows.length; i++) {
      const row = rawRows[i];

      const normalizedRow = {};
      for (const key of Object.keys(row)) {
        const normKey = key.trim().toUpperCase()
          .normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        normalizedRow[normKey] = row[key];
      }

      const nombre = normalizedRow["NOMBRES Y APELLIDOS"] ? String(normalizedRow["NOMBRES Y APELLIDOS"]).trim() : null;
      const dni = normalizedRow["DNI"] ? String(normalizedRow["DNI"]).trim() : null;
      const password = normalizedRow["PASSWORD"] ? String(normalizedRow["PASSWORD"]).trim() : null;
      const cargo = normalizedRow["CARGO"] ? String(normalizedRow["CARGO"]).trim() : null;
      const condicion = normalizedRow["CONDICION"] ? String(normalizedRow["CONDICION"]).trim() : null;
      const correo = normalizedRow["CORREO ELECTRONICO"] ? String(normalizedRow["CORREO ELECTRONICO"]).trim() : null;
      const celular = (normalizedRow["N° CELULAR"] || normalizedRow["N CELULAR"] || normalizedRow["CELULAR"] || normalizedRow["N°CELULAR"])
        ? String(normalizedRow["N° CELULAR"] || normalizedRow["N CELULAR"] || normalizedRow["CELULAR"] || normalizedRow["N°CELULAR"]).trim()
        : null;
      const area = normalizedRow["AREA"] ? String(normalizedRow["AREA"]).trim() : null;

      if (!nombre || !dni || !password) {
        invalidRows.push({
          rowNumber: i + 2,
          error: "Faltan campos obligatorios (NOMBRES Y APELLIDOS, DNI, o PASSWORD)."
        });
        continue;
      }

      if (dni.length < 3) {
        invalidRows.push({
          rowNumber: i + 2,
          error: "El DNI (usuario) debe tener al menos 3 caracteres."
        });
        continue;
      }

      if (password.length < 6) {
        invalidRows.push({
          rowNumber: i + 2,
          error: "La contraseña (password) debe tener al menos 6 caracteres."
        });
        continue;
      }

      const orConditions = [{ usuario: dni }];
      if (correo) {
        orConditions.push({ correo: correo });
      }

      const existingUser = await Usuario.findOne({
        where: {
          [Op.or]: orConditions
        }
      });

      if (existingUser) {
        duplicateUsers.push({
          rowNumber: i + 2,
          dni,
          correo,
          reason: existingUser.usuario === dni ? "El DNI ya está registrado como usuario." : "El correo electrónico ya existe."
        });
        continue;
      }

      const hash = bcrypt.hashSync(password, 10);

      const newUser = await Usuario.create({
        nombre,
        usuario: dni,
        contrasenia: hash,
        rol: "Docente",
        cargo,
        condicion,
        correo,
        celular,
        area
      });

      createdUsers.push(newUser);
    }

    await auditoriaFromRequest(req, {
      usuarioId: req.user.id,
      usuarioNombre: req.user.nombre,
      usuario: req.user.usuario,
      rol: req.user.rol,
      accion: "USUARIOS_CARGA_MASIVA",
      entidad: "usuario",
      detalle: `Carga masiva: creados ${createdUsers.length}, duplicados omitidos ${duplicateUsers.length}, inválidos omitidos ${invalidRows.length}`,
      exito: true,
    });

    res.status(200).json({
      success: true,
      message: `Carga masiva finalizada con éxito. Creados: ${createdUsers.length}, Duplicados: ${duplicateUsers.length}, Erróneos: ${invalidRows.length}.`,
      insertedCount: createdUsers.length,
      duplicateCount: duplicateUsers.length,
      invalidCount: invalidRows.length,
      duplicates: duplicateUsers,
      invalidRows: invalidRows
    });

  } catch (err) {
    logger.error("Error en carga masiva de docentes", { error: err.message, stack: err.stack });
    res.status(500).json({ error: `Error en el servidor al procesar el archivo: ${err.message}` });
  }
});

app.post("/api/auth/login", loginLimiter, async (req, res) => {
  const { usuario, contrasenia } = req.body;
  const clientIp = getClientIp(req);
  const userAgent = getUserAgent(req);

  try {
    // 1. Validar campos obligatorios
    if (!usuario || !contrasenia) {
      await registrarAuditoria({
        usuario: usuario || null,
        accion: "LOGIN_FALLIDO",
        detalle: "Campos de usuario o contraseña vacíos",
        ip: clientIp,
        userAgent,
        exito: false,
      });
      return res.status(400).json({ success: false, error: "Usuario y contraseña requeridos." });
    }

    // 2. Buscar en la base de datos
    const user = await Usuario.findOne({ where: { usuario } });

    if (!user) {
      await registrarAuditoria({
        usuario,
        accion: "LOGIN_FALLIDO",
        detalle: "Usuario no registrado",
        ip: clientIp,
        userAgent,
        exito: false,
      });
      return res.status(401).json({ success: false, error: "El usuario no se encuentra registrado." });
    }

    // 3. Comparar contraseña usando bcrypt de forma síncrona
    const passwordValido = bcrypt.compareSync(contrasenia, user.contrasenia);
    if (!passwordValido) {
      await registrarAuditoria({
        usuarioId: user.id,
        usuarioNombre: user.nombre,
        usuario: user.usuario,
        rol: user.rol,
        accion: "LOGIN_FALLIDO",
        detalle: "Contraseña incorrecta",
        ip: clientIp,
        userAgent,
        exito: false,
      });
      return res.status(401).json({ success: false, error: "La contraseña es incorrecta." });
    }

    // 4. Generar un JWT real firmado para el ecosistema de la app
    const token = jwt.sign(
      { id: user.id, usuario: user.usuario, nombre: user.nombre, rol: user.rol },
      SECRET_KEY,
      { expiresIn: "24h" }
    );

    // 5. Registrar auditoría de login exitoso
    await registrarAuditoria({
      usuarioId: user.id,
      usuarioNombre: user.nombre,
      usuario: user.usuario,
      rol: user.rol,
      accion: "LOGIN_EXITOSO",
      detalle: "Inicio de sesión exitoso",
      ip: clientIp,
      userAgent,
      exito: true,
    });

    // 6. Responder estructuradamente al AppContext del frontend
    return res.json({
      success: true,
      token: token,
      user: {
        usuario: user.usuario,
        nombre: user.nombre,
        rol: user.rol
      }
    });

  } catch (error) {
    logger.error("Error crítico en el login", { error: error.message, stack: error.stack, usuario, ip: clientIp });
    return res.status(500).json({ success: false, error: "Error en el servidor de base de datos." });
  }
});

app.post("/api/auth/logout", authenticateToken, async (req, res) => {
  try {
    await auditoriaFromRequest(req, {
      usuarioId: req.user.id,
      usuarioNombre: req.user.nombre,
      usuario: req.user.usuario,
      rol: req.user.rol,
      accion: "LOGOUT",
      detalle: "Cierre de sesión",
      exito: true,
    });
    res.json({ success: true });
  } catch (err) {
    logger.error("Error al registrar logout", { error: err.message, stack: err.stack });
    res.status(500).json({ error: err.message });
  }
});

// --- RECURSOS ENDPOINTS ---

app.get("/api/recursos", async (req, res) => {
  try {
    const list = await Recurso.findAll({ order: [["id", "DESC"]] });
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/recursos", authenticateToken, requireRole(["Administrador", "Docente"]), validateBody(recursoSchema), async (req, res) => {
  try {
    const resource = await Recurso.create(req.body);

    await auditoriaFromRequest(req, {
      usuarioId: req.user.id,
      usuarioNombre: req.user.nombre,
      usuario: req.user.usuario,
      rol: req.user.rol,
      accion: "RECURSO_CREADO",
      entidad: "recurso",
      entidadId: resource.id,
      detalle: `Recurso "${resource.titulo}" creado`,
      exito: true,
    });

    res.status(201).json(resource);
  } catch (err) {
    logger.error("Error al crear recurso", { error: err.message, stack: err.stack });
    res.status(500).json({ error: err.message });
  }
});

app.put("/api/recursos/:id", authenticateToken, requireRole(["Administrador", "Docente"]), validateBody(recursoSchema), async (req, res) => {
  try {
    const { id } = req.params;
    await Recurso.update(req.body, { where: { id } });

    await auditoriaFromRequest(req, {
      usuarioId: req.user.id,
      usuarioNombre: req.user.nombre,
      usuario: req.user.usuario,
      rol: req.user.rol,
      accion: "RECURSO_ACTUALIZADO",
      entidad: "recurso",
      entidadId: Number(id),
      detalle: `Recurso "${req.body.titulo}" actualizado`,
      exito: true,
    });

    res.json({ success: true });
  } catch (err) {
    logger.error("Error al actualizar recurso", { error: err.message, stack: err.stack });
    res.status(500).json({ error: err.message });
  }
});

app.delete("/api/recursos/:id", authenticateToken, requireRole(["Administrador", "Docente"]), async (req, res) => {
  try {
    const { id } = req.params;
    const resource = await Recurso.findByPk(id);
    if (!resource) return res.status(404).json({ error: "Recurso no encontrado" });

    await deleteFile(resource.url);

    const contentList = resource.contenidos || [];
    for (const item of contentList) {
      await deleteFile(item.url);
    }

    await resource.destroy();

    await auditoriaFromRequest(req, {
      usuarioId: req.user.id,
      usuarioNombre: req.user.nombre,
      usuario: req.user.usuario,
      rol: req.user.rol,
      accion: "RECURSO_ELIMINADO",
      entidad: "recurso",
      entidadId: Number(id),
      detalle: `Recurso "${resource.titulo}" eliminado`,
      exito: true,
    });

    res.json({ success: true });
  } catch (err) {
    logger.error("Error al eliminar recurso", { error: err.message, stack: err.stack });
    res.status(500).json({ error: err.message });
  }
});

// --- PROYECTOS / TUTORIALES ENDPOINTS ---

app.get("/api/tutoriales", async (req, res) => {
  try {
    const list = await Tutorial.findAll({ order: [["id", "DESC"]] });
    res.json(list);
  } catch (err) {
    logger.error("Error al listar tutoriales", { error: err.message, stack: err.stack });
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/tutoriales", authenticateToken, requireRole(["Administrador", "Docente"]), validateBody(tutorialSchema), async (req, res) => {
  try {
    const tutorial = await Tutorial.create({
      titulo: req.body.titulo,
      area: req.body.area,
      desc: req.body.desc,
      url: req.body.url,
      audiencia: req.body.audiencia || "ambos",
    });

    await auditoriaFromRequest(req, {
      usuarioId: req.user.id,
      usuarioNombre: req.user.nombre,
      usuario: req.user.usuario,
      rol: req.user.rol,
      accion: "TUTORIAL_CREADO",
      entidad: "tutorial",
      entidadId: tutorial.id,
      detalle: `Tutorial "${tutorial.titulo}" creado`,
      exito: true,
    });

    res.status(201).json(tutorial);
  } catch (err) {
    logger.error("Error al crear tutorial", { error: err.message, stack: err.stack });
    res.status(500).json({ error: err.message });
  }
});

app.put("/api/tutoriales/:id", authenticateToken, requireRole(["Administrador", "Docente"]), validateBody(tutorialSchema), async (req, res) => {
  try {
    const { id } = req.params;
    await Tutorial.update({
      titulo: req.body.titulo,
      area: req.body.area,
      desc: req.body.desc,
      url: req.body.url,
      audiencia: req.body.audiencia || "ambos",
    }, { where: { id } });

    await auditoriaFromRequest(req, {
      usuarioId: req.user.id,
      usuarioNombre: req.user.nombre,
      usuario: req.user.usuario,
      rol: req.user.rol,
      accion: "TUTORIAL_ACTUALIZADO",
      entidad: "tutorial",
      entidadId: Number(id),
      detalle: `Tutorial "${req.body.titulo}" actualizado`,
      exito: true,
    });

    res.json({ success: true });
  } catch (err) {
    logger.error("Error al actualizar tutorial", { error: err.message, stack: err.stack });
    res.status(500).json({ error: err.message });
  }
});

app.delete("/api/tutoriales/:id", authenticateToken, requireRole(["Administrador", "Docente"]), async (req, res) => {
  try {
    const { id } = req.params;
    const tutorial = await Tutorial.findByPk(id);
    if (!tutorial) return res.status(404).json({ error: "Tutorial no encontrado" });

    await Tutorial.destroy({ where: { id } });

    await auditoriaFromRequest(req, {
      usuarioId: req.user.id,
      usuarioNombre: req.user.nombre,
      usuario: req.user.usuario,
      rol: req.user.rol,
      accion: "TUTORIAL_ELIMINADO",
      entidad: "tutorial",
      entidadId: Number(id),
      detalle: `Tutorial "${tutorial.titulo}" eliminado`,
      exito: true,
    });

    res.json({ success: true });
  } catch (err) {
    logger.error("Error al eliminar tutorial", { error: err.message, stack: err.stack });
    res.status(500).json({ error: err.message });
  }
});

// --- NOTICIAS ENDPOINTS ---

app.get("/api/noticias", async (req, res) => {
  try {
    const list = await Noticia.findAll({ order: [["id", "DESC"]] });
    res.json(list);
  } catch (err) {
    logger.error("Error al listar noticias", { error: err.message, stack: err.stack });
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/noticias", authenticateToken, requireRole(["Administrador"]), validateBody(noticiaSchema), async (req, res) => {
  try {
    const news = await Noticia.create({
      ...req.body,
      fecha: new Date().toLocaleDateString("es-ES", {
        day: "2-digit",
        month: "short",
        year: "numeric"
      })
    });

    await auditoriaFromRequest(req, {
      usuarioId: req.user.id,
      usuarioNombre: req.user.nombre,
      usuario: req.user.usuario,
      rol: req.user.rol,
      accion: "NOTICIA_CREADA",
      entidad: "noticia",
      entidadId: news.id,
      detalle: `Noticia "${news.titulo}" creada`,
      exito: true,
    });

    res.status(201).json(news);
  } catch (err) {
    logger.error("Error al crear noticia", { error: err.message, stack: err.stack });
    res.status(500).json({ error: err.message });
  }
});

app.put("/api/noticias/:id", authenticateToken, requireRole(["Administrador"]), validateBody(noticiaSchema), async (req, res) => {
  try {
    const { id } = req.params;
    await Noticia.update(req.body, { where: { id } });

    await auditoriaFromRequest(req, {
      usuarioId: req.user.id,
      usuarioNombre: req.user.nombre,
      usuario: req.user.usuario,
      rol: req.user.rol,
      accion: "NOTICIA_ACTUALIZADA",
      entidad: "noticia",
      entidadId: Number(id),
      detalle: `Noticia "${req.body.titulo}" actualizada`,
      exito: true,
    });

    res.json({ success: true });
  } catch (err) {
    logger.error("Error al actualizar noticia", { error: err.message, stack: err.stack });
    res.status(500).json({ error: err.message });
  }
});

app.delete("/api/noticias/:id", authenticateToken, requireRole(["Administrador"]), async (req, res) => {
  try {
    const { id } = req.params;
    const news = await Noticia.findByPk(id);
    if (!news) return res.status(404).json({ error: "Noticia no encontrada" });

    await Noticia.destroy({ where: { id } });

    await auditoriaFromRequest(req, {
      usuarioId: req.user.id,
      usuarioNombre: req.user.nombre,
      usuario: req.user.usuario,
      rol: req.user.rol,
      accion: "NOTICIA_ELIMINADA",
      entidad: "noticia",
      entidadId: Number(id),
      detalle: `Noticia "${news.titulo}" eliminada`,
      exito: true,
    });

    res.json({ success: true });
  } catch (err) {
    logger.error("Error al eliminar noticia", { error: err.message, stack: err.stack });
    res.status(500).json({ error: err.message });
  }
});

// --- FILE UPLOAD ENDPOINT ---
app.post("/api/upload", authenticateToken, requireRole(["Administrador", "Docente"]), (req, res) => {
  upload.single("file")(req, res, async (err) => {
    if (err) {
      if (err instanceof multer.MulterError) {
        if (err.code === "LIMIT_FILE_SIZE") {
          return res.status(400).json({ error: "El archivo excede el límite de 10 MB." });
        }
        return res.status(400).json({ error: err.message });
      }
      if (err.message?.includes("Tipo de archivo no permitido")) {
        return res.status(400).json({ error: err.message });
      }
      return res.status(500).json({ error: err.message });
    }
    if (!req.file) {
      logger.info("[AUDIT] Subida fallida: Multer no capturó ningún archivo.");
      return res.status(400).json({ error: "No se envió ningún archivo" });
    }

    try {
      const filename = generateFileName(req.file.originalname);
      const result = await uploadFile(req.file.buffer, filename, req.file.mimetype);
      logger.info(`[AUDIT] Subida exitosa: Archivo=${result.filename} (${req.file.size} bytes) | Storage=${result.storage}`);
      res.json({ success: true, url: result.url, filename: result.filename });
    } catch (uploadErr) {
      logger.error("[AUDIT] Error al guardar archivo:", { error: uploadErr.message });
      res.status(500).json({ error: uploadErr.message });
    }
  });
});

// --- API BACKUP EXPORT ENDPOINT (Fase 5) ---
app.post("/api/admin/backup", authenticateToken, requireRole(["Administrador"]), async (req, res) => {
  try {
    const backupsDir = path.join(__dirname, "backups");
    if (!fs.existsSync(backupsDir)) {
      fs.mkdirSync(backupsDir, { recursive: true });
    }
    const timestamp = new Date().toISOString().replace(/[^a-zA-Z0-9]/g, "_");
    const currentBackupDir = path.join(backupsDir, `respaldo_${timestamp}`);
    fs.mkdirSync(currentBackupDir, { recursive: true });

    // Exportar datos a JSON para respaldo
    const [recursos, tutoriales, noticias] = await Promise.all([
      Recurso.findAll(),
      Tutorial.findAll(),
      Noticia.findAll(),
    ]);
    fs.writeFileSync(
      path.join(currentBackupDir, "data.json"),
      JSON.stringify({ recursos, tutoriales, noticias }, null, 2)
    );

    logger.info(`[AUDIT] Copia de seguridad generada: ${currentBackupDir}`);
    res.json({ success: true, folder: `backups/respaldo_${timestamp}` });
  } catch (err) {
    logger.error("Error al generar copia de seguridad:", { error: err.message, stack: err.stack });
    res.status(500).json({ error: "Fallo al generar copia de seguridad en el servidor." });
  }
});

// --- API BACKUP IMPORT ---
app.post("/api/import", authenticateToken, requireRole(["Administrador"]), async (req, res) => {
  try {
    const { recursos, tutoriales, proyectos, noticias } = req.body;
    const tutorialesImport = tutoriales || proyectos || [];

    await Recurso.destroy({ where: {} });
    await Tutorial.destroy({ where: {} });
    await Noticia.destroy({ where: {} });

    if (recursos && recursos.length > 0) await Recurso.bulkCreate(recursos);
    if (tutorialesImport.length > 0) await Tutorial.bulkCreate(tutorialesImport);
    if (noticias && noticias.length > 0) await Noticia.bulkCreate(noticias);

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- AUDITORÍA ENDPOINTS (Paso 8 + 10) ---

app.get("/api/admin/auditoria", authenticateToken, requireRole(["Administrador"]), auditoriaLimiter, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 50,
      accion,
      usuario,
      exito,
      desde,
      hasta,
    } = req.query;

    const where = {};
    if (accion) where.accion = accion;
    if (usuario) where.usuario = { [Op.like]: `%${usuario}%` };
    if (exito !== undefined && exito !== "") where.exito = exito === "true";
    if (desde || hasta) {
      where.createdAt = {};
      if (desde) where.createdAt[Op.gte] = new Date(desde);
      if (hasta) {
        const hastaDate = new Date(hasta);
        hastaDate.setHours(23, 59, 59, 999);
        where.createdAt[Op.lte] = hastaDate;
      }
    }

    const offset = (Number(page) - 1) * Number(limit);
    const { count, rows } = await AuditoriaSesion.findAndCountAll({
      where,
      order: [["createdAt", "DESC"]],
      limit: Number(limit),
      offset,
    });

    res.json({
      total: count,
      page: Number(page),
      pages: Math.ceil(count / Number(limit)),
      data: rows,
    });
  } catch (err) {
    logger.error("Error al listar auditoría", { error: err.message });
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/admin/auditoria/stats", authenticateToken, requireRole(["Administrador"]), auditoriaLimiter, async (req, res) => {
  try {
    const { desde, hasta } = req.query;
    const where = {};
    if (desde || hasta) {
      where.createdAt = {};
      if (desde) where.createdAt[Op.gte] = new Date(desde);
      if (hasta) {
        const hastaDate = new Date(hasta);
        hastaDate.setHours(23, 59, 59, 999);
        where.createdAt[Op.lte] = hastaDate;
      }
    }

    const [total, exitosos, fallidos, porAccion] = await Promise.all([
      AuditoriaSesion.count({ where }),
      AuditoriaSesion.count({ where: { ...where, exito: true } }),
      AuditoriaSesion.count({ where: { ...where, exito: false } }),
      AuditoriaSesion.findAll({
        where,
        attributes: [
          "accion",
          [sequelize.fn("COUNT", sequelize.col("accion")), "total"],
        ],
        group: ["accion"],
        order: [[sequelize.literal("total"), "DESC"]],
        raw: true,
      }),
    ]);

    res.json({ total, exitosos, fallidos, porAccion });
  } catch (err) {
    logger.error("Error al obtener estadísticas de auditoría", { error: err.message });
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/admin/auditoria/export-csv", authenticateToken, requireRole(["Administrador"]), auditoriaLimiter, async (req, res) => {
  try {
    const { desde, hasta, accion, usuario } = req.query;
    const where = {};
    if (accion) where.accion = accion;
    if (usuario) where.usuario = { [Op.like]: `%${usuario}%` };
    if (desde || hasta) {
      where.createdAt = {};
      if (desde) where.createdAt[Op.gte] = new Date(desde);
      if (hasta) {
        const hastaDate = new Date(hasta);
        hastaDate.setHours(23, 59, 59, 999);
        where.createdAt[Op.lte] = hastaDate;
      }
    }

    const rows = await AuditoriaSesion.findAll({
      where,
      order: [["createdAt", "DESC"]],
      limit: 10000,
      raw: true,
    });

    const escape = (v) => {
      if (v === null || v === undefined) return "";
      const s = String(v).replace(/"/g, '""');
      return `"${s}"`;
    };

    const headers = ["ID", "Fecha", "Accion", "Usuario", "Rol", "Entidad", "EntidadID", "Detalle", "IP", "Exito"];
    const csvRows = rows.map((r) => [
      r.id,
      escape(new Date(r.createdAt).toISOString()),
      escape(r.accion),
      escape(r.usuario),
      escape(r.rol),
      escape(r.entidad),
      r.entidadId ?? "",
      escape(r.detalle),
      escape(r.ip),
      r.exito ? "SI" : "NO",
    ].join(","));

    const csv = "\uFEFF" + [headers.join(","), ...csvRows].join("\n");
    const filename = `auditoria_${new Date().toISOString().split("T")[0]}.csv`;

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.send(csv);

    await auditoriaFromRequest(req, {
      usuarioId: req.user.id,
      usuarioNombre: req.user.nombre,
      usuario: req.user.usuario,
      rol: req.user.rol,
      accion: "AUDITORIA_EXPORTADA",
      detalle: `Exportación CSV de auditoría: ${rows.length} registros`,
      exito: true,
    });
  } catch (err) {
    logger.error("Error al exportar auditoría", { error: err.message });
    res.status(500).json({ error: err.message });
  }
});

// --- PRODUCTION: serve Vite build ---
if (isProduction) {
  const distPath = path.join(__dirname, "dist");
  app.use(express.static(distPath));
  app.use((req, res) => {
    res.sendFile(path.join(distPath, "index.html"));
  });
}

// --- DATA SEED AND LAUNCH ---

function omitId(obj) {
  const { id: _id, ...rest } = obj;
  return rest;
}

function loadSeedData() {
  const dbPath = path.join(__dirname, "db.json");
  if (fs.existsSync(dbPath)) {
    const raw = fs.readFileSync(dbPath, "utf-8");
    const data = JSON.parse(raw);
    return {
      recursos: (data.recursos || []).map(omitId),
      tutoriales: (data.tutoriales || data.proyectos || []).map(omitId),
      noticias: (data.noticias || []).map(omitId),
    };
  }
  return {
    recursos: SEED_RECURSOS,
    tutoriales: SEED_TUTORIALES,
    noticias: SEED_NOTICIAS,
  };
}

const SEED_RECURSOS = [
  {
    titulo: "Khan Academy - Matemáticas",
    area: "Matemática",
    grados: ["1.° Sec", "2.° Sec"],
    tipo: "Web / App",
    desc: "Plataforma interactiva para práctica de aritmética, álgebra y geometría con retroalimentación inmediata.",
    url: "https://es.khanacademy.org",
    contenidos: [
      { id: 101, titulo: "Página Principal Khan Academy", tipo: "url", url: "https://es.khanacademy.org" },
      { id: 102, titulo: "Práctica de Álgebra I", tipo: "url", url: "https://es.khanacademy.org/math/algebra" }
    ]
  },
  {
    titulo: "PhET Simulations - Física y Química",
    area: "Ciencia y Tecnología",
    grados: ["2.° Sec", "3.° Sec", "4.° Sec"],
    tipo: "Simulación",
    desc: "Simulaciones interactivas de física, química, biología y ciencias de la tierra desarrolladas por la Universidad de Colorado.",
    url: "https://phet.colorado.edu/es/",
    contenidos: [
      { id: 201, titulo: "Simulador: Estados de la Materia", tipo: "url", url: "https://phet.colorado.edu/sims/html/states-of-matter/latest/states-of-matter_es.html" },
      { id: 202, titulo: "Simulador: Ley de Ohm", tipo: "url", url: "https://phet.colorado.edu/sims/html/ohms-law/latest/ohms-law_es.html" }
    ]
  },
  {
    titulo: "Diccionario y Gramática - RAE",
    area: "Comunicación",
    grados: ["1.° Sec", "2.° Sec", "3.° Sec", "4.° Sec", "5.° Sec"],
    tipo: "Web / App",
    desc: "Recurso oficial de consulta gramatical, ortográfica y semántica de la Real Academia Española.",
    url: "https://www.rae.es",
    contenidos: [
      { id: 301, titulo: "Diccionario de la Lengua Española (DLE)", tipo: "url", url: "https://dle.rae.es" },
      { id: 302, titulo: "Consultas de Dudas Rápidas - RAE", tipo: "url", url: "https://www.rae.es/consultas-comunes" }
    ]
  }
];

const SEED_TUTORIALES = [
  {
    titulo: "Uso de Canva en el Aula",
    area: "Comunicación",
    desc: "Tutorial para docentes sobre diseño de materiales visuales con Canva Educación.",
    url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    audiencia: "docente",
  },
  {
    titulo: "Introducción a la Programación con Scratch",
    area: "Ciencia y Tecnología",
    desc: "Video introductorio para estudiantes sobre bloques de programación en Scratch.",
    url: "https://www.youtube.com/watch?v=VzPDL0L7sus",
    audiencia: "estudiante",
  },
  {
    titulo: "Herramientas TIC para la Evaluación Formativa",
    area: "Educación para el Trabajo",
    desc: "Recorrido por plataformas digitales útiles para evaluar el aprendizaje en el aula.",
    url: "https://www.youtube.com/watch?v=ysz5S6PUM-U",
    audiencia: "ambos",
  },
];

const SEED_NOTICIAS = [
  { fecha: "10 Jun 2026", titulo: "Inauguración del Repositorio Digital Innova Bandera", desc: "Lanzamos de manera oficial el nuevo centro de recursos digitales para la innovación pedagógica en el aula.", autor: "Dirección Académica" }
];

sequelize.sync({ alter: true })
  .then(async () => {
    logger.info("🔋 Base de datos sincronizada.");

    const userCount = await Usuario.count();

    if (userCount === 0) {
      await Usuario.bulkCreate([
        {
          nombre: "Administrador",
          usuario: "admin",
          contrasenia: bcrypt.hashSync("admin123", 10),
          rol: "Administrador"
        }
      ]);

      logger.info("👥 Usuario administrador único creado.");
    }

    const seedData = loadSeedData();

    if (await Recurso.count() === 0 && seedData.recursos.length > 0) {
      await Recurso.bulkCreate(seedData.recursos);
      logger.info(`📚 ${seedData.recursos.length} recursos de ejemplo cargados.`);
    }

    if (await Tutorial.count() === 0 && seedData.tutoriales.length > 0) {
      await Tutorial.bulkCreate(seedData.tutoriales);
      logger.info(`🎓 ${seedData.tutoriales.length} tutoriales de ejemplo cargados.`);
    }

    if (await Noticia.count() === 0 && seedData.noticias.length > 0) {
      await Noticia.bulkCreate(seedData.noticias);
      logger.info(`📰 ${seedData.noticias.length} noticias de ejemplo cargadas.`);
    }

    app.listen(PORT, "0.0.0.0", () => {
      logger.info(`🚀 Servidor activo en puerto ${PORT}`);
    });

  })
  .catch(err => {
    logger.error("❌ Error al sincronizar:", { error: err.message, stack: err.stack });
  });