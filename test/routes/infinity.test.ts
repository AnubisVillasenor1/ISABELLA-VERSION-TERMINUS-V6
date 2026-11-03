import { describe, expect, it } from 'vitest';
import type { Application, Request, Response } from 'express';
import type { FixedWindowRateLimiter } from '../../src/security/rate-limit';
import { registerInfinityRoutes } from '../../src/routes/infinity';
import { EvolutionFabric } from '../../src/infinity';

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
  registerInfinityRoutes({
    app,
    evolution: new EvolutionFabric(),
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
  body: Record<string, unknown> = {}
): Captured {
  const { res, captured } = makeRes();
  handlers.get(key)!({ body, query: {}, get: () => undefined } as unknown as Request, res);
  return captured;
}

const VECTORS = {
  identity: true,
  authority: true,
  policy: true,
  evidence: true,
  safety: true,
};

describe('Master Consolidated routes', () => {
  it('publishes the honest summary and never claims production', () => {
    const captured = call(harness(), 'GET /api/v1/infinity');
    const body = captured.body as {
      success: boolean;
      production: boolean;
      executionPerformed: boolean;
      architecture: { layers: number; fabrics: number };
      catalog: { total: number };
      skills: unknown[];
      media: unknown[];
      audit: { ok: boolean };
      disclaimers: string[];
    };
    expect(captured.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.production).toBe(false);
    expect(body.executionPerformed).toBe(false);
    expect(body.architecture.layers).toBe(14);
    expect(body.architecture.fabrics).toBe(9);
    expect(body.catalog.total).toBe(54);
    expect(body.skills).toHaveLength(10);
    expect(body.media.length).toBeGreaterThanOrEqual(7);
    expect(body.audit.ok).toBe(true);
    expect(body.disclaimers.some((item) => item.includes('20×'))).toBe(true);
  });

  it('evaluates the constitution and derives human approval from the server token', () => {
    const blocked = call(harness(), 'POST /api/v1/infinity/constitution/evaluate', {
      action: 'deploy',
      vectors: VECTORS,
      humanApproval: true,
    });
    const blockedBody = blocked.body as {
      decision: { verdict: string; rule: string; humanApprovalPresent: boolean };
      approvalSource: string;
      authorizationPerformed: boolean;
    };
    expect(blockedBody.decision.verdict).toBe('DENY');
    expect(blockedBody.decision.rule).toBe('HUMAN_APPROVAL_REQUIRED');
    expect(blockedBody.decision.humanApprovalPresent).toBe(false);
    expect(blockedBody.approvalSource).toBe('none');
    expect(blockedBody.authorizationPerformed).toBe(false);

    const allowed = call(harness({ admin: true }), 'POST /api/v1/infinity/constitution/evaluate', {
      action: 'deploy',
      vectors: VECTORS,
    });
    const allowedBody = allowed.body as {
      decision: { verdict: string; humanApprovalPresent: boolean };
      approvalSource: string;
    };
    expect(allowedBody.decision.verdict).toBe('ALLOW');
    expect(allowedBody.decision.humanApprovalPresent).toBe(true);
    expect(allowedBody.approvalSource).toBe('verified-admin-token');
  });

  it('rejects an unknown constitutional action', () => {
    const captured = call(harness(), 'POST /api/v1/infinity/constitution/evaluate', {
      action: 'hack',
    });
    expect(captured.status).toBe(400);
    expect((captured.body as { error: string }).error).toBe('INVALID_ACTION');
  });

  it('runs a native skill and reports no external calls', () => {
    const captured = call(harness(), 'POST /api/v1/infinity/skills/run', {
      skillId: 'IV_PromptEngineering',
      input: { prompt: 'Responde en español y no inventes fuentes.' },
    });
    const body = captured.body as {
      success: boolean;
      skillId: string;
      executionPerformed: boolean;
      externalCalls: number;
      production: boolean;
    };
    expect(captured.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.skillId).toBe('IV_PromptEngineering');
    expect(body.executionPerformed).toBe(false);
    expect(body.externalCalls).toBe(0);
    expect(body.production).toBe(false);
  });

  it('returns 400 for an unknown skill', () => {
    const captured = call(harness(), 'POST /api/v1/infinity/skills/run', {
      skillId: 'IV_Unknown',
    });
    expect(captured.status).toBe(400);
    expect((captured.body as { error: string }).error).toBe('UNKNOWN_SKILL');
  });

  it('evaluates a media operation without modifying pixels', () => {
    const captured = call(harness(), 'POST /api/v1/infinity/media/evaluate', {
      operation: 'cull',
      input: {
        candidates: [
          { id: 'a', sharpness: 0.9, exposure: 0.9 },
          { id: 'b', sharpness: 0.2, exposure: 0.2 },
        ],
      },
    });
    const body = captured.body as {
      success: boolean;
      pixelsModified: boolean;
      networkUsed: boolean;
      executionPerformed: boolean;
    };
    expect(captured.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.pixelsModified).toBe(false);
    expect(body.networkUsed).toBe(false);
    expect(body.executionPerformed).toBe(false);
  });

  it('plans a preview build without deploying', () => {
    const captured = call(harness(), 'POST /api/v1/infinity/build/plan', {
      workspaceId: 'ws-1',
      projectName: 'demo',
      runtime: 'node',
      target: 'preview',
      files: [{ path: 'src/index.ts', bytes: 100 }],
    });
    const body = captured.body as {
      success: boolean;
      status: string;
      executionPerformed: boolean;
      deploymentPerformed: boolean;
    };
    expect(captured.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.status).toBe('PLANNED');
    expect(body.executionPerformed).toBe(false);
    expect(body.deploymentPerformed).toBe(false);
  });

  it('blocks a staging build without a verified admin token', () => {
    const files = [
      { path: 'pnpm-lock.yaml', bytes: 100 },
      { path: 'src/index.ts', bytes: 100 },
    ];
    const captured = call(harness(), 'POST /api/v1/infinity/build/plan', {
      workspaceId: 'ws-1',
      projectName: 'demo',
      runtime: 'node',
      target: 'staging',
      files,
    });
    const body = captured.body as {
      success: boolean;
      status: string;
      blockedReasons: string[];
      deploymentPerformed: boolean;
    };
    expect(body.success).toBe(false);
    expect(body.status).toBe('BLOCKED');
    expect(body.blockedReasons).toContain('HUMAN_APPROVAL_REQUIRED');
    expect(body.deploymentPerformed).toBe(false);

    const approved = call(harness({ admin: true }), 'POST /api/v1/infinity/build/plan', {
      workspaceId: 'ws-1',
      projectName: 'demo',
      runtime: 'node',
      target: 'staging',
      files,
    });
    const approvedBody = approved.body as { success: boolean; status: string };
    expect(approvedBody.success).toBe(true);
    expect(approvedBody.status).toBe('PLANNED');
  });

  it('rejects a build with a path traversal before planning', () => {
    const captured = call(harness(), 'POST /api/v1/infinity/build/plan', {
      workspaceId: 'ws-1',
      projectName: 'demo',
      runtime: 'node',
      target: 'preview',
      files: [{ path: '../escape.ts', bytes: 100 }],
    });
    expect(captured.status).toBe(400);
    expect((captured.body as { error: string }).error).toBe('INVALID_PATH');
  });

  it('simulates evolution and exposes the ledger state', () => {
    const captured = call(harness(), 'POST /api/v1/infinity/evolution/evolve', {
      population: [
        { label: 'a', genes: [{ id: 'x', value: 1 }] },
        { label: 'b', genes: [{ id: 'x', value: 0.2 }] },
      ],
      generations: 1,
      seed: 'route',
    });
    const body = captured.body as {
      success: boolean;
      ledgerSize: number;
      ledgerValid: boolean;
      report: {
        status: string;
        executionPerformed: boolean;
        published: boolean;
        production: boolean;
      };
    };
    expect(captured.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.ledgerSize).toBe(1);
    expect(body.ledgerValid).toBe(true);
    expect(body.report.status).toBe('SIMULATED');
    expect(body.report.executionPerformed).toBe(false);
    expect(body.report.published).toBe(false);
    expect(body.report.production).toBe(false);
  });

  it('escalates A2A adoption without a verified admin token', () => {
    const blocked = call(harness(), 'POST /api/v1/infinity/a2a/evaluate', { verb: 'adopt' });
    const blockedBody = blocked.body as {
      evaluation: { verdict: string; adoptionPerformed: boolean };
      approvalSource: string;
    };
    expect(blockedBody.evaluation.verdict).toBe('ESCALATE');
    expect(blockedBody.evaluation.adoptionPerformed).toBe(false);
    expect(blockedBody.approvalSource).toBe('none');

    const allowed = call(harness({ admin: true }), 'POST /api/v1/infinity/a2a/evaluate', {
      verb: 'adopt',
    });
    const allowedBody = allowed.body as {
      evaluation: { verdict: string; adoptionPerformed: boolean };
      approvalSource: string;
    };
    expect(allowedBody.evaluation.verdict).toBe('ALLOW');
    expect(allowedBody.evaluation.adoptionPerformed).toBe(false);
    expect(allowedBody.approvalSource).toBe('verified-admin-token');
  });

  it('does not answer when the rate limiter blocks the request', () => {
    const captured = call(harness({ allow: false }), 'GET /api/v1/infinity');
    expect(captured.body).toBeUndefined();
  });
});
