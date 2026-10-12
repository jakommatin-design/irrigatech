FROM node:22-slim

WORKDIR /app

# Install native build tools for SQLite bindings
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    make \
    g++ \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Copy dependency specifications
COPY package*.json ./

# Install production dependencies
RUN npm install --omit=dev

# Copy server code
COPY . .

# Railway automatically assigns PORT environment variable
ENV PORT=3000
EXPOSE 3000

CMD ["node", "server.js"]
