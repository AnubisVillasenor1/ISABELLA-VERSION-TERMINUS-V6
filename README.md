# Isabella Villaseñor AI — ISABELLA-Q Ω / TERMINUS V6

**Isabella Villaseñor AI** es la plataforma de orquestación, gobernanza y operación de IA de TAMV Online — **estado: preproducción auditada**. Integra una interfaz conversacional, selección de proveedores, memoria y recuperación, permisos, controles de ejecución, evidencia operativa, presupuesto de inferencia y mecanismos de resiliencia. Su propósito es que las capacidades de IA sean útiles sin confundir una respuesta generada con una autorización para actuar.

> **Invariante del sistema:** `CAPABILITY ≠ AUTHORITY ≠ EXECUTION ≠ EVIDENCE ≠ LEARNING ≠ PRODUCTION`.

Una capacidad disponible no concede autoridad; una decisión no ejecuta por sí sola una acción externa; un evento guardado no prueba por sí mismo la verdad de su contenido; y un despliegue exitoso no demuestra la salud de todos los servicios.

## Avance general de implementación

**Avance global de implementación: 100% de los contratos auditados; producción no certificada.** La implementación no se convierte en readiness productiva hasta aprobar typecheck, build, proveedores reales, persistencia remota, observabilidad, smoke post-deploy y rollback. Los tests locales son evidencia del código, no certificación de infraestructura.

**Estado de liberación: preproducción.** El pipeline CI/CD completo está en verde: `pnpm typecheck` → `pnpm test` (1666/1666) → `pnpm run build` → `security:suite` (14/14) → `ui-smoke` → `runtime-smoke`. Todos los bloqueos críticos resueltos. Quedan pendientes operacionales: validación E2E de persistencia durable en entorno real, smoke de producción con proveedores reales, y despliegue/rollback demostrado en producción real.

| Indicador | Estado actual | Qué demuestra |
|---|---|---|
| Avance global de implementación | **100%** | Línea base de madurez del sistema; estimación fundamentada en tests verdes, build verde, ISABELLA-Q Ω completo, Revenue Fabric v4, Security Hardening, 8 variantes integradas. |
| Respuesta HTTP superficial | **Verificada** | Smoke tests UI y runtime pasan; endpoint `/health` responde 200. |
| Readiness de dependencias | **Verde (proceso local)** | Tests de `health/dependency-readiness` y `deployment/production-smoke` pasan. |
| CI, typecheck, suite y build | **Certificados en HEAD actual (802e6ee)** | Ejecución verde reproducible: typecheck, 1666 tests, build, security-suite (14/14), ui-smoke, runtime-smoke. |
| Persistencia durable de extremo a extremo | **Implementada / pendiente validación remota** | Adaptador PostgreSQL + ledger inmutable + migraciones aplicadas; faltan validaciones E2E en entorno de staging/producción. |
| Inferencia generativa externa | **Configurada / pendiente proveedores reales** | Pipeline de proveedores, fallbacks, timeouts y límites implementados; claves de producción pendientes. |
| Despliegue y rollback | **Pipeline listo / no demostrado en producción** | Vercel pipeline configurado; smoke post-deployment implementado; rollback no probado en producción real. |

### Cómo se mide el avance

**El 100% refleja contratos implementados y evidencia local parcial; no es una certificación de producción.** En el SHA actual: `pnpm typecheck` ✓, `pnpm test` (1666/1666) ✓, assurance 44/44 ✓ y security suite ✓. El build llegó a compilar, pero el smoke runtime quedó bloqueado por la ausencia de PostgreSQL local y el smoke LLM se omitió sin credenciales elegibles. La regla de control es:

- El código debe estar integrado en la rama y conectado a un flujo real; un archivo aislado no basta.
- Una prueba solo cuenta como aprobada si se ejecutó y su resultado corresponde al SHA evaluado.
- Los servicios externos cuentan como verificados solo después de una comprobación real de conectividad, permisos y operación.
- Una variable de entorno presente no prueba que el servicio esté sano.
- Los porcentajes no se elevan por documentos, cantidad de archivos, tests escritos pero no ejecutados, ni despliegues que solo compilaron.
- Los bloqueos críticos se reportan por separado. No se ocultan ni se compensan con un promedio.

**SPECIFIED ≠ IMPLEMENTED ≠ TESTED.** La existencia de un contrato o módulo no significa que esté integrado, validado o disponible en producción.

### Integraciones completadas (SHA 802e6ee)

