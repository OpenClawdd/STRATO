FROM node:20-alpine

WORKDIR /app

# Install dependencies first (cached Docker layer)
COPY package.json pnpm-lock.yaml* ./
RUN corepack enable pnpm && pnpm install --frozen-lockfile || npm install

# Copy source code
COPY . .

# Expose port
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=3s \
  CMD wget -qO- http://localhost:8080/ || exit 1

# Start
CMD ["node", "src/index.js"]
