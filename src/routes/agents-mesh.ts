/**
 * ISABELLA CERO — Agent Mesh HTTP surface (fusión 2026-11-01).
 * state: draft | engine-generated.
 *
 * Solo expone la matriz de roles y la EVALUACIÓN de política. No hay endpoint de
 * ejecución: `executionPerformed` es siempre `false` y una decisión `ALLOW` no
 * concede autoridad. La aprobación humana se decide en el servidor a partir de un
 * bearer administrativo verificado; el cuerpo HTTP nunca puede concederla.
 */
import type { Application, Request, Response } from 'express';
import type { FixedWindowRateLimiter } from '../security/rate-limit';
import { DEV_AGENT_ROLES, isDevAgentRole, isMeshRisk, type DevAgentMesh } from '../agents/mesh';

export const DEV_AGENT_MESH_ROUTES_VERSION = '1.0.0' as const;

export interface DevAgentMeshRouteDeps {
  readonly app: Application;
  readonly mesh: DevAgentMesh;
  readonly enforceRateLimit: (
    req: Request,
    res: Response,
    limiter: FixedWindowRateLimiter,
    bucket: string
  ) => boolean;
  readonly rateLimiter: FixedWindowRateLimiter;
  /** Server-side check of the administrative bearer token. Never reads the body. */
  readonly isAdminAuthorized: (req: Request) => boolean;
}

const MAX_ACTION_CHARS = 120;

const DISCLAIMERS = [
  'La evaluación de política no autoriza ni ejecuta: CROWN sigue siendo la autoridad.',
  'La aprobación humana solo se reconoce desde un bearer administrativo verificado en el servidor.',
  'Coder, Tester, DevOps y Operator siguen SPECIFIED: no hay adaptador de ejecución registrado.',
  'Esta superficie no es producción y no escribe en el repositorio ni en el sandbox.',
] as const;

function stringField(value: unknown, maxChars: number): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, maxChars);
}

export function registerDevAgentMeshRoutes(deps: DevAgentMeshRouteDeps): void {
  const { app } = deps;

  app.get('/api/v1/agents/mesh', (req, res) => {
    if (!deps.enforceRateLimit(req, res, deps.rateLimiter, 'agent-mesh-catalog')) return;
    const description = deps.mesh.describe();
    res.json({
      success: true,
      version: DEV_AGENT_MESH_ROUTES_VERSION,
      production: false,
      executionPerformed: false,
      authorizationPerformed: false,
      ...description,
      disclaimers: DISCLAIMERS,
    });
  });

  app.post('/api/v1/agents/mesh/evaluate', (req, res) => {
    if (!deps.enforceRateLimit(req, res, deps.rateLimiter, 'agent-mesh-evaluate')) return;

    const body = (req.body ?? {}) as Record<string, unknown>;
    const role = body.role;
    const action = stringField(body.action, MAX_ACTION_CHARS);
    const risk = body.risk ?? 'low';

    if (!isDevAgentRole(role)) {
      res.status(400).json({
        success: false,
        error: 'role inválido: se esperaba uno de ' + DEV_AGENT_ROLES.join(', '),
      });
      return;
    }
    if (!action) {
      res.status(400).json({ success: false, error: 'action es requerida' });
      return;
    }
    if (!isMeshRisk(risk)) {
      res.status(400).json({
        success: false,
        error: 'risk inválido: se esperaba low, medium, high o critical',
      });
      return;
    }

    const approvalGranted = deps.isAdminAuthorized(req);
    const decision = deps.mesh.evaluate({
      role,
      action,
      risk,
      approvalGranted,
    });

    res.json({
      success: true,
      version: DEV_AGENT_MESH_ROUTES_VERSION,
      production: false,
      executionPerformed: false,
      authorizationPerformed: false,
      approvalSource: approvalGranted ? 'verified-admin-token' : 'none',
      decision,
      disclaimers: DISCLAIMERS,
    });
  });
}
