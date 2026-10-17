import { describe, expect, it } from "vitest";
import { buildCognitionCacheKey } from "../../src/inference/cognition-cache-key";

describe("buildCognitionCacheKey", () => {
  const history = [{ role: "user", content: "hello" }];

  it("separates governance methods for identical text and context", () => {
    const safe = buildCognitionCacheKey("same", history, "auto", "general", "safe-method");
    const destructive = buildCognitionCacheKey("same", history, "auto", "general", "destructive-method");
    expect(safe).not.toBe(destructive);
  });

  it("uses structural encoding rather than delimiter concatenation", () => {
    const left = buildCognitionCacheKey("a|b", [], "auto", "general", "safe");
    const right = buildCognitionCacheKey("a", [], "auto", "general", "safe");
    expect(left).not.toBe(right);
  });
});
