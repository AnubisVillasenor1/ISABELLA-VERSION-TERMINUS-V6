/**
 * Deploy readiness (state: draft | engine-generated).
 *
 * `runPreflight` validates the *quality* of the settings that exist. This module answers a different
 * question — "is every setting a production deployment cannot work without actually present?" — and is
 * what `pnpm deploy:readiness` runs before a release. Values are never included in the report.
 * It does not verify network reachability of the dependencies: that is the job of readyz / smoke.
 */
import { isPostgresStoreMode } from '../database/postgres-store-mode';
import { runPreflight, weakSecretReason, type PreflightFinding } from './preflight';

type Env = Readonly<Record<string, string | undefined>>;

export interface DeployReadinessReport {
  readonly status: 'READY' | 'READY_WITH_WARNINGS' | 'BLOCKED';
  readonly findings: readonly PreflightFinding[];
}

const has = (env: Env, name: string): boolean => (env[name]?.trim() ?? '') !== '';

const POSTGRES_URL_PATTERN = /^postgres(?:ql)?:\/\//i;

const PROVIDER_VARS = [
  'GROQ_API_KEY',
  'OPENROUTER_API_KEY',
  'HF_TOKEN',
  'GEMINI_API_KEY',
  'AI_GATEWAY_API_KEY',
  'VERCEL_OIDC_TOKEN',
  'OLLAMA_BASE_URL',
] as const;

interface DurableStoreContract {
  readonly variable: string;
  readonly mode: string;
  readonly ephemeralId: string;
  readonly ephemeralMessage: string;
  readonly missingDbId: string;
  readonly missingDbMessage: string;
  readonly unknownId: string;
}

/**
 * Only a Postgres mode with a usable connection string is durable across
 * serverless instances. Messages name the variable, never its value.
 */
function checkDurableStore(
  contract: DurableStoreContract,
  dbUrl: string | undefined,
  add: (id: string, severity: 'ERROR' | 'WARN', message: string) => void
): void {
  if (contract.mode === 'memory' || contract.mode === 'file') {
    add(contract.ephemeralId, 'ERROR', contract.ephemeralMessage);
    return;
  }
  if (isPostgresStoreMode(contract.mode)) {
    if (!dbUrl || !POSTGRES_URL_PATTERN.test(dbUrl)) {
      add(contract.missingDbId, 'ERROR', contract.missingDbMessage);
    }
    return;
  }
  add(
    contract.unknownId,
    'ERROR',
    `${contract.variable} must be one of memory, file, postgres or neon.`
  );
}