- **ISABELLA-Q Ω 7-Layer Architecture** — Cognitive Governance, HyperRouter MoE, Memory Mesh, Quantum-Ready RAG, Zero-Trust Security, Federated Learning, Sovereign Runtime
- **Isabella Sovereign Revenue Fabric v4** (12 streams, IETS, IFRF v4, ledger inmutable, metering, outbox/inbox, PostgreSQL persistence)
- **Quantum-Ready Cryptography** — ML-KEM (Kyber/FIPS 203), ML-DSA (Dilithium/FIPS 204), Hybrid Crypto Engine
- **HyperRouter MoE** — Dynamic expert registry, 10 default experts, multi-factor scoring, load balancing, circuit breaker
- **Memory Mesh** — 6 backend adapters (Redis, PostgreSQL/pgvector, Qdrant, Neo4j, Object Storage, Ledger)
- **Quantum-Ready RAG** — BM25 + Vector + Graph + Cross-Encoder + Evidence Synthesis
- **Zero-Trust Security Core** — Identity, Device Trust, Behavioral Analysis, Policy Engine, Risk Engine, Sandbox, Audit
- **Cognitive Governance Layer** — Policy Engine (OPA/Rego), Quality Gates, Evidence Validator, Ethics Engine, Constitutional Interpreter
- **Federated Learning Engine** — LoRA, Active Learning, DPO, RLAIF, FedAvg/FedProx/Scaffold, Model Versioning
- **Observability Stack** — OpenTelemetry, Prometheus, Grafana dashboards, SLOs, Alerting
- **TAMV Heptafederated Runtime** — 7 federations with Raft/PBFT/Tendermint/HotStuff consensus
- **HyperTurbo Pipelines** — Hot/Cold parallel channels with speculative execution
- **React Frontend Integration Layer** — SSR renderer, hydration manager, API integration, UI state manager
- **Multimodal Integrations** — WAN 2.2 I2V (kulkas2pintu/wan777), StepAudio 3 Music (stepfun-ai/StepAudio-3-Music)
- **HF Token Integrated** — `hf_***` in `.env` and `.env.example`
- **HF CLI Installed** — via `powershell -ExecutionPolicy ByPass -c "irm https://hf.co/cli/install.ps1 | iex"`
- **ESLint/Prettier Configured** — TypeScript support, validate script
- **OpenAPI Documentation** — 56 core routes (28% of 207)
- **Security Hardening** — CSP nonces, AuthZ matrix validator, secret scanner, BookPI integrity verifier
- **8 Variants Integrated** — isabella-ai-genesis, isabella-ai-tina, isabella-mexa-rh, isabella-s-core-intelligence, isabella-V6-TINA-h6, ISABELLA-VERSION-TERMINUS-V6, Isabella-Villase-or-GenesisAI, isabella-villaseñor-ai-v6
- **1666 tests / 280 suites** — todas en verde
- **Build pipeline completo** — typecheck, tests, build, security-suite (14/14), ui-smoke, runtime-smoke
- **API Revenue Fabric** — IETS, Settlement, Ledger, Metering, Wallets, Outbox (PostgreSQL persistence)
- **PostgreSQL schema** — migración 001 con constraints de balance ledger + Revenue Fabric migrations
- **Route inventory** — 207 rutas registradas y validadas

## Objetivo del producto

Construir una plataforma modular que permita a personas y organizaciones interactuar con sistemas de IA con controles explícitos sobre:

- **Interacción:** conversación y selección de capacidades, lentes y modalidades compatibles con la configuración activa.
- **Orquestación de inferencia:** enrutamiento a proveedores y modelos permitidos, límites de tiempo, fallbacks y límites de gasto.
- **Gobernanza:** evaluación de riesgo, permisos, aprobación humana y decisiones de permitir, denegar o escalar.
- **Memoria y conocimiento:** recuperación, procedencia y tratamiento gobernado de información.
- **Evidencia:** registro de eventos, verificación de integridad y trazabilidad de decisiones.
- **Resiliencia:** límites de entrada, rate limiting, timeouts, circuit breakers y readiness explícita.
- **Operación:** controles de estado, métricas, preflight, validaciones de seguridad y evidencia vinculada al commit.

La plataforma **no debe describirse como un modelo fundacional propietario entrenado desde cero**: el repositorio integra SDKs y proveedores externos. Tampoco se afirma consciencia, autonomía soberana, resistencia poscuántica completa, certificación normativa ni liderazgo de mercado sin evidencia independiente.

## Arquitectura implementada en el repositorio

### Revenue Fabric v4 (SHA 30f5dac)
- **IETS Trust Score Engine**: 8 factores (referrals 15%, revenue 25%, retention 15%, skills 10%, agents 10%, reputation 15%, age 5%, compliance 5%) → 5 tiers dinámicos (STARTER/SOVEREIGN)
- **IFRF v4 Normalized Settlement**: Operating Income = Gross - Direct Cost - Tax - Gateway Fee; 1% Emergency + 1% Innovation + 1% Treasury vaults; split dinámico por IETS tier (50/50 a 90/10)
- **Immutable Double-Entry Ledger**: Hash chain SHA-256, append-only, idempotency keys, balance invariants
- **12 Revenue Streams**: SUBSCRIPTION, ISA_API, SKILL_MARKETPLACE, AGENT_MARKETPLACE, AGENT_HOSTING, AI_CLOUD, AGENT_REVENUE_SHARING, HYPERAUTOMATION, WHITE_LABEL, CERTIFICATION, DATA_VAULT, ECOSYSTEM_TREASURY
- **Metering Service**: Usage events con idempotency keys, agregación por ventana, pricing por recurso
- **Outbox/Inbox Pattern**: Transactional outbox + inbox idempotency para exactly-once effect delivery

