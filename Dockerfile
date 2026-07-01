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

# Ensure volume directories exist
RUN mkdir -p uploads backups db

# Set env variables
ENV PORT=5000
ENV NODE_ENV=production
ENV DB_PATH=/app/db/innova.sqlite

EXPOSE 5000

CMD ["node", "server.js"]
