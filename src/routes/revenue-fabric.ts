/**
 * Isabella Sovereign Revenue Fabric v4 - API Routes
 * state: engine-generated
 * HTTP surface for the Revenue Fabric: IETS, Settlement, Ledger, Metering, Wallets
 */

import type { Application, Request, Response } from "express";
import { v4 as uuidv4 } from "uuid";
import { calculateIETS, type IETSInputs, type IETSResult } from "../economy/revenue-fabric/iets-engine";
import { normalizeSettlement, validateSettlementInvariants, type SettlementInputs, type SettlementResult } from "../economy/revenue-fabric/normalized-settlement";
import { ImmutableLedger, type LedgerJournal } from "../economy/revenue-fabric/immutable-ledger";
import { MeteringService, type UsageEvent, type AggregatedUsage } from "../economy/revenue-fabric/metering-service";
import { outbox, REVENUE_EVENTS } from "../economy/revenue-fabric/outbox-inbox";
import type { IETSTier, RevenueStream } from "../economy/revenue-fabric/types";

export interface RevenueFabricDeps {
  readonly app: Application;
  readonly authorizeAdmin: (req: Request, res: Response) => boolean;
  readonly authorizeProviderRoute: (req: Request, res: Response) => boolean;
  readonly enforceRateLimit: (req: Request, res: Response, limiter: any, bucket: string) => boolean;
  readonly rateLimiter: any;
  readonly publicCognitionLimiter: any;
  readonly providerTimeoutMs: number;
}

const ledger = new ImmutableLedger();
const meteringService = new MeteringService();

function actorOf(req: Request): string {
  const h = req.get("x-session-id");
  return h && /^[\w-]{8,128}$/.test(h) ? `session:${h}` : `ip:${req.ip ?? "unknown"}`;
}

function parseMoney(value: unknown, fieldName: string): number {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0 || !Number.isSafeInteger(n)) {
    throw new Error(`${fieldName} must be a non-negative integer (cents)`);
  }
  return n;
}

