import { z } from "zod";

export const AREAS_CNEB = [
  "Matemática",
  "Comunicación",
  "Inglés",
  "Arte y Cultura",
  "Ciencias Sociales",
  "DPCC",
  "Educación Física",
  "Educación Religiosa",
  "Ciencia y Tecnología",
  "Educación para el Trabajo",
];

export const GRADOS = ["1.° Sec", "2.° Sec", "3.° Sec", "4.° Sec", "5.° Sec"];
export const TIPOS_RECURSO = ["Video", "Web / App", "PDF", "Simulación", "Juego", "Colección"];
export const AUDIENCIAS = ["docente", "estudiante", "ambos"];

const contenidoSchema = z.object({
  id: z.union([z.number(), z.string()]).optional(),
  titulo: z.string().min(1, "El título del material es obligatorio").max(200),
  tipo: z.enum(["url", "archivo"]),
  url: z.string().min(1, "La URL o ruta del material es obligatoria").max(1000),
  fileName: z.string().max(200).optional().nullable(),
});

export const recursoSchema = z.object({
  titulo: z.string().min(1, "El título es obligatorio").max(200),
  area: z.enum(AREAS_CNEB, { message: "Área curricular no válida" }),
  grados: z.array(z.enum(GRADOS)).min(1, "Selecciona al menos un grado"),
  tipo: z.enum(TIPOS_RECURSO, { message: "Tipo de recurso no válido" }),
  desc: z.string().min(1, "La descripción es obligatoria").max(3000),
  url: z.string().max(1000).optional().or(z.literal("")),
  contenidos: z.array(contenidoSchema).default([]),
});

export const tutorialSchema = z.object({
  titulo: z.string().min(1, "El título es obligatorio").max(200),
  area: z.enum(AREAS_CNEB, { message: "Área curricular no válida" }),
  desc: z.string().min(1, "La descripción es obligatoria").max(3000),
  url: z.string().min(1, "El enlace de YouTube es obligatorio").max(500),
  audiencia: z.enum(AUDIENCIAS, { message: "Audiencia no válida" }).default("ambos"),
});

export const noticiaSchema = z.object({
  titulo: z.string().min(1, "El título es obligatorio").max(200),
  desc: z.string().min(1, "La descripción es obligatoria").max(5000),
  autor: z.string().min(1, "El autor es obligatorio").max(100),
});

export const usuarioSchema = z.object({
  nombre: z.string().min(1, "El nombre es obligatorio").max(100),
  usuario: z.string().min(3, "El usuario debe tener al menos 3 caracteres").max(50),
  contrasenia: z.string().min(6).max(100).optional(),
  contrasena: z.string().min(6).max(100).optional(),
  password: z.string().min(6).max(100).optional(),
  rol: z.enum(["Docente", "Invitado"], { message: "Rol no válido" }),
}).refine((data) => {
  const pwd = data.contrasenia || data.contrasena || data.password;
  return pwd && pwd.length >= 6;
}, {
  message: "La contraseña es obligatoria y debe tener al menos 6 caracteres",
  path: ["contrasenia"],
});

export const passwordUpdateSchema = z.object({
  contrasenia: z.string().min(6).max(100).optional(),
  contrasena: z.string().min(6).max(100).optional(),
  password: z.string().min(6).max(100).optional(),
}).refine((data) => {
  const pwd = data.contrasenia || data.contrasena || data.password;
  return pwd && pwd.length >= 6;
}, {
  message: "La nueva contraseña es obligatoria y debe tener al menos 6 caracteres",
  path: ["contrasenia"],
});
