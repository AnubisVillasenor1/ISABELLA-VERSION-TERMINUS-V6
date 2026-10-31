// state: engine-generated — revisión humana pendiente.
/**
 * El gate que decide si un SHA puede desplegarse a producción. Es código, no
 * prosa: estas pruebas fijan cada rechazo, y la última comprobación exige que
 * LOS DOS caminos de despliegue del repositorio llamen a este mismo script
 * (antes el `node -e` vivido dentro de un YAML y el job manual lo saltaba).
 */
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { evaluateGate, readDir, type GateInput } from '../../scripts/verify-deploy-gate.mjs';

const goodEvidence = {
  typecheck: { ok: true, exitCode: 0 },
  tests: { total: 100, passed: 100, failed: 0 },
  gate: { ok: true },
};
const goodSecurity = { summary: { ok: true, failed: 0 } };
const goodSbom = ['isabella-abc.spdx.json'];

function verdict(over: GateInput = {}) {
  return evaluateGate({
    evidence: goodEvidence,
    security: goodSecurity,
    sbomFiles: goodSbom,
    ...over,
  });
}

describe('verify-deploy-gate', () => {
  it('aprueba el SHA sólo con evidencia, security suite y SBOM en verde', () => {
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

  it('rechaza la security suite sin cerrar', () => {
    expect(verdict({ security: null }).ok).toBe(false);
    expect(verdict({ security: { summary: { ok: false, failed: 2 } } }).ok).toBe(false);
    expect(verdict({ security: {} }).ok).toBe(false);
  });

  it('rechaza un despliegue sin SBOM', () => {
    expect(verdict({ sbomFiles: [] }).ok).toBe(false);
    expect(verdict({ sbomFiles: undefined }).ok).toBe(false);
  });

  it('lee el directorio de artefactos tal como lo producen los workflows', () => {
    const dir = join(tmpdir(), `deploy-gate-${Date.now()}`);
    mkdirSync(dir, { recursive: true });
    try {
      writeFileSync(join(dir, 'production-evidence.json'), JSON.stringify(goodEvidence));
      writeFileSync(join(dir, 'security-suite.json'), JSON.stringify(goodSecurity));
      writeFileSync(join(dir, 'isabella-abc.spdx.json'), '{"spdxVersion":"SPDX-2.3"}');
      const bundle = readDir(dir);
      expect(bundle.sbomFiles).toEqual(['isabella-abc.spdx.json']);
      expect(evaluateGate(bundle)).toEqual({ ok: true, problems: [] });
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
