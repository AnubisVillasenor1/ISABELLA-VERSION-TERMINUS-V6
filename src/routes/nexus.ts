/**
 * Isabella Nexus HTTP surface (state: wired | tested (unit)).
 * state: draft | engine-generated.
 *
 * Superficie gobernada del runtime Nexus: grafo de conocimiento, bucle de agente,
 * simulador cuántico, salud antifrágil y workflow de diagnóstico. Las escrituras
 * exigen bearer administrativo verificado por el servidor; el cuerpo HTTP nunca
 * concede aprobación.
 */
import type { Application, Request, Response } from 'express';
import type { FixedWindowRateLimiter } from '../security/rate-limit';
import type { NexusRuntime } from '../nexus/runtime';
import type { NexusCircuit } from '../nexus/quantum';

export const NEXUS_ROUTES_VERSION = '0.1.0' as const;

export interface NexusRouteDeps {
  readonly app: Application;
  readonly nexus: NexusRuntime;
  readonly enforceRateLimit: (
    req: Request,
    res: Response,
    limiter: FixedWindowRateLimiter,
    bucket: string
  ) => boolean;
  readonly rateLimiter: FixedWindowRateLimiter;
  readonly writeRateLimiter: FixedWindowRateLimiter;
  /** Verificación server-side del bearer administrativo. Nunca lee el cuerpo. */
  readonly isAdminAuthorized: (req: Request) => boolean;
}

