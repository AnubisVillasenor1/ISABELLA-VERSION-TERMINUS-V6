/**
 * ISABELLA CERO — Agent Mesh (fusión 2026-11-01).
 * state: draft | engine-generated.
 *
 * Portado conceptualmente de `ISABELLA-CERO-V1.0-FINAL-COMPLETE` (repo
 * AnubisVillasenor1/proyecto-isabella-cero, commit ac6136f), sección 19/21/25/26.
 * No es una copia literal: el snippet original no valida el rol en runtime, usa
 * `startsWith` para contener rutas (evadible) y no distingue evaluación de
 * ejecución. Aquí:
 *
 *   CAPABILITY ≠ AUTHORITY ≠ EXECUTION
 *
 * - `evaluateMeshAction` SOLO evalúa política; nunca ejecuta ni concede autoridad.
 * - `submit` ejecuta únicamente adaptadores locales registrados explícitamente.
 * - Sin adaptador no hay ejecución: el resultado es `BLOCKED` con `NO_ADAPTER`.
 * - Toda decisión se sella en BookPI si se inyecta un ledger.
 * - La aprobación humana la decide la capa HTTP desde un bearer verificado; el
 *   cuerpo de la petición nunca puede concederla.
 */
import { createHash, randomUUID } from 'node:crypto';
import { buildMethodId } from '../authority/method-id';
import type { BookPiLedgerPort } from '../bookpi/ledger';

export const DEV_AGENT_ROLES = [
  'planner',
  'researcher',
  'architect',
  'coder',
  'tester',
  'reviewer',
  'security',
  'devops',
  'creative',
  'operator',
] as const;

export type DevAgentRole = (typeof DEV_AGENT_ROLES)[number];

export type MeshRisk = 'low' | 'medium' | 'high' | 'critical';

export type MeshVerdict = 'ALLOW' | 'DENY' | 'ESCALATE';

export type MeshStatus = 'COMPLETED' | 'BLOCKED' | 'NEEDS_APPROVAL' | 'FAILED';

export type MeshArtifactKind = 'file' | 'test' | 'diff' | 'report' | 'audio' | 'deployment';

export interface MeshArtifact {
  readonly kind: MeshArtifactKind;
  readonly uri: string;
  readonly hash: string;
}

export interface DevAgentProfile {
  readonly role: DevAgentRole;
  readonly label: string;
  /** Scopes granted by the CERO permission matrix (sección 21). */
  readonly scopes: readonly string[];
  /** Highest risk the role may handle without human approval. */
  readonly riskCeiling: MeshRisk;
  readonly sandboxOnly: boolean;
  readonly note: string;
}

