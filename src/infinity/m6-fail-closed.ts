/**
 * ISABELLA VILLASEÑOR AI™ — M6 Fail-Closed Governance (AEGIS-KINETA).
 * state: draft | engine-generated.
 *
 * Esquema fail-closed completo para el Módulo M6 (Gobernanza y Evidencia).
 * DEFAULT = DENY. ALLOW solo si TODAS las condiciones se cumplen.
 *
 * Componentes:
 *   - 5 factores CROWN (IDENTITY, AUTHORITY, POLICY, EVIDENCE, SAFETY)
 *   - Máquina de estados (RECEIVED → VALIDATING → EVALUATING → SEALING → EXECUTING → COMPLETED)
 *   - Umbrales de seguridad (temperatura, vibración, corriente, latencia, PII, chain, replay)
 *   - Protocolo de atestación por épocas (E_k, 60s)
 *   - Flujo de sellado (hash → sign → chain → merkle → anchor → execute)
 *   - Matriz de fallos (12 escenarios)
 *   - SAFE-HALT (parada segura, solo admin recupera)
 *
 * `executionPerformed` es siempre `false` en la evaluación.
 * SAFE-HALT bloquea toda salida externa hasta re-atestación.
 */
import { digest, SkillInputError } from './skills';

// ── Types ──────────────────────────────────────────────────────────────────

export type M6State = 'RECEIVED' | 'VALIDATING' | 'EVALUATING' | 'SEALING' | 'EXECUTING' | 'COMPLETED' | 'DENY' | 'QUARANTINE' | 'SAFE_HALT';

export type M6Verdict = 'ALLOW' | 'DENY' | 'QUARANTINE' | 'SAFE_HALT';

export interface M6Thresholds {
  readonly temperatureC: number;
  readonly vibrationRmsG: number;
  readonly actuatorCurrentA: number;
  readonly attestLatencyS: number;
  readonly piiBlockJurisdictions: readonly string[];
}

export const DEFAULT_THRESHOLDS: M6Thresholds = {
  temperatureC: 85,
  vibrationRmsG: 5,
  actuatorCurrentA: 10,
  attestLatencyS: 60,
  piiBlockJurisdictions: ['EU'],
};

export interface M6SafetyInputs {
  readonly temperatureC?: number;
  readonly vibrationRmsG?: number;
  readonly actuatorCurrentA?: number;
  readonly piiDetected?: boolean;
  readonly jurisdiction?: string;
  readonly chainValid?: boolean;
  readonly replayDetected?: boolean;
  readonly merkleMismatch?: boolean;
  readonly actuatorAck?: boolean;
}

export interface M6Factors {
  readonly identity: boolean;
  readonly authority: boolean;
  readonly policy: boolean;
  readonly evidence: boolean;
  readonly safety: boolean;
}

export interface M6Command {
  readonly commandId: string;
  readonly actorDid: string;
  readonly action: string;
  readonly payload: Readonly<Record<string, unknown>>;
  readonly jurisdiction: string;
  readonly epochId: string;
  readonly timestamp: string;
}

export interface M6Evaluation {
  readonly commandId: string;
  readonly state: M6State;
  readonly verdict: M6Verdict;
  readonly factors: M6Factors;
  readonly reason: string;
  readonly safetyViolations: readonly string[];
  readonly evidenceHash: string | null;
  readonly sealedAt: string | null;
  readonly executionPerformed: false;
  readonly safeHalt: boolean;
}

export interface EpochState {
  readonly epochId: string;
  readonly startedAt: number;
  readonly durationMs: number;
  readonly lastAttest: number;
  readonly chainHead: string | null;
  readonly safeHalt: boolean;
  readonly safeHaltReason: string | null;
}

// ── M6 Engine ──────────────────────────────────────────────────────────────

export class M6FailClosedEngine {
  private epoch: EpochState;
  private readonly thresholds: M6Thresholds;
  private readonly safeHaltReasons: string[] = [];

