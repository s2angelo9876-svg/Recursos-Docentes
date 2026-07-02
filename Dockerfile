# Build stage
FROM node:22-alpine AS build

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# Production stage
FROM node:22-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY --from=build /app/dist ./dist
COPY server.js db.json ./
COPY server ./server
COPY scripts ./scripts

# Asegurar que existan las carpetas necesarias
RUN mkdir -p backups

ENV NODE_ENV=production

EXPOSE 10000

CMD ["node", "server.js"]
