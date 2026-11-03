import { describe, expect, it, vi } from "vitest";
import {
  APPROVAL_REQUIRED_SCOPES,
  DEV_AGENT_PROFILES,
  DEV_AGENT_ROLES,
  DevAgentMesh,
  evaluateMeshAction,
} from "../../src/agents/mesh";
import { createPlannerAdapter, createReviewerAdapter, decomposeObjective } from "../../src/agents/mesh-adapters";
import { InMemoryBookPiLedger } from "../../src/bookpi/ledger";

function ledger() {
  return new InMemoryBookPiLedger();
}

describe("CERO agent mesh — permission matrix", () => {
  it("declares the ten canonical dev roles with their CERO scopes", () => {
    expect(DEV_AGENT_ROLES).toHaveLength(10);
    for (const role of DEV_AGENT_ROLES) {
      expect(DEV_AGENT_PROFILES[role].role).toBe(role);
      expect(DEV_AGENT_PROFILES[role].scopes.length).toBeGreaterThan(0);
    }
    expect(DEV_AGENT_PROFILES.planner.scopes).toEqual(["memory.read", "repo.read", "plan.create"]);
    expect(DEV_AGENT_PROFILES.coder.scopes).toContain("sandbox.write");
    expect(DEV_AGENT_PROFILES.coder.scopes).not.toContain("deploy.execute");
    expect(DEV_AGENT_PROFILES.security.scopes).toEqual(["memory.read", "repo.read", "security.scan"]);
    expect(APPROVAL_REQUIRED_SCOPES).toContain("payment.execute");
  });

  it("denies an action outside the role scopes", () => {
    const decision = evaluateMeshAction({
      role: "planner",
      action: "deploy.execute",
      risk: "low",
      approvalGranted: true,
    });
    expect(decision.verdict).toBe("DENY");
    expect(decision.reason).toContain("SCOPE_NOT_GRANTED");
    expect(decision.authorizesExecution).toBe(false);
  });

  it("escalates critical scopes without a server-verified approval", () => {
    const withoutApproval = evaluateMeshAction({
      role: "devops",
      action: "deploy.request",
      risk: "medium",
      approvalGranted: false,
    });
    expect(withoutApproval.verdict).toBe("ESCALATE");
    expect(withoutApproval.requiresHumanApproval).toBe(true);

    const withApproval = evaluateMeshAction({
      role: "devops",
      action: "deploy.request",
      risk: "medium",
      approvalGranted: true,
    });
    expect(withApproval.verdict).toBe("ALLOW");
    expect(withApproval.reason).toBe("POLICY_SATISFIED_WITH_HUMAN_APPROVAL");
  });

  it("escalates a risk above the role ceiling even for an allowed scope", () => {
    const decision = evaluateMeshAction({
      role: "planner",
      action: "plan.create",
      risk: "high",
      approvalGranted: false,
    });
    expect(decision.verdict).toBe("ESCALATE");
    expect(decision.reason).toContain("HUMAN_APPROVAL_REQUIRED");
  });

  it("denies an unknown role at runtime instead of trusting the type", () => {
    const decision = evaluateMeshAction({
      role: "root" as never,
      action: "repo.read",
      risk: "low",
      approvalGranted: true,
    });
    expect(decision.verdict).toBe("DENY");
    expect(decision.reason).toContain("UNKNOWN_ROLE");
  });
});

