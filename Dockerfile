# ──────────────────────────────────────────────────
# STRATO v21 — Multi-stage Docker Build
# Web proxy and game hub for school Chromebooks
# ──────────────────────────────────────────────────

# ── Stage 1: Build ──
FROM node:20-slim AS builder

# Install pnpm
RUN corepack enable && corepack prepare pnpm@9.15.4 --activate

WORKDIR /app

# Copy dependency manifests first for layer caching
COPY package.json pnpm-lock.yaml* package-lock.json* ./

# Install all dependencies (including devDependencies for postinstall)
RUN pnpm install --frozen-lockfile || npm ci

# Copy source and public assets
COPY . .

# Run setup-proxy.cjs — copies UV/SJ/Epoxy/BareMux assets into public/
RUN node scripts/setup-proxy.cjs

# ── Stage 2: Production ──
FROM node:20-slim AS production

LABEL description="STRATO v21 — Ultimate web proxy and game hub for school Chromebooks"
LABEL version="21.0.0"
LABEL license="GPL-3.0"
LABEL org.opencontainers.image.title="STRATO"
LABEL org.opencontainers.image.description="Web proxy and game hub with Ultraviolet, Scramjet, AI Tutor, Stealth Mode"
LABEL org.opencontainers.image.version="21.0.0"
LABEL org.opencontainers.image.licenses="GPL-3.0"

# Install dumb-init for proper signal handling
RUN apt-get update && \
    apt-get install -y --no-install-recommends dumb-init && \
    rm -rf /var/lib/apt/lists/*

# Create non-root user
RUN groupadd -r strato && useradd -r -g strato -d /app -s /sbin/nologin strato

WORKDIR /app

# Copy node_modules from builder (production deps only)
COPY --from=builder /app/node_modules ./node_modules

# Copy application source
COPY --from=builder /app/src ./src
COPY --from=builder /app/scripts ./scripts
COPY --from=builder /app/public ./public
COPY --from=builder /app/package.json ./

# Create data directory for persistent JSON database
RUN mkdir -p /app/data && chown -R strato:strato /app/data /app

# Switch to non-root user
USER strato

# Expose the application port
EXPOSE 8080

# Health check — hits /health endpoint every 30s
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD node -e "fetch('http://localhost:8080/health').then(r => { process.exit(r.ok ? 0 : 1); }).catch(() => process.exit(1));"

# Environment defaults
ENV NODE_ENV=production
ENV PORT=8080

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start the application
CMD ["node", "src/index.js"]
