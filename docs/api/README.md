# Inventario de rutas de API — Isabella Genesis V6

> Archivo **generado automáticamente** por `scripts/route-inventory.mjs`.
> `state: auto_generated` — no editar a mano; requiere revisión humana para ser
> evidencia (*CAPABILITY ≠ AUTHORITY ≠ EVIDENCE*, AGENTS.md).

- **Generado:** 2026-10-15T17:43:52.476Z
- **Fuente:** `src/server.ts` (parseo estático, sin ejecutar el servidor)
- **Rutas totales:** 97 · **Sensibles:** 62 · **Con contrato verificado:** 5
- **Contratos de tipo considerados:** `InferenceCapability`, `ModelDescriptor`, `GenerationRequest`, `GenerationResult`, `InferenceAdapter`, `EmbeddingAdapter`, `InferenceRouter`

## Tabla de rutas

| Método | Ruta | Handler | Sensible | Auth | Rate-limit | Validación | Verificado |
|---|---|---|---|---|---|---|---|
| `GET` | `/` | `inline@src/server.ts:130` | no | no | no | no | no |
| `GET` | `/styles/cinematic.css` | `inline@src/server.ts:140` | no | no | no | no | no |
| `GET` | `/ui/app.js` | `inline@src/server.ts:150` | no | no | no | no | no |
| `GET` | `/assets/audio/IntroIsabella.mp3` | `inline@src/server.ts:159` | no | no | no | no | no |
| `GET` | `/assets/video/IsabellaVideoIntro.mp4` | `inline@src/server.ts:165` | no | sí | sí | no | no |
| `GET` | `/health` | `inline@src/server.ts:634` | no | no | no | no | no |
| `GET` | `/api/v1/health` | `inline@src/server.ts:644` | no | no | no | no | sí |
| `GET` | `/api/v1/healthz` | `inline@src/server.ts:658` | no | no | no | no | no |
| `GET` | `/api/v1/status` | `inline@src/server.ts:672` | no | no | no | no | sí |
| `GET` | `/api/v1/memory` | `inline@src/server.ts:718` | no | sí | no | sí | sí |
| `POST` | `/api/v1/memory/ingest` | `inline@src/server.ts:732` | sí | no | sí | sí | no |
| `GET` | `/api/v1/memory/proposals` | `inline@src/server.ts:758` | no | sí | no | no | no |
| `POST` | `/api/v1/memory/proposals/:proposalId/resolve` | `inline@src/server.ts:763` | sí | sí | no | sí | no |
| `GET` | `/api/v1/bookpi/events` | `inline@src/server.ts:784` | no | no | sí | no | no |
| `GET` | `/api/v1/bookpi/events/admin` | `inline@src/server.ts:805` | sí | sí | no | no | no |
| `POST` | `/api/v1/tools/execute` | `inline@src/server.ts:811` | sí | no | sí | sí | no |
| `GET` | `/api/v1/cognition/native-runtime` | `inline@src/server.ts:863` | sí | no | no | no | no |
| `POST` | `/api/v1/cognition/route` | `inline@src/server.ts:874` | sí | no | sí | sí | sí |
| `GET` | `/api/v1/cognition/multimodal` | `inline@src/server.ts:1043` | sí | no | no | no | no |
| `POST` | `/api/v1/cognition/vision` | `inline@src/server.ts:1057` | sí | no | sí | sí | no |
| `POST` | `/api/v1/cognition/image` | `inline@src/server.ts:1112` | sí | no | sí | sí | no |
| `POST` | `/api/v1/cognition/speech` | `inline@src/server.ts:1165` | sí | no | sí | sí | no |
| `POST` | `/api/v1/cognition/transcribe` | `inline@src/server.ts:1214` | sí | no | sí | sí | no |
| `POST` | `/api/v1/cognitive/request` | `inline@src/server.ts:1252` | sí | no | sí | sí | no |
| `POST` | `/api/v1/isabella/mediate` | `inline@src/server.ts:1375` | sí | sí | sí | sí | sí |
| `POST` | `/api/v1/isabella/entropy` | `inline@src/server.ts:1442` | sí | no | sí | sí | no |
| `GET` | `/api/v1/isabella/status` | `inline@src/server.ts:1459` | no | no | no | no | no |
| `GET` | `/api/v1/hsf/status` | `inline@src/server.ts:1469` | no | no | no | no | no |
| `POST` | `/api/v1/hsf/invoke` | `inline@src/server.ts:1482` | sí | sí | sí | sí | no |
| `GET` | `/api/v1/quantum/pennylane/status` | `inline@src/server.ts:1546` | no | no | no | no | no |
| `POST` | `/api/v1/quantum/pennylane/execute` | `inline@src/server.ts:1558` | sí | sí | sí | sí | no |
| `POST` | `/api/v1/triple-blockade/scan` | `inline@src/server.ts:1611` | sí | no | sí | no | no |
| `POST` | `/api/v1/notebook/generate` | `inline@src/server.ts:1645` | sí | no | sí | sí | no |
| `POST` | `/api/v1/audio-overview/generate` | `inline@src/server.ts:1715` | sí | no | sí | sí | no |
| `GET` | `/api/v1/territory/rdm` | `inline@src/server.ts:1763` | no | no | no | no | no |
| `POST` | `/api/v1/sanitization/scan` | `inline@src/server.ts:1784` | sí | no | sí | sí | no |
| `POST` | `/api/v1/knowledge/admit` | `inline@src/server.ts:1807` | sí | sí | sí | sí | no |
| `POST` | `/api/v1/governance/git` | `inline@src/server.ts:1902` | sí | no | sí | sí | no |
| `POST` | `/api/v1/governance/quality-gates` | `inline@src/server.ts:1913` | sí | no | sí | sí | no |
| `POST` | `/api/v1/governance/deployment` | `inline@src/server.ts:1932` | sí | no | sí | sí | no |
| `POST` | `/api/v1/governance/verify-agent-app` | `inline@src/server.ts:1952` | sí | no | sí | sí | no |
| `POST` | `/api/v1/governance/lifecycle-plan` | `inline@src/server.ts:1972` | sí | no | sí | sí | no |
| `POST` | `/api/v1/diff/observe` | `inline@src/server.ts:1983` | sí | no | sí | sí | no |
| `POST` | `/api/v1/sanitization/harden` | `inline@src/server.ts:2007` | sí | no | no | sí | no |
| `POST` | `/api/v1/security/triangulate` | `inline@src/server.ts:2022` | sí | no | no | sí | no |
| `POST` | `/api/v1/ops/readiness` | `inline@src/server.ts:2085` | sí | no | no | sí | no |
| `GET` | `/api/v1/readyz` | `inline@src/server.ts:2096` | no | no | no | no | no |
| `GET` | `/api/v1/ops/snapshot` | `inline@src/server.ts:2108` | no | no | no | no | no |
| `GET` | `/api/v1/ops/latency` | `inline@src/server.ts:2118` | no | sí | no | no | no |
| `POST` | `/api/v1/isa/pipeline` | `inline@src/server.ts:2130` | sí | no | no | sí | no |
| `POST` | `/api/v1/isa/act` | `inline@src/server.ts:2140` | sí | no | no | sí | no |
| `POST` | `/api/v1/litle/attest` | `inline@src/server.ts:2169` | sí | sí | sí | sí | no |
| `POST` | `/api/v1/litle/verify` | `inline@src/server.ts:2219` | sí | no | sí | sí | no |
| `POST` | `/api/v1/connectors/ingest` | `inline@src/server.ts:2307` | sí | no | no | sí | no |
| `GET` | `/api/v1/metrics` | `inline@src/server.ts:2391` | no | no | no | no | no |
| `POST` | `/api/v1/memory/verified` | `inline@src/server.ts:2399` | sí | sí | no | sí | no |
| `GET` | `/api/v1/memory/verified` | `inline@src/server.ts:2419` | no | sí | no | sí | no |
| `GET` | `/api/v1/osiris/status` | `inline@src/server.ts:2433` | no | sí | no | no | no |
| `POST` | `/api/v1/osiris/inspect` | `inline@src/server.ts:2438` | sí | sí | no | sí | no |
| `GET` | `/api/v1/billing/prices` | `inline@src/server.ts:2503` | no | no | no | no | no |
| `POST` | `/api/v1/billing/checkout` | `inline@src/server.ts:2507` | sí | sí | no | sí | no |
| `POST` | `/api/v1/billing/portal` | `inline@src/server.ts:2544` | sí | sí | no | sí | no |
| `POST` | `/api/v1/billing/stripe/webhook` | `inline@src/server.ts:2566` | sí | no | no | sí | no |
| `GET` | `/api/v1/billing/plans` | `inline@src/server.ts:2611` | no | no | no | no | no |
| `GET` | `/api/v1/billing/entitlements` | `inline@src/server.ts:2623` | no | no | no | sí | no |
| `GET` | `/api/v1/billing/subscription` | `inline@src/server.ts:2633` | no | sí | no | sí | no |
| `POST` | `/api/v1/billing/subscribe` | `inline@src/server.ts:2645` | sí | sí | no | sí | no |
| `POST` | `/api/v1/billing/cancel` | `inline@src/server.ts:2687` | sí | sí | no | sí | no |
| `GET` | `/api/v1/billing/usage` | `inline@src/server.ts:2713` | no | sí | no | sí | no |
| `POST` | `/api/v1/commerce/offers` | `inline@src/server.ts:2731` | sí | sí | no | sí | no |
| `GET` | `/api/v1/gameover/constitution` | `inline@src/server.ts:2783` | no | sí | no | no | no |
| `GET` | `/api/v1/gameover/passports` | `inline@src/server.ts:2788` | no | sí | no | no | no |
| `POST` | `/api/v1/gameover/passports` | `inline@src/server.ts:2799` | sí | sí | no | sí | no |
| `POST` | `/api/v1/gameover/passports/revoke` | `inline@src/server.ts:2830` | sí | sí | no | sí | no |
| `POST` | `/api/v1/gameover/govern` | `inline@src/server.ts:2848` | sí | sí | no | sí | no |
| `GET` | `/api/v1/reina/status` | `inline@src/server.ts:3006` | no | no | sí | no | no |
| `POST` | `/api/v1/reina/adjudicate` | `inline@src/server.ts:3013` | sí | sí | no | sí | no |
| `GET` | `/api/v1/reina/log/proof/:index` | `inline@src/server.ts:3041` | no | sí | no | sí | no |
| `POST` | `/api/v1/security/document-seal` | `inline@src/routes/document-seal.ts:57` | sí | no | sí | sí | no |
| `POST` | `/api/v1/security/document-seal/verify` | `inline@src/routes/document-seal.ts:91` | sí | no | sí | sí | no |
| `GET` | `/api/v1/security/document-seal` | `inline@src/routes/document-seal.ts:120` | sí | no | sí | no | no |
| `POST` | `/api/v1/governance/order-permissions` | `inline@src/routes/governance-permissions.ts:32` | sí | no | sí | sí | no |
| `POST` | `/api/v1/governance/order-authorize` | `inline@src/routes/governance-permissions.ts:47` | sí | no | sí | sí | no |
| `GET` | `/api/v1/hypercore/modes` | `inline@src/routes/hypercore.ts:59` | no | no | no | no | no |
| `POST` | `/api/v1/hypercore/run` | `inline@src/routes/hypercore.ts:70` | sí | sí | no | sí | no |
| `POST` | `/api/v1/hypercore/predict` | `inline@src/routes/hypercore.ts:101` | sí | sí | no | sí | no |
| `GET` | `/api/v1/hypercore/skills` | `inline@src/routes/hypercore.ts:146` | no | no | no | no | no |
| `POST` | `/api/v1/hypercore/skills/execute` | `inline@src/routes/hypercore.ts:163` | sí | sí | sí | sí | no |
| `POST` | `/api/v1/mcp` | `inline@src/routes/hypercore.ts:203` | sí | sí | sí | sí | no |
| `GET` | `/v1/models` | `inline@src/routes/openai.ts:107` | no | no | no | no | no |
| `POST` | `/v1/chat/completions` | `inline@src/routes/openai.ts:121` | sí | no | no | sí | no |
| `POST` | `/v1/completions` | `inline@src/routes/openai.ts:186` | sí | no | no | sí | no |
| `POST` | `/api/v1/pipeline/execute` | `inline@src/routes/pipeline.ts:91` | sí | no | sí | sí | no |
| `POST` | `/api/v1/intelligence/triage` | `inline@src/routes/traffic-light.ts:28` | sí | no | sí | sí | no |
| `POST` | `/api/v1/intelligence/turbo-plan` | `inline@src/routes/turbo-planner.ts:27` | sí | no | sí | sí | no |
| `POST` | `/api/v1/yun/events` | `inline@src/routes/yun-events.ts:29` | sí | no | no | sí | no |
| `GET` | `/api/v1/yun/events` | `inline@src/routes/yun-events.ts:53` | no | no | sí | no | no |

