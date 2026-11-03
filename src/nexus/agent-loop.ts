/**
 * Nexus Agent Loop — planificar, ejecutar, observar y registrar evidencia.
 * state: draft | engine-generated.
 *
 * Patrón extraído de Hermes Agent (bucle de aprendizaje con skills) y SuperAGI
 * (ejecución acotada con herramientas), reimplementado sin copiar su código.
 *
 * Honestidad estructural:
 * - El planner es inyectable; el planner heurístico no usa LLM.
 * - Toda observación queda en un ledger append-only con cadena de hashes.
 * - Un resultado sin observación exitosa se declara `grounded: false`.
 * - Aprender una secuencia NO la autoriza: solo la sugiere.
 */
import { createHash, randomUUID } from 'node:crypto';
import type { NexusKnowledgeGraph } from './knowledge-graph';
import { hashToolCall, type NexusToolRegistry, type ToolDescriptor } from './tool-registry';

export interface AgentObservation {
  readonly step: number;
  readonly toolId: string;
  readonly ok: boolean;
  readonly summary: string;
  readonly output: Record<string, unknown>;
  readonly latencyMs: number;
  readonly inputHash: string;
  readonly outputHash: string;
}

export interface EvidenceRecord {
  readonly index: number;
  readonly id: string;
  readonly at: number;
  readonly toolId: string;
  readonly inputHash: string;
  readonly outputHash: string;
  readonly ok: boolean;
  readonly summary: string;
  readonly previousHash: string;
  readonly hash: string;
}

export interface LearnedSkill {
  readonly signature: string;
  readonly toolIds: readonly string[];
  readonly uses: number;
  readonly successes: number;
  readonly lastUsedAt: number;
}

export type PlannerDecision =
  | { kind: 'tool'; toolId: string; args: Record<string, unknown>; rationale?: string }
  | { kind: 'answer'; answer: string }
  | { kind: 'stop'; reason: string };

export interface PlannerState {
  readonly goal: string;
  readonly step: number;
  readonly maxSteps: number;
  readonly observations: readonly AgentObservation[];
  readonly availableTools: readonly ToolDescriptor[];
  readonly approvalGranted: boolean;
}

export interface NexusPlanner {
  (state: PlannerState): PlannerDecision | Promise<PlannerDecision>;
  /** Marca el planner heurístico local para declararlo sin ambigüedad. */
  readonly nexusHeuristic?: true;
}

export interface AgentLoopRequest {
  goal: string;
  actorId?: string;
  tenantId?: string;
  approvalGranted?: boolean;
  maxSteps?: number;
  deadlineMs?: number;
  requestId?: string;
}

export type AgentLoopStatus = 'completed' | 'step_limit' | 'deadline' | 'error';

export interface AgentLoopResult {
  readonly ok: boolean;
  readonly status: AgentLoopStatus;
  readonly requestId: string;
  readonly goal: string;
  readonly answer: string;
  readonly steps: readonly AgentObservation[];
  readonly evidence: readonly EvidenceRecord[];
  readonly evidenceHead: string;
  readonly learnedSkills: readonly LearnedSkill[];
  readonly latencyMs: number;
  readonly policy: {
    readonly planner: 'heuristic-local' | 'injected';
    readonly modelUsed: false;
    readonly externalNetworkUsed: false;
    readonly approvalGranted: boolean;
    readonly grounded: boolean;
    readonly maxSteps: number;
    readonly deadlineMs: number;
  };
  readonly disclaimers: readonly string[];
}

const MAX_GOAL_CHARS = 2_000;
const HARD_MAX_STEPS = 8;
const DEFAULT_MAX_STEPS = 4;
const DEFAULT_DEADLINE_MS = 15_000;
const HARD_MAX_DEADLINE_MS = 60_000;

/** Ledger append-only en memoria; la cadena permite detectar alteración local. */
export class EvidenceLedger {
  private readonly entries: EvidenceRecord[] = [];
  private head = '0'.repeat(64);

  append(input: {
    toolId: string;
    inputHash: string;
    outputHash: string;
    ok: boolean;
    summary: string;
    at: number;
  }): EvidenceRecord {
    const index = this.entries.length;
    const previousHash = this.head;
    const hash = createHash('sha256')
      .update(
        JSON.stringify([
          index,
          input.toolId,
          input.inputHash,
          input.outputHash,
          input.ok,
          input.summary,
          input.at,
          previousHash,
        ])
      )
      .digest('hex');
    const record: EvidenceRecord = {
      index,
      id: `ev_${index}_${hash.slice(0, 16)}`,
      at: input.at,
      toolId: input.toolId,
      inputHash: input.inputHash,
      outputHash: input.outputHash,
      ok: input.ok,
      summary: input.summary.slice(0, 300),
      previousHash,
      hash,
    };
    this.entries.push(record);
    this.head = hash;
    return record;
  }