const PROFILES: Record<DevAgentRole, DevAgentProfile> = {
  planner: {
    role: 'planner',
    label: 'Planner',
    scopes: ['memory.read', 'repo.read', 'plan.create'],
    riskCeiling: 'low',
    sandboxOnly: false,
    note: 'Convierte objetivos en un DAG; nunca edita repositorio ni producción.',
  },
  researcher: {
    role: 'researcher',
    label: 'Researcher',
    scopes: ['memory.read', 'repo.read', 'web.read'],
    riskCeiling: 'low',
    sandboxOnly: false,
    note: 'Investiga código, documentos y dependencias; no modifica archivos.',
  },
  architect: {
    role: 'architect',
    label: 'Architect',
    scopes: ['memory.read', 'repo.read', 'sandbox.write', 'plan.create'],
    riskCeiling: 'medium',
    sandboxOnly: true,
    note: 'Diseña contratos y ADRs; toda escritura queda en sandbox.',
  },
  coder: {
    role: 'coder',
    label: 'Coder',
    scopes: ['memory.read', 'repo.read', 'sandbox.write', 'test.run', 'pr.create'],
    riskCeiling: 'medium',
    sandboxOnly: true,
    note: 'Implementa solo en sandbox; entrega diff/PR, nunca escritura directa a producción.',
  },
  tester: {
    role: 'tester',
    label: 'Tester',
    scopes: ['memory.read', 'repo.read', 'sandbox.write', 'test.run'],
    riskCeiling: 'medium',
    sandboxOnly: true,
    note: 'Crea y ejecuta pruebas dentro del sandbox.',
  },
  reviewer: {
    role: 'reviewer',
    label: 'Reviewer',
    scopes: ['memory.read', 'repo.read', 'diff.read'],
    riskCeiling: 'low',
    sandboxOnly: false,
    note: 'Revisa diffs y calidad; no escribe ni aprueba por sí mismo.',
  },
  security: {
    role: 'security',
    label: 'Security Auditor',
    scopes: ['memory.read', 'repo.read', 'security.scan'],
    riskCeiling: 'low',
    sandboxOnly: false,
    note: 'Escanea riesgos y secretos; no extrae secretos ni despliega.',
  },
  devops: {
    role: 'devops',
    label: 'DevOps',
    scopes: ['memory.read', 'repo.read', 'sandbox.write', 'deploy.request'],
    riskCeiling: 'high',
    sandboxOnly: true,
    note: 'Prepara despliegue; la solicitud y la ejecución exigen aprobación humana.',
  },
  creative: {
    role: 'creative',
    label: 'Creative',
    scopes: ['memory.read', 'tamv.generate', 'tamv.analyze'],
    riskCeiling: 'medium',
    sandboxOnly: false,
    note: 'Crea audio y analiza TAMV; nunca clona voces sin consentimiento verificable.',
  },
  operator: {
    role: 'operator',
    label: 'Operator',
    scopes: ['memory.read', 'integration.call', 'webhook.send'],
    riskCeiling: 'high',
    sandboxOnly: false,
    note: 'Ejecuta integraciones autorizadas y webhooks; pagos y despliegues exigen aprobación.',
  },
};

export const DEV_AGENT_PROFILES: Readonly<Record<DevAgentRole, DevAgentProfile>> = PROFILES;

/**
 * Scopes that always require a server-verified human approval. `deploy.request`
 * se incluye porque la matriz del canon exige aprobación para DevOps, incluso
 * antes de ejecutar.
 */
export const APPROVAL_REQUIRED_SCOPES: readonly string[] = [
  'deploy.request',
  'deploy.execute',
  'payment.execute',
  'data.delete',
  'secret.read',
  'production.write',
];

const RISK_ORDER: readonly MeshRisk[] = ['low', 'medium', 'high', 'critical'];

function riskRank(risk: MeshRisk): number {
  return RISK_ORDER.indexOf(risk);
}

export function isDevAgentRole(value: unknown): value is DevAgentRole {
  return typeof value === 'string' && (DEV_AGENT_ROLES as readonly string[]).includes(value);
}

export function isMeshRisk(value: unknown): value is MeshRisk {
  return typeof value === 'string' && (RISK_ORDER as readonly string[]).includes(value);
}

export interface MeshDecisionRequest {
  readonly role: DevAgentRole;
  readonly action: string;
  readonly risk: MeshRisk;
  /** Server-side decision. Never read from an HTTP body. */
  readonly approvalGranted: boolean;
}

export interface MeshDecision {
  readonly verdict: MeshVerdict;
  readonly reason: string;
  readonly role: DevAgentRole;
  readonly action: string;
  readonly risk: MeshRisk;
  readonly requiresHumanApproval: boolean;
  readonly effectiveScopes: readonly string[];
  /** Advisory only: this evaluation never authorizes execution. */
  readonly authorizesExecution: false;
}

const METHOD_GOVERNANCE = 'CONSTITUTIONAL' as const;

function methodIdFor(risk: MeshRisk): string {
  return buildMethodId({
    tina: 'A',
    yun: 'COLLECTIVE_INTELLIGENCE',
    module: 'E21',
    function: 'evaluate_mesh_action',
    version: 'v1.0.0',
    riskTier: risk.toUpperCase() as Uppercase<MeshRisk>,
    governanceTier: METHOD_GOVERNANCE,
  });
}

