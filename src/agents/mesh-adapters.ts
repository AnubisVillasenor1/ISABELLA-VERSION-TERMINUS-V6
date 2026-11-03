/**
 * ISABELLA CERO — adaptadores deterministas del Agent Mesh.
 * state: draft | engine-generated.
 *
 * Solo se implementan adaptadores que pueden ejecutarse sin modelo externo, sin
 * shell y sin red. Coder, Tester, DevOps y Operator permanecen `SPECIFIED`: no
 * existe adaptador registrado y `DevAgentMesh.submit` devuelve `NO_ADAPTER` en
 * lugar de simular trabajo.
 */
import { writeSandboxFile, type SandboxWriteResult } from './sandbox';
import type {
  DevAgentRole,
  MeshAgentAdapter,
  MeshArtifact,
  MeshTask,
  MeshAdapterOutput,
} from './mesh';

const MAX_PLAN_STEPS = 12;
const MAX_STEP_CHARS = 240;

/** Divide un objetivo en pasos estables; no interpreta lenguaje natural. */
export function decomposeObjective(objective: string): readonly string[] {
  const normalized = objective.replace(/\s+/g, ' ').trim();
  if (!normalized) return [];

  const fragments = normalized
    .split(/\s*(?:→|->|=>|;|\n|\bthen\b|\bluego\b|\bdespués\b|\bdespues\b)\s*/i)
    .map((fragment) => fragment.trim())
    .filter(Boolean);

  const steps: string[] = [];
  for (const fragment of fragments.length ? fragments : [normalized]) {
    const clipped = fragment.slice(0, MAX_STEP_CHARS);
    if (!steps.includes(clipped)) steps.push(clipped);
    if (steps.length >= MAX_PLAN_STEPS) break;
  }
  return steps;
}

export function createPlannerAdapter(): MeshAgentAdapter {
  const role: DevAgentRole = 'planner';
  return {
    role,
    name: 'deterministic-planner',
    async execute(task: MeshTask): Promise<MeshAdapterOutput> {
      const steps = decomposeObjective(task.objective).map((action, index) => ({
        index: index + 1,
        action,
        status: 'pending' as const,
      }));
      return {
        summary:
          steps.length === 0
            ? 'El objetivo está vacío; no se generó plan.'
            : `Plan determinista de ${steps.length} paso(s). No se ejecutó ninguno.`,
        output: {
          engine: 'deterministic',
          executes: false,
          steps,
        },
        artifacts: [],
      };
    },
  };
}

export function createReviewerAdapter(): MeshAgentAdapter {
  const role: DevAgentRole = 'reviewer';
  return {
    role,
    name: 'deterministic-reviewer',
    async execute(task: MeshTask): Promise<MeshAdapterOutput> {
      const rawFindings = task.context.findings;
      const findings = Array.isArray(rawFindings)
        ? rawFindings.filter((item): item is string => typeof item === 'string').slice(0, 20)
        : [];
      const rawArtifacts = task.context.artifacts;
      const reviewedHashes = Array.isArray(rawArtifacts)
        ? rawArtifacts
            .filter(
              (item): item is { hash?: unknown } =>
                typeof item === 'object' && item !== null && 'hash' in item
            )
            .map((item) => (typeof item.hash === 'string' ? item.hash.slice(0, 200) : ''))
            .filter(Boolean)
            .slice(0, 50)
        : [];

      const verdict = findings.length === 0 ? 'CLEAN' : 'NEEDS_CHANGES';
      return {
        summary:
          verdict === 'CLEAN'
            ? 'Revisión determinista sin hallazgos declarados.'
            : `Revisión determinista con ${findings.length} hallazgo(s).`,
        output: {
          engine: 'deterministic',
          executes: false,
          verdict,
          findings,
          reviewedArtifacts: reviewedHashes.length,
        },
        artifacts: [],
      };
    },
  };
}

export interface SandboxCoderOptions {
  /** Absolute path of the sandbox root. Never the workspace nor production. */
  readonly root: string;
  readonly maxBytes?: number;
}

/**
 * Adaptador Coder que solo escribe propuestas de parche dentro del sandbox.
 * No aplica el parche ni toca el repositorio de trabajo.
 */
export function createSandboxCoderAdapter(options: SandboxCoderOptions): MeshAgentAdapter {
  const role: DevAgentRole = 'coder';
  return {
    role,
    name: 'sandbox-patch-writer',
    async execute(task: MeshTask): Promise<MeshAdapterOutput> {
      const relativePath = sandboxPatchPath(task);
      const content = typeof task.context.patch === 'string' ? task.context.patch : '';
      const written: SandboxWriteResult = await writeSandboxFile(
        options.root,
        relativePath,
        content,
        options.maxBytes === undefined ? {} : { maxBytes: options.maxBytes }
      );
      const artifact: MeshArtifact = {
        kind: 'diff',
        uri: `sandbox://${written.relative}`,
        hash: written.sha3_512,
      };
      return {
        summary: `Parche propuesto en sandbox (${written.bytes} bytes); no aplicado.`,
        output: {
          engine: 'deterministic',
          executes: false,
          applies: false,
          relativePath: written.relative,
          bytes: written.bytes,
          created: written.created,
          sha3_512: written.sha3_512,
        },
        artifacts: [artifact],
      };
    },
  };
}

function sandboxPatchPath(task: MeshTask): string {
  if (typeof task.context.patchPath === 'string' && task.context.patchPath.trim()) {
    return task.context.patchPath;
  }
  const safeTaskId = task.taskId.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 60);
  return `patches/${safeTaskId}.diff`;
}
