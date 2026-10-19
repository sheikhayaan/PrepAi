# syntax=docker/dockerfile:1

# ---- dependencies -----------------------------------------------------------
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# ---- runtime ----------------------------------------------------------------
FROM node:20-alpine
ENV NODE_ENV=production
WORKDIR /app

# Run as an unprivileged user; the API never needs to write to its own tree.
RUN addgroup -S prepai && adduser -S prepai -G prepai

COPY --from=deps /app/node_modules ./node_modules
COPY package.json ./
COPY server.js ./
COPY src ./src

RUN chown -R prepai:prepai /app
USER prepai

EXPOSE 5000

# Liveness only: readiness is checked by the orchestrator against /health/ready.
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||5000)+'/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "server.js"]
