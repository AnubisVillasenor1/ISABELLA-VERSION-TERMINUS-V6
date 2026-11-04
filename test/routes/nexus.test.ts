// state: draft | engine-generated — pruebas de la superficie HTTP Nexus.
import { describe, expect, it } from 'vitest';
import type { Application, Request, Response } from 'express';
import type { FixedWindowRateLimiter } from '../../src/security/rate-limit';
import { registerNexusRoutes } from '../../src/routes/nexus';
import { createNexusRuntime, type NexusRuntime } from '../../src/nexus/runtime';
import { parseFabricManifest } from '../../src/nexus/open-agent-fabric';
import { createEgressPolicy } from '../../src/security/egress-policy';

type Handler = (req: Request, res: Response) => void | Promise<void>;

const NEXUS_CONTRACT: readonly (readonly [string, string])[] = [
  ['GET', '/api/v1/nexus'],
  ['POST', '/api/v1/nexus/ask'],
  ['GET', '/api/v1/nexus/knowledge'],
  ['POST', '/api/v1/nexus/knowledge'],
  ['POST', '/api/v1/nexus/knowledge/:id/correct'],
  ['POST', '/api/v1/nexus/knowledge/:id/withdraw'],
  ['GET', '/api/v1/nexus/capabilities'],
  ['GET', '/api/v1/nexus/capabilities/:id'],
  ['POST', '/api/v1/nexus/capabilities/:id/simulate'],
  ['POST', '/api/v1/nexus/capabilities/:id/execute'],
  ['POST', '/api/v1/nexus/capabilities/:id/rollback'],
  ['GET', '/api/v1/nexus/fabric'],
  ['GET', '/api/v1/nexus/fabric/:id'],
  ['POST', '/api/v1/nexus/fabric/:id/discover'],
  ['POST', '/api/v1/nexus/fabric/:id/call'],
  ['POST', '/api/v1/nexus/quantum/simulate'],
  ['GET', '/api/v1/nexus/health'],
  ['GET', '/api/v1/nexus/repairs'],
  ['POST', '/api/v1/nexus/diagnostics'],
];

interface Captured {
  status: number;
  body: Record<string, unknown>;
}

