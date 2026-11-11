#!/usr/bin/env node
/**
 * production-progress.mjs — un solo porcentaje de avance real hacia producción y
 * despliegue, calculado, no estimado. state: auto_generated (borrador hasta revisión
 * humana nominal, AGENTS.md §2).
 *
 * El repositorio se negaba a publicar una cifra agregada porque no existía
 * denominador. Aquí está: cuatro ejes con peso declarado, cada uno medido sobre
 * artefactos observables del árbol o sobre evidencia sellada por una corrida real.
 *
 *   superficie  0.20  rutas HTTP con contrato verificado / rutas totales
 *                       (docs/api/route-inventory.json, generador canónico)
 *   pruebas     0.20  pruebas que pasan / pruebas ejecutadas
 *                       (solo evidencia sellada; nunca se infiere de «deberían pasar»)
 *   capacidades 0.15  registros del registry en implemented|verified|wired / total
 *                       (src/lib/lib/capability-registry.ts)
 *   despliegue  0.45  puertas DEPLOYMENT_GATES en passed / 10
 *                       (src/governance/deployment-gates.ts; sin evidencia = no pasada)
 *
 * El eje de despliegue pesa casi la mitad a propósito: la pregunta es «¿está listo
 * para producción y despliegue?», y esa respuesta no la da el código solo. Un
 * `skipped` o `not_observed` cuenta como no pasada —es el mismo fail-closed que
 * aplica `assessDeployment`— así que la cifra no puede subir por silencio.
 *
 * Uso:
 *   node scripts/production-progress.mjs            # lee y calcula (solo lectura)
 *   node scripts/production-progress.mjs --check    # además exige evidencia vigente
 *   node scripts/production-progress.mjs --record \
 *     --tests-passed=2880 --tests-total=2883 \
 *     --gate=build=passed --gate=smoke=passed ...   # sella la evidencia observada
 *
 * Sin dependencias. La evidencia se guarda en docs/status/production-progress-evidence.json
 * (versionada: para que un lector pueda reproducir la cifra sin re-correr nada). Nombre
 * distinto al de `evidence/production-evidence.json` — artefacto gitignored que emite
 * `scripts/production-evidence.mjs` para ligarlo al SHA en CI — porque miden cosas
 * diferentes: aquel cuenta gates, este sella la corrida observada del porcentaje.
 */
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';

const ROOT = process.cwd();
const EVIDENCE_FILE = path.join(ROOT, 'docs/status/production-progress-evidence.json');
const ROUTE_INVENTORY = 'docs/api/route-inventory.json';
const CAPABILITY_REGISTRY = 'src/lib/lib/capability-registry.ts';

/** Puertas canónicas: la lista cerrada que ya gobierna `assessDeployment`. */
const DEPLOYMENT_GATES = [
  'build',
  'tests',
  'secret_scan',
  'dependency_scan',
  'security_scan',
  'auth_rls',
  'smoke',
  'health_readiness',
  'canary',
  'rollback_plan'
];

const WEIGHTS = { superficie: 0.2, pruebas: 0.2, capacidades: 0.15, despliegue: 0.45 };
const CAPABLE_STATES = new Set(['implemented', 'verified', 'wired']);

const args = process.argv.slice(2);
const mode = args.includes('--record') ? 'record' : args.includes('--check') ? 'check' : 'report';

function readText(relative) {
  try {
    return fs.readFileSync(path.join(ROOT, relative), 'utf8');
  } catch {
    return null;
  }
}

/** Rutas: el inventario canónico dice cuántas tienen contrato verificado. */
function measureSurface() {
  const text = readText(ROUTE_INVENTORY);
  if (!text) return { available: false, total: 0, verified: 0, digest: '' };
  const routes = JSON.parse(text);
  const total = Array.isArray(routes) ? routes.length : Object.keys(routes).length;
  const list = Array.isArray(routes) ? routes : [];
  const verified = list.filter((route) => route && route.verified === true).length;
  return { available: true, total, verified, digest: sha256(text) };
}

/** Capacidades del registry: cuántas están realmente implementadas. */
function measureCapabilities() {
  const text = readText(CAPABILITY_REGISTRY);
  if (!text) return { available: false, total: 0, capable: 0, digest: '' };
  const states = [...text.matchAll(/register\(\s*'[^']+'\s*,\s*'([a-z_]+)'/g)].map((m) => m[1]);
  const total = states.length;
  const capable = states.filter((state) => CAPABLE_STATES.has(state)).length;
  return { available: true, total, capable, digest: sha256(text) };
}

/** Archivos de prueba del árbol: cambian, y con ellos la vigencia de la evidencia. */
function measureTestFiles() {
  const files = [];
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.name.endsWith('.test.ts')) files.push(path.relative(ROOT, full).replace(/\\/g, '/'));
    }
  };
  try {
    walk(path.join(ROOT, 'test'));
  } catch {
    return { total: 0, digest: '' };
  }
  files.sort();
  return { total: files.length, digest: sha256(files.join('\n')) };
}

function sha256(text) {
  return `sha256:${createHash('sha256').update(text).digest('hex')}`;
}

function inputsDigest(surface, capabilities, testFiles) {
  return sha256(
    JSON.stringify({
      routes: surface.digest,
      registry: capabilities.digest,
      tests: testFiles.digest
    })
  );
}

