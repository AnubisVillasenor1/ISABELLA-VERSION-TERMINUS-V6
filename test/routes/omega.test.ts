import { describe, expect, it } from "vitest";
import type { Application, Request, Response } from "express";
import type { FixedWindowRateLimiter } from "../../src/security/rate-limit";
import { OMEGA_ROUTES_VERSION, registerOmegaRoutes } from "../../src/routes/omega";

type Handler = (req: Request, res: Response) => void | Promise<void>;

function makeRes() {
  const captured = { status: 200, body: undefined as unknown };
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

function harness() {
  const handlers = new Map<string, Handler>();
  const app = {
    get: (path: string, handler: Handler) => handlers.set(`GET ${path}`, handler),
    post: (path: string, handler: Handler) => handlers.set(`POST ${path}`, handler),
  } as unknown as Application;
  registerOmegaRoutes({
    app,
    enforceRateLimit: () => true,
    rateLimiter: {} as FixedWindowRateLimiter,
  });
  return handlers;
}

const call = (handlers: Map<string, Handler>, key: string, body: unknown) => {
  const { res, captured } = makeRes();
  handlers.get(key)!({ body } as unknown as Request, res);
  return captured;
};

const validAssertions = [
  {
    stage: "constitution",
    identity: "operator:1",
    evidence: ["ev-1"],
    authority: "mandate:1",
    auditTrail: ["audit-1"],
    humanOverrideAvailable: true,
    economicJustification: "cost < benefit",
    territory: "RDM",
    explanation: "porque sí",
    recoveryPlan: "rollback",
    learningRecord: "crisis-1",
  },
  { stage: "policy" },
  { stage: "mandate" },
  { stage: "capability" },
  { stage: "execution" },
];

describe("Ω∞ Omega routes", () => {
  it("expone una versión de superficie", () => {
    expect(OMEGA_ROUTES_VERSION).toBe("1.0.0");
  });

  it("GET omega/constitution publica artículos y flujo", () => {
    const handlers = harness();
    const captured = call(handlers, "GET /api/v3/omega/constitution", undefined);
    const body = captured.body as Record<string, unknown>;
    expect((body.articles as unknown[]).length).toBe(10);
    expect((body.flow as unknown[]).length).toBe(5);
  });

  it("POST constitution/evaluate aprueba una propuesta completa", () => {
    const handlers = harness();
    const captured = call(handlers, "POST /api/v3/omega/constitution/evaluate", { assertions: validAssertions });
    const body = captured.body as Record<string, unknown>;
    expect(captured.status).toBe(200);
    expect((body.decision as Record<string, unknown>).allowed).toBe(true);
  });

  it("POST constitution/evaluate responde 422 cuando se incumple", () => {
    const handlers = harness();
    const captured = call(handlers, "POST /api/v3/omega/constitution/evaluate", { assertions: [] });
    expect(captured.status).toBe(422);
    expect((captured.body as Record<string, unknown>).decision).toBeDefined();
  });

  it("POST simulation/run devuelve el informe", () => {
    const handlers = harness();
    const captured = call(handlers, "POST /api/v3/omega/simulation/run", { base: 100, volatility: 0.2, confidence: 0.9 });
    const body = captured.body as Record<string, unknown>;
    expect((body.report as Record<string, unknown>).bestCase).toBe(120);
    expect((body.report as Record<string, unknown>).worstCase).toBe(80);
  });

  it("POST capital/value devuelve el capital cognitivo", () => {
    const handlers = harness();
    const captured = call(handlers, "POST /api/v3/omega/capital/value", {
      utility: 10,
      trust: 20,
      demand: 30,
      evidence: 40,
      reputation: 50,
    });
    expect((captured.body as Record<string, unknown>).capital).toMatchObject({ value: 150 });
  });

  it("POST civilization/value aplica la ecuación maestra con cero anulante", () => {
    const handlers = harness();
    const captured = call(handlers, "POST /api/v3/omega/civilization/value", {
      intelligence: 1,
      governance: 1,
      evidence: 1,
      trust: 0,
      economy: 1,
      memory: 1,
      resilience: 1,
      territorialImpact: 1,
    });
    const body = captured.body as Record<string, unknown>;
    expect((body.equation as Record<string, unknown>).value).toBe(0);
    expect((body.equation as Record<string, unknown>).zeroFactors).toEqual(["trust"]);
  });
});
