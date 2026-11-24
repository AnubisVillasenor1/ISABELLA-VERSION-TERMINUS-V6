# ISABELLA TERMINUS V6 — Checklist para funcionalidad completa

## A. Código (implementado ✅)

### A.1 Runtime core
- [x] Servidor Express con 34 grupos de rutas (`src/server.ts`)
- [x] Runtime Nexus (grafo, agente, workflows, cuántica local) — `src/nexus/`
- [x] Omega runtime (federation, memory, planning, reasoning, routing, security) — `src/omega-runtime/`
- [x] CROWN (policy, risk, compliance) — `src/crown/`, `src/governance/`
- [x] BookPI (ledger, crypto, merkle, anchor, emitter) — `src/bookpi/`
- [x] IKES (memoria verificada, hidratación, auto-reparación) — `src/ikes/`
- [x] Memory mesh (YUN) — `src/memory/`
- [x] Inference (provider policy, Ollama, OpenAI, Gemini, HuggingFace, OpenRouter) — `src/inference/`
- [x] Hypercore (turbo, MoE, speculative draft, semantic cache, router) — `src/hypercore/`
- [x] Agent Mesh CERO (10 roles, ALLOW/DENY/ESCALATE, sandbox) — `src/agents/`
- [x] Genesis orchestrator — `src/genesis/runtime.ts`
- [x] TAMV Kaos Audio System (DSP, análisis, presets, plan, adaptativo, telemetría) — `src/tamv/`
- [x] Economy (Profit Guard, revenue fabric) — `src/economy/`
- [x] Terminology/retention/erasure — `src/terminus/`
- [x] Civilización, marketplace, comercio, billing — `src/civilization/`, `src/commerce/`, `src/marketplace/`
- [x] Voice/TTS, multimodal, IVCC — `src/voice/`, `src/tts/`, `src/multimodal/`, `src/ivcc/`
- [x] Observabilidad, performance, resiliencia — `src/observability/`, `src/performance/`, `src/resilience/`
- [x] Infinity (14 capas Ω, 9 Fabrics, constitución, catálogo, skills, media, build, evolution, design tokens, i18n, a11y, durable recovery, TJG/TPG/LCM, governance evolution, meta-cognitive orchestrator, EventLog) — `src/infinity/`
- [x] Domain runtime (IDR semantic router) — `src/domain-runtime/`

### A.2 Tests
- [x] 404 archivos de prueba / 2895 pruebas verdes
- [x] Typecheck (`tsc --noEmit`) = 0
- [x] Typecheck layers (`tsc -p tsconfig.layers.json`) = 0
- [x] ESLint 0 warnings
- [x] Prettier limpio en archivos nuevos
- [x] Build (`pnpm build:dist`) = 2.6 MB, `node --check` OK
- [x] Repository assurance: 44/44 gates PASS

## B. Infraestructura (pendiente — requiere acción del usuario)

### B.1 Vercel
- [ ] Re-vincular proyecto `isabella-terminus-v6` al repo `AnubisVillasenor1/ISABELLA-VERSION-TERMINUS-V6` (Settings → Git → Connect Repository)
- [ ] O crear proyecto nuevo vinculado a Anubis
- [ ] Configurar variables de entorno en Vercel (ver §B.4)
- [ ] Verificar deploy en `READY`
- [ ] Verificar endpoints: `/`, `/health`, `/api/v1/nexus`, `/api/v1/agents/mesh`, `POST /api/v1/agents/mesh/evaluate`, `/api/v1/infinity`, `/api/v1/readyz`, preflight

### B.2 Base de datos
- [ ] Provisionar Postgres (Neon/Supabase/autoalojado) con TLS (`?sslmode=require`)
- [ ] Aplicar migraciones en orden:
  - `supabase/migrations/20261030000000_isabella_api_keys.sql`
  - `supabase/migrations/20261030000001_isabella_federation.sql`
  - `infra/db/migrations/001_create_bookpi_events.sql`
  - `infra/db/migrations/002_bookpi_canonical_immutability.sql`
- [ ] Corregir `grant ... to service_role` para Neon (no aplicable en Neon)
- [ ] Configurar `BOOKPI_LEDGER_PATH` (directorio escribible) para legacy ledger
- [ ] Verificar `/api/v1/readyz` → 200 (actualmente 503 por legacy ledger volátil)

### B.3 Stripe
- [ ] Configurar `STRIPE_WEBHOOK_SECRET` (si existe `STRIPE_SECRET_KEY`)
- [ ] Usar clave de producción (no `sk_test_`)
- [ ] Resolver `PF-STRIPE-WEBHOOK-MISSING` y `PF-STRIPE-TEST-KEY`