export function evaluateMeshAction(request: MeshDecisionRequest): MeshDecision {
  const profile = PROFILES[request.role];
  const base = {
    role: request.role,
    action: request.action,
    risk: request.risk,
    effectiveScopes: profile?.scopes ?? [],
    authorizesExecution: false as const,
  };

  if (!profile) {
    return {
      ...base,
      verdict: 'DENY',
      reason: 'UNKNOWN_ROLE: el rol no pertenece a la matriz CERO.',
      requiresHumanApproval: false,
    };
  }

  if (!profile.scopes.includes(request.action)) {
    return {
      ...base,
      verdict: 'DENY',
      reason: `SCOPE_NOT_GRANTED: ${profile.role} no puede ejecutar ${request.action}.`,
      requiresHumanApproval: false,
    };
  }

  const aboveCeiling = riskRank(request.risk) > riskRank(profile.riskCeiling);
  const criticalAction = APPROVAL_REQUIRED_SCOPES.includes(request.action);
  const requiresHumanApproval = aboveCeiling || criticalAction || request.risk === 'critical';

  if (requiresHumanApproval && !request.approvalGranted) {
    return {
      ...base,
      verdict: 'ESCALATE',
      reason: `HUMAN_APPROVAL_REQUIRED: ${profile.role}/${request.action} (${request.risk}).`,
      requiresHumanApproval: true,
    };
  }

  return {
    ...base,
    verdict: 'ALLOW',
    reason: requiresHumanApproval ? 'POLICY_SATISFIED_WITH_HUMAN_APPROVAL' : 'POLICY_SATISFIED',
    requiresHumanApproval,
  };
}

export interface MeshTaskInput {
  readonly objective: string;
  readonly role: DevAgentRole;
  readonly action: string;
  readonly risk: MeshRisk;
  readonly approvalGranted: boolean;
  readonly context?: Readonly<Record<string, unknown>>;
  readonly taskId?: string;
}

export interface MeshTask {
  readonly taskId: string;
  readonly objective: string;
  readonly role: DevAgentRole;
  readonly action: string;
  readonly risk: MeshRisk;
  readonly approvalGranted: boolean;
  readonly context: Readonly<Record<string, unknown>>;
}

export interface MeshAdapterOutput {
  readonly summary: string;
  readonly output: Readonly<Record<string, unknown>>;
  readonly artifacts?: readonly MeshArtifact[];
}

export interface MeshAgentAdapter {
  readonly role: DevAgentRole;
  readonly name: string;
  /** Must be deterministic or explicitly declare its engine in the output. */
  execute(task: MeshTask): Promise<MeshAdapterOutput>;
}

export interface MeshEvidence {
  readonly sequence: number;
  readonly hash: string;
  readonly digest: string;
}

export interface MeshTaskResult {
  readonly taskId: string;
  readonly role: DevAgentRole;
  readonly action: string;
  readonly risk: MeshRisk;
  readonly verdict: MeshVerdict;
  readonly status: MeshStatus;
  readonly reason: string;
  readonly adapter: string | null;
  readonly summary: string | null;
  readonly output: Readonly<Record<string, unknown>> | null;
  readonly artifacts: readonly MeshArtifact[];
  readonly evidence: MeshEvidence | null;
  readonly latencyMs: number;
}

export interface DevAgentMeshOptions {
  readonly ledger?: BookPiLedgerPort;
  readonly maxConcurrency?: number;
  readonly maxTasksPerBatch?: number;
  readonly taskTimeoutMs?: number;
  readonly now?: () => Date;
  readonly idFactory?: () => string;
}

const DEFAULT_MAX_CONCURRENCY = 4;
const DEFAULT_MAX_TASKS = 32;
const DEFAULT_TASK_TIMEOUT_MS = 5_000;
const MAX_OBJECTIVE_CHARS = 2_000;

