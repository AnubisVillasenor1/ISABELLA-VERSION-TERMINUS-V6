# Isabella Villaseñor AI — Génesis Ω∞ · Terminus V6 · TAMV ONLINE NETWORK

Isabella es un **Runtime Web Operativo y Sistema Federado de Inteligencia Artificial Gobernada (FGAIS)** construido, propiedad y creado por **Edwin Oswaldo Castillo Trejo (Anubis Villaseñor)** bajo la marca **TAMV ONLINE ENTERPRISE**. No es un chatbot: es un runtime con gobernanza determinista, memoria jerárquica, un motor de inferencia propio que **orquesta** LLM externos (no es un modelo fundacional entrenado por TAMV), RAG soberano, herramientas allowlisted, habilidades ejecutables, auditoría criptográfica y un sistema nativo de análisis audio-espectral en tiempo real: el **TAMV Kaos Audio System**.

> Estado del repositorio: `draft | engine-generated` hasta revisión humana nominal. No se declara conciencia, autonomía jurídica ni autoridad propia.
>
> Propiedad y uso: ver [`LICENSE`](LICENSE) y [`NOTICE.md`](NOTICE.md). La licencia publicada es **propietaria, con todos los derechos reservados**.

## Contrato de evidencia

```text
SPECIFIED ≠ IMPLEMENTED ≠ TESTED ≠ PRODUCTION
CAPABILITY ≠ AUTHORITY ≠ EXECUTION ≠ EVIDENCE
```

Ningún documento, tabla o respuesta de API puede elevar una categoría a otra. El inventario de rutas (`docs/api/route-inventory.json`), el canon Ω∞ (`src/platform/omega-canon.ts`) y las auditorías de `src/infinity/` declaran la madurez real de cada capacidad, y hay pruebas que fallan si una cifra inventada reaparece.

## Superficie HTTP (339 rutas registradas)

### Gobernanza y runtime
- `GET /api/v1/nexus`, `GET /api/v1/nexus/health` — runtime Nexus (grafo, agente, workflows, cuántica local).
- `GET /api/v1/status`, `GET /api/v1/readyz` — readiness y salud de dependencias.
- `GET /api/v1/ops/preflight` — preflight de configuración (token-gated).

### Agent Mesh ISABELLA CERO (fusión 2026-11-01)
- `GET /api/v1/agents/mesh` — matriz de 10 roles (`planner, researcher, architect, coder, tester, reviewer, security, devops, creative, operator`).
- `POST /api/v1/agents/mesh/evaluate` — evaluación `ALLOW/DENY/ESCALATE`. `executionPerformed` siempre `false`; la aprobación se deriva de un bearer administrativo verificado en el servidor, nunca del cuerpo HTTP.

### ISABELLA VILLASEÑOR AI™ — Master Consolidated (`src/infinity/`)
- `GET /api/v1/infinity` — resumen, catálogo, skills, media, build, evolución, design tokens, i18n, accesibilidad y auditoría.
- `POST /api/v1/infinity/constitution/evaluate` — evalúa `ALLOW/DENY`; no autoriza.
- `POST /api/v1/infinity/skills/run` — ejecuta una de las 10 skills nativas deterministas (sin red, `externalCalls: 0`).
- `POST /api/v1/infinity/media/evaluate` — media sin modificar píxeles ni usar la red (cull, estilo, retoque, galería, cotización, face-index + aliases Aftershoot).
- `POST /api/v1/infinity/build/plan` — plan de workspace/sandbox/preview/deploy; no ejecuta ni despliega.
- `POST /api/v1/infinity/evolution/evolve` — simulación de evolución en memoria (cápsulas, GDI, A2A).
- `POST /api/v1/infinity/a2a/evaluate` — evalúa verbos A2A (`describe, propose, evaluate, adopt`).
- `POST /api/v1/infinity/primitives/run` — planificación de suites de prueba (`runTests`), sin ejecución.
- `POST /api/v1/infinity/design-tokens` — genera tokens CSS/JSON para 6 paletas (neutral, stone, gothic, matcha, butter, y2k); no aplica a la UI.
- `POST /api/v1/infinity/i18n/translate` — traducción determinista (es-MX nativo, es-ES, en, pt-BR).
- `POST /api/v1/infinity/accessibility/evaluate` — checklist a11y declarativo (8 checks), sin auditar el DOM.

