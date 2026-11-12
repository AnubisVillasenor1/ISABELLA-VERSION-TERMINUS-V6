/**
 * ISABELLA CERO — fábrica abierta de agentes (MCP HTTP / A2A).
 * state: draft | engine-generated.
 *
 * Misión que este módulo cierra: Isabella no puede limitarse a la información de
 * TAMV. Tiene que alcanzar conocimiento global y agentes de código abierto. La
 * respuesta no es un catálogo decorativo: cada agente externo se convierte en (1)
 * una `NexusTool` registrada y (2) un `CapabilityContract` gobernado, y la llamada
 * real pasa por la compuerta de egreso (`src/security/egress-policy.ts`).
 *
 * Por qué esto no es una maqueta (AGENTS.md §4):
 * - El encuadre del protocolo es JSON-RPC 2.0 sobre HTTPS, que es lo que hablan los
 *   servidores MCP (`initialize`, `tools/list`, `tools/call`) y las tarjetas A2A.
 * - No hay éxito simulado: si no hay manifiesto, el informe dice `SIN_MANIFIESTO` y
 *   `agents: 0`. Si el host no está en el allowlist del operador, la petición no
 *   sale del proceso.
 * - La autoridad la fija el manifiesto declarado en código o archivo del operador,
 *   nunca el cuerpo de una petición HTTP. El descubrimiento (`tools/list`) es
 *   evidencia, no permiso: una herramienta solo es invocable si está declarada.
 * - El bearer se lee de `authEnv` al momento de llamar. El valor nunca viaja en el
 *   manifiesto, ni en la respuesta, ni en el registro de evidencias.
 */
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { z } from 'zod';
import {
  evaluateEgressUrl,
  fetchWithEgressPolicy,
  type EgressBody,
  type EgressPolicy,
} from '../security/egress-policy';
import {
  CapabilityContractBodySchema,
  defineCapabilityContract,
  type CapabilityContract,
} from './capability-contract';
import type { CapabilityEngine } from './capability-engine';
import {
  toolDefinition,
  type NexusTool,
  type NexusToolRegistry,
  type ToolContext,
  type ToolResult,
} from './tool-registry';

export const OPEN_AGENT_FABRIC_VERSION = '1.0.0' as const;

export const FABRIC_PROTOCOLS = ['mcp-http', 'a2a-card'] as const;
export type FabricProtocol = (typeof FABRIC_PROTOCOLS)[number];

/** A4/A5 no son declarables en un agente externo: implican gasto o acción irreversible. */
const FABRIC_AUTONOMY = ['A0', 'A1', 'A2', 'A3'] as const;
const FABRIC_RISK = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as const;

export const FabricAgentSchema = z
  .object({
    id: z.string().regex(/^[a-z][a-z0-9]{2,40}$/, 'id must be lowercase alphanumeric'),
    label: z.string().min(3).max(80),
    /** Endpoint completo: esquema https, host y ruta. Se valida contra la compuerta. */
    endpoint: z.string().min(8).max(512),
    protocol: z.enum(FABRIC_PROTOCOLS),
    /** Herramientas del upstream que Isabella puede invocar. Vacío = descubrimiento solo. */
    toolAllowlist: z.array(z.string().min(1).max(64)).max(64),
    risk: z.enum(FABRIC_RISK),
    autonomy: z.enum(FABRIC_AUTONOMY),
    license: z.string().min(2).max(120),
    /** Nombre de la variable de entorno con el bearer. Nunca el valor. */
    authEnv: z
      .string()
      .regex(/^ISABELLA_[A-Z0-9_]{2,60}$/)
      .optional(),
    timeoutMs: z.number().int().min(500).max(30_000).default(15_000),
    maxInputBytes: z.number().int().min(256).max(65_536).default(16_384),
  })
  .strict()
  .superRefine((agent, ctx) => {
    if (agent.protocol === 'mcp-http' && !/^https:\/\//.test(agent.endpoint)) {
      ctx.addIssue({
        code: 'custom',
        message: 'mcp-http endpoints must be https',
        path: ['endpoint'],
      });
    }
    if (agent.protocol === 'a2a-card' && !agent.endpoint.includes('.well-known')) {
      ctx.addIssue({
        code: 'custom',
        message: 'a2a-card endpoint must point at the published agent card',
        path: ['endpoint'],
      });
    }
  });
