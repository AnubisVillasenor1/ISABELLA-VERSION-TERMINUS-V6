import { describe, expect, it } from "vitest";
import { createPostgresStorage } from "../../src/bookpi/storage-postgres";
import type { PostgresLike } from "../../src/bookpi/storage-postgres";
import { makeSeed } from "./helpers";

describe("BookPI PostgreSQL adapter contract", () => {
  it("binds all thirteen insert columns including canonical", async () => {
    let insert = "";
    let params: unknown[] = [];
    const pool: PostgresLike = {
      query: async (text, values = []) => {
        if (text.startsWith("INSERT INTO")) { insert = text; params = values; }
        return { rows: [] };
      },
    };
    await createPostgresStorage(pool).appendEvent(makeSeed());
    expect(insert).toContain("$13");
    expect(params).toHaveLength(13);
  });
});

  it("uses one transaction and actor-scoped RLS context for an append", async () => {
    const statements: Array<{ sql: string; params?: unknown[] }> = [];
    const client = {
      query: async (sql: string, params?: unknown[]) => {
        statements.push({ sql, params });
        return { rows: [] };
      },
      release: () => { statements.push({ sql: "RELEASE" }); },
    };
    const pool: PostgresLike = {
      query: async (sql, params) => { statements.push({ sql, params }); return { rows: [] }; },
      connect: async () => client,
    };
    const storage = createPostgresStorage(pool, "bookpi_events", { actorId: "human:pipeline-session" });
    const event = await storage.appendEvent(makeSeed(), { actorId: "human:pipeline-session" });

    expect(event.actorId).toBe("human:pipeline-session");
    expect(statements.some((x) => x.sql === "BEGIN")).toBe(true);
    expect(statements.some((x) => x.sql.includes("set_config('app.actor_id', $1, true)"))).toBe(true);
    expect(statements.some((x) => x.sql.includes("pg_advisory_xact_lock"))).toBe(true);
    expect(statements.some((x) => x.sql === "COMMIT")).toBe(true);
    expect(statements.some((x) => x.sql === "RELEASE")).toBe(true);
  });

  it("rejects an append that crosses the configured actor scope", async () => {
    let touchedDatabase = false;
    const pool: PostgresLike = {
      query: async () => { touchedDatabase = true; return { rows: [] }; },
    };
    const storage = createPostgresStorage(pool, "bookpi_events", { actorId: "actor-a" });
    await expect(storage.appendEvent(makeSeed(), { actorId: "actor-b" }))
      .rejects.toThrow("BOOKPI_ACTOR_SCOPE_MISMATCH");
    expect(touchedDatabase).toBe(false);
  });
