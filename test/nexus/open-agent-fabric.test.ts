/**
 * Fábrica abierta de agentes. Se prueba con un transporte inyectado: lo que se
 * verifica es el encuadre real (JSON-RPC 2.0, cabeceras, techo de bytes, SSE) y la
 * gobernanza (allowlist, aprobación, declaração vs. descubrimiento), no un third
 * party vivo. La compuerta de egreso tiene su propia suite.
 */
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { EvidenceLedger } from '../../src/nexus/agent-loop';
import { AntifragileMonitor } from '../../src/nexus/antifragile';
import { createCapabilityEngine } from '../../src/nexus/capability-engine';
import { NexusToolRegistry, type ToolContext } from '../../src/nexus/tool-registry';
import { createEgressPolicy, type EgressPolicy } from '../../src/security/egress-policy';
import {
  OpenAgentFabric,
  buildJsonRpcBody,
  extractJsonRpcPayload,
  loadFabricManifestFromEnv,
  parseDiscoveredTools,
  parseFabricManifest,
  type FabricManifestSource
} from '../../src/nexus/open-agent-fabric';

const WIKIDATA_TEXT = JSON.stringify({
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
      license: 'MIT'
    },
    {
      id: 'noteswriter',
      label: 'Notas externo',
      endpoint: 'https://notes.example.com/mcp',
      protocol: 'mcp-http',
      toolAllowlist: ['put_note'],
      risk: 'MEDIUM',
      autonomy: 'A2',
      license: 'Apache-2.0',
      authEnv: 'ISABELLA_FABRIC_NOTESWRITER_TOKEN'
    }
  ]
});

function manifest(text: string = WIKIDATA_TEXT): FabricManifestSource {
  return parseFabricManifest(text, 'test:manifiesto');
}

function context(overrides: Partial<ToolContext> = {}): ToolContext {
  return {
    requestId: 'req-fabric-test',
    actorId: 'human:test',
    tenantId: 'public',
    approvalGranted: false,
    signal: AbortSignal.timeout(5_000),
    ...overrides
  };
}

interface Harness {
  readonly fabric: OpenAgentFabric;
  readonly registry: NexusToolRegistry;
  readonly capabilities: ReturnType<typeof createCapabilityEngine>;
  readonly monitor: AntifragileMonitor;
  readonly ledger: EvidenceLedger;
  readonly calls: Array<{ url: string; init: RequestInit }>;
  respond(handler: (request: { url: string; body: Record<string, unknown> }) => Response): void;
}

function harness(
  policy: EgressPolicy = createEgressPolicy({ allowedHosts: ['api.wikidata.org', 'notes.example.com'] }),
  env: Record<string, string | undefined> = {}
): Harness {
  const registry = new NexusToolRegistry();
  const ledger = new EvidenceLedger();
  const monitor = new AntifragileMonitor();
  const calls: Array<{ url: string; init: RequestInit }> = [];
  let responder: (body: string) => Response = () =>
    new Response(JSON.stringify({ jsonrpc: '2.0', id: 1, result: { tools: [] } }), {
      status: 200,
      headers: { 'content-type': 'application/json' }
    });

  const fetchImpl = (async (input: string | URL, init?: RequestInit) => {
    calls.push({ url: String(input), init: init ?? {} });
    const raw = typeof init?.body === 'string' ? init.body : '{}';
    return responder(`__BODY__${raw}`);
  }) as unknown as typeof fetch;

  const capabilities = createCapabilityEngine({
    tools: registry,
    ledger,
    monitor,
    repoRoot: process.cwd()
  });
  const fabric = new OpenAgentFabric({
    tools: registry,
    capabilities,
    policy,
    env,
    fetchImpl,
    repoRoot: process.cwd()
  });

  return {
    fabric,
    registry,
    capabilities,
    monitor,
    ledger,
    calls,
    respond(handler) {
      responder = (envelope: string) => {
        const body = envelope.startsWith('__BODY__') ? envelope.slice(8) : envelope;
        let parsed: Record<string, unknown>;
        try {
          parsed = JSON.parse(body) as Record<string, unknown>;
        } catch {
          parsed = { raw: body };
        }
        return handler({ url: '', body: parsed });
      };
    }
  };
}

