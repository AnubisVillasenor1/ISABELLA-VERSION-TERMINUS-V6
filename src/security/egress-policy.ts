/**
 * ISABELLA CERO — compuerta de egreso (outbound network policy).
 * state: draft | engine-generated.
 *
 * El repo declaraba su propio hueco: `src/infinity/catalog.ts` anotaba «No
 * implementado: no hay fetcher con robots ni allowlist» y `src/agents/knowledge.ts`
 * describía el agente local como «sin red externa». Este módulo es la pieza que
 * faltaba para poder hablar con servicios externos sin abrir un SSRF: ninguna
 * llamada sale de aquí sin pasar por una política explícita.
 *
 * Reglas, todas fail-closed:
 * - `allowedHosts` vacío = no sale nada. No existe un modo «permitir todo».
 * - Solo `https` por defecto; `http` exige que el operador lo nombre.
 * - Prohibidas credenciales en el URL, puertos no declarados e IP literal privada,
 *   loopback, link-local (incluida la metadatos 169.254.169.254), multicast y reservada.
 * - Los redireccimientos se siguen a mano (`redirect: 'manual'`) y cada `Location`
 *   se revalida con la misma política; un 302 a una red privada se aborta.
 * - Techo de bytes leído antes y durante el cuerpo; si el upstream no declara
 *   `Content-Length` se cuenta el stream y se corta al pasar el techo.
 *
 * Límite declarado, no escondido: se valida la dirección literal del URL, no la
 * resolución DNS. Un host permitido que luego apunte a una red privada seguiría
 * saliendo. Por eso el allowlist lo define el operador en código o en env, nunca
 * desde el cuerpo de una petición: quien puede escribir el allowlist ya tiene
 * autoridad de red, y eso es exactamente lo que la invariante §1 quiere separar.
 */

const DEFAULT_TIMEOUT_MS = 10_000;
const DEFAULT_MAX_REDIRECTS = 3;
const DEFAULT_MAX_RESPONSE_BYTES = 262_144;
const DEFAULT_PORT = { https: 443, http: 80 } as const;

/** Etiquetas de dominio que nunca deben resolverse hacia infraestructura interna. */
const FORBIDDEN_TLDS = ['.local', '.internal', '.localhost', '.arpa', '.home', '.lan'];

export type EgressScheme = 'https' | 'http';

export interface EgressPolicy {
  /** Hosts permitidos: nombre exacto o `*.dominio` para subdominios. */
  readonly allowedHosts: readonly string[];
  readonly schemes: readonly EgressScheme[];
  /** Puertos aceptados por esquema. Vacío = solo el puerto por defecto del esquema. */
  readonly ports: readonly number[];
  readonly allowPrivateNetworks: boolean;
  readonly maxRedirects: number;
  readonly maxResponseBytes: number;
  readonly timeoutMs: number;
}

export type EgressDecision =
  | { readonly allowed: true; readonly url: URL; readonly host: string; readonly port: number }
  | { readonly allowed: false; readonly code: string; readonly reason: string };

export interface EgressPolicyInput extends Partial<Omit<EgressPolicy, 'schemes'>> {
  readonly schemes?: readonly string[];
}

function deny(code: string, reason: string): EgressDecision {
  return { allowed: false, code, reason };
}

function normalizeHost(value: string): string {
  return value.trim().toLowerCase().replace(/\.$/, '');
}

export function createEgressPolicy(input: EgressPolicyInput): EgressPolicy {
  const schemes = (input.schemes ?? ['https'])
    .map((scheme) => scheme.trim().toLowerCase())
    .filter((scheme): scheme is EgressScheme => scheme === 'https' || scheme === 'http');
  return {
    allowedHosts: [...new Set((input.allowedHosts ?? []).map(normalizeHost).filter(Boolean))],
    schemes: schemes.length > 0 ? schemes : ['https'],
    ports: [
      ...new Set(
        (input.ports ?? []).filter((port) => Number.isInteger(port) && port > 0 && port < 65_536)
      ),
    ],
    allowPrivateNetworks: input.allowPrivateNetworks === true,
    maxRedirects: clamp(input.maxRedirects, DEFAULT_MAX_REDIRECTS, 0, 10),
    maxResponseBytes: clamp(input.maxResponseBytes, DEFAULT_MAX_RESPONSE_BYTES, 1_024, 8_388_608),
    timeoutMs: clamp(input.timeoutMs, DEFAULT_TIMEOUT_MS, 100, 120_000),
  };
}

function clamp(value: number | undefined, fallback: number, min: number, max: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(min, Math.trunc(value)));
}

/**
 * `*.example.com` cubre UN solo nivel de subdominio, igual que un certificado TLS:
 * no acepta el ápice ni `a.b.example.com`. Se elige la lectura estricta porque un
 * allowlist más ancho que el dominio realmente controlado es superficie de SSRF.
 */