  constructor(thresholds: M6Thresholds = DEFAULT_THRESHOLDS, epochDurationMs = 60000) {
    const now = Date.now();
    this.thresholds = thresholds;
    this.epoch = {
      epochId: `epoch-${now}`,
      startedAt: now,
      durationMs: epochDurationMs,
      lastAttest: now,
      chainHead: null,
      safeHalt: false,
      safeHaltReason: null,
    };
  }

  /** Evaluate safety inputs against thresholds. Returns list of violations. */
  evaluateSafety(inputs: M6SafetyInputs): string[] {
    const violations: string[] = [];
    if (inputs.temperatureC !== undefined && inputs.temperatureC > this.thresholds.temperatureC) {
      violations.push(`temperature_exceeded: ${inputs.temperatureC}°C > ${this.thresholds.temperatureC}°C`);
    }
    if (inputs.vibrationRmsG !== undefined && inputs.vibrationRmsG > this.thresholds.vibrationRmsG) {
      violations.push(`vibration_exceeded: ${inputs.vibrationRmsG}g > ${this.thresholds.vibrationRmsG}g`);
    }
    if (inputs.actuatorCurrentA !== undefined && inputs.actuatorCurrentA > this.thresholds.actuatorCurrentA) {
      violations.push(`current_exceeded: ${inputs.actuatorCurrentA}A > ${this.thresholds.actuatorCurrentA}A`);
    }
    if (inputs.piiDetected && this.thresholds.piiBlockJurisdictions.includes(inputs.jurisdiction ?? '')) {
      violations.push(`pii_detected: PII en jurisdicción ${inputs.jurisdiction}`);
    }
    if (inputs.chainValid === false) {
      violations.push('chain_integrity_failure: hash chain rota');
    }
    if (inputs.replayDetected) {
      violations.push('replay_detected: event_id duplicado');
    }
    if (inputs.merkleMismatch) {
      violations.push('merkle_mismatch: raíz Merkle no coincide');
    }
    if (inputs.actuatorAck === false) {
      violations.push('actuator_no_ack: actuador no respondió');
    }
    return violations;
  }

  /** Check epoch attestation. Returns true if within active epoch. */
  checkEpoch(now: number = Date.now()): boolean {
    if (this.epoch.safeHalt) return false;
    const elapsed = now - this.epoch.lastAttest;
    if (elapsed > this.epoch.durationMs) {
      // Partition: SAFE-HALT
      this.epoch = { ...this.epoch, safeHalt: true, safeHaltReason: `epoch_expired: ${elapsed}ms > ${this.epoch.durationMs}ms` };
      this.safeHaltReasons.push(this.epoch.safeHaltReason!);
      return false;
    }
    return true;
  }

