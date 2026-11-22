# Isabella Villaseñor AI — Génesis Ω∞ · Terminus V6 · TAMV ONLINE NETWORK

Isabella es un **Runtime Web Operativo y Sistema Federado de Inteligencia Artificial Gobernada (FGAIS)** construido, propiedad y creado por **Edwin Oswaldo Castillo Trejo (Anubis Villaseñor)** bajo la marca **TAMV ONLINE ENTERPRISE**. No es un chatbot: es un runtime con gobernanza determinista, memoria jerárquica, un motor de inferencia propio que **orquesta** LLM externos (no es un modelo fundacional entrenado por TAMV), RAG soberano, herramientas allowlisted, habilidades ejecutables, auditoría criptográfica y un sistema nativo de análisis audio-espectral en tiempo real: el **TAMV Kaos Audio System**.

> **Estado real al 22 de noviembre de 2026:** repositorio de ingeniería en fase de hardening, con pruebas automatizadas y subsistemas operativos verificables, pero **no certificado para producción**. La última ejecución integral registrada pasó la suite de pruebas y los controles de seguridad/SBOM/assurance, pero falló en Prettier (seis archivos preexistentes) y Clippy (scheduler); se ha preparado una corrección de Clippy en la rama de trabajo y todavía requiere una nueva ejecución de CI. La vista previa de Vercel está pendiente. Consulta [el informe de estado y bloqueadores](docs/status/PROJECT-REALITY-2026-11-22.md).
>
> No se declara conciencia, autonomía jurídica, autoridad propia ni entrenamiento de un modelo fundacional propio. **La implementación, las pruebas, el despliegue y la operación real son estados distintos.**
>
> Propiedad y uso: ver [`LICENSE`](LICENSE) y [`NOTICE.md`](NOTICE.md). La licencia publicada es **propietaria, con todos los derechos reservados**.

## Contrato de evidencia

```text
SPECIFIED ≠ IMPLEMENTED ≠ TESTED ≠ PRODUCTION
CAPABILITY ≠ AUTHORITY ≠ EXECUTION ≠ EVIDENCE
```

Ningún documento, tabla o respuesta de API puede elevar una categoría a otra. El inventario de rutas (`docs/api/route-inventory.json`), el canon Ω∞ (`src/platform/omega-canon.ts`) y las auditorías de `src/infinity/` declaran la madurez real de cada capacidad, y hay pruebas que fallan si una cifra inventada reaparece.

## Superficie HTTP (inventario amplio; conteo canónico pendiente de reconciliación)

El README y los artefactos de inventario han publicado conteos distintos (347 y 339). Hasta regenerar y verificar el inventario contra el registro real del servidor, esos números no se consideran una cifra canónica.

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

## Isabella Domain Runtime (IDR) — prototipo de router semántico

TERMINUS incluye un prototipo de **planificación semántica de capacidades**, expuesto en:

- `GET /api/v1/idr/status` — versión, tamaño del registro y modo del router.
- `POST /api/v1/idr/resolve` — resuelve una intención en un plan mínimo de capacidades permitidas. Cuerpo: `{"intent":"analizar crecimiento de creadores"}`.

Implementación: `src/domain-runtime/semantic-router.ts`; adaptadores: `src/domain-runtime/embedding-providers.ts`; catálogo y rutas: `src/routes/domain-runtime.ts`; contrato: `schemas/idr-semantic-route.schema.json`; pruebas: `test/domain-runtime-semantic-router.test.ts`, `test/domain-runtime-embedding-providers.test.ts` y `test/domain-runtime-routes.test.ts`; especificación: `docs/idr/SEMANTIC-ROUTER.md`.

El router combina coincidencia léxica determinista con embeddings opcionales, resuelve dependencias del grafo y aplica límites de riesgo/dominio/PII/retención/costo. El cableado de embeddings admite `none` (predeterminado, sin egreso de datos), `ollama` (local), `tei` (Text Embeddings Inference autoalojado) y `huggingface` (servicio alojado, token requerido y costo/cuota no garantizados). El proveedor remoto nunca se selecciona implícitamente; fallos o vectores inválidos degradan a ranking léxico sin relajar la política. Configuración: `.env.example`.

**Límite de seguridad:** este módulo planea; no monta dominios, invoca capacidades, emite mandatos, prueba firmas, genera pruebas ZK, mueve fondos ni acredita producción. La política del endpoint es del servidor y no se puede rebajar desde el cuerpo HTTP. Los estados `production: false` y `executionPerformed: false` son intencionales.

