/**
 * CAPABILITY ENGINE (NEXUS ∞) — src/nexus/capability-engine.ts
 * state: draft | engine-generated — revisión humana pendiente.
 *
 * Es la fábrica del plano NEXUS ∞, pero ejecutada sobre las piezas que ya existen
 * en Isabella: `NexusToolRegistry` (riesgo, aprobación, límites y timeout reales),
 * `EvidenceLedger` (cadena sellada) y `AntifragileMonitor` (reputación medida).
 * No hay segunda máquina de ejecución: una capacidad se ejecuta por su herramienta
 * enlazada o no se ejecuta.
 *
 * Por qué no hay `{"output": {"received": payload}}`: AGENTS.md §4 prohíbe servir
 * una maqueta como capacidad. Un contrato cuyo motor devuelva el eco del input no
 * sería una capacidad, sería una foto del pedido.
 */
import { createHash } from 'node:crypto';
import {
  CapabilityContractBodySchema,
  CONTRACT_CEILINGS,
  autonomyRank,
  decideContractStatus,
  type CapabilityContract,
  type CapabilityEvidenceFacts,
  type ContractDecision,
  type ContractStatus,
} from './capability-contract';
import type { CapabilityState } from '../lib/lib/capability-registry';
import type { EvidenceLedger } from './agent-loop';
import type { AntifragileMonitor } from './antifragile';
import { hashToolCall, type NexusToolRegistry, type ToolContext } from './tool-registry';

export const CAPABILITY_ENGINE_VERSION = '1.0.0' as const;

export interface CapabilityEngineOptions {
  readonly tools: NexusToolRegistry;
  readonly ledger: EvidenceLedger;
  readonly monitor: AntifragileMonitor;
  readonly repoRoot: string;
  readonly now?: () => number;
}

export interface CapabilityDescriptor {
  readonly id: string;
  readonly fingerprint: string;
  readonly domain: string;
  readonly toolId: string;
  readonly status: ContractStatus;
  readonly state: CapabilityState;
  readonly trust: number;
  readonly autonomy: string;
  readonly reasons: readonly string[];
}

export interface CapabilityExecutionResult {
  readonly ok: boolean;
  readonly status: 'executed' | 'denied' | 'failed';
  readonly code: string;
  readonly summary: string;
  readonly output: Record<string, unknown>;
  readonly evidenceId?: string;
  readonly capability: string;
  readonly state: CapabilityState;
  /** `shadow` ejecutada bajo portador humano verificado: no equivale a `approved`. */
  readonly humanAuthorizedShadow?: boolean;
}

export interface CapabilitySimulationReport {
  readonly capability: string;
  readonly verdict: ContractStatus;
  readonly state: CapabilityState;
  readonly trust: number;
  readonly terms: Record<string, { score: number; observed: boolean; basis: string }>;
  readonly limits: {
    timeoutMs: number;
    memoryMb: number;
    maxInputBytes: number;
    maxOutputBytes: number;
    network: 'none' | 'allowlist';
    allowedHosts: readonly string[];
  };
  readonly governance: {
    autonomy: string;
    approvalRequired: boolean;
    reversible: boolean;
    dataClasses: readonly string[];
    privacyBudget: number;
  };
  readonly rollback: string;
  readonly reasons: readonly string[];
  readonly notMeasured: readonly string[];
  readonly disclaimer: string;
}

function jsonShape(value: unknown): string {
  let serialized: string;
  try {
    serialized = JSON.stringify(value);
  } catch {
    serialized = 'null';
  }
  return createHash('sha256')
    .update(serialized ?? 'null')
    .digest('hex')
    .slice(0, 32);
}

/**
 * Los mensajes de zod pueden contener el valor recibido. La superficie HTTP no lo
 * devuelve nunca: se extraen solo códigos y rutas, para no convertir el error en
 * canal de salida.
 */