export function registerNexusRoutes(deps: NexusRouteDeps): void {
  const { app, nexus } = deps;

  app.get('/api/v1/nexus', (req, res) => {
    if (!deps.enforceRateLimit(req, res, deps.rateLimiter, 'nexus-describe')) return;
    res.json({ success: true, ...nexus.describe() });
  });

  app.post('/api/v1/nexus/ask', async (req, res) => {
    if (!deps.enforceRateLimit(req, res, deps.rateLimiter, 'nexus-ask')) return;
    const body = (req.body ?? {}) as Record<string, unknown>;
    const input = typeof body.input === 'string' ? body.input.trim() : '';
    if (!input) {
      res.status(400).json({ success: false, error: 'NEXUS_INPUT_REQUIRED' });
      return;
    }
    const approvalGranted = deps.isAdminAuthorized(req);
    const result = await nexus.ask({
      goal: input,
      approvalGranted,
      actorId: approvalGranted ? 'service:genesis-admin-token' : 'human:public-session',
      ...(typeof body.maxSteps === 'number' ? { maxSteps: body.maxSteps } : {}),
      ...(typeof body.deadlineMs === 'number' ? { deadlineMs: body.deadlineMs } : {}),
      ...(typeof body.requestId === 'string' ? { requestId: body.requestId } : {}),
    });
    res.status(result.status === 'error' ? 400 : 200).json({
      success: result.ok,
      ...result,
      approvalSource: approvalGranted ? 'verified-admin-token' : 'none',
    });
  });

  app.get('/api/v1/nexus/knowledge', (req, res) => {
    if (!deps.enforceRateLimit(req, res, deps.rateLimiter, 'nexus-knowledge-query')) return;
    const query = typeof req.query.q === 'string' ? req.query.q : '';
    const rawLimit = typeof req.query.limit === 'string' ? Number(req.query.limit) : 5;
    const hits = nexus.query(query, Number.isFinite(rawLimit) ? rawLimit : 5);
    res.json({
      success: true,
      count: hits.length,
      hits: hits.map((hit) => ({
        id: hit.fact.id,
        subject: hit.fact.subject,
        predicate: hit.fact.predicate,
        object: hit.fact.object,
        source: hit.fact.source,
        confidence: hit.fact.confidence,
        status: hit.fact.status,
        score: hit.score,
      })),
      disclaimer: 'Solo hechos con fuente declarada; el grafo no genera texto nuevo.',
    });
  });

  app.post('/api/v1/nexus/knowledge', (req, res) => {
    if (!deps.enforceRateLimit(req, res, deps.writeRateLimiter, 'nexus-knowledge-assert')) return;
    if (!deps.isAdminAuthorized(req)) {
      res.status(401).json({ success: false, error: 'UNAUTHORIZED' });
      return;
    }
    const body = (req.body ?? {}) as Record<string, unknown>;
    const result = nexus.assertFact(
      {
        subject: typeof body.subject === 'string' ? body.subject : '',
        predicate: typeof body.predicate === 'string' ? body.predicate : '',
        object: typeof body.object === 'string' ? body.object : '',
        source: typeof body.source === 'string' ? body.source : '',
        ...(typeof body.confidence === 'number' ? { confidence: body.confidence } : {}),
      },
      true
    );
    const status = result.ok
      ? result.status === 'duplicate'
        ? 200
        : 201
      : result.status === 'conflict'
        ? 409
        : 400;
    res.status(status).json({ success: result.ok, ...result });
  });

  app.post('/api/v1/nexus/knowledge/:id/correct', (req, res) => {
    if (!deps.enforceRateLimit(req, res, deps.writeRateLimiter, 'nexus-knowledge-correct')) return;
    if (!deps.isAdminAuthorized(req)) {
      res.status(401).json({ success: false, error: 'UNAUTHORIZED' });
      return;
    }
    const body = (req.body ?? {}) as Record<string, unknown>;
    const fact = nexus.correctFact(
      req.params.id,
      {
        ...(typeof body.object === 'string' ? { object: body.object } : {}),
        ...(typeof body.confidence === 'number' ? { confidence: body.confidence } : {}),
        ...(typeof body.source === 'string' ? { source: body.source } : {}),
      },
      'human:admin-token',
      true
    );
    if (!fact) {
      res.status(404).json({ success: false, error: 'FACT_NOT_CORRECTABLE' });
      return;
    }
    res.json({ success: true, fact });
  });

  app.post('/api/v1/nexus/knowledge/:id/withdraw', (req, res) => {
    if (!deps.enforceRateLimit(req, res, deps.writeRateLimiter, 'nexus-knowledge-withdraw')) return;
    if (!deps.isAdminAuthorized(req)) {
      res.status(401).json({ success: false, error: 'UNAUTHORIZED' });
      return;
    }
    const body = (req.body ?? {}) as Record<string, unknown>;
    const reason = typeof body.reason === 'string' ? body.reason.trim() : '';
    if (!reason) {
      res.status(400).json({ success: false, error: 'WITHDRAWAL_REASON_REQUIRED' });
      return;
    }
    const fact = nexus.withdrawFact(req.params.id, reason, true);
    if (!fact) {
      res.status(404).json({ success: false, error: 'FACT_NOT_WITHDRAWABLE' });
      return;
    }
    res.json({ success: true, fact });
  });

  app.post('/api/v1/nexus/quantum/simulate', (req, res) => {
    if (!deps.enforceRateLimit(req, res, deps.rateLimiter, 'nexus-quantum')) return;
    const body = (req.body ?? {}) as Record<string, unknown>;
    const circuit = body.circuit;
    if (!circuit || typeof circuit !== 'object') {
      res.status(400).json({ success: false, error: 'QUANTUM_CIRCUIT_REQUIRED' });
      return;
    }
    const result = nexus.simulate(circuit as NexusCircuit);
    res.status(result.ok ? 200 : 400).json({ success: result.ok, ...result });
  });

  app.get('/api/v1/nexus/health', (req, res) => {
    if (!deps.enforceRateLimit(req, res, deps.rateLimiter, 'nexus-health')) return;
    res.json({ success: true, ...nexus.monitor.report() });
  });

  app.get('/api/v1/nexus/repairs', (req, res) => {
    if (!deps.enforceRateLimit(req, res, deps.rateLimiter, 'nexus-repairs')) return;
    if (!deps.isAdminAuthorized(req)) {
      res.status(401).json({ success: false, error: 'UNAUTHORIZED' });
      return;
    }
    const proposals = nexus.monitor.proposeRepairs();
    res.json({
      success: true,
      count: proposals.length,
      proposals,
      disclaimer:
        'Propuestas de reparación: no fueron ejecutadas. Requieren aprobación humana explícita.',
    });
  });

  app.post('/api/v1/nexus/diagnostics', async (req, res) => {
    if (!deps.enforceRateLimit(req, res, deps.rateLimiter, 'nexus-diagnostics')) return;
    const result = await nexus.runDiagnostic();
    res.status(result.ok ? 200 : 500).json({ success: result.ok, ...result });
  });
}
