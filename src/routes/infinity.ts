/**
 * ISABELLA VILLASEÑOR AI™ — Master Consolidated HTTP surface.
 * state: draft | engine-generated.
 *
 * Superficie de EVALUACIÓN. No hay endpoints de ejecución, despliegue,
 * publicación ni pago. Cada respuesta declara `production: false` y
 * `executionPerformed: false`. La aprobación humana se decide en el servidor con
 * un bearer administrativo verificado; el cuerpo HTTP nunca la concede.
 */
import type { Application, Request, Response } from 'express';
import type { FixedWindowRateLimiter } from '../security/rate-limit';
import {
  describeInfinity,
  evaluateA2A,
  evaluateConstitutional,
  generateDesignTokens,
  isDesignPalette,
  translate,
  selectLocale,
  evaluateA11y,
  planBuild,
  parseBuildFiles,
  runMediaOperation,
  runNativeSkill,
  SkillInputError,
  type BuildRuntime,
  type BuildTarget,
  type DomainAction,
  type EvolutionFabric,
  type EvolutionRequest,
  type IngestionDeclaration,
  type LearningOperation,
  type SecurityVectors,
} from '../infinity';

export const INFINITY_ROUTES_VERSION = '1.0.0' as const;

export interface InfinityRouteDeps {
  readonly app: Application;
  readonly evolution: EvolutionFabric;
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

const DISCLAIMERS = [
  'Superficie de evaluación: no ejecuta, no despliega, no publica y no cobra.',
  'ALLOW constitucional no concede autoridad ni ejecuta: CROWN sigue siendo la autoridad.',
  '20× es una meta por capacidad específica, no un resultado medido.',
  'Los registros declaran `tested` solo con pruebas unitarias verdes; nada aquí es producción.',
] as const;

const MAX_ACTIONS = 50;

function bodyOf(req: Request): Record<string, unknown> {
  return typeof req.body === 'object' && req.body !== null && !Array.isArray(req.body)
    ? (req.body as Record<string, unknown>)
    : {};
}

function errorResponse(res: Response, error: unknown): void {
  if (error instanceof SkillInputError) {
    res.status(400).json({
      success: false,
      production: false,
      executionPerformed: false,
      error: error.code,
      message: error.message,
    });
    return;
  }
  res.status(400).json({
    success: false,
    production: false,
    executionPerformed: false,
    error: 'INVALID_REQUEST',
    message: error instanceof Error ? error.message : 'solicitud inválida',
  });
}

function isDomainAction(value: unknown): value is DomainAction {
  return (
    typeof value === 'string' &&
    [
      'create',
      'supplant',
      'fraud',
      'unauthorized_access',
      'evidence_destruction',
      'deploy',
      'payment',
      'ingest',
      'learn',
      'execute',
    ].includes(value)
  );
}

function readVectors(value: unknown): Partial<SecurityVectors> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return {};
  }
  const record = value as Record<string, unknown>;
  return {
    identity: record.identity === true,
    authority: record.authority === true,
    policy: record.policy === true,
    evidence: record.evidence === true,
    safety: record.safety === true,
  };
}

