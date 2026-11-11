/**
 * Pruebas de la compuerta de egreso. Ninguna toca la red: `evaluateEgressUrl` es pura
 * y el transporte de `fetchWithEgressPolicy` se inyecta, así que lo que se verifica
 * aquí es la decisión de política y el encuadre de redirecciones/tamaño.
 */
import { describe, expect, it } from 'vitest';
import {
  createEgressPolicy,
  evaluateEgressUrl,
  egressPolicyFromEnv,
  fetchWithEgressPolicy,
  resolveRedirectLocation,
  type EgressPolicy
} from '../../src/security/egress-policy';

const POLICY: EgressPolicy = createEgressPolicy({ allowedHosts: ['api.example.com', '*.tools.example.org'] });

function denied(url: string, policy: EgressPolicy = POLICY): string {
  const decision = evaluateEgressUrl(url, policy);
  expect(decision.allowed).toBe(false);
  if (decision.allowed) throw new Error('no debió permitir');
  return decision.code;
}

describe('egress policy — fail-closed por defecto', () => {
  it('no permite ningún host cuando el allowlist está vacío', () => {
    const open = createEgressPolicy({ allowedHosts: [] });
    expect(denied('https://api.example.com/v1', open)).toBe('EGRESS_HOST_NOT_ALLOWLISTED');
  });

  it('rechaza un URL vacío o relativo', () => {
    expect(denied('')).toBe('EGRESS_URL_INVALID');
    expect(denied('/just/a/path')).toBe('EGRESS_URL_INVALID');
    expect(denied('   ')).toBe('EGRESS_URL_INVALID');
  });

  it('rechaza esquemas que no sean https sin declararlos', () => {
    expect(denied('http://api.example.com/v1')).toBe('EGRESS_SCHEME_NOT_ALLOWED');
    expect(denied('file:///etc/passwd')).toBe('EGRESS_SCHEME_NOT_ALLOWED');
    expect(denied('gopher://api.example.com')).toBe('EGRESS_SCHEME_NOT_ALLOWED');
  });

  it('permite http solo si el operador lo habilita', () => {
    const withHttp = createEgressPolicy({ allowedHosts: ['api.example.com'], schemes: ['https', 'http'] });
    expect(evaluateEgressUrl('http://api.example.com/v1', withHttp).allowed).toBe(true);
  });

  it('prohíbe credenciales embebidas en el URL', () => {
    expect(denied('https://user:pass@api.example.com/v1')).toBe('EGRESS_CREDENTIALS_FORBIDDEN');
  });
});

describe('egress policy — allowlist de hosts', () => {
  it('acepta un host exacto declarado', () => {
    const decision = evaluateEgressUrl('https://api.example.com/v1/tools', POLICY);
    expect(decision.allowed).toBe(true);
    if (decision.allowed) {
      expect(decision.host).toBe('api.example.com');
      expect(decision.port).toBe(443);
    }
  });

  it('el comodín cubre un nivel, no el ápice ni un sufijo falso', () => {
    expect(evaluateEgressUrl('https://brave.tools.example.org/mcp', POLICY).allowed).toBe(true);
    expect(denied('https://tools.example.org/mcp', POLICY)).toBe('EGRESS_HOST_NOT_ALLOWLISTED');
    expect(denied('https://evil-tools.example.org/mcp', POLICY)).toBe('EGRESS_HOST_NOT_ALLOWLISTED');
    expect(denied('https://a.b.tools.example.org/mcp', POLICY)).toBe('EGRESS_HOST_NOT_ALLOWLISTED');
  });

  it('rechaza host sin dominio calificado y dominios de red interna', () => {
    const wide = createEgressPolicy({
      allowedHosts: ['intranet', 'router.local', '*.internal', 'localhost']
    });
    expect(denied('https://intranet/status', wide)).toBe('EGRESS_HOST_NOT_ALLOWLISTED');
    expect(denied('https://router.local/status', wide)).toBe('EGRESS_LOCAL_DOMAIN_FORBIDDEN');
    expect(denied('https://svc.internal/x', wide)).toBe('EGRESS_LOCAL_DOMAIN_FORBIDDEN');
    expect(denied('https://localhost:8080/x', wide)).toBe('EGRESS_HOST_NOT_ALLOWLISTED');
  });

  it('normaliza mayúsculas y punto final', () => {
    expect(evaluateEgressUrl('https://API.Example.COM./v1', POLICY).allowed).toBe(true);
  });
});

