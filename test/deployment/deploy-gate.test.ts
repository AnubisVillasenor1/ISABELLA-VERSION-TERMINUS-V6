// state: engine-generated — revisión humana pendiente.
/**
 * El gate que decide si un SHA puede desplegarse a producción. Es código, no
 * prosa: estas pruebas fijan cada rechazo, y la última comprobación exige que
 * LOS DOS caminos de despliegue del repositorio llamen a este mismo script
 * (antes el `node -e` vivido dentro de un YAML y el job manual lo saltaba).
 *
 * El punto que cubre el bloque de ataduras al SHA: un artefacto legítimo pero
 * de OTRA corrida no puede aprobar el despliegue de este commit.
 */
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { buildSbom } from '../../scripts/generate-sbom.mjs';
import { evaluateGate, expectedShaFrom, readDir, type GateInput } from '../../scripts/verify-deploy-gate.mjs';

const SHA = 'c0ffee'.padEnd(40, '0');

const goodEvidence = {
  headCommit: SHA,
  typecheck: { ok: true, exitCode: 0 },
  tests: { total: 100, passed: 100, failed: 0, parsed: true, success: true },
  gate: { ok: true },
};
const goodSecurity = { summary: { ok: true, failed: 0 } };

/** El SBOM que de verdad produce el generador del repo: gate y generador pactan. */
function generatedSbom(ref = SHA) {
  const doc = buildSbom([{ key: 'left-pad@1.3.0', integrity: null, tarball: null }], {
    version: '0.0.0-test',
    ref,
    registry: 'https://registry.npmjs.org/',
    repository: 'OsoPanda1/ISABELLA-VERSION-TERMINUS-V6',
    created: '2026-11-02T00:00:00Z',
  });
  return { file: `isabella-${ref}.spdx.json`, doc };
}

function verdict(over: GateInput = {}) {
  return evaluateGate({
    evidence: goodEvidence,
    security: goodSecurity,
    sboms: [generatedSbom()],
    expectedSha: SHA,
    ...over,
  });
}

