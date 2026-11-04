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
 *   production-evidence.json → headCommit == SHA, typecheck.ok, tests parsed + failed === 0 + total ≥ 1, gate.ok
 *   security-suite.json      → summary.ok && summary.failed === 0
 *   *.spdx.json              → al menos un documento SPDX-2.x parseable y ligado al SHA
 *
 * El SHA bajo despliegue se pasa con `--sha`, o se toma de `THE_SHA`
 * (deploy-production.yml) / `GITHUB_SHA` (ci.yml). Sin SHA conocido el gate
 * rechaza: aceptar "cualquier evidencia que esté por ahí" es exactamente el
 * agujero por el que un artefacto de otra corrida desplegaría otro commit.
 *
 * Falla cerrado: archivo ausente, JSON ilegible o cualquier afirmación falsa
 * => exit != 0. Nunca imprime el contenido de la evidencia, sólo veredictos.
 *
 * state: engine-generated — revisión humana pendiente.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const EVIDENCE_FILE = 'production-evidence.json';
export const SECURITY_FILE = 'security-suite.json';
export const SBOM_SUFFIX = '.spdx.json';

/** Un commit git completo, en minúsculas. */
const FULL_SHA = /^[0-9a-f]{40}$/;

function problem(list, msg) {
  list.push(msg);
}

/**
 * SHA que se va a desplegar, en el orden de autoridad: flag explícito > THE_SHA
 * (el `workflow_run` de deploy-production pone el head_sha del run de CI, que
 * NO coincide con GITHUB_SHA de ese workflow) > GITHUB_SHA.
 */
export function expectedShaFrom(argv, env) {
  const i = argv.indexOf('--sha');
  const flag = i !== -1 ? argv[i + 1] : undefined;
  const candidate = flag || env.THE_SHA || env.GITHUB_SHA || '';
  return String(candidate).trim().toLowerCase();
}

/** Un SBOM sirve cuando es un documento SPDX-2.x atado al SHA esperado. */
function sbomProblems(sbom, sha) {
  const p = [];
  const doc = sbom ? sbom.doc : null;
  if (!doc || typeof doc !== 'object' || Array.isArray(doc)) {
    p.push('no es un JSON parseable');
    return p;
  }
  if (typeof doc.spdxVersion !== 'string' || !/^SPDX-2\./.test(doc.spdxVersion)) {
    p.push(`spdxVersion=${doc.spdxVersion || 'AUSENTE'} (se exige SPDX-2.x)`);
  }
  if (doc.SPDXID !== 'SPDXRef-DOCUMENT') p.push('SPDXID del documento != SPDXRef-DOCUMENT');
  if (!Array.isArray(doc.packages) || doc.packages.length === 0) p.push('packages ausente o vacío');
  if (
    !Array.isArray(doc.relationships) ||
    !doc.relationships.some((r) => r && r.relationshipType === 'DESCRIBES')
  ) {
    p.push('sin relación DESCRIBES: el documento no describe ningún componente');
  }
  if (FULL_SHA.test(sha)) {
    const ns = String(doc.documentNamespace || '');
    if (!ns.toLowerCase().endsWith('/commit/' + sha)) {
      problem(p, `documentNamespace no termina en /commit/${sha}`);
    }
    if (!String(doc.name || '').toLowerCase().endsWith('-' + sha)) {
      problem(p, `name no termina en -${sha}`);
    }
  }
  return p;
}

