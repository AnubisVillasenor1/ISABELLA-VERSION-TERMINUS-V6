import { describe, expect, it, vi } from 'vitest';
import { RecoveryEngine, RecoveryStore, MetaCognitiveRecoveryAdapter, describeDurableRecovery } from '../../src/infinity';

describe('Durable Recovery', () => {
  it('completes a job and relays to sink', () => {
    const store = new RecoveryStore();
    const engine = new RecoveryEngine(store, { leaseMs: 60000, now: () => 1000 });
    const provider = { lookup: () => ({ found: false, result: null }), execute: (_k: string, _p: unknown) => ({ ok: true }), idempotent: true };
    store.enqueue('op-1', { data: 'test' });
    const result = engine.run('op-1', provider);
    expect(result).toEqual({ ok: true });
    const job = store.getJob('op-1');
    expect(job?.state).toBe('completed');
    let relayed = 0;
    engine.relay(() => { relayed += 1; });
    expect(relayed).toBe(1);
    // Second relay is no-op (delivered).
    let relayed2 = 0;
    engine.relay(() => { relayed2 += 1; });
    expect(relayed2).toBe(0);
  });

  it('returns cached result on re-run', () => {
    const store = new RecoveryStore();
    const engine = new RecoveryEngine(store, { leaseMs: 60000, now: () => 1000 });
    const provider = { lookup: () => ({ found: false, result: null }), execute: () => ({ ok: true }), idempotent: true };
    store.enqueue('op-2', { data: 'x' });
    engine.run('op-2', provider);
    const result2 = engine.run('op-2', provider);
    expect(result2).toEqual({ ok: true });
  });

  it('marks review on ambiguous crash (non-idempotent)', () => {
    const store = new RecoveryStore();
    let now = 1000;
    const engine = new RecoveryEngine(store, { leaseMs: 100, now: () => now });
    const provider = { lookup: () => ({ found: false, result: null }), execute: () => ({ ok: true }), idempotent: false };
    store.enqueue('op-3', { data: 'y' });
    // First run: executes then crashes.
    try { engine.run('op-3', provider, true); } catch { /* injected crash */ }
    const job = store.getJob('op-3');
    expect(job?.state).toBe('running'); // crashed, still running (lease held)
    // Simulate lease expiry.
    now = 2000;
    // Re-run: prior=true, non-idempotent → review.
    expect(() => engine.run('op-3', provider)).toThrow(/Uncertain external effect/);
    expect(store.getJob('op-3')?.state).toBe('review');
  });

  it('compensates only after confirmed completion', () => {
    const store = new RecoveryStore();
    const engine = new RecoveryEngine(store, { leaseMs: 60000, now: () => 1000 });
    const provider = { lookup: () => ({ found: false, result: null }), execute: () => ({ ok: true }), idempotent: true };
    store.enqueue('op-4', { data: 'z' });
    engine.run('op-4', provider);
    const compKey = engine.compensate('op-4', { reason: 'undo' }, true);
    expect(compKey).toBe('op-4:compensate');
    expect(() => engine.compensate('op-4', {}, false)).toThrow(/Explicit authorization/);
    expect(() => engine.compensate('nonexistent', {}, true)).toThrow(/Original effect not confirmed/);
  });

  it('MetaCognitiveRecoveryAdapter enqueues and runs', () => {
    const store = new RecoveryStore();
    const engine = new RecoveryEngine(store, { leaseMs: 60000, now: () => 1000 });
    const provider = { lookup: () => ({ found: false, result: null }), execute: (_k: string, p: unknown) => ({ echoed: p }), idempotent: true };
    const adapter = new MetaCognitiveRecoveryAdapter(engine, provider);
    const result = adapter.execute('op-5', { sanitized: true });
    expect(result).toEqual({ echoed: { sanitized: true } });
    expect(store.getJob('op-5')?.state).toBe('completed');
  });

  it('describe returns honest metadata', () => {
    const store = new RecoveryStore();
    const engine = new RecoveryEngine(store, { leaseMs: 60000 });
    const d = engine.describe() as { executionPerformed: boolean };
    expect(d.executionPerformed).toBe(false);
    const dr = describeDurableRecovery();
    expect(dr.multiMachine).toBe(false);
  });
});