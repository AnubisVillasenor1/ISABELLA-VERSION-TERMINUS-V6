# Isabella Villaseñor AI Génesis Ω∞ — Terminus V6 · TAMV ONLINE NETWORK

## 1. Qué es

Isabella Terminus V6 es un **Runtime Web Operativo de Inteligencia Artificial Gobernada** (FGAIS): un servidor TypeScript/Express con superficie HTTP versionada (`/api/v1/*`), gobernanza determinista, memoria jerárquica, un motor de inferencia propio que **orquesta** LLM externos, RAG soberano, herramientas y habilidades allowlisted, un sistema nativo de análisis audio-espectral (**TAMV Kaos Audio System**), una capa unificada de capacidades locales (**Nexus**) y —desde esta versión— una **fábrica nativa de agentes abiertos** (MCP sobre HTTP y tarjetas A2A) protegida por una compuerta de egreso propia.

No es un chatbot y **no es un modelo fundacional**: TAMV no entrenó ningún modelo. Isabella es el runtime que decide, registra y limita qué se le pide a un modelo o a un agente externo, y qué evidencia queda de esa interacción.

## 2. Quién la construye y de dónde nace

Construida, propiedad y creada por **Edwin Oswaldo Castillo Trejo (Anubis Villaseñor)** bajo la marca **TAMV ONLINE ENTERPRISE / TAMV ONLINE NETWORK**. Nace en el repositorio [`OsoPanda1/ISABELLA-VERSION-TERMINUS-V6`](https://github.com/OsoPanda1/ISABELLA-VERSION-TERMINUS-V6) como la línea **Terminus** de la familia Génesis Ω∞: las versiones anteriores (V1–V5) se consolidaron aquí, y a esta línea convergen tres fusiones documentadas —el canon **Isabella CERO** (matriz de roles), el **Master Consolidated** (capas Ω y Fabrics, `src/infinity/`) y la cosecha **Nexus** (patrones auditados de doce repositorios de referencia, sin copiar su código).

| Origen | Qué aportó | Dónde quedó | Dictamen |
|---|---|---|---|
| Génesis Ω∞ V1–V5 | gobernanza, memoria, economía, territorio | `src/genesis/`, `src/memory/`, `src/economy/`, `src/territory/` | incorporado |
| `AnubisVillasenor1/proyecto-isabella-cero` | canon de 10 roles y política `ALLOW/DENY/ESCALATE` | `src/agents/mesh/`, `docs/canon/`, RFC-0011 | código reescrito; la maqueta Next.js **no** se importó (chat y editor simulados) |
| `ISABELLA_VILLASENOR_AI_MASTER_CONSOLIDATED.docx` | 14 capas Ω, 9 Fabrics, constitución | `src/infinity/`, RFC-0012 | registrado con su divergencia de conteo (18 vs 19 tools) |
| doce repositorios de referencia | patrones de grafo, agente, DAG, antifragilidad, cuántica | `src/nexus/`, RFC-0010 | patrones; `google/agi` es Android GPU Inspector y `w37fhy/QuantumultX` son reglas de proxy: no aportaron nada |

## 3. Qué propone

Que una IA operativa pueda **ejecutar, negarse y demostrar después** lo que hizo, bajo términos que el propio repositorio verifica con pruebas y no con prosa:

```text
SPECIFIED ≠ IMPLEMENTED ≠ TESTED ≠ PRODUCTION
CAPABILITY ≠ AUTHORITY ≠ EXECUTION ≠ EVIDENCE ≠ LEARNING ≠ PRODUCTION
```

Saber hacer algo no concede autoridad; tener autoridad no implica que algo se ejecutó; ejecutarlo no es evidencia hasta que BookPI lo sella; aprender una skill no la vuelve permisible; y nada de lo anterior equivale a producción. Ningún documento, tabla o respuesta de API puede elevar una categoría a otra: el inventario de rutas (`docs/api/route-inventory.json`), el canon Ω∞ (`src/platform/omega-canon.ts`) y el mapa de integración TAMV (`src/territory/tamv-integration.ts`) declaran la madurez real de cada capacidad, y hay pruebas que fallan si una cifra inventada reaparece.

## 4. Cómo lo propone (los seams que hacen eso verificable)

| Seam | Qué garantiza | Medida real |
|---|---|---|
| `NexusToolRegistry` | solo herramientas declaradas, con id validado, timeout y huella de llamada | techo duro `MAX_TOOLS = 64` (`src/nexus/tool-registry.ts:51`) |
| `CapabilityContract` + `CapabilityEngine` | estados `proposed → tested → approved`, techo de autonomía `A3`, reputación con mínimo de 3 muestras y umbral de confianza `0.7` | `src/nexus/capability-contract.ts:58`, `src/nexus/capability-engine.ts` |
| `EvidenceLedger` (BookPI) | append-only, canonicalización JCS (RFC 8785), sello Ed25519 | `src/governance/`, `src/bookpi/crypto.ts` |
| `EgressPolicy` | ninguna salida del proceso sin allowlist explícita; https por defecto; bloqueo de privado/loopback/link-local/metadata/multicast/ULA/IPv4-mapped; revalidación de redirecciones y cotas de bytes | `src/security/egress-policy.ts`, 29 pruebas en `test/security/egress-policy.test.ts` |
| `OpenAgentFabric` | el manifiesto del operador es la única autoridad; descubrimiento ≠ permiso | `src/nexus/open-agent-fabric.ts`, 21 pruebas |
| `AntifragileMonitor` | ventana de salud, cortacircuitos `half-open`, reparación **propuesta** con aprobación humana | `src/nexus/antifragile.ts` |
| Gates de despliegue | `assessDeployment` es fail-closed: un gate ausente o `skipped` bloquea | `src/governance/deployment-gates.ts` (10 puertas) |

## 5. Fábrica de agentes abiertos (la evolución de esta versión)

Isabella ya no depende de que un humano escriba un adaptador por cada agente. El operador publica un **manifiesto** (plantilla en `config/agent-fabric.template.json`, fuente en `ISABELLA_AGENT_FABRIC_FILE`) y la fábrica, al arrancar:

1. valida el manifiesto con zod (`version: '1'`, `agents.max(64)`, id `^[a-z][a-z0-9]{2,40}$`, endpoint https, `authEnv` con forma `ISABELLA_*` — **el nombre de la variable, nunca el valor**);
2. pasa cada host por la `EgressPolicy`; un host no allowlisted se **rechaza y se registra**, no se conecta;
3. registra cada agente como un `CapabilityContract` ordinario con autonomía tope `A3` y riesgo declarado. `A4`/`A5` (gasto o acción irreversible) no son declarables para un agente externo.

Un agente del manifiesto es exactamente una capacidad más: **no existe un segundo camino de ejecución**. Las cuatro rutas nuevas lo hacen observable:

```text
GET  /api/v1/nexus/fabric                 inventario, resumen y estado de la compuerta de egreso
GET  /api/v1/nexus/fabric/:id             agente, herramientas declaradas y descubiertas
POST /api/v1/nexus/fabric/:id/discover    tools/list — evidencia, no permiso
POST /api/v1/nexus/fabric/:id/call        requiere input.tool Y que la herramienta esté declarada
```

`/call` rechaza con `403 FABRIC_TOOL_NOT_DECLARED` **antes** de abrir el socket: una herramienta que el manifiesto no declaró no se invoca aunque el agente la exponga. Protocolos soportados: MCP sobre HTTP (JSON-RPC 2.0 con sobre `data:` de SSE) y tarjetas A2A (`.well-known`). Los agentes quedan limitados a `A0`–`A3`, a 64 por manifiesto y a los hosts que el operador autorice: la información puede ser global —cualquier tema, cualquier proveedor open source— pero la superficie está acotada por contrato.

Lo que esto **no** es: «miles de agentes». El techo real y medible es 64 agentes por manifiesto y 64 herramientas por registro. La cifra afirmada en la especificación recibida excede la medida; ver §21 y [`docs/history/archive/DIVERGENCIAS-2026-11-04.md`](docs/history/archive/DIVERGENCIAS-2026-11-04.md).

## 6. TAMV Kaos Audio System

DSP de audio escrito en TypeScript dentro de este repositorio: sin dependencias nativas, sin WASM y sin servicio externo. Mide la señal que el cliente envía y deriva presets y planes. **No reproduce, no sintetiza, no separa fuentes.**

### Qué calcula de verdad

- **FFT radix-2 Cooley–Tukey in-place** sobre ventana de Hann simétrica; `DEFAULT_FFT_SIZE = 2048`, `DEFAULT_HOP_SIZE = 512`, promedio tipo Welch.
- **Centroide espectral**, **flatness** (razón geométrica/aritmética de magnitudes) y **energía por banda**: grave `0–250 Hz`, medio `250–2000 Hz`, agudo `2000 Hz–Nyquist`, banda de voz `300–3400 Hz`.
- **Transitorios por flujo espectral relativo**: cada avance normalizado por la energía de los dos cuadros involucrados; umbral `media + 2.5·σ`, suelo `0.08`, separación mínima 40 ms. Sin este detalle los onsets se contaban sobre ruido de piso.
- **Estéreo M/S como proporción** `side / (mid + side)`: una señal en contrafase ya no colapsa a cero.
- **Niveles medidos**: pico y RMS en dBFS, factor de cresta, rango dinámico, proporción de silencio, latencia de análisis del request.
- **Perfil emocional y complejidad espacial** por ponderaciones visibles (documentadas en `src/tamv/analysis.ts`), no por un modelo entrenado.

### Qué declara y qué se niega a fingir

- 11 presets de fábrica con `processingChain` ordenada y matriz acústica interpretable (entorno × contenido × emoción × complejidad espacial × intensidad háptica).
- Preset adaptativo determinista: el mismo WAV produce el mismo `adaptive_<sha12>`.
- Plan de redefinición de **8 etapas** con **15 puertas de validación colgadas**; **7 etapas son reversiblemente recuperables** y todas nacen en estado `declared` con `audioRendered: false`.
- Monitor de telemetría con **10 lecturas**: las 4 de hardware (temperatura de CPU, uso de GPU, error de sincronía háptica, precisión espacial) se devuelven como `measured: false` con su motivo; de las 6 restantes se calculan 6 en material estéreo y 5 en mono —en mono no existe el par de canales que correlacionar—.

### Gobernanza de la superficie

| Control | Valor real |
|---|---|
| Prefijo | `/api/v1/tamv` |
| Autorización POST | `GENESIS_ADMIN_API_TOKEN` vía `authorizeApiToken` (401 cerrado sin credencial) |
| Rate limit | ventana fija de 8 requests / 60 s por bucket y cliente |
| Ledger de evidencia | cada llamada appendea a BookPI su `methodId` `A.TWINS.E07_TAMV.*` |
| Blackout | alcance `VOICE_SYNTHESIS` en `src/governance/blackout.ts` |
| Escenario de riesgo | `NEGLIGIBLE` (lectura), `LOW` (análisis/preset), `MEDIUM` (plan de redefinición) |
| Cotas de entrada | 180 000 bytes crudos, mínimo 2048 muestras por canal, duración máxima 180 000 ms |
| Contenedor | WAV PCM 16; `audio/mpeg`, `audio/flac`, `audio/ogg`, `audio/mp4`, `audio/webm` se rechazan con código explícito |

```text
GET  /api/v1/tamv/status          GET  /api/v1/tamv/presets         GET  /api/v1/tamv/presets/:presetId
POST /api/v1/tamv/analyze         POST /api/v1/tamv/adaptive-preset POST /api/v1/tamv/redefine-plan
```

Un rechazo 400 devuelve el motivo exacto (`TAMV_PAYLOAD_EMPTY`, `TAMV_BASE64_INVALID`, `TAMV_MIME_UNSUPPORTED`, `TAMV_PAYLOAD_TOO_LARGE`, `TAMV_WAV_UNDECODEABLE`, `TAMV_SIGNAL_TOO_SHORT`, `TAMV_DURATION_TOO_LONG`): «no es WAV» y «está vacío» no son el mismo error.

### Limitaciones del motor (no negociables en el texto)

- No hay reproducción en tiempo real: el motor mide y declara, no emite sonido.
- No hay separación de fuentes ejecutada; `source_separation` es un objetivo para un motor externo.
- No hay HRTF ni render binaural/ambisonic: `width`/`height`/`depth` son parámetros declarados.
- No hay medidor LUFS: la puerta de sonoridad usa RMS medido, que no es loudness percibida EBU R128.
- El clasificador es un conjunto de ponderaciones visibles; `confidence` no es probabilidad calibrada.
- Sin actuador háptico conectado: el patrón háptico es metadata para un dispositivo cliente.

## 7. Nexus — capa unificada de capacidades locales

Nexus (`src/nexus/`) unifica patrones auditados de doce repositorios de referencia **sin copiar su código**. Todo es local, determinista y acotado; ninguna capacidad se declara en producción. El dictamen completo está en [`docs/rfc/RFC-0010-nexus.md`](docs/rfc/RFC-0010-nexus.md).

| Componente | Qué hace de verdad | Qué no hace |
|---|---|---|
| **Grafo de conocimiento** | hechos con fuente obligatoria, detección de duplicado/conflicto, corrección versionada y retiro con razón | no resuelve conflictos solo; el hecho nunca se borra |
| **Bucle de agente** | planificar/ejecutar/observar con ledger de evidencia encadenado y memoria de skills | no usa LLM ni red dentro del bucle local; una skill aprendida no autoriza |
| **Workflows DAG** | orden topológico determinista, reintentos acotados y compensación inversa (saga) | rechaza ciclos; no acepta código del cliente |
| **Antifragilidad** | ventana de salud, cortacircuitos con `half-open` y sustitución declarada | no ejecuta reparaciones: solo las propone con aprobación humana |
| **Cuántica local** | simulador statevector de hasta 12 qubits con muestreo determinista | no es hardware real ni reemplaza PennyLane |

```text
GET  /api/v1/nexus                    POST /api/v1/nexus/ask
GET  /api/v1/nexus/knowledge          POST /api/v1/nexus/knowledge
POST /api/v1/nexus/knowledge/:id/correct
POST /api/v1/nexus/knowledge/:id/withdraw
POST /api/v1/nexus/quantum/simulate   GET  /api/v1/nexus/health
GET  /api/v1/nexus/repairs            POST /api/v1/nexus/diagnostics
```

Las escrituras exigen `GENESIS_ADMIN_API_TOKEN` verificado en el servidor y el cuerpo HTTP nunca concede aprobación. Lecturas: 30 req/min; escrituras: 10 req/min. Límites actuales: el grafo, el ledger y la memoria de skills viven **en memoria del proceso** y no sobreviven a un reinicio; todas las capacidades se declaran `production: false` hasta revisión humana nominal.

## 8. Motor de inferencia propio (orquestación, no modelo fundacional)

`src/inference/foundational-llm.ts` orquesta proveedores open source/free (Hugging Face, Ollama, Gratis, AI SDK Gateway), inyecta memoria conversacional e historial, recupera contexto verificado (RAG + verified knowledge), garantiza respuesta con fallback soberano y cachea 60 s. El fallback determinista local **se declara como fallback**: nunca se presenta como inferencia de modelo, y la ruta gratuita rechaza ids de proveedor pago (`externalProviderCalls: 0`).

## 9. Agent Mesh ISABELLA CERO (fusión 2026-11-01)

La fusión con `AnubisVillasenor1/proyecto-isabella-cero` incorpora la matriz de **10 roles** (`planner`, `researcher`, `architect`, `coder`, `tester`, `reviewer`, `security`, `devops`, `creative`, `operator`) y su política `ALLOW / DENY / ESCALATE`. El código es original y endurecido; los documentos canónicos se conservan con SHA-256 en [`docs/canon/`](docs/canon/README.md) y el dictamen completo está en [`docs/rfc/RFC-0011-fusion-isabella-cero.md`](docs/rfc/RFC-0011-fusion-isabella-cero.md).

| Componente | Qué hace de verdad | Qué no hace |
|---|---|---|
| **Matriz de roles** | cada rol declara scopes, techo de riesgo y si opera solo en sandbox | no concede autoridad: un `ALLOW` no autoriza ejecución |
| **Evaluación de política** | `DENY` por scope faltante, `ESCALATE` por riesgo o acción crítica | no lee la aprobación del cuerpo HTTP; exige bearer verificado |
| **Orquestador** | ejecuta solo adaptadores registrados, con concurrencia y timeout acotados | sin adaptador devuelve `NO_ADAPTER`; no simula trabajo |
| **Evidencia** | sella cada decisión en BookPI (`agent.mesh.*`) | no sustituye el ledger durable ni eleva `readyz` |
| **Sandbox** | contención con `path.relative`, rechazo de `..`, absolutas, NUL y symlinks | no aplica parches ni escribe en producción |
| **Planner / Reviewer** | descomposición determinista de objetivos y revisión de hallazgos | no usan modelo, red ni shell |

```text
GET  /api/v1/agents/mesh              catálogo de roles y adaptadores
POST /api/v1/agents/mesh/evaluate     evalúa política; no autoriza ni ejecuta
```

`executionPerformed` es siempre `false`. Coder, Tester, DevOps y Operator permanecen `SPECIFIED`: no tienen adaptador de ejecución registrado. La maqueta Next.js del repositorio de origen **no** se importó porque su chat y su editor son simulados.

## 10. Master Consolidated (fusión 2026-11-01)

La fusión del documento `ISABELLA_VILLASENOR_AI_MASTER_CONSOLIDATED.docx` vive en `src/infinity/`. Registra las **14 capas Ω** y los **9 Fabrics**, evalúa la constitución `ALLOW = IDENTITY × AUTHORITY × POLICY × EVIDENCE × SAFETY`, ejecuta **10 skills nativas deterministas** y expone Media, Build y Evolution Fabric **sin ejecutar acciones externas**.

| Componente | Qué hace de verdad | Qué no hace |
|---|---|---|
| **Arquitectura** | registra 14 capas Ω y 9 Fabrics con módulo y evidencia; la auditoría falla si alguien declara `production` | no convierte una capa especificada en implementada |
| **Catálogo** | 10 skills, 18 tools, 14 primitivas y 12 servicios con madurez y evidencia | no acredita las tools `mapped` ni el 20× |
| **Constitución** | `ALLOW/DENY`, ingesta de 14 etapas, licencias y trust asesor | `ALLOW` no autoriza, no ejecuta y no sustituye CROWN |
| **Skills** | investigación léxica, bibliometría, legal, open science, gobernanza, prompt, multimodal, música y voz | no buscan en red, no sintetizan audio ni clonan voz |
| **Media Fabric** | culling, estilo, retoque, galería, cotización y agrupación de embeddings | no modifica píxeles, no detecta caras, no publica ni cobra |
| **Build Fabric** | plan de workspace, sandbox, preview y deploy con allowlist | no ejecuta comandos, no escribe sandbox, no despliega |
| **Evolution Fabric** | cápsulas, GDI, selección y A2A deterministas en memoria | no publica, no adopta, no emite créditos, no ejecuta |

```text
GET  /api/v1/infinity                         resumen y auditoría
POST /api/v1/infinity/constitution/evaluate   evalúa; no autoriza
POST /api/v1/infinity/skills/run              skill determinista local
POST /api/v1/infinity/media/evaluate          media sin píxeles ni red
POST /api/v1/infinity/build/plan              plan; no ejecuta ni despliega
POST /api/v1/infinity/evolution/evolve        simulación en memoria
POST /api/v1/infinity/a2a/evaluate            evalúa verbos A2A
```

La tabla de la sección 16 del canon enumera **18 tools**, aunque su resumen dice 19; el catálogo sigue la tabla y documenta la divergencia. El 20× se trata como meta por capacidad, nunca como resultado: no hay benchmark reproducible. El dictamen completo está en [`docs/rfc/RFC-0012-infinity-master-consolidated.md`](docs/rfc/RFC-0012-infinity-master-consolidated.md) y el mapa operativo en [`docs/infinity/README.md`](docs/infinity/README.md).

## 11. Categorización del proyecto

| Categoría | Descripción | Módulos clave |
|---|---|---|
| **Kaos Audio System** | DSP espectral nativo, presets, preset adaptativo y plan de redefinición gobernado | `src/tamv/`, `src/routes/tamv.ts` |
| **Runtime & HTTP** | servidor Express/TypeScript, rutas, rate limiting, hardening | `src/server.ts`, `src/http/`, `src/routes/` |
| **Orquestación LLM** | proveedores HF/Ollama/Gratis/AI SDK Gateway + fallback soberano declarado como fallback | `src/inference/foundational-llm.ts`, `src/inference/free-providers.ts`, `src/inference/router.ts` |
| **RAG Soberano** | embeddings deterministas + búsqueda por similitud coseno | `src/inference/rag.ts`, `src/inference/embeddings.ts` |
| **Memoria** | 5 niveles (immediate, session, project, territorial, historical) + IKES | `src/memory/hierarchical.ts`, `src/memory/ikes.ts` |
| **Gobernanza** | CROWN, AEGIS, Policy Gate, Zero Trust, Prompt Guard, blackout Terminus | `src/genesis/`, `src/security/`, `src/governance/` |
| **Evidencia** | ledger BookPI con sello Ed25519 y canonicalización JCS (RFC 8785) | `src/governance/`, `src/ivcc/` |
| **Seguridad de red** | threat intel, `fetchSafeUpstream`, **compuerta de egreso** y guardia de salida HTTP | `src/security/egress-policy.ts`, `src/security/output-guard-http.ts`, `src/security/fetch-safe.ts` |
| **Agentes abiertos** | fábrica MCP/A2A con manifiesto gobernado | `src/nexus/open-agent-fabric.ts`, `src/routes/nexus.ts` |
| **Voz/IVCC** | consentimiento, perfiles de voz, watermark | `src/ivcc/`, `src/routes/ivcc.ts`, `src/routes/tts.ts` |
| **Economía** | SCER, dynamic pricing, Profit Guard, tesorería, afiliados, fraude | `src/economy/`, `src/commerce/` |
| **Territorio** | identidad e integración TAMV (MSR, MDD, DreamSpaces, Blindajes, Kaos Audio) | `src/territory/` |
| **Canon Ω∞** | registro canónico de pilares, capas, implementaciones y madurez | `src/platform/omega-canon.ts`, `src/platform/catalog.ts` |
| **Integraciones** | MCP, dominios Vercel, Hugging Face Hub, malla federada TAMV | `src/infra/vercel-domains.ts`, `src/federation/`, `/api/mcp` |
| **Nexus** | grafo con procedencia, agente con evidencia, DAG, antifragilidad, cuántica local, capacidades y fábrica | `src/nexus/`, `src/routes/nexus.ts` |

## 12. Funciones, tools y herramientas (medido sobre este árbol)

Ninguna de estas cifras se declara: se lee del árbol o del generador canónico.

| Magnitud | Valor medido | Cómo volver a medirlo |
|---|---|---|
| Rutas HTTP del inventario | **345** | `node scripts/route-inventory.mjs` |
| Rutas con contrato verificado | **159** (46,1 %) | `docs/api/route-inventory.json` → `verified: true` |
| Rutas sensibles | **210** | `docs/api/route-inventory.json` → `sensitive: true` |
| Operaciones OpenAPI sin fantasmas | **75** | `test/deployment/openapi-contract.test.ts` |
| Descriptores de herramienta | **37** = 28 en `src/tools/catalog.ts` + 9 en `src/tools/protocol-catalog.ts` | grep de `id:` en ambos catálogos |
| Techo del registro de herramientas | **64** (`MAX_TOOLS`) | `src/nexus/tool-registry.ts:51` |
| Agentes del manifiesto | **≤ 64**, protocolos `mcp-http` y `a2a-card`, autonomía `A0`–`A3` | `config/agent-fabric.template.json` |
| Primitivas `IsabellaEngine` | **9**: `observe`, `pick`, `place`, `move`, `rotate`, `handover`, `release`, `wait`, `verify` | `src/genesis/` |
| Fallback de decisión | **4 niveles** `PROGRAM → ACTION_CHUNK → HUMAN_REVIEW → DEGRADED` | las habilidades de alto impacto siempre terminan en `HUMAN_REVIEW` |
| Skills declaradas / registrables / invocables | **41 / 33 / 25** (22 con handler enlazado + 3 alias; 0 afirmaciones sin soporte; 16 sin promesa de ejecución) | `src/skills/catalog-coherence.ts`, `GET /api/v1/skills` |
| Capacidades del registry | **18**, de las cuales **13** en `implemented`/`verified`/`wired` | `src/lib/lib/capability-registry.ts` |
| Puertas de despliegue canónicas | **10** | `src/governance/deployment-gates.ts` |
| Archivos y casos de prueba | **396** archivos, **2834** casos | `node node_modules/vitest/vitest.mjs run` |
| Archivos `.ts` bajo `src/` | **969** (594 excluyendo la isla `src/lib/**`) | recuento sobre `src/**/*.ts` |

### Habilidades: catálogo declarado vs. registro ejecutable

`src/skills/catalog-coherence.ts` reconcilia las dos listas que antes convivían sin compararse; es la compuerta que cierra AUD-233. La regla no es un texto: una entrada con `skillNumber` afirma una habilidad invocable y por eso exige handler enlazado; una entrada sin número declara la madurez de un subsistema (CROWN, ARGUS, memoria territorial, síntesis de voz, la familia `monetization/*`) y no promete ejecución. `GET /api/v1/skills` expone por cada habilidad `invocable`, `handlerBound`, `executableId`, `aliasOf` y `claimSupported`, además del resumen agregado, para que el cliente no tenga que adivinar qué hay detrás de un `status: verified`. `test/skills/catalog-coherence.test.ts` falla si aparece una afirmación sin handler.

Ejecución real: `POST /api/v1/hypercore/skills/execute` (`src/routes/hypercore.ts:196`) pasa por `authorizeApiToken`, por su propia ventana de rate limit y por el `SkillRegistry`, que solo corre una skill cuyo descriptor está enlazado. Las 22 evolucionadas se exponen en `tools/list` del puente MCP con su huella de procedencia. Cada ejecución de herramienta deja evidencia en BookPI antes de que su salida llegue al llamador.

## 13. Por qué y para qué

Porque la mayoría de los agentes desplegados hoy no puede responder a tres preguntas de forma auditable: qué autoridad tenía, qué ejecutó realmente y qué evidencia queda. Isabella existe para que esas tres preguntas tengan respuesta mecanográfica en un sistema que sirve a TAMV ONLINE —identidad territorial, audio, memoria, economía, conocimiento verificado— y que, al mismo tiempo, pueda operar **sobre cualquier tema** mediante agentes abiertos sin convertir ese acceso en autoridad.

Para qué: para ser la capa gobernable entre una organización y sus modelos y agentes —contratos de capacidad, evidencia inmutable, negación explícita— y no un wrapper más que promete lo que su proveedor le deja prometer.

## 14. Plano de sectores con mayor probabilidad de éxito

Ordenado por la relación entre lo que hoy está realmente cableado y lo que el sector exige.

| # | Sector | Por qué encaja ahora | Qué falta para cobrar | Riesgo que la gobernanza ya cubre |
|---|---|---|---|---|
| 1 | **Archivos, memoria institucional y patrimonio** | grafo con procedencia obligatoria + ledger Ed25519 + 5 niveles de memoria | persistencia durable (Postgres/BookPI) y UI de curaduría | el hecho nunca se borra; corrección versionada |
| 2 | **Investigación y bibliometría** | skills léxicas, bibliométricas y de open science; RAG soberano | acceso a fuentes externas por la fábrica de agentes | alucinación contenida: sin fuente no hay hecho |
| 3 | **Salud, acceso abierto y ciencia de datos** | constitución de ingesta de 14 etapas, licencias y trust asesor | arbitraje humano nominal por dominio | `ALLOW` no autoriza ni ejecuta |
| 4 | **Audio, ecología acústica y accesibilidad** | Kaos Audio System nativo (FFT, centroide, transitorios, M/S) | medidor LUFS real y motor de separación externo | no sintetiza ni clona voz (blackout `VOICE_SYNTHESIS`) |
| 5 | **Educación y tutoría gobernada** | orquestación multi-proveedor con fallback declarado y rate limiting | contenido curado y evidencia por estudiante | respuesta garantizada sin fingir modelo propio |
| 6 | **Comercio y tesorería** | SCER, dynamic pricing, Profit Guard, HMAC en webhook | proveedor de pago real y conciliación | firma comparada en tiempo constante, anti-replay |
| 7 | **Sector público y cumplimiento** | auditoría criptográfica, SBOM, gates fail-closed | revisión humana nominal del `engine-generated` | cada negativa queda registrada |
| 8 | **Integración de agentes open source** | fábrica MCP/A2A + compuerta de egreso | manifiestos por dominio y revisión de proveedores | SSRF cerrado; descubrimiento ≠ permiso |
| 9 | **Turismo y territorio (Visitar al Del Monte)** | identidad territorial TAMV, contextos y catálogo | contenido y reservas reales | cero afirmaciones no soportadas |
| 10 | **Media y fotografía profesional** | Media Fabric: culling, estilo, galería y cotización | motor que modifique píxeles y pasarela de cobro | no publica ni cobra por su cuenta |

## 15. Posicionamiento global

Isabella se sitúa en la capa de **gobernanza de agentes**, no en la de modelos ni en la de chat. Frente a los frameworks de agentes, su diferencial es que la negación, el techo de autonomía y la evidencia son primitivas del runtime con pruebas propias; frente a las plataformas de observabilidad LLM, que aquí la trazabilidad es **transaccional** (JCS + Ed25519) y no solo telemetry; frente a los marketplaces de agentes, que la admisión pasa por un manifiesto validado y una compuerta de egreso, sin segundo camino de ejecución. Su costo es el de toda postura conservadora: no puede anunciar capacidades que aún no puede demostrar.

## 16. Avance real global para producción y despliegue

Un solo porcentaje, calculado por `scripts/production-progress.mjs` sobre cuatro ejes con peso declarado y evidencia sellada en `docs/status/production-progress-evidence.json`. Para reproducirlo: `node scripts/production-progress.mjs`; `--check` falla si la evidencia no corresponde al árbol actual.

```text
AVANCE_REAL_GLOBAL_PRODUCCION_DESPLIEGUE=62.6%
  superficie   46.1%  (159/345 rutas con contrato verificado)
  pruebas      100.0%  (2834/2834)
  capacidades  72.2%  (13/18 en implemented|verified|wired)
  despliegue   50.0%  (5/10 puertas en passed)
  pesos declarados: superficie 0.2 · pruebas 0.2 · capacidades 0.15 · despliegue 0.45
  evidencia medida 2026-11-04T07:57:48.506Z con node v26.13.0
  puertas no cerradas: dependency_scan, auth_rls, health_readiness, canary, rollback_plan
```

Cómo se lee, sin ambigüedad:

- **62,6 % es avance ponderado, no aptitud.** Con `health_readiness` en `failed` el sistema **no es desplegable hoy**, y el número no afirma lo contrario.
- El eje de despliegue pesa 0,45 a propósito: la respuesta a «¿está listo para producción?» no la da el código solo.
- `skipped` y `not_observed` cuentan como **no pasadas**: la ausencia de evidencia no suma avance. Antes de sellar evidencia, este mismo instrumento marcaba **20,1 %**.
- Las pruebas se midieron en esta máquina con **Node v26.13.0** mientras `engines.node` fija `24.x`; el número no está verificado en CI (ver §18).
- La superficie es 159/345 porque 186 rutas están registradas sin contrato verificado: es trabajo pendiente real, no redondeo.

## 17. Validación

```bash
corepack pnpm install --frozen-lockfile
corepack pnpm run typecheck
corepack pnpm run lint
corepack pnpm run format:check
corepack pnpm test
corepack pnpm run smoke:ui
corepack pnpm run smoke:runtime
corepack pnpm run build
corepack pnpm run deploy:readiness
node scripts/production-progress.mjs --check
```

Puertas duras del inventario y del canon: `test/deployment/route-inventory.test.ts` (las 345 rutas registradas en `src/` están congeladas; una extracción de módulo no puede perder ni renombrar un endpoint, y ningún literal puede registrarse en dos módulos), `test/deployment/openapi-contract.test.ts` (ninguna operación documentada en `docs/api/openapi.yaml` puede ser fantasma: hoy 75 operaciones), `test/deployment/env-documentation.test.ts`, `test/deployment/readiness-consistency.test.ts` y `test/skills/catalog-coherence.test.ts`. La suite del Kaos Audio System son 7 archivos con oráculo DFT ingenuo que valida la FFT y regresiones explícitas de los dos errores que ya se corrigieron. El inventario se regenera con `node scripts/route-inventory.mjs`; las columnas Auth/Rate-limit/Validación son heurísticas de análisis estático, no pruebas en ejecución.

Resultado de la corrida de esta versión, medido en esta máquina:

| Paso | Resultado |
|---|---|
| `vitest run` (suite completa) | **396 archivos / 2834 casos, 0 fallos** (517 s, exit 0) |
| `repository-assurance.mjs` | 44 reglas RA-001…RA-044, exit 0 |
| `security-suite.mjs` | 14 passed, 0 failed, 0 not_applicable |
| `check:env` / `check:sops` | exit 0 (`ENV_EXAMPLE_OK keys=228 read_in_src=113`) |
| `runtime-smoke.mjs` | exit 0; incluye `OPENROUTER_PAID_ID_BLOCK_OK` con `externalProviderCalls: 0` |
| esbuild + `node --check dist/server.js` | exit 0 (bundle 2,6 MB) |
| `deploy:readiness` | **exit 1** `DEPLOY_READINESS_BLOCKED` (6 errores, todos de configuración ausente) |
| `verify-deploy-gate.mjs` | exit 1: `evidence/` es gitignored y no hay SBOM ni SHA bajo despliegue local |

## 18. Estado real del CI

Las tres comprobaciones que dependen de GitHub Actions no han llegado a ejecutarse nunca en este repositorio por un bloqueo de facturación de la cuenta; la anotación del check-run lo dice literalmente:

```text
The job was not started because your account is locked due to a billing issue.
```

Los jobs figuran con ~2 s, `steps: []` y `runner_name` vacío, y su log responde 404 `BlobNotFound`. Ningún cambio de código puede volver verdes esas comprobaciones mientras el bloqueo exista; por eso la tabla de §17 se midió localmente, paso por paso. El escaneo Trivy del mismo job (`severity: CRITICAL,HIGH`) queda cubierto de forma indirecta: el único `high` del grafo de producción era `@hono/node-server` dentro de la cadena de Prisma, ya eliminada. IGE-Ω (`cargo fmt`/`clippy`/`test`/`build`) no es verificable aquí: no hay `cargo` ni `rustc` instalados.

## 19. Despliegue en Vercel

Topología desplegada el 2026-10-31:

- El proyecto de Vercel está configurado como **Other** (`framework: null`), no como preset `Express`. El preset detectaba `src/server.ts` como entrypoint y lo compilaba con `tsc` dentro de la función (`/var/task/src/server.js`); Node ESM no resuelve los imports sin extensión que emite `tsc`, así que `/` fallaba con `ERR_MODULE_NOT_FOUND` mientras otras rutas respondían.
- La única función es `api/index.js`, que importa el bundle `dist/server.js` producido por esbuild en `pnpm build:dist`.
- `vercel.json` declara `outputDirectory: "public"` (solo contiene `robots.txt`) porque Vercel exige un directorio de salida estático aunque `rewrites` mande todo a `/api`.
- `includeFiles` se limita a `dist/**`, `src/ui/**` y `src/assets/video/**`: exactamente lo que el runtime lee del disco.
- El entrypoint raíz `server.js` se eliminó para que no exista un segundo candidato ambiguo.

Evidencia observada en el deployment `dpl_C5xBWTQ2z2Zay969hoP6YrJp2Fhq`: `GET /` → 200 `text/html` (54 447 bytes), `GET /health` → 200, y `/ui/app.js`, `/styles/cinematic.css`, `/api/v1/nexus` y `/api/v1/nexus/health` → 200. Un 200 demuestra que el artefacto arranca y sirve; **no** demuestra autoridad, ni producción certificada, ni que los gates de §20 estén cerrados.

## 20. Gates pendientes para liberar

Mientras estos gates no estén cerrados sobre el SHA candidato, el sistema **no** se declara en producción. Cinco de las diez puertas canónicas siguen abiertas y su bloqueo es de credenciales e infraestructura, **no de código**: `deploy:readiness` falla con seis errores que son todos configuración ausente (`GENESIS_ADMIN_API_TOKEN`, `BOOKPI_INTEGRITY_SECRET`, `DATABASE_URL`/`POSTGRES_URL`, Supabase, `MONGODB_URI`, `ALLOWED_ORIGINS`).

1. CI completo (typecheck, lint, format, pruebas, build, smokes) conservando logs válidos sobre el SHA — requiere desbloquear la facturación de Actions y corre por cuenta de `dependency_scan`.
2. Persistencia durable verificada: secretos del entorno, migraciones aplicadas, adaptadores Postgres de API-keys y federación, durabilidad y recuperación de BookPI. `auth_rls` requiere una base real.
3. Conversación generativa E2E con proveedor autorizado, incluyendo timeout, error y fallback comprobados.
4. E2E de navegador en desktop y móvil: navegación, conversación, accesibilidad y errores.
5. Despliegue, monitorización, backup/restore, canary y rollback reales en el entorno objetivo. El incidente concreto `500 FUNCTION_INVOCATION_FAILED` en `/` fue reproducido, diagnosticado y corregido (ver §19); `canary` y `rollback_plan` siguen sin evidencia.
6. Revisión humana nominal de todo artefacto marcado `engine-generated` y arbitraje del aflojamiento descrito en §21.

## 21. Divergencias archivadas

AGENTS.md §6: cuando la especificación y el código se contradicen, **se archiva la divergencia y no se reescribe el código** para que la afirmación resulte cierta.

- [`docs/history/archive/DIVERGENCIAS-2026-11-04.md`](docs/history/archive/DIVERGENCIAS-2026-11-04.md) — auditoría de las tres especificaciones recibidas (agent runtime, fábrica open source, NEXUS ∞). Vivían como archivos sueltos, no en el repo (`grep -r "NEXUS SOBERANO" docs/` → 0 coincidencias). Incluye la **SOBREDECLARACIÓN ≈ 40×** de «miles de agentes» frente a los 64 medidos, los ítems `NO IMPLEMENTADO` (Qoder Agent SDK, scaffolding Python, simulación de costo/privacidad, autonomía A4/A5, «listo para producción») y el `PARCIAL` de la cobertura de la compuerta de egreso.
- Queda un aflojamiento explícito pendiente de arbitraje humano: `humanAuthorizedShadow` en `src/nexus/capability-engine.ts` registra una ejecución `shadow` bajo portador humano verificado, que **no** equivale a `approved`. Se documenta en el §2 de ese informe; no se presentó como una mejora silenciosa.

Registrar capacidad falsa es peor que confesar la real. Estado documentado y limitaciones: [`docs/ESTADO-REAL-ACTUAL.md`](docs/ESTADO-REAL-ACTUAL.md).

## 22. Variables de entorno

El contrato completo está en [`.env.example`](.env.example): una línea por variable con su semántica y su modo de fallo. Reglas operativas:

1. Las rutas `POST /api/v1/tamv/*` no introducen secretos propios: reutilizan `GENESIS_ADMIN_API_TOKEN`.
2. `ISABELLA_SIGNING_PRIVATE_KEY_PEM` / `ISABELLA_SIGNING_PUBLIC_KEY_PEM` son opcionales; sin ellos el servidor genera un par efímero por proceso y las firmas no sobreviven a un reinicio.
3. `MCP_SERVER_TOKEN` está sin configurar por defecto: `/api/mcp` responde 503 en lugar de ejecutar herramientas.
4. La fábrica de agentes lee `ISABELLA_AGENT_FABRIC_FILE`; la compuerta de egreso lee `ISABELLA_EGRESS_ALLOWED_HOSTS`, `ISABELLA_EGRESS_PORTS` e `ISABELLA_EGRESS_SCHEMES`. **Sin allowlist no hay salida**: el modo por defecto es cerrado y un valor de plantilla (`<` o `${`) se trata como no configurado.
5. Los bearer de los agentes se nombran, nunca se valoran: `authEnv` es el nombre de la variable (`ISABELLA_*`) y su valor se lee en el momento de la llamada.

Nunca se escriben valores reales de credenciales en código, documentación, commits ni logs.

## 23. Dependencias: por qué el `pnpm audit` fallaba

`pnpm@10.28.0` (la versión fijada en `packageManager`) no lee el campo `pnpm` de `package.json`; lo ignora con aviso explícito:

```text
WARN  The "pnpm" field in package.json is no longer read by pnpm.
      The following keys were ignored: "pnpm.overrides".
```

Las remediaciones del repo vivían ahí, así que en CI no se aplicaba ninguna. Ahora viven en [`pnpm-workspace.yaml`](pnpm-workspace.yaml), que sí es la fuente que pnpm 10 consulta, y cada override está acotado a la línea que reporta el aviso (`qs@>=6.7.0 <6.16.1`, `minimatch@>=10.0.0 <11.0.1`) porque un `<` sin cota superior reescribiría también los majors que esperan eslint o vitest.

Además `@prisma/client` y `prisma` estaban declarados sin que ningún archivo del repo los importe (`src/` no tiene ni un `import` de `@prisma/*`, no hay `schema.prisma` ni carpeta `prisma/`). Como `drizzle-orm` los lista como peer opcional y `autoInstallPeers` está activo, esa dependencia muerta arrastraba la cadena `prisma → @prisma/composer-cli → alchemy@2.0.0-beta.83 → {@prisma/dev → @hono/node-server, @vercel/nft → glob}` al grafo de producción, que era justo la que `pnpm audit --prod` reporta. Se eliminaron ambas.

Resultado medido tras regenerar `pnpm-lock.yaml` y validarlo con `pnpm install --frozen-lockfile`:

```text
$ pnpm audit --prod --audit-level=moderate
No known vulnerabilities found        # exit 0
```

Queda un aviso `moderate` en el grafo de desarrollo (`eslint → minimatch@9`, GHSA-g3hv-75wg-m249). No bloquea el gate del CI, que es `--prod`; se dejó deliberadamente sin forzar porque subir minimatch 9 → 11 dentro de eslint es cambiar el instrumento con el que se verifica el resto. Es un elemento abierto, no resuelto.

## 24. Propiedad y licencia

Copyright (c) 2026 **TAMV ONLINE ENTERPRISE** — **Edwin Oswaldo Castillo Trejo (Anubis Villaseñor)**. El TAMV Kaos Audio System, el canon Génesis Ω∞, la identidad Isabella Villaseñor y el branding TAMV ONLINE son creación y propiedad de su autor y no pueden utilizarse sin su consentimiento. Ver [`NOTICE`](NOTICE.md).

Este repositorio **no** está bajo una licencia de código abierto. Se publica bajo el aviso propietario de [`LICENSE`](LICENSE): todos los derechos reservados, y ningún uso —incluidas la copia, la redistribución, el despliegue como servicio y el aprovechamiento del código o de su documentación para entrenar modelos de IA— sin consentimiento previo, expreso y por escrito del titular. Las versiones anteriores circularon con un texto MIT; la sustitución es prospectiva y su alcance está declarado en el §6 de `LICENSE`. Cada dependencia y cada activo de terceros conservan la licencia que les dio su propio titular (§4).

> Estado del repositorio: `draft | engine-generated` hasta revisión humana nominal. No se declara conciencia, autonomía jurídica ni autoridad propia.
