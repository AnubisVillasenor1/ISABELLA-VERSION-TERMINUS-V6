// state: draft | engine-generated — pruebas del monitor antifrágil Nexus.
import { describe, expect, it } from 'vitest';
import { AntifragileMonitor } from '../../src/nexus/antifragile';

describe('AntifragileMonitor', () => {
  it('abre el circuito tras fallos consecutivos y usa el sustituto', async () => {
    let now = 1_000;
    const monitor = new AntifragileMonitor({
      failureThreshold: 2,
      cooldownMs: 500,
      now: () => now,
    });
    const primary = async (): Promise<string> => {
      throw new Error('down');
    };
    const first = await monitor.guard('provider', primary, async () => 'fallback');
    const second = await monitor.guard('provider', primary, async () => 'fallback');
    expect(first.source).toBe('fallback');
    expect(second.source).toBe('fallback');
    expect(monitor.circuitFor('provider')).toBe('open');

    now += 600;
    expect(monitor.circuitFor('provider')).toBe('half-open');
    const recovered = await monitor.guard(
      'provider',
      async () => 'primary',
      async () => 'fallback'
    );
    expect(recovered.source).toBe('primary');
    expect(monitor.circuitFor('provider')).toBe('closed');
  });

  it('no sondea mientras el circuito está abierto', async () => {
    let now = 1_000;
    const monitor = new AntifragileMonitor({ failureThreshold: 1, cooldownMs: 5_000, now: () => now });
    let calls = 0;
    monitor.record('db', false, 10);
    const result = await monitor.guard(
      'db',
      async () => {
        calls += 1;
        return 'primary';
      },
      async () => 'fallback'
    );
    expect(calls).toBe(0);
    expect(result.source).toBe('fallback');
    expect(result.degraded).toBe(true);
  });

  it('reporta salud y propone reparaciones que exigen aprobación', () => {
    const monitor = new AntifragileMonitor({ failureThreshold: 2, cooldownMs: 60_000 });
    monitor.record('api', true, 20);
    monitor.record('api', false, 30);
    monitor.record('api', false, 30);
    const report = monitor.report();
    expect(report.components.some((component) => component.name === 'api')).toBe(true);
    expect(report.proposals.length).toBeGreaterThan(0);
    expect(report.proposals.every((proposal) => proposal.requiresHumanApproval)).toBe(true);
    expect(report.score).toBeLessThanOrEqual(100);
    expect(report.disclaimer).toContain('certificado');
  });

  it('sin señales declara salud no medida', () => {
    const monitor = new AntifragileMonitor();
    const report = monitor.report();
    expect(report.score).toBe(100);
    expect(report.actions[0]).toContain('no medida');
  });
});
