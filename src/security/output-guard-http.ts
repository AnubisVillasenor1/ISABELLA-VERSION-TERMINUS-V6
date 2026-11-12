/**
 * Compuerta de salida para las superficies HTTP donde Isabella entrega texto que no
 * escribió un humano: agentes locales, el bucle NEXUS, MCP, ejecución de herramientas y
 * los endpoints de chat compatibles con OpenAI.
 *
 * El PDP de salida canónico (`evaluateOutputSecurity`, ISA-140/175) ya existía y era
 * fail-closed, pero sólo tenía importadores bajo `src/lib/lib`, y ninguna ruta HTTP lo
 * consultaba: un agente que reprodujera una credencial en su respuesta la entregaba igual.
 * Este módulo es el único puente entre ese PDP y el transporte.
 *
 * Decisiones deliberadas:
 * - Se aplica por prefijo de ruta, no globalmente: las rutas de diagnóstico y de
 *   configuración (`/api/v1/readyz`, `/api/v1/runtime/capabilities`) deben poder nombrar
 *   variables y patrones sin que el escáner crea que son filtraciones.
 * - El payload denegado nunca se reenvía ni se serializa en el error: se devuelven códigos
 *   y el tamaño en bytes, que es lo que necesita auditoría para priorizar.
 * - Cualquier excepción dentro del escáner es una denegación. Un verificador que no pudo
 *   verificar no es un verificador que aprobó.
 * - Cubre `res.json`. Las respuestas en streaming (`res.write`/SSE) quedan fuera y se
 *   declaran como tales: envolver el stream sin reencuadrar los deltas produciría
 *   JSON roto, no seguridad.
 */
import type { NextFunction, Request, Response } from 'express';
import { scanOutput } from '../lib/lib/security/output-gate';

/** Prefijos cuyas respuestas son generadas por modelos, agentes o herramientas. */
export const GUARDED_OUTPUT_PREFIXES: readonly string[] = [
  '/api/v1/agents',
  '/api/v1/nexus',
  '/api/v1/mcp',
  '/api/mcp',
  '/api/v1/tools',
  '/api/v1/hypercore/skills',
  '/api/isabella/chat',
  '/v1/chat/completions',
  '/llama/v1/chat/completions',
];

export interface OutputGuardOutcome {
  readonly allowed: boolean;
  readonly reasons: readonly string[];
}

export function isGuardedOutputPath(url: string): boolean {
  const path = url.split('?')[0] ?? url;
  return GUARDED_OUTPUT_PREFIXES.some(
    (prefix) => path === prefix || path.startsWith(`${prefix}/`) || path.startsWith(`${prefix}?`)
  );
}

/**
 * Escanea la serialización completa de la respuesta. Fallar abierto está prohibido: si el
 * escáner lanza, el resultado es una denegación con el código de error interno.
 */
export function guardSerializedOutput(serialized: string): OutputGuardOutcome {
  try {
    const result = scanOutput(serialized, 'http-response');
    return result.allowed
      ? { allowed: true, reasons: [] }
      : {
          allowed: false,
          reasons: result.reasons.length > 0 ? result.reasons : ['OUTPUT_GATE_DENY'],
        };
  } catch {
    return { allowed: false, reasons: ['OUTPUT_GUARD_EVALUATION_FAILED'] };
  }
}

export interface BlockedOutputBody {
  readonly success: false;
  readonly error: 'OUTPUT_GUARD_BLOCKED';
  readonly code: 'OG-DENY';
  readonly reasons: readonly string[];
  readonly withheldBytes: number;
  readonly message: string;
}

export function buildBlockedOutputBody(
  reasons: readonly string[],
  withheldBytes: number
): BlockedOutputBody {
  return {
    success: false,
    error: 'OUTPUT_GUARD_BLOCKED',
    code: 'OG-DENY',
    reasons,
    withheldBytes,
    message:
      'La respuesta fue retenida por el gate de seguridad de salida de Isabella. El contenido no se transmite ni se registra.',
  };
}

export function createOutputGuardMiddleware(): (
  req: Request,
  res: Response,
  next: NextFunction
) => void {
  return function outputGuard(req: Request, res: Response, next: NextFunction): void {
    if (!isGuardedOutputPath(req.originalUrl)) {
      next();
      return;
    }
    const original = res.json.bind(res) as (body?: unknown) => Response;
    res.json = ((body?: unknown): Response => {
      let serialized: string;
      try {
        serialized = JSON.stringify(body ?? null) ?? '';
      } catch {
        // Un cuerpo no serializable tampoco puede afirmarse seguro.
        res.status(403);
        return original(buildBlockedOutputBody(['OUTPUT_BODY_NOT_SERIALIZABLE'], 0));
      }
      const outcome = guardSerializedOutput(serialized);
      if (outcome.allowed) return original(body);
      res.status(403);
      return original(buildBlockedOutputBody(outcome.reasons, serialized.length));
    }) as typeof res.json;
    next();
  };
}
