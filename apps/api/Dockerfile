# PilotePME API — image de production (NestJS + Prisma 7 driver adapter pg).
# Prisma 7 utilise un driver adapter (@prisma/adapter-pg) → pas de moteur natif,
# donc pas besoin d'openssl : image `slim` suffit.

FROM node:22-slim AS base
RUN corepack enable
WORKDIR /app

# ── Dépendances (avec dev, pour build + prisma generate) ──
FROM base AS deps
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# ── Build (génère le client Prisma + compile Nest) ──
FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm prisma generate && pnpm build

# ── Runtime ──
FROM base AS runtime
ENV NODE_ENV=production
# Client Prisma généré + code compilé + schéma (pour `migrate deploy`).
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/prisma.config.ts ./prisma.config.ts
COPY package.json pnpm-lock.yaml ./

EXPOSE 4000
# Applique les migrations puis démarre l'API.
CMD ["sh", "-c", "pnpm db:deploy && node dist/main"]