function jsonResponse(payload: unknown, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(payload), {
    status: 200,
    headers: { 'content-type': 'application/json', ...headers }
  });
}

describe('open agent fabric — manifiesto', () => {
  it('rechaza un manifiesto vacío o con ids duplicados', () => {
    expect(() => parseFabricManifest('   ', 'test:x')).toThrow(/FABRIC_MANIFEST_EMPTY/);
    expect(() => parseFabricManifest('no es json', 'test:x')).toThrow(/FABRIC_MANIFEST_NOT_JSON/);
    const duplicated = JSON.stringify({
      version: '1',
      agents: [
        {
          id: 'dup',
          label: 'Agente A',
          endpoint: 'https://api.wikidata.org/mcp',
          protocol: 'mcp-http',
          toolAllowlist: [],
          risk: 'LOW',
          autonomy: 'A0',
          license: 'MIT'
        },
        {
          id: 'dup',
          label: 'Agente A repetido',
          endpoint: 'https://api.wikidata.org/mcp2',
          protocol: 'mcp-http',
          toolAllowlist: [],
          risk: 'LOW',
          autonomy: 'A0',
          license: 'MIT'
        }
      ]
    });
    expect(() => parseFabricManifest(duplicated, 'test:x')).toThrow(/FABRIC_DUPLICATE_ID:dup/);
  });

  it('exige https en mcp-http y tarjeta publicada en a2a-card', () => {
    const insecure = JSON.stringify({
      version: '1',
      agents: [
        {
          id: 'inseguro',
          label: 'Sin TLS',
          endpoint: 'http://api.wikidata.org/mcp',
          protocol: 'mcp-http',
          toolAllowlist: [],
          risk: 'LOW',
          autonomy: 'A0',
          license: 'MIT'
        }
      ]
    });
    expect(() => parseFabricManifest(insecure, 'test:x')).toThrow();

    const badCard = JSON.stringify({
      version: '1',
      agents: [
        {
          id: 'cardmala',
          label: 'Tarjeta mal apuntada',
          endpoint: 'https://api.wikidata.org/rpc',
          protocol: 'a2a-card',
          toolAllowlist: [],
          risk: 'LOW',
          autonomy: 'A0',
          license: 'MIT'
        }
      ]
    });
    expect(() => parseFabricManifest(badCard, 'test:x')).toThrow();
  });

  it('sin variable de entorno no hay manifiesto, y con archivo ilegible el error es explícito', () => {
    expect(loadFabricManifestFromEnv({})).toBeNull();
    expect(loadFabricManifestFromEnv({ ISABELLA_AGENT_FABRIC_FILE: '<ruta>' })).toBeNull();
    expect(() => loadFabricManifestFromEnv({ ISABELLA_AGENT_FABRIC_FILE: '/no/existe.json' })).toThrow(
      /FABRIC_MANIFEST_UNREADABLE/
    );
  });

  it('lee un manifiesto real de disco y su digest sale de los bytes leídos', () => {
    const dir = mkdtempSync(join(tmpdir(), 'isa-fabric-'));
    const file = join(dir, 'agents.json');
    try {
      writeFileSync(file, WIKIDATA_TEXT, 'utf8');
      const source = loadFabricManifestFromEnv({ ISABELLA_AGENT_FABRIC_FILE: file });
      expect(source).not.toBeNull();
      expect(source?.manifest.agents.map((agent) => agent.id)).toEqual(['wikidata', 'noteswriter']);
      const other = parseFabricManifest(WIKIDATA_TEXT + ' ', 'test:otro');
      expect(source?.sourceDigest).not.toBe(other.sourceDigest);
      expect(source?.sourceDigest).toMatch(/^sha256:[0-9a-f]{64}$/);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe('open agent fabric — compuerta de egreso', () => {
  it('con allowlist vacío no registra nada y el informe lo dice', () => {
    const h = harness(createEgressPolicy({ allowedHosts: [] }));
    const report = h.fabric.load(manifest());
    expect(report.loaded).toEqual([]);
    expect(report.rejected.map((entry) => entry.code)).toEqual([
      'EGRESS_HOST_NOT_ALLOWLISTED',
      'EGRESS_HOST_NOT_ALLOWLISTED'
    ]);
    expect(h.registry.has('fabric.wikidata')).toBe(false);
    expect(h.fabric.summary().notice).toContain('0 agentes habilitados');
  });

  it('rechaza un endpoint que apunta a la red de metadatos aunque esté en el manifiesto', () => {
    const text = JSON.stringify({
      version: '1',
      agents: [
        {
          id: 'metadata',
          label: 'Falso proveedor',
          endpoint: 'https://169.254.169.254/latest/meta-data',
          protocol: 'mcp-http',
          toolAllowlist: [],
          risk: 'LOW',
          autonomy: 'A0',
          license: 'MIT'
        }
      ]
    });
    const h = harness(createEgressPolicy({ allowedHosts: ['169.254.169.254'] }));
    const report = h.fabric.load(manifest(text));
    expect(report.loaded).toEqual([]);
    expect(report.rejected[0]?.code).toBe('EGRESS_PRIVATE_ADDRESS_FORBIDDEN');
  });

  it('acepta el agente cuyo host sí declaró el operador', () => {
    const h = harness(createEgressPolicy({ allowedHosts: ['api.wikidata.org'] }));
    const report = h.fabric.load(manifest());
    expect(report.loaded).toEqual(['wikidata']);
    expect(report.rejected.map((entry) => entry.id)).toEqual(['noteswriter']);
    expect(h.registry.has('fabric.wikidata')).toBe(true);
    expect(h.capabilities.has('nexus.cap.fabric.wikidata')).toBe(true);
  });
});

describe('open agent fabric — encuadre JSON-RPC', () => {
  it('construye el sobre 2.0 con método y parámetros', () => {
    const body = JSON.parse(buildJsonRpcBody(7, 'tools/call', { name: 'x' })) as Record<string, unknown>;
    expect(body).toMatchObject({ jsonrpc: '2.0', id: 7, method: 'tools/call' });
  });

  it('lee el último payload de un stream SSE', () => {
    const payload = extractJsonRpcPayload({
      status: 200,
      ok: true,
      body: 'event: message\ndata: {"a":1}\n\ndata: {"jsonrpc":"2.0","id":1,"result":{"tools":[{"name":"b"}]}}\n',
      bytes: 1,
      truncated: false,
      contentType: 'text/event-stream',
      finalUrl: 'https://x.test'
    });
    expect(payload).toMatchObject({ result: { tools: [{ name: 'b' }] } });
  });

  it('falla ante JSON corrupto o cuerpo vacío', () => {
    expect(() =>
      extractJsonRpcPayload({
        status: 200,
        ok: true,
        body: '{no-json',
        bytes: 7,
        truncated: false,
        contentType: 'application/json',
        finalUrl: 'https://x.test'
      })
    ).toThrow(/FABRIC_BAD_JSON/);
    expect(() =>
      extractJsonRpcPayload({
        status: 200,
        ok: true,
        body: '   ',
        bytes: 0,
        truncated: false,
        contentType: 'application/json',
        finalUrl: 'https://x.test'
      })
    ).toThrow(/FABRIC_EMPTY_RESPONSE/);
  });

  it('extrae herramientas de MCP y de una tarjeta A2A', () => {
    expect(parseDiscoveredTools({ result: { tools: [{ name: 'search' }, { name: 'fetch' }] } })).toEqual([
      'search',
      'fetch'
    ]);
    expect(parseDiscoveredTools({ skills: [{ id: 'answer' }] })).toEqual(['answer']);
    expect(parseDiscoveredTools({ result: { tools: [] } })).toEqual([]);
    expect(parseDiscoveredTools('texto suelto')).toEqual([]);
  });
});

describe('open agent fabric — ejecución gobernada', () => {
  it('un A0 descubierto y declarado se ejecuta por el motor y sella evidencia', async () => {
    const h = harness();
    h.fabric.load(manifest());
    h.respond(() => jsonResponse({ jsonrpc: '2.0', id: 1, result: { content: [{ text: 'Ramona Novoa' }] } }));

    const result = await h.capabilities.execute(
      'nexus.cap.fabric.wikidata',
      { tool: 'search_entities', arguments: { query: 'Ramona Novoa' } },
      context()
    );

    expect(result.ok).toBe(true);
    expect(result.code).toBe('CAPABILITY_EXECUTED');
    expect(h.calls[0]?.url).toBe('https://api.wikidata.org/mcp');
    const sent = JSON.parse(String(h.calls[0]?.init?.body ?? '{}')) as Record<string, unknown>;
    expect(sent).toMatchObject({ jsonrpc: '2.0', method: 'tools/call' });
    expect((sent.params as Record<string, unknown>).name).toBe('search_entities');
    expect(h.ledger.list().length).toBeGreaterThan(0);
  });

  it('una herramienta no declarada en el manifiesto no sale a la red', async () => {
    const h = harness();
    h.fabric.load(manifest());
    const result = await h.capabilities.execute(
      'nexus.cap.fabric.wikidata',
      { tool: 'delete_everything', arguments: {} },
      context()
    );
    expect(result.ok).toBe(false);
    expect(JSON.stringify(result.output)).toContain('FABRIC_TOOL_NOT_DECLARED');
    expect(h.calls).toEqual([]);
  });

  it('el bearer se lee al momento de llamar y nunca aparece en la evidencia', async () => {
    const h = harness(
      createEgressPolicy({ allowedHosts: ['api.wikidata.org', 'notes.example.com'] }),
      { ISABELLA_FABRIC_NOTESWRITER_TOKEN: 'token-vivo-no-debe-filtrarse' }
    );
    h.fabric.load(manifest());
    h.respond(() => jsonResponse({ jsonrpc: '2.0', id: 1, result: { status: 'saved' } }));

    const result = await h.capabilities.execute(
      'nexus.cap.fabric.noteswriter',
      { tool: 'put_note', arguments: { text: 'hola' } },
      context({ approvalGranted: true })
    );

    expect(result.ok).toBe(true);
    const headers = h.calls[0]?.init?.headers as Record<string, string>;
    expect(headers.authorization).toBe('Bearer token-vivo-no-debe-filtrarse');
    const serializedEvidence = JSON.stringify(h.ledger.list());
    expect(serializedEvidence).not.toContain('token-vivo-no-debe-filtrarse');
    expect(JSON.stringify(result.output)).not.toContain('token-vivo-no-debe-filtrarse');
  });

  it('sin el bearer del entorno la llamada no sale: FALLA CERRADO por credencial', async () => {
    const h = harness();
    h.fabric.load(manifest());
    const result = await h.capabilities.execute(
      'nexus.cap.fabric.noteswriter',
      { tool: 'put_note', arguments: { text: 'hola' } },
      context({ approvalGranted: true })
    );
    expect(result.ok).toBe(false);
    expect(JSON.stringify(result.output)).toContain('FABRIC_CREDENTIAL_MISSING');
    expect(h.calls).toEqual([]);
  });

  it('un agente A2 sigue en shadow y solo un portador humano lo ejecuta', async () => {
    const h = harness(
      createEgressPolicy({ allowedHosts: ['api.wikidata.org', 'notes.example.com'] }),
      { ISABELLA_FABRIC_NOTESWRITER_TOKEN: 'token-de-prueba' }
    );
    h.fabric.load(manifest());
    const decision = h.capabilities.evaluate('nexus.cap.fabric.noteswriter');
    expect(decision.status).toBe('shadow');

    const denied = await h.capabilities.execute(
      'nexus.cap.fabric.noteswriter',
      { tool: 'put_note', arguments: { text: 'hola' } },
      context({ approvalGranted: false })
    );
    expect(denied.code).toBe('CAPABILITY_NOT_APPROVED');
    expect(h.calls).toEqual([]);

    h.respond(() => jsonResponse({ jsonrpc: '2.0', id: 1, result: { status: 'saved' } }));
    const allowed = await h.capabilities.execute(
      'nexus.cap.fabric.noteswriter',
      { tool: 'put_note', arguments: { text: 'hola' } },
      context({ approvalGranted: true })
    );
    expect(allowed.ok).toBe(true);
    expect(allowed.humanAuthorizedShadow).toBe(true);
    expect(allowed.state).toBe('shadow');
  });

  it('la aprobación de un A0 no se pide: es lectura sin efecto externo declarado', async () => {
    const h = harness();
    h.fabric.load(manifest());
    const view = h.fabric.describe('wikidata');
    expect(view?.requiresApproval).toBe(false);
    expect(view?.hostAllowed).toBe(true);
    expect(view?.capabilityId).toBe('nexus.cap.fabric.wikidata');
  });

  it('un HTTP de error o un error JSON-RPC se reportan como fallo, no como éxito', async () => {
    const h = harness();
    h.fabric.load(manifest());
    h.respond(() => new Response('boom', { status: 503 }));
    const upstream = await h.capabilities.execute(
      'nexus.cap.fabric.wikidata',
      { tool: 'search_entities', arguments: { query: 'x' } },
      context()
    );
    expect(upstream.ok).toBe(false);
    expect(JSON.stringify(upstream.output)).toContain('FABRIC_UPSTREAM_STATUS');

    h.respond(() =>
      jsonResponse({ jsonrpc: '2.0', id: 1, error: { code: -32601, message: 'Method not found' } })
    );
    const rpc = await h.capabilities.execute(
      'nexus.cap.fabric.wikidata',
      { tool: 'search_entities', arguments: { query: 'x' } },
      context()
    );
    expect(rpc.ok).toBe(false);
    // El motor reporta su propio código de fallo de herramienta; el motivo del
    // upstream viaja en la salida, que es lo que se sella en la evidencia.
    expect(rpc.code).toBe('CAPABILITY_TOOL_FAILED');
    expect(JSON.stringify(rpc.output)).toContain('FABRIC_UPSTREAM_JSONRPC_ERROR');
  });

  it('respeta el techo de bytes de la carga sin tocar la red', async () => {
    const text = JSON.stringify({
      version: '1',
      agents: [
        {
          id: 'acotado',
          label: 'Agente acotado',
          endpoint: 'https://api.wikidata.org/mcp',
          protocol: 'mcp-http',
          toolAllowlist: ['search_entities'],
          risk: 'LOW',
          autonomy: 'A0',
          license: 'MIT',
          maxInputBytes: 512
        }
      ]
    });
    const h = harness();
    h.fabric.load(manifest(text));
    const result = await h.capabilities.execute(
      'nexus.cap.fabric.acotado',
      { tool: 'search_entities', arguments: { query: 'y'.repeat(2_000) } },
      context()
    );
    expect(result.ok).toBe(false);
    expect(h.calls).toEqual([]);
  });

  it('el descubrimiento alimenta la vista sin conceder permiso', async () => {
    const h = harness();
    h.fabric.load(manifest());
    h.respond(() =>
      jsonResponse({
        jsonrpc: '2.0',
        id: 1,
        result: { tools: [{ name: 'search_entities' }, { name: 'otra_herramienta' }] }
      })
    );

    const discovered = await h.capabilities.execute(
      'nexus.cap.fabric.wikidata',
      { method: 'tools/list' },
      context()
    );
    expect(discovered.ok).toBe(true);
    const view = h.fabric.describe('wikidata');
    expect(view?.discoveredTools).toEqual(['search_entities', 'otra_herramienta']);
    expect(view?.declaredTools).toEqual(['search_entities']);
    expect(view?.callable).toEqual(['search_entities']);
  });

  it('una tarjeta A2A se lee por GET y sus skills se listan', async () => {
    const text = JSON.stringify({
      version: '1',
      agents: [
        {
          id: 'agentecard',
          label: 'Tarjeta A2A',
          endpoint: 'https://api.wikidata.org/.well-known/agent-card.json',
          protocol: 'a2a-card',
          toolAllowlist: [],
          risk: 'LOW',
          autonomy: 'A0',
          license: 'CC0-1.0'
        }
      ]
    });
    const h = harness();
    h.fabric.load(manifest(text));
    h.respond(() => jsonResponse({ name: 'Agente', skills: [{ id: 'responder' }] }));

    const result = await h.capabilities.execute(
      'nexus.cap.fabric.agentecard',
      { method: 'tools/list' },
      context()
    );
    expect(result.ok).toBe(true);
    expect(h.calls[0]?.init.method).toBe('GET');
    expect(h.fabric.describe('agentecard')?.discoveredTools).toEqual(['responder']);

    const call = await h.capabilities.execute(
      'nexus.cap.fabric.agentecard',
      { tool: 'responder', arguments: {} },
      context()
    );
    expect(call.ok).toBe(false);
  });
});