Todas las respuestas declaran `production: false` y `executionPerformed: false`.

### TAMV Kaos Audio System
- Prefijo `/api/v1/tamv`. Autorización POST vía `GENESIS_ADMIN_API_TOKEN`, rate limit 8 req/60 s, ledger BookPI, blackout `VOICE_SYNTHESIS`.
- `GET /api/v1/tamv/status`, `GET /api/v1/tamv/presets`, `GET /api/v1/tamv/presets/:presetId`
- `POST /api/v1/tamv/analyze`, `POST /api/v1/tamv/adaptive-preset`, `POST /api/v1/tamv/redefine-plan`

DSP nativo en TypeScript (FFT radix-2, centroide, flatness, bandas, transitorios, estéreo M/S, niveles). No reproduce, no sintetiza, no separa fuentes. 11 presets, 8 etapas de redefinición con 15 puertas de validación, 10 lecturas de telemetría (4 de hardware declaradas como `measured: false`).

## Arquitectura

### 14 capas Ω + 9 Fabrics (`src/infinity/architecture.ts`)
Capas: Ω-0 (Client Channels), Ω-0.5 (API Gateway), Ω-1 (Memory Mesh/YUN), Ω-2 (Digital Twin), Ω-3 (Knowledge Graph), Ω-5 (Science Engine), Ω-6 (Governance/CROWN), Ω-7 (EFM-CCI/BookPI), Ω-8 (Reasoning Mesh), Ω-9 (CM-ET), Ω-10 (Identity & Ethics/EOCT), Ω-12 (AA-CD), Ω-13 (IHEC), Ω-14 (Evolutionary Crisis Memory).

Fabrics: Cognition, Memory, Agent, Governance, Model, MCP, Evolution, Build, BookPI.

### Catálogo integral (`src/infinity/catalog.ts`)
- 10 skills nativas
- 18 tools (la tabla del canon enumera 18; su resumen dice 19 — se documenta la divergencia)
- 14 primitivas
- 12 servicios
- Total: 54 entradas, todas con madurez y evidencia; ninguna declara `production`.

### Constitución (`src/infinity/constitution.ts`)
```text
ALLOW = IDENTITY × AUTHORITY × POLICY × EVIDENCE × SAFETY
```
- `SUPPLANTAR`, `FRAUDE`, `ACCESO NO AUTORIZADO`, `DESTRUCCIÓN DE EVIDENCIA` → DENY siempre.
- `deploy` y `payment` exigen aprobación humana verificada en el servidor.
- Ingesta de 14 etapas → `ADMIT`, `REJECT` o `QUARANTINE`.
- `APRENDER ≠ COPIAR`, `≠ INGERIR SIN PERMISO`, `≠ ENTRENAR SIN LICENCIA`.
- `calculateTrust()` es asesor y devuelve `authorizes: false`.

## Gobernanza

- **CROWN** (`src/omega-runtime`, `src/nexus`): policy, risk, compliance.
- **BookPI** (`src/bookpi`): evidencia criptográfica SHA3-512, append-only.
- **Blackout**: alcance `VOICE_SYNTHESIS` en `src/governance/blackout.ts`.
- **MCP fail-closed**: sin `MCP_SERVER_TOKEN` no se exponen herramientas.
- **Profit Guard** (`src/economy/profit-guard.ts`): `minimumProfitablePrice(cost, marginBps)` = `cost * (1 + marginBps/10000)` redondeado a centavos. Nunca por debajo del costo.
- **Sandbox** (`src/agents/sandbox.ts`): `path.relative`, rechaza `..`, rutas absolutas, NUL y symlinks; límites de tamaño; SHA3-512.

## Memoria y persistencia

