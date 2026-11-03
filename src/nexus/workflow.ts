/**
 * Nexus Workflow Engine — DAG determinista con compensación (saga).
 * state: draft | engine-generated.
 *
 * Patrón extraído de SuperAGI (orquestación de tareas) y de la práctica de sagas:
 * cada paso declara dependencias, puede reintentarse de forma acotada y, si el
 * flujo falla, los pasos ya completados se compensan en orden inverso.
 *
 * Límites deliberados:
 * - Un grafo con ciclo se rechaza antes de ejecutar nada.
 * - Un paso no recibe código del cliente: la definición vive en el servidor.
 * - Los reintentos solo cubren errores; un timeout cuenta como fallo del paso.
 */
import { createHash, randomUUID } from 'node:crypto';
import { retry } from '../resilience/retry';

export interface WorkflowStepContext {
  readonly workflowId: string;
  readonly stepId: string;
  readonly results: Readonly<Record<string, unknown>>;
  readonly signal: AbortSignal;
  readonly attempt: number;
}

export interface WorkflowStep {
  readonly id: string;
  readonly dependsOn?: readonly string[];
  readonly timeoutMs?: number;
  readonly maxAttempts?: number;
  run(context: WorkflowStepContext): Promise<unknown>;
  compensate?(context: WorkflowStepContext & { readonly result: unknown }): Promise<void>;
}

export interface WorkflowDefinition {
  readonly id: string;
  readonly steps: readonly WorkflowStep[];
}

export interface WorkflowStepReport {
  readonly id: string;
  readonly status: 'completed' | 'failed' | 'skipped';
  readonly attempts: number;
  readonly latencyMs: number;
  readonly error?: string;
}

export interface WorkflowRunResult {
  readonly ok: boolean;
  readonly workflowId: string;
  readonly runId: string;
  readonly status: 'completed' | 'failed' | 'compensated' | 'rejected';
  readonly steps: readonly WorkflowStepReport[];
  readonly results: Readonly<Record<string, unknown>>;
  readonly compensations: readonly string[];
  readonly compensationErrors: readonly string[];
  readonly evidenceHash: string;
  readonly latencyMs: number;
  readonly error?: string;
}

const MAX_STEPS = 32;
const DEFAULT_STEP_TIMEOUT_MS = 5_000;
const DEFAULT_STEP_ATTEMPTS = 1;

export class NexusWorkflowEngine {
  private readonly definitions = new Map<string, WorkflowDefinition>();

  register(definition: WorkflowDefinition): void {
    const validation = validateDefinition(definition);
    if (validation) throw new Error(validation);
    if (this.definitions.has(definition.id)) throw new Error('WORKFLOW_ALREADY_REGISTERED');
    this.definitions.set(definition.id, definition);
  }

  has(id: string): boolean {
    return this.definitions.has(id);
  }

  describe(): Array<{ id: string; steps: Array<{ id: string; dependsOn: readonly string[] }> }> {
    return [...this.definitions.values()].map((definition) => ({
      id: definition.id,
      steps: definition.steps.map((step) => ({ id: step.id, dependsOn: step.dependsOn ?? [] })),
    }));
  }

