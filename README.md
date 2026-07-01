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
*   **Persistencia:** Gestionado con Sequelize ORM. Se conecta a una base de datos PostgreSQL alojada en Supabase en producción, y cuenta con un fallback local mediante SQLite para entornos offline o locales.
*   **Almacenamiento:** Los archivos subidos se guardan opcionalmente en Supabase Storage (en la nube) o de manera local en el disco del servidor (`uploads/`).

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

Abre [http://localhost:5173](http://localhost:5173). Las peticiones a `/api` y `/uploads` se rediriguen al servidor automáticamente.

## Producción

Genera el build y sirve todo desde un único proceso Express:

```bash
npm run prod
```

Abre [http://localhost:5000](http://localhost:5000) (o la IP de la máquina en la red escolar).

**Importante:** En producción, define un `JWT_SECRET` seguro en `.env`. Sin él, el servidor no arrancará.

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
| `DATABASE_URL`              | URL de conexión a PostgreSQL (ej. Supabase)      | —                          |
| `DB_PATH`                   | Ruta a SQLite (fallback si no hay DATABASE_URL)  | `./db/innova.sqlite`       |
| `SUPABASE_URL`              | URL del proyecto Supabase (Storage)              | —                          |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key para Supabase Storage           | —                          |

Consulta [`.env.example`](.env.example) para la plantilla.

## Estructura del proyecto

```
Recursos/
├── src/              # Frontend React + Vite
├── server.js         # Backend Express + SQLite/PostgreSQL
├── db.json           # Datos de ejemplo (seed al primer arranque)
├── server/           # Modelos y servicios compartidos
├── scripts/          # Scripts de utilidad (migración, etc.)
├── db/               # Base de datos SQLite (solo en modo SQLite)
├── uploads/          # Archivos subidos por el CMS (fallback local)
├── dist/             # Build de producción (generado con npm run build)
```

## Migración SQLite → PostgreSQL

1. Configura `DATABASE_URL` en tu `.env` con la URL de Supabase.
2. Asegúrate de que `DB_PATH` apunte a la base de datos SQLite de origen.
3. Ejecuta el script de migración:

```bash
node scripts/migrate-sqlite-to-postgres.js
```

El script creará las tablas en PostgreSQL y migrará `Usuarios`, `Recursos`, `Tutorials` y `Noticia`.

## Migración de archivos a Supabase Storage

Si configuras `SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY`, los archivos subidos se almacenarán en Supabase Storage. Para migrar archivos existentes de `uploads/`:

```bash
node scripts/migrate-uploads-to-storage.js
```

Si no configuras Storage, los archivos seguirán guardándose en disco local (`uploads/`).

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