function parseGateArgs(argv) {
  const gates = {};
  for (const arg of argv) {
    const match = /^--gate=([a-z_]+)=(passed|failed|skipped|not_observed)$/.exec(arg);
    if (match) gates[match[1]] = match[2];
  }
  return gates;
}

function numberArg(name, fallback) {
  const match = args.find((arg) => arg.startsWith(`--${name}=`));
  if (!match) return fallback;
  const value = Number(match.slice(match.indexOf('=') + 1));
  return Number.isFinite(value) && value >= 0 ? value : fallback;
}

function readEvidence() {
  const text = readText('docs/status/production-progress-evidence.json');
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

const surface = measureSurface();
const capabilities = measureCapabilities();
const testFiles = measureTestFiles();
const currentDigest = inputsDigest(surface, capabilities, testFiles);

if (mode === 'record') {
  const gates = parseGateArgs(args);
  const missing = DEPLOYMENT_GATES.filter((gate) => !(gate in gates));
  const testsPassed = numberArg('tests-passed', -1);
  const testsTotal = numberArg('tests-total', -1);
  if (testsPassed < 0 || testsTotal <= 0) {
    console.error(
      'RECORD_FAILED: hacen falta --tests-passed y --tests-total medidos en la corrida observada.'
    );
    process.exit(1);
  }
  if (testsPassed > testsTotal) {
    console.error('RECORD_FAILED: --tests-passed no puede exceder --tests-total.');
    process.exit(1);
  }
  const evidence = {
    state: 'auto_generated',
    measuredAt: new Date().toISOString(),
    node: process.version,
    inputsDigest: currentDigest,
    tests: { passed: testsPassed, total: testsTotal, testFiles: testFiles.total },
    gates: Object.fromEntries(
      DEPLOYMENT_GATES.map((gate) => [gate, gates[gate] ?? 'not_observed'])
    ),
    unrecordedGates: missing,
    note: 'Cifra observada en esta máquina. `not_observed` cuenta como no pasada: el ausencia de evidencia no suma avance.'
  };
  fs.mkdirSync(path.dirname(EVIDENCE_FILE), { recursive: true });
  fs.writeFileSync(EVIDENCE_FILE, `${JSON.stringify(evidence, null, 2)}\n`);
  console.log(`[progress] evidencia sellada en docs/status/production-progress-evidence.json (${evidence.measuredAt})`);
  process.exit(0);
}

const evidence = readEvidence();
const stale = !evidence || evidence.inputsDigest !== currentDigest;

const superficieRatio = surface.available ? ratio(surface.verified, surface.total) : 0;
const capacidadesRatio = capabilities.available ? ratio(capabilities.capable, capabilities.total) : 0;
const pruebasRatio =
  evidence && !stale ? ratio(evidence.tests.passed, evidence.tests.total) : 0;
const gatesPassed = evidence && !stale ? DEPLOYMENT_GATES.filter((g) => evidence.gates[g] === 'passed').length : 0;
const despliegueRatio = ratio(gatesPassed, DEPLOYMENT_GATES.length);

function ratio(part, whole) {
  return whole > 0 ? part / whole : 0;
}

const percent =
  Math.round(
    (superficieRatio * WEIGHTS.superficie +
      pruebasRatio * WEIGHTS.pruebas +
      capacidadesRatio * WEIGHTS.capacidades +
      despliegueRatio * WEIGHTS.despliegue) *
      1000
  ) / 10;

const blockers = evidence && !stale
  ? DEPLOYMENT_GATES.filter((gate) => evidence.gates[gate] !== 'passed')
  : DEPLOYMENT_GATES;

console.log(
  [
    `AVANCE_REAL_GLOBAL_PRODUCCION_DESPLIEGUE=${percent.toFixed(1)}%`,
    `  superficie   ${(superficieRatio * 100).toFixed(1)}%  (${surface.verified}/${surface.total} rutas con contrato verificado)`,
    `  pruebas      ${(pruebasRatio * 100).toFixed(1)}%  (${evidence && !stale ? `${evidence.tests.passed}/${evidence.tests.total}` : 'sin evidencia sellada'})`,
    `  capacidades  ${(capacidadesRatio * 100).toFixed(1)}%  (${capabilities.capable}/${capabilities.total} en implemented|verified|wired)`,
    `  despliegue   ${(despliegueRatio * 100).toFixed(1)}%  (${gatesPassed}/${DEPLOYMENT_GATES.length} puertas en passed)`,
    `  pesos declarados: superficie ${WEIGHTS.superficie} · pruebas ${WEIGHTS.pruebas} · capacidades ${WEIGHTS.capacidades} · despliegue ${WEIGHTS.despliegue}`,
    stale
      ? '  EVIDENCIA DESACTUALIZADA O AUSENTE: los ejes de pruebas y despliegue valen 0 hasta volver a medir.'
      : `  evidencia medida ${evidence.measuredAt} con node ${evidence.node}`
  ].join('\n')
);

if (blockers.length) {
  console.log(`  puertas no cerradas: ${blockers.join(', ')}`);
}

if (mode === 'check' && stale) {
  console.error(
    'PROGRESS_CHECK_FAILED: docs/status/production-progress-evidence.json no corresponde al árbol actual.'
  );
  process.exit(1);
}
process.exit(0);
