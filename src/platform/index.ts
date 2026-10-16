/**
 * Plataforma de resiliencia, privacidad y evidencia — diez capacidades añadidas el 2026-10-16.
 * state: draft | engine-generated (pendiente de revisión humana con nombre).
 *
 * Cada módulo CALCULA o PROTEGE; ninguno autoriza ni ejecuta efectos externos por sí mismo.
 * CAPABILITY ≠ AUTHORITY ≠ EXECUTION ≠ EVIDENCE ≠ LEARNING ≠ PRODUCTION.
 */
export * from "../resilience/retry";
export * from "../resilience/bulkhead";
export * from "../ingress/webhook-inbox";
export * from "../health/preflight";
export * from "../privacy/pii-redactor";
export * from "../observability/slo";
export * from "../memory/bm25";
export * from "../governance/feature-flags";
export * from "../inference/cost-budget";
export * from "../bookpi/evidence-bundle";

export interface PlatformGift {
  readonly order: number;
  readonly id: string;
  readonly title: string;
  readonly file: string;
  readonly wired: string;
  readonly limits: string;
}

export const PLATFORM_GIFTS: readonly PlatformGift[] = Object.freeze([
  { order: 1, id: "retry-backoff", title: "Reintentos con backoff, jitter y deadline", file: "src/resilience/retry.ts", wired: "biblioteca (sin cablear)", limits: "Reintentar operaciones no idempotentes es decisión del llamador." },
  { order: 2, id: "bulkhead", title: "Bulkhead con cola acotada y load shedding", file: "src/resilience/bulkhead.ts", wired: "biblioteca (sin cablear)", limits: "Métricas locales al proceso." },
  { order: 3, id: "webhook-inbox", title: "Inbox de webhooks (dedupe + orden)", file: "src/ingress/webhook-inbox.ts", wired: "POST /api/v1/billing/stripe/webhook", limits: "Memoria de proceso; varias instancias requieren almacén compartido." },
  { order: 4, id: "preflight", title: "Preflight de configuración de producción", file: "src/health/preflight.ts", wired: "arranque (STRICT_PREFLIGHT=1) + GET /api/v1/ops/preflight", limits: "No verifica alcance de red de dependencias." },
  { order: 5, id: "pii-redactor", title: "Redactor de PII con CURP/RFC/CLABE validados", file: "src/privacy/pii-redactor.ts", wired: "biblioteca (sin cablear)", limits: "Red de seguridad; no detecta nombres ni direcciones." },
  { order: 6, id: "slo-burn-rate", title: "SLO y alertas por quema multi-ventana", file: "src/observability/slo.ts", wired: "biblioteca (sin cablear)", limits: "Retención de 3 días; local al proceso." },
  { order: 7, id: "bm25-rrf", title: "Recuperación léxica BM25 + RRF", file: "src/memory/bm25.ts", wired: "biblioteca (sin cablear)", limits: "Léxico: sin semántica/embeddings." },
  { order: 8, id: "feature-flags", title: "Feature flags deterministas con rollout y kill switch", file: "src/governance/feature-flags.ts", wired: "biblioteca (sin cablear)", limits: "Una bandera configura exposición, no concede autoridad." },
  { order: 9, id: "cost-budget", title: "Presupuesto de costo por tenant con reservas", file: "src/inference/cost-budget.ts", wired: "biblioteca (sin cablear)", limits: "Memoria de proceso; µUSD enteros." },
  { order: 10, id: "evidence-bundle", title: "Paquete de evidencia verificable offline", file: "src/bookpi/evidence-bundle.ts", wired: "biblioteca (sin cablear)", limits: "Prueba integridad, no veracidad; sin RFC 3161/WORM." },
]);
