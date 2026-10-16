/**
 * Constitutional Governance Fabric (CGF) — unifica CROWN/GAME OVER/EOCT/AEGIS/TERMINUS/BAM-R/UAGP (state: draft | engine-generated).
 *
 * Autoridad única de gobernanza: evalúa política + riesgo + aprobación y emite una decisión constitucional
 * (allow/deny/escalate) con dossier de evidencia. Compone; no duplica la lógica de los subsistemas.
 *
 * CAPABILITY ≠ AUTHORITY ≠ EXECUTION ≠ EVIDENCE ≠ LEARNING ≠ PRODUCTION.
 */
export type ConstitutionalDecision = "allow" | "deny" | "escalate";

export interface GovernanceInput {
  readonly actor: string;
  readonly action: string;
  readonly resource: string;
  readonly riskScore: number;
  readonly policyAllowed: boolean;
  readonly approvalGranted: boolean;
  readonly evidencePresent: boolean;
}

export interface GovernanceDossier {
  readonly id: string;
  readonly actor: string;
  readonly action: string;
  readonly resource: string;
  readonly decision: ConstitutionalDecision;
  readonly riskScore: number;
  readonly reasons: readonly string[];
  readonly timestamp: string;
}

export class ConstitutionalGovernanceFabric {
  private readonly dossiers: GovernanceDossier[] = [];
  private seq = 0;

  evaluate(input: GovernanceInput): GovernanceDossier {
    if (typeof input.actor !== "string" || input.actor.length === 0) throw new RangeError("CGF: actor required");
    if (typeof input.action !== "string" || input.action.length === 0) throw new RangeError("CGF: action required");
    if (typeof input.resource !== "string" || input.resource.length === 0) throw new RangeError("CGF: resource required");
    if (!Number.isFinite(input.riskScore) || input.riskScore < 0 || input.riskScore > 1) throw new RangeError("CGF: riskScore 0..1");
    const reasons: string[] = [];
    let decision: ConstitutionalDecision = "allow";
    if (!input.policyAllowed) { decision = "deny"; reasons.push("POLICY_DENIED"); }
    if (input.riskScore >= 0.8) { decision = "escalate"; reasons.push("HIGH_RISK"); }
    if (!input.approvalGranted && input.riskScore >= 0.5) { decision = "escalate"; reasons.push("APPROVAL_REQUIRED"); }
    if (!input.evidencePresent) { decision = "deny"; reasons.push("EVIDENCE_MISSING"); }
    if (decision === "allow" && input.riskScore >= 0.3) { decision = "escalate"; reasons.push("MODERATE_RISK"); }
    const dossier: GovernanceDossier = {
      id: `dossier-${(this.seq += 1)}`, actor: input.actor, action: input.action, resource: input.resource,
      decision, riskScore: input.riskScore, reasons, timestamp: new Date().toISOString(),
    };
    this.dossiers.push(dossier);
    return dossier;
  }

  listDossiers(limit?: number): readonly GovernanceDossier[] {
    if (limit === undefined) return [...this.dossiers];
    if (!Number.isInteger(limit) || limit < 1) throw new RangeError("CGF: limit positive");
    return this.dossiers.slice(-limit);
  }

  byActor(actor: string): readonly GovernanceDossier[] { return this.dossiers.filter((d) => d.actor === actor); }
  byDecision(decision: ConstitutionalDecision): readonly GovernanceDossier[] { return this.dossiers.filter((d) => d.decision === decision); }

  stats(): { total: number; allow: number; deny: number; escalate: number } {
    return {
      total: this.dossiers.length,
      allow: this.dossiers.filter((d) => d.decision === "allow").length,
      deny: this.dossiers.filter((d) => d.decision === "deny").length,
      escalate: this.dossiers.filter((d) => d.decision === "escalate").length,
    };
  }
}