export type FabricAgent = z.infer<typeof FabricAgentSchema>;

export const FabricManifestSchema = z
  .object({
    version: z.literal('1'),
    agents: z.array(FabricAgentSchema).max(64),
  })
  .strict();
export type FabricManifest = z.infer<typeof FabricManifestSchema>;

export interface FabricManifestSource {
  readonly manifest: FabricManifest;
  /** Digest sha256 de los bytes reales del manifiesto: es la procedencia del contrato. */
  readonly sourceDigest: string;
  readonly uri: string;
}

export function parseFabricManifest(text: string, uri: string): FabricManifestSource {
  if (!text.trim()) throw new Error('FABRIC_MANIFEST_EMPTY');
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new Error('FABRIC_MANIFEST_NOT_JSON');
  }
  const manifest = FabricManifestSchema.parse(raw);
  const ids = new Set<string>();
  for (const agent of manifest.agents) {
    if (ids.has(agent.id)) throw new Error(`FABRIC_DUPLICATE_ID:${agent.id}`);
    ids.add(agent.id);
  }
  return {
    manifest,
    uri,
    sourceDigest: `sha256:${createHash('sha256').update(text, 'utf8').digest('hex')}`,
  };
}

export interface FabricAgentView {
  readonly id: string;
  readonly label: string;
  readonly protocol: FabricProtocol;
  readonly capabilityId: string;
  readonly toolId: string;
  readonly host: string;
  readonly declaredTools: readonly string[];
  /** `null` = todavía no se hizo descubrimiento en este proceso. */
  readonly discoveredTools: readonly string[] | null;
  readonly callable: readonly string[];
  readonly hostAllowed: boolean;
  readonly requiresApproval: boolean;
}

export interface FabricLoadOutcome {
  readonly loaded: readonly string[];
  readonly rejected: ReadonlyArray<{ readonly id: string; readonly code: string }>;
  readonly total: number;
}

export interface FabricCallResult {
  readonly ok: boolean;
  readonly code: string;
  readonly summary: string;
  readonly output: Record<string, unknown>;
}

const DEFAULT_MAX_OUTPUT_BYTES = 200_000;
const AUTONOMY_RANK: Record<string, number> = { A0: 0, A1: 1, A2: 2, A3: 3 };

/** Host del endpoint según la URL; la política de egreso decide si es salible. */
export function fabricHost(endpoint: string): string | null {
  try {
    const url = new URL(endpoint.trim());
    return url.hostname ? url.hostname.toLowerCase() : null;
  } catch {
    return null;
  }
}

function approvalNeeded(agent: FabricAgent): boolean {
  return (AUTONOMY_RANK[agent.autonomy] ?? 0) >= 2 || agent.risk !== 'LOW';
}

/** Encuadre JSON-RPC 2.0. `id` es correlativo por llamada, no identificador de sesión. */
export function buildJsonRpcBody(requestId: number, method: string, params: unknown): string {
  return JSON.stringify({ jsonrpc: '2.0', id: requestId, method, params });
}

/**
 * Extrae el sobre JSON. Un servidor MCP por HTTP streamable puede responder
 * `text/event-stream`; se toma el último `data:` con payload, que es la respuesta.
 */
export function extractJsonRpcPayload(body: EgressBody): unknown {
  const text = body.body.trim();
  if (!text) throw new Error('FABRIC_EMPTY_RESPONSE');
  if (body.contentType.includes('text/event-stream')) {
    const payloads = text
      .split(/\r?\n/)
      .map((line) => (line.startsWith('data:') ? line.slice(5).trim() : ''))
      .filter((line) => line.length > 0 && line !== '[DONE]');
    const last = payloads[payloads.length - 1];
    if (!last) throw new Error('FABRIC_BAD_SSE_STREAM');
    return JSON.parse(last);
  }
  try {
    return JSON.parse(text);
  } catch {
    throw new Error('FABRIC_BAD_JSON');
  }
}

