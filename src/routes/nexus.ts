/**
 * Isabella Nexus HTTP surface (state: wired | tested (unit)).
 * state: draft | engine-generated.
 *
 * Superficie gobernada del runtime Nexus: grafo de conocimiento, bucle de agente,
 * simulador cuántico, salud antifrágil, workflow de diagnóstico y la fábrica de
 * Capability Contracts. Las escrituras exigen bearer administrativo verificado por
 * el servidor; el cuerpo HTTP nunca concede aprobación ni declara capacidades.
 */
import { randomUUID } from 'node:crypto';
import type { Application, Request, Response } from 'express';
import type { FixedWindowRateLimiter } from '../security/rate-limit';
import type { NexusRuntime } from '../nexus/runtime';
import type { NexusCircuit } from '../nexus/quantum';
import type { ToolContext } from '../nexus/tool-registry';

export const NEXUS_ROUTES_VERSION = '0.1.0' as const;

/** Techo de una invocación de capacidad desde HTTP. */
const CAPABILITY_DEADLINE_MS = 30_000;

/**
 * Contexto de ejecución construido por el servidor. El cuerpo de la petición aporta
 * identificadores opacos, nunca autoridad: `approvalGranted` viene del bearer.
 */
function capabilityContext(body: Record<string, unknown>, approvalGranted: boolean): ToolContext {
  const requestId =
    typeof body.requestId === 'string' && body.requestId.trim().length > 0
      ? body.requestId.trim().slice(0, 80)
      : `cap-${randomUUID()}`;
  return {
    requestId,
    actorId: approvalGranted ? 'service:genesis-admin-token' : 'human:public-session',
    tenantId: typeof body.tenantId === 'string' ? body.tenantId.slice(0, 80) : 'public',
    approvalGranted,
    signal: AbortSignal.timeout(CAPABILITY_DEADLINE_MS),
  };
}

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

  /**
   * Fábrica de capacidades (plano NEXUS ∞).
   *
   * No hay POST /capabilities: un contrato se declara en código y se verifica contra
   * el árbol y el registro gobernado. Aceptar contratos desde el cuerpo HTTP sería
   * permitir que el llamante se otorgue sus propios permisos.
   */
  app.get('/api/v1/nexus/capabilities', (req, res) => {
    if (!deps.enforceRateLimit(req, res, deps.rateLimiter, 'nexus-capabilities-list')) return;
    const capabilities = nexus.capabilityList();
    res.json({
      success: true,
      count: capabilities.length,
      capabilities,
      notice: nexus.capabilityNotice,
      disclaimer:
        'El estado es una proyección a la taxonomía canónica; la confianza sale solo de hechos observables. Ninguna cifra es estimada.',
    });
  });

  app.get('/api/v1/nexus/capabilities/:id', (req, res) => {
    if (!deps.enforceRateLimit(req, res, deps.rateLimiter, 'nexus-capabilities-describe')) return;
    const described = nexus.capabilityDescribe(req.params.id);
    if (!described) {
      res.status(404).json({ success: false, error: 'CAPABILITY_NOT_FOUND' });
      return;
    }
    res.json({ success: true, capability: described });
  });

  app.post('/api/v1/nexus/capabilities/:id/simulate', (req, res) => {
    if (!deps.enforceRateLimit(req, res, deps.rateLimiter, 'nexus-capabilities-simulate')) return;
    const report = nexus.capabilitySimulate(req.params.id);
    if (!report) {
      res.status(404).json({ success: false, error: 'CAPABILITY_NOT_FOUND' });
      return;
    }
    res.json({ success: true, simulation: report });
  });

  app.post('/api/v1/nexus/capabilities/:id/execute', async (req, res) => {
    if (!deps.enforceRateLimit(req, res, deps.writeRateLimiter, 'nexus-capabilities-execute')) {
      return;
    }
    const body = (req.body ?? {}) as Record<string, unknown>;
    // `input` es el payload de la capacidad; los campos de control nunca entran a su
    // esquema, porque un contrato estricto los rechazaría como clave no reconocida.
    const input = (body.input ?? {}) as Record<string, unknown>;
    const approvalGranted = deps.isAdminAuthorized(req);
    const result = await nexus.capabilityExecute(
      req.params.id,
      input,
      capabilityContext(body, approvalGranted)
    );
    res.status(result.code === 'CAPABILITY_NOT_FOUND' ? 404 : result.ok ? 200 : 403).json({
      success: result.ok,
      ...result,
      approvalSource: approvalGranted ? 'verified-admin-token' : 'none',
    });
  });

  app.post('/api/v1/nexus/capabilities/:id/rollback', async (req, res) => {
    if (!deps.enforceRateLimit(req, res, deps.writeRateLimiter, 'nexus-capabilities-rollback')) {
      return;
    }
    const body = (req.body ?? {}) as Record<string, unknown>;
    const approvalGranted = deps.isAdminAuthorized(req);
    if (!approvalGranted) {
      res.status(401).json({ success: false, error: 'UNAUTHORIZED' });
      return;
    }
    const result = await nexus.capabilityRollback(req.params.id, capabilityContext(body, true));
    res.status(result.ok ? 200 : 403).json({ success: result.ok, ...result });
  });

  /**
   * Fábrica de agentes externos (MCP por HTTP y tarjetas A2A).
   *
   * No hay POST /fabric: los agentes se declaran en el manifiesto que nombra el
   * operador y se cruzan con la compuerta de egreso en el arranque. Descubrir y
   * llamar pasan por `capabilityExecute`, así que aprobación, techos, esquema y
   * evidencia siguen siendo la única compuerta hacia la red externa.
   */
  app.get('/api/v1/nexus/fabric', (req, res) => {
    if (!deps.enforceRateLimit(req, res, deps.rateLimiter, 'nexus-fabric-status')) return;
    const status = nexus.fabricStatus();
    res.json({
      success: true,
      ...status,
      disclaimer:
        'El descubrimiento (`tools/list`) es evidencia, no permiso: solo se puede invocar lo declarado en el manifiesto del operador.',
    });
  });

  app.get('/api/v1/nexus/fabric/:id', (req, res) => {
    if (!deps.enforceRateLimit(req, res, deps.rateLimiter, 'nexus-fabric-describe')) return;
    const agent = nexus.fabricDescribe(req.params.id);
    if (!agent) {
      res.status(404).json({ success: false, error: 'FABRIC_AGENT_NOT_FOUND' });
      return;
    }
    res.json({ success: true, agent });
  });

  app.post('/api/v1/nexus/fabric/:id/discover', async (req, res) => {
    if (!deps.enforceRateLimit(req, res, deps.writeRateLimiter, 'nexus-fabric-discover')) return;
    const agent = nexus.fabricDescribe(req.params.id);
    if (!agent) {
      res.status(404).json({ success: false, error: 'FABRIC_AGENT_NOT_FOUND' });
      return;
    }
    const body = (req.body ?? {}) as Record<string, unknown>;
    const approvalGranted = deps.isAdminAuthorized(req);
    const result = await nexus.capabilityExecute(
      agent.capabilityId,
      { method: 'tools/list' },
      capabilityContext(body, approvalGranted)
    );
    res
      .status(result.ok ? 200 : result.status === 'denied' ? 403 : 502)
      .json({ success: result.ok, ...result });
  });

  app.post('/api/v1/nexus/fabric/:id/call', async (req, res) => {
    if (!deps.enforceRateLimit(req, res, deps.writeRateLimiter, 'nexus-fabric-call')) return;
    const agent = nexus.fabricDescribe(req.params.id);
    if (!agent) {
      res.status(404).json({ success: false, error: 'FABRIC_AGENT_NOT_FOUND' });
      return;
    }
    const body = (req.body ?? {}) as Record<string, unknown>;
    const input = (body.input ?? {}) as Record<string, unknown>;
    if (typeof input.tool !== 'string' || input.tool.trim().length === 0) {
      res.status(400).json({ success: false, error: 'FABRIC_TOOL_REQUIRED' });
      return;
    }
    // El manifiesto es la lista de lo invocable: una herramienta no declarada se
    // rechaza antes de armar el contexto, para que ni siquiera llegue al upstream.
    if (!agent.declaredTools.includes(input.tool)) {
      res.status(403).json({
        success: false,
        error: 'FABRIC_TOOL_NOT_DECLARED',
        agent: agent.id,
        declaredTools: agent.declaredTools,
      });
      return;
    }
    const approvalGranted = deps.isAdminAuthorized(req);
    const result = await nexus.capabilityExecute(
      agent.capabilityId,
      input,
      capabilityContext(body, approvalGranted)
    );
    res
      .status(result.ok ? 200 : result.status === 'denied' ? 403 : 502)
      .json({ success: result.ok, ...result });
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
