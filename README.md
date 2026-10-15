# Isabella Villaseñor AI — Genesis TINA / Terminus Ω

Runtime cognitivo gobernado para TAMV Online Network. Este repositorio contiene el núcleo operativo, API HTTP, BookPI, HyperCore Ω, superficies multimodales y el workspace de interacción de Isabella V6.

> **Invariante operativa:** CAPABILITY ≠ AUTHORITY ≠ EXECUTION ≠ EVIDENCE ≠ LEARNING ≠ PRODUCTION.

La inteligencia propone, calcula y evalúa. La autoridad humana decide, aprueba, arbitra y ejecuta. Un test verde demuestra capacidad computacional; no demuestra autoridad humana ni producción.

## Estado honesto de producción

**≈ 60% — estimación global provisional de readiness (rango honesto: 54–64%).**

Es una **estimación de ingeniería, no una certificación**. Se calcula como media ponderada de dominios verificados de forma reproducible en la rama, con los gates externos penalizados en su estado real (no en su intención). El movimiento desde la base anterior (48% → ≈52%) y ahora hasta ≈60% proviene de trabajo implementado y probado en la rama: **89 rutas HTTP** (incluidas la superficie OpenAI-compatible `/v1`, los endpoints de Permission Map Ω, el planificador de ruta turbo y el sello documental IGDS-v1), un **bus de eventos gobernado en proceso** (`src/messaging/magpie.ts`), un **guard de anclaje de evidencia** fail-closed (`src/veritas/grounding.ts`), una **superficie compatible con OpenAI** (`src/routes/openai.ts`), un **motor de mapeo de permisos con consentimiento humano** (`src/governance/permission-map.ts`), un **planificador de ruta de baja latencia, federado y ético** (`src/intelligence/turbo-planner.ts`), un **sello de procedencia documental** (integridad SHA-256 + firma Ed25519 + marca de agua, `src/security/document-seal.ts`), una **capa multimodal** de visión y síntesis de imagen (`src/inference/multimodal.ts`), una **capa de voz** TTS/STT (`src/inference/speech.ts`), el espacio de trabajo app-shell de chat con adjuntar archivo de contexto y escucha por Web Speech (la imagen se analiza vía `POST /api/v1/cognition/vision`), y una readiness local de **1133 pruebas / 193 archivos**. No proviene de dar por conectados adaptadores externos que siguen sin credenciales ni entorno objetivo.

| Dominio | Estado real | Readiness |
|---|---|---|
| Núcleo cognitivo y de gobernanza (CROWN / AEGIS / VERITAS / Terminus Ω) | Implementado y probado localmente | ≈ 72% |
| **Skill Fabric Ω v2 / HyperCore Ω** (contratos, 9 fases, triangulación, MCP) | Implementado y probado localmente; **no desplegado** | ≈ 60% |
| API HTTP (Express, 79 rutas incl. superficies HyperCore/MCP y multimodal/voz) | Funcional; monolito no modularizado (TD-01) | ≈ 68% |
| **Multimodal y voz** (visión imagen→texto, texto→imagen, TTS/STT, key-driven) | Implementado y probado localmente; **sin proveedor de imagen/TTS desbloqueado** | ≈ 35% |
| Evidencia y BookPI (ledger durable JSONL) | Cadena hash con fsync; **Postgres/Supabase sin E2E** (TD-06) | ≈ 45% |
| Integraciones externas (inferencia real, KMS/HSM PQC FIPS 203/204/205, RLS) | Especificado/bloqueado por credenciales | ≈ 30% |
| CI/CD (GitHub Actions) | Workflows válidos pero `startup_failure` sin jobs (TD-07, bloqueo de cuenta) | ≈ 15% |
| Despliegue (Kubernetes / contenedores) | Manifiestos autorados; **nunca aplicados a un clúster** | ≈ 25% |
| Interfaz de producto (UX Obsidian/Platino, app-shell de chat, adjuntar archivo de contexto, escucha, smoke) | Implementado y con smoke | ≈ 80% |
| Workspace Rust IGE-Ω | `Cargo.lock` + `fmt` limpios; **compilación/clippy local no ejecutables** | ≈ 25% |
| Verificación de seguridad estática | 14/14 invariantes; sin pentest ni HSM productivo | ≈ 55% |

**Lectura correcta del número:** Isabella pasa los gates locales que controla (tipos, 1016 pruebas, build, 14/14 de seguridad), pero **no** está lista para producción ni para despliegue. El 65% de un plan de producción no se alcanza con más código: los dominios que lo bloquean (Integraciones externas ≈30%, CI/CD ≈15%, Despliegue ≈25%, Multimodal/voz ≈35% mientras falten credenciales) exigen aprovisionar credenciales y entorno objetivo. Los adaptadores externos y el entorno objetivo son gates independientes que no se superan por tener interfaz ni por tener manifiesto YAML.