function digest(value: unknown): string {
  try {
    return createHash('sha256').update(JSON.stringify(value)).digest('hex');
  } catch {
    return createHash('sha256').update('unserializable').digest('hex');
  }
}

function withTimeout<T>(promise: Promise<T>, milliseconds: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const gate = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error('ADAPTER_TIMEOUT')), milliseconds);
  });
  return Promise.race([promise, gate]).finally(() => {
    if (timer) clearTimeout(timer);
  });
}

function boundedInteger(
  value: number | undefined,
  fallback: number,
  min: number,
  max: number
): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(min, Math.trunc(value)));
}

export class DevAgentMesh {
  private readonly adapters = new Map<DevAgentRole, MeshAgentAdapter>();
  private readonly ledger: BookPiLedgerPort | undefined;
  private readonly maxConcurrency: number;
  private readonly maxTasksPerBatch: number;
  private readonly taskTimeoutMs: number;
  private readonly now: () => Date;
  private readonly idFactory: () => string;
  private active = 0;
  private readonly waiters: Array<() => void> = [];

  constructor(options: DevAgentMeshOptions = {}) {
    this.ledger = options.ledger;
    this.maxConcurrency = boundedInteger(options.maxConcurrency, DEFAULT_MAX_CONCURRENCY, 1, 32);
    this.maxTasksPerBatch = boundedInteger(options.maxTasksPerBatch, DEFAULT_MAX_TASKS, 1, 256);
    this.taskTimeoutMs = boundedInteger(options.taskTimeoutMs, DEFAULT_TASK_TIMEOUT_MS, 1, 120_000);
    this.now = options.now ?? (() => new Date());
    this.idFactory = options.idFactory ?? (() => randomUUID());
  }

  register(adapter: MeshAgentAdapter): this {
    this.adapters.set(adapter.role, adapter);
    return this;
  }

  describe(): {
    readonly roles: readonly DevAgentProfile[];
    readonly adapters: ReadonlyArray<{ readonly role: DevAgentRole; readonly name: string }>;
    readonly approvalRequiredScopes: readonly string[];
    readonly maxConcurrency: number;
    readonly executionSurfaces: readonly string[];
  } {
    return {
      roles: DEV_AGENT_ROLES.map((role) => PROFILES[role]),
      adapters: [...this.adapters.values()]
        .map((adapter) => ({ role: adapter.role, name: adapter.name }))
        .sort((a, b) => a.role.localeCompare(b.role)),
      approvalRequiredScopes: APPROVAL_REQUIRED_SCOPES,
      maxConcurrency: this.maxConcurrency,
      executionSurfaces: ['library-only'],
    };
  }

  evaluate(input: MeshDecisionRequest): MeshDecision {
    return evaluateMeshAction(input);
  }