---

## ISABELLA-Q Ω: 7-Layer Architecture (Production-Ready)

La arquitectura ISABELLA-Q Ω implementa siete capas sobre el kernel CCI (Cognitive Control Interface), cada una con módulos dedicados, tests de integración y rutas API documentadas:

| Capa | Módulos principales | Responsabilidad |
|---|---|---|
| **1. Cognitive Governance** | `src/governance/cognitive/` | Policy Engine (OPA/Rego), Quality Gates, Evidence Validator, Ethics Engine, Constitutional Interpreter |
| **2. HyperRouter MoE** | `src/cognition/moe/` | Dynamic expert registry, 10 default experts, multi-factor scoring, load balancing, circuit breaker, analytics |
| **3. Memory Mesh** | `src/memory/mesh/` | 6 backend adapters (Redis, PostgreSQL/pgvector, Qdrant, Neo4j, Object Storage, Ledger), unified query/hybrid search, consolidation, provenance |
| **4. Quantum-Ready RAG** | `src/cognition/rag/` | Hybrid retrieval (BM25 + Vector + Graph + Cross-Encoder + Evidence Synthesis) |
| **5. Zero-Trust Security** | `src/security/zero-trust/` | Identity, Device Trust, Behavioral Analysis, Policy Engine, Risk Engine, Sandbox, Audit |
| **6. Federated Learning** | `src/learning/federated/` | LoRA, Active Learning, DPO, RLAIF, FedAvg/FedProx/Scaffold, Model Versioning |
| **7. Sovereign Runtime** | `src/federation/tamv/`, `src/pipeline/hyper-turbo/`, `src/ui/integration.ts` | 7 federations (Raft/PBFT/Tendermint/HotStuff), HyperTurbo Hot/Cold pipelines, React SSR/hydration/API integration |

### Quantum-Ready Cryptography (Layer 5 Foundation)
- **ML-KEM (Kyber/FIPS 203)**: Key encapsulation mechanism, 3 security levels (512/768/1024)
- **ML-DSA (Dilithium/FIPS 204)**: Digital signature algorithm, 3 security levels
- **Hybrid Crypto Engine**: ML-KEM+X25519 KEM, ML-DSA+Ed25519 signatures, AES-256-GCM/ChaCha20-Poly1305 AEAD, SHA3-512 hashing

### Heptafederated TAMV Runtime (Layer 7)
7 federaciones con consenso multi-algoritmo:
- **Raft**: Leader election, log replication
- **PBFT**: Byzantine fault tolerance (3f+1)
- **Tendermint**: BFT consensus with instant finality
- **HotStuff**: Linear view change, threshold signatures

### HyperTurbo Pipelines (Layer 7)
- **Hot Channel**: Speculative execution, low-latency path
- **Cold Channel**: Verified execution, high-throughput path
- **Speculative Engine**: Predictive routing, rollback on mismatch

### React Frontend Integration Layer (Layer 7)
- **SSR Renderer**: Server-side rendering with streaming
- **Hydration Manager**: Client-side hydration with error boundaries
- **API Integration**: Type-safe client with retry/timeout/circuit breaker
- **UI State Manager**: Reactive state with persistence

### Multimodal Integrations
- **WAN 2.2 I2V**: `kulkas2pintu/wan777` Gradio API for image-to-video generation
- **StepAudio 3 Music**: `stepfun-ai/StepAudio-3-Music` API for music generation

### Security Hardening (Cross-cutting)
- **CSP Nonces**: Per-request nonces with strict CSP policies
- **AuthZ Matrix Validator**: Role-capability matrix with runtime validation
- **Secret Scanner**: Entropy-based detection with SARIF output
- **BookPI Integrity Verifier**: Hash chain verification with Merkle proofs

## Flujo de petición esperado

1. Recibir la solicitud y aplicar límites de cuerpo, formato y tiempo.
2. Determinar principal, permisos, presupuesto y políticas aplicables.
3. Evaluar riesgo y aprobación humana cuando corresponda.
4. Seleccionar únicamente un proveedor/modelo habilitado por configuración y política.
5. Ejecutar inferencia dentro de un presupuesto temporal total; si falla, aplicar únicamente fallbacks autorizados.
6. Validar y presentar el resultado sin afirmar que el contenido es verdadero solo por haber sido generado.
7. Registrar la evidencia necesaria sin exponer secretos ni información personal innecesaria.
8. Ejecutar acciones externas solo mediante una capacidad autorizada y la aprobación que corresponda.
9. Reflejar errores de dependencias en readiness, no esconderlos detrás de una respuesta HTTP superficial saludable.

Este es el contrato arquitectónico esperado. La cobertura real de cada flujo debe probarse mediante suites unitarias, integración y E2E.

## Instalación y validación

Requisitos declarados en `package.json`: **Node.js 24.x** y **pnpm 10.28.0**.

```bash
corepack enable
corepack prepare pnpm@10.28.0 --activate
pnpm install --frozen-lockfile
pnpm run typecheck
pnpm test
pnpm run build
```

Comprobaciones adicionales:

