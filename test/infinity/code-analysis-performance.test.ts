import { describe, expect, it } from 'vitest';
import { analyzeCode, describeCodeAnalysis, ResponseCache, LatencyTracker, cacheKey } from '../../src/infinity';

describe('Code Analysis', () => {
  it('analiza código y detecta patrones', () => {
    const source = `// hello\nfunction foo() {\n  if (true) {\n    console.log('test');\n  }\n}\n// TODO: fix\nconst x: any = 1;\n`;
    const r = analyzeCode(source);
    expect(r.lines.total).toBe(9);
    expect(r.functions).toBeGreaterThanOrEqual(1);
    expect(r.patterns.todo).toBe(1);
    expect(r.complexity.cyclomatic).toBeGreaterThan(1);
    expect(r.debtScore).toBeGreaterThan(0);
    expect(r.digest).toMatch(/^[0-9a-f]{128}$/);
    expect(r.executionPerformed).toBe(false);
  });

  it('describe code analysis', () => {
    const d = describeCodeAnalysis() as { metrics: string[] };
    expect(d.metrics).toContain('debtScore');
  });
});

describe('Performance Fabric', () => {
  it('cache get/set/invalidate', () => {
    const cache = new ResponseCache(10, 1000);
    cache.set('key1', { data: 42 });
    expect(cache.get('key1')).toEqual({ data: 42 });
    expect(cache.get('nonexistent')).toBeNull();
    expect(cache.invalidate('key1')).toBe(true);
    expect(cache.get('key1')).toBeNull();
    expect(cache.size()).toBe(0);
  });

  it('cache TTL expiry', () => {
    const cache = new ResponseCache(10, 1); // 1ms TTL
    cache.set('key2', 'value');
    // Wait for expiry
    const start = Date.now();
    while (Date.now() - start < 5) { /* spin */ }
    expect(cache.get('key2')).toBeNull();
  });

  it('latency tracker metrics', () => {
    const tracker = new LatencyTracker(100);
    tracker.record(10);
    tracker.record(20);
    tracker.record(30, true);
    const m = tracker.metrics();
    expect(m.totalRequests).toBe(3);
    expect(m.avgLatencyMs).toBe(20);
    expect(m.errorRate).toBeGreaterThan(0);
    expect(m.p95LatencyMs).toBeGreaterThan(0);
  });

  it('cacheKey generates deterministic key', () => {
    const k1 = cacheKey('GET', '/api/test', { a: 1 });
    const k2 = cacheKey('GET', '/api/test', { a: 1 });
    expect(k1).toBe(k2);
    expect(k1).toContain('GET:/api/test:');
  });
});