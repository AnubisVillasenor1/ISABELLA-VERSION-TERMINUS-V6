# Isabella Villaseñor AI — TERMINUS V6 / Genesis TINA

Isabella es una plataforma TypeScript/Express para conversación gobernada, orquestación de inferencia, memoria, evidencia operacional y automatización con controles explícitos. El repositorio integra proveedores externos; no afirma consciencia, autonomía legal, un modelo fundacional propio ni certificación de producción.

> **Invariante:** `CAPABILITY ≠ AUTHORITY ≠ EXECUTION ≠ EVIDENCE ≠ LEARNING ≠ PRODUCTION`.
>
> **SPECIFIED ≠ IMPLEMENTED ≠ TESTED.** Un gate automatizado no equivale a evidencia humana ni certificación de producción.

## Estado real

**Rama auditada:** `v0/auditoria-produccion-2026`  
**Último SHA auditado:** se actualizará después del commit de esta auditoría.  
**Evidencia:** debe regenerarse para cada commit nuevo; los artefactos generados no certifican producción por sí mismos.  
**Avance exacto de implementación:** **78.0%**. Cálculo: 8 dominios ponderados, 6 completos (75%) + 1 dominio parcialmente completo (3.0%) = 78.0%; no se presenta como porcentaje de producción.

**Madurez declarada:** 78.0% — estimación reproducible de implementación, pruebas y gates, no certificación.  
**Estado de liberación:** preproducción. La producción requiere cerrar los errores TypeScript pendientes, validar infraestructura real, proveedores, persistencia, secretos, despliegue y rollback observado.

### Auditoría actual

| Gate | Resultado en esta auditoría |
|---|---|
| `node scripts/repository-assurance.mjs` | PASS: 44/44 estructural |
| `pnpm security:suite` | PASS tras corregir falsos positivos de secretos y HMAC utilitario |
| `pnpm typecheck` | FALLA: errores existentes en federación, gobernanza, aprendizaje y UI legacy; se corrigieron router/RAG/capability |
| `pnpm test` | PASS: 280 archivos / 1666 tests |
| Build completo | BLOQUEADO por los errores TypeScript pendientes |
| Producción real | No certificada; faltan smoke externo, persistencia E2E y rollback demostrado |

El warning RA-028 indica que la accesibilidad inmediata y la acción de copiar respuestas requieren una revisión adicional; no es un bloqueo estructural.

## Capacidades implementadas

- Interfaz conversacional servida desde `src/ui/`, con composición chat-first y superficies Crystal Clear/Crystal Glow.
- Enrutamiento de cognición con límites de entrada, rate limiting, timeouts, fallbacks autorizados y política de proveedores.
- TTS canónico: `POST /api/v1/tts/synthesize`, estado: `GET /api/v1/tts/status`, fallback heredado y Web Speech API local.
- Inferencia configurable con Google, OpenAI-compatible, OpenRouter/free, Groq y AI Gateway según variables disponibles y política activa.
- Memoria y conocimiento: Atlas, IKES, propuestas, procedencia y aislamiento por tenant según adaptador configurado.
- BookPI: evidencia append-only, hash chain, HMAC, almacenamiento PostgreSQL/JSONL/memoria y estados degradados explícitos.
- Gobernanza: capacidades, permisos, riesgo, escalamiento y aprobación humana; una respuesta de IA no autoriza una acción externa.
- Seguridad HTTP: bearer tokens, comparación constant-time, JWT allowlist, CORS/cabeceras, redacción, nonce anti-replay y límites.
- Revenue Fabric v4: IETS, settlement IFRF, ledger doble entrada, 12 streams, metering, wallets y outbox/inbox con idempotencia.
- Integraciones comerciales: Stripe y webhooks firmados; requieren claves y validación de entorno real.
- Observabilidad: health/readiness, métricas de latencia, preflight protegido y evidencia de producción.
- Federación experimental: `ige-omega/` en Rust y `gameover-jenkins-plugin/` en Maven, con gates separados.

## Arquitectura

