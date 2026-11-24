import { describe, expect, it } from 'vitest';
import {
  IncidentRegistry,
  CrownOffice,
  StandardsRegistry,
  DataProvenance,
  CapacityRegistry,
  ForumRegistry,
  generateAuditReport,
  exportInterop,
  summarizeGovernanceEvolution,
  describeGovernanceEvolution,
} from '../../src/infinity';

describe('Governance Evolution (UN report)', () => {
  it('reporta incidente y genera risk pulse', () => {
    const incidents = new IncidentRegistry();
    incidents.report('tenant1', 'bias', 3, 12, ['group-a'], 'open', 'DENY');
    incidents.report('tenant1', 'privacy', 5, 6, ['group-b'], 'open', 'DENY');
    expect(incidents.count()).toBe(2);
    const pulse = incidents.riskPulse(18);
    expect(pulse.length).toBeGreaterThan(0);
    const heat = incidents.heatMap();
    expect(heat.length).toBeGreaterThan(0);
  });

  it('rechaza taxonomy inválida y severity fuera de rango', () => {
    const incidents = new IncidentRegistry();
    expect(() => incidents.report('t', 'unknown', 3, 12, [], 'open', 'DENY')).toThrow();
    expect(() => incidents.report('t', 'bias', 0, 12, [], 'open', 'DENY')).toThrow();
    expect(() => incidents.report('t', 'bias', 6, 12, [], 'open', 'DENY')).toThrow();
  });

  it('CROWN fail-closed: ALLOW solo si todos los factores son true', () => {
    const crown = new CrownOffice();
    const allow = crown.decide('action1', 'did:x', true, true, true, true, true);
    expect(allow.verdict).toBe('ALLOW');
    const deny = crown.decide('action2', 'did:x', true, true, false, true, true);
    expect(deny.verdict).toBe('DENY');
    const fc = crown.failClosed('action3', 'did:x', 'reason');
    expect(fc.verdict).toBe('DENY');
    expect(fc.overrideHuman).toBe('reason');
  });

  it('registra estándares y gaps', () => {
    const standards = new StandardsRegistry();
    standards.register('std-1', 'ISO', 'ISO 42001', 'adopted', 'gap in monitoring');
    standards.register('std-2', 'NIST', 'NIST AI RMF', 'reviewed', null);
    expect(standards.list().length).toBe(2);
    expect(standards.gaps().length).toBe(1);
  });

  it('registra data assets y diversidad', () => {
    const data = new DataProvenance();
    data.register('a1', 'source1', 'explicit', 'es', 0.8);
    data.register('a2', 'source2', 'explicit', 'en', 0.6);
    data.register('a3', 'source3', 'explicit', 'es', 0.9);
    const report = data.diversityReport();
    expect(report.length).toBe(2);
    const es = report.find((r) => r.language === 'es');
    expect(es?.count).toBe(2);
  });

  it('registra capacity modules y filtra español/ALC', () => {
    const cap = new CapacityRegistry();
    cap.register('m1', 'Module A', true, true, [1, 2]);
    cap.register('m2', 'Module B', false, true, [3]);
    expect(cap.spanishModules().length).toBe(1);
    expect(cap.alcAlignedModules().length).toBe(2);
  });

  it('registra foros y filtra upcoming', () => {
    const forums = new ForumRegistry();
    forums.register('f1', 'Forum 1', '2099-01-01T00:00:00.000Z');
    forums.register('f2', 'Forum 2', '2020-01-01T00:00:00.000Z');
    expect(forums.list().length).toBe(2);
    expect(forums.upcoming().length).toBe(1);
  });

  it('genera audit report con productionSafe=false', () => {
    const incidents = new IncidentRegistry();
    const crown = new CrownOffice();
    const standards = new StandardsRegistry();
    const data = new DataProvenance();
    const capacity = new CapacityRegistry();
    const forums = new ForumRegistry();
    const report = generateAuditReport(incidents, crown, standards, data, capacity, true, null);
    expect(report.productionSafe).toBe(false);
    expect(report.chainValid).toBe(true);
  });

  it('exportInterop retorna formato json', () => {
    const exp = exportInterop('incidents', { count: 5 });
    expect(exp.format).toBe('json');
    expect(exp.type).toBe('incidents');
  });

  it('summarizeGovernanceEvolution retorna productionSafe=false', () => {
    const incidents = new IncidentRegistry();
    const crown = new CrownOffice();
    const standards = new StandardsRegistry();
    const data = new DataProvenance();
    const capacity = new CapacityRegistry();
    const forums = new ForumRegistry();
    const summary = summarizeGovernanceEvolution(incidents, crown, standards, data, capacity, forums);
    expect(summary.productionSafe).toBe(false);
    expect(summary.executionPerformed).toBe(false);
  });

  it('describeGovernanceEvolution retorna 10 items', () => {
    const d = describeGovernanceEvolution() as { items: number; productionSafe: boolean };
    expect(d.items).toBe(10);
    expect(d.productionSafe).toBe(false);
  });
});