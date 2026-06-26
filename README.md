# Innova Bandera — Repositorio TIC

Plataforma pedagógica institucional para la **I.E. Emblemática Bandera del Perú** (Pisco). Repositorio de recursos digitales organizados por competencias y áreas curriculares según el CNEB.

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

Abre [http://localhost:5173](http://localhost:5173). Las peticiones a `/api` y `/uploads` se redirigen al servidor automáticamente.

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
└── dist/             # Build de producción (generado con npm run build)
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