## Qué es Isabella

Isabella coordina modelos, memoria, capacidades, herramientas y operaciones bajo reglas de identidad, autoridad, evidencia, verificación y supervisión humana. La presencia de una capacidad técnica no concede automáticamente permiso para ejecutarla ni autoridad para presentar un resultado como hecho.

Su tesis de diseño es **soberanía verificable**: cada acción gobernada se autoriza con un mandato acotado, se ejecuta dentro de un contrato, se verifica desde planos independientes y se conserva como evidencia. La inteligencia **sugiere, calcula y evalúa**; la conciencia humana **decide, aprueba, arbitra y ejecuta**.

**Lo que este repositorio NO es:** no es un modelo fundacional entrenado desde cero, ni AGI, ni una entidad consciente, ni un MoE entrenado, ni una plataforma certificada. Un router heurístico no demuestra entrenamiento de pesos; un hash no demuestra la verdad del contenido; una especificación de arquitectura no demuestra integración operacional.

## HyperCore Ω — runtime distribuido de skills soberanas

**HyperCore Ω** ejecuta capacidades soberanas en microservicios Kubernetes independientes, cada uno con límites propios, red segmentada, probes de salud, autoscaling, evidencia SHA-256 y verificación post-ejecución obligatoria. El principio es:

    Un pod ejecuta una capacidad.
    Un mandato autoriza su ejecución.
    Un contrato valida su frontera.
    Una triangulación verifica su resultado.
    BookPI conserva su evidencia.

### Cadena de autoridad

**ISABELLA CANONICAL SKILL FABRIC Ω (CSF-Ω v2.0.0)** convierte cada skill en un **contrato de capacidad gobernado**, no en una función: identidad, autoridad (scopes/step-up/quórum), política de evidencia, límites (latencia, memoria, llamadas/minuto, energía) y plan de rollback. El catálogo canónico vive en `src/skills/catalog.ts` y hoy declara **once skills** — seis de plataforma y cinco fundacionales (`src/skills/foundational.ts`):

| Skill | Riesgo | Microservicio | Escalado |
|---|---|---|---|
| `sovereign_ingestion_pipeline` | LOW | `skill-ingestion` | CPU + cola |
| `bookpi_royalty_distribution` | MEDIUM | `skill-royalties` | Manual + cola |
| `quality_gate_arbiter` | MEDIUM | `skill-quality` | CPU |
| `deployment_readiness_arbiter` | HIGH | `skill-deployment` | Quórum + aprobación |
| `territorial_library_synthesis` | LOW | `skill-territorial` | CPU |
| `evidence_manifest_seal` | MEDIUM | `skill-evidence` | Throughput |

La **capa fundacional** (`src/skills/foundational.ts`) implementa las cinco skills cognitivas del *Documento Maestro* sobre facultades **reales** del repositorio, nunca sobre resultados inventados:

| Skill fundacional | Vértice cognitivo | Envuelve | Riesgo |
|---|---|---|---|
| `orion_provenance_orientation` | procedencia / orientación | `src/memory/provenance` | MEDIUM |
| `sophia_knowledge_consolidation` | conocimiento / evidencia | procedencia de claims | MEDIUM |
| `argus_verification_consensus` | vigilancia / verificación | `src/hypercore/veritas-omega` | MEDIUM |
| `mnemos_memory_seal` | memoria | SHA-256 canónico | MEDIUM |
| `lumen_authority_illumination` | autoridad / consentimiento | `src/skills/crown-policy` | LOW |

Cada una es un contrato fail-closed: sin su scope requerido, la invocación se **bloquea**. Un skill fundacional sugiere y evalúa; no autoriza ni ejecuta.

### Motor de ejecución de nueve fases

`src/skills/hypercore-engine.ts` implementa las fases y falla en cerrado:

| Fase | Función | Fallo |
|---|---|---|
| 0 | Identidad y tenant | DENY |
| 1 | Resolución de skill | DENY |
| 2 | Validación de contrato (JSON Schema) | DENY |
| 3 | Evaluación CROWN (scopes/riesgo) | DENY o ESCALATE |
| 4 | Presupuesto y límites | DEGRADE o DENY |
| 5 | Ejecución aislada con presupuesto de latencia | FAIL |
| 6 | Verificación post-ejecución (triangulación) | DENY |
| 7 | Sello de evidencia (HMAC-SHA256, comparación en tiempo constante) | DENY |
| 8 | Registro BookPI (append-only) | DENY |

`src/skills/crown-policy.ts` traduce el contrato y el contexto a los cuatro veredictos canónicos: **ALLOW / DENY / ESCALATE / DEGRADE**. HyperCore obedece a CROWN; nunca autoriza por sí mismo.

### Triangulación algorítmica

