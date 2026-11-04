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
  readLockfileGraph,
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

describe('grafo real desde snapshots: (no el abanico aplanado raíz→todos)', () => {
  const lockText = readFileSync(new URL('../../pnpm-lock.yaml', import.meta.url), 'utf8');
  const entries = readLockfilePackages(lockText);
  const graph = readLockfileGraph(lockText);
  const sbom = buildSbom(entries, {
    version: '0.0.0-test',
    ref: 'b'.repeat(40),
    registry: 'https://registry.npmjs.org/',
    repository: 'OsoPanda1/ISABELLA-VERSION-TERMINUS-V6',
    created: '2026-11-02T00:00:00Z',
    graph,
  });
  const rootId = spdxId('isabella-terminus-v6@0.0.0-test');
  const componentIds = sbom.packages.filter((p) => p.SPDXID !== rootId).map((p) => p.SPDXID);
  const dependsOn = sbom.relationships.filter((r) => r.relationshipType === 'DEPENDS_ON');
  const fromRoot = dependsOn.filter((r) => r.spdxElementId === rootId);

  /** SPDXID de una referencia del lockfile, o null si el paquete no está declarado. */
  function idOfRef(ref: { name: string; version: string }): string | null {
    const parsed = parsePackageKey(`${ref.name}@${ref.version}`);
    if (parsed === null) return null;
    const id = spdxId(`${parsed.name}@${parsed.version}`);
    return componentIds.includes(id) ? id : null;
  }

  it('lee las directas del importador raíz y los snapshots del lockfile', () => {
    // Si el parser de `importers:` se rompe, el grafo se convierte en una raíz sin
    // dependencias y el SBOM miente: estas dos cifras son el mínimo vivo.
    expect(graph.root.length).toBeGreaterThan(5);
    expect(Object.keys(graph.snapshots).length).toBeGreaterThan(100);
  });

  it('las aristas directas de la raíz son exactamente las dependencias del importador', () => {
    const esperadas = new Set(graph.root.map(idOfRef).filter((id): id is string => id !== null));
    const obtenidas = new Set(fromRoot.map((r) => r.relatedSpdxElement));
    expect(obtenidas).toEqual(esperadas);
    // El abanico viejo pegaba TODOS los componentes a la raíz; eso se acabó.
    expect(obtenidas.size).toBeLessThan(componentIds.length);
  });

  it('hay aristas transitivas: los componentes se alcanzan desde otros componentes', () => {
    const transitivas = dependsOn.filter((r) => r.spdxElementId !== rootId);
    expect(transitivas.length).toBeGreaterThan(100);
  });

  it('el cierre desde la raíz alcanza todos los componentes declarados', () => {
    const adjacency = new Map<string, string[]>();
    for (const r of dependsOn) {
      const list = adjacency.get(r.spdxElementId) ?? [];
      list.push(r.relatedSpdxElement);
      adjacency.set(r.spdxElementId, list);
    }
    const reached = new Set<string>();
    const stack = [rootId];
    while (stack.length > 0) {
      const id = stack.pop() as string;
      for (const next of adjacency.get(id) ?? []) {
        if (!reached.has(next)) {
          reached.add(next);
          stack.push(next);
        }
      }
    }
    const inalcanzables = componentIds.filter((id) => !reached.has(id));
    // Cualquier componente que `snapshots:` no conecte tiene que seguir declarado,
    // como arista OTHER con comment: nunca desaparecer del SBOM.
    for (const id of inalcanzables) {
      const rel = sbom.relationships.find((r) => r.relatedSpdxElement === id && r.relationshipType === 'OTHER');
      expect(rel, `${id} quedó fuera del SBOM sin declaración`).toBeDefined();
      expect(rel?.comment).toMatch(/snapshots:/);
    }
  });

  it('ningún componente queda sin relación que lo declare', () => {
    const declarados = new Set(sbom.relationships.map((r) => r.relatedSpdxElement));
    const huerfanos = componentIds.filter((id) => !declarados.has(id));
    expect(huerfanos).toEqual([]);
  });

  it('no sintetiza URLs de descarga que nadie resolvió', () => {
    // Un lockfile de registro no trae tarball: la identificadora es el PURL, y
    // downloadLocation tiene que decir NOASSERTION en vez de una URL inventada.
    const tarballs = entries.filter((e) => e.tarball !== null);
    const componentes = sbom.packages.filter((p) => p.SPDXID !== rootId);
    expect(componentes.filter((p) => /^https:\/\/registry\.npmjs\.org\//.test(p.downloadLocation))).toEqual([]);
    for (const pkg of componentes) {
      if (tarballs.length === 0) expect(pkg.downloadLocation).toBe('NOASSERTION');
      else expect(['NOASSERTION', ...tarballs.map((e) => e.tarball as string)]).toContain(pkg.downloadLocation);
      expect(pkg.externalRefs?.[0]?.referenceLocator).toMatch(/^pkg:npm\//);
    }
  });

  it('sin grafo declara el inventario plano en vez de fingir dependencias', () => {
    const plano = buildSbom(entries, {
      version: '0.0.0-test',
      ref: 'a'.repeat(40),
      registry: 'https://registry.npmjs.org/',
      repository: 'OsoPanda1/ISABELLA-VERSION-TERMINUS-V6',
      created: '2026-10-30T00:00:00Z',
    });
    expect(plano.relationships.filter((r) => r.relationshipType === 'DEPENDS_ON')).toEqual([]);
    const otros = plano.relationships.filter((r) => r.relationshipType === 'OTHER');
    expect(otros.length).toBeGreaterThan(0);
    expect(otros.every((r) => typeof r.comment === 'string' && r.comment.includes('inventario plano'))).toBe(true);
  });
});
