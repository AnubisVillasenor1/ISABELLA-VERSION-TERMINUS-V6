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
