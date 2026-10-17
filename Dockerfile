# syntax=docker/dockerfile:1

# ============================================================================
# Isabella GenesisAI — Imagen de produccion (Cluster E: packaging & Kubernetes)
#
# state: draft | auto_generated
# Nota de transparencia (AGENTS.md): archivo generado por motor; PENDIENTE de
# revision humana antes de declarar estado "verified" o "wired".
#
# Correcciones respecto de la version previa:
#   - Base Node alineada con engines ">=22 <24"? No: package.json declara
#     engines.node = "24.x"; la base pasa de node:22-alpine a node:24-alpine.
#   - Entrypoint real: `node dist/server.js` (bundle ESM de esbuild, verificado
#     por scripts/runtime-smoke.mjs). El runtime ya no usa el ejecutor TypeScript.
#   - Dependencias de runtime: `pnpm install --prod` (sin devDependencies).
#   - No se copia el archivo de workspace de pnpm: no existe en el repositorio.
#   - La etapa de build usa `pnpm run build:dist` (compila + bundle) y por tanto
#     NO requiere `scripts/` ni `test/` dentro del contexto .dockerignore.
#   - Se copian los activos leidos en runtime por process.cwd(): src/ui, src/styles y src/assets.
#   - Sin HEALTHCHECK Docker: distroless no aporta wget/curl; la autoridad de salud
#     la ejerce Kubernetes (probes en k8s/deployment.yaml y deploy/k8s/).
#   - BLOCKED_ENVIRONMENT (ISA-349/355): fijar digests de las bases con
#     `crane digest` contra el registry de destino antes de promover.
# ============================================================================

# ----------------------------------------------------------------------------
# Stage 1 — build (tipos + bundle ESM)
# ----------------------------------------------------------------------------
FROM node:24-alpine AS build

ENV PNPM_HOME=/pnpm
ENV PATH="$PNPM_HOME:$PATH"
WORKDIR /app

RUN corepack enable

COPY package.json pnpm-lock.yaml ./
RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store \
    pnpm install --frozen-lockfile

COPY tsconfig.json tsconfig.build.json ./
COPY src ./src

RUN pnpm run build:dist

# ----------------------------------------------------------------------------
# Stage 2 — production dependencies (hoisted, sin symlinks)
# ----------------------------------------------------------------------------
FROM node:24-alpine AS production-deps

ENV PNPM_HOME=/pnpm
ENV PATH="$PNPM_HOME:$PATH"
WORKDIR /app

RUN corepack enable

COPY package.json pnpm-lock.yaml ./
RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store \
    pnpm install --frozen-lockfile --prod --config.node-linker=hoisted

# ----------------------------------------------------------------------------
# Stage 3 — runtime (distroless)
# ----------------------------------------------------------------------------
# BLOCKED_ENVIRONMENT (ISA-349): resolver y fijar el digest de esta imagen contra
# el registry de destino. Aqui se usa el tag; NO promover sin `@sha256:...`.
FROM gcr.io/distroless/nodejs24-debian12 AS runtime

ENV NODE_ENV=production
ENV PORT=3000
WORKDIR /app

# dist/ contiene dist/server.js (bundle ESM) generado por `build:dist`.
COPY --from=build /app/dist ./dist
# Activos leidos en runtime via process.cwd(): CSS e interfaz.
COPY --from=build /app/src/ui ./src/ui
COPY --from=build /app/src/styles ./src/styles
# Intro de video (src/assets/video): sin esta copia la ruta /assets/video/* respondia 404 en la imagen (AUD-16).
COPY --from=build /app/src/assets ./src/assets
COPY package.json ./
# Solo dependencias de runtime (express, ws, ai, @ai-sdk/gateway, @google/genai).
COPY --from=production-deps /app/node_modules ./node_modules

USER 10001
EXPOSE 3000

# ENTRYPOINT de distroless = /nodejs/bin/node; CMD son los argumentos.
CMD ["dist/server.js"]
