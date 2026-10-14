/**
 * Endurecimiento HTTP puro y testeable (state: draft | engine-generated).
 *
 * - securityHeadersFor: cabeceras defensivas por ruta (HSTS en producción, CSP estricta para la API JSON).
 * - classifyHttpError: errores de Express → respuesta JSON segura (sin stack ni detalles internos).
 * - AuthFailureThrottle: freno de fuerza bruta sobre tokens de administración (bloquea ANTES de comparar).
 * - parseTrustProxy: valor seguro para `trust proxy` (saltos numéricos; nunca `true` por accidente).
 */

export interface HeaderSet {
  readonly [name: string]: string;
}

export function isApiPath(path: string): boolean {
  return path === "/api" || path.startsWith("/api/");
}

export function securityHeadersFor(path: string, env: { NODE_ENV?: string | undefined }): HeaderSet {
  const headers: Record<string, string> = {
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Permissions-Policy": "camera=(), microphone=(self)",
    "Cross-Origin-Opener-Policy": "same-origin",
  };
  if (env.NODE_ENV === "production") headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains";
  if (isApiPath(path)) {
    // La API solo devuelve JSON: ningún recurso activo debe poder cargarse desde una respuesta de API.
    headers["Content-Security-Policy"] = "default-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'";
    headers["Cache-Control"] = "no-store";
  }
  return headers;
}

export interface SafeHttpError {
  readonly status: number;
  readonly body: { readonly success: false; readonly error: string };
}

export function classifyHttpError(error: unknown): SafeHttpError {
  const e = error as { type?: unknown; status?: unknown; statusCode?: unknown } | null;
  const type = e !== null && typeof e === "object" ? e.type : undefined;
  if (type === "entity.parse.failed") return { status: 400, body: { success: false, error: "INVALID_JSON" } };
  if (type === "entity.too.large") return { status: 413, body: { success: false, error: "PAYLOAD_TOO_LARGE" } };
  if (type === "encoding.unsupported" || type === "charset.unsupported") return { status: 415, body: { success: false, error: "UNSUPPORTED_ENCODING" } };
  const raw = e !== null && typeof e === "object" ? (typeof e.status === "number" ? e.status : e.statusCode) : undefined;
  if (typeof raw === "number" && Number.isInteger(raw) && raw >= 400 && raw < 500) return { status: raw, body: { success: false, error: "BAD_REQUEST" } };
  return { status: 500, body: { success: false, error: "INTERNAL_ERROR" } };
}

/** Acepta solo un entero 0..10 (saltos de proxy de confianza). Cualquier otra cosa → false (no confiar en XFF). */
export function parseTrustProxy(value: string | undefined): number | false {
  if (value === undefined) return false;
  const trimmed = value.trim();
  if (!/^\d{1,2}$/.test(trimmed)) return false;
  const hops = Number(trimmed);
  return hops >= 1 && hops <= 10 ? hops : false;
}

interface FailureState {
  count: number;
  windowStart: number;
  blockedUntil: number;
}

export class AuthFailureThrottle {
  private readonly states = new Map<string, FailureState>();

  constructor(
    private readonly maxFailures = 10,
    private readonly windowMs = 5 * 60_000,
    private readonly blockMs = 5 * 60_000,
    private readonly maxKeys = 10_000,
  ) {
    if (!Number.isInteger(maxFailures) || maxFailures < 1) throw new RangeError("THROTTLE_MAX_FAILURES_INVALID");
    if (windowMs < 1 || blockMs < 1) throw new RangeError("THROTTLE_WINDOW_INVALID");
  }

  get size(): number {
    return this.states.size;
  }

  /** ms restantes de bloqueo (0 si no está bloqueado). */
  blockedFor(key: string, now = Date.now()): number {
    const s = this.states.get(key);
    return s !== undefined && s.blockedUntil > now ? s.blockedUntil - now : 0;
  }

  recordFailure(key: string, now = Date.now()): void {
    let s = this.states.get(key);
    if (s === undefined || now - s.windowStart >= this.windowMs) {
      s = { count: 0, windowStart: now, blockedUntil: 0 };
      this.states.set(key, s);
    }
    s.count += 1;
    if (s.count >= this.maxFailures) s.blockedUntil = now + this.blockMs;
    if (this.states.size > this.maxKeys) this.evict(now);
  }

  recordSuccess(key: string): void {
    this.states.delete(key);
  }

  private evict(now: number): void {
    for (const [k, s] of this.states) {
      if (s.blockedUntil <= now && now - s.windowStart >= this.windowMs) this.states.delete(k);
      if (this.states.size <= this.maxKeys) return;
    }
    // Presión máxima: descarta los más antiguos que NO estén bloqueados para no liberar atacantes ya frenados.
    for (const [k, s] of this.states) {
      if (this.states.size <= this.maxKeys) return;
      if (s.blockedUntil <= now) this.states.delete(k);
    }
    // Último recurso (todas las claves bloqueadas): descarta las más antiguas; la memoria nunca crece sin cota.
    for (const k of this.states.keys()) {
      if (this.states.size <= this.maxKeys) return;
      this.states.delete(k);
    }
  }
}