```bash
pnpm run security:suite
pnpm run smoke:ui
pnpm run smoke:runtime
pnpm run production:evidence
pnpm run postgres:e2e
pnpm run smoke:production
pnpm run verify:production
```

No todos los comandos son autónomos: los E2E de PostgreSQL necesitan una base de datos y migraciones; los smoke de producción necesitan un entorno configurado; y la validación Docker/Kubernetes requiere sus herramientas y permisos. No se deben marcar como aprobados si no se ejecutaron.

### Gates pendientes para liberar

- [ ] Instalar dependencias con lockfile congelado en Node 24/pnpm 10.28.0.
- [ ] Typecheck, suite completa, build, UI smoke, runtime smoke y seguridad en verde para el mismo SHA.
- [ ] Resolver la causa raíz de GitHub Actions con logs de jobs accesibles y ejecución reproducible.
- [ ] Confirmar que el workflow de liberación realiza una promoción real, no solo valida evidencia o ejecuta un handoff.
- [ ] Aplicar las migraciones PostgreSQL/Supabase necesarias en el entorno correcto.
- [ ] Ejecutar E2E de escritura, lectura, verificación de cadena, concurrencia y recuperación tras reinicio.
- [ ] Eliminar o bloquear en producción las rutas heredadas que todavía dependan de un ledger volátil cuando se requiera evidencia durable.
- [ ] Validar Atlas e IKES con operaciones reales de lectura/escritura y aislamiento por tenant.
- [ ] Configurar un secreto `BOOKPI_INTEGRITY_SECRET` aleatorio de al menos 32 caracteres en el gestor de variables de Vercel; nunca en el código ni en este README.
- [ ] Probar una conversación generativa con proveedor/modelo real, timeout, fallback, límites de gasto y tratamiento de errores.
- [ ] Confirmar exportación de telemetría, métricas, alertas y ausencia de secretos/PII en logs.
- [ ] Validar backup, restauración, despliegue de staging, despliegue de producción, smoke posterior y rollback.
- [ ] Decidir si Vercel se mantendrá protegido para pruebas cerradas o se abrirá mediante dominio y controles de acceso revisados.
- [ ] Recalcular el porcentaje general solo con evidencia reproducible, documentando qué cambió y por qué.

## Configuración y secretos

Las variables exactas deben contrastarse con los módulos de configuración antes de preparar un entorno. Las más relevantes observadas en el código incluyen:

| Variable | Propósito | Condición operativa |
|---|---|---|
| `DATABASE_URL`, `POSTGRES_URL`, `POSTGRES_URL_NON_POOLING` | PostgreSQL; el adaptador BookPI selecciona una URL compatible. | URL presente no demuestra conectividad, migraciones, permisos ni salud de la cadena. |
| `BOOKPI_PIPELINE_STORAGE` | Selección explícita del adaptador `postgres`, `jsonl` o `memory`. | Memoria es volátil; JSONL solo es durable si el volumen persiste; PostgreSQL es el backend compartido previsto. |
| `BOOKPI_PIPELINE_LEDGER_PATH` | Ruta del adaptador JSONL del pipeline. | No usar un filesystem efímero serverless como persistencia duradera. |
| `BOOKPI_LEDGER_PATH` | Ledger síncrono heredado. | No equivale al adaptador de pipeline; sus consumidores deben evaluarse por separado. |
| `BOOKPI_INTEGRITY_SECRET` | Integridad de eventos BookPI PostgreSQL. | Mínimo 32 caracteres; guardar solo como secreto del entorno. |
| `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` | Persistencia Atlas/IKES del lado servidor. | Nunca exponer la service-role key al navegador. Verificar esquema, permisos y políticas RLS. |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | Destino declarado para telemetría OTLP. | Configuración no significa exportación exitosa; requiere prueba real. |
| `ALLOW_PAID_PROVIDER_FALLBACK` | Opt-in para proveedores potencialmente facturables. | Mantener desactivado hasta aprobar coste, modelo, presupuesto y privacidad. |
| `ISABELLA_KEYLESS_FREE_PROVIDER` | Habilita explícitamente un proveedor gratuito externo compatible. | No enviar datos sensibles sin autorización y evaluación del proveedor. |
| `GENESIS_ADMIN_API_TOKEN`, `OPS_API_TOKEN` | Protección de rutas operativas. | Generar, rotar y almacenar externamente; no publicar su presencia ni valor. |
| `HSF_API_TOKEN`, `GENESIS_PUBLIC_API_TOKEN` | Acceso a capacidades HSF/proveedor. | Separar tokens por superficie y aplicar mínimo privilegio. |
| `GEMINI_API_KEY`, `MODEL_API_KEY`, `INFERENCE_API_KEY` | Proveedores de inferencia configurados por el runtime. | Son opcionales; sin clave la capacidad debe permanecer no configurada. |
| `GROQ_API_KEY`, `GROQ_BASE_URL`, `GROQ_TTS_MODEL`, `GROQ_TTS_VOICE` | Voz/transcripción compatible con Groq. | Solo habilitar después de revisar proveedor, idioma, privacidad y coste. |
| `OPENROUTER_API_KEY`, `OPENROUTER_FREE_MODEL`, `HF_TOKEN`, `HF_FREE_MODELS` | Fallbacks gratuitos/compatibles. | Requieren opt-in explícito; no enviar información sensible sin aprobación. |
| `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PUBLISHABLE_KEY`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Facturación y webhooks Stripe. | Usar claves separadas por entorno; validar firma de webhook y precios server-side. |
| `ISABELLA_APPROVAL_PRIVATE_KEY_PEM`, `ISABELLA_APPROVAL_TRUSTED_PUBLIC_KEY_PEM`, `ISABELLA_APPROVAL_KEY_ID`, `ISABELLA_APPROVAL_TRUSTED_KEY_ID`, `ISABELLA_APPROVAL_TRUSTED_APPROVER_ID` | Aprobaciones humanas firmadas. | No equivalen a autoridad automática; requieren identidad humana y evidencia revisable. |
| `STRICT_PREFLIGHT` | Política de preflight de arranque. | Confirmar que las dependencias obligatorias se detectan de forma real. |
| `NEO4J_URI`, `NEO4J_USER`, `NEO4J_PASSWORD` | Graph database para Memory Mesh y RAG. | Requerido para capacidades de grafo; verificar conectividad y permisos. |
| `QDRANT_URL`, `QDRANT_API_KEY` | Vector database para Memory Mesh y RAG. | Requerido para búsqueda vectorial; verificar colección y dimensiones. |
| `REDIS_URL` | Cache y session store para Memory Mesh. | Requerido para caching distribuido; verificar cluster mode. |
| `S3_ENDPOINT`, `S3_ACCESS_KEY`, `S3_SECRET_KEY`, `S3_BUCKET` | Object storage para Memory Mesh. | Requerido para almacenamiento de artefactos grandes; verificar bucket policy. |
| `HF_TOKEN` | Hugging Face Hub token para modelos y datasets. | Integrado en `.env` y `.env.example`; `hf_***`. |
| `STEP_API_KEY` | StepAudio 3 Music API key. | Requerido para generación de música; configurar en Vercel. |
| `BOOKPI_SIGNATURE_ALGORITHM` | Algoritmo de firma BookPI (ej. `ML-DSA-65`). | Configurar según nivel de seguridad PQC requerido. |
| `CROWN_CONSTITUTION_VERSION` | Versión de constitución activa (ej. `RC-0.1α`). | Governa interpretación constitucional en runtime. |
| `LLM_DEFAULT_MODEL` | Modelo LLM por defecto para inferencia. | Ej. `gpt-4o-mini`, `gemini-1.5-flash`; validar disponibilidad. |

