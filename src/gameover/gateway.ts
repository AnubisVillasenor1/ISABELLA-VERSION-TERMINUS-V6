/**
 * GAME OVER UagpGateway (UAGP-1).
 *
 * Orchestrates the governance pipeline: validate -> passport -> ethics -> trust
 * -> risk -> adjudicate -> human approval -> explain -> audit. state: draft |
 * engine-generated. It returns an authorization decision; it never executes the
 * governed action and never certifies it.
 */
import { createAuditService, type AuditService } from "./audit";
import { adjudicate } from "./cognitive-court";
import { GAMEOVER_CONSTITUTION } from "./constitution";
import { evaluateEthics } from "./ethics-engine";
import { explainDecision } from "./explainability-engine";
import { evaluateHumanApproval } from "./human-approval-gate";
import { createPassportAuthority, type PassportAuthority } from "./passport-authority";
import { assessRisk } from "./risk-engine";
import { scoreTrust } from "./trust-engine";
import {
  GAMEOVER_DISCLAIMER,
  UAGP_PROTOCOL,
  type DecisionOutcome,
  type GovernanceDecision,
  type UagpRequestInput,
  type UagpResult,
} from "./types";
import { validateRequest } from "./validator";

export interface GovernContext {
  readonly authenticatedPrincipal?: string;
}

export interface UagpGateway {
  govern(input: UagpRequestInput, context?: GovernContext): UagpResult;
}

export interface UagpGatewayOptions {
  readonly passportAuthority?: PassportAuthority;
  readonly audit?: AuditService;
}

function isHighRiskAction(actions: readonly string[]): boolean {
  const normalized = actions.map((action) => action.toLowerCase());
  return normalized.some((action) =>
    GAMEOVER_CONSTITUTION.highRiskActions.some((token) => action === token || action.includes(token)),
  );
}

export function createUagpGateway(options: UagpGatewayOptions = {}): UagpGateway {
  const passportAuthority = options.passportAuthority ?? createPassportAuthority();
  const audit = options.audit ?? createAuditService();

  function govern(input: UagpRequestInput, context: GovernContext = {}): UagpResult {
    const passport = passportAuthority.verify(input.passportId);
    const validation = validateRequest(input);
    const trust = scoreTrust(input.trustMetrics ?? {});
    const risk = assessRisk({ criticality: input.criticality, capabilityCount: input.agent.capabilities.length });
    const ethics = evaluateEthics({
      agent: input.agent,
      objectiveTitle: input.objectiveTitle,
      objectiveDescription: input.objectiveDescription,
      actions: input.actions,
      dataClasses: input.dataClasses,
      evidence: input.evidence ?? [],
    });

    const humanApprovalRequired =
      input.humanApprovalRequired ?? (risk.level === "HIGH" || risk.level === "CRITICAL" || isHighRiskAction(input.actions));
    const human = evaluateHumanApproval({
      required: humanApprovalRequired,
      requestedApprover: input.humanApprover,
      authenticatedPrincipal: context.authenticatedPrincipal,
    });

    const rationale: string[] = [];
    let outcome: DecisionOutcome;

    if (!validation.valid) {
      outcome = "REJECT";
      rationale.push(...validation.errors.map((error) => `INVALID:${error}`));
    } else if (!passport.valid) {
      outcome = "REJECT";
      rationale.push(`PASSPORT:${passport.reason}`);
    } else if (!ethics.passed) {
      outcome = "REJECT";
      rationale.push(...ethics.violations);
    } else {
      const verdict = adjudicate({ ethicsPassed: true, riskLevel: risk.level, trustScore: trust.score });
      outcome = verdict.outcome;
      rationale.push(...verdict.rationale);
    }

    let approver: string | null = null;
    if (outcome === "ACCEPT" && humanApprovalRequired) {
      if (human.satisfied) {
        approver = human.approver;
        rationale.push("HUMAN_APPROVED");
      } else {
        outcome = "ESCALATE";
        rationale.push(human.reason);
      }
    }

    const explanation = explainDecision({
      outcome,
      rationale,
      trustScore: trust.score,
      riskLevel: risk.level,
      ethicsPassed: ethics.passed,
      humanApprovalRequired,
      humanApprover: approver,
    });

    const decision: GovernanceDecision = Object.freeze({
      requestId: input.requestId,
      timestamp: new Date().toISOString(),
      outcome,
      rationale: Object.freeze(rationale),
      trustScore: trust.score,
      riskLevel: risk.level,
      ethicsPassed: ethics.passed,
      ethicsViolations: ethics.violations,
      humanApprovalRequired,
      humanApprover: approver,
      explainability: explanation,
    });

    const entry = audit.record({
      principal: approver ?? input.agent.id ?? "unknown",
      riskTier: risk.level,
      status: `GOVERNANCE_${outcome}`,
    });
    const storage = audit.snapshot().storage;

    return Object.freeze({
      requestId: input.requestId,
      protocol: UAGP_PROTOCOL,
      outcome,
      allowed: outcome === "ACCEPT",
      decision,
      trust,
      risk,
      passport,
      validation,
      audit: Object.freeze({ hash: entry.hash, sequence: entry.sequence, storage }),
      disclaimer: GAMEOVER_DISCLAIMER,
    });
  }

  return { govern };
}
