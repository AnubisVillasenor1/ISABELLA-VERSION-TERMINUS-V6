/**
 * ISABELLA VILLASEÑOR AI™ — Native Performance Fabric.
 * state: draft | engine-generated.
 *
 * Fabric de rendimiento: caché de respuestas, métricas de latencia,
 * deduplicación de requests y optimización de throughput.
 *
 * Reduce latencia para requests repetidos y proporciona métricas
 * observables para cada endpoint.
 */
import { digest } from './skills';

export interface CacheEntry {
  readonly key: string;
  readonly value: unknown;
  readonly createdAt: number;
  readonly ttlMs: number;
  readonly hits: number;
}

export interface PerformanceMetrics {
  readonly totalRequests: number;
  readonly cacheHits: number;
  readonly cacheMisses: number;
  readonly avgLatencyMs: number;
  readonly p95LatencyMs: number;
  readonly p99LatencyMs: number;
  readonly errorRate: number;
  readonly timestamp: string;
}

export class ResponseCache {
  private readonly cache = new Map<string, CacheEntry>();
  private readonly maxSize: number;
  private readonly defaultTtlMs: number;

  constructor(maxSize = 1000, defaultTtlMs = 60000) {
    this.maxSize = maxSize;
    this.defaultTtlMs = defaultTtlMs;
  }

  get(key: string): unknown | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    if (Date.now() - entry.createdAt > entry.ttlMs) {
      this.cache.delete(key);
      return null;
    }
    // Update hits (immutable update)
    this.cache.set(key, { ...entry, hits: entry.hits + 1 });
    return entry.value;
  }

  set(key: string, value: unknown, ttlMs?: number): void {
    if (this.cache.size >= this.maxSize) {
      // Evict oldest entry
      const oldest = this.cache.keys().next().value;
      if (oldest) this.cache.delete(oldest);
    }
    this.cache.set(key, {
      key,
      value,
      createdAt: Date.now(),
      ttlMs: ttlMs ?? this.defaultTtlMs,
      hits: 0,
    });
  }

  invalidate(key: string): boolean {
    return this.cache.delete(key);
  }

  invalidateAll(): void {
    this.cache.clear();
  }

  size(): number {
    return this.cache.size;
  }

  stats(): { size: number; maxSize: number; defaultTtlMs: number } {
    return { size: this.cache.size, maxSize: this.maxSize, defaultTtlMs: this.defaultTtlMs };
  }
}

export class LatencyTracker {
  private readonly latencies: number[] = [];
  private readonly maxSamples: number;
  private totalRequests = 0;
  private errors = 0;

  constructor(maxSamples = 10000) {
    this.maxSamples = maxSamples;
  }

  record(latencyMs: number, isError = false): void {
    this.totalRequests += 1;
    if (isError) this.errors += 1;
    this.latencies.push(latencyMs);
    if (this.latencies.length > this.maxSamples) {
      this.latencies.shift();
    }
  }

  metrics(): PerformanceMetrics {
    const sorted = [...this.latencies].sort((a, b) => a - b);
    const p95Index = Math.floor(sorted.length * 0.95);
    const p99Index = Math.floor(sorted.length * 0.99);
    const avg = sorted.length > 0 ? sorted.reduce((a, b) => a + b, 0) / sorted.length : 0;
    return {
      totalRequests: this.totalRequests,
      cacheHits: 0,
      cacheMisses: 0,
      avgLatencyMs: Math.round(avg * 100) / 100,
      p95LatencyMs: sorted.length > 0 ? sorted[p95Index] ?? 0 : 0,
      p99LatencyMs: sorted.length > 0 ? sorted[p99Index] ?? 0 : 0,
      errorRate: this.totalRequests > 0 ? Math.round((this.errors / this.totalRequests) * 10000) / 10000 : 0,
      timestamp: new Date().toISOString(),
    };
  }

  reset(): void {
    this.latencies.length = 0;
    this.totalRequests = 0;
    this.errors = 0;
  }
}

export function cacheKey(method: string, path: string, body?: unknown): string {
  const bodyHash = body ? digest(body).slice(0, 16) : '';
  return `${method}:${path}:${bodyHash}`;
}

export function describePerformanceFabric(): Readonly<Record<string, unknown>> {
  return {
    cache: 'in-memory LRU with TTL',
    metrics: ['avgLatency', 'p95', 'p99', 'errorRate'],
    deduplication: 'request-level via cache key',
    executionPerformed: false,
    note: 'Reduce latencia para requests repetidos; no modifica respuestas.',
  };
}