function schemaIssues(issueLike: unknown): string[] {
  const issues = (issueLike as { issues?: unknown })?.issues;
  if (!Array.isArray(issues)) return ['SCHEMA_REJECTED'];
  return issues
    .map((raw) => {
      const issue = raw as { code?: unknown; path?: unknown };
      const path = Array.isArray(issue.path) ? issue.path.join('.') : '';
      return `${String(issue.code ?? 'invalid')}${path ? `:${path}` : ''}`;
    })
    .slice(0, 8);
}

function withinMs<T>(ms: number, work: Promise<T>): Promise<{ timedOut: boolean; value?: T }> {
  return new Promise((resolvePromise) => {
    let settled = false;
    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      resolvePromise({ timedOut: true });
    }, ms);
    work.then(
      (value) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        resolvePromise({ timedOut: false, value });
      },
      () => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        resolvePromise({ timedOut: false });
      }
    );
  });
}

export class CapabilityEngine {
  private readonly contracts = new Map<string, CapabilityContract>();
  private readonly decisions = new Map<string, ContractDecision>();
  private readonly tools: NexusToolRegistry;
  private readonly ledger: EvidenceLedger;
  private readonly monitor: AntifragileMonitor;
  private readonly repoRoot: string;
  private readonly now: () => number;

  constructor(options: CapabilityEngineOptions) {
    this.tools = options.tools;
    this.ledger = options.ledger;
    this.monitor = options.monitor;
    this.repoRoot = options.repoRoot;
    this.now = options.now ?? (() => Date.now());
  }

  /**
   * Registra y dictamina. Un contrato inválido aborta; un contrato sin herramienta
   * enlazada queda en cuarentena y por tanto es inejecutable, pero auditable.
   */
  register(contract: CapabilityContract): ContractDecision {
    CapabilityContractBodySchema.parse(contract.body);
    if (this.contracts.has(contract.id)) {
      throw new Error(`CAPABILITY_ALREADY_REGISTERED:${contract.id}`);
    }
    if (this.contracts.size >= 128) throw new Error('CAPABILITY_CAPACITY_EXCEEDED');
    this.contracts.set(contract.id, contract);
    const decision = this.evaluate(contract.id);
    this.decisions.set(contract.id, decision);
    return decision;
  }

  has(id: string): boolean {
    return this.contracts.has(id);
  }

  get(id: string): CapabilityContract | null {
    return this.contracts.get(id) ?? null;
  }

  /** Hechos observables del enlace contrato ↔ registro ↔ monitor. */
  facts(id: string): CapabilityEvidenceFacts | null {
    const contract = this.contracts.get(id);
    if (!contract) return null;
    const tool = this.tools.get(contract.body.toolId);
    const health = this.monitor.health(contract.body.toolId);
    return {
      repoRoot: this.repoRoot,
      registeredRisk: tool ? tool.risk : null,
      registeredRequiresApproval: tool ? tool.requiresApproval : false,
      observedSamples: health ? health.samples : null,
      observedSuccessRate: health ? health.successRate : null,
      observedCircuit: health ? health.state : null,
    };
  }

  /** Vuelve a dictaminar: la reputación se gana con ejecuciones, no con declaraciones. */
  evaluate(id: string): ContractDecision {
    const contract = this.contracts.get(id);
    if (!contract) throw new Error(`CAPABILITY_NOT_FOUND:${id}`);
    const facts = this.facts(id);
    if (!facts) throw new Error(`CAPABILITY_NOT_FOUND:${id}`);
    const decision = decideContractStatus(contract, facts);
    this.decisions.set(id, decision);
    return decision;
  }

  list(): readonly CapabilityDescriptor[] {
    return [...this.contracts.values()].map((contract) => {
      const decision = this.evaluate(contract.id);
      return {
        id: contract.id,
        fingerprint: contract.fingerprint,
        domain: contract.body.domain,
        toolId: contract.body.toolId,
        status: decision.status,
        state: decision.state,
        trust: decision.trust.score,
        autonomy: contract.body.governance.autonomy,
        reasons: decision.reasons,
      };
    });
  }