export function registerRevenueFabricRoutes(deps: RevenueFabricDeps): void {
  const { app, authorizeAdmin, authorizeProviderRoute, enforceRateLimit, rateLimiter, publicCognitionLimiter, providerTimeoutMs } = deps;

  // ============================================================
  // IETS (Isabella Economic Trust Score) Endpoints
  // ============================================================

  app.post("/api/v1/revenue/iet/calculate", (req, res) => {
    if (!authorizeProviderRoute(req, res)) return;
    if (!enforceRateLimit(req, res, rateLimiter, "iet-calculate")) return;

    try {
      const body = req.body || {};
      const inputs: IETSInputs = {
        referrals: parseMoney(body.referrals, "referrals") / 100,
        revenue: parseMoney(body.revenue, "revenue") / 100,
        retention: parseMoney(body.retention, "retention") / 100,
        skills: parseMoney(body.skills, "skills") / 100,
        agents: parseMoney(body.agents, "agents") / 100,
        reputation: parseMoney(body.reputation, "reputation") / 100,
        age: parseMoney(body.age, "age") / 100,
        compliance: parseMoney(body.compliance, "compliance") / 100,
      };

      const result: IETSResult = calculateIETS(inputs);
      const benefits = getTierBenefits(result.tier);

      res.json({ success: true, ...result, benefits });
    } catch (err) {
      res.status(400).json({ success: false, error: err instanceof Error ? err.message : "IETS_CALCULATION_FAILED" });
    }
  });

  // ============================================================
  // Settlement Endpoints
  // ============================================================

  app.post("/api/v1/revenue/settle", async (req, res) => {
    if (!authorizeAdmin(req, res)) return;
    if (!enforceRateLimit(req, res, rateLimiter, "settlement")) return;

    try {
      const body = req.body || {};
      const settlementInputs: SettlementInputs = {
        grossAmount: parseMoney(body.grossAmount, "grossAmount"),
        directCost: parseMoney(body.directCost, "directCost"),
        taxAmount: parseMoney(body.taxAmount, "taxAmount"),
        gatewayFee: parseMoney(body.gatewayFee, "gatewayFee"),
        ietsInputs: {
          referrals: body.ietsInputs?.referrals ?? 0,
          revenue: body.ietsInputs?.revenue ?? 0,
          retention: body.ietsInputs?.retention ?? 0,
          skills: body.ietsInputs?.skills ?? 0,
          agents: body.ietsInputs?.agents ?? 0,
          reputation: body.ietsInputs?.reputation ?? 0,
          age: body.ietsInputs?.age ?? 0,
          compliance: body.ietsInputs?.compliance ?? 0,
        },
        stream: body.stream,
        currency: body.currency ?? "USD",
        idempotencyKey: body.idempotencyKey ?? uuidv4(),
        externalPaymentId: body.externalPaymentId,
        occurredAt: body.occurredAt,
      };

      const settlement = normalizeSettlement(settlementInputs);
      validateSettlementInvariants(settlement);

      // Post to immutable ledger
      const journal = ledger.post(settlement, { settlementId: settlement.idempotencyKey });

      // Emit outbox event
      outbox.append("Settlement", settlement.idempotencyKey, REVENUE_EVENTS.SETTLEMENT_POSTED, {
        settlement,
        journal,
      });

      res.json({ success: true, settlement, journal });
    } catch (err) {
      res.status(400).json({ success: false, error: err instanceof Error ? err.message : "SETTLEMENT_FAILED" });
    }
  });

  app.get("/api/v1/revenue/settlements/:idempotencyKey", (req, res) => {
    if (!authorizeProviderRoute(req, res)) return;
    if (!enforceRateLimit(req, res, rateLimiter, "settlement-get")) return;

    const { idempotencyKey } = req.params;
    const journal = ledger.getJournal(idempotencyKey);
    if (!journal) {
      return res.status(404).json({ success: false, error: "SETTLEMENT_NOT_FOUND" });
    }
    res.json({ success: true, journal });
  });

  // ============================================================
  // Ledger Endpoints
  // ============================================================

  app.get("/api/v1/revenue/ledger/journals", (req, res) => {
    if (!authorizeProviderRoute(req, res)) return;
    if (!enforceRateLimit(req, res, rateLimiter, "ledger-list")) return;

    const journals = ledger.getAllJournals();
    res.json({ success: true, journals });
  });

  app.get("/api/v1/revenue/ledger/verify", (req, res) => {
    if (!authorizeAdmin(req, res)) return;
    if (!enforceRateLimit(req, res, rateLimiter, "ledger-verify")) return;

    const isValid = ledger.verifyChain();
    res.json({ success: true, valid: isValid });
  });

  // ============================================================
  // Metering / Usage Events
  // ============================================================

  app.post("/api/v1/revenue/usage", (req, res) => {
    if (!authorizeProviderRoute(req, res)) return;
    if (!enforceRateLimit(req, res, publicCognitionLimiter, "usage-record")) return;

    try {
      const body = req.body || {};
      const event: UsageEvent = {
        idempotencyKey: body.idempotencyKey ?? uuidv4(),
        userId: body.userId ?? actorOf(req),
        resourceType: body.resourceType,
        resourceId: body.resourceId,
        metricName: body.metricName,
        quantity: parseMoney(body.quantity, "quantity"),
        unit: body.unit,
        occurredAt: body.occurredAt ?? new Date().toISOString(),
        metadata: body.metadata,
      };

      const result = meteringService.recordUsage(event);
      if (!result.accepted) {
        return res.status(400).json({ success: false, error: result.reason });
      }

      // Emit outbox event
      outbox.append("UsageEvent", event.idempotencyKey, REVENUE_EVENTS.USAGE_RECORDED, event);

      res.json({ success: true, ...result });
    } catch (err) {
      res.status(400).json({ success: false, error: err instanceof Error ? err.message : "USAGE_RECORD_FAILED" });
    }
  });

  app.get("/api/v1/revenue/usage/:userId", (req, res) => {
    if (!authorizeProviderRoute(req, res)) return;
    if (!enforceRateLimit(req, res, rateLimiter, "usage-get")) return;

    const { userId } = req.params;
    const since = req.query.since ? new Date(req.query.since as string) : undefined;
    const usage = meteringService.getUserUsage(userId, since);
    res.json({ success: true, usage });
  });

  app.get("/api/v1/revenue/usage/:userId/invoice", (req, res) => {
    if (!authorizeProviderRoute(req, res)) return;
    if (!enforceRateLimit(req, res, rateLimiter, "usage-invoice")) return;

    const { userId } = req.params;
    const periodStart = req.query.periodStart ? new Date(req.query.periodStart as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const periodEnd = req.query.periodEnd ? new Date(req.query.periodEnd as string) : new Date();

    const invoiceData = meteringService.generateInvoiceData(userId, periodStart, periodEnd);
    res.json({ success: true, invoice: invoiceData });
  });

  // ============================================================
  // Wallet Endpoints (stub - would integrate with wallet service)
  // ============================================================

  app.get("/api/v1/revenue/wallet/:userId", (req, res) => {
    if (!authorizeProviderRoute(req, res)) return;
    if (!enforceRateLimit(req, res, rateLimiter, "wallet-get")) return;

    // In real impl, would query wallet service
    res.json({ success: true, wallet: null, message: "Wallet service not yet implemented" });
  });

  app.post("/api/v1/revenue/wallet/:userId/credit", (req, res) => {
    if (!authorizeAdmin(req, res)) return;
    if (!enforceRateLimit(req, res, rateLimiter, "wallet-credit")) return;

    // In real impl, would call wallet service
    res.json({ success: true, message: "Wallet service not yet implemented" });
  });

  app.post("/api/v1/revenue/wallet/:userId/debit", (req, res) => {
    if (!authorizeAdmin(req, res)) return;
    if (!enforceRateLimit(req, res, rateLimiter, "wallet-debit")) return;

    // In real impl, would call wallet service
    res.json({ success: true, message: "Wallet service not yet implemented" });
  });

  // ============================================================
  // Revenue Streams Configuration
  // ============================================================

  app.get("/api/v1/revenue/streams", (req, res) => {
    if (!authorizeProviderRoute(req, res)) return;
    if (!enforceRateLimit(req, res, rateLimiter, "streams-list")) return;

    // In real impl, would query revenue_streams table
    const streams = [
      { stream: "SUBSCRIPTION", name: "Suscripciones Isabella", model: "recurring", baseSplit: { user: 0.0, platform: 1.0 }, dynamicSplit: false },
      { stream: "ISA_API", name: "ISA API Pay-per-token", model: "transactional", baseSplit: { user: 0.7, platform: 0.3 }, dynamicSplit: true },
      { stream: "SKILL_MARKETPLACE", name: "Marketplace de Skills", model: "marketplace", baseSplit: { user: 0.7, platform: 0.3 }, dynamicSplit: true },
      { stream: "AGENT_MARKETPLACE", name: "Marketplace de Agentes", model: "marketplace", baseSplit: { user: 0.7, platform: 0.3 }, dynamicSplit: true },
      { stream: "AGENT_HOSTING", name: "Hosting de Agentes", model: "recurring", baseSplit: { user: 0.0, platform: 1.0 }, dynamicSplit: false },
      { stream: "AI_CLOUD", name: "Sovereign AI Cloud", model: "consumption", baseSplit: { user: 0.0, platform: 1.0 }, dynamicSplit: false },
      { stream: "AGENT_REVENUE_SHARING", name: "Revenue Sharing de Agentes", model: "recurring", baseSplit: { user: 0.7, platform: 0.3 }, dynamicSplit: true },
      { stream: "HYPERAUTOMATION", name: "Hyperautomation", model: "b2b", baseSplit: { user: 0.75, platform: 0.25 }, dynamicSplit: true },
      { stream: "WHITE_LABEL", name: "White Label", model: "enterprise", baseSplit: { user: 0.0, platform: 1.0 }, dynamicSplit: false },
      { stream: "CERTIFICATION", name: "Certificaciones", model: "education", baseSplit: { user: 0.0, platform: 1.0 }, dynamicSplit: false },
      { stream: "DATA_VAULT", name: "Data Vault", model: "data", baseSplit: { user: 0.5, platform: 0.5 }, dynamicSplit: true },
      { stream: "ECOSYSTEM_TREASURY", name: "Ecosystem Treasury", model: "strategic", baseSplit: { user: 0.0, platform: 1.0 }, dynamicSplit: false },
    ];

    res.json({ success: true, streams });
  });

  // ============================================================
  // Outbox / Inbox Status
  // ============================================================

  app.get("/api/v1/revenue/outbox/status", (req, res) => {
    if (!authorizeAdmin(req, res)) return;
    if (!enforceRateLimit(req, res, rateLimiter, "outbox-status")) return;

    // In real impl, would query outbox_events table
    res.json({ success: true, pending: 0, published: 0, failed: 0, deadLetter: 0 });
  });

  app.get("/api/v1/revenue/outbox/dead-letter", (req, res) => {
    if (!authorizeAdmin(req, res)) return;
    if (!enforceRateLimit(req, res, rateLimiter, "outbox-dlq")) return;

    const deadLetter = outbox.getDeadLetterEvents();
    res.json({ success: true, events: deadLetter });
  });

  app.post("/api/v1/revenue/outbox/retry/:eventId", (req, res) => {
    if (!authorizeAdmin(req, res)) return;
    if (!enforceRateLimit(req, res, rateLimiter, "outbox-retry")) return;

    const { eventId } = req.params;
    const retried = outbox.retryDeadLetter(eventId);
    res.json({ success: retried, message: retried ? "Event requeued for processing" : "Event not found or not in dead letter" });
  });

  // ============================================================
  // Health / Readiness
  // ============================================================

  app.get("/api/v1/revenue/health", (req, res) => {
    res.json({
      success: true,
      service: "revenue-fabric",
      version: "4.0.0",
      ledgerValid: ledger.verifyChain(),
      timestamp: new Date().toISOString(),
    });
  });
}

function getTierBenefits(tier: IETSResult["tier"]): string[] {
  const benefits: Record<IETSResult["tier"], string[]> = {
    STARTER: ["Acceso básico al marketplace", "Payouts mensuales"],
    PROFESSIONAL: ["Payouts semanales", "Analítica básica"],
    ADVANCED: ["Prioridad en descubrimiento", "Soporte prioritario"],
    ELITE: ["Payouts express", "Co-marketing", "Acceso beta"],
    SOVEREIGN: ["Payouts express", "Co-marketing", "Acceso beta", "Gobernanza económica"],
  };
  return benefits[tier] || [];
}