function hostMatches(pattern: string, host: string): boolean {
  if (pattern.startsWith('*.')) {
    const suffix = pattern.slice(1);
    if (!host.endsWith(suffix) || host.length <= suffix.length + 1) return false;
    return !host.slice(0, -suffix.length).includes('.');
  }
  return pattern === host;
}

function ipv4Groups(host: string): readonly number[] | null {
  const parts = host.split('.');
  if (parts.length !== 4) return null;
  const groups: number[] = [];
  for (const part of parts) {
    if (!/^\d{1,3}$/.test(part)) return null;
    const value = Number(part);
    if (value > 255) return null;
    groups.push(value);
  }
  return groups;
}

/**
 * Expande una IPv6 literal a sus 16 bytes. Se necesita expansión porque la URL
 * canónica reescribe `::ffff:127.0.0.1` como `::ffff:7f00:1`: comparar prefijos de
 * texto dejaría pasar una dirección mapeada hacia loopback.
 */
function parseIpv6Bytes(input: string): number[] | null {
  let addr = input.replace(/^\[|\]$/g, '').toLowerCase();
  const zone = addr.indexOf('%');
  if (zone >= 0) addr = addr.slice(0, zone);
  if (!addr.includes(':')) return null;

  const lastColon = addr.lastIndexOf(':');
  const tail = addr.slice(lastColon + 1);
  if (tail.includes('.')) {
    const v4 = ipv4Groups(tail);
    if (!v4) return null;
    const hi = (((v4[0] ?? 0) << 8) | (v4[1] ?? 0)).toString(16);
    const lo = (((v4[2] ?? 0) << 8) | (v4[3] ?? 0)).toString(16);
    addr = `${addr.slice(0, lastColon + 1)}${hi}:${lo}`;
  }

  const halves = addr.split('::');
  if (halves.length > 2) return null;
  const toGroups = (segment: string): number[] | null => {
    if (!segment) return [];
    const out: number[] = [];
    for (const item of segment.split(':')) {
      if (!/^[0-9a-f]{1,4}$/.test(item)) return null;
      out.push(parseInt(item, 16));
    }
    return out;
  };
  const head = toGroups(halves[0] ?? '');
  if (!head) return null;
  let groups: number[];
  if (halves.length === 1) {
    if (head.length !== 8) return null;
    groups = head;
  } else {
    const tailGroups = toGroups(halves[1] ?? '');
    if (!tailGroups) return null;
    const fill = 8 - head.length - tailGroups.length;
    if (fill < 0) return null;
    groups = [...head, ...new Array<number>(fill).fill(0), ...tailGroups];
  }
  const bytes: number[] = [];
  for (const group of groups) bytes.push((group >> 8) & 255, group & 255);
  return bytes.length === 16 ? bytes : null;
}

/** Etiqueta el rango IPv6 que debe bloquearse, o `null` si es enrutable. */
function ipv6BlockedClass(bytes: number[]): string | null {
  const allZero = (from: number, to: number): boolean =>
    bytes.slice(from, to).every((byte) => byte === 0);
  const first = bytes[0] ?? 0;
  if (allZero(0, 15) && bytes[15] === 1) return 'loopback';
  if (allZero(0, 16)) return 'unspecified';
  if ((first & 0xfe) === 0xfc) return 'unique-local';
  if (first === 0xfe && (bytes[1] ?? 0) >= 0x80 && (bytes[1] ?? 0) < 0xc0) return 'link-local';
  if (first === 0xff) return 'multicast';
  if (allZero(0, 10) && (bytes[10] ?? 0) === 0xff && (bytes[11] ?? 0) === 0xff) {
    const mapped = privateV4(bytes.slice(12, 16));
    return mapped.blocked ? `ipv4-mapeada-${mapped.label}` : null;
  }
  if (first === 0x20 && (bytes[1] ?? 0) === 0x02) {
    const embedded = privateV4(bytes.slice(2, 6));
    return embedded.blocked ? `6to4-${embedded.label}` : null;
  }
  return null;
}

export function classifyAddress(host: string): 'ipv4' | 'ipv6' | 'hostname' {
  if (ipv4Groups(host)) return 'ipv4';
  if (host.includes(':')) return 'ipv6';
  return 'hostname';
}

