// state: draft | engine-generated — pruebas de la superficie HTTP Nexus.
import { describe, expect, it } from 'vitest';
import type { Application, Request, Response } from 'express';
import type { FixedWindowRateLimiter } from '../../src/security/rate-limit';
import { registerNexusRoutes } from '../../src/routes/nexus';
import { createNexusRuntime } from '../../src/nexus/runtime';

type Handler = (req: Request, res: Response) => void | Promise<void>;

const NEXUS_CONTRACT: readonly (readonly [string, string])[] = [
  ['GET', '/api/v1/nexus'],
  ['POST', '/api/v1/nexus/ask'],
  ['GET', '/api/v1/nexus/knowledge'],
  ['POST', '/api/v1/nexus/knowledge'],
  ['POST', '/api/v1/nexus/knowledge/:id/correct'],
  ['POST', '/api/v1/nexus/knowledge/:id/withdraw'],
  ['POST', '/api/v1/nexus/quantum/simulate'],
  ['GET', '/api/v1/nexus/health'],
  ['GET', '/api/v1/nexus/repairs'],
  ['POST', '/api/v1/nexus/diagnostics'],
];

interface Captured {
  status: number;
  body: Record<string, unknown>;
}

function harness(options: { admin?: boolean; rateLimited?: boolean } = {}) {
  const handlers = new Map<string, Handler>();
  const register = (method: string) => (path: string, handler: Handler) => {
    handlers.set(`${method} ${path}`, handler);
  };
  const app = { get: register('GET'), post: register('POST') } as unknown as Application;
  const nexus = createNexusRuntime();

  registerNexusRoutes({
    app,
    nexus,
    enforceRateLimit: (_req, _res) => {
      if (options.rateLimited) {
        _res.status(429).json({ success: false, error: 'RATE_LIMITED' });
        return false;
      }
      return true;
    },
    rateLimiter: {} as FixedWindowRateLimiter,
    writeRateLimiter: {} as FixedWindowRateLimiter,
    isAdminAuthorized: () => options.admin === true,
  });

  const call = async (
    key: string,
    body?: unknown,
    params: Record<string, string> = {},
    query: Record<string, string> = {}
  ): Promise<Captured> => {
    const captured: Captured = { status: 200, body: {} };
    const res = {
      status(code: number) {
        captured.status = code;
        return this;
      },
      json(payload: unknown) {
        captured.body = payload as Record<string, unknown>;
        return this;
      },
    } as unknown as Response;
    const req = { body, params, query, ip: '127.0.0.1', get: () => undefined } as unknown as Request;
    await handlers.get(key)?.(req, res);
    return captured;
  };

  return { handlers, call, nexus };
}

describe('Nexus rutas — superficie registrada', () => {
  it('monta exactamente el contrato declarado', () => {
    const h = harness();
    expect([...h.handlers.keys()].sort()).toEqual(
      NEXUS_CONTRACT.map(([method, path]) => `${method} ${path}`).sort()
    );
  });

  it('describe capacidades con honestidad de estado', async () => {
    const h = harness();
    const result = await h.call('GET /api/v1/nexus');
    expect(result.status).toBe(200);
    expect(result.body.success).toBe(true);
    expect(result.body.state).toBe('draft');
    const capabilities = result.body.capabilities as Array<Record<string, unknown>>;
    expect(capabilities.every((capability) => capability.production === false)).toBe(true);
  });

  it('responde sin modelo y sin inventar cuando el grafo está vacío', async () => {
    const h = harness();
    const result = await h.call('POST /api/v1/nexus/ask', { input: '¿Qué es Isabella?' });
    expect(result.status).toBe(200);
    expect(result.body.answer).toContain('No encontré');
    expect(result.body.approvalSource).toBe('none');
  });

  it('rechaza escrituras sin bearer administrativo', async () => {
    const h = harness({ admin: false });
    const result = await h.call('POST /api/v1/nexus/knowledge', {
      subject: 'Isabella',
      predicate: 'opera_en',
      object: 'Real del Monte',
      source: 'repo:docs/territorio.md',
    });
    expect(result.status).toBe(401);
    expect(h.nexus.graph.size()).toBe(0);
  });

  it('inserta con admin, detecta duplicado y responde conflictos', async () => {
    const h = harness({ admin: true });
    const body = {
      subject: 'Isabella',
      predicate: 'opera_en',
      object: 'Real del Monte',
      source: 'repo:docs/territorio.md',
    };
    const inserted = await h.call('POST /api/v1/nexus/knowledge', body);
    expect(inserted.status).toBe(201);
    expect(inserted.body.status).toBe('inserted');

    const duplicate = await h.call('POST /api/v1/nexus/knowledge', body);
    expect(duplicate.status).toBe(200);
    expect(duplicate.body.status).toBe('duplicate');

    const conflict = await h.call('POST /api/v1/nexus/knowledge', { ...body, object: 'Pachuca' });
    expect(conflict.status).toBe(409);
    expect(conflict.body.status).toBe('conflict');
  });

  it('exige razón para retirar y permite corregir con admin', async () => {
    const h = harness({ admin: true });
    const inserted = await h.call('POST /api/v1/nexus/knowledge', {
      subject: 'Isabella',
      predicate: 'opera_en',
      object: 'Real del Monte',
      source: 'repo:docs/territorio.md',
    });
    const id = String(inserted.body.factId);
    const noReason = await h.call('POST /api/v1/nexus/knowledge/:id/withdraw', {}, { id });
    expect(noReason.status).toBe(400);

    const corrected = await h.call(
      'POST /api/v1/nexus/knowledge/:id/correct',
      { object: 'Pachuca' },
      { id }
    );
    expect(corrected.status).toBe(200);
    const fact = corrected.body.fact as Record<string, unknown>;
    expect(fact.object).toBe('Pachuca');
  });

  it('simula circuitos y rechaza circuitos inválidos', async () => {
    const h = harness();
    const ok = await h.call('POST /api/v1/nexus/quantum/simulate', {
      circuit: { qubits: 2, gates: [{ gate: 'h', qubit: 0 }, { gate: 'cnot', control: 0, target: 1 }] },
    });
    expect(ok.status).toBe(200);
    expect(ok.body.success).toBe(true);

    const bad = await h.call('POST /api/v1/nexus/quantum/simulate', {
      circuit: { qubits: 1, gates: [{ gate: 'h', qubit: 4 }] },
    });
    expect(bad.status).toBe(400);
    expect(bad.body.error).toBe('QUANTUM_QUBIT_OUT_OF_RANGE');
  });

  it('expone salud, reparaciones y diagnóstico gobernado', async () => {
    const h = harness({ admin: true });
    const health = await h.call('GET /api/v1/nexus/health');
    expect(health.status).toBe(200);
    expect(health.body.score).toBe(100);

    const repairs = await h.call('GET /api/v1/nexus/repairs');
    expect(repairs.status).toBe(200);
    expect(repairs.body.disclaimer).toContain('no fueron ejecutadas');

    const diagnostics = await h.call('POST /api/v1/nexus/diagnostics');
    expect(diagnostics.status).toBe(200);
    expect(diagnostics.body.status).toBe('completed');
  });

  it('aplica el techo de tasa antes de ejecutar', async () => {
    const h = harness({ rateLimited: true });
    const result = await h.call('POST /api/v1/nexus/ask', { input: 'hola' });
    expect(result.status).toBe(429);
  });
});