export function runDeployReadiness(env: Env): DeployReadinessReport {
  const findings: PreflightFinding[] = [
    ...runPreflight({ ...env, NODE_ENV: 'production' }).findings,
  ];
  const add = (id: string, severity: 'ERROR' | 'WARN', message: string): void => {
    findings.push({ id, severity, message });
  };

  // Durable evidence: BookPI needs a Postgres database AND an integrity secret, or it stays volatile.
  const secret = env.BOOKPI_INTEGRITY_SECRET?.trim();
  if (secret === undefined || secret === '') {
    add(
      'DR-BOOKPI-SECRET-MISSING',
      'ERROR',
      'BOOKPI_INTEGRITY_SECRET is not set: the ledger cannot be sealed or verified.'
    );
  } else {
    const weak = weakSecretReason(secret);
    if (weak !== null)
      add('DR-BOOKPI-SECRET-WEAK', 'ERROR', `BOOKPI_INTEGRITY_SECRET is weak (${weak}).`);
  }

  const dbUrl =
    env.DATABASE_URL?.trim() ||
    env.POSTGRES_URL?.trim() ||
    env.POSTGRES_PRISMA_URL?.trim() ||
    env.POSTGRES_URL_NON_POOLING?.trim();
  if (!dbUrl) {
    add(
      'DR-DATABASE-MISSING',
      'ERROR',
      'No DATABASE_URL / POSTGRES_URL: BookPI and subscriptions would be volatile.'
    );
  } else if (!/^postgres(?:ql)?:\/\//i.test(dbUrl)) {
    add(
      'DR-DATABASE-INVALID',
      'ERROR',
      'The database URL must start with postgres:// or postgresql://.'
    );
  } else if (
    !/[?&](?:sslmode=(?:require|verify-ca|verify-full)|ssl=true)/i.test(dbUrl) &&
    !/@(?:postgres|localhost|127\.0\.0\.1)[:/]/.test(dbUrl)
  ) {
    add(
      'DR-DATABASE-TLS',
      'WARN',
      'The database URL does not request TLS (sslmode=require) for a non-local host.'
    );
  }

  // Atlas / IKES are required runtime dependencies, so missing Supabase blocks release readiness.
  const sbUrl = has(env, 'SUPABASE_URL');
  const sbKey = has(env, 'SUPABASE_SERVICE_ROLE_KEY');
  if (sbUrl !== sbKey)
    add(
      'DR-SUPABASE-PARTIAL',
      'ERROR',
      'SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set together.'
    );
  else if (!sbUrl)
    add(
      'DR-SUPABASE-ABSENT',
      'ERROR',
      'Supabase is not configured: required Atlas/IKES probes keep /api/v1/readyz degraded.'
    );

  // Supabase user identity resolution calls /auth/v1/user with the anon/publishable key.
  // The service-role key is for server-side data access and is not a substitute for that key.
  if (sbUrl && !has(env, 'SUPABASE_ANON_KEY') && !has(env, 'SUPABASE_PUBLISHABLE_KEY')) {
    add(
      'DR-SUPABASE-AUTH-KEY-MISSING',
      'ERROR',
      'Supabase is configured, but the anon/publishable key required for authenticated user resolution is missing.'
    );
  }

  const verifiedKnowledgeProvider =
    env.ISABELLA_VERIFIED_KNOWLEDGE_BACKEND?.trim().toLowerCase() || 'mongodb';
  if (verifiedKnowledgeProvider === 'mongodb') {
    const mongoUri = env.MONGODB_URI?.trim() ?? '';
    if (!mongoUri) {
      add(
        'DR-VERIFIED-KNOWLEDGE-MONGODB-URI-MISSING',
        'ERROR',
        'MongoDB is the verified-knowledge backend, but MONGODB_URI is not configured.'
      );
    } else if (!/^mongodb(?:\\+srv)?:\\/\\//i.test(mongoUri)) {
      add(
        'DR-VERIFIED-KNOWLEDGE-MONGODB-URI-INVALID',
        'ERROR',
        'MONGODB_URI must use mongodb:// or mongodb+srv://.'
      );
    }
  } else if (verifiedKnowledgeProvider === 'supabase') {
    if (!sbUrl || !sbKey)
      add(
        'DR-VERIFIED-KNOWLEDGE-SUPABASE-CONFIG-MISSING',
        'ERROR',
        'Supabase is the verified-knowledge backend, but its URL and server key are not both configured.'
      );
  } else if (verifiedKnowledgeProvider === 'memory') {
    add(
      'DR-VERIFIED-KNOWLEDGE-NON_DURABLE',
      'ERROR',
      'The in-memory verified-knowledge backend is not durable enough for production.'
    );
  } else {
    add(
      'DR-VERIFIED-KNOWLEDGE-BACKEND-UNKNOWN',
      'ERROR',
      'ISABELLA_VERIFIED_KNOWLEDGE_BACKEND must be mongodb or supabase in production.'
    );
  }

  // Generative inference: without a provider the chat answers from the local deterministic engine only.
  if (!PROVIDER_VARS.some((n) => has(env, n)) && !has(env, 'ISABELLA_KEYLESS_FREE_PROVIDER')) {
    add(
      'DR-NO-INFERENCE-PROVIDER',
      'WARN',
      'No inference provider is configured: replies come from the local fallback, not a model.'
    );
  }

  const origins = (env.ALLOWED_ORIGINS ?? '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
  const localOrWildcardOrigin = origins.some(
    (origin) =>
      origin === '*' ||
      /(?:^|\\/\\/)(?:localhost|127\\.0\\.0\\.1|\\[::1\\])(?::|\\/|$)/i.test(origin)
  );
  if (origins.length === 0 || localOrWildcardOrigin) {
    add(
      'DR-ORIGINS-LOCAL',
      'ERROR',
      'ALLOWED_ORIGINS must contain exact public HTTPS origins; empty, localhost and wildcard values are blocked.'
    );
  } else if (
    origins.some((origin) => {
      try {
        const parsed = new URL(origin);
        return parsed.protocol !== 'https:' || parsed.origin.toLowerCase() !== origin.toLowerCase();
      } catch {
        return true;
      }
    })
  ) {
    add(
      'DR-ORIGINS-INVALID',
      'ERROR',
      'Every ALLOWED_ORIGINS entry must be an exact HTTPS origin without a path, query or fragment.'
    );
  }

  // Serverless instances are ephemeral. Neither process memory nor local files are
  // a durable credential store; production must not pass readiness with either backend.
  if (has(env, 'VERCEL') || has(env, 'VERCEL_ENV')) {
    checkDurableStore(
      {
        variable: 'ISABELLA_API_KEY_STORE',
        mode: (env.ISABELLA_API_KEY_STORE ?? 'memory').trim().toLowerCase(),
        ephemeralId: 'DR-SERVERLESS-NON_DURABLE_API_KEYS',
        ephemeralMessage:
          'API key storage is process-local or filesystem-local on serverless. Configure a shared durable adapter before production.',
        missingDbId: 'DR-SERVERLESS-API_KEYS_DB_MISSING',
        missingDbMessage:
          'ISABELLA_API_KEY_STORE selects Postgres, but no usable DATABASE_URL / POSTGRES_URL exists: keys would fall back to process memory.',
        unknownId: 'DR-SERVERLESS-API_KEYS_MODE_UNKNOWN',
      },
      dbUrl,
      add
    );
    checkDurableStore(
      {
        variable: 'ISABELLA_FEDERATION_STORE',
        mode: (env.ISABELLA_FEDERATION_STORE ?? 'memory').trim().toLowerCase(),
        ephemeralId: 'DR-SERVERLESS-NON_DURABLE_FEDERATION',
        ephemeralMessage:
          'Federation connector and inbox state is not durable across serverless instances. Configure a shared durable adapter before production.',
        missingDbId: 'DR-SERVERLESS-FEDERATION_DB_MISSING',
        missingDbMessage:
          'ISABELLA_FEDERATION_STORE selects Postgres, but no usable DATABASE_URL / POSTGRES_URL exists: connector and inbox state would fall back to process memory.',
        unknownId: 'DR-SERVERLESS-FEDERATION_MODE_UNKNOWN',
      },
      dbUrl,
      add
    );
  }

  const status = findings.some((f) => f.severity === 'ERROR')
    ? 'BLOCKED'
    : findings.length > 0
      ? 'READY_WITH_WARNINGS'
      : 'READY';
  return { status, findings };
}
