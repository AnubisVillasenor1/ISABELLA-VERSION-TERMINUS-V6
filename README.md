# Isabella Villaseñor AI Génesis Ω∞ — TAMV ONLINE

Isabella es un **Runtime Web Operativo y Sistema Federado de Inteligencia Artificial Gobernada (FGAIS)** construido, propiedad y creado por **Edwin Oswaldo Castillo Trejo (Anubis Villaseñor)** bajo la marca **TAMV ONLINE ENTERPRISE**. No es un chatbot: es un runtime con gobernanza determinista, memoria jerárquica, un motor de inferencia propio que **orquesta** LLM externos (no es un modelo fundacional entrenado por TAMV), RAG soberano, herramientas allowlisted, habilidades ejecutables, auditoría criptográfica y —desde esta versión— un sistema nativo de análisis audio-espectral en tiempo real: el **TAMV Kaos Audio System**.

> Estado del repositorio: `draft | engine-generated` hasta revisión humana nominal. No se declara conciencia, autonomía jurídica ni autoridad propia.
>
> Propiedad y uso: ver [`LICENSE`](LICENSE) y [`NOTICE`](NOTICE.md). La licencia publicada es **propietaria, con todos los derechos reservados**: clonar o leer el repositorio no autoriza ningún uso, y en ningún caso se transfieren la marca, la identidad territorial ni el diseño del Kaos Audio System.

## Contrato de evidencia

Este repositorio se rige por el invariante ontológico:

```text
SPECIFIED ≠ IMPLEMENTED ≠ TESTED ≠ PRODUCTION
CAPABILITY ≠ AUTHORITY ≠ EXECUTION ≠ EVIDENCE
```

Ningún documento, tabla o respuesta de API puede elevar una categoría a otra. El inventario de rutas (`docs/api/route-inventory.json`), el canon Ω∞ (`src/platform/omega-canon.ts`) y el mapa de integración TAMV (`src/territory/tamv-integration.ts`) declaran la madurez real de cada capacidad, y hay pruebas que fallan si una cifra inventada reaparece.

## TAMV Kaos Audio System

Innovación nativa: DSP de audio escrito en TypeScript dentro de este repositorio, sin dependencias nativas, sin WASM y sin servicio externo. Mide la señal que el cliente envía y deriva presets y planes. **No reproduce, no sintetiza, no separa fuentes.**

### Qué calcula de verdad

- **FFT radix-2 Cooley–Tukey in-place** sobre ventana de Hann simétrica; `DEFAULT_FFT_SIZE = 2048`, `DEFAULT_HOP_SIZE = 512`, promedio tipo Welch.
- **Centroide espectral**, **flatness** (razón geométrica/aritmética de magnitudes) y **energía por banda**: grave `0–250 Hz`, medio `250–2000 Hz`, agudo `2000 Hz–Nyquist`, banda de voz `300–3400 Hz`.
- **Transitorios por flujo espectral relativo**: cada avance normalizado por la energía de los dos cuadros involucrados; el umbral es `media + 2.5·σ` con un suelo de `0.08` y separación mínima de 40 ms. Sin este detalle los onsets se contaban sobre ruido de piso.
- **Estéreo M/S como proporción** `side / (mid + side)`: una señal en contrafase ya no colapsa a cero.
- **Niveles medidos**: pico y RMS en dBFS, factor de cresta, rango dinámico, proporción de silencio, latencia de análisis del request.
- **Perfil emocional y complejidad espacial** por ponderaciones visibles (documentadas en `src/tamv/analysis.ts`), no por un modelo entrenado.

### Qué declara y qué se niega a fingir

