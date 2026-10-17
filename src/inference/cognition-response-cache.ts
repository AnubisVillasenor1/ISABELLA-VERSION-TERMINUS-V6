/**
 * Bounded process-local response cache for the public cognition route.
 * Reads must happen only after request validation and a fresh governance decision.
 * Entries are optimization hints, never an authorization decision or durable memory.
 */
export class CognitionResponseCache<T> {
  private readonly entries = new Map<string, { value: T; expiresAt: number }>();

  constructor(
    private readonly ttlMs = 30_000,
    private readonly maxEntries = 500,
    private readonly now: () => number = Date.now,
  ) {
    if (!Number.isSafeInteger(ttlMs) || ttlMs <= 0) {
      throw new RangeError("COGNITION_CACHE_TTL_INVALID");
    }
    if (!Number.isSafeInteger(maxEntries) || maxEntries <= 0) {
      throw new RangeError("COGNITION_CACHE_CAPACITY_INVALID");
    }
  }

  get size(): number {
    this.pruneExpired();
    return this.entries.size;
  }

  get(key: string): T | undefined {
    const entry = this.entries.get(key);
    if (!entry) return undefined;
    if (this.now() >= entry.expiresAt) {
      this.entries.delete(key);
      return undefined;
    }
    // Map insertion order is the LRU order: a read promotes the key.
    this.entries.delete(key);
    this.entries.set(key, entry);
    return entry.value;
  }

  set(key: string, value: T): void {
    this.pruneExpired();
    this.entries.delete(key);
    this.entries.set(key, { value, expiresAt: this.now() + this.ttlMs });
    while (this.entries.size > this.maxEntries) {
      const leastRecentlyUsed = this.entries.keys().next().value;
      if (leastRecentlyUsed === undefined) break;
      this.entries.delete(leastRecentlyUsed);
    }
  }

  clear(): void {
    this.entries.clear();
  }

  private pruneExpired(): void {
    const now = this.now();
    for (const [key, entry] of this.entries) {
      if (now >= entry.expiresAt) this.entries.delete(key);
    }
  }
}

/**
 * Canonical cache-key encoding. The governance method is part of the tuple so
 * identical text cannot share an entry across materially different policy paths.
 */
export function buildCognitionCacheKey(
  input: string,
  history: unknown,
  modelEngine: string,
  focusLens: string,
  methodId: string,
): string {
  return JSON.stringify([modelEngine, focusLens, methodId, input, history ?? []]);
}