**Evidencia CI:** la ejecución IDR 44887228794 pasó los contratos IDR, ESLint específico y pnpm typecheck en la revisión que incorporó el hardening de proveedores. La suite integral 44887228762 pasó 401 archivos / 2.872 pruebas, Repository Assurance, Security Scan y SBOM; falló el chequeo global de formato en seis archivos ajenos al bloque IDR y Clippy en ige-omega/crates/neurokernel/src/scheduler.rs. La rama contiene una corrección posterior del scheduler, pero esta necesita volver a pasar CI. La evidencia corresponde a los SHA y ejecuciones documentados, no constituye certificación de producción. El hardening incluye deduplicación de peticiones concurrentes por texto, límites de concurrencia, respuestas de proveedor limitadas a 128 KiB, rechazo de vectores anidados malformados, validación estricta del grafo antes de cualquier egreso a proveedores, validación de URLs base y fallback léxico cuando los vectores tienen dimensiones incompatibles.

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

## Estado de verificación y preparación operativa (22 de noviembre de 2026)

El instrumento único es scripts/production-progress.mjs, que calcula el avance a partir de cuatro ejes con peso declarado y evidencia en docs/status/production-progress-evidence.json. La cifra que actualmente emite el instrumento es AVANCE_REAL_GLOBAL_PRODUCCION_DESPLIEGUE=19.8%. Esta es una métrica de avance ponderado, no aptitud de producción. La evidencia versionada data del 4 de noviembre y contiene health_readiness=failed; por ello la cifra no demuestra readiness ni despliegue. No se publica el 62,6 % histórico, porque contradice el instrumento actual. La evidencia debe regenerarse y pasar --check después de la validación integral del árbol actual.

### Evidencia de CI disponible

- Suite integral anterior: **401 archivos de prueba y 2.872 pruebas aprobadas** en la ejecución 44887228762.
- IDR: ejecución 45063437589 aprobada; contratos, lint IDR y typecheck pasaron en una revisión que también ejecutó el formateo de los seis archivos.
- Repository Assurance: ejecución 45063437479 aprobada para la revisión previa al último grupo de correcciones.
- Security Scan y SBOM: aprobados en ejecuciones recientes; deben confirmarse de nuevo en el mismo SHA final.
- Última CI integral observada para SHA 1282e965d106ab93d24192c752a89d18a2ca96d1: **400/401 archivos y 2.871/2.872 pruebas pasaron**; el único fallo fue una aserción de consistencia del README que exigía el porcentaje instrumental. El README ya se corrigió para volver a reflejar el 19,8 % que emite el instrumento.
- En ese SHA, Rust fmt pasó tras corregir el orden de imports. Clippy detectó tres préstamos innecesarios en bindings SQL; se corrigieron en memoria y BookPI. Hace falta una nueva CI sobre el HEAD actual para confirmar que estos cambios cierran los bloqueos.
- Vercel: el estado de preview seguía pendiente en la última consulta. No se afirma que haya despliegue nuevo, producción activa o dominio personalizado verificado.

### Bloqueadores de producción registrados

- PF-STRIPE-WEBHOOK-MISSING y PF-STRIPE-TEST-KEY: configuración de Stripe pendiente.
- El dominio isabella-ai.visitarealdelmonte.online no está confirmado como resuelto y asociado al equipo de Vercel.
- Migraciones SQL de permisos no portables sin ajustes entre Supabase y Neon.
- OTEL_EXPORTER_OTLP_ENDPOINT ausente; observabilidad distribuida incompleta.
- Backup/restore, RLS bajo el contexto de servicio, pruebas de concurrencia y rollback no demostrados mediante evidencia de producción.
- Cuatro alertas moderadas de Dependabot en el informe consultado; revisar su estado actual antes de cerrar este punto.
- Ledger BookPI legacy declarado VOLATILE_IN_MEMORY; la documentación del repositorio indica que /api/v1/readyz puede responder 503 hasta completar su refactor asíncrono.
- La operación integral con credenciales reales, persistencia durable, recuperación de fallos y configuración de dominios no está acreditada.

### Interpretación

Isabella es hoy un **runtime de software con gobernanza, APIs, adaptadores de inferencia y capacidades deterministas**, no un modelo fundacional propio ni una plataforma cuya totalidad de módulos esté demostrada en producción. Parte de las capacidades son funcionales localmente o en pruebas; otras son evaluadores, simuladores, planes o contratos. El router IDR, en particular, **selecciona y planifica capacidades, pero no las ejecuta**.

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

*Estado documental actualizado: 22 de noviembre de 2026. Revisión humana, validación de CI actual y preparación de producción siguen pendientes.*