  /** Dictamen detallado, incluido el desglose de términos de confianza. */
  summary(id: string) {
    const decision = this.evaluate(id);
    return {
      status: decision.status,
      state: decision.state,
      trust: decision.trust.score,
      observedWeight: decision.trust.observedWeight,
      reasons: decision.reasons,
      terms: {
        provenance: decision.trust.provenance,
        tests: decision.trust.tests,
        reputation: decision.trust.reputation,
        risk: decision.trust.risk,
        compliance: decision.trust.compliance,
      },
    };
  }

  /**
   * Pre-evaluación estática. No es un gemelo digital completo: es la revisión de
   * esquema, límites, gobierno y evidencia antes de invocar. Lo que no se puede
   * medir aquí se declara en `notMeasured` en lugar de rellenarse con ceros.
   */
  simulate(id: string): CapabilitySimulationReport | null {
    const contract = this.contracts.get(id);
    if (!contract) return null;
    const decision = this.evaluate(id);
    return {
      capability: contract.id,
      verdict: decision.status,
      state: decision.state,
      trust: decision.trust.score,
      terms: {
        provenance: pickTerm(decision.trust.provenance),
        tests: pickTerm(decision.trust.tests),
        reputation: pickTerm(decision.trust.reputation),
        risk: pickTerm(decision.trust.risk),
        compliance: pickTerm(decision.trust.compliance),
      },
      limits: {
        timeoutMs: contract.body.execution.timeoutMs,
        memoryMb: contract.body.execution.memoryMb,
        maxInputBytes: contract.body.execution.maxInputBytes,
        maxOutputBytes: contract.body.execution.maxOutputBytes,
        network: contract.body.execution.network,
        allowedHosts: contract.body.execution.allowedHosts,
      },
      governance: {
        autonomy: contract.body.governance.autonomy,
        approvalRequired: contract.body.governance.approvalRequired,
        reversible: contract.body.governance.reversible,
        dataClasses: contract.body.governance.dataClasses,
        privacyBudget: contract.body.governance.privacyBudget,
      },
      rollback:
        contract.body.rollback.strategy === 'compensating-tool'
          ? `compensating-tool:${contract.body.rollback.toolId ?? ''}`
          : 'none-declared',
      reasons: decision.reasons,
      notMeasured: [
        'fuga de privacidad (requiere ejecuciones con datos reales y su auditoría)',
        'costo en USD (el proveedor no reporta costo por llamada en este runtime)',
        'impacto organizacional (requiere evaluación humana)',
      ],
      disclaimer:
        'Simulación estática sobre el contrato y el registro: no ejecuta la herramienta ni certifica producción.',
    };
  }