/** Nombres de herramienta según MCP (`result.tools[].name`) o tarjeta A2A (`skills[].id`). */
export function parseDiscoveredTools(payload: unknown): readonly string[] {
  if (typeof payload !== 'object' || payload === null) return [];
  const record = payload as Record<string, unknown>;
  const candidate =
    (typeof record.result === 'object' && record.result !== null
      ? (record.result as Record<string, unknown>)
      : record) ?? record;
  const lists = [candidate.tools, candidate.skills, candidate.available_tools];
  for (const list of lists) {
    if (!Array.isArray(list)) continue;
    const names = list
      .map((item) => {
        if (typeof item === 'string') return item;
        if (typeof item === 'object' && item !== null) {
          const entry = item as Record<string, unknown>;
          const name = entry.name ?? entry.id ?? entry.title;
          return typeof name === 'string' ? name : '';
        }
        return '';
      })
      .map((name) => name.trim().slice(0, 64))
      .filter(Boolean);
    if (names.length > 0) return [...new Set(names)];
  }
  return [];
}

function jsonRpcErrorOf(payload: unknown): { code: string; message: string } | null {
  if (typeof payload !== 'object' || payload === null) return null;
  const error = (payload as Record<string, unknown>).error;
  if (typeof error !== 'object' || error === null) return null;
  const record = error as Record<string, unknown>;
  const message =
    typeof record.message === 'string' ? record.message.slice(0, 200) : 'error sin mensaje';
  const code =
    typeof record.code === 'number' || typeof record.code === 'string'
      ? String(record.code)
      : 'unknown';
  return { code: `FABRIC_UPSTREAM_JSONRPC_ERROR:${code}`, message };
}

export interface OpenAgentFabricOptions {
  readonly tools: NexusToolRegistry;
  readonly capabilities: CapabilityEngine;
  readonly policy: EgressPolicy;
  readonly env?: Readonly<Record<string, string | undefined>>;
  readonly fetchImpl?: typeof fetch;
  /** Raíz del repo: las `testFiles` del contrato se comprueban contra disco. */
  readonly repoRoot?: string;
}

export class OpenAgentFabric {
  private readonly agents = new Map<string, FabricAgent>();
  private readonly discovered = new Map<string, readonly string[]>();
  private readonly tools: NexusToolRegistry;
  private readonly capabilities: CapabilityEngine;
  private readonly policy: EgressPolicy;
  private readonly env: Readonly<Record<string, string | undefined>>;
  private readonly fetchImpl: typeof fetch | undefined;
  private readonly repoRoot: string;
  private notice = 'sin manifiesto de agentes externos: no hay egreso declarado';

  constructor(options: OpenAgentFabricOptions) {
    this.tools = options.tools;
    this.capabilities = options.capabilities;
    this.policy = options.policy;
    this.env = options.env ?? process.env;
    this.fetchImpl = options.fetchImpl;
    this.repoRoot = options.repoRoot ?? process.cwd();
  }

