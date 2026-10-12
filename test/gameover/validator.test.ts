import { describe, expect, it } from "vitest";
import { validateRequest } from "../../src/gameover/validator";

const valid = {
  protocol: "UAGP-1",
  requestId: "req-1",
  passportId: "pp-1",
  objectiveTitle: "build image",
  agent: { id: "agent-1", name: "Builder", owner: "edwin", capabilities: ["build"] },
  actions: ["build"],
};

describe("GAME OVER UagpValidator", () => {
  it("accepts a well-formed request", () => {
    const result = validateRequest(valid);
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it("rejects non-objects", () => {
    expect(validateRequest("nope").errors).toContain("REQUEST_NOT_AN_OBJECT");
  });

  it("requires the UAGP-1 protocol", () => {
    expect(validateRequest({ ...valid, protocol: "UAGP-0" }).errors).toContain("PROTOCOL_UNSUPPORTED");
  });

  it("requires passport, objective and actions", () => {
    const errors = validateRequest({ ...valid, passportId: "", objectiveTitle: "", actions: [] }).errors;
    expect(errors).toContain("PASSPORT_ID_REQUIRED");
    expect(errors).toContain("OBJECTIVE_TITLE_REQUIRED");
    expect(errors).toContain("ACTIONS_REQUIRED");
  });

  it("validates evidence sha256 shape and kind", () => {
    const errors = validateRequest({
      ...valid,
      evidence: [{ id: "ev-1", kind: "MADE_UP", uri: "bookpi://1", sha256: "xyz" }],
    }).errors;
    expect(errors).toContain("EVIDENCE_0_KIND_UNKNOWN");
    expect(errors).toContain("EVIDENCE_0_SHA256_INVALID");
  });
});