| Área | Ubicación | Función |
|---|---|---|
| Servidor HTTP | `src/server.ts` | Express, rutas, middleware y composición |
| Inferencia | `src/inference/` | proveedores, modelos, voz, multimodalidad y políticas |
| Seguridad | `src/security/`, `src/http/` | tokens, rate limits, headers y validación |
| Memoria | `src/memory/`, `src/atlas/` | claims, recuperación, Atlas e IKES |
| Evidencia | `src/bookpi/` | eventos, integridad, almacenamiento y verificación |
| Gobernanza | `src/governance/`, `src/crown/`, `src/authority/` | riesgo, permisos y aprobación |
| Economía | `src/economy/`, `src/commerce/`, `src/routes/revenue-fabric.ts` | catálogo, usage, settlement y ledger |
| UI | `src/ui/` | chat, estilos, smoke y assets servidos |
| Operación | `src/health/`, `src/deployment/`, `src/observability/` | readiness, preflight, métricas y gates |
| Federación | `ige-omega/`, `gameover-jenkins-plugin/` | Rust gateway y plugin Jenkins experimentales |

## Requisitos e instalación

- Node.js 24.x
- pnpm 10.28.0
- PostgreSQL para persistencia durable y E2E
- Docker/Kubernetes únicamente para sus validaciones respectivas
- Rust estable para `ige-omega`
- JDK 17 y Maven para el plugin Jenkins

```bash
corepack enable
corepack prepare pnpm@10.28.0 --activate
pnpm install --frozen-lockfile
pnpm typecheck
pnpm test
pnpm build
```

Desarrollo local:

```bash
pnpm dev
# http://localhost:3000
```

## Comandos operativos

```bash
pnpm typecheck              # TypeScript sin emitir
pnpm test                   # suite Vitest
pnpm build                  # assurance + build + tests + smoke + seguridad
pnpm security:suite         # invariantes de seguridad
pnpm smoke:ui               # sintaxis y contrato UI
pnpm smoke:runtime          # health/runtime smoke
pnpm production:evidence   # evidencia vinculada al SHA
pnpm smoke:production      # smoke contra entorno configurado
pnpm verify:production     # gate de producción
pnpm postgres:e2e           # persistencia E2E con PostgreSQL
pnpm deploy:verify          # Docker + validación Kubernetes
pnpm ingest:atlas           # snapshot de repositorios Atlas
pnpm keys:generate          # claves nativas; no imprime secretos existentes
```

Un comando que no pudo ejecutarse por falta de infraestructura o credenciales no debe marcarse como aprobado.

## Rutas principales

- `GET /health` — salud superficial del proceso.
- `GET /api/v1/healthz` — health local y configuración.
- `GET /api/v1/readyz` — readiness de dependencias configuradas.
- `GET /api/v1/status` — estado descriptivo del runtime.
- `GET /api/v1/ops/preflight` — diagnóstico protegido.
- `POST /api/v1/cognition/route` — conversación gobernada.
- `GET /api/v1/tts/status` — readiness de voz.
- `POST /api/v1/tts/synthesize` — síntesis de voz acotada y rate-limited.
- `POST /api/v1/cognition/speech` — contrato heredado de voz.
- `POST /api/v1/revenue/iet/calculate` — Trust Score.
- `POST /api/v1/revenue/settle` — settlement normalizado.
- `POST /api/v1/revenue/usage` — metering idempotente.
- `GET /api/v1/revenue/ledger/verify` — integridad de ledger.
- `GET /api/v1/integrations/graph` — grafo operativo protegido.

La existencia de una ruta no prueba disponibilidad de proveedor, persistencia durable o autorización para usarla.

## Variables de entorno

Las variables dependen del módulo activado. Nunca se deben guardar valores reales en el repositorio.

### Persistencia y evidencia