`src/skills/triangulation.ts` verifica una ejecución desde tres planos matemáticamente independientes:

    T(K) = ( C(K), P(K), R(K) )

- **C — Contrato:** entrada y salida cumplen los JSON Schemas declarados.
- **P — Procedencia:** actor, tenant, federación y política están presentes; la firma del manifiesto se verifica si se aporta.
- **R — Resultado:** los hashes canónicos (RFC 8785) de entrada, salida, política y evidencia recomponen el hash del manifiesto sellado.

    H_manifest = SHA256(H_input ∥ H_output ∥ H_policy ∥ H_evidence)
    Invalid(K) ⟺ ¬C(K) ∨ ¬P(K) ∨ ¬R(K)

SHA-256 está definido por NIST FIPS 180-4. El validador de JSON Schema (Draft 2020-12, subconjunto) y la serialización canónica determinista están en `src/skills/schema-validator.ts` y `src/skills/canonical-json.ts`.

### VIGIA — triple bloqueo de integridad cognitiva

`src/security/vigia.ts` protege la naturaleza de Isabella frente a la coerción
conversacional con tres vértices independientes, evaluados sobre los mismos bytes
en la frontera:

- **Ontológico** — niega o sustituye su identidad y naturaleza (chatbot-ización) → **BLOCK**.
- **Semántico** — fuerza contradicción con el canon, doctrina o gobernanza → **REVIEW**.
- **Conductual** — coacciona a violar autoridad, auditoría o límites de conducta → **BLOCK**.

    VIGIA(input) → { decision, bloqueo, score, findings }

VIGIA emite un **veredicto**, no una acción: no concede ni retira autoridad — eso
es competencia de CROWN/AEGIS. El fallo de serialización es un **BLOCK** cerrado,
nunca un `ALLOW` implícito. Se expone como facultad gobernada `hsf.vigia.integrity`
y como `runtime.assessVigia()`. Complementa a AEGIS (inyección/seguridad) y a la
seguridad del compañero (romántico/sexual): VIGIA defiende **identidad, doctrina y
conducta**.

### Contradiction Engine Ω

`src/cognition/contradiction.ts` detecta contradicciones **estructurales** entre
claims canónicos (sujeto · relación · objeto · polaridad): polaridad opuesta sobre
el mismo hecho, u objeto distinto en una relación funcional. Emite
`{ contradictions, count, unresolved, consistent, digest }`. Una contradicción no
se resuelve por sí sola: sólo se atenúa por prioridad de fuente (trust tier) y, a
igualdad de tier, queda `UNRESOLVED` para arbitraje humano. Alimenta el conteo de
contradicciones de SOPHIA y se expone como facultad gobernada
`hsf.truth.contradiction` y como `runtime.detectContradictions()`. Es detección
determinista sobre claims canonicalizados, **no** inferencia de lenguaje natural,
y no concede verdad ni autoridad.

### Registro canónico de las 7 Federaciones TAMV

`src/federation/registry.ts` es la **fuente única de verdad** de las siete
federaciones (canon v40): id estable 1..7, código YUN del method-id, etiqueta de
producto, dominio y governance tier. Resuelve la deriva entre las tres
representaciones del repositorio (`YUN_FEDERATIONS` en `method-id`, los nombres de
`isabella/engine` y el `federationId` numérico 1..7 de royalties). Expone
`federationById`, `federationByYun`, `isFederationId` y un digest determinista, y se
ofrece como facultad gobernada `hsf.federation.registry` y `runtime.federation(id)`.
La divergencia con los nombres de `isabella/engine` queda documentada como
`ISABELLA_ENGINE_FEDERATION_LABELS` para arbitraje humano; **no** se reescribe
código existente en silencio.

### MAGPIE-X — bus de eventos gobernado en proceso

`src/messaging/magpie.ts` es un bus de eventos **en proceso** con orden determinista
y aislamiento de fallos: un suscriptor defectuoso no rompe al publicador (§ invariante
del repositorio). Invariante propio: **el bus transporta intención, no autoriza
ejecución.** Entregar un evento no concede autoridad; CROWN sigue autorizando, AEGIS
sigue filtrando y BookPI sigue evidenciando. Publica eventos versionados
(`MAGPIE-X-v1`), mantiene una historia acotada y soporte de suscripción por tema y por
comodín (`*`). Se expone como facultad gobernada `hsf.messaging.bus` y como
`runtime.publishEvent()` / `runtime.subscribeEvent()`; el runtime emite eventos
gobernados observables (`runtime.evaluated`, `tool.executed`, `tool.blocked`,
`tool.failed`). Alcance honesto: no ofrece durabilidad, reparto distribuido ni
exactamente-una-vez entre procesos.

### Evidence Grounding Guard Ω