describe('verify-deploy-gate', () => {
  it('aprueba el SHA sólo con evidencia, security suite y SPDX ligado a él', () => {
    expect(verdict()).toEqual({ ok: true, problems: [] });
  });

  it('rechaza evidencia ausente o ilegible', () => {
    const v = verdict({ evidence: null });
    expect(v.ok).toBe(false);
    expect(v.problems.join(' ')).toMatch(/production-evidence\.json/);
  });

  it('rechaza typecheck no verde, tests fallidos o gate sin cerrar', () => {
    expect(verdict({ evidence: { ...goodEvidence, typecheck: { ok: false } } }).ok).toBe(false);
    expect(verdict({ evidence: { ...goodEvidence, tests: { failed: 3 } } }).ok).toBe(false);
    // Sin contador de tests no se puede afirmar "0 fallos": falla cerrado.
    expect(verdict({ evidence: { ...goodEvidence, tests: {} } }).ok).toBe(false);
    expect(verdict({ evidence: { ...goodEvidence, gate: { ok: false } } }).ok).toBe(false);
  });

  it('rechaza un contador de tests que no es un número', () => {
    // '0' string cumplía el viejo Number(x) === 0 y aprobaba sin evidencia numérica.
    const ceroComoTexto = { total: 100, parsed: true, success: true, failed: '0' } as unknown as {
      total: number;
      parsed: boolean;
      success: boolean;
      failed: number;
    };
    const v = verdict({ evidence: { ...goodEvidence, tests: ceroComoTexto } });
    expect(v.ok).toBe(false);
    expect(v.problems.join(' ')).toMatch(/tests\.failed=DESCONOCIDO/);
  });

  it('rechaza "cero fallos" que en realidad son cero pruebas ejecutadas', () => {
    // production-evidence.mjs deja failed: 0 cuando el reporte de vitest no se parsea:
    // sin exigir parsed/total/success el gate aprobaría un despliegue sin suite.
    const sinReporte = { total: 0, passed: 0, failed: 0, parsed: false, success: false };
    const v = verdict({ evidence: { ...goodEvidence, tests: sinReporte } });
    expect(v.ok).toBe(false);
    expect(v.problems.join(' ')).toMatch(/tests\.parsed !== true/);
    expect(
      verdict({ evidence: { ...goodEvidence, tests: { total: 0, failed: 0, parsed: true, success: true } } }).ok
    ).toBe(false);
    expect(
      verdict({ evidence: { ...goodEvidence, tests: { total: 10, failed: 0, parsed: true, success: false } } }).ok
    ).toBe(false);
  });

  it('rechaza la security suite sin cerrar', () => {
    expect(verdict({ security: null }).ok).toBe(false);
    expect(verdict({ security: { summary: { ok: false, failed: 2 } } }).ok).toBe(false);
    expect(verdict({ security: {} }).ok).toBe(false);
  });

  it('rechaza un despliegue sin SBOM', () => {
    expect(verdict({ sboms: [] }).ok).toBe(false);
    expect(verdict({ sboms: undefined }).ok).toBe(false);
  });

  describe('atadura al SHA', () => {
    it('rechaza actuar sin saber qué commit se despliega', () => {
      for (const sha of [undefined, '', 'main', SHA.slice(0, 12)]) {
        const v = verdict({ expectedSha: sha });
        expect(v.ok, `expectedSha=${JSON.stringify(sha)}`).toBe(false);
        expect(v.problems.join(' ')).toMatch(/no se conoce el SHA/);
      }
    });

    it('rechaza la evidencia producida por otro commit', () => {
      const v = verdict({ evidence: { ...goodEvidence, headCommit: 'd'.repeat(40) } });
      expect(v.ok).toBe(false);
      expect(v.problems.join(' ')).toMatch(/no de c0ffee/);
      expect(verdict({ evidence: { ...goodEvidence, headCommit: undefined } }).ok).toBe(false);
    });

    it('acepta el headCommit en mayúsculas porque un SHA no distingue caso', () => {
      expect(verdict({ evidence: { ...goodEvidence, headCommit: SHA.toUpperCase() } }).ok).toBe(true);
    });

    it('rechaza el SBOM de otra corrida aunque el archivo esté presente', () => {
      const v = verdict({ sboms: [generatedSbom('d'.repeat(40))] });
      expect(v.ok).toBe(false);
      expect(v.problems.join(' ')).toMatch(/documentNamespace|name no termina/);
    });

    it('rechaza un nombre .spdx.json que no es un documento SPDX', () => {
      const basura = [
        { file: 'isabella-x.spdx.json', doc: null },
        { file: 'isabella-y.spdx.json', doc: { spdxVersion: 'SPDX-2.3' } },
        { file: 'isabella-z.spdx.json', doc: 7 },
      ];
      for (const sbom of basura) {
        const v = verdict({ sboms: [sbom] });
        expect(v.ok, sbom.file).toBe(false);
      }
    });

    it('basta con que uno de los SBOM del directorio esté ligado al SHA', () => {
      const v = verdict({ sboms: [generatedSbom('d'.repeat(40)), generatedSbom()] });
      expect(v.ok).toBe(true);
    });

    it('el orden de autoridad del SHA es --sha, THE_SHA, GITHUB_SHA', () => {
      const env = { THE_SHA: 'b'.repeat(40), GITHUB_SHA: 'c'.repeat(40) };
      expect(expectedShaFrom(['node', 'gate'], env)).toBe('b'.repeat(40));
      expect(expectedShaFrom(['node', 'gate', '--sha', 'a'.repeat(40)], env)).toBe('a'.repeat(40));
      expect(expectedShaFrom(['node', 'gate'], { GITHUB_SHA: 'c'.repeat(40) })).toBe('c'.repeat(40));
      expect(expectedShaFrom(['node', 'gate'], {})).toBe('');
    });
  });

  it('lee el directorio de artefactos tal como lo producen los workflows', () => {
    const dir = join(tmpdir(), `deploy-gate-${Date.now()}`);
    mkdirSync(dir, { recursive: true });
    try {
      writeFileSync(join(dir, 'production-evidence.json'), JSON.stringify(goodEvidence));
      writeFileSync(join(dir, 'security-suite.json'), JSON.stringify(goodSecurity));
      writeFileSync(join(dir, `isabella-${SHA}.spdx.json`), JSON.stringify(generatedSbom().doc));
      const bundle = readDir(dir);
      expect(bundle.sboms.map((s) => s.file)).toEqual([`isabella-${SHA}.spdx.json`]);
      expect(evaluateGate({ ...bundle, expectedSha: SHA })).toEqual({ ok: true, problems: [] });
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('ningún camino de despliegue se salta el gate', () => {
    const deployProd = readFileSync(new URL('../../.github/workflows/deploy-production.yml', import.meta.url), 'utf8');
    const ci = readFileSync(new URL('../../.github/workflows/ci.yml', import.meta.url), 'utf8');
    for (const [file, text] of [
      ['deploy-production.yml', deployProd],
      ['ci.yml', ci],
    ]) {
      expect(text, `${file} no invoca scripts/verify-deploy-gate.mjs`).toContain('verify-deploy-gate.mjs');
    }
    // El gate embebido en YAML ya no existe: hay una sola implementación.
    expect(deployProd).not.toMatch(/DEPLOY GATE FAILED/);
    // Y el job manual de ci.yml no puede alcanzar producción sin esos artefactos.
    expect(ci).toMatch(/needs:\s*\[[^\]]*production-evidence[^\]]*\]/);
  });
});