function privateV4(groups: readonly number[]): { blocked: boolean; label: string } {
  const [a = 0, b = 0] = groups;
  if (a === 0) return { blocked: true, label: 'this-network' };
  if (a === 10) return { blocked: true, label: 'private-a' };
  if (a === 127) return { blocked: true, label: 'loopback' };
  if (a === 169 && b === 254) return { blocked: true, label: 'link-local-incluida-metadata' };
  if (a === 172 && b >= 16 && b <= 31) return { blocked: true, label: 'private-b' };
  if (a === 192 && b === 168) return { blocked: true, label: 'private-c' };
  if (a === 192 && b === 0) return { blocked: true, label: 'test-net' };
  if (a === 198 && (b === 18 || b === 19)) return { blocked: true, label: 'benchmarking' };
  if (a === 203 && b === 113 && groups[2] === 113) return { blocked: true, label: 'iasa' };
  if (a >= 224) return { blocked: true, label: 'multicast-o-reservada' };
  if (a === 100 && b >= 64 && b <= 127) return { blocked: true, label: 'shared-address-space' };
  return { blocked: false, label: 'publica' };
}

function denyAddress(host: string, label: string): EgressDecision {
  return deny(
    'EGRESS_PRIVATE_ADDRESS_FORBIDDEN',
    `La dirección ${host} está en el rango ${label}; el egreso hacia infraestructura interna está cerrado.`
  );
}

/** Evalúa un URL candidato. No hace red: es una función pura y por eso se puede probar. */
export function evaluateEgressUrl(rawUrl: string, policy: EgressPolicy): EgressDecision {
  const trimmed = typeof rawUrl === 'string' ? rawUrl.trim() : '';
  if (!trimmed) return deny('EGRESS_URL_INVALID', 'El URL está vacío.');

  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    return deny('EGRESS_URL_INVALID', 'El URL no es parseable o es relativo.');
  }

  const scheme = url.protocol.replace(/:$/, '').toLowerCase();
  if (!(policy.schemes as readonly string[]).includes(scheme)) {
    return deny(
      'EGRESS_SCHEME_NOT_ALLOWED',
      `El esquema ${scheme || '(vacío)'} no está habilitado.`
    );
  }
  if (url.username || url.password) {
    return deny(
      'EGRESS_CREDENTIALS_FORBIDDEN',
      'Las credenciales van en cabeceras, nunca en el URL.'
    );
  }

  const host = normalizeHost(url.hostname);
  if (!host) return deny('EGRESS_URL_INVALID', 'El URL no tiene host.');

  const kind = classifyAddress(host);
  if (kind === 'hostname') {
    const dotted = host.endsWith('.') ? host.slice(0, -1) : host;
    if (!dotted.includes('.')) {
      return deny('EGRESS_HOST_NOT_ALLOWLISTED', `Host sin dominio calificado: ${dotted}.`);
    }
    if (FORBIDDEN_TLDS.some((suffix) => dotted.endsWith(suffix))) {
      return deny(
        'EGRESS_LOCAL_DOMAIN_FORBIDDEN',
        `Dominio de red interna no permitido: ${dotted}.`
      );
    }
  } else if (kind === 'ipv4') {
    const groups = ipv4Groups(host) as number[];
    const verdict = privateV4(groups);
    if (verdict.blocked && !policy.allowPrivateNetworks) return denyAddress(host, verdict.label);
  } else {
    const bytes = parseIpv6Bytes(host);
    if (!bytes) return deny('EGRESS_URL_INVALID', `Dirección IPv6 no parseable: ${host}.`);
    const blocked = ipv6BlockedClass(bytes);
    if (blocked && !policy.allowPrivateNetworks) return denyAddress(host, blocked);
  }

  if (!policy.allowedHosts.some((pattern) => hostMatches(pattern, host))) {
    return deny(
      'EGRESS_HOST_NOT_ALLOWLISTED',
      `El host ${host} no está en el allowlist del operador.`
    );
  }

  const declaredPort = url.port ? Number(url.port) : DEFAULT_PORT[scheme as EgressScheme];
  if (url.port && !policy.ports.includes(declaredPort)) {
    return deny(
      'EGRESS_PORT_NOT_ALLOWED',
      `Puerto ${declaredPort} no declarado: sin allowlist de puertos solo se acepta el puerto por defecto.`
    );
  }

  return { allowed: true, url, host, port: declaredPort };
}

/** Revalida una cabecera `Location` relativa al URL de origen. */
export function resolveRedirectLocation(
  currentUrl: string,
  location: string,
  policy: EgressPolicy
): EgressDecision {
  let absolute: string;
  try {
    absolute = new URL(location, currentUrl).toString();
  } catch {
    return deny('EGRESS_URL_INVALID', 'La cabecera Location no es un URL utilizable.');
  }
  return evaluateEgressUrl(absolute, policy);
}

export interface EgressBody {
  readonly status: number;
  readonly ok: boolean;
  readonly body: string;
  readonly bytes: number;
  readonly truncated: boolean;
  readonly contentType: string;
  readonly finalUrl: string;
}

