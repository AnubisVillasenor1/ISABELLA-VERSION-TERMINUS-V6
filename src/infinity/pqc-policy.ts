/**
 * ISABELLA VILLASEÑOR AI™ — Post-Quantum Cryptography (PQC) Policy Fabric.
 * state: draft | engine-generated.
 *
 * Declara la política de criptografía post-cuántica (FIPS 203/204/205) y las
 * construcciones híbridas. NO implementa los algoritmos (ML-KEM, ML-DSA,
 * SLH-DSA): requieren CIRCL (Go) o liboqs (C), no disponibles en Node.js.
 *
 * Este módulo es un REGISTRO de política: declara qué algoritmos se usarían,
 * en qué orden, y con qué combinadores. `available: false` hasta que se
 * instale un proveedor PQC real.
 *
 * Inspiración: CIRCL (Cloudflare), NIST FIPS 203/204/205.
 */
import { digest } from './skills';

export const PQC_ALGORITHMS = {
  kem: { name: 'ML-KEM', standard: 'FIPS 203', alias: 'Kyber', provider: 'circl (Go) / liboqs (C)', available: false },
  dsa: { name: 'ML-DSA', standard: 'FIPS 204', alias: 'Dilithium', provider: 'circl (Go) / liboqs (C)', available: false },
  slh: { name: 'SLH-DSA', standard: 'FIPS 205', alias: 'SPHINCS+', provider: 'circl (Go) / liboqs (C)', available: false },
} as const;

export const CLASSICAL_ALGORITHMS = {
  x25519: { name: 'X25519', type: 'ECDH', provider: 'node:crypto', available: true },
  ed25519: { name: 'Ed25519', type: 'signature', provider: 'node:crypto', available: true },
} as const;

export type PqcConstruction = 'hybrid-x25519-mlkem' | 'hybrid-ed25519-mldsa' | 'classical-only';

export interface PqcPolicy {
  readonly construction: PqcConstruction;
  readonly classicalAvailable: boolean;
  readonly pqcAvailable: boolean;
  readonly effectiveSecurity: 'classical' | 'hybrid' | 'pqc-only';
  readonly algorithms: readonly string[];
  readonly note: string;
  readonly executionPerformed: false;
  readonly available: false | true;
}

export function resolvePqcPolicy(construction: unknown): PqcPolicy {
  const valid = construction === 'hybrid-x25519-mlkem' || construction === 'hybrid-ed25519-mldsa' || construction === 'classical-only';
  const c: PqcConstruction = valid ? (construction as PqcConstruction) : 'classical-only';

  const pqcAvailable = false; // No PQC library installed
  const classicalAvailable = true;

  let effectiveSecurity: 'classical' | 'hybrid' | 'pqc-only' = 'classical';
  const algorithms: string[] = ['X25519', 'Ed25519'];

  if (c === 'hybrid-x25519-mlkem' && pqcAvailable) {
    effectiveSecurity = 'hybrid';
    algorithms.push('ML-KEM (FIPS 203)');
  } else if (c === 'hybrid-ed25519-mldsa' && pqcAvailable) {
    effectiveSecurity = 'hybrid';
    algorithms.push('ML-DSA (FIPS 204)');
  }

  return {
    construction: c,
    classicalAvailable,
    pqcAvailable,
    effectiveSecurity,
    algorithms,
    note: pqcAvailable
      ? 'PQC disponible. Construcción híbrida activa.'
      : 'PQC NO disponible (sin librería CIRCL/liboqs). Solo seguridad clásica. Instalar @noble/post-quantum o liboqs para activar.',
    executionPerformed: false,
    available: pqcAvailable,
  };
}

export function isPqcConstruction(value: unknown): value is PqcConstruction {
  return value === 'hybrid-x25519-mlkem' || value === 'hybrid-ed25519-mldsa' || value === 'classical-only';
}

export function describePqcPolicy(): Readonly<Record<string, unknown>> {
  return {
    algorithms: PQC_ALGORITHMS,
    classical: CLASSICAL_ALGORITHMS,
    constructions: ['hybrid-x25519-mlkem', 'hybrid-ed25519-mldsa', 'classical-only'],
    pqcAvailable: false,
    note: 'PQC declarativo. Los algoritmos requieren CIRCL (Go) o liboqs (C). No hay binding npm estable.',
    executionPerformed: false,
  };
}