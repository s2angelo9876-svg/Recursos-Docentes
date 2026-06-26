import "dotenv/config";
import express from "express";
import cors from "cors";
import multer from "multer";
import path from "path";
import fs from "fs";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import rateLimit from "express-rate-limit";
import { fileURLToPath } from "url";
import { Sequelize } from "sequelize";
import { defineModels } from "./server/models.js";
import { uploadFile, deleteFile, isStorageEnabled } from "./server/services/storage.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;
const SECRET_KEY = process.env.JWT_SECRET || "innova-bandera-secret-key-2026";
const isProduction = process.env.NODE_ENV === "production";

if (isProduction && !process.env.JWT_SECRET) {
  console.error("❌ JWT_SECRET es obligatorio en producción. Defínalo en .env");
  process.exit(1);
}

// CORS & parse JSON
app.use(cors({
  origin: isProduction
    ? (process.env.CORS_ORIGIN || "").split(",").map((o) => o.trim()).filter(Boolean)
    : true,
  credentials: true,
}));
app.use(express.json());

// Initialize database connection (PostgreSQL via DATABASE_URL or SQLite fallback)
function createSequelizeInstance() {
  const databaseUrl = process.env.DATABASE_URL;

  if (databaseUrl) {
    console.log("🔌 Conectando a PostgreSQL (DATABASE_URL detectada).");
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

  console.log("🔌 Conectando a SQLite (DATABASE_URL no definida).");
  return new Sequelize({
    dialect: "sqlite",
    storage: process.env.DB_PATH || path.join(__dirname, "db", "innova.sqlite"),
    logging: false,
  });
}

const sequelize = createSequelizeInstance();

// Ensure uploads folder exists
const uploadDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}
app.use("/uploads", express.static(uploadDir));

// --- SEQUELIZE SCHEMA DEFINITIONS ---

const { Usuario, Recurso, Tutorial, Noticia } = defineModels(sequelize);

// --- AUDITED AUTHENTICATION MIDDLEWARE ---

function authenticateToken(req, res, next) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  console.log(`\n--- [AUDIT] Petición entrante: ${req.method} ${req.path} ---`);
  console.log(`[AUDIT] Cabecera Authorization: ${authHeader ? "SÍ" : "NO"}`);
  console.log(`[AUDIT] Token (15 chars): ${token ? token.substring(0, 15) + "..." : "Nulo"}`);

  if (!token) {
    console.log(`[AUDIT] ❌ Denegado: Token ausente en cabecera.`);
    if (req.file) {
      fs.unlink(req.file.path, () => { });
      console.log(`[AUDIT] Archivo subido temporal eliminado por falta de token.`);
    }
    return res.status(401).json({ error: "Token de sesión no proporcionado." });
  }

  jwt.verify(token, SECRET_KEY, (err, decodedUser) => {
    if (err) {
      console.log(`[AUDIT] ❌ Denegado: Falló validación JWT (${err.message})`);
      if (req.file) {
        fs.unlink(req.file.path, () => { });
        console.log(`[AUDIT] Archivo subido temporal eliminado por token inválido/expirado.`);
      }
      return res.status(403).json({ error: "Token de sesión inválido o expirado." });
    }
    console.log(`[AUDIT] ✅ Verificado: Usuario=${decodedUser.usuario} | Rol=${decodedUser.rol}`);
    req.user = decodedUser;
    next();
  });
}

