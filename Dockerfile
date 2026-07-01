# Build stage
FROM node:20-alpine AS build

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# Production stage
FROM node:22-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY --from=build /app/dist ./dist
COPY server.js db.json ./
COPY server ./server
COPY scripts ./scripts

# Asegurar que existan las carpetas
RUN mkdir -p uploads backups db

# Variables de entorno para PRODUCCIÓN
ENV PORT=10000
ENV NODE_ENV=production
ENV DB_PATH=/app/db/innova.sqlite

# Exponer el mismo puerto configurado arriba
EXPOSE 10000

CMD ["node", "server.js"]