export function registerInfinityRoutes(deps: InfinityRouteDeps): void {
  const { app } = deps;

  app.get('/api/v1/infinity', (req, res) => {
    if (!deps.enforceRateLimit(req, res, deps.rateLimiter, 'infinity-describe')) return;
    res.json({
      success: true,
      ...describeInfinity(),
      disclaimers: DISCLAIMERS,
    });
  });

  app.post('/api/v1/infinity/constitution/evaluate', (req, res) => {
    if (!deps.enforceRateLimit(req, res, deps.rateLimiter, 'infinity-constitution')) return;
    const body = bodyOf(req);
    if (!isDomainAction(body.action)) {
      res.status(400).json({
        success: false,
        production: false,
        executionPerformed: false,
        error: 'INVALID_ACTION',
        message: 'action debe ser una acción constitucional reconocida',
      });
      return;
    }

    const approvalGranted = deps.isAdminAuthorized(req);
    const decision = evaluateConstitutional({
      action: body.action,
      vectors: readVectors(body.vectors),
      humanApproval: approvalGranted,
      license: typeof body.license === 'string' ? body.license : null,
      ...(typeof body.ingestion === 'object' && body.ingestion !== null
        ? { ingestion: body.ingestion as IngestionDeclaration }
        : {}),
      ...(typeof body.learning === 'object' &&
      body.learning !== null &&
      typeof (body.learning as Record<string, unknown>).operation === 'string'
        ? {
            learning: {
              operation: (body.learning as Record<string, unknown>).operation as LearningOperation,
              license:
                typeof (body.learning as Record<string, unknown>).license === 'string'
                  ? ((body.learning as Record<string, unknown>).license as string)
                  : null,
            },
          }
        : {}),
    });

    res.json({
      success: true,
      version: INFINITY_ROUTES_VERSION,
      production: false,
      executionPerformed: false,
      authorizationPerformed: false,
      approvalSource: approvalGranted ? 'verified-admin-token' : 'none',
      decision,
      disclaimers: DISCLAIMERS,
    });
  });

  app.post('/api/v1/infinity/skills/run', (req, res) => {
    if (!deps.enforceRateLimit(req, res, deps.rateLimiter, 'infinity-skills')) return;
    const body = bodyOf(req);
    if (typeof body.skillId !== 'string' || !body.skillId.trim()) {
      res.status(400).json({
        success: false,
        production: false,
        executionPerformed: false,
        error: 'SKILL_ID_REQUIRED',
        message: 'skillId es requerido',
      });
      return;
    }
    const input =
      typeof body.input === 'object' && body.input !== null && !Array.isArray(body.input)
        ? (body.input as Record<string, unknown>)
        : {};
    const context =
      typeof body.now === 'string' && Number.isFinite(Date.parse(body.now))
        ? { now: new Date(body.now).toISOString() }
        : {};
    const result = runNativeSkill(body.skillId.trim(), input, context);
    res.status(result.status === 'REJECTED' || result.status === 'FAILED' ? 400 : 200).json({
      success: result.ok,
      version: INFINITY_ROUTES_VERSION,
      production: false,
      ...result,
      disclaimers: DISCLAIMERS,
    });
  });

  app.post('/api/v1/infinity/design-tokens', (req, res) => {
    if (!deps.enforceRateLimit(req, res, deps.rateLimiter, 'infinity-design-tokens')) return;
    const body = bodyOf(req);
    const palette = typeof body.palette === 'string' ? body.palette : '';
    const mode = typeof body.mode === 'string' ? body.mode : 'light';
    if (!isDesignPalette(palette)) {
      res.status(400).json({
        success: false,
        production: false,
        executionPerformed: false,
        error: 'INVALID_PALETTE',
        message: 'palette debe ser una paleta soportada',
      });
      return;
    }
    const result = generateDesignTokens(palette, mode);
    res.json({
      success: true,
      version: INFINITY_ROUTES_VERSION,
      production: false,
      ...result,
      disclaimers: DISCLAIMERS,
    });
  });

  app.post('/api/v1/infinity/i18n/translate', (req, res) => {
    if (!deps.enforceRateLimit(req, res, deps.rateLimiter, 'infinity-i18n')) return;
    const body = bodyOf(req);
    const locale = typeof body.locale === 'string' ? body.locale : 'es-MX';
    const key = typeof body.key === 'string' ? body.key : '';
    if (!key.trim()) {
      res.status(400).json({
        success: false,
        production: false,
        executionPerformed: false,
        error: 'KEY_REQUIRED',
        message: 'key es requerido',
      });
      return;
    }
    const vars =
      typeof body.vars === 'object' && body.vars !== null && !Array.isArray(body.vars)
        ? (body.vars as Record<string, string | number>)
        : {};
    const text = translate(locale, key.trim(), vars);
    res.json({
      success: true,
      version: INFINITY_ROUTES_VERSION,
      production: false,
      executionPerformed: false,
      locale: selectLocale(locale),
      key: key.trim(),
      text,
      disclaimers: DISCLAIMERS,
    });
  });

  app.post('/api/v1/infinity/accessibility/evaluate', (req, res) => {
    if (!deps.enforceRateLimit(req, res, deps.rateLimiter, 'infinity-a11y')) return;
    const body = bodyOf(req);
    const declaration =
      typeof body.declaration === 'object' && body.declaration !== null && !Array.isArray(body.declaration)
        ? (body.declaration as Record<string, unknown>)
        : {};
    try {
      const result = evaluateA11y(declaration);
      res.json({
        success: true,
        version: INFINITY_ROUTES_VERSION,
        production: false,
        ...result,
        disclaimers: DISCLAIMERS,
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        production: false,
        executionPerformed: false,
        error: 'INVALID_DECLARATION',
        message: error instanceof Error ? error.message : 'declaración inválida',
      });
    }
  });

  app.post('/api/v1/infinity/media/evaluate', (req, res) => {
    if (!deps.enforceRateLimit(req, res, deps.rateLimiter, 'infinity-media')) return;
    const body = bodyOf(req);
    if (typeof body.operation !== 'string' || !body.operation.trim()) {
      res.status(400).json({
        success: false,
        production: false,
        executionPerformed: false,
        error: 'OPERATION_REQUIRED',
        message: 'operation es requerida',
      });
      return;
    }
    const input =
      typeof body.input === 'object' && body.input !== null && !Array.isArray(body.input)
        ? (body.input as Record<string, unknown>)
        : {};
    const result = runMediaOperation(body.operation.trim(), input);
    res.status(result.ok ? 200 : 400).json({
      success: result.ok,
      version: INFINITY_ROUTES_VERSION,
      production: false,
      ...result,
      executionPerformed: false,
      disclaimers: DISCLAIMERS,
    });
  });

  app.post('/api/v1/infinity/build/plan', (req, res) => {
    if (!deps.enforceRateLimit(req, res, deps.rateLimiter, 'infinity-build')) return;
    const body = bodyOf(req);
    try {
      const files = parseBuildFiles(body.files);
      const approvalGranted = deps.isAdminAuthorized(req);
      const plan = planBuild({
        workspaceId: typeof body.workspaceId === 'string' ? body.workspaceId : '',
        projectName: typeof body.projectName === 'string' ? body.projectName : '',
        runtime: body.runtime as BuildRuntime,
        target: body.target as BuildTarget,
        files,
        ...(Array.isArray(body.commands)
          ? {
              commands: body.commands.filter(
                (command): command is string => typeof command === 'string'
              ),
            }
          : {}),
        approvalGranted,
      });
      res.json({
        success: plan.status === 'PLANNED',
        version: INFINITY_ROUTES_VERSION,
        ...plan,
        disclaimers: DISCLAIMERS,
      });
    } catch (error) {
      errorResponse(res, error);
    }
  });

  app.post('/api/v1/infinity/evolution/evolve', (req, res) => {
    if (!deps.enforceRateLimit(req, res, deps.rateLimiter, 'infinity-evolution')) return;
    const body = bodyOf(req);
    try {
      const population = Array.isArray(body.population) ? body.population : [];
      if (population.length > MAX_ACTIONS) {
        res.status(400).json({
          success: false,
          production: false,
          executionPerformed: false,
          error: 'LIMIT_EXCEEDED',
          message: `population excede ${MAX_ACTIONS}`,
        });
        return;
      }
      const request: EvolutionRequest = {
        population: population as EvolutionRequest['population'],
        ...(typeof body.generations === 'number' ? { generations: body.generations } : {}),
        ...(typeof body.populationSize === 'number' ? { populationSize: body.populationSize } : {}),
        ...(typeof body.mutationRate === 'number' ? { mutationRate: body.mutationRate } : {}),
        ...(typeof body.selectionPressure === 'number'
          ? { selectionPressure: body.selectionPressure }
          : {}),
        ...(typeof body.seed === 'string' ? { seed: body.seed } : {}),
        ...(typeof body.now === 'string' && Number.isFinite(Date.parse(body.now))
          ? { now: new Date(body.now).toISOString() }
          : {}),
      };
      const result = deps.evolution.evolve(request);
      res.json({
        success: true,
        version: INFINITY_ROUTES_VERSION,
        production: false,
        ...result,
        disclaimers: DISCLAIMERS,
      });
    } catch (error) {
      errorResponse(res, error);
    }
  });

  app.post('/api/v1/infinity/a2a/evaluate', (req, res) => {
    if (!deps.enforceRateLimit(req, res, deps.rateLimiter, 'infinity-a2a')) return;
    const body = bodyOf(req);
    if (typeof body.verb !== 'string' || !body.verb.trim()) {
      res.status(400).json({
        success: false,
        production: false,
        executionPerformed: false,
        error: 'VERB_REQUIRED',
        message: 'verb es requerido',
      });
      return;
    }
    const approvalGranted = deps.isAdminAuthorized(req);
    const evaluation = evaluateA2A(body.verb.trim(), approvalGranted);
    res.json({
      success: evaluation.verdict !== 'DENY',
      version: INFINITY_ROUTES_VERSION,
      production: false,
      executionPerformed: false,
      approvalSource: approvalGranted ? 'verified-admin-token' : 'none',
      evaluation,
      disclaimers: DISCLAIMERS,
    });
  });
}