  async submit(input: MeshTaskInput): Promise<MeshTaskResult> {
    const startedAt = Date.now();
    const objective = typeof input.objective === 'string' ? input.objective.trim() : '';
    const taskId =
      typeof input.taskId === 'string' && /^[a-zA-Z0-9._:-]{1,80}$/.test(input.taskId)
        ? input.taskId
        : `task-${digest({ objective, role: input.role, at: startedAt }).slice(0, 12)}`;

    const task: MeshTask = {
      taskId,
      objective: objective.slice(0, MAX_OBJECTIVE_CHARS),
      role: input.role,
      action: input.action,
      risk: input.risk,
      approvalGranted: input.approvalGranted === true,
      context: input.context ?? {},
    };

    const decision = this.evaluate({
      role: task.role,
      action: task.action,
      risk: task.risk,
      approvalGranted: task.approvalGranted,
    });

    if (decision.verdict === 'DENY') {
      return this.finish(task, decision, startedAt, {
        status: 'BLOCKED',
        adapter: null,
        summary: null,
        output: null,
        artifacts: [],
        eventType: 'agent.mesh.blocked',
      });
    }

    if (decision.verdict === 'ESCALATE') {
      return this.finish(task, decision, startedAt, {
        status: 'NEEDS_APPROVAL',
        adapter: null,
        summary: null,
        output: null,
        artifacts: [],
        eventType: 'agent.mesh.approval_required',
      });
    }

    const adapter = this.adapters.get(task.role);
    if (!adapter) {
      return this.finish(task, decision, startedAt, {
        status: 'BLOCKED',
        reason: 'NO_ADAPTER: la política permite la acción pero no hay adaptador local registrado.',
        adapter: null,
        summary: null,
        output: null,
        artifacts: [],
        eventType: 'agent.mesh.no_adapter',
      });
    }

    await this.acquire();
    try {
      const produced = await withTimeout(adapter.execute(task), this.taskTimeoutMs);
      return this.finish(task, decision, startedAt, {
        status: 'COMPLETED',
        adapter: adapter.name,
        summary: produced.summary,
        output: produced.output,
        artifacts: produced.artifacts ?? [],
        eventType: 'agent.mesh.completed',
      });
    } catch (error) {
      return this.finish(task, decision, startedAt, {
        status: 'FAILED',
        reason: error instanceof Error ? error.message : 'ADAPTER_FAILED',
        adapter: adapter.name,
        summary: null,
        output: null,
        artifacts: [],
        eventType: 'agent.mesh.failed',
      });
    } finally {
      this.release();
    }
  }

  async runParallel(inputs: readonly MeshTaskInput[]): Promise<readonly MeshTaskResult[]> {
    const bounded = inputs.slice(0, this.maxTasksPerBatch);
    return Promise.all(bounded.map((input) => this.submit(input)));
  }

  private async acquire(): Promise<void> {
    if (this.active < this.maxConcurrency) {
      this.active += 1;
      return;
    }
    await new Promise<void>((resolve) => this.waiters.push(resolve));
  }

  private release(): void {
    const next = this.waiters.shift();
    if (next) {
      next();
      return;
    }
    this.active = Math.max(0, this.active - 1);
  }

  private finish(
    task: MeshTask,
    decision: MeshDecision,
    startedAt: number,
    outcome: {
      readonly status: MeshStatus;
      readonly adapter: string | null;
      readonly summary: string | null;
      readonly output: Readonly<Record<string, unknown>> | null;
      readonly artifacts: readonly MeshArtifact[];
      readonly eventType: string;
      readonly reason?: string;
    }
  ): MeshTaskResult {
    const body = {
      taskId: task.taskId,
      role: task.role,
      action: task.action,
      risk: task.risk,
      status: outcome.status,
      adapter: outcome.adapter,
    };
    const evidenceDigest = digest({ body, output: outcome.output, artifacts: outcome.artifacts });
    const sealed = this.seal(task, decision, outcome.eventType, evidenceDigest);

    return {
      taskId: task.taskId,
      role: task.role,
      action: task.action,
      risk: task.risk,
      verdict: decision.verdict,
      status: outcome.status,
      reason: outcome.reason ?? decision.reason,
      adapter: outcome.adapter,
      summary: outcome.summary,
      output: outcome.output,
      artifacts: outcome.artifacts,
      evidence: sealed,
      latencyMs: Date.now() - startedAt,
    };
  }

  private seal(
    task: MeshTask,
    decision: MeshDecision,
    eventType: string,
    evidenceDigest: string
  ): MeshEvidence | null {
    if (!this.ledger) return null;
    const event = this.ledger.append({
      id: this.idFactory(),
      timestamp: this.now().toISOString(),
      type: eventType,
      methodId: methodIdFor(task.risk),
      principal: `agent:${task.role}`,
      riskTier: task.risk.toUpperCase(),
      status: decision.verdict,
    });
    return { sequence: event.sequence, hash: event.hash, digest: evidenceDigest };
  }
}
