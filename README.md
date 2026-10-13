# Isabella Villaseñor AI — Genesis TINA / Terminus Ω / HyperCore Ω

**Runtime cognitivo gobernado para TAMV Online Network.** Este es el repositorio autorizado para la evolución de Isabella V6: https://github.com/OsoPanda1/ISABELLA-VERSION-TERMINUS-V6

[![Repository Assurance](https://github.com/OsoPanda1/ISABELLA-VERSION-TERMINUS-V6/actions/workflows/repository-assurance.yml/badge.svg)](https://github.com/OsoPanda1/ISABELLA-VERSION-TERMINUS-V6/actions/workflows/repository-assurance.yml)
[![Genesis CI](https://github.com/OsoPanda1/ISABELLA-VERSION-TERMINUS-V6/actions/workflows/ci.yml/badge.svg)](https://github.com/OsoPanda1/ISABELLA-VERSION-TERMINUS-V6/actions/workflows/ci.yml)

> **Invariante:** CAPABILITY ≠ AUTHORITY ≠ EXECUTION ≠ EVIDENCE ≠ LEARNING ≠ PRODUCTION

## Preparación global para producción y despliegue

**≈ 52% — estimación global provisional de readiness (rango honesto: 48–56%).**

Es una **estimación de ingeniería, no una certificación**. Se calcula como media ponderada de dominios verificados de forma reproducible en la rama, con los gates externos penalizados en su estado real (no en su intención). El movimiento desde la base anterior (48%) proviene de la implementación y prueba local de la **Skill Fabric Ω v2** (contratos, motor de ejecución de nueve fases, triangulación algorítmica, puente MCP), los manifiestos de Kubernetes, la pila Compose desplegable y una readiness profunda real (899 aprobadas / 160 archivos). No proviene de dar por conectados adaptadores externos que siguen sin credenciales ni entorno objetivo.

| Dominio | Estado real | Readiness |
|---|---|---|
| Núcleo cognitivo y de gobernanza (CROWN / AEGIS / VERITAS / Terminus Ω) | Implementado y probado localmente | ≈ 70% |
| **Skill Fabric Ω v2 / HyperCore Ω** (contratos, 9 fases, triangulación, MCP) | Implementado y probado localmente; **no desplegado** | ≈ 60% |
| API HTTP (Express, 70 rutas incluida la superficie HyperCore/MCP) | Funcional; monolito no modularizado (TD-01) | ≈ 64% |
| Evidencia y BookPI (ledger durable JSONL) | Cadena hash con fsync; **Postgres/Supabase sin E2E** (TD-06) | ≈ 45% |
| Integraciones externas (inferencia real, KMS/HSM PQC FIPS 203/204/205, RLS) | Especificado/bloqueado por credenciales | ≈ 22% |
| CI/CD (GitHub Actions) | Workflows válidos pero `startup_failure` sin jobs (TD-07, bloqueo de cuenta) | ≈ 15% |
| Despliegue (Kubernetes / contenedores) | Manifiestos autorados; **nunca aplicados a un clúster** | ≈ 25% |
| Interfaz de producto (UX Obsidian/Platino, smoke automatizado) | Implementado y con smoke | ≈ 70% |
| Workspace Rust IGE-Ω | `Cargo.lock` + `fmt` limpios; **compilación/clippy local no ejecutables** | ≈ 25% |
| Verificación de seguridad estática | 14/14 invariantes; sin pentest ni HSM productivo | ≈ 55% |

**Lectura correcta del número:** Isabella pasa los gates locales que controla (tipos, 899 pruebas, build, 14/14 de seguridad), pero **no** está lista para producción ni para despliegue. Los adaptadores externos y el entorno objetivo son gates independientes que no se superan por tener interfaz ni por tener manifiesto YAML.

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

**ISABELLA CANONICAL SKILL FABRIC Ω (CSF-Ω v2.0.0)** convierte cada skill en un **contrato de capacidad gobernado**, no en una función: identidad, autoridad (scopes/step-up/quórum), política de evidencia, límites (latencia, memoria, llamadas/minuto, energía) y plan de rollback. El catálogo canónico vive en `src/skills/catalog.ts` y hoy declara seis skills:

| Skill | Riesgo | Microservicio | Escalado |
|---|---|---|---|
| `sovereign_ingestion_pipeline` | LOW | `skill-ingestion` | CPU + cola |
| `bookpi_royalty_distribution` | MEDIUM | `skill-royalties` | Manual + cola |
| `quality_gate_arbiter` | MEDIUM | `skill-quality` | CPU |
| `deployment_readiness_arbiter` | HIGH | `skill-deployment` | Quórum + aprobación |
| `territorial_library_synthesis` | LOW | `skill-territorial` | CPU |
| `evidence_manifest_seal` | MEDIUM | `skill-evidence` | Throughput |

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

### Interoperabilidad MCP (JSON-RPC 2.0)

`src/skills/mcp-server.ts` expone la fábrica como herramientas Model Context Protocol: `initialize`, `tools/list` y `tools/call`. Cada llamada se enruta a través de HyperCore Ω, de modo que CROWN, triangulación y BookPI siguen aplicándose. **MCP transporta intención; no concede autoridad.**

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

### Kubernetes

`deploy/k8s/isabella-hypercore-omega.yaml` define un `Namespace` soberano, `ConfigMap`, `Secret` gestionado por KMS, y para el router y cada skill: `Deployment`, `Service`, probes **startup/readiness/liveness**, `HorizontalPodAutoscaler`, `PodDisruptionBudget` y `NetworkPolicy`. Se aplica menor privilegio (`runAsNonRoot: true`, `allowPrivilegeEscalation: false`, `readOnlyRootFilesystem: true`, `capabilities.drop: [ALL]`).

> **state: draft | engine-generated.** Los manifiestos están autorados y validados estructuralmente por prueba, pero **no se han aplicado a ningún clúster**. Un YAML no prueba un despliegue.

## Arquitectura operativa

    Solicitud / cliente / agente
             |
    Validación y límites de entrada
             |
    Identidad, tenant y scopes
             |
    CROWN / AEGIS / política de riesgo
             |
    Terminus Ω — mandato acotado y decisión
             |
    HyperCore Ω — skill gobernada (contrato → ejecución → triangulación)
             |
    Inferencia / memoria / capacidad autorizada
             |
    VERITAS / validación de evidencia
             |
    BookPI — eventos de decisión y trazabilidad
             |
    Respuesta / decisión / alerta operacional

### Terminus Ω: autoridad antes de ejecución

`src/terminus/mandate.ts` define el contrato del mandato: política versionada, presupuestos de recursos, evidencia, separación de actores y límites de riesgo. Una decisión de riesgo elevado pasa a **ESCALATE** si no existe aprobación humana vigente ligada a la evidencia declarada. Las operaciones prohibidas se rechazan independientemente del nombre de la capacidad solicitada.

**TerminusRuntime** no ejecuta la acción gobernada. Antes de devolver **ALLOW** exige que los adaptadores verifiquen identidad y evidencia, que un contador durable reserve una ejecución de forma atómica y que el resultado pueda registrarse en BookPI. Si falla una dependencia necesaria, aplica **fail-closed**.

Los adaptadores `verifyIdentity`, `verifyEvidence` y `ExecutionCounter` son dependencias externas deliberadas. No hay identidad verificada ni contador distribuido sólo por implementar una interfaz: deben conectarse al proveedor de identidad y a la base de datos autorizados y someterse a pruebas de concurrencia y revocación.

### BookPI: evidencia duradera y mantenimiento

BookPI conserva el ledger JSONL durable existente, seleccionable mediante **BOOKPI_LEDGER_PATH**. Sus eventos forman una cadena hash y el mantenimiento permite verificar, respaldar, restaurar y planear la retención de prefijos. La retención del ledger necesita conservar un archivo y un checkpoint; no se debe borrar su historia desde una rutina de limpieza.

El ledger durable agrega cada fila con `fsync` y usa reemplazos atómicos para backup, restauración y poda. Un marcador de mantenimiento pendiente bloquea el uso del ledger tras una interrupción de operaciones de dos archivos, hasta que se valide y reconcilie explícitamente la cadena. El backend JSONL local usa `fsync`, pero **no** es una fuente compartida para réplicas/serverless. **BookPI no es un dispositivo WORM:** la cadena de hashes detecta modificaciones que no reencadenen, pero no impide que un administrador privilegiado cambie archivo, permisos o respaldos.

El adaptador PostgreSQL utiliza trece campos por evento, incluido **canonical**. Para que PostgreSQL sea autoritativo aún deben probarse el esquema real, permisos append-only, concurrencia, propagación de errores, respaldo y restauración contra una instancia de prueba.

### Terminus Sharded Store: cifrado, 6+3 y cuotas

**src/terminus/erasure-code.ts** implementa Reed–Solomon sobre GF(2^8): seis shards de datos y tres de paridad, con cifrado AES-256-GCM antes de codificar. Se reconstruye desde cualquier seis shards válidos, tolerando hasta tres pérdidas. Es redundancia, no almacenamiento gratuito: nueve shards ocupan más que el objeto y nueve aliases en una sola cuenta **no** son nueve dominios de fallo. El coordinador requiere `ShardStore`, `DataKeyManager`, `BookPiStorage` durable y `maxObjectBytes` explícito; las pruebas locales usan proveedores en memoria y no cuentan como conexión externa.

### Admisión bajo cuotas concurrentes

Cada escritura pasa por un `RetentionAdmissionGate` tenant-scoped que exige una reserva durable transaccional de bytes y objetos; sin ella, bloquea la escritura (fail-closed ante carreras entre réplicas/serverless). El **borrado criptográfico** sólo queda confirmado cuando el KMS real destruye durablemente todas las copias de la clave; la eliminación de shards físicos se informa por separado, con fallos visibles.

## Interfaz de producto

La interfaz usa un sistema visual Obsidian / Platino / Azul Eléctrico (capa canónica **Crystal Clear Ω** en `src/styles/crystal-clear.css`), con superficies de contraste controlado, jerarquía tipográfica, estados de foco visibles y diseño responsive. El espacio de trabajo se abre directamente; la secuencia cinemática de marca sigue disponible de forma explícita mediante `?intro=1`. Las respuestas incluyen acción de copia con confirmación y fallback visible. El estado del nodo comunica sólo el resultado del endpoint de salud; no se presenta como garantía de inferencia externa.

## Requisitos de ingeniería

- Node.js 24.x.
- pnpm 10.28.0.
- Rust y PostgreSQL de prueba para validar el workspace IGE-Ω y sus pruebas de integración.
- Para almacenar objetos con Terminus: nueve adaptadores independientes, cuotas reales verificadas, un KMS durable y un BookPI duradero configurado.
- Para desplegar HyperCore Ω: un clúster Kubernetes, un gestor de secretos (KMS) para `HYPERCORE_SIGNING_KEY` y `HYPERCORE_API_TOKEN`, y las imágenes referenciadas en `deploy/k8s/`.

### Validación

    corepack enable
    pnpm install --frozen-lockfile
    pnpm run typecheck
    pnpm test
    pnpm run build
    pnpm run security:suite
    pnpm run production:evidence

Evidencia local reproducida en la rama actual: `pnpm typecheck` exit 0; `pnpm test` **899 aprobadas / 160 archivos**; `pnpm run build` exit 0 (tsc + vitest + esbuild + smoke UI + smoke runtime); `pnpm run security:suite` **14 passed / 0 failed / 0 not_applicable**. La inferencia externa se verificó en vivo el 2026-10-13 con Ollama Cloud (`responseEngine: "open-science"`); Hugging Face autentica pero devuelve `HTTP 402` por falta de créditos en la cuenta. Un test verde demuestra una capacidad computacional local, **no** autoridad, aprendizaje ni producción.

## Gates pendientes para liberar

- Ejecutar typecheck, pruebas, build, seguridad y production-evidence sobre el **mismo SHA** en un runner CI operativo (hoy en `startup_failure`).
- Probar con **PostgreSQL real** el contrato de trece campos, el rol append-only, restricciones, aislamiento multi-tenant, concurrencia, backup y restore.
- Aprovisionar **nueve dominios de fallo** independientes y validar cuotas y límites de escritura reales.
- Integrar un **gestor de claves real** con rotación, destrucción duradera y prueba de restauración; confirmar que no quedan copias recuperables no autorizadas.
- Ensayar pérdida de tres shards, pérdida por encima del quórum, proveedores fuera de cuota, fallo de KMS, fallo de BookPI, restauración y retención legal.
- Ejecutar formato, Clippy, tests y build release del workspace Rust con lockfile comprometido y **--locked**.
- **Aplicar** los manifiestos de HyperCore Ω a un clúster y verificar probes, HPA, PDB, NetworkPolicy y firma de evidencia de extremo a extremo.
- Medir latencia p50/p95/p99 con carga reproducible, distinguiendo aplicación, red, cold start, inferencia y persistencia. No se promete latencia casi cero sin esas medidas.
- Verificar rollback, permisos y recuperación con objetivos RTO/RPO documentados antes de promoción.

## Documentación

- [Auditoría total de la iteración](docs/audits/TOTAL-AUDIT-2026-10-13.md)
- [Auditoría global del perfil GitHub y plano Terminus](docs/audits/GLOBAL-PROFILE-TERMINUS-2026-10-12.md)
- [BookPI: ledger durable, retención y backup/restore](docs/bookpi/DURABLE-LEDGER.md)
- [Estado real de Isabella y gates previos](docs/ESTADO-REAL-ACTUAL.md)
- [Auditoría P0 de arquitectura](docs/audits/P0-ARCHITECTURE-HARDENING-2026-10-12.md)
- [Inventario de API](docs/api/README.md) · [OpenAPI](docs/api/openapi.yaml)
- [Política de seguridad](SECURITY.md)

## Contrato de veracidad, reproducibilidad y evolución

El **Contrato de veracidad** distingue código declarado, código conectado, pruebas ejecutadas y comportamiento observable. La presencia de un módulo en el árbol no prueba que esté desplegado ni conectado a un proveedor real.

El **Bloqueo de instalación reproducible** exige lockfiles versionados, instalación congelada y toolchains fijadas para reducir cambios no intencionales en las dependencias.

Las **Fases de evolución** siguen una secuencia verificable: contrato, implementación, pruebas unitarias, integración de adaptadores, validación E2E, evidencia del mismo SHA, revisión humana, despliegue y observación posterior. No se marca una fase como terminada por la sola creación de archivos.

## Principio de liberación

**SPECIFIED ≠ IMPLEMENTED ≠ TESTED ≠ INTEGRATED ≠ VERIFIED ≠ DEPLOYED ≠ CERTIFIED.** Ninguna capacidad se declara lista para producción por su nombre, por tener un archivo o por aparecer en un diagrama. La promoción exige evidencia reproducible vinculada al SHA liberable, integración real en el entorno objetivo, pruebas de fallo y rollback, y supervisión humana para operaciones privilegiadas.
