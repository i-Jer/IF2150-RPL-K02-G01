# SeaGuard: one image serving the API, the web client and the app update channel.
# Build context: src/   (deployed with `railway up` from src/)

# --- 1. web client + OTA bundle -------------------------------------------
FROM node:22-bookworm-slim AS web
WORKDIR /app/web
COPY web/package.json web/package-lock.json ./
RUN npm ci --no-audit --no-fund --ignore-scripts
COPY web/ ./
RUN npx vite build && node scripts/make-bundle.mjs /app/bundle-out

# --- 2. API server ----------------------------------------------------------
FROM node:22-bookworm-slim
ENV NODE_ENV=production
WORKDIR /app/server
COPY server/package.json server/package-lock.json ./
RUN npm ci --omit=dev --no-audit --no-fund
COPY server/ ./
COPY --from=web /app/web/dist /app/web/dist
COPY --from=web /app/bundle-out/ /app/server/release/
EXPOSE 8080
USER node
CMD ["node", "src/server.js"]
