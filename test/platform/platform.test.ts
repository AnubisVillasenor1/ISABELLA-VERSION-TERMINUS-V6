import { existsSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { PLATFORM_GIFTS, Bulkhead, CostBudget, FeatureFlags, Bm25Index, SloTracker, WebhookInbox, createEvidenceBundle, retry, runPreflight, redactText } from "../../src/platform";

/** state: draft | engine-generated */
describe("platform manifest", () => {
  it("lists ten capabilities whose files exist and are honestly labelled", () => {
    expect(PLATFORM_GIFTS).toHaveLength(10);
    expect(PLATFORM_GIFTS.map((g) => g.order)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    for (const g of PLATFORM_GIFTS) {
      expect(existsSync(new URL(`../../${g.file}`, import.meta.url))).toBe(true);
      expect(g.limits.length).toBeGreaterThan(10);
    }
  });
  it("re-exports every capability", () => {
    for (const x of [Bulkhead, CostBudget, FeatureFlags, Bm25Index, SloTracker, WebhookInbox, createEvidenceBundle, retry, runPreflight, redactText]) expect(typeof x).toBe("function");
  });
});
