# Isabella Villaseñor AI — Genesis TINA V6

Infraestructura Cognitiva Civilizatoria Soberana (CCI): memoria, gobernanza, evidencia, economía, seguridad, federación y resiliencia.

## Capacidades implementadas (30 gifts)

La plataforma expone 30 capacidades verificables (ver `src/platform/index.ts`):

1. Reintentos con backoff/jitter/deadline (`src/resilience/retry.ts`)
2. Bulkhead con cola acotada (`src/resilience/bulkhead.ts`)
3. Inbox de webhooks dedupe+orden (`src/ingress/webhook-inbox.ts`)
4. Preflight de producción (`src/health/preflight.ts`)
5. Redactor de PII (CURP/RFC/CLABE) (`src/privacy/pii-redactor.ts`)
6. SLO burn-rate multi-ventana (`src/observability/slo.ts`)
7. BM25 + RRF (`src/memory/bm25.ts`)
8. Feature flags deterministas (`src/governance/feature-flags.ts`)
9. Presupuesto de costo por tenant (`src/inference/cost-budget.ts`)
10. Paquete de evidencia offline (`src/bookpi/evidence-bundle.ts`)
11. Grafo de Evidencia Civilizatoria (CEG) (`src/civilization/evidence-graph.ts`)
12. Cognición Temporal (YUN Ω) (`src/memory/temporal-cognition.ts`)
13. CITEMESH — Sistema Nervioso Digital (`src/fabric/citemesh.ts`)
14. Mercado de Capital Cognitivo (`src/economy/cognitive-capital-market.ts`)
15. Sistema Inmune Cognitivo (Ω-14) (`src/ihec/immune-system.ts`)
16. Motor de Tejido Cognitivo (CFE) (`src/core/cognitive-fabric-engine.ts`)
17. Tejido de Gobernanza Constitucional (CGF) (`src/governance/constitutional-governance-fabric.ts`)
18. CROWN — PDP (`src/crown/capability.ts`)
19. GAME OVER — UAGP-1 (`src/gameover/gateway.ts`)
20. BookPI — Ledger (`src/bookpi/ledger.ts`)
21. Terminus Ω — Retención (`src/terminus/retention.ts`)
22. Omega — Constitución (`src/omega/constitution.ts`)
23. IHEC — Emergency Core (`src/ihec/ihec.ts`)
24. Federación — Registry (`src/federation/registry.ts`)
25. Economía — Treasury (`src/economy/treasury.ts`)
26. Memoria — IKES (`src/memory/ikes.ts`)
27. Gobernanza — Permission Map (`src/governance/permission-map.ts`)
28. Seguridad — HTTP Hardening (`src/security/http-hardening.ts`)
29. HyperCore — Motor (`src/hypercore/hypercore.ts`)
30. Isabella — Motor Cognitivo (`src/isabella/library.ts`)

## Comandos

- `pnpm typecheck` — verificación de tipos
- `pnpm test` — suite de tests (1513+)
- `pnpm build` — build completo (typecheck + tests + bundle + smoke + security)
- `pnpm dev` / `pnpm start` — servidor de desarrollo
- `pnpm run security:suite` — suite de seguridad

## Arquitectura

Seis macrodominios: Ω-CORE, Ω-GOVERNANCE, Ω-KNOWLEDGE, Ω-ECONOMY, Ω-IMMUNITY, Ω-EXPERIENCE. Cada módulo calcula o protege; ninguno autoriza ni ejecuta por sí mismo (CAPABILITY ≠ AUTHORITY).

## Producción y despliegue

- `STRICT_PREFLIGHT=1` aborta el arranque si el preflight encuentra errores bloqueantes.
- `NODE_ENV=production` activa validaciones estrictas.
- Preflight: `GET /api/v1/ops/preflight` (token admin).
- Kubernetes: manifiestos en `k8s/` (deployment, service, ingress, hpa, pdb, networkpolicy).
- Bases de datos: PostgreSQL (Neon) vía `DATABASE_URL`; Redis/Upstash vía `REDIS_URL`; BookPI ledger vía `BOOKPI_LEDGER_PATH`.
- Caché cognitiva en memoria (TTL 30s) para reducir latencia en inputs repetidos.
- Caché TTS LRU (64 entradas) para reducir latencia de voz.

### Estado de avance (estimado)

| Área | Avance |
|---|---|
| Core cognitivo (CFE, CGF, TINA) | 85% |
| Gobernanza (CROWN, GAME OVER, permission-map) | 90% |
| Memoria (IKES, YUN Ω, BM25) | 80% |
| Evidencia (BookPI, CEG, evidence-bundle) | 85% |
| Economía (IMF, treasury, cognitive-capital-market) | 75% |
| Seguridad (HTTP hardening, ISA-X, AEGIS) | 90% |
| Resiliencia (retry, bulkhead, preflight) | 90% |
| Federación (registry, CITEMESH) | 60% |
| Immunidad (IHEC, immune-system) | 75% |
| Interfaz (Nexus UI, cinematic) | 80% |
| Infraestructura (K8s, DB, deploy) | 70% |
| **Total estimado** | **~80%** |

## Licencia

Software: Apache 2.0. Documentación: CC BY 4.0.