function harness(
  options: {
    admin?: boolean;
    rateLimited?: boolean;
    nexus?: NexusRuntime;
  } = {}
) {
  const handlers = new Map<string, Handler>();
  const register = (method: string) => (path: string, handler: Handler) => {
    handlers.set(`${method} ${path}`, handler);
  };
  const app = { get: register('GET'), post: register('POST') } as unknown as Application;
  // `fabricSource: null` deja la fábrica explícitamente vacía: lo que se prueba aquí
  // es la superficie HTTP, no la lectura del entorno del operador.
  const nexus = options.nexus ?? createNexusRuntime({ fabricSource: null });

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
    const req = {
      body,
      params,
      query,
      ip: '127.0.0.1',
      get: () => undefined,
    } as unknown as Request;
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
      circuit: {
        qubits: 2,
        gates: [
          { gate: 'h', qubit: 0 },
          { gate: 'cnot', control: 0, target: 1 },
        ],
      },
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

describe('Nexus rutas — fábrica de capacidades', () => {
  it('lista las capacidades con su veredicto y aviso de procedencia', async () => {
    const h = harness();
    const result = await h.call('GET /api/v1/nexus/capabilities');
    expect(result.status).toBe(200);
    expect(result.body.count).toBe(4);
    expect(String(result.body.notice)).toContain('4 capacidades de fábrica registradas');
    expect(String(result.body.disclaimer).toLowerCase()).toContain('ninguna cifra es estimada');
    const list = result.body.capabilities as Array<{ id: string; status: string; state: string }>;
    expect(list.find((entry) => entry.id === 'nexus.cap.knowledge.assert')?.status).toBe('shadow');
  });

  it('describe una capacidad conocida y responde 404 por la desconocida', async () => {
    const h = harness();
    const known = await h.call('GET /api/v1/nexus/capabilities/:id', undefined, {
      id: 'nexus.cap.knowledge.search',
    });
    expect(known.status).toBe(200);
    const capability = known.body.capability as Record<string, unknown>;
    expect(capability.toolId).toBe('knowledge.search');
    expect((capability.decision as Record<string, unknown>).status).toBe('approved');

    const unknown = await h.call('GET /api/v1/nexus/capabilities/:id', undefined, {
      id: 'nexus.cap.no.existe',
    });
    expect(unknown.status).toBe(404);
  });

  it('simula sin inventar costo ni fuga de privacidad', async () => {
    const h = harness();
    const result = await h.call(
      'POST /api/v1/nexus/capabilities/:id/simulate',
      {},
      { id: 'nexus.cap.quantum.simulate' }
    );
    expect(result.status).toBe(200);
    const simulation = result.body.simulation as Record<string, unknown>;
    expect(simulation.verdict).toBe('approved');
    expect(JSON.stringify(simulation)).not.toContain('cost_estimate_usd');
    expect((simulation.notMeasured as string[]).join(' ')).toContain('costo en USD');
  });

  it('ejecuta una capacidad A0 de lectura sin bearer y sella evidencia', async () => {
    const h = harness();
    const result = await h.call(
      'POST /api/v1/nexus/capabilities/:id/execute',
      {
        input: { query: 'cualquier cosa', limit: 5 },
      },
      { id: 'nexus.cap.knowledge.search' }
    );
    expect(result.status).toBe(200);
    expect(result.body.status).toBe('executed');
    expect(result.body.approvalSource).toBe('none');
    expect(result.body.output).toEqual({ hits: [], count: 0 });
    expect(h.nexus.ledger.list().length).toBeGreaterThan(0);
  });

  it('retiene la escritura A2 mientras la reputación no esté medida', async () => {
    const h = harness();
    const result = await h.call(
      'POST /api/v1/nexus/capabilities/:id/execute',
      { input: { subject: 'a', predicate: 'b', object: 'c', source: 'repo:docs/x.md' } },
      { id: 'nexus.cap.knowledge.assert' }
    );
    expect(result.status).toBe(403);
    expect(result.body.code).toBe('CAPABILITY_NOT_APPROVED');
    expect(result.body.state).toBe('shadow');
    expect((result.body.output as Record<string, unknown>).status).toBe('shadow');
  });

  it('no filtra el valor rechazado por el esquema de entrada', async () => {
    const h = harness();
    const secret = 'sk-live-DO-NOT-LEAK-9f3a2b';
    const result = await h.call(
      'POST /api/v1/nexus/capabilities/:id/execute',
      { input: { clave: secret } },
      { id: 'nexus.cap.knowledge.search' }
    );
    expect(result.status).toBe(403);
    expect(result.body.code).toBe('CAPABILITY_INPUT_INVALID');
    expect(JSON.stringify(result.body)).not.toContain(secret);
  });

  it('responde 404 para una capacidad inexistente', async () => {
    const h = harness();
    const result = await h.call(
      'POST /api/v1/nexus/capabilities/:id/execute',
      { input: {} },
      { id: 'nexus.cap.no.existe' }
    );
    expect(result.status).toBe(404);
    expect(result.body.code).toBe('CAPABILITY_NOT_FOUND');
  });

  it('exige bearer administrativo para revertir', async () => {
    const h = harness({ admin: false });
    const result = await h.call(
      'POST /api/v1/nexus/capabilities/:id/rollback',
      {},
      { id: 'nexus.cap.knowledge.search' }
    );
    expect(result.status).toBe(401);
  });

  it('declara que no hay compensación cuando el contrato no la promete', async () => {
    const h = harness({ admin: true });
    const result = await h.call(
      'POST /api/v1/nexus/capabilities/:id/rollback',
      {},
      { id: 'nexus.cap.knowledge.search' }
    );
    expect(result.status).toBe(403);
    expect(result.body.code).toBe('CAPABILITY_ROLLBACK_UNDECLARED');
  });
});

const FABRIC_MANIFEST_JSON = JSON.stringify({
  version: '1',
  agents: [
    {
      id: 'wikidata',
      label: 'Wikidata MCP',
      endpoint: 'https://api.wikidata.org/mcp',
      protocol: 'mcp-http',
      toolAllowlist: ['search_entities'],
      risk: 'LOW',
      autonomy: 'A0',
      license: 'CC0-1.0',
    },
  ],
});

/** Runtime con la fábrica cargada: el manifiesto entra explícito, nunca desde el cuerpo. */
function fabricHarness(options: { admin?: boolean; allowHost?: boolean } = {}) {
  const calls: string[] = [];
  const fetchImpl = (async (input: unknown) => {
    calls.push(String(input));
    return new Response(
      JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        result: { tools: [{ name: 'search_entities' }, { name: 'get_entity' }] },
      }),
      { status: 200, headers: { 'content-type': 'application/json' } }
    );
  }) as unknown as typeof fetch;

  const nexus = createNexusRuntime({
    repoRoot: process.cwd(),
    fabricSource: parseFabricManifest(FABRIC_MANIFEST_JSON, 'file:test/fixtures/fabric.json'),
    egressPolicy: createEgressPolicy({
      allowedHosts: options.allowHost === false ? [] : ['api.wikidata.org'],
    }),
    fabricFetch: fetchImpl,
  });
  return { ...harness({ admin: options.admin, nexus }), calls };
}

