import { describe, expect, it } from "vitest";
import { evaluateMandate, type TerminusMandate, type TerminusPolicy } from "../../src/terminus/mandate";

const now = Date.parse("2026-10-12T12:00:00.000Z");
const policy: TerminusPolicy = {
  version: "v1", maxTtlMs: 3_600_000, maxExecutionsPerMandate: 5, maxEvidenceReferences: 4, escalationRiskThreshold: 80,
  riskLimits: { legal: 50, financial: 50, operational: 60, reputational: 50, cybersecurity: 50, privacy: 50, humanSafety: 40, systemic: 40 },
  budgetLimits: { latencyMs: 1500, toolCalls: 10, bytes: 1_000_000, energyMilliJoules: 50_000 },
  allowedOperationsByCapability: { "database.read": ["SELECT"] }, hardDeniedCapabilities: ["payment.execute"],
  hardDeniedOperations: ["DROP", "DELETE"],
};
function makeMandate(): TerminusMandate {
  return {
    id: "mandate-1", tenantId: "tenant-1", subjectId: "requester", identityAuthenticated: true,
    capability: "database.read", resources: ["records:tenant-1"], purpose: "Validate consistency", operations: ["SELECT"],
    evidence: [{ id: "evidence-1", sha256: "a".repeat(64), source: "control-plane" }],
    risk: { legal: 10, financial: 5, operational: 20, reputational: 10, cybersecurity: 15, privacy: 20, humanSafety: 0, systemic: 5 },
    authorityChain: { requester: "requester", technicalReviewer: "tech", legalReviewer: "legal", securityReviewer: "security",
      approver: "approver", executor: "executor", supervisor: "supervisor", auditor: "auditor" },
    policyVersion: "v1", issuedAt: new Date(now - 1000).toISOString(), expiresAt: new Date(now + 60_000).toISOString(),
    maxExecutions: 2, remainingExecutions: 2, budget: { latencyMs: 500, toolCalls: 2, bytes: 4096, energyMilliJoules: 1000 },
  };
}
describe("Terminus method mandate", () => {
  it("allows bounded scoped requests with distinct authority actors", () => {
    expect(evaluateMandate(makeMandate(), policy, now).verdict).toBe("ALLOW");
  });
  it("denies expired mandates", () => {
    const mandate = makeMandate();
    mandate.expiresAt = new Date(now - 1).toISOString();
    expect(evaluateMandate(mandate, policy, now).reasonCodes).toContain("MANDATE_EXPIRED_OR_INVALID");
  });
  it("denies duplicated authority actors", () => {
    const mandate = makeMandate();
    mandate.authorityChain.auditor = mandate.authorityChain.requester;
    expect(evaluateMandate(mandate, policy, now).reasonCodes).toContain("AUTHORITY_SEPARATION_VIOLATION");
  });
  it("escalates high risk without a linked human approval", () => {
    const mandate = makeMandate();
    mandate.risk.privacy = 85;
    const result = evaluateMandate(mandate, policy, now);
    expect(result.verdict).toBe("ESCALATE");
    expect(result.dossierHash).toMatch(/^[a-f0-9]{64}$/);
  });
  it("denies forbidden operations independently of the capability name", () => {
    const mandate = makeMandate();
    mandate.operations = ["DELETE"];
    expect(evaluateMandate(mandate, policy, now).reasonCodes).toContain("OPERATION_NOT_ALLOWED");
  });
});