- **IKES** (`src/ikes`): hidratación hash-validada, fail-closed, auto-reparación con backoff exponencial (5 s → 60 s), timer `unref`.
- **Almacenes durables** (`src/security/isabella-api-keys.ts`, `src/federation/connectors.ts`): Postgres/Neon, escritura por fila, fallo visible (no silencioso), log `hydration recovered`.
- **Ledger legacy BookPI**: `VOLATILE_IN_MEMORY`, `/api/v1/readyz` = 503 hasta refactor asíncrono.

## Infraestructura

- **Vercel**: framework `null`, single function `api/index.js` → `dist/server.js`, `includeFiles: {dist/**, src/ui/**, src/assets/video/**}`, `maxDuration: 300`.
- **Postgres**: connect timeout 10 s por defecto.
- **IKES Supabase**: request timeout 10 s, readiness hydration 5 s, self-healing retry 30 s.

## Verificación

```bash
pnpm typecheck          # tsc --noEmit
pnpm typecheck:layers   # tsc -p tsconfig.layers.json
pnpm test               # vitest run (397 archivos / 2843 pruebas)
pnpm lint               # eslint src/** --max-warnings 0
pnpm build:dist         # tsc + esbuild + node --check
node scripts/repository-assurance.mjs  # 44/44 gates
```

## Evidencia actual

Avance global de implementación: no publicado como porcentaje único. Mientras no exista un denominador de requisitos ponderados y reproducible, una cifra agregada sería especulación y no se presenta como hecho.

- **397 archivos de prueba / 2843 pruebas verdes**.
- `tsc --noEmit` = 0, `tsc -p tsconfig.layers.json` = 0.
- ESLint 0 warnings, Prettier limpio en archivos nuevos.
- Build: 2.6 MB, `node --check` OK.
- Repository assurance: 44/44 gates PASS.
- Deploy Vercel: alias `isabella-terminus-v6-tamvonlinenetwork.vercel.app` (auto-deploy desde `main`).

## Bloqueadores conocidos (no ocultos)

- `PF-STRIPE-WEBHOOK-MISSING`, `PF-STRIPE-TEST-KEY` — requieren Stripe dashboard/live key.
- Dominio custom `isabella-ai.visitarealdelmonte.online` no resuelve ni está en el team.
- Migraciones Supabase/Neon con `grant ... to service_role` no aplicables en Neon.
- `OTEL_EXPORTER_OTLP_ENDPOINT` ausente → observabilidad degradada.
- Backup/restore, RLS bajo service role, concurrencia, rollback no demostrados.
- 4 vulnerabilidades moderadas de Dependabot.
- Ciclo completo fallo→recuperación de almacenes durables no observado en producción real.

## Estructura del repositorio

```
src/
  agents/          # Agent Mesh CERO + sandbox endurecido
  infinity/        # Master Consolidated fusion (14 capas, 9 fabrics, constitución, skills, media, build, evolution, design-tokens, i18n, a11y)
  routes/          # Superficies HTTP (agents-mesh, infinity, nexus, platform, ...)
  server.ts        # Composición del runtime
  economy/         # Profit Guard, revenue fabric
  health/          # Readiness, deploy-readiness, preflight
  ikes/            # Memoria verificada
  memory/          # Memory mesh
  nexus/           # Capa unificada de capacidades locales
  tamv/            # Kaos Audio System
  tools/           # Catálogo de herramientas allowlisted
  ui/              # Frontend (app.js)
docs/
  canon/           # Documentos canónicos importados con SHA-256
  infinity/        # Mapa operativo de la fusión Master Consolidated
  rfc/             # RFC-0001..0012
  api/             # Inventario de rutas (339)
tests/             # 397 archivos, 2843 pruebas
```

## Licencia

Propietaria, todos los derechos reservados. Ver [`LICENSE`](LICENSE) y [`NOTICE.md`](NOTICE.md). Los documentos canónicos importados conservan su procedencia y **no relicencian** este repositorio.

---

*Estado actualizado: 11 de noviembre de 2026. `engine-generated` — revisión humana pendiente.*