describe('egress policy — direcciones literales', () => {
  const withIps = createEgressPolicy({
    allowedHosts: ['10.0.0.1', '127.0.0.1', '169.254.169.254', '8.8.8.8', '172.16.0.9', '[::1]', '[::ffff:8.8.8.8]']
  });

  it('bloquea privada, loopback, link-local y rango de metadatos aunque estén en el allowlist', () => {
    expect(denied('https://10.0.0.1/x', withIps)).toBe('EGRESS_PRIVATE_ADDRESS_FORBIDDEN');
    expect(denied('https://127.0.0.1/x', withIps)).toBe('EGRESS_PRIVATE_ADDRESS_FORBIDDEN');
    expect(denied('https://169.254.169.254/latest/meta-data', withIps)).toBe(
      'EGRESS_PRIVATE_ADDRESS_FORBIDDEN'
    );
    expect(denied('https://172.16.0.9/x', withIps)).toBe('EGRESS_PRIVATE_ADDRESS_FORBIDDEN');
    expect(denied('https://[::1]/x', withIps)).toBe('EGRESS_PRIVATE_ADDRESS_FORBIDDEN');
    expect(denied('https://[fd00::1]/x', withIps)).toBe('EGRESS_PRIVATE_ADDRESS_FORBIDDEN');
  });

  it('bloquea una IPv4 mapeada en IPv6 hacia loopback', () => {
    expect(denied('https://[::ffff:127.0.0.1]/x', withIps)).toBe('EGRESS_PRIVATE_ADDRESS_FORBIDDEN');
  });

  it('bloquea la forma canónica que produce WHATWG para una mapeada', () => {
    // `new URL()` reescribe ::ffff:127.0.0.1 como ::ffff:7f00:1; la política debe
    // seguir viendo el loopback aunque el texto ya no tenga puntos.
    const canonical = new URL('https://[::ffff:127.0.0.1]/x').hostname;
    expect(canonical).toBe('[::ffff:7f00:1]');
    expect(denied(`https://${canonical}/x`, withIps)).toBe('EGRESS_PRIVATE_ADDRESS_FORBIDDEN');
  });

  it('bloquea multicast y una 6to4 que esconde un loopback', () => {
    const wide = createEgressPolicy({
      allowedHosts: ['[ff02::1]', '[2002:7f00:1::]', '[2001:db8::1]']
    });
    expect(denied('https://[ff02::1]/x', wide)).toBe('EGRESS_PRIVATE_ADDRESS_FORBIDDEN');
    expect(denied('https://[2002:7f00:1::]/x', wide)).toBe('EGRESS_PRIVATE_ADDRESS_FORBIDDEN');
  });

  it('rechaza una IPv6 que no es parseable en vez de dejarla pasar', () => {
    const wide = createEgressPolicy({ allowedHosts: ['[gg00::1]', '[12345]'] });
    expect(denied('https://[gg00::zzzz]/x', wide)).toBe('EGRESS_URL_INVALID');
  });

  it('deja pasar una IPv6 pública enrutable', () => {
    const wide = createEgressPolicy({ allowedHosts: ['[2001:4860:4860::8888]'] });
    expect(evaluateEgressUrl('https://[2001:4860:4860::8888]/x', wide).allowed).toBe(true);
  });

  it('permite una dirección pública declarada', () => {
    expect(evaluateEgressUrl('https://8.8.8.8/x', withIps).allowed).toBe(true);
  });

  it('con allowPrivateNetworks explícito deja pasar la red privada (modo laboratorio)', () => {
    const lab = createEgressPolicy({
      allowedHosts: ['127.0.0.1', '169.254.169.254'],
      schemes: ['https', 'http'],
      allowPrivateNetworks: true
    });
    expect(evaluateEgressUrl('http://127.0.0.1/x', lab).allowed).toBe(true);
  });
});

describe('egress policy — puertos', () => {
  it('rechaza puerto no estándar sin allowlist de puertos', () => {
    expect(denied('https://api.example.com:8443/v1')).toBe('EGRESS_PORT_NOT_ALLOWED');
  });

  it('acepta un puerto declarado explícitamente', () => {
    const withPort = createEgressPolicy({ allowedHosts: ['api.example.com'], ports: [8443] });
    const decision = evaluateEgressUrl('https://api.example.com:8443/v1', withPort);
    expect(decision.allowed).toBe(true);
    if (decision.allowed) expect(decision.port).toBe(8443);
  });
});

describe('egress policy — redirecciones', () => {
  it('revalida la Location contra la misma política', () => {
    expect(
      resolveRedirectLocation('https://api.example.com/a', '/b', POLICY).allowed
    ).toBe(true);
    expect(
      resolveRedirectLocation('https://api.example.com/a', 'https://169.254.169.254/latest', POLICY)
    ).toMatchObject({ allowed: false, code: 'EGRESS_PRIVATE_ADDRESS_FORBIDDEN' });
    expect(
      resolveRedirectLocation('https://api.example.com/a', 'https://evil.test/x', POLICY)
    ).toMatchObject({ allowed: false, code: 'EGRESS_HOST_NOT_ALLOWLISTED' });
  });
});

function jsonResponse(body: unknown, headers: Record<string, string> = {}): Response {
  return new Response(typeof body === 'string' ? body : JSON.stringify(body), {
    status: 200,
    headers: { 'content-type': 'application/json', ...headers }
  });
}

