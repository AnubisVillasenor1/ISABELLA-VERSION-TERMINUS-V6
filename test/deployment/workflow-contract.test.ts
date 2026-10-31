// state: engine-generated — revisión humana pendiente.
/**
 * Contrato ejecutable entre los workflows de GitHub Actions y el repositorio.
 *
 * El hallazgo auditing (#31, findings 1/2/10) decía: el gate de producción
 * descarga artefactos que ningún workflow produce, apunta a un workflow que no
 * existe y confía en actions referenciadas por mutable tag. Nada de eso se
 * arregla escribiéndolo en un docs/: se arregla con un test que falle si vuelve
 * a romperse. Estas cuatro invariantes se verifican sobre los YAML reales:
 *
 *  1. ACTION_PINNED_TO_SHA   — todo `uses:` apunta a un commit SHA de 40 hex.
 *  2. WORKFLOW_RUN_TARGET    — todo `on.workflow_run.workflows:` nombra un
 *                              workflow que existe en `.github/workflows/`.
 *  3. ARTIFACT_PRODUCED      — todo `actions/download-artifact` consume un
 *                              nombre que algún `actions/upload-artifact` publica,
 *                              y el job que lo publica ejecuta el script que
 *                              genera ese artefacto (el script existe en el repo).
 *  4. DEPLOY_NEEDS_EVIDENCE  — el job con `environment: production` depende,
 *                              transitivamente, de todos los jobs que descargan
 *                              la evidencia.
 */
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const WORKFLOWS_DIR = new URL('../../.github/workflows', import.meta.url);

type Step = { uses: string | null; inputs: Record<string, string>; run: string };
type Job = { id: string; needs: string[]; environment: string | null; steps: Step[] };
type Workflow = {
  file: string;
  name: string;
  workflowRunTargets: string[];
  jobs: Job[];
  steps: Step[];
};

