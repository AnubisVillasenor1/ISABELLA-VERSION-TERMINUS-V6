/**
 * Minimal Postgres client shared by the durable runtime stores.
 *
 * Pooled `pg` Pool with a bounded connect timeout. The default is deliberately
 * longer than a local connection because serverless cold starts against a
 * pooled Postgres endpoint (Neon/Supabase) regularly need more than two
 * seconds: a short timeout there silently downgraded durable stores to process
 * memory. Override with ISABELLA_POSTGRES_CONNECT_TIMEOUT_MS (1000-30000 ms).
 * Callers may inject their own client (tests use an in-memory fake).
 */
import { Pool } from 'pg';

const DEFAULT_CONNECT_TIMEOUT_MS = 10_000;
const MIN_CONNECT_TIMEOUT_MS = 1_000;
const MAX_CONNECT_TIMEOUT_MS = 30_000;

/** Resolves the effective connect timeout, clamped to a safe range. */
export function resolvePostgresConnectTimeoutMs(explicit?: number): number {
  const raw = process.env.ISABELLA_POSTGRES_CONNECT_TIMEOUT_MS;
  const configured = explicit ?? (raw && raw.trim() !== '' ? Number(raw) : Number.NaN);
  if (!Number.isFinite(configured)) return DEFAULT_CONNECT_TIMEOUT_MS;
  return Math.min(MAX_CONNECT_TIMEOUT_MS, Math.max(MIN_CONNECT_TIMEOUT_MS, Math.floor(configured)));
}

export interface PostgresClientOptions {
  readonly connectTimeoutMs?: number;
}

export interface PostgresQueryResult {
  readonly rows: Record<string, unknown>[];
}

export interface PostgresQueryClient {
  query(sql: string, params?: readonly unknown[]): Promise<PostgresQueryResult>;
  close(): Promise<void>;
}

type PostgresUrlEnv = Readonly<Record<string, string | undefined>>;

/** Same variable precedence as deploy-readiness and the BookPI runtime adapter. */
export function resolvePostgresUrl(env: PostgresUrlEnv): string | null {
  const url =
    env.DATABASE_URL?.trim() ||
    env.POSTGRES_URL?.trim() ||
    env.POSTGRES_PRISMA_URL?.trim() ||
    env.POSTGRES_URL_NON_POOLING?.trim();
  if (!url || !/^postgres(?:ql)?:\/\//i.test(url)) return null;
  return url;
}

export function createPostgresQueryClient(
  connectionString: string,
  applicationName: string,
  options: PostgresClientOptions = {}
): PostgresQueryClient {
  const pool = new Pool({
    connectionString,
    max: 5,
    connectionTimeoutMillis: resolvePostgresConnectTimeoutMs(options.connectTimeoutMs),
    idleTimeoutMillis: 10_000,
    keepAlive: true,
    application_name: applicationName,
  });
  pool.on('error', (error) => {
    console.error(`[Isabella] Postgres pool ${applicationName} error`, {
      message: error instanceof Error ? error.message.slice(0, 180) : 'ERROR',
    });
  });
  return {
    async query(sql: string, params?: readonly unknown[]): Promise<PostgresQueryResult> {
      const result = await pool.query(sql, params ? [...params] : []);
      return { rows: result.rows as Record<string, unknown>[] };
    },
    async close(): Promise<void> {
      await pool.end();
    },
  };
}

/** TIMESTAMPTZ arrives as a Date from pg; the stores expose ISO strings. */
export function isoTimestamp(value: unknown): string | null {
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'string' && Number.isFinite(Date.parse(value))) return value;
  return null;
}
