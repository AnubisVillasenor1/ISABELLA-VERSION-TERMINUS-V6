import { Pool } from "pg";
import { buildBookPiEvent } from "./emitter";
import { verifyChainLink, ZERO_HASH } from "./crypto";
import { createPostgresStorage } from "./storage-postgres";
import { createJsonlStorage } from "./storage-jsonl";
import type { BookPiEventRecord, BookPiEventSeed, BookPiStorage } from "./types";

export type RuntimeBookPiBackend = "POSTGRES" | "DURABLE_JSONL_LOCAL" | "VOLATILE_MEMORY";

export interface RuntimeBookPiStorage {
  readonly storage: BookPiStorage;
  readonly backend: RuntimeBookPiBackend;
  readonly durable: boolean;
  readonly shared: boolean;
  probe(): Promise<{ healthy: boolean; backend: RuntimeBookPiBackend; eventCount?: number; reason: string }>;
  close(): Promise<void>;
}

export interface RuntimeBookPiEnv {
  DATABASE_URL?: string;
  BOOKPI_PIPELINE_LEDGER_PATH?: string;
  BOOKPI_PIPELINE_STORAGE?: string;
}

/**
 * Chooses one explicit pipeline evidence backend.
 * PostgreSQL is the only shared backend here; JSONL is durable only on a
 * persistent mounted volume, and memory is intentionally non-durable.
 */
export function createRuntimeBookPiStorage(
  env: RuntimeBookPiEnv = process.env,
): RuntimeBookPiStorage {
  const mode = (env.BOOKPI_PIPELINE_STORAGE ?? "").trim().toLowerCase();
  const databaseUrl = env.DATABASE_URL?.trim();
  const jsonlPath = env.BOOKPI_PIPELINE_LEDGER_PATH?.trim();

  if (mode === "postgres" || (!mode && databaseUrl)) {
    if (!databaseUrl) throw new Error("BOOKPI_POSTGRES_REQUIRES_DATABASE_URL");
    const pool = new Pool({
      connectionString: databaseUrl,
      max: 5,
      connectionTimeoutMillis: 2_000,
      idleTimeoutMillis: 10_000,
      application_name: "isabella-terminus-bookpi",
    });
    // Pipeline route uses a single admin-gated service principal. The Postgres
    // adapter's RLS context and event actor must be identical for chain reads.
    const storage = createPostgresStorage(pool, "bookpi_events", { actorId: "human:pipeline-session" });
    return {
      storage,
      backend: "POSTGRES",
      durable: true,
      shared: true,
      async probe() {
        try {
          await pool.query("SELECT 1");
          const chain = await storage.verifyChain();
          return chain.valid
            ? { healthy: true, backend: "POSTGRES", eventCount: chain.count, reason: "PostgreSQL reachable; BookPI chain verified." }
            : { healthy: false, backend: "POSTGRES", eventCount: chain.count, reason: "PostgreSQL reachable but BookPI chain verification failed." };
        } catch (error) {
          const code = typeof error === "object" && error !== null && "code" in error
            ? String((error as { code: unknown }).code)
            : "";
          const reason = code === "42P01"
            ? "PostgreSQL reachable; BookPI table/migrations are missing."
            : code === "42501"
              ? "PostgreSQL BookPI access was denied by database permissions/RLS."
              : "PostgreSQL BookPI probe failed; inspect restricted server logs.";
          return { healthy: false, backend: "POSTGRES", reason };
        }
      },
      async close() { await pool.end(); },
    };
  }

  if (mode === "jsonl" || (!mode && jsonlPath)) {
    if (!jsonlPath) throw new Error("BOOKPI_JSONL_REQUIRES_BOOKPI_PIPELINE_LEDGER_PATH");
    const storage = createJsonlStorage(jsonlPath);
    return {
      storage,
      backend: "DURABLE_JSONL_LOCAL",
      durable: true,
      shared: false,
      async probe() {
        try {
          const chain = await storage.verifyChain();
          return chain.valid
            ? { healthy: true, backend: "DURABLE_JSONL_LOCAL", eventCount: chain.count, reason: "Local JSONL chain verified; cross-replica durability is not provided." }
            : { healthy: false, backend: "DURABLE_JSONL_LOCAL", eventCount: chain.count, reason: "Local JSONL chain verification failed." };
        } catch {
          return { healthy: false, backend: "DURABLE_JSONL_LOCAL", reason: "Local JSONL ledger probe failed." };
        }
      },
      async close() {},
    };
  }

  if (mode && mode !== "memory") throw new Error("BOOKPI_PIPELINE_STORAGE_UNSUPPORTED");
  return {
    storage: createMemoryStorage(),
    backend: "VOLATILE_MEMORY",
    durable: false,
    shared: false,
    async probe() {
      return {
        healthy: false,
        backend: "VOLATILE_MEMORY",
        reason: "Pipeline evidence is in process memory and will not survive restart.",
      };
    },
    async close() {},
  };
}

function createMemoryStorage(): BookPiStorage {
  const events: BookPiEventRecord[] = [];
  return {
    async getLastEvent() { return events.at(-1) ?? null; },
    async appendEvent(seed: BookPiEventSeed, ctx = {}) {
      const last = events.at(-1);
      const record = buildBookPiEvent(seed, {
        sequence: last ? last.sequence + 1 : 1,
        prevHash: last ? last.hash : ZERO_HASH,
        timestamp: new Date().toISOString(),
        ...(ctx.actorId !== undefined ? { actorId: ctx.actorId } : {}),
        ...(ctx.secret !== undefined ? { secret: ctx.secret } : {}),
      });
      events.push(record);
      return record;
    },
    async listEvents() { return [...events]; },
    async verifyChain(opts = {}) {
      const failures: string[] = [];
      let previous = ZERO_HASH;
      for (const event of events) {
        if (event.prevHash !== previous) failures.push(`event ${event.sequence}: previous hash mismatch`);
        if (!verifyChainLink(event, opts.secret)) failures.push(`event ${event.sequence}: hash/integrity mismatch`);
        previous = event.hash;
      }
      return { valid: failures.length === 0, count: events.length, failures };
    },
  };
}