  list(): readonly EvidenceRecord[] {
    return [...this.entries];
  }

  headHash(): string {
    return this.head;
  }

  verify(): boolean {
    let previous = '0'.repeat(64);
    for (const [index, entry] of this.entries.entries()) {
      if (entry.index !== index || entry.previousHash !== previous) return false;
      const expected = createHash('sha256')
        .update(
          JSON.stringify([
            entry.index,
            entry.toolId,
            entry.inputHash,
            entry.outputHash,
            entry.ok,
            entry.summary,
            entry.at,
            entry.previousHash,
          ])
        )
        .digest('hex');
      if (expected !== entry.hash) return false;
      previous = entry.hash;
    }
    return true;
  }
}

/** Memoria de secuencias exitosas. Sugiere, no autoriza ni ejecuta. */
export class SkillMemory {
  private readonly skills = new Map<string, LearnedSkill>();
  private readonly maxSkills: number;

  constructor(maxSkills = 256) {
    if (!Number.isSafeInteger(maxSkills) || maxSkills < 1) {
      throw new RangeError('SKILL_MEMORY_CAPACITY_INVALID');
    }
    this.maxSkills = maxSkills;
  }

  record(toolIds: readonly string[], ok: boolean, now = Date.now()): LearnedSkill | null {
    if (toolIds.length === 0) return null;
    const signature = toolIds.join('>');
    const existing = this.skills.get(signature);
    if (!existing && this.skills.size >= this.maxSkills) return null;
    const next: LearnedSkill = {
      signature,
      toolIds: [...toolIds],
      uses: (existing?.uses ?? 0) + 1,
      successes: (existing?.successes ?? 0) + (ok ? 1 : 0),
      lastUsedAt: now,
    };
    this.skills.set(signature, next);
    return next;
  }

  top(limit = 3): LearnedSkill[] {
    return [...this.skills.values()]
      .sort((a, b) => {
        const rateA = a.uses === 0 ? 0 : a.successes / a.uses;
        const rateB = b.uses === 0 ? 0 : b.successes / b.uses;
        return rateB === rateA ? b.lastUsedAt - a.lastUsedAt : rateB - rateA;
      })
      .slice(0, Math.max(0, limit));
  }

  size(): number {
    return this.skills.size;
  }
}

export class NexusAgentLoop {
  constructor(
    private readonly tools: NexusToolRegistry,
    private readonly ledger: EvidenceLedger,
    private readonly skills: SkillMemory
  ) {}

  async run(request: AgentLoopRequest, planner: NexusPlanner): Promise<AgentLoopResult> {
    const startedAt = Date.now();
    const requestId =
      typeof request.requestId === 'string' && request.requestId.trim().length > 0
        ? request.requestId.trim().slice(0, 80)
        : `nexus-${randomUUID()}`;
    const goal = typeof request.goal === 'string' ? request.goal.trim() : '';
    const actorId = (request.actorId ?? 'human:public-session').slice(0, 80);
    const tenantId = (request.tenantId ?? 'public').slice(0, 80);
    const approvalGranted = request.approvalGranted === true;
    const maxSteps = clampInt(request.maxSteps, DEFAULT_MAX_STEPS, 1, HARD_MAX_STEPS);
    const deadlineMs = clampInt(request.deadlineMs, DEFAULT_DEADLINE_MS, 50, HARD_MAX_DEADLINE_MS);
    const observations: AgentObservation[] = [];
    const invokedTools: string[] = [];
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), deadlineMs);
    const plannerLabel: AgentLoopResult['policy']['planner'] =
      planner.nexusHeuristic === true ? 'heuristic-local' : 'injected';

    const finish = (status: AgentLoopStatus, answer: string, ok: boolean): AgentLoopResult => {
      clearTimeout(timer);
      const grounded = observations.some((observation) => observation.ok);
      const finalAnswer =
        typeof answer === 'string' && answer.trim().length > 0
          ? answer.trim()
          : 'No pude completar la solicitud con las herramientas disponibles. No inventaré una respuesta.';
      return {
        ok,
        status,
        requestId,
        goal,
        answer: finalAnswer,
        steps: observations,
        evidence: this.ledger.list(),
        evidenceHead: this.ledger.headHash(),
        learnedSkills: this.skills.top(3),
        latencyMs: Math.max(1, Date.now() - startedAt),
        policy: {
          planner: plannerLabel,
          modelUsed: false,
          externalNetworkUsed: false,
          approvalGranted,
          grounded,
          maxSteps,
          deadlineMs,
        },
        disclaimers: [
          'El bucle no usa un modelo generativo ni red externa: solo herramientas registradas.',
          'Ejecutar una herramienta no concede autoridad; la aprobación se verifica en el servidor.',
          'Una secuencia aprendida es una sugerencia estadística, no una autorización.',
        ],
      };
    };

    if (!goal) return finish('error', 'La solicitud está vacía.', false);
    if (goal.length > MAX_GOAL_CHARS) {
      return finish('error', `La solicitud excede ${MAX_GOAL_CHARS} caracteres.`, false);
    }

    for (let step = 0; step < maxSteps; step += 1) {
      if (controller.signal.aborted) {
        return finish(
          'deadline',
          'El tiempo asignado se agotó antes de completar la solicitud. Esto es un límite operativo, no un resultado.',
          false
        );
      }
      let decision: PlannerDecision;
      try {
        decision = await planner({
          goal,
          step,
          maxSteps,
          observations: [...observations],
          availableTools: this.tools.list(),
          approvalGranted,
        });
      } catch {
        return finish('error', 'El planificador falló sin exponer detalles internos.', false);
      }

      if (decision.kind === 'answer') {
        return finish('completed', decision.answer, true);
      }
      if (decision.kind === 'stop') {
        return finish('completed', decision.reason, false);
      }

      const toolId = decision.toolId;
      const args = decision.args ?? {};
      const inputHash = hashToolCall(toolId, args);
      const toolStartedAt = Date.now();
      const result = await this.tools.execute(toolId, args, {
        requestId,
        actorId,
        tenantId,
        approvalGranted,
        signal: controller.signal,
      });
      const latencyMs = Date.now() - toolStartedAt;
      const outputHash = hashOf(result.output);
      invokedTools.push(toolId);
      observations.push({
        step,
        toolId,
        ok: result.ok,
        summary: result.summary.slice(0, 300),
        output: result.output,
        latencyMs,
        inputHash,
        outputHash,
      });
      this.ledger.append({
        toolId,
        inputHash,
        outputHash,
        ok: result.ok,
        summary: result.summary,
        at: Date.now(),
      });
      this.skills.record(invokedTools, result.ok, Date.now());
      if (controller.signal.aborted) {
        return finish(
          'deadline',
          'La herramienta agotó el tiempo disponible. La solicitud queda sin conclusión.',
          false
        );
      }
    }

    return finish(
      'step_limit',
      'Se alcanzó el máximo de pasos sin una respuesta concluyente. Aumentar el límite no garantiza éxito: la evidencia recolectada está en `steps`.',
      false
    );
  }
}