- 11 presets de fábrica con `processingChain` ordenada y matriz acústica interpretable (entorno × contenido × emoción × complejidad espacial × intensidad háptica).
- Preset adaptativo determinista: el mismo WAV produce el mismo `adaptive_<sha12>`.
- Plan de redefinición de **8 etapas** con **15 puertas de validación colgadas**; **7 etapas son reversiblemente recuperables** y todas nacen en estado `declared` con `audioRendered: false`.
- Monitor de telemetría con **10 lecturas**: las 4 de hardware (temperatura de CPU, uso de GPU, error de sincronía háptica, precisión espacial) se devuelven como `measured: false` con su motivo; de las 6 restantes se calculan 6 en material estéreo y 5 en mono —en mono no existe el par de canales que correlacionar— (invariante `CAPABILITY ≠ AUTHORITY ≠ EXECUTION ≠ EVIDENCE`).

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
GET  /api/v1/tamv/status
GET  /api/v1/tamv/presets
GET  /api/v1/tamv/presets/:presetId
POST /api/v1/tamv/analyze
POST /api/v1/tamv/adaptive-preset
POST /api/v1/tamv/redefine-plan
```

Un rechazo 400 devuelve el motivo exacto (`TAMV_PAYLOAD_EMPTY`, `TAMV_BASE64_INVALID`, `TAMV_MIME_UNSUPPORTED`, `TAMV_PAYLOAD_TOO_LARGE`, `TAMV_WAV_UNDECODEABLE`, `TAMV_SIGNAL_TOO_SHORT`, `TAMV_DURATION_TOO_LONG`): "no es WAV" y "está vacío" no son el mismo error.

### Limitaciones del motor (no negociables en el texto)

- No hay reproducción en tiempo real: el motor mide y declara, no emite sonido.
- No hay separación de fuentes ejecutada; `source_separation` es un objetivo para un motor externo.
- No hay HRTF ni render binaural/ambisonic: `width`/`height`/`depth` son parámetros declarados.
- No hay medidor LUFS: la puerta de sonoridad usa RMS medido, que no es loudness percibida EBU R128.
- El clasificador es un conjunto de ponderaciones visibles; `confidence` no es probabilidad calibrada.
- Sin actuador háptico conectado: el patrón háptico es metadata para un dispositivo cliente.

## Categorización del sistema

| Categoría | Descripción | Módulos clave |
|---|---|---|
| **Kaos Audio System** | DSP espectral nativo, presets, preset adaptativo y plan de redefinición gobernado | `src/tamv/`, `src/routes/tamv.ts` |
| **Runtime & HTTP** | Servidor Express/TypeScript, rutas, rate limiting, hardening | `src/server.ts`, `src/http/`, `src/routes/` |
| **LLM Fundacional** | Orquestación de proveedores (HF, Ollama, Gratis, AI SDK Gateway) + fallback soberano | `src/inference/foundational-llm.ts`, `src/inference/free-providers.ts`, `src/inference/router.ts` |
| **RAG Soberano** | Embeddings deterministas + búsqueda por similitud coseno | `src/inference/rag.ts`, `src/inference/embeddings.ts` |
| **Memoria** | 5 niveles (immediate, session, project, territorial, historical) + IKES | `src/memory/hierarchical.ts`, `src/memory/ikes.ts` |
| **Gobernanza** | CROWN, AEGIS, Policy Gate, Zero Trust, Prompt Guard, blackout Terminus | `src/genesis/`, `src/security/`, `src/governance/` |
| **Evidencia** | Ledger BookPI con sello Ed25519 y canonicalización JCS (RFC 8785) | `src/governance/`, `src/ivcc/` |
| **Ciberseguridad** | Threat intel, JCS, fetchSafeUpstream, advanced threat intel | `src/security/advanced-threat-intel.ts`, `src/security/jcs.ts`, `src/security/fetch-safe.ts` |
| **Voz/IVCC** | IVCC, consentimiento, perfiles de voz, watermark | `src/ivcc/`, `src/routes/ivcc.ts`, `src/routes/tts.ts` |
| **Economía** | SCER, dynamic pricing, Profit Guard, tesorería, afiliados, fraude | `src/economy/`, `src/commerce/` |
| **Territorio** | Identidad e integración TAMV (MSR, MDD, DreamSpaces, Blindajes, Kaos Audio) | `src/territory/` |
| **Canon Ω∞** | Registro canónico de pilares, capas, implementaciones y madurez | `src/platform/omega-canon.ts`, `src/platform/catalog.ts` |
| **Integraciones** | MCP, dominios Vercel, Hugging Face Hub, malla federada TAMV | `src/infra/vercel-domains.ts`, `src/federation/`, `/api/mcp` |
| **Nexus** | Grafo con procedencia, agente con evidencia, workflows DAG, antifragilidad, cuántica local | `src/nexus/`, `src/routes/nexus.ts` |

## Motor de inferencia propio (orquestación, no modelo fundacional)

`src/inference/foundational-llm.ts` orquesta proveedores open source/free (Hugging Face, Ollama, Gratis, AI SDK Gateway), inyecta memoria conversacional e historial, recupera contexto verificado (RAG + verified knowledge), garantiza respuesta con fallback soberano y cachea 60 s. El fallback determinista local **se declara como fallback**: nunca se presenta como inferencia de modelo.

## Herramientas y skills

- `IsabellaEngine` con 9 primitivas: `observe`, `pick`, `place`, `move`, `rotate`, `handover`, `release`, `wait`, `verify`.
- Fallback de 4 niveles: `PROGRAM → ACTION_CHUNK → HUMAN_REVIEW → DEGRADED`.
- Habilidades de alto impacto siempre terminan en `HUMAN_REVIEW`.
- Catálogo gobernado de herramientas registrado en `src/tools/catalog.ts`; cada ejecución deja evidencia en BookPI antes de que su salida llegue al llamador.

## Agent Mesh ISABELLA CERO (fusión 2026-11-01)

La fusión con `AnubisVillasenor1/proyecto-isabella-cero` incorpora la matriz de **10 roles** del canon CERO (`planner`, `researcher`, `architect`, `coder`, `tester`, `reviewer`, `security`, `devops`, `creative`, `operator`) y su política `ALLOW / DENY / ESCALATE`. El código es original y endurecido; los documentos canónicos se conservan con SHA-256 en [`docs/canon/`](docs/canon/README.md) y el dictamen completo está en [`docs/rfc/RFC-0011-fusion-isabella-cero.md`](docs/rfc/RFC-0011-fusion-isabella-cero.md).

| Componente | Qué hace de verdad | Qué no hace |
|---|---|---|
| **Matriz de roles** | Cada rol declara scopes, techo de riesgo y si opera solo en sandbox | No concede autoridad: un `ALLOW` no autoriza ejecución |
| **Evaluación de política** | `DENY` por scope faltante, `ESCALATE` por riesgo o acción crítica | No lee la aprobación del cuerpo HTTP; exige bearer verificado |
| **Orquestador** | Ejecuta solo adaptadores registrados, con concurrencia y timeout acotados | Sin adaptador devuelve `NO_ADAPTER`; no simula trabajo |
| **Evidencia** | Sella cada decisión en BookPI (`agent.mesh.*`) | No sustituye el ledger durable ni eleva `readyz` |
| **Sandbox** | Contención con `path.relative`, rechazo de `..`, absolutas, NUL y symlinks; SHA3-512 | No aplica parches ni escribe en producción |
| **Planner / Reviewer** | Descomposición determinista de objetivos y revisión de hallazgos | No usan modelo, red ni shell |

```text
GET  /api/v1/agents/mesh              catálogo de roles y adaptadores
POST /api/v1/agents/mesh/evaluate     evalúa política; no autoriza ni ejecuta
```

`executionPerformed` es siempre `false`. Coder, Tester, DevOps y Operator permanecen `SPECIFIED`: no tienen adaptador de ejecución registrado. La maqueta Next.js del repositorio de origen **no** se importó porque su chat y su editor son simulados; el detalle y la auditoría están en el RFC-0011.

## Master Consolidated (fusión 2026-11-01)

La fusión del documento `ISABELLA_VILLASENOR_AI_MASTER_CONSOLIDATED.docx` vive en `src/infinity/`. Registra las **14 capas Ω** y los **9 Fabrics**, evalúa la constitución `ALLOW = IDENTITY × AUTHORITY × POLICY × EVIDENCE × SAFETY`, ejecuta **10 skills nativas deterministas** y expone Media, Build y Evolution Fabric **sin ejecutar acciones externas**.

| Componente | Qué hace de verdad | Qué no hace |
|---|---|---|
| **Arquitectura** | Registra 14 capas Ω y 9 Fabrics con módulo y evidencia; la auditoría falla si alguien declara `production` | No convierte una capa especificada en implementada |
| **Catálogo** | 10 skills, 18 tools, 14 primitivas y 12 servicios con madurez y evidencia | No acredita las tools `mapped` ni el 20× |
| **Constitución** | `ALLOW/DENY`, ingesta de 14 etapas, licencias y trust asesor | `ALLOW` no autoriza, no ejecuta y no sustituye CROWN |
| **Skills** | Investigación léxica, bibliometría, legal, open science, gobernanza, prompt, multimodal, música y voz | No buscan en red, no sintetizan audio ni clonan voz |
| **Media Fabric** | Culling, estilo, retoque, galería, cotización y agrupación de embeddings | No modifica píxeles, no detecta caras, no publica ni cobra |
| **Build Fabric** | Plan de workspace, sandbox, preview y deploy con allowlist | No ejecuta comandos, no escribe sandbox, no despliega |
| **Evolution Fabric** | Cápsulas, GDI, selección y A2A deterministas en memoria | No publica, no adopta, no emite créditos, no ejecuta |

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

## Nexus — capa unificada de capacidades locales

Nexus (`src/nexus/`) unifica patrones auditados de doce repositorios de referencia **sin copiar su código**. Todo es local, determinista y acotado; ninguna capacidad se declara en producción. El dictamen completo, incluidos los dos repositorios que no aportaron nada (`google/agi` es Android GPU Inspector y `w37fhy/QuantumultX` son reglas de proxy), está en [`docs/rfc/RFC-0010-nexus.md`](docs/rfc/RFC-0010-nexus.md).

| Componente | Qué hace de verdad | Qué no hace |
|---|---|---|
| **Grafo de conocimiento** | Hechos con fuente obligatoria, detección de duplicado/conflicto, corrección versionada y retiro con razón | No resuelve conflictos solo; el hecho nunca se borra |
| **Bucle de agente** | Planificar/ejecutar/observar con ledger de evidencia encadenado y memoria de skills | No usa LLM ni red; una skill aprendida no autoriza |
| **Workflows DAG** | Orden topológico determinista, reintentos acotados y compensación inversa (saga) | Rechaza ciclos; no acepta código del cliente |
| **Antifragilidad** | Ventana de salud, cortacircuitos con `half-open` y sustitución declarada | No ejecuta reparaciones: solo las propone con aprobación humana |
| **Cuántica local** | Simulador statevector de hasta 12 qubits con muestreo determinista | No es hardware real ni reemplaza PennyLane |

```text
GET  /api/v1/nexus                    POST /api/v1/nexus/ask
GET  /api/v1/nexus/knowledge          POST /api/v1/nexus/knowledge
POST /api/v1/nexus/knowledge/:id/correct
POST /api/v1/nexus/knowledge/:id/withdraw
POST /api/v1/nexus/quantum/simulate   GET  /api/v1/nexus/health
GET  /api/v1/nexus/repairs            POST /api/v1/nexus/diagnostics
```

Las escrituras exigen `GENESIS_ADMIN_API_TOKEN` verificado en el servidor y el cuerpo HTTP nunca concede aprobación. Lecturas: 30 req/min; escrituras: 10 req/min. Límites actuales: el grafo, el ledger y la memoria de skills viven **en memoria del proceso** y no sobreviven a un reinicio; todas las capacidades se declaran `production: false` hasta revisión humana nominal.

## Variables de entorno

El contrato completo está en [`.env.example`](.env.example): una línea por variable con su semántica y su modo de fallo. Tres reglas operativas:

1. Las variables `POST /api/v1/tamv/*` no introducen secretos propios: reutilizan `GENESIS_ADMIN_API_TOKEN`.
2. `ISABELLA_SIGNING_PRIVATE_KEY_PEM` / `ISABELLA_SIGNING_PUBLIC_KEY_PEM` son opcionales; sin ellos el servidor genera un par efímero por proceso y las firmas no sobreviven a un reinicio.
3. `MCP_SERVER_TOKEN` está sin configurar por defecto: `/api/mcp` responde 503 en lugar de ejecutar herramientas.

Nunca se escriben valores reales de credenciales en código, documentación, commits ni logs.

## Validación

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
```

Puertas duras del inventario y del canon: `test/deployment/route-inventory.test.ts` (las 336 rutas registradas en `src/` están congeladas; una extracción de módulo no puede perder ni renombrar un endpoint, y ningún literal puede registrarse en dos módulos), `test/deployment/openapi-contract.test.ts` (ninguna operación documentada en `docs/api/openapi.yaml` puede ser fantasma: hoy 75 operaciones), `test/deployment/env-documentation.test.ts` y `test/deployment/readiness-consistency.test.ts`. La suite del Kaos Audio System son 7 archivos y 105 casos, con oráculo DFT ingenuo que valida la FFT y regresiones explícitas de los dos errores que ya se corrigieron. En total el repositorio tiene 392 archivos `*.test.ts` y 969 archivos `.ts` bajo `src/` (594 excluyendo la isla `src/lib/**`).

El inventario se regenera con `node scripts/route-inventory.mjs`; las columnas Auth/Rate-limit/Validación son heurísticas de análisis estático, no pruebas en ejecución.

## Habilidades: catálogo declarado vs. registro ejecutable

`src/skills/catalog-coherence.ts` reconcilia las dos listas que antes convivían sin compararse, y es la compuerta que cierra AUD-233. Medido sobre este SHA:

| Magnitud | Valor |
|---|---|
| Entradas declaradas en `ISABELLA_SKILLS` | 41 |
| Ids realmente registrables | 33 (6 canónicas + 5 fundacionales + 22 evolucionadas) |
| Invocables (llevan `skillNumber`) | 25 |
| Invocables con handler enlazado | 22 + 3 alias = 25 |
| Afirmaciones de ejecución sin soporte | 0 |
| Descripciones de subsistema sin promesa de ejecución | 16 |

La regla no es un texto: una entrada con `skillNumber` afirma una habilidad invocable y por eso exige handler enlazado; una entrada sin número declara la madurez de un subsistema (CROWN, ARGUS, memoria territorial, síntesis de voz, la familia `monetization/*`) y no promete ejecución. `GET /api/v1/skills` expone por cada habilidad `invocable`, `handlerBound`, `executableId`, `aliasOf` y `claimSupported`, además del resumen agregado, para que el cliente no tenga que adivinar qué hay detrás de un `status: verified`. `test/skills/catalog-coherence.test.ts` falla si aparece una afirmación sin handler.

Ejecución real: `POST /api/v1/hypercore/skills/execute` (`src/routes/hypercore.ts:196`) pasa por `authorizeApiToken`, por su propia ventana de rate limit y por el `SkillRegistry`, que sólo corre una skill cuyo descriptor está enlazado. Las 22 evolucionadas se exponen en `tools/list` del puente MCP con su huella de procedencia.

## Dependencias: por qué el `pnpm audit` fallaba

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

## Estado real del CI

Las tres comprobaciones que dependen de GitHub Actions no han llegado a ejecutarse nunca en este repositorio por un bloqueo de facturación de la cuenta; la anotación del check-run lo dice literalmente:

```text
The job was not started because your account is locked due to a billing issue.
```

Los jobs figuran con ~2 s, `steps: []` y `runner_name` vacío, y su log responde 404 `BlobNotFound`. Ningún cambio de código puede volver verdes esas comprobaciones mientras el bloqueo exista; se reproducen localmente, paso por paso, las que sí se pueden ejecutar:

| Paso del workflow | Resultado local |
|---|---|
| `pnpm run lint` (`--max-warnings=0`) | 0 errores, 0 avisos |
| `pnpm run format:check` | `All matched files use Prettier code style!` (exit 0) |
| `pnpm run typecheck` | exit 0 con cero errores, medido sobre este árbol con el `node_modules` instalado |
| `pnpm run check:env` / `check:sops` | exit 0 |
| `node scripts/generate-status.mjs --check` | exit 0 |
| `pnpm run security:suite` | 14 passed, 0 failed, 0 not_applicable |
| `pnpm audit --prod --audit-level=moderate` | 0 vulnerabilidades conocidas |
| 8 suites nuevas de esta cosecha (`deploy-gate`, `sbom-generator`, `workflow-contract`, `catalog-coherence`, `evolved-bridge`, `skill-evidence-guard`, `skill-provenance`, `skill-provenance-fs`) | 91 pruebas añadidas, las 91 en verde: ningún archivo nuevo aparece en la lista de fallos |
| Suite completa `vitest run` | 2 552 de 2 690 en verde. Los 138 fallos son de esta máquina, no del repo: 123 son `Digest method not supported` (`node:crypto` de este runtime no ofrece `sha3-512` y `src/bookpi/crypto.ts` sí lo exige), 1 es `Cannot find module 'tslib'` del `node_modules` obsoleto y 2 son el `testTimeout` de 30 s en `hardening-guards`, que lanza `node scripts/*.mjs` como proceso hijo; esos dos scripts, ejecutados sueltos, dan exit 0. La base `d9586ce`, con el mismo `node_modules`, marca 136 fallos en los mismos 35 archivos: el conjunto en rojo no cambia. |
| IGE-Ω `cargo fmt`/`clippy`/`test`/`build` | no verificable aquí: no hay `cargo` ni `rustc` instalados |

El escaneo Trivy del mismo job (`severity: CRITICAL,HIGH`) queda cubierto de forma indirecta: el único `high` del grafo de producción era `@hono/node-server` dentro de la cadena de Prisma, ya eliminada.

## Avance

Avance global de implementación: no publicado como porcentaje único. Mientras no exista un denominador de requisitos ponderados y reproducible, una cifra agregada sería especulación y no se presenta como hecho.

Lo que sí es verificable en este SHA: lint, typecheck y formato en verde (exit 0 los tres, medidos en esta máquina), 336 rutas congeladas, 75 operaciones OpenAPI sin fantasmas, la compuerta de coherencia del catálogo con 0 afirmaciones sin soporte, `security:suite` 14/14, `pnpm audit --prod` limpio y superficie TAMV montada en `src/server.ts` con autorización, rate limit, ledger y blackout. Estado documentado y limitaciones: [`docs/ESTADO-REAL-ACTUAL.md`](docs/ESTADO-REAL-ACTUAL.md).

## Despliegue en Vercel

Topología desplegada el 2026-10-31:

- El proyecto de Vercel está configurado como **Other** (`framework: null`), no como preset `Express`. El preset `Express` detectaba `src/server.ts` como entrypoint y lo compilaba con `tsc` dentro de la función (`/var/task/src/server.js`); Node ESM no resuelve los imports sin extensión que emite `tsc`, así que `/` fallaba con `ERR_MODULE_NOT_FOUND` mientras otras rutas respondían.
- La única función es `api/index.js`, que importa el bundle `dist/server.js` producido por esbuild en `pnpm build:dist`.
- `vercel.json` declara `outputDirectory: "public"` (solo contiene `robots.txt`) porque Vercel exige un directorio de salida estático aunque `rewrites` mande todo a `/api`.
- `includeFiles` se limita a `dist/**`, `src/ui/**` y `src/assets/video/**`: exactamente lo que el runtime lee del disco. Ya no incluye todo `src/**`, que hacía que Vercel compilara TypeScript fuente dentro de la función.
- El entrypoint raíz `server.js` se eliminó para que no exista un segundo candidato ambiguo.

Evidencia observada en el deployment `dpl_C5xBWTQ2z2Zay969hoP6YrJp2Fhq`: `GET /` → 200 `text/html` (54 447 bytes), `GET /health` → 200, y `/ui/app.js`, `/styles/cinematic.css`, `/api/v1/nexus` y `/api/v1/nexus/health` → 200. Un 200 demuestra que el artefacto arranca y sirve; **no** demuestra autoridad, ni producción certificada, ni que los gates de abajo estén cerrados.

## Gates pendientes para liberar

Mientras estos gates no estén cerrados sobre el SHA candidato, el sistema **no** se declara en producción:

1. CI completo (typecheck, lint, format, pruebas, build, smokes) conservando logs válidos sobre el SHA.
2. Persistencia durable verificada: secretos del entorno, migraciones aplicadas, adaptadores Postgres de API-keys y federación, durabilidad y recuperación de BookPI.
3. Conversación generativa E2E con proveedor autorizado, incluyendo timeout, error y fallback comprobados.
4. E2E de navegador en desktop y móvil: navegación, conversación, accesibilidad y errores.
5. Despliegue, monitorización, backup/restore y rollback reales en el entorno objetivo. El incidente concreto `500 FUNCTION_INVOCATION_FAILED` en `/` fue reproducido, diagnosticado y corregido (ver «Despliegue en Vercel»); los demás puntos de este gate siguen abiertos.
6. Revisión humana nominal de todo artefacto marcado `engine-generated`.

## Propiedad

Copyright (c) 2026 **TAMV ONLINE ENTERPRISE** — **Edwin Oswaldo Castillo Trejo (Anubis Villaseñor)**. El TAMV Kaos Audio System, el canon Génesis Ω∞, la identidad Isabella Villaseñor y el branding TAMV ONLINE son creación y propiedad de su autor y no pueden utilizarse sin su consentimiento. Ver [`NOTICE`](NOTICE.md).

### Licencia

Este repositorio **no** está bajo una licencia de código abierto. Se publica bajo el aviso
propietario de [`LICENSE`](LICENSE): todos los derechos reservados, y ningún uso —incluidas
la copia, la redistribución, el despliegue como servicio y el aprovechamiento del código o
de su documentación para entrenar modelos de IA— sin consentimiento previo, expreso y por
escrito del titular. Las versiones anteriores circularon con un texto MIT; la sustitución es
prospectiva y su alcance está declarado en el §6 de `LICENSE`. Cada dependencia y cada
activo de terceros conservan la licencia que les dio su propio titular (§4).