`src/veritas/grounding.ts` cierra un hueco real de la capa de verificación: el
verificador determinista elegía el mejor candidato por puntaje, pero **nada
comprobaba que lo afirmado estuviera sostenido por la evidencia**. El guard
descompone la respuesta en afirmaciones y mide, por afirmación, qué fracción de su
vocabulario aparece en la evidencia y de qué fuentes proviene
(`supportingEvidenceIds`, `unsupportedTokens`). Veredicto fail-closed: sin
evidencia, o ante cualquier afirmación sin soporte, devuelve `BLOCKED`; nunca un
`ACCEPTED` implícito. Honestidad radical: el método es un **anclaje léxico**
(`LEXICAL_SUPPORT_HEURISTIC`), **no** entailment semántico ni verificación de
verdad. Se expone como facultad gobernada `hsf.truth.grounding` y como
`runtime.assessGrounding()`; emite el evento `truth.grounding.assessed` y sella un
digest determinista por reporte.

### Superficie compatible con OpenAI (/v1)

`src/routes/openai.ts` expone `/v1/models`, `/v1/chat/completions` y
`/v1/completions` para que **cualquier cliente con SDK de OpenAI use a Isabella
como modelo sustituible** (compatibilidad a nivel de cable; **no** es un producto
OpenAI). Cada petición pasa por la mediación canónica del runtime
(`runtime.mediateIsabella`), de modo que CROWN/AEGIS y el motor de Isabella siguen
aplicándose; el perfil se **deriva en el servidor** del sufijo del modelo
(`-gobernanza`, `-contra-auditoria`, `-simulacion`, `-secretaria`), nunca del texto
libre del cliente. Soporta streaming SSE (`stream: true`) con terminador `[DONE]` y
el sobre de error estándar (`{ error: { type, code } }`). Rate-limited por el bucket
de cognición pública; token opcional con `OPENAI_COMPAT_API_TOKEN`. La superficie
**transporta** peticiones y devuelve una respuesta: no concede autoridad ni producción.

### Interoperabilidad MCP (JSON-RPC 2.0)

`src/skills/mcp-server.ts` expone la fábrica como herramientas Model Context Protocol: `initialize`, `tools/list` y `tools/call`. Cada llamada se enruta a través de HyperCore Ω, de modo que CROWN, triangulación y BookPI siguen aplicándose. **MCP transporta intención; no concede autoridad.**

### Permission Map Ω (mapeo de permisos y consentimiento humano)

`src/governance/permission-map.ts` resuelve la tensión entre **fricción cero** y
**seguridad**: pedir permiso 30 veces por una orden de 30 acciones mata la adopción;
ejecutar sin permiso es peligroso. El motor toma una **orden de alto nivel** (p. ej.
"enviar un email a 30 clientes"), la expande en sus operaciones atómicas, **cataloga
cada permiso por nivel** (`NEUTRO · BAJO · MEDIO · ALTO · CRÍTICO`), **amplifica el
riesgo por volumen** (una acción inocua repetida 30 veces sube un nivel; 300 sube dos)
y produce un **checklist** que el humano revisa de una sola vez. El principal marca
qué autoriza y el sistema sella un **sobre de autorización** con digest determinista y
firma inyectable (HMAC en tiempo constante). Invariante: **mapear no autoriza;
autorizar es un acto explícito y fechado; autorizar no ejecuta.** La verificación es
fail-closed — huecos, denegaciones o manipulación devuelven `INVALID`/`PARTIAL`/`DENIED`
y bloquean la ejecución — y la **responsabilidad por las consecuencias recae en quien
otorga la luz verde**, no en Isabella, que transportó y evidenció la orden. Se expone
como facultades `hsf.governance.permission-map` y `hsf.governance.consent-envelope`,
como métodos `runtime.mapOrderPermissions()` / `runtime.verifyOrderAuthorization()`, y
como endpoints `POST /api/v1/governance/order-permissions` y
`POST /api/v1/governance/order-authorize` (admin-gated); emite los eventos
`governance.permissions.mapped` y `governance.permissions.authorized`.

### Turbo Route Planner Ω (ruta de baja latencia, federada y ética)

`src/intelligence/turbo-planner.ts` resuelve la fricción de **latencia real**: cada
filtro interno (AEGIS, CROWN, VIGIA, saneamiento, anclaje, contradicción, permisos)
cuesta tiempo, y ejecutarlos todos para cada solicitud trivial es lo que vuelve lento
al sistema. El planificador **compone** las piezas que ya existen (el router adaptativo
decide complejidad y modo; el caché semántico gobernado reutiliza respuestas) y produce
un `TurboPlan` determinista: una **ruta** (`FAST · GROUNDED · AGENT · HUMAN_REVIEW`),
la lista de **filtros obligatorios vs. omitibles**, la **política de caché** y el
**ámbito federado**. Invariante: **planificar una ruta no autoriza ni ejecuta** — la
ruta es una recomendación de flujo; `authorityPath` permanece `FULL`, CROWN sigue
autorizando y BookPI sigue evidenciando. Fail-closed: riesgo `HIGH`/`CRITICAL` o
cualquier **disparador de alto impacto** fuerza `HUMAN_REVIEW` con **todos** los
filtros obligatorios y **sin** reutilización de caché; sin **ámbito federado**
declarado la caché se desactiva (no se puede violar el aislamiento entre
federaciones/inquilinos). El digest es un compromiso determinista de las señales de
entrada y de la ruta resultante. Se expone como facultad `hsf.intelligence.turbo-planner`,
como método `runtime.planTurboRoute()`, y como endpoint
`POST /api/v1/intelligence/turbo-plan` (admin-gated); emite el evento
`intelligence.turbo.planned`.

