import { afterEach, describe, expect, it, vi } from 'vitest';
import { resolvePostgresConnectTimeoutMs } from '../../src/database/postgres-client';

/**
 * Regression: durable stores (API keys, federation) hydrate at module scope on
 * serverless. A 2 s connect timeout was shorter than a Neon cold start and
 * silently downgraded them to process memory, so the default must stay well
 * above that window and remain operator-tunable within a bounded range.
 */
describe('resolvePostgresConnectTimeoutMs', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('defaults to ten seconds when nothing is configured', () => {
    vi.stubEnv('ISABELLA_POSTGRES_CONNECT_TIMEOUT_MS', '');
    expect(resolvePostgresConnectTimeoutMs()).toBe(10_000);
  });

  it('falls back to the default when the environment value is not a number', () => {
    vi.stubEnv('ISABELLA_POSTGRES_CONNECT_TIMEOUT_MS', 'soon');
    expect(resolvePostgresConnectTimeoutMs()).toBe(10_000);
  });

  it('honours an explicit value from the environment', () => {
    vi.stubEnv('ISABELLA_POSTGRES_CONNECT_TIMEOUT_MS', '15000');
    expect(resolvePostgresConnectTimeoutMs()).toBe(15_000);
  });

  it('prefers an explicit argument over the environment', () => {
    vi.stubEnv('ISABELLA_POSTGRES_CONNECT_TIMEOUT_MS', '15000');
    expect(resolvePostgresConnectTimeoutMs(4_000)).toBe(4_000);
  });

  it('clamps values into the 1s..30s range', () => {
    expect(resolvePostgresConnectTimeoutMs(10)).toBe(1_000);
    expect(resolvePostgresConnectTimeoutMs(120_000)).toBe(30_000);
  });
});
