import type { Application, Request, Response } from "express";
import type { FixedWindowRateLimiter } from "../security/rate-limit";
import type { BookPiLedgerPort } from "../bookpi/ledger";
import { ConstitutionalGovernanceFabric, type GovernanceInput } from "../governance/constitutional-governance-fabric";
import { randomUUID } from "node:crypto";

export const COMMAND_FABRIC_VERSION = "1.0.0";

type ExecutionMode = "sync" | "async" | "stream";

interface CommandRequest {
  readonly prompt: string;
  readonly mode?: ExecutionMode;
  readonly workspaceId?: string;
  readonly riskScore?: number;
}

interface CommandEvent {
  readonly id: string;
  readonly type: string;
  readonly workspaceId: string;
  readonly timestamp: string;
  readonly payload: Record<string, unknown>;
}

export interface CommandFabricRouteDeps {
  readonly app: Application;
  readonly ledger: BookPiLedgerPort;
  readonly governance?: ConstitutionalGovernanceFabric;
  readonly enforceRateLimit: (req: Request, res: Response, limiter: FixedWindowRateLimiter, bucket: string) => boolean;
  readonly rateLimiter: FixedWindowRateLimiter;
  readonly authorizeAdmin: (req: Request, res: Response) => boolean;
}

function stringField(value: unknown, maxLength: number): string | null {
  return typeof value === "string" && value.trim().length > 0 && value.length <= maxLength ? value.trim() : null;
}

function eventFrom(type: string, workspaceId: string, payload: Record<string, unknown>): CommandEvent {
  return { id: randomUUID(), type, workspaceId, timestamp: new Date().toISOString(), payload };
}

export function registerCommandFabricRoutes(deps: CommandFabricRouteDeps): void {
  const governance = deps.governance ?? new ConstitutionalGovernanceFabric();
  const events: CommandEvent[] = [];
  const appendEvent = (event: CommandEvent): void => {
    events.push(event);
    if (events.length > 1_000) events.shift();
    deps.ledger.append({
      id: event.id,
      timestamp: event.timestamp,
      type: event.type,
      methodId: `[TINA].[YUN].[COMMAND_FABRIC].[${event.type.toUpperCase()}].[${COMMAND_FABRIC_VERSION}].[RISK_TIER_1].[GOVERNANCE_TIER_1]`,
      principal: "isabella-command-fabric",
      riskTier: "LOW",
      status: "RECORDED",
    });
  };

  deps.app.get("/api/v1/command/capabilities", (_req, res) => {
    res.json({
      version: COMMAND_FABRIC_VERSION,
      state: "implemented",
      capabilities: ["plan", "governance", "bookpi", "events", "webhook-ingress"],
      invariants: ["CAPABILITY != AUTHORITY", "SPECIFIED != IMPLEMENTED != TESTED != VERIFIED != PRODUCTION"],
    });
  });

  deps.app.post("/api/v1/command/plan", (req, res) => {
    if (!deps.enforceRateLimit(req, res, deps.rateLimiter, "command-plan")) return;
    const body = (req.body ?? {}) as CommandRequest;
    const prompt = stringField(body.prompt, 12_000);
    if (!prompt) {
      res.status(400).json({ success: false, error: "prompt_required" });
      return;
    }
    const workspaceId = stringField(body.workspaceId, 128) ?? `workspace-${randomUUID()}`;
    const mode: ExecutionMode = body.mode === "async" || body.mode === "stream" ? body.mode : "sync";
    const plan = {
      id: `plan-${randomUUID()}`,
      workspaceId,
      mode,
      steps: [
        { id: "research", agent: "researcher", action: "inspect_context", status: "ready" },
        { id: "architecture", agent: "architect", action: "propose_contracts", status: "ready" },
        { id: "security", agent: "security", action: "evaluate_risk", status: "ready" },
        { id: "implementation", agent: "coder", action: "awaiting_governance", status: "blocked" },
      ],
      execution: { authorized: false, executed: false, humanApprovalRequired: true },
    };
    const event = eventFrom("command.plan.created", workspaceId, { planId: plan.id, mode, promptLength: prompt.length });
    appendEvent(event);
    res.status(201).json({ success: true, plan, evidence: { eventId: event.id, ledger: "bookpi" } });
  });

  deps.app.post("/api/v1/command/governance/evaluate", (req, res) => {
    if (!deps.authorizeAdmin(req, res)) return;
    const body = (req.body ?? {}) as Partial<GovernanceInput>;
    const actor = stringField(body.actor, 256);
    const action = stringField(body.action, 256);
    const resource = stringField(body.resource, 1_024);
    if (!actor || !action || !resource || typeof body.riskScore !== "number" || typeof body.policyAllowed !== "boolean" || typeof body.approvalGranted !== "boolean" || typeof body.evidencePresent !== "boolean") {
      res.status(400).json({ success: false, error: "invalid_governance_input" });
      return;
    }
    const dossier = governance.evaluate({ actor, action, resource, riskScore: body.riskScore, policyAllowed: body.policyAllowed, approvalGranted: body.approvalGranted, evidencePresent: body.evidencePresent });
    const event = eventFrom("governance.decision", resource, { dossierId: dossier.id, decision: dossier.decision, riskScore: dossier.riskScore });
    appendEvent(event);
    res.status(dossier.decision === "deny" ? 403 : dossier.decision === "escalate" ? 202 : 200).json({ success: dossier.decision === "allow", dossier, evidence: { eventId: event.id, ledger: "bookpi" } });
  });

  deps.app.post("/api/v1/command/events", (req, res) => {
    if (!deps.authorizeAdmin(req, res)) return;
    const body = (req.body ?? {}) as { type?: unknown; workspaceId?: unknown; payload?: unknown };
    const type = stringField(body.type, 128);
    const workspaceId = stringField(body.workspaceId, 128);
    if (!type || !workspaceId || typeof body.payload !== "object" || body.payload === null || Array.isArray(body.payload)) {
      res.status(400).json({ success: false, error: "invalid_event" });
      return;
    }
    const event = eventFrom(type, workspaceId, body.payload as Record<string, unknown>);
    appendEvent(event);
    res.status(202).json({ success: true, event });
  });

  deps.app.get("/api/v1/command/events", (req, res) => {
    const limit = Math.min(100, Math.max(1, Number(req.query.limit ?? 25) || 25));
    res.json({ success: true, events: events.slice(-limit), total: events.length });
  });
}
