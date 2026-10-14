# Inventario de rutas de API — Isabella Genesis V6

> Archivo **generado automáticamente** por `scripts/route-inventory.mjs`.
> `state: auto_generated` — no editar a mano; requiere revisión humana para ser
> evidencia (*CAPABILITY ≠ AUTHORITY ≠ EVIDENCE*, AGENTS.md).

- **Generado:** 2026-10-14T08:43:27.484Z
- **Fuente:** `src/server.ts` (parseo estático, sin ejecutar el servidor)
- **Rutas totales:** 85 · **Sensibles:** 51 · **Con contrato verificado:** 5
- **Contratos de tipo considerados:** `InferenceCapability`, `ModelDescriptor`, `GenerationRequest`, `GenerationResult`, `InferenceAdapter`, `EmbeddingAdapter`, `InferenceRouter`

## Tabla de rutas

| Método | Ruta | Handler | Sensible | Auth | Rate-limit | Validación | Verificado |
|---|---|---|---|---|---|---|---|
| `GET` | `/` | `inline@src/server.ts:128` | no | no | no | no | no |
| `GET` | `/styles/cinematic.css` | `inline@src/server.ts:138` | no | no | no | no | no |
| `GET` | `/ui/app.js` | `inline@src/server.ts:147` | no | no | no | no | no |
| `GET` | `/assets/audio/IntroIsabella.mp3` | `inline@src/server.ts:156` | no | no | no | no | no |
| `GET` | `/styles/crystal-clear.css` | `inline@src/server.ts:165` | no | sí | sí | no | no |
| `GET` | `/health` | `inline@src/server.ts:638` | no | no | no | no | no |
| `GET` | `/api/v1/health` | `inline@src/server.ts:648` | no | no | no | no | sí |
| `GET` | `/api/v1/healthz` | `inline@src/server.ts:662` | no | no | no | no | no |
| `GET` | `/api/v1/status` | `inline@src/server.ts:676` | no | no | no | no | sí |
| `GET` | `/api/v1/memory` | `inline@src/server.ts:722` | no | sí | no | sí | sí |
| `POST` | `/api/v1/memory/ingest` | `inline@src/server.ts:736` | sí | no | sí | sí | no |
| `GET` | `/api/v1/memory/proposals` | `inline@src/server.ts:762` | no | sí | no | no | no |
| `POST` | `/api/v1/memory/proposals/:proposalId/resolve` | `inline@src/server.ts:767` | sí | sí | no | sí | no |
| `GET` | `/api/v1/bookpi/events` | `inline@src/server.ts:788` | no | no | sí | no | no |
| `GET` | `/api/v1/bookpi/events/admin` | `inline@src/server.ts:809` | sí | sí | no | no | no |
| `POST` | `/api/v1/tools/execute` | `inline@src/server.ts:815` | sí | no | sí | sí | no |
| `POST` | `/api/v1/cognition/route` | `inline@src/server.ts:867` | sí | no | sí | sí | sí |
| `GET` | `/api/v1/cognition/multimodal` | `inline@src/server.ts:1000` | sí | no | no | no | no |
| `POST` | `/api/v1/cognition/vision` | `inline@src/server.ts:1014` | sí | no | sí | sí | no |
| `POST` | `/api/v1/cognition/image` | `inline@src/server.ts:1069` | sí | no | sí | sí | no |
| `POST` | `/api/v1/cognition/speech` | `inline@src/server.ts:1122` | sí | no | sí | sí | no |
| `POST` | `/api/v1/cognition/transcribe` | `inline@src/server.ts:1171` | sí | no | sí | sí | no |
| `POST` | `/api/v1/cognitive/request` | `inline@src/server.ts:1209` | sí | no | sí | sí | no |
| `POST` | `/api/v1/isabella/mediate` | `inline@src/server.ts:1332` | sí | sí | sí | sí | sí |
| `POST` | `/api/v1/isabella/entropy` | `inline@src/server.ts:1399` | sí | no | sí | sí | no |
| `GET` | `/api/v1/isabella/status` | `inline@src/server.ts:1416` | no | no | no | no | no |
| `GET` | `/api/v1/hsf/status` | `inline@src/server.ts:1426` | no | no | no | no | no |
| `POST` | `/api/v1/hsf/invoke` | `inline@src/server.ts:1439` | sí | sí | sí | sí | no |
| `GET` | `/api/v1/quantum/pennylane/status` | `inline@src/server.ts:1503` | no | no | no | no | no |
| `POST` | `/api/v1/quantum/pennylane/execute` | `inline@src/server.ts:1515` | sí | sí | sí | sí | no |
| `POST` | `/api/v1/triple-blockade/scan` | `inline@src/server.ts:1568` | sí | no | sí | no | no |
| `POST` | `/api/v1/notebook/generate` | `inline@src/server.ts:1602` | sí | no | sí | sí | no |
| `POST` | `/api/v1/audio-overview/generate` | `inline@src/server.ts:1672` | sí | no | sí | sí | no |
| `GET` | `/api/v1/territory/rdm` | `inline@src/server.ts:1720` | no | no | no | no | no |
| `POST` | `/api/v1/sanitization/scan` | `inline@src/server.ts:1741` | sí | no | sí | sí | no |
| `POST` | `/api/v1/knowledge/admit` | `inline@src/server.ts:1764` | sí | sí | sí | sí | no |
| `POST` | `/api/v1/governance/git` | `inline@src/server.ts:1859` | sí | no | sí | sí | no |
| `POST` | `/api/v1/governance/quality-gates` | `inline@src/server.ts:1870` | sí | no | sí | sí | no |
| `POST` | `/api/v1/governance/deployment` | `inline@src/server.ts:1889` | sí | no | sí | sí | no |
| `POST` | `/api/v1/governance/verify-agent-app` | `inline@src/server.ts:1909` | sí | no | sí | sí | no |
| `POST` | `/api/v1/governance/lifecycle-plan` | `inline@src/server.ts:1929` | sí | no | sí | sí | no |
| `POST` | `/api/v1/governance/order-permissions` | `inline@src/server.ts:1941` | sí | no | sí | sí | no |
| `POST` | `/api/v1/governance/order-authorize` | `inline@src/server.ts:1959` | sí | sí | sí | sí | no |
| `POST` | `/api/v1/diff/observe` | `inline@src/server.ts:1981` | sí | no | sí | sí | no |
| `POST` | `/api/v1/sanitization/harden` | `inline@src/server.ts:2005` | sí | no | no | sí | no |
| `POST` | `/api/v1/security/triangulate` | `inline@src/server.ts:2020` | sí | no | no | sí | no |
| `POST` | `/api/v1/ops/readiness` | `inline@src/server.ts:2083` | sí | no | no | sí | no |
| `GET` | `/api/v1/readyz` | `inline@src/server.ts:2094` | no | no | no | no | no |
| `GET` | `/api/v1/ops/snapshot` | `inline@src/server.ts:2106` | no | no | no | no | no |
| `GET` | `/api/v1/ops/latency` | `inline@src/server.ts:2116` | no | sí | no | no | no |
| `POST` | `/api/v1/isa/pipeline` | `inline@src/server.ts:2128` | sí | no | no | sí | no |
| `POST` | `/api/v1/isa/act` | `inline@src/server.ts:2138` | sí | no | no | sí | no |
| `GET` | `/` | `inline@src/server.ts:2168` | no | no | no | no | no |
| `POST` | `/api/v1/litle/attest` | `inline@src/server.ts:4529` | sí | sí | sí | sí | no |
| `POST` | `/api/v1/litle/verify` | `inline@src/server.ts:4579` | sí | no | sí | sí | no |
| `POST` | `/api/v1/connectors/ingest` | `inline@src/server.ts:4667` | sí | no | no | sí | no |
| `GET` | `/api/v1/metrics` | `inline@src/server.ts:4751` | no | no | no | no | no |
| `POST` | `/api/v1/memory/verified` | `inline@src/server.ts:4759` | sí | sí | no | sí | no |
| `GET` | `/api/v1/memory/verified` | `inline@src/server.ts:4779` | no | sí | no | sí | no |
| `GET` | `/api/v1/osiris/status` | `inline@src/server.ts:4793` | no | sí | no | no | no |
| `POST` | `/api/v1/osiris/inspect` | `inline@src/server.ts:4798` | sí | sí | no | sí | no |
| `GET` | `/api/v1/billing/plans` | `inline@src/server.ts:4858` | no | no | no | no | no |
| `GET` | `/api/v1/billing/entitlements` | `inline@src/server.ts:4870` | no | no | no | sí | no |
| `GET` | `/api/v1/billing/subscription` | `inline@src/server.ts:4880` | no | sí | no | sí | no |
| `POST` | `/api/v1/billing/subscribe` | `inline@src/server.ts:4892` | sí | sí | no | sí | no |
| `POST` | `/api/v1/billing/cancel` | `inline@src/server.ts:4934` | sí | sí | no | sí | no |
| `GET` | `/api/v1/billing/usage` | `inline@src/server.ts:4960` | no | sí | no | sí | no |
| `POST` | `/api/v1/commerce/offers` | `inline@src/server.ts:4978` | sí | sí | no | sí | no |
| `GET` | `/api/v1/gameover/constitution` | `inline@src/server.ts:5030` | no | sí | no | no | no |
| `GET` | `/api/v1/gameover/passports` | `inline@src/server.ts:5035` | no | sí | no | no | no |
| `POST` | `/api/v1/gameover/passports` | `inline@src/server.ts:5046` | sí | sí | no | sí | no |
| `POST` | `/api/v1/gameover/passports/revoke` | `inline@src/server.ts:5077` | sí | sí | no | sí | no |
| `POST` | `/api/v1/gameover/govern` | `inline@src/server.ts:5095` | sí | sí | no | sí | no |
| `GET` | `/api/v1/reina/status` | `inline@src/server.ts:5170` | no | no | sí | no | no |
| `POST` | `/api/v1/reina/adjudicate` | `inline@src/server.ts:5177` | sí | sí | no | sí | no |
| `GET` | `/api/v1/reina/log/proof/:index` | `inline@src/server.ts:5205` | no | sí | no | sí | no |
| `GET` | `/api/v1/hypercore/modes` | `inline@src/routes/hypercore.ts:58` | no | no | no | no | no |
| `POST` | `/api/v1/hypercore/run` | `inline@src/routes/hypercore.ts:68` | sí | sí | no | sí | no |
| `POST` | `/api/v1/hypercore/predict` | `inline@src/routes/hypercore.ts:99` | sí | sí | no | sí | no |
| `GET` | `/api/v1/hypercore/skills` | `inline@src/routes/hypercore.ts:144` | no | no | no | no | no |
| `POST` | `/api/v1/hypercore/skills/execute` | `inline@src/routes/hypercore.ts:161` | sí | sí | sí | sí | no |
| `POST` | `/api/v1/mcp` | `inline@src/routes/hypercore.ts:201` | sí | sí | sí | sí | no |
| `GET` | `/v1/models` | `inline@src/routes/openai.ts:107` | no | no | no | no | no |
| `POST` | `/v1/chat/completions` | `inline@src/routes/openai.ts:121` | sí | no | no | sí | no |
| `POST` | `/v1/completions` | `inline@src/routes/openai.ts:186` | sí | no | no | sí | no |

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
verificado. Hoy la mayoría de rutas queda con `verified: false` (80 de 85);
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