> Las columnas **Auth**, **Rate-limit** y **Validación** son heurísticas de análisis
> estático sobre el cuerpo del handler (presencia de `authorizeApiToken` /
> `verifyBearerToken` / `assertBalancedAuthority`, `enforceRateLimit` y guardas de
> entrada). No son una prueba en ejecución.

## Cómo regenerar

```bash
node scripts/route-inventory.mjs
```

El script reescribe por completo `docs/api/route-inventory.json` y este README.
No requiere dependencias ni red. Si `src/server.ts` no tiene rutas parseables,
reporta la verdad: lista vacía + aviso en consola.

## Semántica de `verified`

`verified: true` **no** significa "la ruta funciona". Significa que existe al menos
una referencia externa al contrato de la ruta:

1. una **prueba** que cita la ruta (`test:...`), o
2. la **documentación** canónica (`docs:docs/spec/BLUEPRINT-API-v4.2.0.md`), o
3. un **contrato de tipo** cuyo nombre comparte el dominio de la ruta
   (`types:src/inference/types.ts:...`).

Ser simplemente un handler de Express tipado por inferencia **no** cuenta como
verificado. Hoy la mayoría de rutas queda con `verified: false` (92 de 97);
eso es el estado real del repositorio, no un defecto del script.

## UI/API truthfulness (ISA-451..458)

