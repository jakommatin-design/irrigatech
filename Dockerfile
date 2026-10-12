FROM node:20-slim

WORKDIR /app

# Install native build tools for SQLite and native modules
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    make \
    g++ \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Copy backend dependencies
COPY server/package*.json ./

# Install backend production dependencies
RUN npm install --omit=dev

# Copy backend application source
COPY server/ ./

# Railway dynamically injects PORT environment variable
ENV PORT=3000
EXPOSE 3000

CMD ["node", "server.js"]
