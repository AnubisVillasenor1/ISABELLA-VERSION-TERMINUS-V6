#!/usr/bin/env node
/**
 * verify-deploy-gate.mjs — única implementación del gate de producción.
 *
 * Existir porque antes el gate estaba escrito como `node -e '...'` dentro del
 * YAML de deploy-production.yml, y el segundo camino a producción (el job
 * manual de ci.yml) no lo consultaba nunca. Aquí el veredicto es un programa:
 * lo llaman los dos caminos, y lo cubre test/deployment/deploy-gate.test.ts.
 *
 * Lee la evidencia que los jobs de CI publicaron como artefactos y decide:
 *   production-evidence.json → typecheck.ok, tests.failed === 0, gate.ok
 *   security-suite.json      → summary.ok && summary.failed === 0
 *   *.spdx.json              → al menos un SBOM presente
 *
 * Falla cerrado: archivo ausente, JSON ilegible o cualquier afirmación falsa
 * => exit != 0. Nunca imprime el contenido de la evidencia, sólo veredictos.
 *
 * state: engine-generated — revisión humana pendiente.
 */
import fs from 'node:fs';
import path from 'node:path';

export const EVIDENCE_FILE = 'production-evidence.json';
export const SECURITY_FILE = 'security-suite.json';

function problem(list, msg) {
  list.push(msg);
}

/** Veredicto puro sobre el contenido ya leído (null = ausente o ilegible). */
export function evaluateGate({ evidence, security, sbomFiles }) {
  const problems = [];
  if (!evidence) problem(problems, `ausente o ilegible: ${EVIDENCE_FILE}`);
  else {
    if (!(evidence.typecheck && evidence.typecheck.ok === true)) {
      problem(problems, 'typecheck.ok !== true');
    }
    const failed = Number(evidence.tests && evidence.tests.failed);
    if (!Number.isFinite(failed) || failed > 0) {
      problem(problems, `tests.failed=${Number.isFinite(failed) ? failed : 'DESCONOCIDO'} (se exige 0)`);
    }
    if (!(evidence.gate && evidence.gate.ok === true)) problem(problems, 'gate.ok !== true');
  }

  if (!security) problem(problems, `ausente o ilegible: ${SECURITY_FILE}`);
  else if (!(security.summary && security.summary.ok === true && Number(security.summary.failed) === 0)) {
    problem(problems, 'security suite no está en verde');
  }

  if (!Array.isArray(sbomFiles) || sbomFiles.length === 0) problem(problems, 'ningún SBOM (.spdx.json) presente');

  return { ok: problems.length === 0, problems };
}

function readJson(file) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return null;
  }
}

export function readDir(dir) {
  const list = fs.existsSync(dir) ? fs.readdirSync(dir) : [];
  return {
    evidence: readJson(path.join(dir, EVIDENCE_FILE)),
    security: readJson(path.join(dir, SECURITY_FILE)),
    sbomFiles: list.filter((f) => f.endsWith('.spdx.json')),
  };
}

function arg(name, fallback) {
  const i = process.argv.indexOf(name);
  return i !== -1 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
}

export function main() {
  const dir = arg('--dir', 'evidence');
  const verdict = evaluateGate(readDir(dir));
  for (const p of verdict.problems) console.error(`[deploy-gate] ${p}`);
  if (!verdict.ok) {
    console.error(`[deploy-gate] GATE RECHAZADO el despliegue desde ${dir}/. exit=1`);
    process.exit(1);
  }
  console.log(`[deploy-gate] GATE OK: evidencia, security suite y SBOM presentes en ${dir}/.`);
  return 0;
}

if (process.argv[1] && path.resolve(process.argv[1]) === import.meta.filename) {
  main();
}
