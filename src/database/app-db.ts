import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';
import { resolvePostgresConnectTimeoutMs, resolvePostgresUrl } from './postgres-client';

const connectionString = resolvePostgresUrl(process.env);

export const postgresPool = connectionString
  ? new Pool({
      connectionString,
      max: 4,
      connectionTimeoutMillis: resolvePostgresConnectTimeoutMs(),
      idleTimeoutMillis: 10_000,
      application_name: 'isabella-genesis-runtime',
    })
  : null;

postgresPool?.on('error', () => {
  console.error('[Isabella] Neon query pool error');
});

export const appDb = postgresPool ? drizzle(postgresPool, { schema }) : null;
export type AppDatabase = NonNullable<typeof appDb>;