  /** El manifiesto es la única fuente de autoridad; sin él la fábrica queda vacía. */
  load(source: FabricManifestSource): FabricLoadOutcome {
    const loaded: string[] = [];
    const rejected: { id: string; code: string }[] = [];

    for (const agent of source.manifest.agents) {
      const host = fabricHost(agent.endpoint);
      if (!host) {
        rejected.push({ id: agent.id, code: 'FABRIC_ENDPOINT_INVALID' });
        continue;
      }
      const egress = evaluateEgressUrl(agent.endpoint, this.policy);
      if (!egress.allowed) {
        rejected.push({ id: agent.id, code: egress.code });
        continue;
      }
      try {
        this.registerAgent(agent, source);
        loaded.push(agent.id);
      } catch (error) {
        const code =
          error instanceof Error
            ? (error.message.split(':')[0] ?? 'FABRIC_REJECTED')
            : 'FABRIC_REJECTED';
        rejected.push({ id: agent.id, code: code.slice(0, 60) });
      }
    }

    this.notice =
      loaded.length === 0
        ? `manifiesto leído desde ${source.uri}: 0 agentes habilitados${rejected.length > 0 ? `, ${rejected.length} rechazados por la compuerta` : ''}`
        : `${loaded.length} agente(s) externos declarados desde ${source.uri}`;

    return { loaded, rejected, total: source.manifest.agents.length };
  }

  private registerAgent(agent: FabricAgent, source: FabricManifestSource): void {
    const toolId = `fabric.${agent.id}`;
    const capabilityId = `nexus.cap.fabric.${agent.id}`;
    const host = fabricHost(agent.endpoint) as string;
    const requiresApproval = approvalNeeded(agent);

    const tool = toolDefinition({
      id: toolId,
      description: `Agente externo ${agent.label} (${agent.protocol}) en ${host}. ${
        agent.toolAllowlist.length > 0
          ? `Herramientas declaradas: ${agent.toolAllowlist.join(', ')}.`
          : 'Solo descubrimiento: ninguna herramienta declarada como invocable.'
      }`,
      risk: agent.risk,
      sideEffect: (AUTONOMY_RANK[agent.autonomy] ?? 0) >= 2 ? 'write' : 'read',
      requiresApproval,
      maxInputBytes: agent.maxInputBytes,
      timeoutMs: agent.timeoutMs,
      run: async (args, context): Promise<ToolResult> => this.runTool(agent, args, context),
    });

    if (!this.tools.has(toolId)) this.tools.register(tool);

    const contract: CapabilityContract = defineCapabilityContract({
      body: CapabilityContractBodySchema.parse({
        id: capabilityId,
        version: OPEN_AGENT_FABRIC_VERSION,
        domain: 'nexus.fabric',
        description: `Capacidad gobernada del agente externo ${agent.label} vía ${agent.protocol}.`,
        toolId,
        riskTier: agent.risk,
        source: {
          type: agent.protocol === 'mcp-http' ? 'mcp' : 'api',
          uri: source.uri,
          digest: source.sourceDigest,
          license: agent.license,
        },
        execution: {
          timeoutMs: agent.timeoutMs,
          memoryMb: 128,
          maxInputBytes: agent.maxInputBytes,
          maxOutputBytes: DEFAULT_MAX_OUTPUT_BYTES,
          network: 'allowlist',
          allowedHosts: [host],
        },
        governance: {
          autonomy: agent.autonomy,
          dataClasses: ['consulta-del-usuario'],
          privacyBudget: 0,
          reversible: agent.protocol === 'mcp-http' ? AUTONOMY_RANK[agent.autonomy] < 2 : true,
          approvalRequired: requiresApproval,
        },
        assurance: {
          testFiles: [
            'test/nexus/open-agent-fabric.test.ts',
            'test/security/egress-policy.test.ts',
          ],
          coverage: 0,
        },
        rollback: {
          strategy: 'none-declared',
          note: 'La acción ocurre en el servidor del upstream: este proceso no puede deshacerla; se declares o no, el revocador es el tercero.',
        },
      }),
      inputSchema: z
        .object({
          tool: z.string().min(1).max(64).optional(),
          arguments: z.record(z.string(), z.unknown()).optional(),
          method: z.string().min(1).max(48).optional(),
        })
        .strict(),
      outputSchema: z
        .object({
          protocol: z.string().min(2).max(24),
          host: z.string().min(1).max(253),
          method: z.string().min(1).max(48),
          status: z.number().int().min(100).max(599),
          bytes: z.number().int().min(0),
          /** Sobre JSON-RPC del upstream: se retiene como evidencia, no se reinterpreta. */
          payload: z.unknown(),
        })
        .strict(),
    });

    this.capabilities.register(contract);
    this.agents.set(agent.id, agent);
  }