describe('Nexus rutas — fábrica de agentes externos', () => {
  it('reporta cero agentes cuando el operador no allowlisteó el host', async () => {
    const h = fabricHarness({ allowHost: false });
    const result = await h.call('GET /api/v1/nexus/fabric');
    expect(result.status).toBe(200);
    expect(result.body.agents).toEqual([]);
    expect(h.nexus.fabricReport.rejected[0]?.code).toBe('EGRESS_HOST_NOT_ALLOWLISTED');
    expect(h.nexus.capabilityList().length).toBe(4);
    expect(JSON.stringify(result.body)).not.toContain('api.wikidata.org');
  });

  it('expone el agente declarado sin autorizar ninguna herramienta nueva', async () => {
    const h = fabricHarness();
    const result = await h.call('GET /api/v1/nexus/fabric');
    const agents = result.body.agents as Array<Record<string, unknown>>;
    expect(agents.length).toBe(1);
    expect(agents[0]?.id).toBe('wikidata');
    expect(agents[0]?.discoveredTools).toBeNull();
    expect(agents[0]?.declaredTools).toEqual(['search_entities']);

    const listed = await h.call('GET /api/v1/nexus/capabilities');
    expect(listed.body.count).toBe(5);
    const fabric = await h.call('GET /api/v1/nexus/fabric/:id', undefined, { id: 'wikidata' });
    expect(fabric.status).toBe(200);
    expect((fabric.body.agent as Record<string, unknown>).capabilityId).toBe(
      'nexus.cap.fabric.wikidata'
    );
  });

  it('descubre por la compuerta de capacidades y sella evidencia', async () => {
    const h = fabricHarness();
    const result = await h.call('POST /api/v1/nexus/fabric/:id/discover', {}, { id: 'wikidata' });
    expect(result.status).toBe(200);
    expect(result.body.status).toBe('executed');
    expect(h.calls).toEqual(['https://api.wikidata.org/mcp']);
    const described = await h.call('GET /api/v1/nexus/fabric/:id', undefined, { id: 'wikidata' });
    const agent = described.body.agent as Record<string, unknown>;
    expect(agent.discoveredTools).toEqual(['search_entities', 'get_entity']);
    // `get_entity` apareció en el upstream pero no en el manifiesto: no es invocable.
    expect(agent.callable).toEqual(['search_entities']);
    expect(h.nexus.ledger.list().length).toBeGreaterThan(0);
  });

  it('rechaza una herramienta no declarada antes de tocar la red', async () => {
    const h = fabricHarness();
    const result = await h.call(
      'POST /api/v1/nexus/fabric/:id/call',
      { input: { tool: 'delete_everything', arguments: {} } },
      { id: 'wikidata' }
    );
    expect(result.status).toBe(403);
    expect(result.body.error).toBe('FABRIC_TOOL_NOT_DECLARED');
    expect(h.calls).toEqual([]);
  });

  it('exige el campo tool y responde 404 por un agente inexistente', async () => {
    const h = fabricHarness();
    const missingTool = await h.call(
      'POST /api/v1/nexus/fabric/:id/call',
      { input: {} },
      { id: 'wikidata' }
    );
    expect(missingTool.status).toBe(400);
    expect(missingTool.body.error).toBe('FABRIC_TOOL_REQUIRED');

    const unknownAgent = await h.call(
      'POST /api/v1/nexus/fabric/:id/call',
      { input: { tool: 'search_entities' } },
      { id: 'no-existe' }
    );
    expect(unknownAgent.status).toBe(404);
    expect(h.calls).toEqual([]);
  });
});
