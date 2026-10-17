import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const migration = readFileSync(resolve(root, "supabase/migrations/20261017000002_bookpi-events.sql"), "utf8");

describe("BookPI PostgreSQL migration contract", () => {
  it("creates the complete schema required by the runtime adapter", () => {
    for (const column of [
      "id text primary key", "type text not null", "sequence bigint not null unique",
      "prev_hash text not null", "timestamp timestamptz not null", "actor_id text",
      "payload jsonb not null", "schema_version text not null", "meta jsonb not null",
      "header jsonb not null", "hash text not null", "integrity text not null",
      "canonical text not null",
    ]) expect(migration.toLowerCase()).toContain(column);
  });

  it("enables RLS and denies direct browser-role access", () => {
    expect(migration).toMatch(/alter table public\.bookpi_events enable row level security/i);
    expect(migration).toMatch(/revoke all on table public\.bookpi_events from anon, authenticated/i);
    expect(migration).toMatch(/grant select, insert on table public\.bookpi_events to service_role/i);
  });

  it("documents that application chain verification is not physical WORM", () => {
    expect(migration).toMatch(/not physical WORM/i);
  });
});