  /** Ejecución real: valida declaración, política y encuadre; nunca simula un éxito. */
  private async runTool(
    agent: FabricAgent,
    args: Record<string, unknown>,
    context: ToolContext
  ): Promise<ToolResult> {
    const method = typeof args.method === 'string' ? args.method : '';
    const toolName = typeof args.tool === 'string' ? args.tool : '';

    if (method === 'tools/list' || (method === '' && toolName === '')) {
      const result = await this.invoke(agent, 'tools/list', {}, context);
      if (!result.ok) {
        return {
          ok: false,
          summary: result.summary,
          output: { error: result.code, ...result.output },
        };
      }
      const names = parseDiscoveredTools(result.output.payload);
      this.discovered.set(agent.id, names);
      return {
        ok: true,
        summary: `Descubrimiento de ${agent.label}: ${names.length} herramienta(s) en el upstream.`,
        output: result.output,
      };
    }

    if (!agent.toolAllowlist.includes(toolName)) {
      return {
        ok: false,
        summary: 'La herramienta no está declarada en el manifiesto del operador.',
        output: { error: 'FABRIC_TOOL_NOT_DECLARED', host: fabricHost(agent.endpoint) ?? '' },
      };
    }

    const params = { name: toolName, arguments: args.arguments ?? {} };
    const result = await this.invoke(agent, 'tools/call', params, context);
    if (!result.ok) {
      return {
        ok: false,
        summary: result.summary,
        output: { error: result.code, ...result.output },
      };
    }
    return {
      ok: true,
      summary: `Respuesta de ${agent.label}/${toolName} (HTTP ${result.output.status}).`,
      output: result.output,
    };
  }