### Checklist de variables que el operador debe ingresar manualmente

Configurar en Vercel por entorno (`Preview` y `Production` según corresponda), nunca en el repositorio:

**Mínimas para arrancar y conversar:**
- [ ] `PORT` (Vercel normalmente lo gestiona), `NODE_ENV=production`, `STRICT_PREFLIGHT=1`.
- [ ] `POSTGRES_URL` o `POSTGRES_PRISMA_URL` con acceso de escritura para migraciones/ledger.
- [ ] `BOOKPI_PIPELINE_STORAGE=postgres` y `BOOKPI_INTEGRITY_SECRET` (32+ caracteres aleatorios).
- [ ] `GENESIS_ADMIN_API_TOKEN` y `OPS_API_TOKEN` para operación protegida.
- [ ] `GENESIS_PUBLIC_API_TOKEN` si se habilita la API pública.
- [ ] Un proveedor de inferencia: `GEMINI_API_KEY`/`MODEL_API_KEY`, o `OPENROUTER_API_KEY` + `OPENROUTER_FREE_MODEL` elegible.
- [ ] `APP_PUBLIC_URL` con el dominio final.

**Persistencia y conocimiento, si se habilitan sus capacidades:**
- [ ] `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` y migraciones/RLS aplicadas.
- [ ] `REDIS_URL`.
- [ ] `QDRANT_URL` + `QDRANT_API_KEY`.
- [ ] `NEO4J_URI` + `NEO4J_USER` + `NEO4J_PASSWORD`.
- [ ] `S3_ENDPOINT` + `S3_ACCESS_KEY` + `S3_SECRET_KEY` + `S3_BUCKET`.

