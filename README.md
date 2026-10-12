# Isabella V6 · TINA — Genesis Runtime

> **TINA — Trusted Intelligence, Native & Adaptive.** Runtime cognitivo gobernado, soberano y auditable. Separa explícitamente capacidad, autoridad, ejecución, evidencia, aprendizaje y producción.

[![Repository Assurance](https://github.com/OsoPanda1/isabella-V6-TINA-h6/actions/workflows/repository-assurance.yml/badge.svg)](https://github.com/OsoPanda1/isabella-V6-TINA-h6/actions/workflows/repository-assurance.yml)
[![Genesis CI](https://github.com/OsoPanda1/isabella-V6-TINA-h6/actions/workflows/ci.yml/badge.svg)](https://github.com/OsoPanda1/isabella-V6-TINA-h6/actions/workflows/ci.yml)

```text
CAPABILITY ≠ AUTHORITY ≠ EXECUTION ≠ EVIDENCE ≠ LEARNING ≠ PRODUCTION
```

Las inteligencias **sugieren**, **calculan** y **evalúan**. La conciencia humana **decide**, **aprueba** y **ejecuta**. Ningún control generado por máquina se declara verificado sin evidencia humana con nombre.

## Contrato de veracidad

`SPECIFIED ≠ IMPLEMENTED ≠ TESTED ≠ INTEGRATED ≠ VERIFIED ≠ DEPLOYED ≠ CERTIFIED`.

Un esquema, un mock, un hash, un endpoint o un manifiesto **no** demuestran por sí solos una integración end-to-end. Este README distingue, en todo momento, lo que **está implementado hoy**, lo que **falta por implementar** y lo que Isabella **debe llegar a ser**.

---

## 1. Qué debe ser Isabella (visión soberana)

Isabella no es un chatbot ni un wrapper de modelos. La especificación canónica (`docs/spec/ISABELLA-CANON-v40-source.txt`, `docs/spec/GENESIS-V6-ARCHITECTURE.md`) la define como el **sistema operativo cognitivo soberano del ecosistema TAMV / RDM Digital**: una **capa de gobernanza, memoria civilizatoria y orquestación de agentes** anclada a Real del Monte (Mineral del Monte, Hidalgo) como **Nodo Cero n.º 001**.

Objetivo de diseño:

- **Custodia de la intención y protección del usuario**, con gobernanza ética, privacidad y trazabilidad por encima de cualquier resultado.
- **Memoria civilizatoria** (BookPI) como ledger append-only de decisiones, trazas y evidencia, no como base de datos mutable.
- **Orquestación de skills y agentes** bajo una topología de **heptafederación** (siete dominios cognitivos territoriales).
- **ISA-API v.GENESIS** como interfaz de sistema mental soberana, sin depender de OpenAI ni de otra IA externa como autoridad.
- **Intervención humana siempre disponible** (`human-override-ready`): la aceleración nunca reduce autoridad, evidencia, seguridad ni gobernanza.
- **Alineación con estándares** (Plan S, EOSC, UNESCO AI Ethics, EU AI Act; marcos NIST/ISO como referencia de control).

Catálogo cognitivo canónico (skills simbólicos que la especificación describe, con distinto nivel de materialización en código):

| Skill | Rol especificado |
|---|---|
| ORION | Arqueología cognitiva: recuperar y reconstruir conocimiento territorial |
| SOPHIA | Investigación profunda y síntesis; detección de vacíos |
| ARGUS | Capa centinela: anomalías, riesgos, violaciones de política |
| HERMES | Narrativa y comunicación para ciudadanía, comercio y autoridad |
| ATLAS | Modelado y simulación territorial; impacto en turismo/cultura/economía |
| ANUBIS | Seguridad criptográfica y post-cuántica (PQC); enlace con el ledger |

En este repositorio, el módulo [`src/osiris/`](docs/osiris/ARCHITECTURE.md) materializa una **capa de observación de ciberdefensa** (estado `draft`): detecta, puntúa y registra —sin bloquear ni certificar—. No pretende ser ANUBIS completo ni un sustituto de los controles existentes.

**Lo que Isabella NO debe ser** (declarado explícitamente): no es un modelo fundacional propio, no es AGI, no es un LLM entrenado nativamente por este repositorio, no es un sistema certificado y no es un producto comercial en producción. El enrutamiento entre proveedores **no** equivale a entrenamiento propio; el fallback local es determinista y **no** sustituye a un LLM.

La visión es el **norte**; abajo se reporta, sin adornos, cuánto de ella existe hoy como código ejecutable.

---

## 2. Estado real hoy (lo que ya tenemos)

**SHA local validado: `8ebc118`** (HyperCore Ω² + HyperPredict Ω: runtime de hiperaceleración cognitiva en `src/hypercore/` con orquestador fail-closed, más capa visual elegante en `src/ui/`). El árbol pasa, de forma reproducible en local:

| Gate | Comando | Resultado en `8ebc118` |
|---|---|---|
| Tipos estrictos | `pnpm typecheck` | exit 0 |
| Pruebas | `pnpm test` | **723 aprobadas / 135 archivos** |
| Build completo | `pnpm build` | exit 0 (tsc + vitest + esbuild + `node --check src/ui/app.js` + smoke UI + smoke runtime) |
| Suite de seguridad | `pnpm run security:suite` | **14 passed / 0 failed** |

> Este SHA **no** ha sido validado aún por GitHub Actions ni desplegado a Preview. El último SHA con deployment `READY` en Vercel fue `cccaede` (519 pruebas / 100 archivos). No se debe copiar evidencia de un SHA a otro.

### Componentes realmente implementados

- **Ingress y límites:** validación de entrada, topes de tamaño, rate limiting con fail-closed.
- **Identidad y autoridad:** principal, roles, scopes, consentimiento; CROWN falla cerrado si no hay autorización (p. ej. `allowedRoles` vacío).
- **C.R.O.W.N. / AEGIS:** admisión de intención/riesgo/capacidad y guardrails (prompt, retrieval, tools, secretos).
- **Runtime cognitivo** (`src/genesis/runtime.ts`) con Gateway de capacidades, skills y tools registrados con `methodId`/`riskTier`.
- **Inferencia:** política de proveedores compartida (`src/inference/provider-policy.ts`), adaptadores OpenRouter (modelo gratuito por defecto), Hugging Face (modelos explícitos), Gemini/AI Gateway, cooldowns, timeouts acotados y **fallback local determinista** (`sovereign-fallback`).
- **Memoria:** `SessionMemory` (continuidad conversacional acotada), `VerifiedKnowledgeStore` (backend en memoria y Supabase), memoria vectorial y provenance.
- **BookPI:** contrato de ledger append-only con crypto/hash y adaptadores de almacenamiento (JSONL y Postgres). El runtime usa un **ledger durable JSONL** cuando `BOOKPI_LEDGER_PATH` está definido (si no, cadena en memoria volátil, documentada); incluye retención planeada, backup/restore con validación de la cadena y CLI `pnpm bookpi:maintenance`. **No es WORM**; ver [docs/bookpi](docs/bookpi/DURABLE-LEDGER.md).
- **Observabilidad:** `LatencyRegistry` (p50/p95) y `MetricsRegistry`, expuestos en `GET /api/v1/metrics`.
- **Federación:** eventos YUN (`src/federation/yun-event.ts`) con validación y detección de alteración.
- **Seguridad criptográfica:** comparaciones en tiempo constante (`timingSafeEqual`), nonces anti-replay, firma de webhooks HMAC-SHA256, ISA-X con Ed25519 y PQC fail-closed.
- **Ciberdefensa (OSIRIS):** capa de **observación** (`src/osiris/`): detección heurística determinista, postura defensiva honesta (`active/inactive/unknown`) y registro append-only de hallazgos en BookPI; endpoints gated `GET /api/v1/osiris/status` y `POST /api/v1/osiris/inspect`. **No bloquea ni certifica**; ver [docs/osiris](docs/osiris/ARCHITECTURE.md).
- **Monetización (comercio):** motor de entitlements + suscripciones + metering (`src/commerce/subscriptions.ts`, `entitlements.ts`, `metering.ts`) con endpoints `/api/v1/billing/*` y una puerta real `POST /api/v1/commerce/offers`. Los **webhooks firmados** del proveedor se aplican al `SubscriptionStore` vía `src/commerce/provider-events.ts` (`POST /api/v1/connectors/ingest`). **Registra** estado verificado del proveedor y **aplica** planes/cuotas; **no procesa pagos ni almacena datos de tarjeta**. Ver [docs/commerce](docs/commerce/BILLING-ENGINE.md) y el [backlog](docs/evolution/IMPLEMENTATION-BACKLOG.md).
- **Identidad y aislamiento (tenancy):** verificador de aislamiento multi-tenant **a nivel de aplicación** (`src/tenancy/isolation.ts`): compara el tenant de los registros contra el del principal verificado y falla cerrado ante acceso cruzado; cableado al tool `tenant_isolation_verify`. **No verifica RLS de base de datos**. Ver [docs/tenancy](docs/tenancy/ISOLATION.md).
- **Gobernanza de agentes (GAME OVER / UAGP-1):** meta-capa de gobernanza cognitiva (`src/gameover/`): valida AI Passport, confianza, riesgo, ética, aprobación humana y auditoría antes de habilitar una acción; endpoints gated `/api/v1/gameover/*` y step Jenkins `gameOverGovernance` (fuente en `gameover-jenkins-plugin/`). **Decide, puntúa y registra; no ejecuta ni certifica**. Ver [docs/GAME_OVER_UAGP1_CANONICAL.md](docs/GAME_OVER_UAGP1_CANONICAL.md).
- **Hiperaceleración cognitiva (HyperCore Ω² + HyperPredict Ω):** runtime `src/hypercore/` que predice, comprime, cachea, enruta, especula, verifica y audita (`predict → cache → compress → route → execute experts → speculative draft → Veritas Ω → CROWN → audit`), con invariante **fail-closed**: `timeout`, salida malformada, fallo de verificador y auditoría ausente (`MISSING_AUDIT`) → `DENIED`. **No autoriza** (CROWN-only) ni **ejecuta** efectos; la caché reutiliza pero **nunca otorga autoridad**. Endpoints gated `GET /api/v1/hypercore/modes`, `POST /api/v1/hypercore/run`, `POST /api/v1/hypercore/predict`. Router/affinity **heurístico** y caché **léxica** (no embeddings); CEE y speedup son **modelos declarados**. Ver [backlog](docs/evolution/IMPLEMENTATION-BACKLOG.md).
- **Interfaz** (`src/ui/`): navegación por anclas, menú móvil accesible, chat real contra `POST /api/v1/cognition/route`, voz del navegador (si existe), estados de carga y error, y una **capa visual elegante** con malla cuántica en canvas 2D **autocontenida** (sin CDN) que respeta `prefers-reduced-motion` y **no publica métricas no verificadas**.
- **Operación:** readiness, canary, latency-metrics, TTL single-flight, adaptadores de production-ops.
- **Workspace Rust separado** (`ige-omega/`): crates de cognición, memoria, world model, ABX, BookPI, kernel y gateway (ver gates abajo).

### Readiness estimada

**46.25% ponderado (≈46%)** como *evaluación de gates*, no como porcentaje de funcionalidades ni medición científica. **No se incrementa** mientras sigan abiertos los gates de inferencia externa, CI, Rust y el simulacro de recuperación durable (E2E Postgres/Supabase).

| Dimensión | Peso | Evaluación | Evidencia / gate |
|---|---:|---:|---|
| Runtime HTTP y flujo local | 20% | 75% | Smoke HTTP local verde en el SHA |
| Pruebas y validación automatizada | 20% | 75% | 723 pruebas / 135 archivos |
| Seguridad y guardrails | 15% | 45% | Suite de seguridad 14/14; falta revisión de producción |
| Inferencia externa real | 15% | 0% verificado | Sin credenciales elegibles; no demostrada |
| Persistencia durable y recuperación | 10% | 40% | Ledger durable JSONL + backup/restore/retención con tests; falta E2E Postgres/Supabase y simulacro de recuperación |
| CI reproducible y workspace Rust | 10% | 20% | CI sin jobs verdes; `Cargo.lock` ausente |
| Operación, observabilidad y rollback | 10% | 35% | Instrumentación presente; procedimientos sin probar |

---

## 3. Lo que falta implementar (brechas abiertas)

Ordenadas por prioridad. Cada una exige contrato, evidencia y decisión de rollback antes de considerarse `verified`.

**P0 — imprescindibles para cualquier promoción**

1. **Persistencia durable del ledger BookPI:** cablear el ledger HTTP al almacenamiento durable (Postgres/JSONL), con retención, **backup/restore probado**, aislamiento por workspace y comportamiento fail-closed.
2. **Inferencia externa real:** ejecutar el gate de modelo con credenciales elegibles en el entorno (nunca en Git) y demostrar respuestas reales, además de timeout, 429/5xx, respuesta vacía, modelo no permitido, cooldown y fallback.
3. **CI reproducible:** obtener ejecución de GitHub Actions **con jobs** y conclusión verde sobre el SHA exacto de liberación (hoy devuelve `startup_failure` sin jobs).
4. **Workspace Rust:** generar y revisar `ige-omega/Cargo.lock`; superar `cargo fmt --check`, Clippy, tests y build release con `--locked`.
5. **Aislamiento multi-tenant verificado:** RLS/`workspace_id` end-to-end, sin confiar solo en filtros de UI.

**P1 — madurez operativa y de seguridad**

6. **Revisión de seguridad de producción:** secretos, límites de coste, observabilidad en el entorno destino, rollback ensayado.
7. **Recuperación y continuidad:** RTO/RPO documentados y probados; restauración del ledger y de la memoria verificada.
8. **Migración de rutas críticas a adaptadores persistentes** con contratos validados (fase P1 del mapa operativo).
9. **Observabilidad productiva:** dashboards de latencia/TTFT/cache, alertas y SLO medidos, no solo instrumentados.
10. **Endurecimiento de IA:** verificación (VERITAS/verifier fanout) con `risk-bounded early exit` realmente cableada, no solo como contrato.

**P2 — consolidación**

11. **Eliminar módulos duplicados** y reemplazar estados implícitos por estados del ledger.
12. **Pruebas E2E reales** en navegadores de escritorio y móvil (el smoke UI actual solo valida anclas y cableado estático).
13. **Compilador civilizatorio / heptafederación** materializados más allá del contrato conceptual.

**Bloqueadores por entorno** (`BLOCKED_ENVIRONMENT`): HSM/KMS, proveedor PQC real, SMTP, observabilidad gestionada y despliegue objetivo. Requieren infraestructura externa; no se simulan como verdes.

---

## 4. Arquitectura implementada y contratos

```text
Navegador (src/ui)
  ├─ navegación por secciones y menú adaptable
  ├─ conversación /api/v1/cognition/route
  ├─ voz del navegador (SpeechRecognition / SpeechSynthesis, si existe)
  └─ estado de salud /api/v1/health
             │
             ▼
Express + TypeScript (src/server.ts)
  ├─ validación de entrada y límites
  ├─ identidad, scopes, consentimiento y autoridad
  ├─ C.R.O.W.N. / AEGIS: admisión y guardrails
  ├─ runtime cognitivo y gateway de inferencia
  ├─ fallback local determinista (no es un LLM)
  ├─ memoria de sesión + conocimiento verificado
  ├─ BookPI (contrato append-only; durable pendiente)
  └─ observabilidad: métricas de latencia y endpoints operativos
             │
             ▼
Adaptadores / servicios opcionales
  ├─ OpenRouter (modelo gratuito por defecto; disponibilidad variable)
  ├─ Hugging Face (solo modelos configurados explícitamente)
  ├─ Gemini / AI Gateway (sujeto a configuración y política de coste)
  ├─ Supabase/Atlas (si las variables y permisos están configurados)
  └─ IGE-Ω Rust (workspace separado; no asumir integrado end-to-end)
```

C.R.O.W.N., YUN, AEGIS, ISA, VERITAS, BookPI e IGE-Ω son dominios con **distintos niveles de implementación**. Consulta [mapa de arquitectura](docs/ARCHITECTURE-OPERATING-MAP.md), [especificación C.R.O.W.N./VΩ](docs/CROWN-ISABELLA-VOMEGA-OPERATING-SPEC.md), [auditoría de navegación y chat](docs/audits/UI-NAVIGATION-AND-CHAT-AUDIT-2026-10-12.md), [estado real](docs/ESTADO-REAL-ACTUAL.md) y [gates de IGE-Ω](ige-omega/docs/OPERATIONS-AND-RELEASE-GATES.md). La documentación diferencia contratos de componentes realmente conectados.

---

## 5. Interfaz, navegación y voz

La interfaz de `src/ui/index.html`, `src/ui/cinematic.css` y `src/ui/app.js` contiene:

- Anclas funcionales para Inicio, Conversar, Tools, Skills, Monetización y Gobernanza; el smoke verifica que cada destino exista.
- Menú móvil accesible con `aria-expanded`, cierre por Escape/clic fuera y cierre después de seleccionar una sección.
- Estado de API consultado a `/api/v1/health`; “API disponible” solo indica que el endpoint de salud respondió, **no** que la inferencia externa esté activa.
- Conversación contra la ruta real `POST /api/v1/cognition/route`, con historial limitado a ocho mensajes previos y sin duplicar el mensaje actual.
- Manejo de respuestas HTTP no exitosas, cuerpo JSON inválido, solicitudes duplicadas y estados de carga.
- Reconocimiento y síntesis de voz del navegador cuando estén disponibles y autorizados; navegadores y sistemas ofrecen voces distintas. No se garantiza una voz femenina específica ni soporte universal.
- Preferencia de movimiento reducido, foco visible y enlace para saltar al chat.

La interfaz **no** crea herramientas productivas por mostrar tarjetas de “Tools”, ni activa cobros, campañas o automatizaciones comerciales. Esas acciones requieren endpoints, permisos, proveedores y pruebas independientes.

---

## 6. API y rutas

El inventario estático de endpoints se mantiene en [docs/api/route-inventory.json](docs/api/route-inventory.json), junto con [guía de API](docs/api/README.md) y [OpenAPI](docs/api/openapi.yaml). El inventario es una ayuda de revisión; su marca de “verified” debe apoyarse en pruebas reales, no solo en que la ruta exista.

Rutas de referencia para la interfaz y diagnóstico:

| Método | Ruta | Uso |
|---|---|---|
| GET | `/` | Interfaz principal |
| GET | `/styles/cinematic.css` | Estilos de la interfaz |
| GET | `/ui/app.js` | Lógica del navegador |
| GET | `/health` | Salud básica del runtime |
| GET | `/api/v1/health` | Salud pública de API |
| GET | `/api/v1/status` | Estado resumido |
| POST | `/api/v1/cognition/route` | Conversación/orquestación |
| POST | `/api/v1/cognitive/request` | Mediación cognitiva (contexto de sesión + conocimiento verificado) |
| GET | `/api/v1/metrics` | Métricas agregadas (latencia, errores, throughput) |
| POST | `/api/v1/memory/verified` | Alta de conocimiento verificado (requiere token admin) |
| GET | `/api/v1/memory/verified` | Búsqueda de conocimiento verificado (requiere token admin) |
| GET | `/api/v1/osiris/status` | Postura y métricas OSIRIS (requiere token admin) |
| POST | `/api/v1/osiris/inspect` | Inspección de señal OSIRIS, advisory (requiere token admin) |
| GET | `/api/v1/billing/plans` | Planes, funciones y cuotas (público) |
| GET | `/api/v1/billing/entitlements` | Funciones y cuotas del plan (público) |
| POST | `/api/v1/billing/subscribe` | Registra suscripción verificada por proveedor (token admin) |
| POST | `/api/v1/billing/cancel` | Cancela la suscripción registrada (token admin) |
| GET | `/api/v1/billing/usage` | Uso del día vs cuota por clave (token admin) |
| POST | `/api/v1/commerce/offers` | Puerta real: exige función `offer` + cuota `active_offers` (token admin) |
| GET | `/api/v1/gameover/constitution` | Constitución UAGP-1 (token admin) |
| GET | `/api/v1/gameover/passports` | Lista de AI Passports registrados (token admin) |
| POST | `/api/v1/gameover/passports` | Emite un AI Passport (token admin) |
| POST | `/api/v1/gameover/passports/revoke` | Revoca un AI Passport (token admin) |
| POST | `/api/v1/gameover/govern` | Adjudica una solicitud de gobernanza UAGP-1 (token admin) |
| GET | `/api/v1/hypercore/modes` | Modos y disclaimer de HyperCore Ω² (público) |
| POST | `/api/v1/hypercore/run` | Ejecuta el pipeline HyperCore Ω² fail-closed (token admin) |
| POST | `/api/v1/hypercore/predict` | Predicción de intención HyperPredict Ω, observe/prefetch (token admin) |
| GET | `/api/v1/readyz` | Readiness operativa |

Para rutas sensibles, consultar el handler y los controles de autorización antes de habilitarlas a usuarios externos. No se deben inferir permisos a partir del nombre de una ruta.

---

## 7. Requisitos y ejecución local

- Node.js **24.x**.
- pnpm **10.28.x** (fijado en el campo `packageManager`).
- Rust toolchain fijado en `ige-omega/rust-toolchain.toml` para el workspace Rust.
- Python solo para los bridges que lo requieran.

```bash
corepack enable
pnpm install --frozen-lockfile
pnpm run dev
```

La aplicación escucha en el puerto 3000 por defecto. Para validar antes de enviar cambios:

```bash
pnpm run typecheck
pnpm test
pnpm run smoke:ui
pnpm run smoke:runtime
pnpm run security:suite
pnpm run build
```

`pnpm run build` ejecuta compilación TypeScript, Vitest, bundle de esbuild, comprobación sintáctica del JS de interfaz, smoke de navegación/UI y smoke de runtime. Los resultados deben guardarse por SHA; no se deben copiar resultados de un commit previo como evidencia del nuevo.

> Nota de entorno: si existe un `pnpm-workspace.yaml` en un directorio padre, pnpm tratará ese directorio como raíz de workspace e instalará ahí. Para un install autocontenido del repositorio usa `pnpm install --frozen-lockfile --ignore-workspace`.

---

## 8. Configuración de proveedores

Las claves son variables de entorno de servidor; nunca deben exponerse en el frontend.

| Variable | Propósito |
|---|---|
| `OPENROUTER_API_KEY` | Habilita adaptador OpenRouter |
| `OPENROUTER_FREE_MODEL` | Modelo OpenRouter elegido; `openrouter/free` es el valor predeterminado |
| `HF_TOKEN` / `HF_FREE_MODELS` | Habilita los modelos Hugging Face configurados explícitamente |
| `GEMINI_API_KEY` / `MODEL_API_KEY` | Cliente Gemini cuando está configurado |
| `ALLOW_PAID_PROVIDER_FALLBACK` | Debe ser `true` para permitir rutas de pago donde se exige consentimiento de configuración |
| `INFERENCE_TIMEOUT_MS` | Timeout acotado de proveedores |
| `PROVIDER_FAILURE_COOLDOWN_MS` | Cooldown tras fallos del proveedor |
| `SESSION_MEMORY_MAX_MESSAGES` / `SESSION_MEMORY_MAX_SESSIONS` | Límites de la memoria de sesión |
| `GENESIS_ADMIN_API_TOKEN` | Autoriza el alta y búsqueda de conocimiento verificado |
| `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` | Persistencia Atlas/knowledge opcional; la clave de servicio solo en backend |
| `APP_PUBLIC_URL` | URL pública declarada al proveedor OpenRouter |

Consultar [.env.example](.env.example) y [guía de entorno](docs/ENVIRONMENT.md). Los modelos gratuitos tienen límites, cambian de disponibilidad y no deben tratarse como SLA. Si no existe proveedor operativo, el sistema puede responder mediante fallback local con capacidades limitadas.

---

## 9. Seguridad y operación

- No guardar secretos en frontend, README, commits, fixtures o logs.
- Mantener CORS, autenticación, scopes, límites, validación y controles de tenant explícitos para cada ruta sensible.
- Rechazar por defecto acciones sin consentimiento, identidad o autoridad requerida.
- Tratar historial y texto de usuario como entrada no confiable.
- No registrar payloads sensibles ni cuerpos completos de error de proveedores.
- Verificar firma e idempotencia de webhooks antes de procesarlos.
- Ejecutar [suite de seguridad](scripts/security-suite.mjs), [smoke runtime](scripts/runtime-smoke.mjs) y [repository assurance](.github/workflows/repository-assurance.yml).
- Usar [modelo de amenazas](docs/security/GENESIS-V6-THREAT-MODEL.md) y [runbook del gate de modelo](docs/runbooks/BETA-LIVE-MODEL-GATE.md) antes de habilitar capacidades externas.

---

## 10. Estructura del repositorio

| Ruta | Responsabilidad |
|---|---|
| `src/server.ts` | Runtime HTTP, rutas, políticas y adaptadores |
| `src/ui/` | HTML, CSS y JS de interfaz |
| `src/inference/` | Router, adaptadores y políticas de proveedor |
| `src/cognition/`, `src/genesis/`, `src/isabella/` | Orquestación y contratos cognitivos |
| `src/crown/`, `src/security/`, `src/identity/`, `src/authority/` | Gobernanza, identidad y seguridad |
| `src/osiris/` | Ciberdefensa observacional (detección, postura, registro) |
| `src/memory/`, `src/atlas/`, `src/bookpi/`, `src/veritas/` | Memoria, persistencia y evidencia |
| `src/federation/`, `src/observability/`, `src/deployment/` | Eventos, telemetría y operación |
| `src/commerce/` | Comercio: planes, candados, conectores + motor de entitlements/suscripciones/metering |
| `src/gameover/` | Gobernanza de agentes GAME OVER / UAGP-1 (passport, trust, riesgo, ética, corte, auditoría) |
| `gameover-jenkins-plugin/` | Plugin Jenkins `gameover-governance` (fuente; step `gameOverGovernance`) |
| `ige-omega/` | Workspace Rust separado |
| `test/` | Pruebas automatizadas (124 archivos) |
| `scripts/` | Smokes, seguridad, inventarios y evidencia |
| `docs/` | Especificaciones, auditorías, runbooks y contratos |

---

## 11. Licencia y responsabilidad

El repositorio declara licencia MIT. La licencia no constituye certificación de seguridad, cumplimiento legal, capacidad comercial ni garantía de disponibilidad. Las integraciones de terceros quedan sujetas a sus propios términos y configuración.

**Regla de liberación:** no fusionar ni desplegar a producción por narrativa ni por un porcentaje aislado. Exigir evidencia reproducible del SHA, pruebas integrales, revisión humana con nombre y rollback comprobado.
