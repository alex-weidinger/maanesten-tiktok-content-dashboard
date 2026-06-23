# Production image for the TikTok dashboard.
# Used by Coolify (and runnable locally). Postgres is a SEPARATE resource —
# this image only needs a DATABASE_URL at runtime. No docker-compose.

# ── Base ─────────────────────────────────────────────────────────────────────
FROM node:22-bookworm-slim AS base
WORKDIR /app
# OpenSSL is required by Prisma's query engine.
RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*
ENV NEXT_TELEMETRY_DISABLED=1

# ── Dependencies ─────────────────────────────────────────────────────────────
FROM base AS deps
COPY package.json package-lock.json ./
# Skip postinstall (prisma generate) here — the schema isn't present yet.
# `npm run build` runs prisma generate in the build stage below.
RUN npm ci --ignore-scripts

# ── Build ────────────────────────────────────────────────────────────────────
FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# `npm run build` runs `prisma generate && next build`.
RUN npm run build

# ── Runner ───────────────────────────────────────────────────────────────────
FROM base AS runner
ENV NODE_ENV=production
ENV PORT=3000
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/.next ./.next
COPY --from=build /app/public ./public
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/src ./src
COPY --from=build /app/scripts ./scripts
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/tsconfig.json ./tsconfig.json
COPY docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod +x ./docker-entrypoint.sh

EXPOSE 3000
CMD ["./docker-entrypoint.sh"]
