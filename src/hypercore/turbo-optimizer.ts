import { randomUUID } from "node:crypto";

export interface TurboMetricSnapshot {
  cacheHitRate: number;
  averageLatencyMs: number;
  throughput: number;
  warmFactor: number;
  ready: boolean;
}

export interface TurboExecutionContext {
  op: string;
  payloadSize?: number;
  timestamp?: number;
  metadata?: Record<string, string | number | boolean | null | undefined>;
}

export class HyperCoreTurboOptimizer {
  private cache = new Map<string, { value: unknown; expiresAt: number }>();
  private metrics = {
    total: 0,
    hits: 0,
    latencyMs: 0,
  };

  constructor(private readonly ttlMs = 60000, private readonly maxEntries = 512) {}

  resolve<T>(key: string, factory: () => T, ctx?: TurboExecutionContext): T {
    const now = Date.now();
    const cached = this.cache.get(key);

    if (cached && cached.expiresAt > now) {
      this.metrics.hits += 1;
      return cached.value as T;
    }

    const started = performance.now();
    const value = factory();
    const latencyMs = performance.now() - started;

    this.metrics.total += 1;
    this.metrics.latencyMs += latencyMs;

    if (this.cache.size >= this.maxEntries) {
      const oldestKey = this.cache.keys().next().value as string | undefined;
      if (oldestKey) {
        this.cache.delete(oldestKey);
      }
    }

    this.cache.set(key, {
      value,
      expiresAt: now + this.ttlMs,
    });

    if (ctx?.metadata) {
      this.cache.set(`${key}:meta:${randomUUID()}`, {
        value: ctx.metadata,
        expiresAt: now + this.ttlMs,
      });
    }

    return value;
  }

  snapshot(): TurboMetricSnapshot {
    const total = this.metrics.total || 1;
    const hitRate = (this.metrics.hits / total) * 100;
    const averageLatencyMs = this.metrics.latencyMs / total;

    return {
      cacheHitRate: Number.isFinite(hitRate) ? hitRate : 0,
      averageLatencyMs: Number.isFinite(averageLatencyMs) ? averageLatencyMs : 0,
      throughput: total,
      warmFactor: Math.min(1, total / 25),
      ready: total > 0,
    };
  }

  purge() {
    this.cache.clear();
    this.metrics = {
      total: 0,
      hits: 0,
      latencyMs: 0,
    };
  }
}

export const createHyperCoreTurboOptimizer = (ttlMs?: number, maxEntries?: number) =>
  new HyperCoreTurboOptimizer(ttlMs, maxEntries);

export const hyperCoreTurbo = createHyperCoreTurboOptimizer(60000, 512);

export const turboProfile = {
  optimize: <T>(key: string, factory: () => T, ctx?: TurboExecutionContext) => hyperCoreTurbo.resolve(key, factory, ctx),
  snapshot: () => hyperCoreTurbo.snapshot(),
  purge: () => hyperCoreTurbo.purge(),
};
