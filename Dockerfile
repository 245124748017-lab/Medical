# =======================================================
# Stage 1: Build Frontend
# =======================================================
FROM node:20-alpine AS frontend-builder
WORKDIR /app/frontend

COPY frontend/package*.json ./
RUN npm ci

COPY frontend/ ./
RUN npm run build

# =======================================================
# Stage 2: Production Server
# =======================================================
FROM node:20-alpine AS production
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=8080

# Install production dependencies for backend
COPY backend/package*.json ./backend/
RUN cd backend && npm ci --only=production

# Copy backend source
COPY backend/ ./backend/

# Copy built frontend assets into backend/public
COPY --from=frontend-builder /app/frontend/dist ./backend/public

# Ensure uploads directory exists
RUN mkdir -p ./backend/uploads

WORKDIR /app/backend

# Cloud Run injects PORT environment variable (default 8080)
EXPOSE 8080

CMD ["node", "server.js"]