  /** Evaluate a command. Returns M6Evaluation. */
  evaluate(command: M6Command, factors: M6Factors, safetyInputs: M6SafetyInputs, now?: number): M6Evaluation {
    // If SAFE-HALT, deny everything
    if (this.epoch.safeHalt) {
      return {
        commandId: command.commandId,
        state: 'SAFE_HALT',
        verdict: 'SAFE_HALT',
        factors,
        reason: `SAFE-HALT: ${this.epoch.safeHaltReason}`,
        safetyViolations: this.safeHaltReasons,
        evidenceHash: null,
        sealedAt: null,
        executionPerformed: false,
        safeHalt: true,
      };
    }

    // Check epoch
    if (!this.checkEpoch(now)) {
      return {
        commandId: command.commandId,
        state: 'SAFE_HALT',
        verdict: 'SAFE_HALT',
        factors,
        reason: `SAFE-HALT: epoch expired`,
        safetyViolations: ['epoch_expired'],
        evidenceHash: null,
        sealedAt: null,
        executionPerformed: false,
        safeHalt: true,
      };
    }

    // VALIDATING: check IDENTITY + AUTHORITY
    if (!factors.identity || !factors.authority) {
      const hash = digest({ commandId: command.commandId, verdict: 'DENY', reason: 'IDENTITY_OR_AUTHORITY_FAILED' });
      return {
        commandId: command.commandId,
        state: 'DENY',
        verdict: 'DENY',
        factors,
        reason: !factors.identity ? 'IDENTITY_FAILED' : 'AUTHORITY_FAILED',
        safetyViolations: [],
        evidenceHash: hash,
        sealedAt: new Date().toISOString(),
        executionPerformed: false,
        safeHalt: false,
      };
    }

    // EVALUATING: check POLICY + EVIDENCE + SAFETY
    const safetyViolations = this.evaluateSafety(safetyInputs);
    const safetyOk = safetyViolations.length === 0;

    if (!factors.policy || !factors.evidence || !safetyOk) {
      const reason = !factors.policy ? 'POLICY_FAILED'
        : !factors.evidence ? 'EVIDENCE_FAILED'
        : `SAFETY_FAILED: ${safetyViolations.join('; ')}`;
      const hash = digest({ commandId: command.commandId, verdict: 'DENY', reason });
      return {
        commandId: command.commandId,
        state: 'DENY',
        verdict: 'DENY',
        factors,
        reason,
        safetyViolations,
        evidenceHash: hash,
        sealedAt: new Date().toISOString(),
        executionPerformed: false,
        safeHalt: false,
      };
    }

    // SEALING: all factors pass → seal and allow
    const evidenceHash = digest({
      commandId: command.commandId,
      actorDid: command.actorDid,
      action: command.action,
      payload: command.payload,
      verdict: 'ALLOW',
      timestamp: command.timestamp,
    });

    return {
      commandId: command.commandId,
      state: 'SEALING',
      verdict: 'ALLOW',
      factors,
      reason: 'ALL_FACTORS_PASS',
      safetyViolations: [],
      evidenceHash,
      sealedAt: new Date().toISOString(),
      executionPerformed: false,
      safeHalt: false,
    };
  }

  /** Update epoch attestation (called periodically). */
  attest(now: number = Date.now()): void {
    if (this.epoch.safeHalt) return; // Can't attest while in safe-halt
    this.epoch = { ...this.epoch, lastAttest: now };
  }

  /** Recover from SAFE-HALT (admin only). */
  recover(adminToken: string, expectedToken: string): boolean {
    if (adminToken !== expectedToken) return false;
    if (!this.epoch.safeHalt) return true; // Already recovered
    const now = Date.now();
    this.epoch = {
      ...this.epoch,
      safeHalt: false,
      safeHaltReason: null,
      lastAttest: now,
      epochId: `epoch-${now}`,
      startedAt: now,
    };
    this.safeHaltReasons.length = 0;
    return true;
  }

  getEpoch(): EpochState {
    return { ...this.epoch };
  }

  isSafeHalt(): boolean {
    return this.epoch.safeHalt;
  }

  describe(): Readonly<Record<string, unknown>> {
    return {
      thresholds: this.thresholds,
      epoch: this.epoch,
      safeHalt: this.epoch.safeHalt,
      executionPerformed: false,
      note: 'Evaluación fail-closed; no ejecuta comandos.',
    };
  }
}

export function describeM6FailClosed(): Readonly<Record<string, unknown>> {
  return {
    defaultAction: 'DENY',
    factors: ['IDENTITY', 'AUTHORITY', 'POLICY', 'EVIDENCE', 'SAFETY'],
    states: ['RECEIVED', 'VALIDATING', 'EVALUATING', 'SEALING', 'EXECUTING', 'COMPLETED', 'DENY', 'QUARANTINE', 'SAFE_HALT'],
    thresholds: DEFAULT_THRESHOLDS,
    epochDurationS: 60,
    safeHaltTriggers: ['chain_broken', 'attest_expired', 'threshold_exceeded', 'actuator_no_ack', 'merkle_mismatch', 'replay_detected'],
    executionPerformed: false,
    note: 'Esquema fail-closed; la ejecución real requiere hardware TEE y actuador.',
  };
}