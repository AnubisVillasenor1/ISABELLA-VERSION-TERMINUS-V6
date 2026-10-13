import { describe, expect, it } from "vitest";
import { checkWriteCapacity, planRetention, runRetentionSweep, type RetentionObject, type RetentionPolicy } from "../../src/terminus/retention";

const now = Date.parse("2026-10-12T12:00:00.000Z");
const policy: RetentionPolicy = {
  version: "retention-v1", maxObjects: 3, maxBytes: 100, maxAgeMs: 5000, minimumAgeMs: 1000, batchSize: 10,
};

function item(id: string, ageMs: number, extras: Partial<RetentionObject> = {}): RetentionObject {
  return { id, createdAt: new Date(now - ageMs).toISOString(), byteLength: 10, ...extras };
}

describe("BookPI bounded retention", () => {
  it("prunes expired/oldest eligible payloads while protecting legal holds", () => {
    const objects = [
      item("expired-old", 20_000),
      item("expired-mid", 8_000),
      item("recent", 500),
      item("hold", 20_000, { legalHold: true }),
    ];
    const plan = planRetention(objects, policy, now);
    expect(plan.candidates.map((candidate) => candidate.id)).toEqual(["expired-old", "expired-mid"]);
    expect(plan.capacitySatisfied).toBe(true);
    expect(plan.candidates.some((candidate) => candidate.id === "hold")).toBe(false);
  });

  it("blocks writes at the hard object ceiling until an audited sweep is completed", () => {
    const fullPolicy = { ...policy, maxObjects: 1, maxBytes: 100, maxAgeMs: 100_000, minimumAgeMs: 100_000 };
    const decision = checkWriteCapacity([item("only", 100)], 10, fullPolicy, now);
    expect(decision.admitted).toBe(false);
    expect(decision.reason).toBe("CAPACITY_BLOCKED");
  });

  it("does not delete anything when the immutable-ledger intent append fails", async () => {
    let deleteCount = 0;
    const repository = {
      listObjects: async () => [item("expired", 50_000)],
      erasePayload: async () => { deleteCount += 1; return { physicalDeletionComplete: true }; },
    };
    const audit = { append: async () => { throw new Error("ledger unavailable"); } };
    await expect(runRetentionSweep(repository, audit, policy, now)).rejects.toThrow("ledger unavailable");
    expect(deleteCount).toBe(0);
  });

  it("records request and completion around payload deletion", async () => {
    const auditEvents: string[] = [];
    const deleted: string[] = [];
    const repository = {
      listObjects: async () => [item("expired", 50_000)],
      erasePayload: async (id: string) => { deleted.push(id); return { physicalDeletionComplete: true }; },
    };
    const audit = { append: async (type: string) => { auditEvents.push(type); } };
    const result = await runRetentionSweep(repository, audit, policy, now);
    expect(result.erased).toEqual(["expired"]);
    expect(deleted).toEqual(["expired"]);
    expect(auditEvents).toEqual(["bookpi.retention.requested", "bookpi.retention.completed"]);
  });
});
