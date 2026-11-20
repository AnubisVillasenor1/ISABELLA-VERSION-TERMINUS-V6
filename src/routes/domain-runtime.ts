/**
 * IDR semantic planning API. This endpoint plans only; it never invokes capabilities.
 * Policy is server-owned and deliberately not overridden by request-body fields.
 */
import type { Application, Request, Response } from 'express';
import type { FixedWindowRateLimiter } from '../security/rate-limit';
import { resolveSemanticIntent, type CapabilityNode, type RouterPolicy } from '../domain-runtime/semantic-router';
import { createConfiguredEmbeddingProvider } from '../domain-runtime/embedding-providers';

export interface DomainRuntimeRouteDeps {
  readonly app: Application;
  readonly enforceRateLimit: (req: Request, res: Response, limiter: FixedWindowRateLimiter, bucket: string) => boolean;
  readonly rateLimiter: FixedWindowRateLimiter;
  readonly publicSurface?: 'deterministic-nonexecuting-planner';
}

export const IDR_CAPABILITY_REGISTRY: readonly CapabilityNode[] = [
  { id: 'cap.creator.draft', domainId: 'dom.creator-os', description: 'Planificar y redactar contenido para creadores', intents: ['crear contenido', 'redactar publicación', 'planificar contenido'], tags: ['creator', 'texto', 'planificación'], risk: 'low', estimatedCost: 0.01, enabled: true, external: false, piiAllowed: false, retention: 'session', requiresHumanApproval: false },
  { id: 'cap.growth.analyze', domainId: 'dom.growth-engine', description: 'Analizar crecimiento, audiencia y rendimiento de contenido', intents: ['analizar crecimiento', 'métricas de audiencia', 'estrategia de crecimiento'], tags: ['growth', 'analytics', 'audiencia'], risk: 'low', estimatedCost: 0.02, enabled: true, external: false, piiAllowed: false, retention: 'session', requiresHumanApproval: false },
  { id: 'cap.audio.analyze', domainId: 'dom.audio-intelligence', description: 'Analizar características espectrales y estructura de audio', intents: ['analizar audio', 'análisis espectral', 'evaluar sonido'], tags: ['audio', 'fft', 'espectro'], risk: 'low', estimatedCost: 0.02, enabled: true, external: false, piiAllowed: false, retention: 'session', requiresHumanApproval: false },
  { id: 'cap.platform.plan', domainId: 'dom.sovereign-platform', description: 'Diseñar un plan de integración de capacidades y dominios soberanos', intents: ['integrar capacidades', 'plan de plataforma', 'arquitectura de dominios'], tags: ['platform', 'architecture', 'federation'], risk: 'medium', estimatedCost: 0.03, enabled: true, external: false, piiAllowed: false, retention: 'user-controlled', requiresHumanApproval: false },
];

const SERVER_POLICY: RouterPolicy = {
  allowedDomains: ['dom.creator-os', 'dom.growth-engine', 'dom.audio-intelligence', 'dom.sovereign-platform'],
  maxRisk: 'medium',
  allowExternal: false,
  allowPii: false,
  allowedRetention: ['none', 'session', 'user-controlled'],
  requireHumanApprovalFor: ['high', 'critical'],
  maxCost: 0.1,
  maxCapabilities: 4,
  minScore: 0.15,
};

function bodyOf(req: Request): Record<string, unknown> {
  return typeof req.body === 'object' && req.body !== null && !Array.isArray(req.body)
    ? req.body as Record<string, unknown> : {};
}

export function registerDomainRuntimeRoutes(deps: DomainRuntimeRouteDeps): void {
  // One provider instance per process keeps the bounded embedding cache warm.
  // Provider selection is explicit; default is `none` to avoid implicit data egress.
  const embedding = createConfiguredEmbeddingProvider(process.env);
  deps.app.get('/api/v1/idr/status', (req, res) => {
    if (!deps.enforceRateLimit(req, res, deps.rateLimiter, 'idr-status')) return;
    res.json({
      success: true,
      runtime: 'Isabella Domain Runtime',
      version: '1.0.0',
      capabilityCount: IDR_CAPABILITY_REGISTRY.length,
      embeddingProvider: embedding.mode,
      embeddingModel: embedding.model,
      embeddingConfiguration: embedding.reason,
      mode: embedding.provider ? 'hybrid-lexical-embedding-with-policy-gates' : 'deterministic-lexical',
      production: false,
      executionPerformed: false,
    });
  });

  deps.app.post('/api/v1/idr/resolve', async (req, res) => {
    if (!deps.enforceRateLimit(req, res, deps.rateLimiter, 'idr-resolve')) return;
    const body = bodyOf(req);
    if (typeof body.intent !== 'string' || !body.intent.trim() || body.intent.length > 2000) {
      res.status(400).json({
        success: false, error: 'INVALID_INTENT',
        message: 'intent debe ser texto no vacío de máximo 2000 caracteres',
        production: false, executionPerformed: false,
      });
      return;
    }
    try {
      const resolution = await resolveSemanticIntent({
        intent: body.intent,
        capabilities: [...IDR_CAPABILITY_REGISTRY],
        policy: SERVER_POLICY,
        ...(embedding.provider ? { embeddingProvider: embedding.provider } : {}),
      });
      res.status(resolution.status === 'INVALID_REQUEST' ? 400 : 200).json({
        success: resolution.status === 'RESOLVED',
        version: '1.0.0',
        resolution,
        production: false,
        executionPerformed: false,
        notice: 'El resultado es un plan; no monta dominios ni ejecuta capacidades.',
      });
    } catch {
      res.status(400).json({
        success: false, error: 'INVALID_ROUTER_POLICY',
        production: false, executionPerformed: false,
      });
    }
  });
}