export interface EgressFetchOptions {
  readonly init?: RequestInit;
  readonly signal?: AbortSignal;
  readonly fetchImpl?: typeof fetch;
}

type FetchLike = typeof fetch;

/**
 * GET gobernado: valida antes de salir, sigue redirecciones a mano y corta el
 * cuerpo en el techo de bytes. Un fallo de política es `EGRESS_*` y nunca toca la red.
 */
export async function fetchWithEgressPolicy(
  rawUrl: string,
  policy: EgressPolicy,
  options: EgressFetchOptions = {}
): Promise<EgressBody> {
  const fetchImpl: FetchLike | undefined = options.fetchImpl ?? globalThis.fetch;
  if (typeof fetchImpl !== 'function') {
    throw new Error('EGRESS_NO_FETCH_AVAILABLE');
  }

  let decision = evaluateEgressUrl(rawUrl, policy);
  let current = decision.allowed ? decision.url.toString() : rawUrl;
  let hops = 0;

  while (decision.allowed) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), policy.timeoutMs);
    const abortOuter = (): void => controller.abort();
    options.signal?.addEventListener('abort', abortOuter, { once: true });

    let response: Response;
    try {
      response = await fetchImpl(current, {
        ...options.init,
        redirect: 'manual',
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timer);
      options.signal?.removeEventListener('abort', abortOuter);
    }

    if (isRedirect(response.status)) {
      if (hops >= policy.maxRedirects) {
        throw new Error(`EGRESS_TOO_MANY_REDIRECTS: límite ${policy.maxRedirects}`);
      }
      const location = response.headers.get('location');
      if (!location) throw new Error('EGRESS_REDIRECT_WITHOUT_LOCATION');
      hops += 1;
      decision = resolveRedirectLocation(current, location, policy);
      if (!decision.allowed) throw new Error(`EGRESS_REDIRECT_BLOCKED: ${decision.code}`);
      current = decision.url.toString();
      continue;
    }

    const contentType = response.headers.get('content-type') ?? '';
    const declared = Number(response.headers.get('content-length') ?? '0');
    if (declared > policy.maxResponseBytes) {
      throw new Error(
        `EGRESS_RESPONSE_OVER_LIMIT: declarado ${declared} > ${policy.maxResponseBytes}`
      );
    }
    const text = await readCappedBody(response, policy.maxResponseBytes);
    return {
      status: response.status,
      ok: response.ok,
      body: text.value,
      bytes: text.bytes,
      truncated: text.truncated,
      contentType,
      finalUrl: current,
    };
  }

  throw new Error(`EGRESS_BLOCKED: ${decision.code}`);
}

function isRedirect(status: number): boolean {
  return status === 301 || status === 302 || status === 303 || status === 307 || status === 308;
}

async function readCappedBody(
  response: Response,
  maxBytes: number
): Promise<{ value: string; bytes: number; truncated: boolean }> {
  if (!response.body) {
    const value = await response.text();
    const bytes = new TextEncoder().encode(value).length;
    if (bytes > maxBytes)
      throw new Error(`EGRESS_RESPONSE_OVER_LIMIT: recibido ${bytes} > ${maxBytes}`);
    return { value, bytes, truncated: false };
  }
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    if (!value) continue;
    total += value.byteLength;
    if (total > maxBytes) {
      await reader.cancel().catch(() => undefined);
      throw new Error(`EGRESS_RESPONSE_OVER_LIMIT: recibido ${total} > ${maxBytes}`);
    }
    chunks.push(value);
  }
  const merged = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return { value: new TextDecoder().decode(merged), bytes: total, truncated: false };
}

/**
 * Lee el allowlist de hosts desde env. Sin variable, o con valor de plantilla, la
 * lista queda vacía y por lo tanto no sale ni una petición: fail-closed por diseño.
 */
export function egressPolicyFromEnv(
  env: Readonly<Record<string, string | undefined>> = process.env,
  overrides: EgressPolicyInput = {}
): EgressPolicy {
  const raw = env.ISABELLA_EGRESS_ALLOWED_HOSTS ?? '';
  const hosts = raw
    .split(/[,;\s]+/)
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0 && !entry.includes('<') && !/^\$\{/.test(entry));
  const ports = (env.ISABELLA_EGRESS_PORTS ?? '')
    .split(/[,;\s]+/)
    .map((entry) => Number(entry))
    .filter((entry) => Number.isInteger(entry));
  return createEgressPolicy({
    allowedHosts: hosts,
    ports: ports.length > 0 ? ports : overrides.ports,
    schemes: env.ISABELLA_EGRESS_SCHEMES
      ? env.ISABELLA_EGRESS_SCHEMES.split(/[,;\s]+/).filter(Boolean)
      : overrides.schemes,
    ...overrides,
  });
}
