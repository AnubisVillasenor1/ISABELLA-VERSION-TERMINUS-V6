import { describe, expect, it } from "vitest";
import type { Application, Request, Response } from "express";
import type { FixedWindowRateLimiter } from "../../src/security/rate-limit";
import { registerDevAgentMeshRoutes } from "../../src/routes/agents-mesh";
import { DevAgentMesh } from "../../src/agents/mesh";
import { createPlannerAdapter } from "../../src/agents/mesh-adapters";

type Handler = (req: Request, res: Response) => void;

interface Captured {
  status: number;
  body: unknown;
}

function harness(options: { admin?: boolean; allow?: boolean } = {}) {
  const handlers = new Map<string, Handler>();
  const app = {
    get: (path: string, handler: Handler) => handlers.set(`GET ${path}`, handler),
    post: (path: string, handler: Handler) => handlers.set(`POST ${path}`, handler),
  } as unknown as Application;
  const mesh = new DevAgentMesh();
  mesh.register(createPlannerAdapter());
  registerDevAgentMeshRoutes({
    app,
    mesh,
    enforceRateLimit: () => options.allow ?? true,
    rateLimiter: {} as FixedWindowRateLimiter,
    isAdminAuthorized: () => options.admin ?? false,
  });
  return handlers;
}

function makeRes(): { res: Response; captured: Captured } {
  const captured: Captured = { status: 200, body: undefined };
  const res = {
    status(code: number) {
      captured.status = code;
      return this;
    },
    json(payload: unknown) {
      captured.body = payload;
      return this;
    },
  };
  return { res: res as unknown as Response, captured };
}

function call(
  handlers: Map<string, Handler>,
  key: string,
  body: Record<string, unknown> = {},
): Captured {
  const { res, captured } = makeRes();
  handlers.get(key)!({ body } as unknown as Request, res);
  return captured;
}

describe("CERO agent mesh routes", () => {
  it("publishes the ten roles and declares the surface non-production", () => {
    const captured = call(harness(), "GET /api/v1/agents/mesh");
    const body = captured.body as {
      success: boolean;
      production: boolean;
      executionPerformed: boolean;
      roles: Array<{ role: string }>;
      adapters: Array<{ role: string }>;
      disclaimers: string[];
    };
    expect(body.success).toBe(true);
    expect(body.production).toBe(false);
    expect(body.executionPerformed).toBe(false);
    expect(body.roles).toHaveLength(10);
    expect(body.roles[0]?.role).toBe("planner");
    expect(body.adapters).toEqual([{ role: "planner", name: "deterministic-planner" }]);
    expect(body.disclaimers.join(" ")).toContain("no autoriza ni ejecuta");
  });

  it("rejects an evaluate request without a valid role, action or risk", () => {
    const handlers = harness();
    expect(call(handlers, "POST /api/v1/agents/mesh/evaluate", {}).status).toBe(400);
    expect(
      call(handlers, "POST /api/v1/agents/mesh/evaluate", { role: "root", action: "x" }).status,
    ).toBe(400);
    expect(
      call(handlers, "POST /api/v1/agents/mesh/evaluate", { role: "coder", action: "" }).status,
    ).toBe(400);
    expect(
      call(handlers, "POST /api/v1/agents/mesh/evaluate", {
        role: "coder",
        action: "sandbox.write",
        risk: "apocalyptic",
      }).status,
    ).toBe(400);
  });

  it("evaluates an allowed action without executing or authorizing", () => {
    const captured = call(harness(), "POST /api/v1/agents/mesh/evaluate", {
      role: "coder",
      action: "sandbox.write",
      risk: "medium",
    });
    const body = captured.body as {
      executionPerformed: boolean;
      authorizationPerformed: boolean;
      approvalSource: string;
      decision: { verdict: string; authorizesExecution: boolean };
    };
    expect(captured.status).toBe(200);
    expect(body.executionPerformed).toBe(false);
    expect(body.authorizationPerformed).toBe(false);
    expect(body.approvalSource).toBe("none");
    expect(body.decision.verdict).toBe("ALLOW");
    expect(body.decision.authorizesExecution).toBe(false);
  });

  it("escalates deploy.request without a verified admin token", () => {
    const captured = call(harness(), "POST /api/v1/agents/mesh/evaluate", {
      role: "devops",
      action: "deploy.request",
      risk: "medium",
    });
    const body = captured.body as {
      decision: { verdict: string; requiresHumanApproval: boolean };
      approvalSource: string;
    };
    expect(body.decision.verdict).toBe("ESCALATE");
    expect(body.decision.requiresHumanApproval).toBe(true);
    expect(body.approvalSource).toBe("none");
  });

  it("accepts a verified admin approval but still never executes", () => {
    const captured = call(harness({ admin: true }), "POST /api/v1/agents/mesh/evaluate", {
      role: "devops",
      action: "deploy.request",
      risk: "medium",
    });
    const body = captured.body as {
      executionPerformed: boolean;
      approvalSource: string;
      decision: { verdict: string; requiresHumanApproval: boolean };
    };
    expect(body.approvalSource).toBe("verified-admin-token");
    expect(body.decision.verdict).toBe("ALLOW");
    expect(body.decision.requiresHumanApproval).toBe(true);
    expect(body.executionPerformed).toBe(false);
  });

  it("fails closed when the rate limiter rejects", () => {
    const captured = call(harness({ allow: false }), "POST /api/v1/agents/mesh/evaluate", {
      role: "planner",
      action: "plan.create",
    });
    expect(captured.status).toBe(200);
    expect(captured.body).toBeUndefined();
  });
});