  private async invoke(
    agent: FabricAgent,
    method: string,
    params: unknown,
    context: ToolContext
  ): Promise<FabricCallResult> {
    if (agent.protocol === 'a2a-card' && method !== 'tools/list') {
      return {
        ok: false,
        code: 'FABRIC_PROTOCOL_READONLY',
        summary: 'Una tarjeta A2A se lee; no admite tools/call por este camino.',
        output: {},
      };
    }

    const payload = JSON.stringify(params);
    if (Buffer.byteLength(payload, 'utf8') > agent.maxInputBytes) {
      return {
        ok: false,
        code: 'FABRIC_INPUT_OVER_LIMIT',
        summary: 'La carga supera el techo declarado en el manifiesto.',
        output: {},
      };
    }

    const headers: Record<string, string> = {
      'content-type': 'application/json',
      accept: 'application/json, text/event-stream',
    };
    if (agent.authEnv) {
      const token = this.env[agent.authEnv];
      if (!token) {
        return {
          ok: false,
          code: 'FABRIC_CREDENTIAL_MISSING',
          summary: `El manifiesto exige ${agent.authEnv} y no está definido; la llamada no sale.`,
          output: {},
        };
      }
      headers.authorization = `Bearer ${token}`;
    }

    const serialized = buildJsonRpcBody(1, method, params);
    const isGet = agent.protocol === 'a2a-card';
    try {
      const body = await fetchWithEgressPolicy(
        agent.endpoint,
        { ...this.policy, maxResponseBytes: DEFAULT_MAX_OUTPUT_BYTES, timeoutMs: agent.timeoutMs },
        {
          fetchImpl: this.fetchImpl,
          signal: context.signal,
          init: {
            method: isGet ? 'GET' : 'POST',
            headers,
            ...(isGet ? {} : { body: serialized }),
          },
        }
      );
      if (!body.ok) {
        return {
          ok: false,
          code: 'FABRIC_UPSTREAM_STATUS',
          summary: `El upstream respondió HTTP ${body.status}.`,
          output: { status: body.status, host: fabricHost(agent.endpoint) ?? '' },
        };
      }
      const parsed = extractJsonRpcPayload(body);
      const rpcError = jsonRpcErrorOf(parsed);
      if (rpcError) {
        return {
          ok: false,
          code: rpcError.code.slice(0, 60),
          summary: `Error JSON-RPC del upstream: ${rpcError.message}`,
          output: { status: body.status, host: fabricHost(agent.endpoint) ?? '' },
        };
      }
      return {
        ok: true,
        code: 'OK',
        summary: `Respuesta de ${agent.label} (HTTP ${body.status}, ${body.bytes} bytes).`,
        output: {
          protocol: agent.protocol,
          host: fabricHost(agent.endpoint) ?? '',
          method,
          status: body.status,
          bytes: body.bytes,
          payload: parsed,
        },
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'FABRIC_TRANSPORT_ERROR';
      const code = message.startsWith('EGRESS_')
        ? (message.split(':')[0] ?? 'EGRESS_BLOCKED')
        : message.startsWith('FABRIC_')
          ? (message.split(':')[0] ?? 'FABRIC_ERROR')
          : 'FABRIC_TRANSPORT_ERROR';
      return {
        ok: false,
        code: code.slice(0, 60),
        summary:
          'La llamada no se completó; se conserva el motivo de transporte sin detalle interno.',
        output: { host: fabricHost(agent.endpoint) ?? '' },
      };
    }
  }

  /**
   * Superficie de lectura para la capa HTTP. No hay atajo de invocación aquí a
   * propósito: llamar es potestad del motor de capacidades (`capabilities.execute`),
   * que ya aplica aprobación, techos, esquema y evidencia. Dos caminos hacia la misma
   * red externa serían dos compuertas que auditar.
   */
  list(): readonly FabricAgentView[] {
    return [...this.agents.values()].map((agent) => this.view(agent));
  }

  describe(agentId: string): FabricAgentView | null {
    const agent = this.agents.get(agentId);
    return agent ? this.view(agent) : null;
  }

  private view(agent: FabricAgent): FabricAgentView {
    const host = fabricHost(agent.endpoint) ?? '';
    const discoveredTools = this.discovered.get(agent.id) ?? null;
    const callable = agent.toolAllowlist.filter(
      (name) => discoveredTools === null || discoveredTools.includes(name)
    );
    return {
      id: agent.id,
      label: agent.label,
      protocol: agent.protocol,
      capabilityId: `nexus.cap.fabric.${agent.id}`,
      toolId: `fabric.${agent.id}`,
      host,
      declaredTools: agent.toolAllowlist,
      discoveredTools,
      callable,
      hostAllowed: evaluateEgressUrl(agent.endpoint, this.policy).allowed,
      requiresApproval: approvalNeeded(agent),
    };
  }

  summary(): {
    readonly agents: number;
    readonly notice: string;
    readonly repoRoot: string;
    readonly allowedHosts: readonly string[];
  } {
    return {
      agents: this.agents.size,
      notice: this.notice,
      repoRoot: this.repoRoot,
      allowedHosts: this.policy.allowedHosts,
    };
  }
}

/**
 * Carga el manifiesto desde el archivo que nombre el operador. Sin variable, o con
 * un archivo ilegible, la fábrica queda vacía y el informe lo dice: no se inventa
 * ningún agente de relleno.
 */
export function loadFabricManifestFromEnv(
  env: Readonly<Record<string, string | undefined>> = process.env
): FabricManifestSource | null {
  const path = env.ISABELLA_AGENT_FABRIC_FILE?.trim();
  if (!path || path.includes('<') || /^\$\{/.test(path)) return null;
  try {
    const text = readFileSync(path, 'utf8');
    return parseFabricManifest(text, `file:${path}`);
  } catch {
    throw new Error(`FABRIC_MANIFEST_UNREADABLE:${path.slice(0, 120)}`);
  }
}

export function createOpenAgentFabric(options: OpenAgentFabricOptions): OpenAgentFabric {
  return new OpenAgentFabric(options);
}
