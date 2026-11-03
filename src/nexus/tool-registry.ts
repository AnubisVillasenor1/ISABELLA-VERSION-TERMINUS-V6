/**
 * Nexus Tool Registry — catálogo de herramientas acotadas para el bucle de agente.
 * state: draft | engine-generated.
 *
 * Reglas:
 * - Una herramienta no registrada no se ejecuta.
 * - Cada ejecución tiene techo de tiempo y de tamaño de entrada.
 * - `requiresApproval` se decide en el registro, nunca desde el cuerpo HTTP.
 * - Un error de herramienta se devuelve saneado: sin stack ni detalle interno.
 */
import { createHash } from 'node:crypto';

export type ToolRisk = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type ToolSideEffect = 'read' | 'write';

export interface ToolContext {
  readonly requestId: string;
  readonly actorId: string;
  readonly tenantId: string;
  readonly approvalGranted: boolean;
  readonly signal: AbortSignal;
}

export interface ToolResult {
  ok: boolean;
  summary: string;
  output: Record<string, unknown>;
}

export interface NexusTool {
  readonly id: string;
  readonly description: string;
  readonly risk: ToolRisk;
  readonly sideEffect: ToolSideEffect;
  readonly requiresApproval: boolean;
  readonly maxInputBytes: number;
  readonly timeoutMs: number;
  run(args: Record<string, unknown>, context: ToolContext): Promise<ToolResult>;
}

export interface ToolDescriptor {
  readonly id: string;
  readonly description: string;
  readonly risk: ToolRisk;
  readonly sideEffect: ToolSideEffect;
  readonly requiresApproval: boolean;
}

const DEFAULT_TIMEOUT_MS = 2_000;
const DEFAULT_MAX_INPUT_BYTES = 16_384;
const MAX_TOOLS = 64;

export class NexusToolRegistry {
  private readonly tools = new Map<string, NexusTool>();

  register(tool: NexusTool): void {
    if (!/^[a-z][a-z0-9.]{2,63}$/.test(tool.id)) {
      throw new Error('TOOL_ID_INVALID');
    }
    if (this.tools.size >= MAX_TOOLS && !this.tools.has(tool.id)) {
      throw new Error('TOOL_CAPACITY_EXCEEDED');
    }
    if (this.tools.has(tool.id)) throw new Error('TOOL_ALREADY_REGISTERED');
    this.tools.set(tool.id, Object.freeze({ ...tool }));
  }

  has(id: string): boolean {
    return this.tools.has(id);
  }

  get(id: string): NexusTool | null {
    return this.tools.get(id) ?? null;
  }

  list(): readonly ToolDescriptor[] {
    return [...this.tools.values()].map((tool) => ({
      id: tool.id,
      description: tool.description,
      risk: tool.risk,
      sideEffect: tool.sideEffect,
      requiresApproval: tool.requiresApproval,
    }));
  }

  async execute(
    id: string,
    args: Record<string, unknown>,
    context: ToolContext
  ): Promise<ToolResult> {
    const tool = this.tools.get(id);
    if (!tool) {
      return {
        ok: false,
        summary: 'Herramienta no registrada.',
        output: { error: 'TOOL_NOT_FOUND' },
      };
    }
    if (tool.requiresApproval && !context.approvalGranted) {
      return {
        ok: false,
        summary: 'Requiere aprobación humana verificada por el servidor.',
        output: { error: 'TOOL_APPROVAL_REQUIRED' },
      };
    }
    let serialized: string;
    try {
      serialized = JSON.stringify(args);
    } catch {
      serialized = '';
    }
    if (!serialized || Buffer.byteLength(serialized, 'utf8') > tool.maxInputBytes) {
      return {
        ok: false,
        summary: 'La entrada de la herramienta excede el límite o no es serializable.',
        output: { error: 'TOOL_INPUT_INVALID' },
      };
    }
    if (context.signal.aborted) {
      return { ok: false, summary: 'Ejecución cancelada.', output: { error: 'TOOL_ABORTED' } };
    }
    try {
      return await withTimeout(tool.timeoutMs, context.signal, () => tool.run(args, context));
    } catch {
      return {
        ok: false,
        summary: 'La herramienta falló sin exponer detalles internos.',
        output: { error: 'TOOL_ERROR' },
      };
    }
  }
}

function withTimeout(
  ms: number,
  signal: AbortSignal,
  work: () => Promise<ToolResult>
): Promise<ToolResult> {
  return new Promise<ToolResult>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('TOOL_TIMEOUT')), ms);
    const onAbort = (): void => {
      clearTimeout(timer);
      reject(new Error('TOOL_ABORTED'));
    };
    signal.addEventListener('abort', onAbort, { once: true });
    work().then(
      (value) => {
        clearTimeout(timer);
        signal.removeEventListener('abort', onAbort);
        resolve(value);
      },
      (error: unknown) => {
        clearTimeout(timer);
        signal.removeEventListener('abort', onAbort);
        reject(error);
      }
    );
  });
}

export function toolDefinition(
  definition: Omit<NexusTool, 'maxInputBytes' | 'timeoutMs'> &
    Partial<Pick<NexusTool, 'maxInputBytes' | 'timeoutMs'>>
): NexusTool {
  return {
    ...definition,
    maxInputBytes: definition.maxInputBytes ?? DEFAULT_MAX_INPUT_BYTES,
    timeoutMs: definition.timeoutMs ?? DEFAULT_TIMEOUT_MS,
  };
}

export function hashToolCall(toolId: string, args: Record<string, unknown>): string {
  let serialized = '';
  try {
    serialized = JSON.stringify(args);
  } catch {
    serialized = 'unserializable';
  }
  return createHash('sha256').update(`${toolId}:${serialized}`).digest('hex').slice(0, 32);
}

export function createToolRegistry(): NexusToolRegistry {
  return new NexusToolRegistry();
}
