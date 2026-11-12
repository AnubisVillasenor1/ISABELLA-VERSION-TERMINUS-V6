// state: draft — revisión humana pendiente.
/**
 * INTEGRIDAD DEL REGISTRO DE CAPACIDADES
 * -----------------------------------------------------------------
 * El registro afirma qué está implementado y señala en qué archivo. Un registro
 * cuyos punteros de evidencia no existen deja de ser evidencia y pasa a ser
 * retórica, que es exactamente lo que AGENTS.md §1 prohíbe confundir con
 * capacidad. Esta prueba convierte esa regla en compuerta: toda cadena que tiene
 * forma de ruta del repositorio debe resolver en el árbol actual.
 */
import { existsSync, readdirSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  CAPABILITY_STATES,
  capabilityRegistry,
  type CapabilityRecord,
} from '../../src/lib/lib/capability-registry';

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

/**
 * Una evidencia es «reclamo de ruta» si no contiene espacios y usa separador de
 * directorio. Los restantes («tabla memories», «npm run typecheck/lint/test/build»)
 * son descripciones legibles que esta prueba no intenta resolver.
 */
function isPathClaim(claim: string): boolean {
  return !/\s/.test(claim) && claim.includes('/');
}

function resolveEvidence(claim: string): boolean {
  if (claim.includes('..')) return false;
  if (claim.startsWith('/') || /^[A-Za-z]:/.test(claim)) return false;
  if (!claim.includes('*')) return existsSync(join(REPO_ROOT, claim));
  const regex = new RegExp(
    '^' +
      basename(claim)
        .replace(/[.+?^${}()|[\]\\]/g, '\\$&')
        .replace(/\*/g, '.*') +
      '$'
  );
  try {
    return readdirSync(join(REPO_ROOT, dirname(claim))).some((entry) => regex.test(entry));
  } catch {
    return false;
  }
}

const records = capabilityRegistry.all();

describe('registro de capacidades: evidencia resoluble', () => {
  it('registra capacidades con el taxónomo canónico', () => {
    for (const record of records) {
      expect(CAPABILITY_STATES).toContain(record.state);
    }
  });

  it('no deja registros duplicados', () => {
    const ids = records.map((record) => record.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('toda evidencia con forma de ruta existe en el árbol actual', () => {
    const broken: string[] = [];
    for (const record of records) {
      for (const claim of record.evidence ?? []) {
        if (isPathClaim(claim) && !resolveEvidence(claim)) {
          broken.push(`${record.id} -> ${claim}`);
        }
      }
    }
    // El mensaje lista los punteros muertos: sin ellos el fallo no es accionable.
    expect(broken).toEqual([]);
  });

  it('ninguna capacidad se afirma operativa sin evidencia', () => {
    const unsupported = records
      .filter(
        (record: CapabilityRecord) =>
          record.state !== 'planned' &&
          record.state !== 'unavailable' &&
          !(record.evidence ?? []).length
      )
      .map((record) => record.id);
    expect(unsupported).toEqual([]);
  });
});

describe('registro de capacidades: no-vacuidad', () => {
  it('rechazaría un puntero de evidencia roto', () => {
    // Muestra que la compuerta anterior puede fallar: sin este control, un id con
    // ruta inexistente pasaría igual que un archivo borrado.
    expect(resolveEvidence('src/lib/does-not-exist.ts')).toBe(false);
    expect(resolveEvidence('src/lib/lib/../lib/crown.ts')).toBe(false);
    expect(resolveEvidence('/etc/passwd')).toBe(false);
    expect(resolveEvidence('src/lib/lib/monetization/*')).toBe(true);
  });

  it('los peldaños declarados no-operativos siguen sin afirmarse operativos', () => {
    expect(capabilityRegistry.isOperational('pqc')).toBe(false);
    expect(capabilityRegistry.isOperational('identity.oidc')).toBe(false);
    expect(capabilityRegistry.stateOf('no.existe.nada')).toBe('unavailable');
  });
});
