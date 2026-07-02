# Innova Bandera — Repositorio TIC

Plataforma pedagógica institucional para la **I.E. Emblemática Bandera del Perú** (Pisco). Repositorio de recursos digitales organizados por competencias y áreas curriculares según el CNEB.

## ¿Cómo funciona la plataforma?

La plataforma está diseñada para facilitar el acceso y la gestión de recursos educativos digitales y capacitaciones en Tecnologías de la Información y Comunicación (TIC). Funciona a través de las siguientes secciones y características:

### 1. Secciones del Sistema
*   **Inicio (Portada):** Un banner de bienvenida centrado y dinámico que introduce el propósito del portal y ofrece accesos directos a las principales herramientas.
*   **Recursos Pedagógicos:** Repositorio estructurado por áreas (Matemática, Ciencia, Comunicación, etc.) y grados (de 1.° a 5.° de secundaria). Contiene guías, enlaces externos y archivos descargables.
*   **Tutoriales TIC:** Biblioteca interactiva de videotutoriales integrados con YouTube. Al ingresar, se le pide al usuario seleccionar si accede como **Docente** o **Estudiante**, lo que filtra automáticamente la audiencia objetiva del contenido.
*   **Noticias y Comunicados:** Sección informativa sobre eventos, talleres de capacitación docente y comunicados del Área de Innovación Pedagógica (AIP).
*   **Gestión (Panel de Administración):** Panel restringido para administradores que permite auditar las acciones del sistema, monitorizar sesiones y gestionar el catálogo completo.

### 2. Control de Acceso y Roles
El sistema maneja tres perfiles diferenciados:
*   **Administrador:** Control total de la plataforma. Puede crear, editar y eliminar recursos, tutoriales, noticias y usuarios, además de visualizar los logs de auditoría en tiempo real.
*   **Docente:** Puede subir, modificar o eliminar recursos pedagógicos en la sección de recursos. Tiene acceso de lectura a los tutoriales y noticias (sin permisos de edición).
*   **Invitado / Estudiante:** Acceso exclusivo de consulta y lectura a recursos y tutoriales aptos para alumnos.

### 3. Funcionamiento Técnico y Arquitectura
*   **Frontend:** Desarrollado en React, estructurado con Vite para máxima velocidad, estilizado con Tailwind CSS, y enriquecido con animaciones fluidas utilizando Framer Motion.
*   **Backend:** Servidor API RESTful construido en Express.js con protección Helmet y Rate Limiting para asegurar la estabilidad.
*   **Persistencia:** Gestionado con Sequelize ORM. Se conecta a una base de datos PostgreSQL alojada en Supabase.
*   **Almacenamiento:** Los archivos subidos se guardan en Supabase Storage.

---

## Requisitos

- Node.js 18 o superior
- npm

## Instalación

```bash
npm install
cp .env.example .env   # Windows: copy .env.example .env
```

## Desarrollo

Inicia el frontend (Vite en `:5173`) y el backend (Express en `:5000`) en paralelo:

```bash
npm run dev
```

Abre [http://localhost:5173](http://localhost:5173). Las peticiones a `/api` se rediriguen al servidor automáticamente.

## Producción

Genera el build y sirve todo desde un único proceso Express:

```bash
npm run prod
```

Abre [http://localhost:5000](http://localhost:5000) (o la IP de la máquina en la red escolar).

**Importante:** En producción, define un `JWT_SECRET` seguro en `.env`. Sin él, el servidor no arrancará.

## Despliegue separado (Render + Vercel)

Este proyecto puede desplegarse con el backend en Render y el frontend en Vercel.

### Backend en Render

1. Crea un Web Service en Render apuntando a tu repositorio.
2. Configura el Start Command: `npm start`.
3. Añade las variables de entorno necesarias (ver tabla más abajo).
4. Asegúrate de que `CORS_ORIGIN` incluya el dominio de Vercel:
   ```
   CORS_ORIGIN=https://recursos-docentes-aip.vercel.app,http://localhost:5173
   ```

### Frontend en Vercel

1. Importa el mismo repositorio en Vercel.
2. Framework preset: **Vite**.
3. Build command: `npm run build`.
4. Output directory: `dist`.
5. Añade la variable de entorno:
   ```env
   VITE_API_URL=https://recursos-docentes.onrender.com
   ```
6. El archivo `vercel.json` contiene el catch-all SPA para que React Router funcione.
7. Tras el deploy, actualiza `CORS_ORIGIN` en Render con el dominio que Vercel te asigne y redeploya el backend.

## Usuarios de prueba

| Usuario   | Contraseña   | Rol             |
|-----------|--------------|-----------------|
| admin     | admin123     | Administrador   |
| carlos    | carlos123    | Docente         |
| maria     | maria123     | Docente         |
| invitado  | invitado123  | Invitado        |

Cambia estas contraseñas antes de desplegar en un entorno real.

## Variables de entorno

| Variable                    | Descripción                                      | Default (dev)              |
|-----------------------------|--------------------------------------------------|----------------------------|
| `JWT_SECRET`                | Clave para firmar tokens JWT                     | Obligatorio en producción  |
| `PORT`                      | Puerto del servidor Express                      | `5000`                     |
| `NODE_ENV`                  | `development` o `production`                     | `development`              |
| `CORS_ORIGIN`               | Orígenes permitidos en prod (separados por coma) | `http://localhost:5173`    |
| `DATABASE_URL`              | URL de conexión a PostgreSQL (Supabase)          | —                          |
| `SUPABASE_URL`              | URL del proyecto Supabase (Storage)              | —                          |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key para Supabase Storage           | —                          |
| `SUPABASE_STORAGE_BUCKET`   | Nombre del bucket de Supabase Storage            | `recursos-uploads`         |

Consulta [`.env.example`](.env.example) para la plantilla.

## Estructura del proyecto

```
Recursos/
├── src/              # Frontend React + Vite
├── server.js         # Backend Express + PostgreSQL/Supabase
├── db.json           # Datos de ejemplo (seed al primer arranque)
├── server/           # Modelos y servicios compartidos
├── scripts/          # Scripts de utilidad
├── backups/          # Respaldos JSON generados por el admin
├── dist/             # Build de producción (generado con npm run build)
```

## Notas sobre Supabase (plan gratuito)

- Base de datos: 500 MB.
- Almacenamiento: 1 GB.
- Transferencia: 2 GB/mes.
- Conexiones: usa el **Transaction Pooler** (puerto `6543`) para no agotarlas.

## Scripts disponibles

| Comando          | Descripción                              |
|------------------|------------------------------------------|
| `npm run dev`    | Desarrollo con hot reload                |
| `npm run build`  | Compila el frontend a `dist/`            |
| `npm run start`  | Servidor en modo producción              |
| `npm run prod`   | Build + start en un solo paso            |
| `npm run lint`   | Ejecuta ESLint                           |