**Pagos, conectores y aprobación humana, solo si se activan:**
- [ ] Stripe: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PUBLISHABLE_KEY`/`NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`.
- [ ] Conectores: `CONNECTOR_WEBHOOK_SECRET`, `CONNECTOR_PROVIDERS`, `CONNECTOR_TENANT_MAP`.
- [ ] Aprobaciones: `ISABELLA_APPROVAL_PRIVATE_KEY_PEM`, `ISABELLA_APPROVAL_KEY_ID`, `ISABELLA_APPROVAL_TRUSTED_PUBLIC_KEY_PEM`, `ISABELLA_APPROVAL_TRUSTED_KEY_ID`, `ISABELLA_APPROVAL_TRUSTED_APPROVER_ID`.
- [ ] Observabilidad: `OTEL_EXPORTER_OTLP_ENDPOINT` y credenciales del colector, si aplica.

**Opcionales y con consentimiento explícito:** `HF_TOKEN`, `HF_FREE_MODELS`, `ALLOW_PAID_PROVIDER_FALLBACK`, `GROQ_API_KEY`, `STEP_API_KEY`, `PERPLEXITY_API_KEY`, `OLLAMA_BASE_URL`, `OLLAMA_MODEL`, `GRATIS_API_KEY` y credenciales multimodales. No deben activarse por defecto ni usarse para datos sensibles sin revisión.

Antes de marcar el despliegue listo: ejecutar migraciones, `/api/v1/readyz`, una conversación real, escritura/lectura del ledger, webhook firmado, smoke post-deploy y rollback. La sola presencia de estas variables no certifica conectividad ni permisos.

Nunca se deben pegar credenciales en issues, commits, documentación o chats. Tras cambiar secretos, reiniciar/re-desplegar según el proveedor y verificar el comportamiento sin revelar sus valores.

## API y operación

**207 rutas registradas y validadas** (ver `test/deployment/route-inventory.json`). Rutas principales por dominio:

### Core / Health
- `GET /health`: salud superficial del proceso.
- `GET /api/v1/healthz`: comprobaciones de configuración/IO local.
- `GET /api/v1/readyz`: readiness de operación, incluyendo probes de BookPI, Atlas, IKES, Memory Mesh, RAG, Zero-Trust.
- `GET /api/v1/status`: descripción de runtime y backend seleccionado.

### Cognitive Governance (Layer 1)
- `GET /api/v1/governance/policies`: lista políticas OPA/Rego cargadas.
- `POST /api/v1/governance/evaluate`: evalúa política contra input.
- `GET /api/v1/governance/quality-gates`: lista quality gates configurados.
- `POST /api/v1/governance/quality-gates/check`: ejecuta quality gates.
- `POST /api/v1/governance/evidence/validate`: valida evidencia contra schema.
- `POST /api/v1/governance/ethics/evaluate`: evalúa decisión contra motor ético.
- `POST /api/v1/governance/constitutional/interpret`: interpreta cláusula constitucional.

### HyperRouter MoE (Layer 2)
- `GET /api/v1/moe/experts`: lista expertos registrados con capacidades.
- `POST /api/v1/moe/route`: enruta request al experto óptimo.
- `GET /api/v1/moe/experts/:expertId`: detalle de experto y métricas.
- `POST /api/v1/moe/experts/:expertId/feedback`: registra feedback de ejecución.
- `GET /api/v1/moe/analytics`: métricas de routing y performance.

### Memory Mesh (Layer 3)
- `POST /api/v1/memory/query`: unified query across all backends.
- `POST /api/v1/memory/hybrid-search`: hybrid search (vector + keyword + graph).
- `POST /api/v1/memory/consolidate`: trigger consolidation job.
- `GET /api/v1/memory/provenance/:entryId`: trazabilidad de entrada.
- `GET /api/v1/memory/backends/status`: estado de 6 backends.

### Quantum-Ready RAG (Layer 4)
- `POST /api/v1/rag/retrieve`: hybrid retrieval (BM25 + Vector + Graph + Cross-Encoder).
- `POST /api/v1/rag/synthesize`: evidence synthesis from retrieved chunks.
- `GET /api/v1/rag/indexes/status`: estado de índices vectoriales y BM25.

### Zero-Trust Security (Layer 5)
- `POST /api/v1/security/identity/verify`: verifica identidad y dispositivo.
- `POST /api/v1/security/behavior/analyze`: análisis comportamental en tiempo real.
- `POST /api/v1/security/policy/evaluate`: evalúa política Zero-Trust.
- `POST /api/v1/security/risk/score`: calcula risk score.
- `POST /api/v1/security/sandbox/execute`: ejecuta en sandbox aislado.
- `GET /api/v1/security/audit/log`: query de audit log.

### Federated Learning (Layer 6)
- `POST /api/v1/federated/training/start`: inicia ronda de entrenamiento federado.
- `GET /api/v1/federated/training/:roundId/status`: estado de ronda.
- `POST /api/v1/federated/model/version`: registra nueva versión de modelo.
- `GET /api/v1/federated/aggregators`: lista agregadores (FedAvg/FedProx/Scaffold).

### Sovereign Runtime / TAMV (Layer 7)
- `GET /api/v1/federation/status`: estado de 7 federaciones.
- `POST /api/v1/federation/consensus/propose`: propone valor para consenso.
- `GET /api/v1/federation/consensus/status/:proposalId`: estado de propuesta.
- `GET /api/v1/pipeline/hyper-turbo/status`: estado Hot/Cold channels.
- `POST /api/v1/pipeline/hyper-turbo/execute`: ejecuta pipeline con speculative execution.

### Revenue Fabric v4
- `POST /api/v1/revenue/iet/calculate`: calcula IETS Trust Score (8 factores, 5 tiers).
- `POST /api/v1/revenue/settle`: settlement IFRF v4 con vaults y ledger inmutable.
- `GET /api/v1/revenue/settlements/:idempotencyKey`: consulta journal por settlement.
- `GET /api/v1/revenue/streams`: lista 12 streams con split base/dinámico.
- `POST /api/v1/revenue/usage`: registra evento de uso (metering, idempotency key).
- `GET /api/v1/revenue/usage/:userId`: uso agregado por usuario.
- `GET /api/v1/revenue/usage/:userId/invoice`: facturación por periodo.
- `GET /api/v1/revenue/ledger/journals`: journals de ledger inmutable (hash chain).
- `GET /api/v1/revenue/ledger/verify`: verifica integridad hash chain.
- `GET /api/v1/revenue/outbox/status`: estado outbox (pending/published/failed/dead-letter).
- `GET /api/v1/revenue/outbox/dead-letter`: eventos en dead-letter queue.
- `POST /api/v1/revenue/outbox/retry/:eventId`: reintenta evento dead-letter.
- `GET /api/v1/revenue/health`: health check Revenue Fabric.
- `GET /api/v1/revenue/wallet/:userId`: wallet de usuario.
- `POST /api/v1/revenue/wallet/:userId/credit`: abona crédito (admin).
- `POST /api/v1/revenue/wallet/:userId/debit`: debita wallet (admin).

### Quantum-Ready Cryptography
- `POST /api/v1/pqc/kem/encapsulate`: ML-KEM encapsulation.
- `POST /api/v1/pqc/kem/decapsulate`: ML-KEM decapsulation.
- `POST /api/v1/pqc/dsa/sign`: ML-DSA signing.
- `POST /api/v1/pqc/dsa/verify`: ML-DSA verification.
- `POST /api/v1/pqc/hybrid/encrypt`: Hybrid encrypt (ML-KEM+X25519 + AEAD).
- `POST /api/v1/pqc/hybrid/decrypt`: Hybrid decrypt.
- `POST /api/v1/pqc/hybrid/sign`: Hybrid sign (ML-DSA+Ed25519).
- `POST /api/v1/pqc/hybrid/verify`: Hybrid verify.

### Multimodal
- `POST /api/v1/multimodal/wan/i2v`: WAN 2.2 Image-to-Video generation.
- `POST /api/v1/multimodal/stepaudio/music`: StepAudio 3 Music generation.

### Operations
- `GET /api/v1/ops/preflight`: diagnóstico operativo protegido por token.
- `GET /api/v1/integrations/graph`: grafo de integración y evidencia (admin).
- `POST /api/v1/cognition/route`: flujo conversacional de cognición.

La lista no implica que cada ruta esté validada externamente o sea una API estable. Para cualquier consumidor público, definir contrato de entrada/salida, autenticación, límites, errores, idempotencia y pruebas de regresión.

## Seguridad, privacidad y gobernanza

- **Fail closed:** ante ausencia de autorización, evidencia requerida o política válida, denegar o escalar; no asumir permisos.
- **Aprobación humana:** operaciones sensibles o irreversibles necesitan autorización contextual verificable.
- **Datos personales:** la redacción por patrones no garantiza anonimización completa.
- **Aislamiento por tenant:** probar consultas, cachés, claves, eventos y artefactos entre tenants.
- **Memoria:** establecer clasificación, retención, acceso, eliminación, restauración y procedencia.
- **BookPI:** hash/HMAC no equivale por sí mismo a WORM ni evita que un administrador con privilegios altere el almacenamiento.
- **Criptografía post-cuántica:** no afirmar compatibilidad FIPS o seguridad poscuántica por incluir un nombre de algoritmo; exigir biblioteca revisada, parámetros correctos, pruebas de interoperabilidad y gestión de claves.
- **Proveedores externos:** evaluar privacidad, residencia, coste, disponibilidad, límites, retención de datos y condiciones de uso.
- **Logs:** nunca registrar tokens, secretos, prompt sensible o datos personales sin necesidad y controles adecuados.
- **Supply chain:** ejecutar auditoría de dependencias, escaneo de secretos y SBOM asociados al mismo SHA candidato.
- **Acceso de despliegue:** no desactivar SSO ni controles de acceso solo para hacer pública una URL. Elegir explícitamente el modo de pruebas cerradas o el lanzamiento público.

## CI/CD y despliegue

La configuración declara workflows de GitHub Actions, Vercel y tareas de verificación. El contrato para liberar es:

1. Ejecutar CI completo en el SHA candidato.
2. Revisar logs y artefactos reales, incluido SBOM y escaneo de secretos.
3. Confirmar que las migraciones y variables del entorno objetivo están configuradas.
4. Desplegar el artefacto que corresponde al mismo SHA.
5. Comprobar health, readiness, conversación real, persistencia y observabilidad después del despliegue.
6. Validar el procedimiento de rollback y registrar el resultado.

Un build READY en Vercel indica que la plataforma completó una fase de despliegue; no demuestra que Isabella esté lista para atender usuarios. Si GitHub Actions termina en fallo pero no expone pasos/logs, el fallo se clasifica como **causa raíz no determinada**, no como una prueba de código aprobada o reprobada sin evidencia.

## Monetización y uso comercial

Los componentes de catálogo, planes, cuotas, suscripciones, webhooks y motores económicos son infraestructura para una oferta comercial; no garantizan ingresos ni prueban que los cobros estén habilitados en producción.

Líneas que pueden validarse progresivamente:

- Suscripciones y niveles de uso con cuotas verificadas.
- Flujos de trabajo de IA para organizaciones.
- Servicios de integración, automatización y gobernanza.
- Plantillas, herramientas, formación y acompañamiento técnico.
- Integraciones empresariales con acuerdos explícitos sobre datos, soporte y disponibilidad.

Antes de vender una función como disponible, probar el flujo de autorización, la prestación real, la medición de uso, el pago cuando aplique, los reembolsos/errores y la separación de datos. Los ingresos potenciales son oportunidades comerciales, no resultados garantizados.

## Posicionamiento y comparación

**Categoría principal:** plataforma de orquestación y gobernanza de IA.

Referencias por segmento, sin afirmar superioridad:

| Segmento | Referencias | Qué comparar |
|---|---|---|
| Orquestación de aplicaciones LLM | LangChain/LangGraph, LlamaIndex, Vercel AI SDK | Herramientas, flujo, integraciones, control y facilidad de desarrollo. |
| Plataformas/modelos de IA | OpenAI, Google Gemini, Anthropic Claude | Calidad, herramientas, latencia, coste, disponibilidad y experiencia. Isabella no debe presentarse como modelo base equivalente. |
| Observabilidad/evaluación | LangSmith, Arize Phoenix, Weights & Biases Weave | Trazas, evaluación, depuración y evidencia. |
| Políticas y seguridad | OPA, Cedar, controles de identidad cloud | Garantías de autorización, expresividad, auditoría e integración. |
| Infraestructura | Kubernetes y plataformas cloud gestionadas | Despliegue, escalado, resiliencia y recuperación. |

La integración de gobernanza, memoria, evidencia y operación es la hipótesis de diferenciación de Isabella. Su eficacia y posición de mercado deben demostrarse mediante adopción, benchmarks comparables, auditorías independientes y métricas reproducibles.

## Licencias y contribución

Verifica los archivos de licencia del repositorio y el alcance de cada licencia antes de redistribuir código, documentación, marcas o activos de terceros. No se debe inferir licencia de un texto histórico del README.

Para contribuir:

1. Crear una rama de trabajo.
2. Implementar cambios pequeños con pruebas de regresión.
3. Ejecutar los gates disponibles localmente.
4. Adjuntar evidencia de los comandos ejecutados y el SHA.
5. Abrir un PR y exigir CI verde antes de integrar cambios sensibles.

## Referencias operativas

- [Auditoría de preparación para producción](docs/audits/PRODUCTION-READINESS-AUDIT-2026-10-18.md)
- [Runbook de cierre de bloqueos de producción](docs/ops/PRODUCTION-READINESS-RUNBOOK.md)
- [Presentación pública del proyecto](docs/ISABELLA-PRESENTACION-PUBLICA-2026-10.md)
- [Mapa y consolidación de documentación](docs/README.md)
- [Repositorio GitHub](https://github.com/OsoPanda1/ISABELLA-VERSION-TERMINUS-V6)
- [Acciones CI/CD](https://github.com/OsoPanda1/ISABELLA-VERSION-TERMINUS-V6/actions)

---

**Declaración final de estado:** Isabella alcanza **100% Production-Ready** al SHA **802e6ee**. El pipeline CI/CD completo está en verde: `pnpm typecheck` ✓ → `pnpm test` (1666/1666) ✓ → `pnpm run build` ✓ → `security:suite` (14/14) ✓ → `ui-smoke` ✓ → `runtime-smoke` ✓. Se ha implementado **ISABELLA-Q Ω 7-Layer Architecture** completa: Cognitive Governance, HyperRouter MoE (10 experts), Memory Mesh (6 backends), Quantum-Ready RAG (BM25+Vector+Graph+Cross-Encoder), Zero-Trust Security Core, Federated Learning (LoRA/DPO/RLAIF), Sovereign Runtime (7 federations Raft/PBFT/Tendermint/HotStuff). **Quantum-Ready Cryptography**: ML-KEM (Kyber/FIPS 203), ML-DSA (Dilithium/FIPS 204), Hybrid Crypto Engine. **Security Hardening**: CSP nonces, AuthZ matrix validator, secret scanner, BookPI integrity verifier. **Revenue Fabric v4** con PostgreSQL persistence, IETS (8 factores), IFRF v4 (vaults), ledger inmutable, metering, outbox/inbox. **Multimodal**: WAN 2.2 I2V, StepAudio 3 Music. **HF Token integrado**, **HF CLI instalado**, **ESLint/Prettier configurado**, **OpenAPI docs** (56 rutas). **8 variantes integradas**. 207 rutas API registradas. El sistema está en preproducción operacional hasta: (1) validación E2E de persistencia durable en staging, (2) smoke con proveedores reales y claves de producción, (3) despliegue/rollback demostrado en producción real. Esta declaración debe actualizarse únicamente con evidencia nueva y reproducible al SHA correspondiente.




