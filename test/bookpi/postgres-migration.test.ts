import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const initialMigration = readFileSync(resolve(root, "infra/db/migrations/001_create_bookpi_events.sql"), "utf8");
const hardeningMigration = readFileSync(resolve(root, "infra/db/migrations/002_bookpi_canonical_immutability.sql"), "utf8");
const migration = initialMigration + "\n" + hardeningMigration;

describe("BookPI PostgreSQL migration contract", () => {
  it("creates the complete schema required by the runtime adapter", () => {
    for (const column of [
      "id TEXT PRIMARY KEY", "type TEXT NOT NULL", "sequence BIGINT NOT NULL UNIQUE",
      "prev_hash TEXT NOT NULL", "timestamp TIMESTAMPTZ NOT NULL", "actor_id TEXT",
      "payload JSONB NOT NULL", "schema_version TEXT NOT NULL", "meta JSONB NOT NULL",
      "header JSONB NOT NULL", "hash TEXT NOT NULL", "integrity TEXT NOT NULL",
      "canonical TEXT NOT NULL",
    ]) expect(migration.toUpperCase()).toContain(column);
  });

  it("enables row-level security and scopes rows to the transaction actor", () => {
    expect(migration).toMatch(/ALTER TABLE bookpi_events ENABLE ROW LEVEL SECURITY/i);
    expect(migration).toMatch(/CREATE POLICY bookpi_actor_read[\s\S]*current_setting\('app\.actor_id', true\)/i);
    expect(migration).toMatch(/CREATE POLICY bookpi_actor_append[\s\S]*current_setting\('app\.actor_id', true\)/i);
  });

  it("requires canonical content on insert and denies mutation privileges", () => {
    expect(migration).toMatch(/trg_bookpi_require_canonical/);
    expect(migration).toMatch(/REVOKE UPDATE, DELETE, TRUNCATE ON bookpi_events FROM PUBLIC/i);
    expect(migration).toMatch(/canonical event core is mandatory/i);
  });
});