/**
 * Planner heurístico honesto: consulta el grafo y responde solo con hechos
 * recuperados. Si no hay hechos, lo dice y no improvisa.
 */
export function heuristicPlanner(graph: NexusKnowledgeGraph): NexusPlanner {
  const planner = async (state: PlannerState): Promise<PlannerDecision> => {
    if (state.step === 0) {
      return { kind: 'tool', toolId: 'knowledge.search', args: { query: state.goal, limit: 5 } };
    }
    const last = state.observations[state.observations.length - 1];
    const hits = Array.isArray(last?.output.hits) ? last.output.hits : [];
    if (hits.length > 0) {
      const lines = hits.slice(0, 5).flatMap((raw) => {
        if (!raw || typeof raw !== 'object') return [];
        const hit = raw as Record<string, unknown>;
        const subject = typeof hit.subject === 'string' ? hit.subject : null;
        const predicate = typeof hit.predicate === 'string' ? hit.predicate : null;
        const object = typeof hit.object === 'string' ? hit.object : null;
        if (!subject || !predicate || !object) return [];
        const source = typeof hit.source === 'string' ? hit.source : 'fuente no declarada';
        const confidence =
          typeof hit.confidence === 'number' ? Math.round(hit.confidence * 100) : null;
        return [
          `- **${subject}** ${predicate} **${object}**${
            confidence === null ? '' : ` (confianza ${confidence}%)`
          } — _fuente: ${source}_`,
        ];
      });
      if (lines.length > 0) {
        return {
          kind: 'answer',
          answer: [
            'Hechos recuperados del grafo de conocimiento local:',
            '',
            ...lines,
            '',
            'Estos hechos provienen de fuentes declaradas; el grafo no genera texto nuevo.',
          ].join('\n'),
        };
      }
    }
    return {
      kind: 'answer',
      answer: [
        'No encontré hechos con fuente que respondan a esa solicitud en el grafo local.',
        'Puedo registrar un hecho con fuente (`POST /api/v1/nexus/knowledge`) o ampliar la consulta.',
        'No afirmo haber consultado la web ni haber usado un modelo generativo.',
      ].join('\n'),
    };
  };
  return Object.assign(planner, { nexusHeuristic: true as const });
}

function hashOf(value: unknown): string {
  try {
    return createHash('sha256').update(JSON.stringify(value)).digest('hex').slice(0, 32);
  } catch {
    return createHash('sha256').update('unserializable').digest('hex').slice(0, 32);
  }
}

function clampInt(value: number | undefined, fallback: number, min: number, max: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(min, Math.floor(value)));
}