  /**
   * Puerta de ejecución. En este orden, y sin reordenar: dictamen vigente, techo de
   * autonomía, aprobación server-side, esquema de entrada, límite de entrada, la
   * herramienta enlazada, esquema de salida, sello de evidencia.
   */
  async execute(
    id: string,
    args: Record<string, unknown>,
    context: ToolContext
  ): Promise<CapabilityExecutionResult> {
    const contract = this.contracts.get(id);
    if (!contract) {
      return this.denied(id, 'unavailable', 'CAPABILITY_NOT_FOUND', 'Capacidad no registrada.');
    }
    const decision = this.evaluate(id);

    // Una capacidad en `shadow` no está aprobada por auto-observación; sí puede
    // ejecutarse bajo un portador humano verificado por el servidor (§1: la
    // conciencia humana decide y ejecuta). Cada una de esas ejecuciones se sella y
    // produce las muestras que la ladder exige. `quarantined`, `draft` y
    // `retired` no tienen este camino: ahí la ausencia de evidencia es un bloqueo,
    // no una espera.
    const humanAuthorizedShadow = decision.status === 'shadow' && context.approvalGranted === true;
    if (decision.status !== 'approved' && !humanAuthorizedShadow) {
      return this.denied(
        id,
        decision.state,
        'CAPABILITY_NOT_APPROVED',
        `La capacidad está en ${decision.status}: ${decision.reasons.join('; ') || 'sin aprobación'}.`,
        { status: decision.status, reasons: decision.reasons }
      );
    }

    const autonomy = contract.body.governance.autonomy;
    if (autonomyRank(autonomy) > autonomyRank(CONTRACT_CEILINGS.executableAutonomy)) {
      return this.denied(
        id,
        decision.state,
        'CAPABILITY_AUTONOMY_EXCEEDS_RUNTIME_CEILING',
        `A4/A5 implican gasto, contrato o acción irreversible: se desplegan por operación humana, no por este motor.`,
        { autonomy, ceiling: CONTRACT_CEILINGS.executableAutonomy }
      );
    }

    if (contract.body.governance.approvalRequired && !context.approvalGranted) {
      return this.denied(
        id,
        decision.state,
        'CAPABILITY_APPROVAL_REQUIRED',
        'Requiere aprobación humana verificada por el servidor.',
        { approvalSource: 'none' }
      );
    }

    const input = contract.inputSchema.safeParse(args);
    if (!input.success) {
      return this.denied(
        id,
        decision.state,
        'CAPABILITY_INPUT_INVALID',
        'La entrada no conforme el esquema de la capacidad.',
        { issues: schemaIssues(input.error) }
      );
    }

    let serialized = '';
    try {
      serialized = JSON.stringify(args);
    } catch {
      serialized = '';
    }
    if (
      !serialized ||
      Buffer.byteLength(serialized, 'utf8') > contract.body.execution.maxInputBytes
    ) {
      return this.denied(
        id,
        decision.state,
        'CAPABILITY_INPUT_OVER_LIMIT',
        'La entrada excede el límite declarado por la capacidad.',
        { maxInputBytes: contract.body.execution.maxInputBytes }
      );
    }

    const inputHash = hashToolCall(contract.id, args);
    const settled = await withinMs(
      contract.body.execution.timeoutMs,
      this.tools.execute(contract.body.toolId, args, context)
    );

    if (settled.timedOut || !settled.value) {
      const record = this.ledger.append({
        toolId: contract.id,
        inputHash,
        outputHash: jsonShape({ error: 'CAPABILITY_TIMEOUT' }),
        ok: false,
        summary: `Ejecución de ${contract.id} excedió ${contract.body.execution.timeoutMs} ms.`,
        at: this.now(),
      });
      return this.denied(
        id,
        decision.state,
        'CAPABILITY_TIMEOUT',
        'La capacidad agotó su techo de tiempo; no se reintentó.',
        { evidenceId: record.id, timeoutMs: contract.body.execution.timeoutMs }
      );
    }

    const result = settled.value;
    const outputPayload = { ok: result.ok, summary: result.summary, output: result.output };

    if (result.ok) {
      const checked = contract.outputSchema.safeParse(result.output);
      if (!checked.success) {
        // Salida no conforme: se sella el fallo y se retiene el cuerpo. Un contrato
        // que no puede describir su salida no puede servir su salida.
        const record = this.ledger.append({
          toolId: contract.id,
          inputHash,
          outputHash: jsonShape({ error: 'CAPABILITY_OUTPUT_INVALID' }),
          ok: false,
          summary: `Salida de ${contract.id} no conforme el esquema; contenido retenido.`,
          at: this.now(),
        });
        return this.denied(
          id,
          decision.state,
          'CAPABILITY_OUTPUT_INVALID',
          'La salida no conforme el esquema de la capacidad y fue retenida.',
          { evidenceId: record.id, issues: schemaIssues(checked.error) }
        );
      }
      if (
        Buffer.byteLength(JSON.stringify(result.output) ?? '', 'utf8') >
        contract.body.execution.maxOutputBytes
      ) {
        const record = this.ledger.append({
          toolId: contract.id,
          inputHash,
          outputHash: jsonShape({ error: 'CAPABILITY_OUTPUT_OVER_LIMIT' }),
          ok: false,
          summary: `Salida de ${contract.id} excedió el límite de bytes; retenida.`,
          at: this.now(),
        });
        return this.denied(
          id,
          decision.state,
          'CAPABILITY_OUTPUT_OVER_LIMIT',
          'La salida excedió el límite declarado y fue retenida.',
          { evidenceId: record.id, maxOutputBytes: contract.body.execution.maxOutputBytes }
        );
      }
    }

    const record = this.ledger.append({
      toolId: contract.id,
      inputHash,
      outputHash: jsonShape(outputPayload),
      ok: result.ok,
      summary: result.summary.slice(0, 300),
      at: this.now(),
    });

    return {
      ok: result.ok,
      status: result.ok ? 'executed' : 'failed',
      code: result.ok ? 'CAPABILITY_EXECUTED' : 'CAPABILITY_TOOL_FAILED',
      summary: result.summary,
      output: result.output,
      evidenceId: record.id,
      capability: contract.id,
      state: this.evaluate(id).state,
      ...(humanAuthorizedShadow ? { humanAuthorizedShadow: true } : {}),
    };
  }