  async run(id: string, options: { deadlineMs?: number } = {}): Promise<WorkflowRunResult> {
    const startedAt = Date.now();
    const definition = this.definitions.get(id);
    const runId = `wf_${randomUUID()}`;
    if (!definition) {
      return {
        ok: false,
        workflowId: id,
        runId,
        status: 'rejected',
        steps: [],
        results: {},
        compensations: [],
        compensationErrors: [],
        evidenceHash: evidenceHash({}),
        latencyMs: Math.max(1, Date.now() - startedAt),
        error: 'WORKFLOW_NOT_FOUND',
      };
    }

    const order = topologicalOrder(definition.steps);
    if (!order) {
      return {
        ok: false,
        workflowId: id,
        runId,
        status: 'rejected',
        steps: [],
        results: {},
        compensations: [],
        compensationErrors: [],
        evidenceHash: evidenceHash({}),
        latencyMs: Math.max(1, Date.now() - startedAt),
        error: 'WORKFLOW_CYCLE_DETECTED',
      };
    }

    const controller = new AbortController();
    const deadlineMs =
      typeof options.deadlineMs === 'number' && Number.isFinite(options.deadlineMs)
        ? Math.min(60_000, Math.max(100, Math.floor(options.deadlineMs)))
        : 30_000;
    const timer = setTimeout(() => controller.abort(), deadlineMs);
    const results: Record<string, unknown> = {};
    const reports: WorkflowStepReport[] = [];
    const completed: WorkflowStep[] = [];
    const compensations: string[] = [];
    const compensationErrors: string[] = [];
    let failed = false;

    try {
      for (const step of order) {
        if (failed || controller.signal.aborted) {
          reports.push({ id: step.id, status: 'skipped', attempts: 0, latencyMs: 0 });
          continue;
        }
        const missingDependency = (step.dependsOn ?? []).find((dep) => !(dep in results));
        if (missingDependency) {
          reports.push({
            id: step.id,
            status: 'skipped',
            attempts: 0,
            latencyMs: 0,
            error: `DEPENDENCY_NOT_COMPLETED:${missingDependency}`,
          });
          failed = true;
          continue;
        }

        const stepStartedAt = Date.now();
        const attempts = clampAttempts(step.maxAttempts);
        let attemptUsed = 0;
        try {
          const value = await retry(
            async (attempt) => {
              attemptUsed = attempt;
              return withStepTimeout(
                step.timeoutMs ?? DEFAULT_STEP_TIMEOUT_MS,
                controller.signal,
                (signal) =>
                  step.run({
                    workflowId: definition.id,
                    stepId: step.id,
                    results: { ...results },
                    signal,
                    attempt,
                  })
              );
            },
            {
              maxAttempts: attempts,
              baseDelayMs: 5,
              maxDelayMs: 40,
              isRetryable: () => true,
              signal: controller.signal,
              random: () => 0.5,
            }
          );
          results[step.id] = value;
          completed.push(step);
          reports.push({
            id: step.id,
            status: 'completed',
            attempts: attemptUsed,
            latencyMs: Date.now() - stepStartedAt,
          });
        } catch {
          failed = true;
          reports.push({
            id: step.id,
            status: 'failed',
            attempts: attemptUsed,
            latencyMs: Date.now() - stepStartedAt,
            error: controller.signal.aborted ? 'WORKFLOW_DEADLINE' : 'STEP_FAILED',
          });
        }
      }
    } finally {
      clearTimeout(timer);
    }

    if (failed) {
      for (const step of [...completed].reverse()) {
        if (!step.compensate) continue;
        if (controller.signal.aborted) {
          compensationErrors.push(`${step.id}:WORKFLOW_ABORTED`);
          continue;
        }
        try {
          await step.compensate({
            workflowId: definition.id,
            stepId: step.id,
            results: { ...results },
            signal: controller.signal,
            attempt: 1,
            result: results[step.id],
          });
          compensations.push(step.id);
        } catch {
          compensationErrors.push(`${step.id}:COMPENSATION_FAILED`);
        }
      }
    }

    const status: WorkflowRunResult['status'] = failed
      ? compensations.length > 0
        ? 'compensated'
        : 'failed'
      : 'completed';
    return {
      ok: !failed,
      workflowId: definition.id,
      runId,
      status,
      steps: reports,
      results: { ...results },
      compensations,
      compensationErrors,
      evidenceHash: evidenceHash(results),
      latencyMs: Math.max(1, Date.now() - startedAt),
    };
  }
}

