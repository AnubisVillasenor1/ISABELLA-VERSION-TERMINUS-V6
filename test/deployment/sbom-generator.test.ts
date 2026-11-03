// state: engine-generated — revisión humana pendiente.
/**
 * El gate de producción (deploy-production.yml) exige un `.spdx.json` en la evidencia.
 * Estas pruebas garantizan que el generador lo produce de verdad a partir del lockfile
 * del repositorio y que su estructura SPDX es válida, no que "está documentado".
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  buildSbom,
  parsePackageKey,
  readLockfilePackages,
  spdxId,
} from '../../scripts/generate-sbom.mjs';

const SPDX_ID = /^SPDXRef-[A-Za-z0-9.-]+$/;

describe('parsePackageKey: formas del lockfile v9', () => {
  it('lee nombre y versión con y sin scope', () => {
    expect(parsePackageKey('abbrev@3.0.1')).toEqual({ name: 'abbrev', version: '3.0.1' });
    expect(parsePackageKey('@ai-sdk/gateway@4.0.110')).toEqual({
      name: '@ai-sdk/gateway',
      version: '4.0.110',
    });
  });

  it('ignora el sufijo de peers y el registro de las resoluciones externas', () => {
    expect(parsePackageKey('zod@4.6.6(typescript@5.9.3)')).toEqual({
      name: 'zod',
      version: '4.6.6',
    });
    expect(parsePackageKey('is-promise@2.2.2@https://registry.npmjs.org/is-promise/-/is-promise-2.2.2.tgz')).toEqual(
      { name: 'is-promise', version: '2.2.2' }
    );
  });

  it('rechaza claves sin versión separable', () => {
    expect(parsePackageKey('sin-version')).toBeNull();
  });
});

describe('spdxId', () => {
  it('colapsa los caracteres que SPDX no admite', () => {
    expect(spdxId('@scope/pkg@1.0.0')).toBe('SPDXRef-Package-scope-pkg-1.0.0');
    expect(spdxId('a b/c@d')).toMatch(SPDX_ID);
  });
});

describe('generador sobre el lockfile real', () => {
  const entries = readLockfilePackages(readFileSync(new URL('../../pnpm-lock.yaml', import.meta.url), 'utf8'));
  const sbom = buildSbom(entries, {
    version: '0.0.0-test',
    ref: 'a'.repeat(40),
    registry: 'https://registry.npmjs.org/',
    repository: 'OsoPanda1/ISABELLA-VERSION-TERMINUS-V6',
    created: '2026-10-30T00:00:00Z',
  });

  it('resuelve todas las entradas del lockfile', () => {
    expect(entries.length).toBeGreaterThan(400);
    // Ninguna clave se descarta en silencio: todo `packages:` debe ser parseable.
    const unparsed = entries.filter((entry) => parsePackageKey(entry.key) === null);
    expect(unparsed.map((entry) => entry.key)).toEqual([]);
    // Un `name@version` con distinto contexto de peers es el mismo paquete SPDX.
    const unique = new Set(
      entries.map((entry) => {
        const parsed = parsePackageKey(entry.key)!;
        return spdxId(`${parsed.name}@${parsed.version}`);
      })
    );
    // raíz + dependencias
    expect(sbom.packages.length).toBe(unique.size + 1);
  });

  it('produce un documento SPDX 2.3 que describe el paquete raíz', () => {
    expect(sbom.spdxVersion).toBe('SPDX-2.3');
    expect(sbom.SPDXID).toBe('SPDXRef-DOCUMENT');
    expect(sbom.dataLicense).toBe('CC0-1.0');
    expect(sbom.creationInfo.creators.some((c) => c.startsWith('Tool: generate-sbom.mjs'))).toBe(true);
    const described = sbom.relationships.find((r) => r.relationshipType === 'DESCRIBES');
    expect(described?.spdxElementId).toBe('SPDXRef-DOCUMENT');
    expect(sbom.packages.find((p) => p.SPDXID === described?.relatedSpdxElement)?.name).toBe(
      'isabella-terminus-v6'
    );
  });

  it('cada SPDXID es válido y único, y toda relación apunta a un paquete existente', () => {
    const ids = sbom.packages.map((p) => p.SPDXID);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(id).toMatch(SPDX_ID);
    // El DOCUMENT no es un paquete, pero sí un emisor válido de DESCRIBES.
    const known = new Set([...ids, 'SPDXRef-DOCUMENT']);
    for (const rel of sbom.relationships) {
      expect(known.has(rel.spdxElementId), rel.spdxElementId).toBe(true);
      expect(known.has(rel.relatedSpdxElement), rel.relatedSpdxElement).toBe(true);
    }
  });

  it('traslada la integridad sha512 del lockfile a checksum SPDX en hexadecimal', () => {
    const withSum = sbom.packages.filter((p) => p.checksums);
    expect(withSum.length).toBeGreaterThan(0);
    for (const pkg of withSum) {
      expect(pkg.checksums?.[0]?.algorithm).toBe('SHA512');
      expect(pkg.checksums?.[0]?.checksumValue).toMatch(/^[0-9a-f]{128}$/);
    }
  });

  it('ningún paquete afirma una licencia que no conozca', () => {
    for (const pkg of sbom.packages.filter((p) => p.name !== 'isabella-terminus-v6')) {
      expect(pkg.licenseConcluded).toBe('NOASSERTION');
      expect(pkg.externalRefs?.[0]?.referenceLocator).toMatch(/^pkg:npm\/(%40)?[^/]+\/?[^/]+@\d/);
    }
  });

  it('falla cerrado si el lockfile no tiene sección packages', () => {
    expect(() => readLockfilePackages('lockfileVersion: "6.0"\ndependencies: {}\n')).toThrow(
      /SBOM_GENERATION_FAILED/
    );
  });
});