describe("CERO agent mesh — deterministic adapters", () => {
  it("splits an objective into bounded, deduplicated steps", () => {
    const steps = decomposeObjective("leer el repo → proponer parche → ejecutar pruebas; leer el repo");
    expect(steps).toEqual(["leer el repo", "proponer parche", "ejecutar pruebas"]);
    expect(decomposeObjective("   ")).toEqual([]);
    expect(decomposeObjective("a".repeat(500))[0]?.length).toBeLessThanOrEqual(240);
  });

  it("plans without executing and completes through the mesh", async () => {
    const bookpi = ledger();
    const mesh = new DevAgentMesh({ ledger: bookpi });
    mesh.register(createPlannerAdapter());

    const result = await mesh.submit({
      objective: "leer el repositorio → proponer un parche → ejecutar pruebas",
      role: "planner",
      action: "plan.create",
      risk: "low",
      approvalGranted: false,
    });

    expect(result.verdict).toBe("ALLOW");
    expect(result.status).toBe("COMPLETED");
    expect(result.adapter).toBe("deterministic-planner");
    expect(result.output?.executes).toBe(false);
    expect(Array.isArray(result.output?.steps)).toBe(true);
    expect(result.evidence?.sequence).toBe(1);
    expect(bookpi.list()).toHaveLength(1);
    expect(bookpi.list()[0]?.type).toBe("agent.mesh.completed");
    expect(bookpi.verify().valid).toBe(true);
  });

  it("reviews declared findings without claiming to modify code", async () => {
    const mesh = new DevAgentMesh();
    mesh.register(createReviewerAdapter());

    const clean = await mesh.submit({
      objective: "revisar el diff",
      role: "reviewer",
      action: "diff.read",
      risk: "low",
      approvalGranted: false,
      context: { findings: [], artifacts: [{ hash: "a".repeat(64) }] },
    });
    expect(clean.output?.verdict).toBe("CLEAN");
    expect(clean.output?.reviewedArtifacts).toBe(1);
    expect(clean.output?.executes).toBe(false);

    const flagged = await mesh.submit({
      objective: "revisar el diff",
      role: "reviewer",
      action: "diff.read",
      risk: "low",
      approvalGranted: false,
      context: { findings: ["sin prueba de regresión"] },
    });
    expect(flagged.output?.verdict).toBe("NEEDS_CHANGES");
  });

  it("blocks instead of simulating work when a role has no adapter", async () => {
    const bookpi = ledger();
    const mesh = new DevAgentMesh({ ledger: bookpi });

    const result = await mesh.submit({
      objective: "implementar OAuth2",
      role: "coder",
      action: "sandbox.write",
      risk: "medium",
      approvalGranted: true,
    });

    expect(result.verdict).toBe("ALLOW");
    expect(result.status).toBe("BLOCKED");
    expect(result.reason).toContain("NO_ADAPTER");
    expect(result.adapter).toBeNull();
    expect(bookpi.list()[0]?.type).toBe("agent.mesh.no_adapter");
  });

  it("never calls an adapter when policy escalates", async () => {
    const execute = vi.fn(async () => ({ summary: "no debería ejecutarse", output: {} }));
    const mesh = new DevAgentMesh();
    mesh.register({ role: "devops", name: "test-devops", execute });

    const result = await mesh.submit({
      objective: "solicitar despliegue",
      role: "devops",
      action: "deploy.request",
      risk: "medium",
      approvalGranted: false,
    });

    expect(result.verdict).toBe("ESCALATE");
    expect(result.status).toBe("NEEDS_APPROVAL");
    expect(execute).not.toHaveBeenCalled();
  });

  it("seals failures without hiding them", async () => {
    const bookpi = ledger();
    const mesh = new DevAgentMesh({ ledger: bookpi });
    mesh.register({
      role: "planner",
      name: "broken-planner",
      execute: async () => {
        throw new Error("ADAPTER_EXPLODED");
      },
    });

    const result = await mesh.submit({
      objective: "planificar",
      role: "planner",
      action: "plan.create",
      risk: "low",
      approvalGranted: false,
    });

    expect(result.status).toBe("FAILED");
    expect(result.reason).toBe("ADAPTER_EXPLODED");
    expect(bookpi.list()[0]?.type).toBe("agent.mesh.failed");
  });

  it("bounds adapter execution with a timeout", async () => {
    const mesh = new DevAgentMesh({ taskTimeoutMs: 5 });
    mesh.register({
      role: "planner",
      name: "hanging-planner",
      execute: () => new Promise(() => undefined),
    });

    const result = await mesh.submit({
      objective: "planificar",
      role: "planner",
      action: "plan.create",
      risk: "low",
      approvalGranted: false,
    });

    expect(result.status).toBe("FAILED");
    expect(result.reason).toBe("ADAPTER_TIMEOUT");
  });

  it("honours the concurrency limit across a parallel batch", async () => {
    let active = 0;
    let peak = 0;
    const mesh = new DevAgentMesh({ maxConcurrency: 2 });
    mesh.register({
      role: "planner",
      name: "counting-planner",
      execute: async () => {
        active += 1;
        peak = Math.max(peak, active);
        await new Promise((resolve) => setTimeout(resolve, 10));
        active -= 1;
        return { summary: "ok", output: { executes: false } };
      },
    });

    const results = await mesh.runParallel(
      Array.from({ length: 6 }, (_, index) => ({
        objective: `objetivo ${index}`,
        role: "planner" as const,
        action: "plan.create",
        risk: "low" as const,
        approvalGranted: false,
      })),
    );

    expect(results).toHaveLength(6);
    expect(results.every((result) => result.status === "COMPLETED")).toBe(true);
    expect(peak).toBeLessThanOrEqual(2);
  });

  it("describes roles and registered adapters without claiming production", () => {
    const mesh = new DevAgentMesh();
    mesh.register(createReviewerAdapter()).register(createPlannerAdapter());
    const description = mesh.describe();
    expect(description.roles).toHaveLength(10);
    expect(description.adapters).toEqual([
      { role: "planner", name: "deterministic-planner" },
      { role: "reviewer", name: "deterministic-reviewer" },
    ]);
    expect(description.executionSurfaces).toEqual(["library-only"]);
  });
});
