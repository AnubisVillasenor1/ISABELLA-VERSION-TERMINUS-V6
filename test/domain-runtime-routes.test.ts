import { afterEach, describe, expect, it, vi } from 'vitest';
import express from 'express';
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import type { FixedWindowRateLimiter } from '../src/security/rate-limit';
import { registerDomainRuntimeRoutes } from '../src/routes/domain-runtime';

let server: Server | undefined;
afterEach(async () => {
  if (server?.listening) await new Promise<void>((resolve, reject) => server!.close((error) => error ? reject(error) : resolve()));
  server = undefined;
  vi.unstubAllEnvs();
});

async function startTestServer(): Promise<string> {
  const app = express();
  app.use(express.json({ limit: '8kb' }));
  registerDomainRuntimeRoutes({
    app,
    enforceRateLimit: (_req, _res, _limiter, _bucket) => true,
    rateLimiter: {} as FixedWindowRateLimiter,
  });
  server = createServer(app);
  await new Promise<void>((resolve, reject) => {
    server!.once('error', reject);
    server!.listen(0, '127.0.0.1', resolve);
  });
  const address = server.address() as AddressInfo;
  return `http://127.0.0.1:${address.port}`;
}

describe('IDR HTTP routes', () => {
  it('exposes non-secret provider status and preserves the planning-only boundary', async () => {
    vi.stubEnv('IDR_EMBEDDINGS_PROVIDER', 'none');
    const base = await startTestServer();
    const statusResponse = await fetch(`${base}/api/v1/idr/status`);
    expect(statusResponse.status).toBe(200);
    const status = await statusResponse.json() as Record<string, unknown>;
    expect(status.embeddingProvider).toBe('none');
    expect(status.executionPerformed).toBe(false);
    expect(status.production).toBe(false);
    expect(JSON.stringify(status)).not.toContain('HF_TOKEN');

    const resolveResponse = await fetch(`${base}/api/v1/idr/resolve`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ intent: 'analizar crecimiento de creadores', policy: { allowExternal: true, maxRisk: 'critical' } }),
    });
    expect(resolveResponse.status).toBe(200);
    const resolved = await resolveResponse.json() as {
      resolution: { status: string; plan: Array<{ capabilityId: string }> };
      executionPerformed: boolean;
      production: boolean;
    };
    expect(resolved.resolution.status).toBe('RESOLVED');
    expect(resolved.resolution.plan[0]?.capabilityId).toBe('cap.growth.analyze');
    expect(resolved.executionPerformed).toBe(false);
    expect(resolved.production).toBe(false);
  });

  it('rejects missing, blank and oversized intents', async () => {
    const base = await startTestServer();
    for (const body of [{}, { intent: '   ' }, { intent: 'x'.repeat(2_001) }]) {
      const response = await fetch(`${base}/api/v1/idr/resolve`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      });
      expect(response.status).toBe(400);
    }
  });
});