function requireRole(roles) {
  return (req, res, next) => {
    const userRol = req.user ? req.user.rol : "Nulo";
    console.log(`[AUDIT] Roles requeridos: ${JSON.stringify(roles)} | Rol de Usuario: ${userRol}`);

    if (!req.user || !roles.includes(req.user.rol)) {
      console.log(`[AUDIT] ❌ Denegado: Rol no coincide con permisos requeridos.`);
      if (req.file) {
        fs.unlink(req.file.path, () => { });
        console.log(`[AUDIT] Archivo subido temporal eliminado por falta de rol autorizado.`);
      }
      return res.status(403).json({ error: "No tienes permisos suficientes para esta acción." });
    }
    console.log(`[AUDIT] ✅ Autorizado: Rol coincide con permisos.`);
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
  return originalName.replace(/[^a-zA-Z0-9.-]/g, "_");
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

app.post("/api/auth/register", authenticateToken, requireRole(["Administrador"]), async (req, res) => {
  try {
    const { nombre, usuario, contrasenia, contrasena, password, rol } = req.body;
    const passwordInput = contrasenia || contrasena || password;

    if (!nombre || !usuario || !passwordInput || !rol) {
      return res.status(400).json({ error: "Por favor, complete todos los campos obligatorios." });
    }
    if (passwordInput.length < 6) {
      return res.status(400).json({ error: "La contraseña debe tener al menos 6 caracteres." });
    }
    if (!["Docente", "Invitado"].includes(rol)) {
      return res.status(400).json({ error: "El rol solo puede ser Docente o Invitado." });
    }
    const hash = bcrypt.hashSync(passwordInput, 10);
    const user = await Usuario.create({ nombre, usuario, contrasenia: hash, rol });
    res.status(201).json({ success: true, user: { id: user.id, usuario: user.usuario, rol: user.rol } });
  } catch (err) {
    if (err.name === "SequelizeUniqueConstraintError") {
      return res.status(400).json({ error: "El nombre de usuario ya está registrado." });
    }
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
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put("/api/auth/users/:id/password", authenticateToken, requireRole(["Administrador"]), async (req, res) => {
  try {
    const { id } = req.params;
    const { contrasenia, contrasena, password } = req.body;
    const passwordInput = contrasenia || contrasena || password;

    if (!passwordInput) {
      return res.status(400).json({ error: "La nueva contraseña es requerida." });
    }
    if (passwordInput.length < 6) {
      return res.status(400).json({ error: "La contraseña debe tener al menos 6 caracteres." });
    }

    const user = await Usuario.findByPk(id);
    if (!user) {
      return res.status(404).json({ error: "Usuario no encontrado" });
    }

    const hash = bcrypt.hashSync(passwordInput, 10);
    user.contrasenia = hash;
    await user.save();

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/auth/login", loginLimiter, async (req, res) => {
  try {
    const { usuario, contrasenia } = req.body;

    // 1. Validar campos obligatorios
    if (!usuario || !contrasenia) {
      return res.status(400).json({ success: false, error: "Usuario y contraseña requeridos." });
    }

    // 2. Buscar en la base de datos SQLite
    const user = await Usuario.findOne({ where: { usuario } });

    if (!user) {
      return res.status(401).json({ success: false, error: "El usuario no se encuentra registrado." });
    }

    // 3. Comparar contraseña usando bcrypt de forma síncrona
    const passwordValido = bcrypt.compareSync(contrasenia, user.contrasenia);
    if (!passwordValido) {
      return res.status(401).json({ success: false, error: "La contraseña es incorrecta." });
    }

    // 4. Generar un JWT real firmado para el ecosistema de la app
    const token = jwt.sign(
      { id: user.id, usuario: user.usuario, nombre: user.nombre, rol: user.rol },
      SECRET_KEY,
      { expiresIn: "24h" }
    );

    // 5. Responder estructuradamente al AppContext del frontend
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
    console.error("Error crítico en el login:", error);
    return res.status(500).json({ success: false, error: "Error en el servidor de base de datos." });
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

app.post("/api/recursos", authenticateToken, requireRole(["Administrador", "Docente"]), async (req, res) => {
  try {
    const resource = await Recurso.create(req.body);
    res.status(201).json(resource);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put("/api/recursos/:id", authenticateToken, requireRole(["Administrador", "Docente"]), async (req, res) => {
  try {
    const { id } = req.params;
    await Recurso.update(req.body, { where: { id } });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete("/api/recursos/:id", authenticateToken, requireRole(["Administrador", "Docente"]), async (req, res) => {
  try {
    const { id } = req.params;
    const resource = await Recurso.findByPk(id);
    if (!resource) return res.status(404).json({ error: "Recurso no encontrado" });

    await deleteFile(resource.url, uploadDir);

    const contentList = resource.contenidos || [];
    for (const item of contentList) {
      await deleteFile(item.url, uploadDir);
    }

    await resource.destroy();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- PROYECTOS / TUTORIALES ENDPOINTS ---

function getYouTubeId(url) {
  if (!url) return null;
  const patterns = [
    /(?:youtube\.com\/watch\?v=)([^&\s]+)/,
    /(?:youtu\.be\/)([^?\s]+)/,
    /(?:youtube\.com\/embed\/)([^?\s]+)/,
    /(?:youtube\.com\/shorts\/)([^?\s]+)/,
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m) return m[1];
  }
  return null;
}

const VALID_AUDIENCIAS = ["docente", "estudiante", "ambos"];

function validateTutorialPayload(body) {
  const { titulo, area, desc, url, audiencia } = body;
  if (!titulo || !area || !desc) {
    return "Título, área y descripción son obligatorios.";
  }
  if (!url || !getYouTubeId(url)) {
    return "Debe proporcionar un enlace válido de YouTube.";
  }
  if (audiencia && !VALID_AUDIENCIAS.includes(audiencia)) {
    return "Audiencia inválida. Use: docente, estudiante o ambos.";
  }
  return null;
}

app.get("/api/tutoriales", async (req, res) => {
  try {
    const list = await Tutorial.findAll({ order: [["id", "DESC"]] });
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/tutoriales", authenticateToken, requireRole(["Administrador", "Docente"]), async (req, res) => {
  try {
    const validationError = validateTutorialPayload(req.body);
    if (validationError) return res.status(400).json({ error: validationError });

    const tutorial = await Tutorial.create({
      titulo: req.body.titulo,
      area: req.body.area,
      desc: req.body.desc,
      url: req.body.url,
      audiencia: req.body.audiencia || "ambos",
    });
    res.status(201).json(tutorial);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put("/api/tutoriales/:id", authenticateToken, requireRole(["Administrador", "Docente"]), async (req, res) => {
  try {
    const validationError = validateTutorialPayload(req.body);
    if (validationError) return res.status(400).json({ error: validationError });

    const { id } = req.params;
    await Tutorial.update({
      titulo: req.body.titulo,
      area: req.body.area,
      desc: req.body.desc,
      url: req.body.url,
      audiencia: req.body.audiencia || "ambos",
    }, { where: { id } });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete("/api/tutoriales/:id", authenticateToken, requireRole(["Administrador", "Docente"]), async (req, res) => {
  try {
    const { id } = req.params;
    await Tutorial.destroy({ where: { id } });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- NOTICIAS ENDPOINTS ---

app.get("/api/noticias", async (req, res) => {
  try {
    const list = await Noticia.findAll({ order: [["id", "DESC"]] });
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/noticias", authenticateToken, requireRole(["Administrador"]), async (req, res) => {
  try {
    const news = await Noticia.create({
      ...req.body,
      fecha: new Date().toLocaleDateString("es-ES", {
        day: "2-digit",
        month: "short",
        year: "numeric"
      })
    });
    res.status(201).json(news);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put("/api/noticias/:id", authenticateToken, requireRole(["Administrador"]), async (req, res) => {
  try {
    const { id } = req.params;
    await Noticia.update(req.body, { where: { id } });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete("/api/noticias/:id", authenticateToken, requireRole(["Administrador"]), async (req, res) => {
  try {
    const { id } = req.params;
    await Noticia.destroy({ where: { id } });
    res.json({ success: true });
  } catch (err) {
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
      console.log(`[AUDIT] ❌ Subida fallida: Multer no capturó ningún archivo.`);
      return res.status(400).json({ error: "No se envió ningún archivo" });
    }

    try {
      const filename = generateFileName(req.file.originalname);
      const result = await uploadFile(req.file.buffer, filename, req.file.mimetype, uploadDir);
      console.log(`[AUDIT] ✅ Subida exitosa: Archivo=${result.filename} (${req.file.size} bytes) | Storage=${result.storage}`);
      res.json({ success: true, url: result.url, filename: result.filename });
    } catch (uploadErr) {
      console.error("[AUDIT] ❌ Error al guardar archivo:", uploadErr.message);
      res.status(500).json({ error: uploadErr.message });
    }
  });
});

// Helper for recursive directory copy
function copyDirSync(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (let entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDirSync(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

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

    const isPostgres = sequelize.getDialect() === "postgres";

    if (isPostgres) {
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
    } else {
      // Copy SQLite database file
      const dbPath = sequelize.options.storage || path.join(__dirname, "db", "innova.sqlite");
      if (fs.existsSync(dbPath)) {
        fs.copyFileSync(dbPath, path.join(currentBackupDir, "innova.sqlite"));
      }
    }

    // Copy local uploads folder (if files are still stored locally)
    const uploadsSource = path.join(__dirname, "uploads");
    if (fs.existsSync(uploadsSource)) {
      copyDirSync(uploadsSource, path.join(currentBackupDir, "uploads"));
    }

    console.log(`[AUDIT] ✅ Copia de seguridad generada con éxito en: ${currentBackupDir}`);
    res.json({ success: true, folder: `backups/respaldo_${timestamp}` });
  } catch (err) {
    console.error("Error al generar copia de seguridad:", err);
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

// --- PRODUCTION: serve Vite build ---
if (isProduction) {
  const distPath = path.join(__dirname, "dist");
  app.use(express.static(distPath));
  app.get("/{*splat}", (req, res) => {
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

sequelize.sync()
  .then(async () => {
    console.log("🔋 Base de datos sincronizada.");

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

      console.log("👥 Usuario administrador único creado.");
    }

    const seedData = loadSeedData();

    if (await Recurso.count() === 0 && seedData.recursos.length > 0) {
      await Recurso.bulkCreate(seedData.recursos);
      console.log(`📚 ${seedData.recursos.length} recursos de ejemplo cargados.`);
    }

    if (await Tutorial.count() === 0 && seedData.tutoriales.length > 0) {
      await Tutorial.bulkCreate(seedData.tutoriales);
      console.log(`🎓 ${seedData.tutoriales.length} tutoriales de ejemplo cargados.`);
    }

    if (await Noticia.count() === 0 && seedData.noticias.length > 0) {
      await Noticia.bulkCreate(seedData.noticias);
      console.log(`📰 ${seedData.noticias.length} noticias de ejemplo cargadas.`);
    }

    app.listen(PORT, "0.0.0.0", () => {
      console.log(`🚀 SERVIDOR ACTIVO EN PUERTO ${PORT}`);
    });

  })
  .catch(err => {
    console.error("❌ Error al sincronizar:", err);
  });