  /**
   * Reversión: solo si el contrato declara una herramienta compensatoria y esa
   * herramienta está registrada. Sin compensación declarada devuelve el hecho, no
   * un éxito simulado.
   */
  async rollback(id: string, context: ToolContext): Promise<CapabilityExecutionResult> {
    const contract = this.contracts.get(id);
    if (!contract) {
      return this.denied(id, 'unavailable', 'CAPABILITY_NOT_FOUND', 'Capacidad no registrada.');
    }
    const decision = this.evaluate(id);
    const rollback = contract.body.rollback;
    if (rollback.strategy !== 'compensating-tool' || !rollback.toolId) {
      return this.denied(id, decision.state, 'CAPABILITY_ROLLBACK_UNDECLARED', rollback.note, {
        strategy: rollback.strategy,
      });
    }
    if (!this.tools.has(rollback.toolId)) {
      return this.denied(
        id,
        decision.state,
        'CAPABILITY_ROLLBACK_TOOL_MISSING',
        'La herramienta compensatoria declarada no está registrada.',
        { toolId: rollback.toolId }
      );
    }
    const result = await this.tools.execute(rollback.toolId, { capabilityId: id }, context);
    const record = this.ledger.append({
      toolId: `${contract.id}.rollback`,
      inputHash: hashToolCall(`${contract.id}.rollback`, { capabilityId: id }),
      outputHash: jsonShape(result),
      ok: result.ok,
      summary: result.summary.slice(0, 300),
      at: this.now(),
    });
    return {
      ok: result.ok,
      status: result.ok ? 'executed' : 'failed',
      code: result.ok ? 'CAPABILITY_ROLLED_BACK' : 'CAPABILITY_ROLLBACK_FAILED',
      summary: result.summary,
      output: result.output,
      evidenceId: record.id,
      capability: contract.id,
      state: decision.state,
    };
  }

  /** Retiro explícito: la deja inejecutable sin borrar la evidencia. */
  retire(id: string): boolean {
    return this.contracts.delete(id) && (this.decisions.delete(id), true);
  }

  size(): number {
    return this.contracts.size;
  }

  private denied(
    capability: string,
    state: CapabilityState,
    code: string,
    summary: string,
    detail: Record<string, unknown> = {}
  ): CapabilityExecutionResult {
    return {
      ok: false,
      status: 'denied',
      code,
      summary,
      output: { error: code, ...detail },
      capability,
      state,
    };
  }
}

function pickTerm(term: { score: number; observed: boolean; basis: string; weight: number }): {
  score: number;
  observed: boolean;
  basis: string;
} {
  return { score: term.score, observed: term.observed, basis: term.basis };
}

export function createCapabilityEngine(options: CapabilityEngineOptions): CapabilityEngine {
  return new CapabilityEngine(options);
}