function validateDefinition(definition: WorkflowDefinition): string | null {
  if (
    !definition ||
    typeof definition.id !== 'string' ||
    !/^[a-z][a-z0-9.-]{2,63}$/.test(definition.id)
  ) {
    return 'WORKFLOW_ID_INVALID';
  }
  if (!Array.isArray(definition.steps) || definition.steps.length === 0) {
    return 'WORKFLOW_STEPS_REQUIRED';
  }
  if (definition.steps.length > MAX_STEPS) return 'WORKFLOW_STEPS_EXCEEDED';
  const ids = new Set<string>();
  for (const step of definition.steps) {
    if (!step || typeof step.id !== 'string' || !/^[a-z][a-z0-9_-]{0,63}$/.test(step.id)) {
      return 'WORKFLOW_STEP_ID_INVALID';
    }
    if (ids.has(step.id)) return 'WORKFLOW_STEP_DUPLICATED';
    ids.add(step.id);
  }
  for (const step of definition.steps) {
    for (const dependency of step.dependsOn ?? []) {
      if (!ids.has(dependency)) return 'WORKFLOW_DEPENDENCY_UNKNOWN';
      if (dependency === step.id) return 'WORKFLOW_STEP_SELF_DEPENDENT';
    }
  }
  return topologicalOrder(definition.steps) ? null : 'WORKFLOW_CYCLE_DETECTED';
}

/** Kahn: orden determinista por declaración para grafos sin ciclo. */
function topologicalOrder(steps: readonly WorkflowStep[]): WorkflowStep[] | null {
  const index = new Map(steps.map((step, position) => [step.id, position]));
  const indegree = new Map<string, number>();
  const dependents = new Map<string, string[]>();
  for (const step of steps) {
    const deps = (step.dependsOn ?? []).filter((dep) => index.has(dep));
    indegree.set(step.id, deps.length);
    for (const dep of deps) {
      const list = dependents.get(dep) ?? [];
      list.push(step.id);
      dependents.set(dep, list);
    }
  }
  const ready = steps
    .filter((step) => (indegree.get(step.id) ?? 0) === 0)
    .sort((a, b) => (index.get(a.id) ?? 0) - (index.get(b.id) ?? 0));
  const order: WorkflowStep[] = [];
  while (ready.length > 0) {
    const step = ready.shift() as WorkflowStep;
    order.push(step);
    for (const dependent of dependents.get(step.id) ?? []) {
      const next = (indegree.get(dependent) ?? 0) - 1;
      indegree.set(dependent, next);
      if (next === 0) {
        const found = steps.find((candidate) => candidate.id === dependent);
        if (found) {
          ready.push(found);
          ready.sort((a, b) => (index.get(a.id) ?? 0) - (index.get(b.id) ?? 0));
        }
      }
    }
  }
  return order.length === steps.length ? order : null;
}

function clampAttempts(value: number | undefined): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return DEFAULT_STEP_ATTEMPTS;
  return Math.min(3, Math.max(1, Math.floor(value)));
}

function withStepTimeout<T>(
  ms: number,
  parentSignal: AbortSignal,
  work: (signal: AbortSignal) => Promise<T>
): Promise<T> {
  const controller = new AbortController();
  const onParentAbort = (): void => controller.abort();
  parentSignal.addEventListener('abort', onParentAbort, { once: true });
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      controller.abort();
      reject(new Error('STEP_TIMEOUT'));
    }, ms);
    work(controller.signal).then(
      (value) => {
        clearTimeout(timer);
        parentSignal.removeEventListener('abort', onParentAbort);
        resolve(value);
      },
      (error: unknown) => {
        clearTimeout(timer);
        parentSignal.removeEventListener('abort', onParentAbort);
        reject(error);
      }
    );
  });
}

function evidenceHash(results: Readonly<Record<string, unknown>>): string {
  try {
    return createHash('sha256').update(JSON.stringify(results)).digest('hex');
  } catch {
    return createHash('sha256').update('unserializable').digest('hex');
  }
}

export function createWorkflowEngine(): NexusWorkflowEngine {
  return new NexusWorkflowEngine();
}