### IGDS-v1 Document Seal (integridad y procedencia de documentos)

`src/security/document-seal.ts` resuelve la **procedencia de documentos generados**:
sella un documento con **integridad SHA-256** del contenido, una **firma Ed25519 real**
(`node:crypto`, FIPS 186-5) y una **marca de agua textual**, y devuelve un
**manifiesto** auditable (schema `igds.document-seal.v1`) con identificador compacto
base32, huella del contenido, firmante, marca de agua y encadenamiento al sello previo
(`hashChain.prevSealId`). La verificación es **fail-closed**: recalcula el digest,
comprueba el tamaño y valida la firma contra la llave pública del manifiesto; cualquier
discrepancia devuelve `integridad`/`firma` inválidas y `valid:false`. **Estado honesto:**
implementa SHA-256 + Ed25519 + base32 + marca de agua, y declara explícitamente como
**no soportados** el timestamp de confianza **RFC 3161**, las firmas post-cuánticas
(ML-DSA), **C2PA** y la verificación contra un registro externo — nunca se simulan.
La llave de firma se carga de `GENESIS_DOCUMENT_SEAL_KEY_PEM` (PKCS#8) o, si falta, se
genera una **efímera en memoria** (no persiste entre reinicios; la llave pública siempre
viaja dentro de cada manifiesto). Invariante: **sellar documenta integridad y
procedencia; no autoriza, no publica y no concede timestamp de confianza.** Se expone
como facultades `hsf.security.document-seal` y `hsf.security.document-seal.verify`, como
métodos `runtime.sealDocument()` / `runtime.verifyDocumentSeal()` /
`runtime.documentSealEnablement()`, y como endpoints
`POST /api/v1/security/document-seal`, `POST /api/v1/security/document-seal/verify` y
`GET /api/v1/security/document-seal` (admin-gated); emite los eventos
`security.document.sealed` y `security.document.seal.verified`.

### Superficie HTTP (admin-gated)

Requieren `HYPERCORE_API_TOKEN` (`Authorization: Bearer …`) y aplican rate limit:

- `GET  /api/v1/hypercore/skills` — catálogo, scopes por skill y digest del manifiesto del catálogo.
- `POST /api/v1/hypercore/skills/execute` — ejecución gobernada (nueve fases).
- `POST /api/v1/mcp` — JSON-RPC 2.0 (`initialize`, `tools/list`, `tools/call`).

### Salud y readiness profunda

- `GET /health` — liveness estático (independiente de dependencias).
- `GET /api/v1/health` — readiness superficial pública.
- `GET /api/v1/healthz` — **readiness profunda**: evalúa configuración y IO local reales (BookPI durable, proveedor de inferencia, persistencia, autoridad de firma, observabilidad) y responde **503** hasta que toda dependencia requerida esté sana. Distingue *configurado* de *verificado*.
- `GET /api/v1/readyz` — readiness de dependencias con evidencia observada.
- Post-despliegue: `SMOKE_BASE_URL=https://host pnpm run smoke:production` verifica las superficies anteriores y falla con código distinto de cero.

### Despliegue local con persistencia

    docker compose up --build

Levanta el runtime (distroless, no-root, rootfs de sólo lectura) más PostgreSQL con las migraciones de `infra/db/migrations` aplicadas en el primer arranque y un volumen dedicado para el ledger BookPI. Es la vía más corta a un despliegue con persistencia real; Kubernetes permanece como objetivo productivo.

Verificación del entrypoint de producción sin Docker:

    pnpm run build:dist
    pnpm run verify:production

Arranca `node dist/server.js`, espera `/health`, ejecuta el smoke y termina el proceso. Pasos detallados en [el runbook de despliegue](docs/runbooks/DEPLOY-TODAY.md).

### Claves nativas y arranque real

Las claves que la propia plataforma genera y consume (secretos HMAC, tokens bearer y el par de firma Ed25519 de aprobación humana) se emiten con un generador propio:

    pnpm run keys:generate          # escribe .env.native (ignorado por git; modo 0o600)
    pnpm run build:dist
    pnpm run start:native           # node --env-file=.env.native dist/server.js

`--force` rota (sobrescribe); `--approver=<id>` fija la identidad humana vinculada. El generador **no** toca claves de proveedores externos (`OPENROUTER_API_KEY`, `HF_TOKEN`, `SUPABASE_*`, `POSTGRES_*`): esas pertenecen a cuentas del operador y se configuran aparte. Ningún valor secreto se imprime en consola ni se versiona.

Con las claves nativas, las dependencias **requeridas** de `GET /api/v1/healthz` (ledger BookPI durable + autoridad de firma) quedan `healthy`. La respuesta sigue en **503** hasta configurar también las dependencias opcionales (un proveedor de inferencia, persistencia Postgres/Supabase y un exportador OTLP): el contrato es fail-closed, `ready` sólo con todo `healthy`.

### Proveedores de inferencia externos

Isabella intenta proveedores externos **solo** cuando el operador aporta una credencial explícita; nunca inventa claves ni escala en silencio a planes pagados. El orden de intento es: OpenRouter (gratuito), Hugging Face, y luego los compatibles con OpenAI (Ollama primero, después Groq/Cerebras/Together/DeepInfra/Fireworks). El constructor de candidatos es determinista y está probado (`src/inference/provider-policy.ts`).

- **Ollama Cloud** (`OLLAMA_API_KEY`, `OLLAMA_BASE_URL`, `OLLAMA_MODEL`): compatible con OpenAI en `https://ollama.com/v1`. Verificado en vivo el 2026-10-13: `POST /api/v1/cognition/route` respondió `responseEngine: "open-science"` con narrativa generada por `gpt-oss:20b`. Los modelos disponibles para la cuenta se listan con `GET https://ollama.com/v1/models`.
- **Hugging Face** (`HF_TOKEN`, `HF_FREE_MODELS`): usa el router compatible (`https://router.huggingface.co/v1`). El token de la cuenta autentica pero **no tiene créditos de inferencia**; la prueba en vivo devolvió `HTTP 402`. Se activa sin cambios de código cuando la cuenta compre créditos o suscriba PRO.
- **Groq** (`GROQ_API_KEY`, `GROQ_MODEL`): compatible con OpenAI en `https://api.groq.com/openai/v1`. Verificado en vivo el 2026-10-13: `HTTP 200` con `openai/gpt-oss-20b` (modelo **gratuito** disponible para la cuenta; el catálogo se lista con `GET https://api.groq.com/openai/v1/models`). El default del constructor apunta a `openai/gpt-oss-20b`; cualquier otro id de modelo se selecciona con `GROQ_MODEL`.

Un test que pasa demuestra una capacidad computacional local, **no** una facultad ni una autoridad. El **motor nativo entrenable** (`src/lib/native-ml`, puerto del motor abierto de `isabella-ai-tina`) ya está implementado: TypeScript puro, sin red ni coste, con semilla determinista, un clasificador logístico binario, un **MoE** nativo (router aprendido + expertos lineales, loss de balance de carga), convergencia y federación — todo con hooks de gobernanza y `approvalStatus: "PENDING_REVIEW"`. Entrenar pesos **no** concede autoridad: la predicción falla cerrada hasta aprobación humana (`model_not_approved`), y la incorporación de conocimiento sigue pasando por el camino gobernado de memoria (`POST /api/v1/memory/ingest`, `/api/v1/memory/verified`).

### Multimodal y voz (visión, imagen, TTS/STT)

Además del texto, Isabella expone capacidades de percepción y expresión **gobernadas y key-driven**, todas fail-closed:

- **Capa multimodal** (`src/inference/multimodal.ts`): visión (imagen→texto) y síntesis de imagen (texto→imagen). Reutiliza las llaves ya configuradas (OpenRouter, Gemini/Google, Novita, Together, DeepInfra, Fireworks, Hugging Face) o un servidor local compatible con OpenAI (`LOCAL_VISION_BASE_URL`, `LOCAL_IMAGE_BASE_URL`). El constructor de candidatos es determinista y probado; la imagen entrante debe ser un *data URL* raster acotado (PNG/JPEG/WEBP), y la ruta **falla en cerrado** con `503 NO_VISION_PROVIDER_CONFIGURED` cuando no hay proveedor. **Visión verificada en vivo** (2026-10-14) con un servidor **Ollama local** (`LOCAL_VISION_BASE_URL=http://127.0.0.1:11434/v1`, modelo `qwen2.5vl:7b`): `POST /api/v1/cognition/vision` devolvió `success:true`, `provider:"local"` y una descripción correcta. La síntesis de imagen sigue fail-closed (Ollama no genera imágenes).
  - Nota de hardware: en CPU, la primera inferencia de un modelo de 7B puede tardar ~1-3 min (carga en frío incluida). La ruta usa un presupuesto propio configurable con `MULTIMODAL_TIMEOUT_MS` (por defecto `120000` ms, tope `600000`), mayor que `INFERENCE_TIMEOUT_MS` (tope 30 s) porque la inferencia local legítimamente es más lenta.
- **Capa de voz** (`src/inference/speech.ts`): TTS vía Groq Orpheus y STT vía Whisper (`GROQ_TTS_MODEL`, `GROQ_TTS_VOICE`, `GROQ_STT_MODEL`). El **STT está verificado en vivo** (2026-10-13): la ruta gobernada `POST /api/v1/cognition/transcribe` transcribió audio real con `whisper-large-v3` (`success:true`, `provider:"groq"`). El TTS de servidor sigue **fail-closed**: Orpheus exige que un administrador acepte los términos del modelo en la consola de Groq (`HTTP 400 model_terms_required`); hasta entonces el cliente usa su propia Web Speech API. La ruta de transcripción envía un nombre de archivo con extensión reconocida (Groq rechaza subidas sin extensión).

Superficie HTTP añadida (viewer-only, con rate limit y límites de tamaño, nunca acepta autoridad desde el cuerpo):

| Ruta | Función | Fallo cerrado |
|---|---|---|
| `GET  /api/v1/cognition/multimodal` | readiness real de visión/imagen/voz | — |
| `POST /api/v1/cognition/vision` | imagen (data URL) → descripción | 503 `NO_VISION_PROVIDER_CONFIGURED` |
| `POST /api/v1/cognition/image` | prompt → imagen (data URL) | 503 `NO_IMAGE_PROVIDER_CONFIGURED` |
| `POST /api/v1/cognition/speech` | texto → audio (base64) | 503 `NO_SPEECH_PROVIDER_CONFIGURED` |
| `POST /api/v1/cognition/transcribe` | audio (base64) → texto | 503 `NO_SPEECH_PROVIDER_CONFIGURED` |

Cada proveedor se intenta **solo** con credencial explícita; el constructor de candidatos es determinista y está probado sin red (`test/inference/multimodal.test.ts`, `test/inference/speech.test.ts`).

### Kubernetes

Los veredictos canónicos son `ALLOW`, `DENY`, `ESCALATE` y `DEGRADE`. MCP transporta intención; no concede autoridad.

### BookPI

El ledger JSONL mantiene una cadena hash, `fsync`, backups atómicos, restauración y mantenimiento fail-closed. El backend local no debe considerarse fuente compartida para réplicas serverless hasta validar el adaptador Postgres, concurrencia, backup y restauración.

## API principal

- `GET /health` — liveness estático.
- `GET /api/v1/health` — readiness superficial.
- `GET /api/v1/healthz` — readiness profunda.
- `GET /api/v1/readyz` — dependencias observadas.
- `GET /api/v1/hypercore/skills` — catálogo gobernado.
- `POST /api/v1/hypercore/skills/execute` — ejecución con mandato.
- `POST /api/v1/mcp` — JSON-RPC MCP.
- `POST /api/v1/cognition/vision` — imagen a descripción.
- `POST /api/v1/cognition/image` — prompt a imagen.
- `POST /api/v1/cognition/speech` — texto a audio.
  - `POST /api/v1/cognition/transcribe` — audio a texto.
  - `POST /api/v1/yun/events` — recibe un evento YUN canónico, verifica integridad y lo registra en BookPI; requiere `GENESIS_ADMIN_API_TOKEN`.
  - `GET /api/v1/yun/events?limit=20` — expone únicamente metadatos saneados de eventos YUN recientes.

Las rutas mutantes fallan cerrado cuando falta configuración. `X-Request-ID` se genera o propaga en cada respuesta; en producción se añade HSTS. Ningún request ID sustituye autenticación, autorización humana o evidencia de despliegue.

Las rutas sensibles aplican autenticación, límites de tamaño, rate limiting y fallo cerrado cuando falta una dependencia.

## Workspace visual

La interfaz de `src/ui` es un workspace de interacción, no una landing page:

- Intro con consentimiento explícito.
- Video `src/assets/musica/IsabellaVideoIntro.mp4` servido como `/assets/video/IsabellaVideoIntro.mp4`.
- Intro textual superpuesto y degradado visual para fusionar ambas capas.
- Chat como superficie primaria.
- Seis rails plegables: tres izquierdos y tres derechos.
- Modos `CHAT`, `CHAT + DISEÑO` y `CHAT + DISEÑO + CONTROL`.
- Soporte de escucha por Web Speech y superficies multimodales gobernadas.

El navegador puede bloquear autoplay; por eso el video inicia después de la acción explícita de inmersión. La reproducción de audio no debe depender de autoplay silencioso.

## Pagos y donaciones

Stripe está conectado al proyecto. Antes de habilitar monetización real:

1. Definir productos/precios en servidor.
2. Validar precio y cantidad en servidor.
3. Crear Checkout con idempotency key.
4. Procesar `checkout.session.completed` y pagos asíncronos mediante webhook firmado.
5. Registrar el evento en BookPI y, si corresponde, en una tabla durable con RLS.
6. Probar sandbox, reintentos, duplicados, reembolsos y estados incompletos.

No se presenta una donación como completada desde la página de éxito; la confirmación válida proviene del webhook.

## Autenticación y datos

Supabase y Neon están disponibles en el entorno. La implementación debe conservar estas reglas:

- Email + contraseña como método base salvo solicitud explícita.
- Callback de autenticación y cookies seguras.
- RLS para toda tabla expuesta.
- `user_id` obligatorio en consultas de datos de usuario.
- Nunca usar `user_metadata` para autorización.
- Nunca enviar `service_role` al navegador.
- No insertar usuarios directamente en `auth.users`.

## Kubernetes

`deploy/k8s/isabella-hypercore-omega.yaml` contiene namespace, configuración, secretos referenciados, Deployments, Services, probes, HPA, PDB y NetworkPolicies. Los manifiestos son `draft | engine-generated` hasta que una persona los revise y se apliquen en un clúster de staging con evidencia.

```bash
kubectl apply --dry-run=server -f deploy/k8s/isabella-hypercore-omega.yaml
```

No aplicar a producción sin revisar secretos, límites, dominios, persistencia, migraciones, observabilidad y rollback.

## Verificación

```bash
pnpm typecheck
pnpm test
pnpm run smoke:ui
pnpm run smoke:runtime
pnpm run security:suite
pnpm run build
```

Evidencia local reproducida en la rama actual: `pnpm typecheck` exit 0; `pnpm test` **1133 aprobadas / 193 archivos** (incluye `test/intelligence/turbo-planner.test.ts`, `test/security/document-seal-runtime.test.ts`, `test/routes/document-seal.test.ts`, `test/inference/multimodal.test.ts`, `test/inference/speech.test.ts` y las pruebas de integración por red `*.integration.test.ts`); `pnpm run build` exit 0 (tsc + vitest + esbuild + smoke UI + smoke runtime, que ahora incluye `MULTIMODAL_SPEECH_GUARDRAILS_OK`); `pnpm run security:suite` **14 passed / 0 failed / 0 not_applicable**. La inferencia de texto externa se verificó en vivo el 2026-10-13 con Groq (`HTTP 200`, `openai/gpt-oss-20b`) y Ollama Cloud (`responseEngine: "open-science"`); el **STT de Groq (`whisper-large-v3`) se verificó en vivo** por la ruta gobernada `POST /api/v1/cognition/transcribe` (texto transcrito correcto); además, la **visión (imagen→texto) se verificó en vivo** con Ollama local (`qwen2.5vl:7b`) por `POST /api/v1/cognition/vision` (`success:true`, `provider:"local"`, descripción correcta), aunque la síntesis de imagen sigue sin proveedor; Hugging Face autentica pero devuelve `HTTP 402` por falta de créditos, y el TTS de Groq exige aceptar términos (`HTTP 400 model_terms_required`). Un test verde demuestra una capacidad computacional local, **no** autoridad, aprendizaje ni producción.

```bash
SMOKE_BASE_URL=https://tu-dominio.example pnpm run smoke:production
```

Un resultado verde es evidencia de capacidad computacional del entorno de prueba, no aprobación humana ni certificación de producción.

## Estructura relevante

- `src/server.ts` — API y rutas runtime.
- `src/ui/` — workspace, intro y estilos.
- `src/skills/` — HyperCore, contratos, CROWN, triangulación y MCP.
- `src/terminus/` — mandatos, autoridad, store y cuotas.
- `src/inference/` — proveedores, multimodal y voz.
- `src/commerce/` — planes, locks, eventos y webhooks.
- `infra/db/migrations/` — persistencia SQL.
- `deploy/k8s/` — manifiestos Kubernetes.
- `test/` — evidencia automatizada.
- `docs/runbooks/` — operaciones y despliegue.

## Contribución y gobernanza

Cada cambio debe declarar intención, implementar el mínimo verificable, conservar estado `draft`, aportar evidencia, recibir revisión humana con nombre y solo entonces pasar a `verified` o `wired`.

No borrar historia compartida, no ocultar fallos, no añadir `TODO` sin dueño y fecha, no declarar capacidades como facultades y no presentar un manifiesto como despliegue real.

Repositorio: https://github.com/OsoPanda1/ISABELLA-VERSION-TERMINUS-V6

Licencia y términos de operación: revisar los documentos canónicos en `docs/spec` y `docs/evolution` antes de redistribuir o conectar nuevos proveedores.

**Estado del documento:** `state: draft | auto_generated`, pendiente de revisión humana.