Este inventario es la **base de veracidad** para cualquier superficie de UI o
catálogo de API:

- **ISA-451 (MoE UI truth):** si el catálogo etiqueta una ruta como "DeepSeek-V3"
  o "MoE", debe apuntar a una fila con `verified: true` y con un contrato
  respaldado; si no, la UI debe rotularla como heurística/simulación.
- **ISA-452/453 (CoT/Swarm UI truth):** las trazas de razonamiento y las
  estrategias de enjambre deben declarse simuladas salvo que mapeen a una ruta
  verificada de este inventario.
- **ISA-454 (RAG UI truth):** la presentación de RAG debe ligarse a la ruta de
  memoria/retrieval realmente inventariada, no a datos de ejemplo.
- **ISA-455..458 (simulador / tenant / actor):** toda acción privilegiada del
  simulador debe corresponder a una ruta sensible con `Auth: sí`; la UI nunca
  debe enviar `tenantId`/`actorId` como autoridad — el servidor debe derivarlos.
  Las rutas sensibles **sin** auth/rate-limit/validación son deuda explícita
  visible en la tabla.
- **ISA-475 (claim-to-code map):** este archivo es el mapa "claim → ruta
  ejecutable" que exige el checklist.

## Evidencia y `.gitignore`

Los artefactos en `evidence/*.json` (p. ej. `production-evidence.json`,
`security-suite.json`) **no** se versionan: la línea `evidence/*.json` se añade al
`.gitignore` del repositorio por el ensamblador. La evidencia misma se adjunta
como artefacto de CI ligado al SHA exacto (ISA-325 / ISA-336 / ISA-337).