function unquote(raw: string): string {
  const t = raw.trim();
  const q = /^(['"])(.*)\1$/.exec(t);
  return q ? q[2] : t;
}

function indentOf(line: string): number {
  return line.length - line.trimStart().length;
}

/** Escáner de líneas: suficiente para el subconjunto de YAML que firmamos. */
function parseWorkflow(file: string, text: string): Workflow {
  const lines = text.split(/\r?\n/);
  const nameMatch = /^name:[ \t]*(.*)$/m.exec(text);
  const workflow: Workflow = {
    file,
    name: nameMatch ? unquote(nameMatch[1]) : file,
    workflowRunTargets: [],
    jobs: [],
    steps: [],
  };

  let section: 'none' | 'on' | 'jobs' = 'none';
  let inWorkflowRun = false;
  let inWorkflowsKey = false;
  let currentJob: Job | null = null;
  let jobIndent = 2;
  // Estado de un step: `- uses:` / `- name:` abren el step.
  let step: Step | null = null;
  let stepItemIndent = -1;
  let inWith = false;
  let inRun = false;
  let inNeedsBlock = false;

  const closeStep = () => {
    if (step !== null) {
      workflow.steps.push(step);
      if (currentJob !== null) currentJob.steps.push(step);
    }
    step = null;
    inWith = false;
    inRun = false;
    stepItemIndent = -1;
  };
  const closeJob = () => {
    closeStep();
    if (currentJob !== null) workflow.jobs.push(currentJob);
    currentJob = null;
  };

  for (const rawLine of lines) {
    const line = rawLine.replace(/\t/g, '  ');
    if (line.trim() === '' || /^\s*#/.test(line)) continue;
    const indent = indentOf(line);
    const trimmed = line.trim();

    // Nivel 0: cambio de sección.
    if (indent === 0) {
      closeJob();
      inWorkflowRun = false;
      inWorkflowsKey = false;
      if (/^on:\s*$/.test(trimmed)) section = 'on';
      else if (/^jobs:\s*$/.test(trimmed)) section = 'jobs';
      else section = 'none';
      continue;
    }

    if (section === 'on') {
      if (/^workflow_run:\s*$/.test(trimmed)) {
        inWorkflowRun = true;
        inWorkflowsKey = false;
        continue;
      }
      if (inWorkflowRun) {
        const inline = /^workflows:\s*\[(.*)\]\s*$/.exec(trimmed);
        if (inline) {
          workflow.workflowRunTargets.push(
            ...inline[1]
              .split(',')
              .map((s) => unquote(s))
              .filter(Boolean)
          );
          inWorkflowRun = false;
          continue;
        }
        if (/^workflows:\s*$/.test(trimmed)) inWorkflowsKey = true;
        else if (inWorkflowsKey && /^-\s+(.+)$/.test(trimmed)) {
          workflow.workflowRunTargets.push(unquote(trimmed.replace(/^-\s+/, '')));
        } else if (inWorkflowsKey) inWorkflowsKey = false;
        else if (indent === 2) inWorkflowRun = false;
      }
      continue;
    }

    if (section !== 'jobs') continue;

    // Job: clave a la indentación estándar de `jobs:` (2 espacios).
    if (indent === jobIndent) {
      closeJob();
      const jobId = /^([\w.-]+):\s*$/.exec(trimmed);
      if (jobId) currentJob = { id: jobId[1], needs: [], environment: null, steps: [] };
      continue;
    }
    if (currentJob === null) continue;

    if (indent === jobIndent + 2) {
      closeStep();
      inNeedsBlock = false;
      const needsInline = /^needs:\s*\[(.*)\]\s*$/.exec(trimmed);
      const needsScalar = /^needs:\s*([\w.-]+)\s*$/.exec(trimmed);
      if (needsInline) currentJob.needs.push(...needsInline[1].split(',').map((s) => unquote(s)).filter(Boolean));
      else if (needsScalar) currentJob.needs.push(needsScalar[1]);
      else if (/^needs:\s*$/.test(trimmed)) inNeedsBlock = true;
      const env = /^environment:\s*(\S+)/.exec(trimmed);
      if (env) currentJob.environment = unquote(env[1]);
      continue;
    }

    // `needs:` en forma de bloque: `- job` a más indentación que la clave.
    if (inNeedsBlock) {
      const dep = /^-\s+(.+)$/.exec(trimmed);
      if (dep) {
        currentJob.needs.push(unquote(dep[1]));
        continue;
      }
      inNeedsBlock = false;
    }

    // Step: item de lista dentro del job (steps: → 6 espacios + '-').
    const item = /^-\s+(\S.*)$/.exec(trimmed);
    if (item && indent > jobIndent + 2) {
      closeStep();
      step = { uses: null, inputs: {}, run: '' };
      stepItemIndent = indent;
      const inlineUses = /^uses:\s*(\S+)(?:\s+.*)?$/.exec(item[1]);
      if (inlineUses) step.uses = unquote(inlineUses[1]);
      continue;
    }

    if (step === null || stepItemIndent < 0) continue;
    const keyIndent = stepItemIndent + 2;

    // Hijos de `with:` (dos espacios más que la clave del step).
    if (inWith && indent === keyIndent + 2) {
      const input = /^([\w-]+):\s*(.*)$/.exec(trimmed);
      if (input) step.inputs[input[1]] = unquote(input[2]);
      continue;
    }
    // Cuerpo de un `run: |` (cualquier indentación mayor que la clave).
    if (inRun && indent > keyIndent) {
      step.run += `${step.run === '' ? '' : '\n'}${trimmed}`;
      continue;
    }
    if (inRun) inRun = false;
    if (indent !== keyIndent) continue;

    const uses = /^uses:\s*(\S+)(?:\s+.*)?$/.exec(trimmed);
    if (uses) {
      step.uses = unquote(uses[1]);
      continue;
    }
    if (/^with:\s*$/.test(trimmed)) {
      inWith = true;
      inRun = false;
      continue;
    }
    if (/^run:/.test(trimmed)) {
      inWith = false;
      inRun = true;
      const inline = /^run:\s*(\S.*)$/.exec(trimmed);
      if (inline) {
        const body = inline[1];
        if (body !== '|' && body !== '>' && body !== '|-' && body !== '>-') step.run = unquote(body);
      }
      continue;
    }
    if (/^[A-Za-z_][\w-]*:/.test(trimmed)) inWith = false;
  }
  closeJob();
  return workflow;
}

/** `${{ ... }}` es variable: se normaliza a `*` para comparar plantillas. */
function template(name: string): string {
  return name.replace(/\$\{\{[^}]*\}\}/g, '*');
}

function templateToRegex(name: string): RegExp {
  const escaped = template(name).replace(/[.*+?^${}()|[\]\\]/g, (c) => (c === '*' ? '\u0000' : '\\' + c));
  return new RegExp('^' + escaped.split('\u0000').join('.*') + '$');
}

const UPLOAD_RE = /upload-artifact/;
const DOWNLOAD_RE = /download-artifact/;

const packageScripts = JSON.parse(
  readFileSync(new URL('../../package.json', import.meta.url), 'utf8')
).scripts as Record<string, string>;

/** Artefactos que el gate de producción exige, y el script del repo que los crea. */
const EVIDENCE_PRODUCERS = [
  { artifact: /^production-evidence/, script: 'scripts/production-evidence.mjs' },
  { artifact: /^security-suite/, script: 'scripts/security-suite.mjs' },
  { artifact: /^sbom/, script: 'scripts/generate-sbom.mjs' },
];

/** ¿Este step es un `upload-artifact` de uno de los artefactos del gate? */
function matchesProducer(step: Step) {
  if (step.uses === null || !UPLOAD_RE.test(step.uses)) return null;
  const name = String(step.inputs.name ?? '');
  return EVIDENCE_PRODUCERS.find((e) => e.artifact.test(name)) ?? null;
}

/** ¿Este step ejecuta el script? Directamente (`node scripts/x.mjs`) o vía npm
 *  script cuyo destino en package.json sea ese mismo archivo. */
function runsScript(step: Step, script: string): boolean {
  const file = script.split('/').pop() as string;
  if (step.run.includes(script) || step.run.includes(file)) return true;
  return Object.entries(packageScripts).some(
    ([name, command]) => step.run.includes(name) && command.includes(file)
  );
}

function loadWorkflows(): Workflow[] {
  const dir = WORKFLOWS_DIR.pathname.replace(/^\/([A-Za-z]:)/, '$1');
  return readdirSync(dir)
    .filter((f) => f.endsWith('.yml') || f.endsWith('.yaml'))
    .sort()
    .map((f) => parseWorkflow(f, readFileSync(dir + '/' + f, 'utf8')));
}

const workflows = loadWorkflows();
const allSteps = workflows.flatMap((w) => w.steps);

describe('contrato de workflows de producción', () => {
  it('carga los workflows reales del repositorio', () => {
    expect(workflows.length).toBeGreaterThanOrEqual(4);
    expect(workflows.map((w) => w.file)).toContain('deploy-production.yml');
    expect(workflows.map((w) => w.file)).toContain('ci.yml');
  });

  it('todo action usado está fijado a un SHA de 40 hex (no a un tag mutable)', () => {
    const unpinned = allSteps
      .filter((s) => s.uses !== null && !s.uses.startsWith('./') && !s.uses.startsWith('docker://'))
      .filter((s) => !/@[0-9a-f]{40}$/.test(s.uses!))
      .map((s) => s.uses);
    expect(unpinned, 'actions sin fijar: ' + unpinned.join(', ')).toEqual([]);
  });

  it('todo workflow disparado por workflow_run existe realmente', () => {
    const names = new Set(workflows.map((w) => w.name));
    const dangling: string[] = [];
    for (const w of workflows) {
      for (const target of w.workflowRunTargets) {
        if (!names.has(target)) dangling.push(`${w.file} -> "${target}"`);
      }
    }
    expect(dangling, 'on.workflow_run.workflows apunta a nombres inexistentes').toEqual([]);
  });

  it('todo artefacto descargado es publicado por algún workflow', () => {
    const uploadedNames = allSteps
      .filter((s) => s.uses !== null && UPLOAD_RE.test(s.uses))
      .map((s) => String(s.inputs.name ?? ''));
    const downloads = allSteps.filter((s) => s.uses !== null && DOWNLOAD_RE.test(s.uses));
    expect(downloads.length, 'ningún workflow descarga artefactos').toBeGreaterThan(0);
    const orphans = downloads
      .map((s) => String(s.inputs.name ?? ''))
      .filter((name) => !uploadedNames.some((u) => templateToRegex(u).test(template(name))));
    expect(
      orphans,
      'download-artifact consume nombres que nadie sube'
    ).toEqual([]);
  });

  it('el job que publica un artefacto ejecuta el script que lo genera', () => {
    const uploadsEvidence = (j: Job) => j.steps.some((s) => matchesProducer(s) !== null);
    const producers = workflows
      .flatMap((w) => w.jobs.map((j) => ({ w, j })))
      .filter(({ j }) => uploadsEvidence(j));
    // La evidencia de producción tiene que salir de scripts reales del repo.
    const ids = producers.map(({ w, j }) => `${w.file}#${j.id}`).sort();
    expect(ids).toEqual(['ci.yml#production-evidence', 'ci.yml#sbom', 'ci.yml#security-scan']);
    for (const { w, j } of producers) {
      for (const s of j.steps) {
        const spec = matchesProducer(s);
        if (spec === null) continue;
        expect(
          existsSync(new URL(`../../${spec.script}`, import.meta.url)),
          `falta ${spec.script} invocado por ${w.file}/${j.id}`
        ).toBe(true);
        expect(
          j.steps.some((x) => runsScript(x, spec.script)),
          `${w.file}/${j.id} sube ${String(s.inputs.name)} sin ejecutar ${spec.script}`
        ).toBe(true);
      }
    }
  });

  it('el job de producción depende (directa o transitivamente) de la verificación de evidencia', () => {
    const byId = new Map<string, Job>();
    for (const w of workflows) for (const j of w.jobs) byId.set(`${w.file}#${j.id}`, j);

    const downloadsEvidence = (j: Job) => j.steps.some((s) => s.uses !== null && DOWNLOAD_RE.test(s.uses!));
    const runsTheGate = (j: Job) => j.steps.some((s) => s.run.includes('verify-deploy-gate.mjs'));
    const uploadsEvidence = (j: Job) => j.steps.some((s) => matchesProducer(s) !== null);
    // Un `workflow_run` no puede heredar `needs` de otro workflow: el equivalente
    // es que el job valide explícitamente que el run de CI que produjo la
    // evidencia fue `success` en el SHA exacto.
    const validatesSourceRun = (j: Job) =>
      j.steps.some((s) => s.run.includes('conclusion') && s.run.includes('success'));

    const deployJobs = [...byId.entries()].filter(([, j]) => j.environment === 'production');
    expect(deployJobs.length, 'ningún job declara environment: production').toBeGreaterThan(0);
    expect(
      [...byId.values()].filter(downloadsEvidence).length,
      'ningún job descarga la evidencia'
    ).toBeGreaterThan(0);
    expect(
      [...byId.values()].filter(runsTheGate).length,
      'verify-deploy-gate.mjs no lo ejecuta ningún job'
    ).toBeGreaterThanOrEqual(2);

    const closure = (job: Job, seen = new Set<string>()): Set<string> => {
      const fileOf = (id: string) => {
        for (const w of workflows) if (w.jobs.some((j) => j.id === id)) return w.file;
        return null;
      };
      for (const n of job.needs) {
        const key = `${fileOf(n)}#${n}`;
        if (seen.has(key)) continue;
        seen.add(key);
        const dep = byId.get(key);
        if (dep) closure(dep, seen);
      }
      return seen;
    };

    for (const [key, job] of deployJobs) {
      const reachable = closure(job);
      const neighbours = [...reachable].map((k) => byId.get(k)).filter((j): j is Job => Boolean(j));

      expect(
        downloadsEvidence(job) || neighbours.some(downloadsEvidence),
        `${key} despliega sin que nadie descargue la evidencia del SHA`
      ).toBe(true);
      expect(
        runsTheGate(job) || neighbours.some(runsTheGate),
        `${key} despliega sin ejecutar scripts/verify-deploy-gate.mjs`
      ).toBe(true);
      expect(
        neighbours.some((j) => uploadsEvidence(j) || validatesSourceRun(j)),
        `${key} no depende de un productor de evidencia ni de la validación del run de CI`
      ).toBe(true);
    }
  });
});
