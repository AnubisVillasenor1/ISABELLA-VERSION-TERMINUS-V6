import type { Application, Request, Response } from "express";
import type { FixedWindowRateLimiter } from "../security/rate-limit";
import {
  CONSTITUTION_ARTICLES,
  CONSTITUTIONAL_FLOW,
  civilizationalValue,
  evaluateConstitution,
  runHyperSimulation,
  valuateCapital,
  type ConstitutionalAssertion,
} from "../omega";

// Ω∞ (Omega Infinity) API v3 (state: draft | engine-generated).
// Expone el Constitution Engine (Ω∞-15), la Hyper Simulation Fabric (Ω∞-17), el
// Cognitive Capital Engine (Ω∞-20) y la Ecuación Maestra Ω∞. Todo es cálculo
// explicable y fail-closed: nada autoriza, nada ejecuta y nada mueve fondos.

export const OMEGA_ROUTES_VERSION = "1.0.0" as const;
export const CONSTITUTION_METHOD_ID = "I.YUN.CONSTITUTION.evaluate_mandate.v1.0.0.HIGH.CONSTITUTIONAL" as const;
export const SIMULATION_METHOD_ID = "I.YUN.SIMULATION.run_mandate.v1.0.0.MEDIUM.TERRITORIAL" as const;
export const CAPITAL_METHOD_ID = "I.YUN.CAPITAL.valuate_intelligence.v1.0.0.LOW.TERRITORIAL" as const;
export const CIVILIZATION_METHOD_ID = "I.YUN.CIVILIZATION.master_equation.v1.0.0.HIGH.INSTITUTIONAL" as const;

export interface OmegaRouteDeps {
  readonly app: Application;
  readonly enforceRateLimit: (
    req: Request,
    res: Response,
    limiter: FixedWindowRateLimiter,
    bucket: string,
  ) => boolean;
  readonly rateLimiter: FixedWindowRateLimiter;
  /** Admin gate. When omitted, no token is required (development). */
  readonly authorizeAdmin?: (req: Request, res: Response) => boolean;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function fail(res: Response, error: unknown): void {
  res.status(400).json({ success: false, error: (error as Error).message || "OMEGA_ERROR" });
}

export function registerOmegaRoutes(deps: OmegaRouteDeps): void {
  const { app } = deps;

  app.get("/api/v3/omega/constitution", (req, res) => {
    if (!deps.enforceRateLimit(req, res, deps.rateLimiter, "omega-constitution")) return;
    res.json({
      success: true,
      methodId: CONSTITUTION_METHOD_ID,
      authorizationPerformed: false,
      flow: CONSTITUTIONAL_FLOW,
      articles: CONSTITUTION_ARTICLES,
    });
  });

  app.post("/api/v3/omega/constitution/evaluate", (req, res) => {
    if (!deps.enforceRateLimit(req, res, deps.rateLimiter, "omega-constitution-evaluate")) return;
    if (!isRecord(req.body) || !Array.isArray(req.body.assertions)) {
      res.status(400).json({ success: false, error: "CONSTITUTION_ASSERTIONS_REQUIRED" });
      return;
    }
    try {
      const decision = evaluateConstitution(req.body.assertions as ConstitutionalAssertion[]);
      res.status(decision.allowed ? 200 : 422).json({
        success: true,
        methodId: CONSTITUTION_METHOD_ID,
        authorizationPerformed: false,
        decision,
      });
    } catch (error) {
      fail(res, error);
    }
  });

  app.post("/api/v3/omega/simulation/run", (req, res) => {
    if (!deps.enforceRateLimit(req, res, deps.rateLimiter, "omega-simulation-run")) return;
    if (!isRecord(req.body)) {
      res.status(400).json({ success: false, error: "SIMULATION_BODY_REQUIRED" });
      return;
    }
    try {
      const report = runHyperSimulation({
        base: Number(req.body.base),
        volatility: Number(req.body.volatility),
        confidence: Number(req.body.confidence),
        economicImpact: req.body.economicImpact === undefined ? undefined : Number(req.body.economicImpact),
        socialImpact: req.body.socialImpact === undefined ? undefined : Number(req.body.socialImpact),
        riskMitigation: req.body.riskMitigation === undefined ? undefined : Number(req.body.riskMitigation),
      });
      res.json({ success: true, methodId: SIMULATION_METHOD_ID, authorizationPerformed: false, report });
    } catch (error) {
      fail(res, error);
    }
  });

  app.post("/api/v3/omega/capital/value", (req, res) => {
    if (!deps.enforceRateLimit(req, res, deps.rateLimiter, "omega-capital-value")) return;
    if (!isRecord(req.body)) {
      res.status(400).json({ success: false, error: "CAPITAL_BODY_REQUIRED" });
      return;
    }
    try {
      const capital = valuateCapital({
        utility: Number(req.body.utility),
        trust: Number(req.body.trust),
        demand: Number(req.body.demand),
        evidence: Number(req.body.evidence),
        reputation: Number(req.body.reputation),
        rarity: req.body.rarity === undefined ? undefined : Number(req.body.rarity),
        reproducibility: req.body.reproducibility === undefined ? undefined : Number(req.body.reproducibility),
      });
      res.json({ success: true, methodId: CAPITAL_METHOD_ID, authorizationPerformed: false, capital });
    } catch (error) {
      fail(res, error);
    }
  });

  app.post("/api/v3/omega/civilization/value", (req, res) => {
    if (!deps.enforceRateLimit(req, res, deps.rateLimiter, "omega-civilization-value")) return;
    if (!isRecord(req.body)) {
      res.status(400).json({ success: false, error: "CIVILIZATION_BODY_REQUIRED" });
      return;
    }
    try {
      const equation = civilizationalValue(req.body as Record<string, number>);
      res.json({ success: true, methodId: CIVILIZATION_METHOD_ID, authorizationPerformed: false, equation });
    } catch (error) {
      fail(res, error);
    }
  });
}