/** Veredicto puro sobre el contenido ya leído (null = ausente o ilegible). */
export function evaluateGate({ evidence, security, sboms, expectedSha }) {
  const problems = [];
  const sha = String(expectedSha || '').trim().toLowerCase();

  if (!FULL_SHA.test(sha)) {
    problem(problems, 'no se conoce el SHA bajo despliegue: pasa --sha o define THE_SHA/GITHUB_SHA');
  }

  if (!evidence) problem(problems, `ausente o ilegible: ${EVIDENCE_FILE}`);
  else {
    if (!(evidence.typecheck && evidence.typecheck.ok === true)) {
      problem(problems, 'typecheck.ok !== true');
    }
    // `tests.failed` tiene que ser el número 0 *de un reporte parseado*: sin
    // `parsed` el contador vale 0 por defecto y "cero fallos" significaría
    // "cero pruebas ejecutadas". Se exige también que la suite afirme éxito.
    const tests = evidence.tests;
    if (!tests || tests.parsed !== true) {
      problem(problems, 'tests.parsed !== true: sin reporte parseable no se puede afirmar que la suite corrió');
    } else {
      if (!Number.isInteger(tests.failed) || tests.failed > 0) {
        problem(problems, `tests.failed=${typeof tests.failed === 'number' ? tests.failed : 'DESCONOCIDO'} (se exige el número 0)`);
      }
      if (!Number.isInteger(tests.total) || tests.total < 1) {
        problem(problems, `tests.total=${typeof tests.total === 'number' ? tests.total : 'DESCONOCIDO'} (una suite que no ejecuta nada no aprueba nada)`);
      }
      if (tests.success !== true) problem(problems, 'tests.success !== true');
    }
    if (!(evidence.gate && evidence.gate.ok === true)) problem(problems, 'gate.ok !== true');
    const produced = String(evidence.headCommit || '').trim().toLowerCase();
    if (FULL_SHA.test(sha) && produced !== sha) {
      problem(problems, `la evidencia es de ${produced || 'un commit sin registrar'}, no de ${sha}`);
    }
  }

  if (!security) problem(problems, `ausente o ilegible: ${SECURITY_FILE}`);
  else if (!(security.summary && security.summary.ok === true && Number(security.summary.failed) === 0)) {
    problem(problems, 'security suite no está en verde');
  }

  const list = Array.isArray(sboms) ? sboms : [];
  if (list.length === 0) problem(problems, `ningún SBOM (${SBOM_SUFFIX}) presente`);
  else if (!list.some((s) => sbomProblems(s, sha).length === 0)) {
    for (const s of list) {
      for (const p of sbomProblems(s, sha)) problem(problems, `${(s && s.file) || 'sbom'}: ${p}`);
    }
  }

  return { ok: problems.length === 0, problems };
}

function readJson(file) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return null;
  }
}

/** Directorio de artefactos tal como lo dejan los `download-artifact` de los workflows. */
export function readDir(dir) {
  const list = fs.existsSync(dir) ? fs.readdirSync(dir) : [];
  const sbomFiles = list.filter((f) => f.endsWith(SBOM_SUFFIX));
  return {
    evidence: readJson(path.join(dir, EVIDENCE_FILE)),
    security: readJson(path.join(dir, SECURITY_FILE)),
    // El contenido se valida, no la presencia del nombre de archivo.
    sboms: sbomFiles.map((file) => ({ file, doc: readJson(path.join(dir, file)) })),
  };
}

function arg(name, fallback) {
  const i = process.argv.indexOf(name);
  return i !== -1 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
}

export function main() {
  const dir = arg('--dir', 'evidence');
  const sha = expectedShaFrom(process.argv, process.env);
  const verdict = evaluateGate({ ...readDir(dir), expectedSha: sha });
  for (const p of verdict.problems) console.error(`[deploy-gate] ${p}`);
  if (!verdict.ok) {
    console.error(`[deploy-gate] GATE RECHAZADO el despliegue desde ${dir}/. exit=1`);
    return 1;
  }
  console.log(`[deploy-gate] GATE OK: ${sha.slice(0, 12)} evidenciado, security suite en verde y SPDX ligado al commit.`);
  return 0;
}

// `import.meta.filename` era undefined en Node < 20.11: la comparación fallaba en
// silencio y el step de CI terminaba en 0 sin ejecutar ninguna comprobación.
const invokedAsCommand =
  process.argv[1] !== undefined && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invokedAsCommand) {
  process.exit(main());
}