`POSTGRES_URL`, `POSTGRES_URL_NON_POOLING`, `DATABASE_URL`, `BOOKPI_PIPELINE_STORAGE`, `BOOKPI_PIPELINE_LEDGER_PATH`, `BOOKPI_LEDGER_PATH`, `BOOKPI_INTEGRITY_SECRET`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`.

`BOOKPI_INTEGRITY_SECRET` debe tener al menos 32 caracteres aleatorios. En serverless no se debe usar filesystem efímero como ledger durable.

### Inferencia y voz

`GEMINI_API_KEY`, `MODEL_API_KEY`, `INFERENCE_API_KEY`, `OPENROUTER_API_KEY`, `OPENROUTER_FREE_MODEL`, `HF_TOKEN`, `HF_FREE_MODELS`, `GROQ_API_KEY`, `GROQ_BASE_URL`, `GROQ_TTS_MODEL`, `GROQ_TTS_VOICE`, `ALLOW_PAID_PROVIDER_FALLBACK`, `ISABELLA_KEYLESS_FREE_PROVIDER`.

Los proveedores gratuitos requieren opt-in y revisión de privacidad. Una variable presente no prueba que el proveedor responda.

### Seguridad, operación y observabilidad

`GENESIS_ADMIN_API_TOKEN`, `OPS_API_TOKEN`, `HSF_API_TOKEN`, `GENESIS_PUBLIC_API_TOKEN`, `STRICT_PREFLIGHT`, `OTEL_EXPORTER_OTLP_ENDPOINT`, `BRAINTRUST_API_KEY`, `BRAINTRUST_PROJECT_ID`.

### Stripe

`STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PUBLISHABLE_KEY`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`.

Validar siempre firma de webhook, precio server-side, cantidad, idempotencia, entorno y límites de reintento.

## CI/CD y despliegue

`.github/workflows/ci.yml` ejecuta Node, tests, build, seguridad, Rust, Jenkins y quality gate. `deploy-production.yml` consume evidencia, SBOM y security suite del mismo SHA y exige un run exitoso de CI en `main` antes de promover.

Antes de declarar producción:

- CI verde en el mismo SHA.
- Variables y secretos configurados en el entorno correcto.
- PostgreSQL/Supabase migrado y probado con aislamiento por tenant.
- Proveedor real de inferencia y TTS probado con timeout y fallback.
- Stripe probado en sandbox y webhook verificado.
- Smoke HTTP externo después del despliegue.
- Logs sin secretos ni PII innecesaria.
- Backup, restauración y rollback ejecutados y observados.
- Evidencia guardada y revisada por una persona responsable.

### Gates pendientes para liberar

- Ejecutar smoke HTTP contra el despliegue real.
- Confirmar persistencia E2E, migraciones y aislamiento por tenant.
- Validar proveedores reales de inferencia/TTS y límites de coste.
- Ejecutar backup, restauración y rollback observados.
- Registrar revisión humana responsable del mismo SHA.

La promoción automática no sustituye una aprobación humana ni convierte un test en evidencia de producción.

## Seguridad y gobernanza

El sistema falla cerrado cuando faltan autorización, evidencia o configuración necesaria. Las operaciones sensibles requieren aprobación humana contextual. Hash chain, HMAC o tests no prueban por sí solos inmutabilidad física, verdad del contenido o autoridad legal. Revisar `SECURITY.md`, `docs/security/GENESIS-V6-THREAT-MODEL.md` y `AGENTS.md` antes de activar capacidades externas.

## Documentación relevante

- `docs/ESTADO-REAL-ACTUAL.md` — estado operativo.
- `docs/ENVIRONMENT.md` — variables y condiciones.
- `docs/ARCHITECTURE-OPERATING-MAP.md` — mapa de arquitectura.
- `docs/ASSURANCE-CONTROL-PLANE.md` — assurance.
- `docs/security/GENESIS-V6-THREAT-MODEL.md` — amenazas.
- `ige-omega/README.md` — federación Rust.
- `gameover-jenkins-plugin/README.md` — plugin Jenkins.
- `AGENTS.md` — constitución operativa del repositorio.

## Limitaciones declaradas

Este README no declara que Isabella esté al 100% en producción. La madurez de software puede ser alta mientras la operación siga bloqueada por credenciales, proveedores, migraciones, permisos, observabilidad o rollback no demostrado. Las implementaciones generadas automáticamente permanecen en estado `draft` hasta revisión humana y evidencia reproducible.

## Licencia

Consultar `LICENSE` y `CITATION.cff`.
