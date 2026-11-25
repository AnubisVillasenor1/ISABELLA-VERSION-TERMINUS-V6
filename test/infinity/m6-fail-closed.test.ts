import { describe, expect, it } from 'vitest';
import { M6FailClosedEngine, describeM6FailClosed, DEFAULT_THRESHOLDS } from '../../src/infinity';

describe('M6 Fail-Closed Governance', () => {
  it('ALLOW solo si todos los factores son true', () => {
    const engine = new M6FailClosedEngine();
    const cmd = { commandId: 'cmd-1', actorDid: 'did:x', action: 'test', payload: {}, jurisdiction: 'MX', epochId: 'e1', timestamp: new Date().toISOString() };
    const factors = { identity: true, authority: true, policy: true, evidence: true, safety: true };
    const result = engine.evaluate(cmd, factors, {});
    expect(result.verdict).toBe('ALLOW');
    expect(result.state).toBe('SEALING');
    expect(result.executionPerformed).toBe(false);
  });

  it('DENY si cualquier factor es false', () => {
    const engine = new M6FailClosedEngine();
    const cmd = { commandId: 'cmd-2', actorDid: 'did:x', action: 'test', payload: {}, jurisdiction: 'MX', epochId: 'e1', timestamp: new Date().toISOString() };
    const factors = { identity: true, authority: true, policy: false, evidence: true, safety: true };
    const result = engine.evaluate(cmd, factors, {});
    expect(result.verdict).toBe('DENY');
    expect(result.reason).toBe('POLICY_FAILED');
  });

  it('DENY por safety (temperatura excedida)', () => {
    const engine = new M6FailClosedEngine();
    const cmd = { commandId: 'cmd-3', actorDid: 'did:x', action: 'test', payload: {}, jurisdiction: 'MX', epochId: 'e1', timestamp: new Date().toISOString() };
    const factors = { identity: true, authority: true, policy: true, evidence: true, safety: true };
    const result = engine.evaluate(cmd, factors, { temperatureC: 90 });
    expect(result.verdict).toBe('DENY');
    expect(result.safetyViolations).toContainEqual(expect.stringContaining('temperature_exceeded'));
  });

  it('DENY por PII en EU', () => {
    const engine = new M6FailClosedEngine();
    const cmd = { commandId: 'cmd-4', actorDid: 'did:x', action: 'test', payload: {}, jurisdiction: 'EU', epochId: 'e1', timestamp: new Date().toISOString() };
    const factors = { identity: true, authority: true, policy: true, evidence: true, safety: true };
    const result = engine.evaluate(cmd, factors, { piiDetected: true, jurisdiction: 'EU' });
    expect(result.verdict).toBe('DENY');
    expect(result.safetyViolations.some((v: string) => v.includes('pii_detected'))).toBe(true);
  });

  it('SAFE-HALT por chain rota', () => {
    const engine = new M6FailClosedEngine();
    const cmd = { commandId: 'cmd-5', actorDid: 'did:x', action: 'test', payload: {}, jurisdiction: 'MX', epochId: 'e1', timestamp: new Date().toISOString() };
    const factors = { identity: true, authority: true, policy: true, evidence: true, safety: true };
    const result = engine.evaluate(cmd, factors, { chainValid: false });
    expect(result.verdict).toBe('DENY');
    expect(result.safetyViolations).toContainEqual(expect.stringContaining('chain_integrity_failure'));
  });

  it('SAFE-HALT por epoch expirado', () => {
    const engine = new M6FailClosedEngine(DEFAULT_THRESHOLDS, 1); // 1ms epoch
    const now = Date.now();
    engine.attest(now - 10000); // attest 10s ago
    const cmd = { commandId: 'cmd-6', actorDid: 'did:x', action: 'test', payload: {}, jurisdiction: 'MX', epochId: 'e1', timestamp: new Date().toISOString() };
    const factors = { identity: true, authority: true, policy: true, evidence: true, safety: true };
    const result = engine.evaluate(cmd, factors, {}, now);
    expect(result.verdict).toBe('SAFE_HALT');
    expect(result.safeHalt).toBe(true);
  });

  it('recover requiere admin token correcto', () => {
    const engine = new M6FailClosedEngine(DEFAULT_THRESHOLDS, 1);
    const now = Date.now();
    engine.attest(now - 10000);
    const cmd = { commandId: 'cmd-7', actorDid: 'did:x', action: 'test', payload: {}, jurisdiction: 'MX', epochId: 'e1', timestamp: new Date().toISOString() };
    const factors = { identity: true, authority: true, policy: true, evidence: true, safety: true };
    engine.evaluate(cmd, factors, {}, now);
    expect(engine.isSafeHalt()).toBe(true);
    expect(engine.recover('wrong-token', 'correct-token')).toBe(false);
    expect(engine.isSafeHalt()).toBe(true);
    expect(engine.recover('correct-token', 'correct-token')).toBe(true);
    expect(engine.isSafeHalt()).toBe(false);
  });

  it('describe M6', () => {
    const d = describeM6FailClosed() as { defaultAction: string; factors: string[] };
    expect(d.defaultAction).toBe('DENY');
    expect(d.factors).toContain('SAFETY');
  });
});