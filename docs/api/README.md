# Inventario de rutas de API — Isabella Genesis V6

> Archivo **generado automáticamente** por `scripts/route-inventory.mjs`.
> `state: auto_generated` — no editar a mano; requiere revisión humana para ser
> evidencia (*CAPABILITY ≠ AUTHORITY ≠ EVIDENCE*, AGENTS.md).

- **Generado:** 2026-11-03T20:43:17.442Z
- **Fuente:** `src/server.ts` (parseo estático, sin ejecutar el servidor)
- **Rutas totales:** 336 · **Sensibles:** 205 · **Con contrato verificado:** 146
- **Contratos de tipo considerados:** `InferenceCapability`, `ModelDescriptor`, `GenerationRequest`, `GenerationResult`, `InferenceAdapter`, `EmbeddingAdapter`, `InferenceRouter`

## Tabla de rutas

| Método | Ruta | Handler | Sensible | Auth | Rate-limit | Validación | Verificado |
|---|---|---|---|---|---|---|---|
| `GET` | `/` | `inline@src/server.ts:493` | no | no | no | no | no |
| `GET` | `/styles/cinematic.css` | `inline@src/server.ts:505` | no | no | no | no | no |
| `GET` | `/styles/command-center.css` | `inline@src/server.ts:512` | no | no | no | no | no |
| `GET` | `/styles/nexus.css` | `inline@src/server.ts:519` | no | no | no | no | no |
| `GET` | `/ui/app.js` | `inline@src/server.ts:526` | no | no | no | no | no |
| `GET` | `/ui/chat-plus.js` | `inline@src/server.ts:533` | no | no | no | no | no |
| `GET` | `/ui/cognition-client.js` | `inline@src/server.ts:540` | sí | no | no | no | no |
| `GET` | `/ui/nexus.js` | `inline@src/server.ts:547` | no | no | no | no | no |
| `GET` | `/ui/universe-map.js` | `inline@src/server.ts:554` | no | no | no | no | no |
| `GET` | `/assets/video/IntroVideoIsabella.mp4` | `inline@src/server.ts:574` | no | no | no | no | no |
| `GET` | `/assets/video/IntroVideoIsabella-web.mp4` | `inline@src/server.ts:575` | no | no | no | no | no |
| `GET` | `/assets/video/IntroVideoIsabella-poster.jpg` | `inline@src/server.ts:579` | no | sí | sí | no | no |
| `GET` | `/api/v1/linguistics/stats` | `inline@src/server.ts:2045` | no | no | no | no | no |
| `GET` | `/api/v1/linguistics/search` | `inline@src/server.ts:2049` | no | no | sí | sí | no |
| `POST` | `/api/v1/linguistics/analyze` | `inline@src/server.ts:2057` | sí | no | sí | sí | no |
| `POST` | `/api/v1/linguistics/ingest` | `inline@src/server.ts:2066` | sí | sí | sí | sí | no |
| `GET` | `/health` | `inline@src/server.ts:2080` | no | no | no | no | no |
| `GET` | `/api/v1/health` | `inline@src/server.ts:2090` | no | no | no | no | sí |
| `GET` | `/api/v1/healthz` | `inline@src/server.ts:2104` | no | no | no | no | sí |
| `GET` | `/api/v1/status` | `inline@src/server.ts:2121` | no | no | no | no | sí |
| `GET` | `/api/v1/memory` | `inline@src/server.ts:2175` | no | sí | no | sí | sí |
| `POST` | `/api/v1/memory/ingest` | `inline@src/server.ts:2269` | sí | no | sí | sí | sí |
| `GET` | `/api/v1/memory/proposals` | `inline@src/server.ts:2301` | no | sí | no | no | sí |
| `POST` | `/api/v1/memory/proposals/:proposalId/resolve` | `inline@src/server.ts:2306` | sí | sí | no | sí | sí |
| `GET` | `/api/v1/bookpi/events` | `inline@src/server.ts:2334` | no | no | sí | no | no |
| `GET` | `/api/v1/bookpi/events/admin` | `inline@src/server.ts:2355` | sí | sí | no | no | sí |
| `POST` | `/api/v1/tools/execute` | `inline@src/server.ts:2361` | sí | sí | sí | sí | sí |
| `GET` | `/api/v1/cognition/native-runtime` | `inline@src/server.ts:2404` | sí | no | no | no | no |
| `POST` | `/api/v1/cognition/route` | `inline@src/server.ts:2437` | sí | sí | sí | sí | sí |
| `GET` | `/api/v1/hypercore/turbo/status` | `inline@src/server.ts:3066` | no | no | sí | no | no |
| `POST` | `/api/v1/cognition/stream` | `inline@src/server.ts:3095` | sí | no | sí | sí | no |
| `GET` | `/api/v1/cognition/multimodal` | `inline@src/server.ts:3386` | sí | no | no | no | no |
| `POST` | `/api/v1/cognition/vision` | `inline@src/server.ts:3400` | sí | sí | sí | sí | sí |
| `POST` | `/api/v1/cognition/image` | `inline@src/server.ts:3456` | sí | sí | sí | sí | no |
| `POST` | `/api/v1/cognition/speech` | `inline@src/server.ts:3509` | sí | sí | sí | sí | sí |
| `POST` | `/api/v1/cognition/transcribe` | `inline@src/server.ts:3562` | sí | sí | sí | sí | sí |
| `POST` | `/api/v1/cognitive/request` | `inline@src/server.ts:3605` | sí | sí | sí | sí | no |
| `POST` | `/api/v1/isabella/mediate` | `inline@src/server.ts:3796` | sí | no | sí | sí | sí |
| `POST` | `/api/v1/isabella/entropy` | `inline@src/server.ts:3853` | sí | no | sí | sí | no |
| `POST` | `/api/v1/isabella/rag/add` | `inline@src/server.ts:3882` | sí | sí | no | sí | no |
| `GET` | `/api/v1/isabella/rag/search` | `inline@src/server.ts:3895` | no | no | no | sí | no |
| `POST` | `/api/v1/domains/search` | `inline@src/server.ts:3901` | sí | no | no | sí | no |
| `POST` | `/api/v1/security/intent` | `inline@src/server.ts:3920` | sí | no | no | sí | no |
| `POST` | `/api/v1/security/prompt-guard` | `inline@src/server.ts:3926` | sí | no | no | sí | no |
| `POST` | `/api/v1/security/threat-intel` | `inline@src/server.ts:3932` | sí | no | no | sí | no |
| `GET` | `/api/v1/isabella/providers` | `inline@src/server.ts:3938` | no | no | no | no | no |
| `POST` | `/api/mcp` | `inline@src/server.ts:3948` | sí | sí | no | sí | no |
| `GET` | `/api/v1/i18n/locale` | `inline@src/server.ts:4048` | no | no | no | no | no |
| `POST` | `/api/isabella/chat` | `inline@src/server.ts:4058` | sí | no | sí | sí | no |
| `POST` | `/api/isabella/isa/reason` | `inline@src/server.ts:4088` | sí | no | no | sí | no |
| `POST` | `/api/isabella/crypto/sign` | `inline@src/server.ts:4105` | sí | sí | sí | sí | no |
| `POST` | `/api/isabella/crypto/verify` | `inline@src/server.ts:4123` | sí | no | no | sí | no |
| `POST` | `/api/v1/memory/store` | `inline@src/server.ts:4137` | sí | sí | no | sí | sí |
| `GET` | `/api/v1/memory/recall` | `inline@src/server.ts:4155` | no | sí | no | sí | sí |
| `GET` | `/api/v1/memory/snapshot` | `inline@src/server.ts:4163` | no | sí | no | sí | sí |
| `GET` | `/api/v1/isabella/full-status` | `inline@src/server.ts:4169` | no | no | no | no | no |
| `GET` | `/api/v1/isabella/eval` | `inline@src/server.ts:4182` | no | no | no | no | no |
| `POST` | `/api/v1/security/canonicalize` | `inline@src/server.ts:4206` | sí | no | no | sí | no |
| `POST` | `/api/v1/governance/review/submit` | `inline@src/server.ts:4217` | sí | sí | no | sí | no |
| `POST` | `/api/v1/governance/review/:id/approve` | `inline@src/server.ts:4229` | sí | sí | no | sí | no |
| `POST` | `/api/v1/governance/review/:id/reject` | `inline@src/server.ts:4240` | sí | sí | no | sí | no |
| `GET` | `/api/v1/governance/review` | `inline@src/server.ts:4251` | sí | sí | no | sí | no |
| `GET` | `/api/v1/isabella/status` | `inline@src/server.ts:4257` | no | no | no | no | no |
| `POST` | `/api/v1/isabella/foundational` | `inline@src/server.ts:4266` | sí | no | sí | sí | no |
| `GET` | `/api/v1/hsf/status` | `inline@src/server.ts:4292` | no | no | no | no | no |
| `POST` | `/api/v1/hsf/invoke` | `inline@src/server.ts:4311` | sí | sí | sí | sí | no |
| `GET` | `/api/v1/quantum/pennylane/status` | `inline@src/server.ts:4400` | no | no | no | no | no |
| `POST` | `/api/v1/quantum/pennylane/execute` | `inline@src/server.ts:4412` | sí | sí | sí | sí | no |
| `POST` | `/api/v1/triple-blockade/scan` | `inline@src/server.ts:4475` | sí | no | sí | no | no |
| `POST` | `/api/v1/notebook/generate` | `inline@src/server.ts:4514` | sí | no | sí | sí | no |
| `POST` | `/api/v1/audio-overview/generate` | `inline@src/server.ts:4585` | sí | no | sí | sí | no |
| `GET` | `/api/v1/territory/rdm` | `inline@src/server.ts:4636` | no | no | no | no | no |
| `POST` | `/api/v1/sanitization/scan` | `inline@src/server.ts:4681` | sí | no | sí | sí | no |
| `POST` | `/api/v1/knowledge/admit` | `inline@src/server.ts:4706` | sí | sí | sí | sí | no |
| `POST` | `/api/v1/governance/git` | `inline@src/server.ts:4845` | sí | no | sí | sí | no |
| `POST` | `/api/v1/governance/quality-gates` | `inline@src/server.ts:4856` | sí | no | sí | sí | no |
| `POST` | `/api/v1/governance/deployment` | `inline@src/server.ts:4877` | sí | no | sí | no | no |
| `POST` | `/api/v1/governance/verify-agent-app` | `inline@src/server.ts:4897` | sí | no | sí | sí | no |
| `POST` | `/api/v1/governance/lifecycle-plan` | `inline@src/server.ts:4930` | sí | no | sí | sí | no |
| `POST` | `/api/v1/diff/observe` | `inline@src/server.ts:4941` | sí | no | sí | sí | no |
| `POST` | `/api/v1/sanitization/harden` | `inline@src/server.ts:4974` | sí | no | no | sí | no |
| `POST` | `/api/v1/security/triangulate` | `inline@src/server.ts:4989` | sí | no | no | sí | no |
| `POST` | `/api/v1/ops/readiness` | `inline@src/server.ts:5100` | sí | no | sí | sí | no |
| `GET` | `/api/v1/readyz` | `inline@src/server.ts:5117` | no | no | no | no | sí |
| `GET` | `/api/v1/ops/snapshot` | `inline@src/server.ts:5129` | no | no | no | no | no |
| `GET` | `/api/v1/integrations/graph` | `inline@src/server.ts:5139` | no | sí | no | no | no |
| `GET` | `/api/v1/ops/latency` | `inline@src/server.ts:5326` | no | sí | no | no | no |
| `POST` | `/api/v1/isa/pipeline` | `inline@src/server.ts:5338` | sí | no | sí | no | sí |
| `POST` | `/api/v1/isa/act` | `inline@src/server.ts:5352` | sí | no | sí | sí | sí |
| `POST` | `/api/v1/litle/attest` | `inline@src/server.ts:5386` | sí | sí | sí | sí | no |
| `POST` | `/api/v1/litle/verify` | `inline@src/server.ts:5459` | sí | no | sí | sí | no |
| `POST` | `/api/v1/connectors/ingest` | `inline@src/server.ts:5557` | sí | no | no | sí | no |
| `GET` | `/api/v1/metrics` | `inline@src/server.ts:5658` | no | sí | no | no | no |
| `GET` | `/api/v1/runtime/capabilities` | `inline@src/server.ts:5670` | no | no | no | no | no |
| `POST` | `/api/v1/memory/verified` | `inline@src/server.ts:5701` | sí | sí | no | sí | sí |
| `GET` | `/api/v1/memory/verified` | `inline@src/server.ts:5728` | no | sí | no | sí | sí |
| `GET` | `/api/v1/osiris/status` | `inline@src/server.ts:5745` | no | sí | no | no | no |
| `POST` | `/api/v1/osiris/inspect` | `inline@src/server.ts:5750` | sí | sí | no | sí | no |
| `GET` | `/api/v1/billing/prices` | `inline@src/server.ts:5821` | no | no | no | no | no |
| `GET` | `/api/v1/billing/plans` | `inline@src/server.ts:5848` | no | no | no | no | no |
| `GET` | `/api/v1/billing/entitlements` | `inline@src/server.ts:5865` | no | no | no | sí | no |
| `GET` | `/api/v1/billing/subscription` | `inline@src/server.ts:5880` | no | sí | no | sí | no |
| `POST` | `/api/v1/billing/subscribe` | `inline@src/server.ts:5892` | sí | sí | no | sí | no |
| `POST` | `/api/v1/billing/cancel` | `inline@src/server.ts:5939` | sí | sí | no | sí | no |
| `GET` | `/api/v1/billing/usage` | `inline@src/server.ts:5968` | no | sí | no | sí | no |
| `POST` | `/api/v1/commerce/offers` | `inline@src/server.ts:5986` | sí | sí | no | sí | no |
| `GET` | `/api/v1/gameover/constitution` | `inline@src/server.ts:6039` | no | sí | no | no | no |
| `GET` | `/api/v1/gameover/passports` | `inline@src/server.ts:6044` | no | sí | no | no | no |
| `POST` | `/api/v1/gameover/passports` | `inline@src/server.ts:6056` | sí | sí | no | sí | no |
| `POST` | `/api/v1/gameover/passports/revoke` | `inline@src/server.ts:6096` | sí | sí | no | sí | no |
| `POST` | `/api/v1/gameover/govern` | `inline@src/server.ts:6114` | sí | sí | no | sí | no |
| `GET` | `/api/v1/gateway/activity` | `inline@src/server.ts:6282` | sí | sí | no | no | no |
| `GET` | `/api/v1/memory/stats` | `inline@src/server.ts:6681` | no | sí | no | no | sí |
| `POST` | `/api/v1/memory/query` | `inline@src/server.ts:6686` | sí | sí | no | sí | sí |
| `POST` | `/api/v1/security/authenticate` | `inline@src/server.ts:6697` | sí | sí | no | sí | sí |
| `GET` | `/api/v1/security/audit` | `inline@src/server.ts:6707` | sí | sí | no | no | no |
| `POST` | `/api/v1/governance/evaluate` | `inline@src/server.ts:6714` | sí | sí | no | sí | no |
| `GET` | `/api/v1/governance/audit` | `inline@src/server.ts:6724` | sí | sí | no | no | no |
| `POST` | `/api/v1/learning/train` | `inline@src/server.ts:6739` | sí | sí | no | sí | sí |
| `GET` | `/api/v1/observability/metrics` | `inline@src/server.ts:6776` | no | sí | no | no | no |
| `GET` | `/api/v1/observability/health` | `inline@src/server.ts:6782` | no | sí | no | no | no |
| `GET` | `/api/v1/observability/slos` | `inline@src/server.ts:6788` | no | sí | no | no | no |
| `GET` | `/api/v1/observability/alerts` | `inline@src/server.ts:6794` | no | sí | no | no | no |
| `GET` | `/api/v1/observability/dashboards` | `inline@src/server.ts:6806` | no | sí | no | no | no |
| `GET` | `/api/v1/federation/status` | `inline@src/server.ts:6816` | no | sí | no | no | no |
| `GET` | `/api/v1/federation/telemetry` | `inline@src/server.ts:6821` | no | sí | no | no | no |
| `POST` | `/api/v1/federation/cross` | `inline@src/server.ts:6826` | sí | sí | no | sí | sí |
| `GET` | `/api/v1/pipeline/metrics` | `inline@src/server.ts:6843` | sí | sí | no | no | no |
| `GET` | `/api/v1/pipeline/stats/hot` | `inline@src/server.ts:6848` | sí | sí | no | no | no |
| `GET` | `/api/v1/pipeline/stats/cold` | `inline@src/server.ts:6853` | sí | sí | no | no | no |
| `GET` | `/api/v1/platform/capabilities` | `inline@src/server.ts:6859` | no | sí | no | no | no |
| `POST` | `/api/v1/evidence-graph/append` | `inline@src/server.ts:6864` | sí | sí | no | sí | sí |
| `GET` | `/api/v1/evidence-graph/verify` | `inline@src/server.ts:6885` | sí | sí | no | no | no |
| `POST` | `/api/v1/temporal/record` | `inline@src/server.ts:6894` | sí | sí | no | sí | no |
| `GET` | `/api/v1/temporal/versions` | `inline@src/server.ts:6908` | no | sí | no | no | no |
| `POST` | `/api/v1/citemesh/publish` | `inline@src/server.ts:6918` | sí | sí | no | sí | no |
| `GET` | `/api/v1/citemesh/replay` | `inline@src/server.ts:6935` | no | sí | no | sí | no |
| `POST` | `/api/v1/cognitive-capital/list` | `inline@src/server.ts:6946` | sí | sí | no | sí | no |
| `POST` | `/api/v1/cognitive-capital/trade` | `inline@src/server.ts:6968` | sí | sí | no | sí | no |
| `POST` | `/api/v1/immune/report` | `inline@src/server.ts:6984` | sí | sí | no | sí | no |
| `POST` | `/api/v1/immune/assess` | `inline@src/server.ts:6999` | sí | sí | no | sí | no |
| `POST` | `/api/v1/fabric/execute` | `inline@src/server.ts:7014` | sí | sí | no | sí | no |
| `GET` | `/api/v1/monetization/plans` | `inline@src/server.ts:7031` | no | sí | no | no | no |
| `POST` | `/api/v1/monetization/escrow` | `inline@src/server.ts:7036` | sí | sí | no | sí | no |
| `POST` | `/api/v1/monetization/escrow/release` | `inline@src/server.ts:7052` | sí | sí | no | sí | no |
| `POST` | `/api/v1/monetization/payout` | `inline@src/server.ts:7063` | sí | sí | no | sí | no |
| `POST` | `/api/v1/monetization/scer-split` | `inline@src/server.ts:7079` | sí | sí | no | sí | no |
| `POST` | `/api/v1/pricing/dynamic` | `inline@src/server.ts:7090` | sí | sí | no | sí | no |
| `GET` | `/api/v1/monetization/stats` | `inline@src/server.ts:7106` | no | sí | no | no | no |
| `POST` | `/api/v1/monetization/profit-price` | `inline@src/server.ts:7115` | sí | sí | no | sí | no |
| `GET` | `/api/v1/ops/preflight` | `inline@src/server.ts:7135` | no | sí | no | no | no |
| `GET` | `/api/v1/reina/status` | `inline@src/server.ts:7161` | no | no | sí | no | no |
| `POST` | `/api/v1/reina/adjudicate` | `inline@src/server.ts:7175` | sí | sí | no | sí | sí |
| `GET` | `/api/v1/reina/log/proof/:index` | `inline@src/server.ts:7205` | no | sí | no | sí | no |
| `GET` | `/api/v1/agents/mesh` | `inline@src/routes/agents-mesh.ts:49` | no | no | sí | no | sí |
| `POST` | `/api/v1/agents/mesh/evaluate` | `inline@src/routes/agents-mesh.ts:63` | sí | no | sí | sí | sí |
| `GET` | `/api/v1/agents` | `inline@src/routes/agents.ts:28` | no | no | sí | no | no |
| `POST` | `/api/v1/agents/run` | `inline@src/routes/agents.ts:50` | sí | no | sí | sí | no |
| `GET` | `/api/v1/developer/me` | `inline@src/routes/api-keys.ts:136` | no | no | no | no | no |
| `POST` | `/api/v1/admin/programs` | `inline@src/routes/api-keys.ts:151` | sí | sí | sí | sí | no |
| `GET` | `/api/v1/admin/api-keys` | `inline@src/routes/api-keys.ts:190` | sí | sí | no | sí | no |
| `POST` | `/api/v1/admin/api-keys/:id/rotate` | `inline@src/routes/api-keys.ts:196` | sí | sí | sí | sí | no |
| `DELETE` | `/api/v1/admin/api-keys/:id` | `inline@src/routes/api-keys.ts:226` | sí | sí | sí | sí | no |
| `GET` | `/api/v1/atlas/hcu` | `inline@src/routes/atlas-hcu.ts:102` | no | no | no | no | no |
| `POST` | `/api/v1/atlas/hcu/simulate` | `inline@src/routes/atlas-hcu.ts:119` | sí | no | no | no | no |
| `POST` | `/api/v1/atlas/hcu/nodes` | `inline@src/routes/atlas-hcu.ts:147` | sí | no | no | no | no |
| `PATCH` | `/api/v1/atlas/hcu/nodes/:id` | `inline@src/routes/atlas-hcu.ts:166` | sí | no | no | no | no |
| `DELETE` | `/api/v1/atlas/hcu/nodes/:id` | `inline@src/routes/atlas-hcu.ts:191` | sí | no | no | no | no |
| `POST` | `/api/v1/atlas/hcu/edges` | `inline@src/routes/atlas-hcu.ts:211` | sí | no | no | no | no |
| `PATCH` | `/api/v1/atlas/hcu/edges/:id` | `inline@src/routes/atlas-hcu.ts:230` | sí | no | no | no | no |
| `DELETE` | `/api/v1/atlas/hcu/edges/:id` | `inline@src/routes/atlas-hcu.ts:255` | sí | no | no | no | no |
| `POST` | `/api/v1/civilization/cycle` | `inline@src/routes/civilization.ts:30` | sí | sí | sí | sí | sí |
| `POST` | `/api/v1/security/document-seal` | `inline@src/routes/document-seal.ts:57` | sí | sí | sí | sí | sí |
| `POST` | `/api/v1/security/document-seal/verify` | `inline@src/routes/document-seal.ts:110` | sí | sí | sí | sí | sí |
| `GET` | `/api/v1/security/document-seal` | `inline@src/routes/document-seal.ts:151` | sí | sí | sí | no | sí |
| `POST` | `/api/v3/economy/calculate` | `inline@src/routes/economy.ts:55` | sí | no | sí | sí | sí |
| `POST` | `/api/v3/economy/settle` | `inline@src/routes/economy.ts:100` | sí | sí | sí | sí | sí |
| `GET` | `/api/v3/economy/ledger` | `inline@src/routes/economy.ts:155` | no | no | sí | no | sí |
| `GET` | `/api/v3/economy/streams` | `inline@src/routes/economy.ts:171` | no | no | sí | no | no |
| `POST` | `/api/v3/economy/quote` | `inline@src/routes/economy.ts:182` | sí | no | sí | sí | no |
| `GET` | `/api/v1/federation/node` | `inline@src/routes/federation.ts:112` | no | no | no | no | sí |
| `GET` | `/api/v1/federation/catalog` | `inline@src/routes/federation.ts:139` | no | no | no | no | sí |
| `GET` | `/api/v1/federation/models` | `inline@src/routes/federation.ts:144` | no | no | no | no | sí |
| `GET` | `/api/v1/federation/connectors` | `inline@src/routes/federation.ts:155` | no | sí | no | no | sí |
| `POST` | `/api/v1/federation/connectors` | `inline@src/routes/federation.ts:166` | sí | sí | sí | sí | sí |
| `DELETE` | `/api/v1/federation/connectors/:id` | `inline@src/routes/federation.ts:198` | sí | sí | no | sí | no |
| `GET` | `/api/v1/federation/inbox` | `inline@src/routes/federation.ts:219` | no | sí | no | no | no |
| `GET` | `/api/v1/federation/webhooks/:connectorId` | `inline@src/routes/federation.ts:228` | no | no | no | sí | sí |
| `POST` | `/api/v1/federation/webhooks/:connectorId` | `inline@src/routes/federation.ts:254` | sí | no | sí | sí | sí |
| `POST` | `/api/v1/governance/blackout/engage` | `inline@src/routes/governance-blackout.ts:143` | sí | sí | sí | sí | sí |
| `POST` | `/api/v1/governance/blackout/release` | `inline@src/routes/governance-blackout.ts:171` | sí | sí | sí | sí | sí |
| `GET` | `/api/v1/governance/blackout/status` | `inline@src/routes/governance-blackout.ts:202` | sí | sí | sí | no | sí |
| `POST` | `/api/v1/governance/legitimacy/evaluate` | `inline@src/routes/governance-blackout.ts:216` | sí | sí | sí | sí | sí |
| `POST` | `/api/v1/governance/order-permissions` | `inline@src/routes/governance-permissions.ts:40` | sí | no | sí | sí | sí |
| `POST` | `/api/v1/governance/order-authorize` | `inline@src/routes/governance-permissions.ts:62` | sí | sí | sí | sí | sí |
| `GET` | `/api/v1/hf/catalog` | `inline@src/routes/hf-hub.ts:38` | no | no | sí | sí | sí |
| `POST` | `/api/v1/hf/ingest` | `inline@src/routes/hf-hub.ts:59` | sí | sí | sí | sí | sí |
| `GET` | `/api/v1/hf/references` | `inline@src/routes/hf-hub.ts:92` | no | no | sí | sí | sí |
| `GET` | `/api/v1/hypercore/modes` | `inline@src/routes/hypercore.ts:79` | no | no | no | no | sí |
| `POST` | `/api/v1/hypercore/run` | `inline@src/routes/hypercore.ts:90` | sí | sí | no | sí | sí |
| `POST` | `/api/v1/hypercore/predict` | `inline@src/routes/hypercore.ts:126` | sí | sí | no | sí | sí |
| `GET` | `/api/v1/hypercore/skills` | `inline@src/routes/hypercore.ts:179` | no | no | no | no | sí |
| `POST` | `/api/v1/hypercore/skills/execute` | `inline@src/routes/hypercore.ts:196` | sí | sí | sí | sí | sí |
| `POST` | `/api/v1/mcp` | `inline@src/routes/hypercore.ts:250` | sí | sí | sí | sí | sí |
| `GET` | `/api/v1/emergency/status` | `inline@src/routes/ihec.ts:42` | no | no | sí | no | sí |
| `POST` | `/api/v1/emergency/snapshot` | `inline@src/routes/ihec.ts:56` | sí | no | sí | sí | sí |
| `POST` | `/api/v1/emergency/recover` | `inline@src/routes/ihec.ts:83` | sí | no | sí | sí | sí |
| `POST` | `/api/v1/emergency/repair` | `inline@src/routes/ihec.ts:112` | sí | no | sí | sí | no |
| `GET` | `/api/v1/emergency/governance` | `inline@src/routes/ihec.ts:124` | sí | no | sí | no | sí |
| `POST` | `/api/v1/emergency/failover` | `inline@src/routes/ihec.ts:129` | sí | no | sí | sí | sí |
| `GET` | `/api/v1/emergency/cache` | `inline@src/routes/ihec.ts:153` | no | no | sí | no | sí |
| `POST` | `/api/v1/emergency/rag` | `inline@src/routes/ihec.ts:158` | sí | no | sí | sí | sí |
| `GET` | `/api/v1/emergency/telemetry` | `inline@src/routes/ihec.ts:171` | no | no | sí | no | sí |
| `GET` | `/api/v1/emergency/crisis` | `inline@src/routes/ihec.ts:184` | no | no | sí | no | sí |
| `GET` | `/api/v1/emergency/mutation` | `inline@src/routes/ihec.ts:189` | no | no | sí | no | sí |
| `GET` | `/api/v1/emergency/topology` | `inline@src/routes/ihec.ts:194` | no | no | sí | sí | sí |
| `GET` | `/api/v1/infinity` | `inline@src/routes/infinity.ts:117` | no | no | sí | no | sí |
| `POST` | `/api/v1/infinity/constitution/evaluate` | `inline@src/routes/infinity.ts:126` | sí | no | sí | no | sí |
| `POST` | `/api/v1/infinity/skills/run` | `inline@src/routes/infinity.ts:176` | sí | no | sí | no | sí |
| `POST` | `/api/v1/infinity/media/evaluate` | `inline@src/routes/infinity.ts:207` | sí | no | sí | no | sí |
| `POST` | `/api/v1/infinity/build/plan` | `inline@src/routes/infinity.ts:235` | sí | no | sí | no | sí |
| `POST` | `/api/v1/infinity/evolution/evolve` | `inline@src/routes/infinity.ts:267` | sí | no | sí | no | sí |
| `POST` | `/api/v1/infinity/a2a/evaluate` | `inline@src/routes/infinity.ts:308` | sí | no | sí | no | sí |
| `GET` | `/api/v1/ivcc/status` | `inline@src/routes/ivcc.ts:186` | no | no | sí | no | sí |
| `POST` | `/api/v1/ivcc/plan` | `inline@src/routes/ivcc.ts:195` | sí | no | sí | no | sí |
| `POST` | `/api/v1/voice/create` | `inline@src/routes/ivcc.ts:214` | sí | sí | sí | sí | sí |
| `POST` | `/api/v1/consent/register` | `inline@src/routes/ivcc.ts:296` | sí | sí | sí | sí | sí |
| `POST` | `/api/v1/consent/validate` | `inline@src/routes/ivcc.ts:339` | sí | sí | sí | sí | sí |
| `DELETE` | `/api/v1/consent/revoke` | `inline@src/routes/ivcc.ts:365` | sí | sí | sí | sí | sí |
| `GET` | `/api/v1/audit` | `inline@src/routes/ivcc.ts:400` | no | sí | sí | sí | sí |
| `POST` | `/api/v1/ivcc/memory` | `inline@src/routes/ivcc.ts:431` | sí | sí | sí | sí | sí |
| `DELETE` | `/api/v1/ivcc/memory` | `inline@src/routes/ivcc.ts:477` | sí | sí | sí | sí | sí |
| `POST` | `/api/v1/synthesize` | `inline@src/routes/ivcc.ts:505` | sí | no | sí | no | sí |
| `POST` | `/v1/messages` | `inline@src/routes/llm-gateway.ts:126` | sí | no | no | sí | no |
| `POST` | `/v1beta/models/:spec` | `inline@src/routes/llm-gateway.ts:255` | sí | no | no | sí | no |
| `GET` | `/llama/v1/models` | `inline@src/routes/llm-gateway.ts:409` | no | no | no | no | no |
| `POST` | `/llama/v1/chat/completions` | `inline@src/routes/llm-gateway.ts:417` | sí | no | no | sí | no |
| `GET` | `/api/v1/customization/catalog` | `inline@src/routes/marketplace.ts:41` | no | no | sí | no | sí |
| `GET` | `/api/v1/customization/catalog/:id` | `inline@src/routes/marketplace.ts:54` | no | no | sí | sí | sí |
| `GET` | `/api/v1/marketplace` | `inline@src/routes/marketplace.ts:70` | no | no | sí | no | sí |
| `GET` | `/api/v1/marketplace/:packId` | `inline@src/routes/marketplace.ts:75` | no | no | sí | sí | sí |
| `POST` | `/api/v1/marketplace/plan` | `inline@src/routes/marketplace.ts:86` | sí | sí | sí | sí | sí |
| `GET` | `/api/v1/native/engines` | `inline@src/routes/native-engines.ts:78` | no | no | no | no | sí |
| `GET` | `/api/v1/native/llm/status` | `inline@src/routes/native-engines.ts:119` | no | no | sí | no | no |
| `POST` | `/api/v1/native/llm/generate` | `inline@src/routes/native-engines.ts:132` | sí | sí | sí | sí | sí |
| `POST` | `/api/v1/native/moe/diagnostics` | `inline@src/routes/native-engines.ts:166` | sí | sí | sí | sí | sí |
| `GET` | `/api/v1/nexus` | `inline@src/routes/nexus.ts:35` | no | no | sí | no | sí |
| `POST` | `/api/v1/nexus/ask` | `inline@src/routes/nexus.ts:40` | sí | no | sí | sí | sí |
| `GET` | `/api/v1/nexus/knowledge` | `inline@src/routes/nexus.ts:64` | sí | no | sí | sí | sí |
| `POST` | `/api/v1/nexus/knowledge` | `inline@src/routes/nexus.ts:86` | sí | no | sí | sí | sí |
| `POST` | `/api/v1/nexus/knowledge/:id/correct` | `inline@src/routes/nexus.ts:113` | sí | no | sí | sí | sí |
| `POST` | `/api/v1/nexus/knowledge/:id/withdraw` | `inline@src/routes/nexus.ts:137` | sí | no | sí | sí | sí |
| `POST` | `/api/v1/nexus/quantum/simulate` | `inline@src/routes/nexus.ts:157` | sí | no | sí | sí | sí |
| `GET` | `/api/v1/nexus/health` | `inline@src/routes/nexus.ts:169` | no | no | sí | no | sí |
| `GET` | `/api/v1/nexus/repairs` | `inline@src/routes/nexus.ts:174` | no | no | sí | no | sí |
| `POST` | `/api/v1/nexus/diagnostics` | `inline@src/routes/nexus.ts:190` | sí | no | sí | no | sí |
| `GET` | `/api/v3/omega/constitution` | `inline@src/routes/omega.ts:74` | no | no | sí | no | sí |
| `POST` | `/api/v3/omega/constitution/evaluate` | `inline@src/routes/omega.ts:85` | sí | no | sí | sí | sí |
| `POST` | `/api/v3/omega/simulation/run` | `inline@src/routes/omega.ts:104` | sí | no | sí | sí | sí |
| `POST` | `/api/v3/omega/capital/value` | `inline@src/routes/omega.ts:133` | sí | no | sí | sí | sí |
| `POST` | `/api/v3/omega/civilization/value` | `inline@src/routes/omega.ts:161` | sí | no | sí | sí | sí |
| `GET` | `/api/v3/omega/nexus` | `inline@src/routes/omega.ts:180` | no | no | sí | sí | sí |
| `POST` | `/api/v3/omega/twins/federate` | `inline@src/routes/omega.ts:191` | sí | no | sí | sí | sí |
| `POST` | `/api/v3/omega/memory/store` | `inline@src/routes/omega.ts:214` | sí | no | sí | sí | sí |
| `POST` | `/api/v3/omega/memory/query` | `inline@src/routes/omega.ts:239` | sí | no | sí | sí | sí |
| `POST` | `/api/v3/omega/trust/analyze` | `inline@src/routes/omega.ts:265` | sí | no | sí | sí | sí |
| `POST` | `/api/v3/omega/research/run` | `inline@src/routes/omega.ts:279` | sí | no | sí | sí | sí |
| `POST` | `/api/v3/omega/territory/fabricate` | `inline@src/routes/omega.ts:301` | sí | no | sí | sí | sí |
| `GET` | `/v1/models` | `inline@src/routes/openai.ts:119` | no | no | no | no | no |
| `POST` | `/v1/chat/completions` | `inline@src/routes/openai.ts:133` | sí | no | no | sí | no |
| `POST` | `/v1/completions` | `inline@src/routes/openai.ts:230` | sí | no | no | sí | no |
| `GET` | `/api/v1/persistence/chat/sessions` | `inline@src/routes/persistent-chat.ts:63` | no | no | no | no | no |
| `GET` | `/api/v1/persistence/chat/sessions/:sessionId` | `inline@src/routes/persistent-chat.ts:96` | no | no | no | no | no |
| `POST` | `/api/v1/persistence/chat/sessions/:sessionId/messages` | `inline@src/routes/persistent-chat.ts:147` | sí | no | no | no | no |
| `DELETE` | `/api/v1/persistence/chat/sessions/:sessionId/messages` | `inline@src/routes/persistent-chat.ts:253` | sí | no | no | no | no |
| `DELETE` | `/api/v1/persistence/chat/sessions/:sessionId` | `inline@src/routes/persistent-chat.ts:281` | sí | no | no | no | no |
| `POST` | `/api/v1/pipeline/execute` | `inline@src/routes/pipeline.ts:100` | sí | sí | sí | sí | sí |
| `GET` | `/chat` | `inline@src/routes/platform.ts:119` | no | no | sí | no | no |
| `GET` | `/platform` | `inline@src/routes/platform.ts:128` | no | no | sí | no | no |
| `GET` | `/platform/:page` | `inline@src/routes/platform.ts:138` | no | no | sí | sí | no |
| `GET` | `/styles/platform.css` | `inline@src/routes/platform.ts:176` | no | no | no | no | no |
| `GET` | `/ui/platform.js` | `inline@src/routes/platform.ts:184` | no | no | no | no | no |
| `GET` | `/ui/platform-chat.js` | `inline@src/routes/platform.ts:192` | no | no | no | no | no |
| `GET` | `/ui/platform/logo-isav6.jpeg` | `inline@src/routes/platform.ts:200` | no | no | no | no | no |
| `GET` | `/api/v1/platform/catalog` | `inline@src/routes/platform.ts:210` | no | no | sí | no | no |
| `POST` | `/api/v1/revenue/iet/calculate` | `inline@src/routes/revenue-fabric.ts:135` | sí | sí | sí | sí | no |
| `POST` | `/api/v1/revenue/settle` | `inline@src/routes/revenue-fabric.ts:168` | sí | sí | sí | sí | sí |
| `GET` | `/api/v1/revenue/settlements/:idempotencyKey` | `inline@src/routes/revenue-fabric.ts:290` | no | sí | sí | sí | no |
| `GET` | `/api/v1/revenue/ledger/journals` | `inline@src/routes/revenue-fabric.ts:306` | no | sí | sí | no | no |
| `GET` | `/api/v1/revenue/ledger/verify` | `inline@src/routes/revenue-fabric.ts:314` | sí | sí | sí | no | no |
| `POST` | `/api/v1/revenue/usage` | `inline@src/routes/revenue-fabric.ts:326` | sí | sí | sí | sí | no |
| `GET` | `/api/v1/revenue/usage/:userId` | `inline@src/routes/revenue-fabric.ts:381` | no | sí | sí | no | no |
| `GET` | `/api/v1/revenue/usage/:userId/invoice` | `inline@src/routes/revenue-fabric.ts:397` | no | sí | sí | no | no |
| `GET` | `/api/v1/revenue/wallet/:userId` | `inline@src/routes/revenue-fabric.ts:449` | no | sí | sí | sí | no |
| `POST` | `/api/v1/revenue/wallet/:userId/credit` | `inline@src/routes/revenue-fabric.ts:476` | sí | sí | sí | sí | no |
| `POST` | `/api/v1/revenue/wallet/:userId/debit` | `inline@src/routes/revenue-fabric.ts:516` | sí | sí | sí | sí | no |
| `GET` | `/api/v1/revenue/my/wallet` | `inline@src/routes/revenue-fabric.ts:540` | no | no | sí | no | no |
| `POST` | `/api/v1/revenue/my/wallet/payout` | `inline@src/routes/revenue-fabric.ts:561` | sí | no | sí | no | no |
| `POST` | `/api/v1/revenue/eligibility/:userId` | `inline@src/routes/revenue-fabric.ts:578` | sí | sí | sí | sí | no |
| `GET` | `/api/v1/revenue/eligibility/:userId` | `inline@src/routes/revenue-fabric.ts:599` | no | sí | sí | no | no |
| `POST` | `/api/v1/revenue/contributions/:userId` | `inline@src/routes/revenue-fabric.ts:614` | sí | sí | sí | sí | no |
| `GET` | `/api/v1/revenue/contributions/:userId/total` | `inline@src/routes/revenue-fabric.ts:636` | no | sí | sí | no | no |
| `GET` | `/api/v1/revenue/streams` | `inline@src/routes/revenue-fabric.ts:648` | no | sí | sí | no | no |
| `POST` | `/api/v1/billing/checkout` | `inline@src/routes/revenue-fabric.ts:746` | sí | no | sí | sí | no |
| `POST` | `/api/v1/billing/portal` | `inline@src/routes/revenue-fabric.ts:790` | sí | no | sí | no | no |
| `POST` | `/api/v1/billing/stripe/webhook` | `inline@src/routes/revenue-fabric.ts:817` | sí | no | no | sí | sí |
| `GET` | `/api/v1/revenue/outbox/status` | `inline@src/routes/revenue-fabric.ts:860` | no | sí | sí | no | no |
| `GET` | `/api/v1/revenue/outbox/dead-letter` | `inline@src/routes/revenue-fabric.ts:868` | no | sí | sí | no | no |
| `POST` | `/api/v1/revenue/outbox/retry/:eventId` | `inline@src/routes/revenue-fabric.ts:876` | sí | sí | sí | no | no |
| `GET` | `/api/v1/revenue/health` | `inline@src/routes/revenue-fabric.ts:920` | no | sí | no | no | no |
| `GET` | `/api/skills/catalog` | `list@src/routes/skill-catalog.ts:164` | no | no | no | no | sí |
| `GET` | `/api/skills/catalog/:id` | `byId@src/routes/skill-catalog.ts:165` | no | no | no | no | sí |
| `GET` | `/api/v1/tamv/status` | `inline@src/routes/tamv.ts:83` | no | no | no | no | sí |
| `GET` | `/api/v1/tamv/presets` | `inline@src/routes/tamv.ts:94` | no | no | no | no | sí |
| `GET` | `/api/v1/tamv/presets/:presetId` | `inline@src/routes/tamv.ts:111` | no | no | no | no | sí |
| `POST` | `/api/v1/tamv/analyze` | `inline@src/routes/tamv.ts:117` | sí | sí | sí | no | sí |
| `POST` | `/api/v1/tamv/adaptive-preset` | `inline@src/routes/tamv.ts:141` | sí | sí | sí | no | sí |
| `POST` | `/api/v1/tamv/redefine-plan` | `inline@src/routes/tamv.ts:167` | sí | sí | sí | sí | sí |
| `POST` | `/api/v1/intelligence/triage` | `inline@src/routes/traffic-light.ts:33` | sí | sí | sí | sí | sí |
| `GET` | `/api/v3/treasury/balance/:partyId` | `inline@src/routes/treasury.ts:61` | no | sí | sí | sí | sí |
| `POST` | `/api/v3/treasury/credit` | `inline@src/routes/treasury.ts:115` | sí | no | no | no | sí |
| `POST` | `/api/v3/treasury/debit` | `inline@src/routes/treasury.ts:116` | sí | no | no | no | sí |
| `POST` | `/api/v3/affiliates/register` | `inline@src/routes/treasury.ts:118` | sí | sí | sí | sí | sí |
| `POST` | `/api/v3/affiliates/attribute` | `inline@src/routes/treasury.ts:141` | sí | sí | sí | sí | sí |
| `POST` | `/api/v3/fraud/analyze` | `inline@src/routes/treasury.ts:176` | sí | no | sí | sí | sí |
| `GET` | `/api/v1/tts/status` | `inline@src/routes/tts.ts:129` | no | no | no | no | sí |
| `POST` | `/api/v1/tts/plan` | `inline@src/routes/tts.ts:133` | sí | no | sí | no | sí |
| `POST` | `/api/v1/tts/stream` | `inline@src/routes/tts.ts:156` | sí | no | sí | no | sí |
| `POST` | `/api/v1/tts/interrupt` | `inline@src/routes/tts.ts:221` | sí | no | sí | no | sí |
| `POST` | `/api/v1/tts/synthesize` | `inline@src/routes/tts.ts:234` | sí | sí | sí | no | sí |
| `POST` | `/api/v1/voice/speak` | `inline@src/routes/tts.ts:282` | sí | no | sí | no | no |
| `POST` | `/api/v1/tts/memory` | `inline@src/routes/tts.ts:327` | sí | no | sí | sí | sí |
| `DELETE` | `/api/v1/tts/memory` | `inline@src/routes/tts.ts:340` | sí | no | sí | no | sí |
| `POST` | `/api/v1/intelligence/turbo-plan` | `inline@src/routes/turbo-planner.ts:32` | sí | sí | sí | sí | sí |
| `POST` | `/api/v1/yun/events` | `inline@src/routes/yun-events.ts:34` | sí | sí | no | sí | sí |
| `GET` | `/api/v1/yun/events` | `inline@src/routes/yun-events.ts:60` | no | no | sí | no | sí |

> Las columnas **Auth**, **Rate-limit** y **Validación** son heurísticas de análisis
> estático sobre el cuerpo del handler (presencia de `authorizeApiToken` /
> `verifyBearerToken` / `assertBalancedAuthority` / `authorizeAdmin` /
> `authorizeProviderRoute`, `enforceRateLimit` y guardas de
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
verificado. Hoy la mayoría de rutas queda con `verified: false` (190 de 336);
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
