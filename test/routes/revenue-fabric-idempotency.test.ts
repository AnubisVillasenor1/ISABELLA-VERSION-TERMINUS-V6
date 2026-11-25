import express from 'express';
import type { AddressInfo } from 'node:net';
import { describe, expect, it } from 'vitest';
import type { RevenueFabricStorage } from '../../src/economy/revenue-fabric/storage';
import type { FixedWindowRateLimiter } from '../../src/security/rate-limit';
import { parseIdempotencyKey, registerRevenueFabricRoutes } from '../../src/routes/revenue-fabric';

describe('financial write idempotency keys', () => {
  it('accepts stable keys within the documented length and character contract', () => {
    expect(parseIdempotencyKey('settlement:invoice_2026-10-23')).toBe(
      'settlement:invoice_2026-10-23'
    );
    expect(parseIdempotencyKey('  request-12345678  ')).toBe('request-12345678');
    expect(parseIdempotencyKey('x'.repeat(200))).toBe('x'.repeat(200));
  });

  it('rejects absent, non-string, short, overlong and unsafe keys', () => {
    expect(parseIdempotencyKey(undefined)).toBeNull();
    expect(parseIdempotencyKey(12345678)).toBeNull();
    expect(parseIdempotencyKey('short')).toBeNull();
    expect(parseIdempotencyKey('x'.repeat(201))).toBeNull();
    expect(parseIdempotencyKey('settlement key with spaces')).toBeNull();
    expect(parseIdempotencyKey('key/with/slash')).toBeNull();
  });
});

describe('billing feature flag', () => {
  it('keeps checkout and portal disabled until explicitly enabled and hides the webhook', async () => {
    const app = express();
    registerRevenueFabricRoutes({
      app,
      authorizeAdmin: () => true,
      authorizeProviderRoute: () => true,
      enforceRateLimit: () => true,
      rateLimiter: {} as FixedWindowRateLimiter,
      publicCognitionLimiter: {} as FixedWindowRateLimiter,
      providerTimeoutMs: 30_000,
      billingEnabled: false,
      storage: {} as RevenueFabricStorage,
    });
    const server = app.listen(0, '127.0.0.1');
    try {
      await new Promise<void>((resolve, reject) => {
        server.once('error', reject);
        server.once('listening', resolve);
      });
      const address = server.address();
      if (!address || typeof address === 'string') throw new Error('TEST_SERVER_ADDRESS_MISSING');
      const baseUrl = `http://127.0.0.1:${(address as AddressInfo).port}`;
      for (const path of ['/api/v1/billing/checkout', '/api/v1/billing/portal']) {
        const response = await fetch(`${baseUrl}${path}`, { method: 'POST' });
        expect(response.status).toBe(503);
        await expect(response.json()).resolves.toMatchObject({ error: 'BILLING_DISABLED' });
      }
      const webhook = await fetch(`${baseUrl}/api/v1/billing/stripe/webhook`, { method: 'POST' });
      expect(webhook.status).toBe(404);
    } finally {
      await new Promise<void>((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()));
      });
    }
  });
});
