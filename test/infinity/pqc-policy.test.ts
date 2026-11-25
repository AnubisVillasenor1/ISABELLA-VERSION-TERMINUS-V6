import { describe, expect, it } from 'vitest';
import { resolvePqcPolicy, isPqcConstruction, describePqcPolicy } from '../../src/infinity';

describe('PQC Policy Fabric', () => {
  it('declara PQC no disponible', () => {
    const p = resolvePqcPolicy('classical-only');
    expect(p.pqcAvailable).toBe(false);
    expect(p.classicalAvailable).toBe(true);
    expect(p.effectiveSecurity).toBe('classical');
    expect(p.available).toBe(false);
  });

  it('no activa hybrid aunque se pida (PQC no disponible)', () => {
    const p = resolvePqcPolicy('hybrid-x25519-mlkem');
    expect(p.effectiveSecurity).toBe('classical');
    expect(p.available).toBe(false);
  });

  it('rechaza construcción inválida', () => {
    const p = resolvePqcPolicy('unknown');
    expect(p.construction).toBe('classical-only');
  });

  it('isPqcConstruction valida', () => {
    expect(isPqcConstruction('classical-only')).toBe(true);
    expect(isPqcConstruction('nope')).toBe(false);
  });

  it('describe PQC', () => {
    const d = describePqcPolicy() as { pqcAvailable: boolean };
    expect(d.pqcAvailable).toBe(false);
  });
});