describe('fetchWithEgressPolicy — encuadre de transporte', () => {
  it('no llama a fetch cuando la política rechaza el URL', async () => {
    let called = 0;
    const fetchImpl = (async () => {
      called += 1;
      return jsonResponse({});
    }) as unknown as typeof fetch;
    await expect(
      fetchWithEgressPolicy('https://169.254.169.254/l', POLICY, { fetchImpl })
    ).rejects.toThrow(/EGRESS_PRIVATE_ADDRESS_FORBIDDEN|EGRESS_BLOCKED/);
    expect(called).toBe(0);
  });

  it('obedece los redireccimientos hasta el techo y revalida cada salto', async () => {
    const seen: string[] = [];
    const fetchImpl = (async (input: string | URL) => {
      const url = String(input);
      seen.push(url);
      if (url.endsWith('/start')) {
        return new Response(null, { status: 302, headers: { location: 'https://api.example.com/next' } });
      }
      if (url.endsWith('/next')) {
        return new Response(null, { status: 302, headers: { location: 'https://evil.test/steal' } });
      }
      return jsonResponse({ ok: true });
    }) as unknown as typeof fetch;

    await expect(
      fetchWithEgressPolicy('https://api.example.com/start', POLICY, { fetchImpl })
    ).rejects.toThrow(/EGRESS_REDIRECT_BLOCKED: EGRESS_HOST_NOT_ALLOWLISTED/);
    expect(seen).toEqual(['https://api.example.com/start', 'https://api.example.com/next']);
  });

  it('aborta en bucle infinito de redirecciones por el techo de saltos', async () => {
    const fetchImpl = (async () =>
      new Response(null, { status: 307, headers: { location: 'https://api.example.com/loop' } })) as unknown as typeof fetch;
    await expect(
      fetchWithEgressPolicy('https://api.example.com/loop', POLICY, { fetchImpl })
    ).rejects.toThrow(/EGRESS_TOO_MANY_REDIRECTS/);
  });

  it('rechaza un cuerpo que excede el techo declarado por Content-Length', async () => {
    const fetchImpl = (async () =>
      jsonResponse('x'.repeat(5_000), { 'content-length': '5000' })) as unknown as typeof fetch;
    const tiny = createEgressPolicy({ allowedHosts: ['api.example.com'], maxResponseBytes: 2_048 });
    await expect(fetchWithEgressPolicy('https://api.example.com/big', tiny, { fetchImpl })).rejects.toThrow(
      /EGRESS_RESPONSE_OVER_LIMIT/
    );
  });

  it('corta un stream sin Content-Length al pasar el techo', async () => {
    const stream = new ReadableStream({
      start(controller) {
        for (let index = 0; index < 400; index += 1) {
          controller.enqueue(new TextEncoder().encode('abcdefghijklmnop'));
        }
        controller.close();
      }
    });
    const response = new Response(stream, { status: 200 });
    const fetchImpl = (async () => response) as unknown as typeof fetch;
    const tiny = createEgressPolicy({ allowedHosts: ['api.example.com'], maxResponseBytes: 2_048 });
    await expect(fetchWithEgressPolicy('https://api.example.com/stream', tiny, { fetchImpl })).rejects.toThrow(
      /EGRESS_RESPONSE_OVER_LIMIT/
    );
  });

  it('devuelve cuerpo, bytes y URL final en el camino feliz', async () => {
    const fetchImpl = (async () =>
      jsonResponse({ result: 'hola' })) as unknown as typeof fetch;
    const out = await fetchWithEgressPolicy('https://api.example.com/v1', POLICY, { fetchImpl });
    expect(out.ok).toBe(true);
    expect(out.status).toBe(200);
    expect(JSON.parse(out.body)).toEqual({ result: 'hola' });
    expect(out.finalUrl).toBe('https://api.example.com/v1');
    expect(out.bytes).toBeGreaterThan(0);
  });
});

describe('egressPolicyFromEnv — lectura del operador', () => {
  it('sin variable no hay allowlist y por lo tanto no hay egreso', () => {
    const policy = egressPolicyFromEnv({});
    expect(policy.allowedHosts).toEqual([]);
    expect(denied('https://api.example.com/x', policy)).toBe('EGRESS_HOST_NOT_ALLOWLISTED');
  });

  it('ignora literales de plantilla del .env de ejemplo', () => {
    const policy = egressPolicyFromEnv({ ISABELLA_EGRESS_ALLOWED_HOSTS: '<host>,${OTRO},api.real.com' });
    expect(policy.allowedHosts).toEqual(['api.real.com']);
  });

  it('respeta los overrides de código por encima del env', () => {
    const policy = egressPolicyFromEnv(
      { ISABELLA_EGRESS_ALLOWED_HOSTS: 'api.real.com', ISABELLA_EGRESS_PORTS: '8443' },
      { maxResponseBytes: 4_096 }
    );
    expect(policy.ports).toEqual([8443]);
    expect(policy.maxResponseBytes).toBe(4_096);
  });
});
