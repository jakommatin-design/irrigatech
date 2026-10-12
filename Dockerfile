# ─── Stage 1: Build React Frontend ──────────────────────────────
FROM node:22-slim AS frontend-builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# ─── Stage 2: Production IoT Server & Static Host ───────────────
FROM node:22-slim
WORKDIR /app

# Install native build tools for SQLite bindings
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    make \
    g++ \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Install backend production dependencies
WORKDIR /app/server
COPY server/package*.json ./
RUN npm install --omit=dev

# Copy server application code
COPY server/ ./

# Copy built frontend from Stage 1
COPY --from=frontend-builder /app/dist /app/dist

# Railway automatically injects PORT
ENV PORT=3000
EXPOSE 3000

CMD ["node", "server.js"]