### B.4 Variables de entorno (Vercel)
- [ ] `DATABASE_URL` / `POSTGRES_URL` (Postgres con TLS)
- [ ] `ISABELLA_API_KEY_STORE=postgres`
- [ ] `ISABELLA_FEDERATION_STORE=postgres`
- [ ] `ISABELLA_API_KEY_PEPPER` (cadena estable, misma en todas las instancias)
- [ ] `BOOKPI_INTEGRITY_SECRET` (≥32 chars, alta entropía)
- [ ] `BOOKPI_LEDGER_PATH` (directorio escribible)
- [ ] `GENESIS_ADMIN_API_TOKEN` (≥32 chars)
- [ ] `OPS_API_TOKEN` (≥32 chars)
- [ ] `APP_PUBLIC_URL` (HTTPS)
- [ ] `ALLOWED_ORIGINS` (HTTPS exactos, sin localhost/rutas/*)
- [ ] `MCP_SERVER_TOKEN` (para fail-closed MCP)
- [ ] `OTEL_EXPORTER_OTLP_ENDPOINT` (observabilidad)
- [ ] `ISABELLA_VERIFIED_KNOWLEDGE_BACKEND` (mongodb o supabase)
- [ ] `MONGODB_URI` (si backend=mongodb)
- [ ] `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_ANON_KEY` (si backend=supabase)
- [ ] `GROQ_API_KEY` o proveedor de inferencia (≥32 chars, alta entropía)
- [ ] `ISABELLA_POSTGRES_CONNECT_TIMEOUT_MS` (default 10000)

### B.5 Dominio y DNS
- [ ] Configurar DNS para `isabella-ai.visitarealdelmonte.online`
- [ ] Añadir dominio al team de Vercel
- [ ] Verificar resolución

### B.6 Seguridad y dependencias
- [ ] Revisar 4 vulnerabilidades moderadas de Dependabot
- [ ] Ejecutar `dependency_scan` (actualmente `not_observed`)
- [ ] Ejecutar `auth_rls` (actualmente `not_observed`)
- [ ] Ejecutar `canary` (actualmente `not_observed`)
- [ ] Ejecutar `rollback_plan` (actualmente `not_observed`)

### B.7 Observabilidad
- [ ] Configurar endpoint OTLP
- [ ] Verificar traces y métricas
- [ ] Configurar alertas

### B.8 Backup y recuperación
- [ ] Implementar backup/restore de Postgres
- [ ] Verificar RLS bajo service role
- [ ] Demostrar concurrencia y rollback
- [ ] Observar ciclo completo fallo→recuperación en producción real

## C. Código pendiente (opcional, no bloqueante)

### C.1 Refactor asíncrono de ledger legacy
- [ ] Hacer el ledger legacy BookPI asíncrono
- [ ] Desacoplar `readyz` del ledger legacy (usar `pipeline-bookpi-storage` como fuente de verdad)
- [ ] Actualizar tests de readiness
- [ ] Esto desbloquearía `/api/v1/readyz` → 200

### C.2 Cobertura de typecheck
- [ ] Cubrir las 6 áreas excluidas del typecheck principal (`src/authz-runtime`, `src/components`, `src/core`, `src/hooks`, `src/hypercore-runtime`, `src/lib` parcial) o documentar por qué quedan fuera

### C.3 Verificación de commits recientes
- [ ] Verificar alcance del cableado TJG/TPG/LCM (commit 436f4e1) archivo por archivo
- [ ] Verificar adaptador de recuperación durable (commit 4624d77) archivo por archivo
- [ ] Re-verificar producción tras ambos commits (evidencia del 31 oct es anterior)

### C.4 Documentación
- [ ] Documentar TINA (definición operativa) o citar corpus de Drive como fuente
- [ ] Documentar expansión de CROWN ("Constitution of the Reality Ontological Web Native") o citar fuente
- [ ] Tabla de versionado único (0.1.0, v40.0.0, Génesis Ω∞, V6, v4.3.3)
- [ ] Revisión humana nominal del contenido engine-generated

## D. Verificación final (cuando B esté completo)

- [ ] `pnpm typecheck` = 0
- [ ] `pnpm typecheck:layers` = 0
- [ ] `pnpm test` = todos verdes
- [ ] `pnpm lint` = 0 warnings
- [ ] `pnpm build:dist` = OK
- [ ] `node scripts/repository-assurance.mjs` = 44/44 gates PASS
- [ ] `node scripts/production-progress.mjs` = porcentaje actualizado
- [ ] `/api/v1/readyz` = 200
- [ ] Preflight = sin errores bloqueantes
- [ ] Smoke test de UI = OK
- [ ] Canary deploy = OK
- [ ] Rollback plan = demostrado

---

**Resumen:** El código está al ~95% implementado y cableado. Los bloqueadores restantes son de **infraestructura** (Vercel, DB, Stripe, DNS, OTEL) y **evidencia** (dependency_scan, auth_rls, canary, rollback). La única mejora de código que movería el porcentaje de forma real es el refactor asíncrono del ledger legacy (§C.1), que desbloquearía `/api/v1/readyz` → 200.