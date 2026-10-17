import { describe, expect, it } from "vitest";
import { buildCognitionCacheKey, CognitionResponseCache } from "../../src/inference/cognition-response-cache";

describe("CognitionResponseCache", () => {
  it("expires entries on read and purges expired entries before writing", () => {
    let now = 1_000;
    const cache = new CognitionResponseCache<string>(100, 4, () => now);
    cache.set("old", "value");
    now += 100;
    expect(cache.get("old")).toBeUndefined();
    cache.set("live-a", "A");
    cache.set("live-b", "B");
    now += 100;
    cache.set("live-c", "C");
    expect(cache.size).toBe(1);
    expect(cache.get("live-c")).toBe("C");
  });

  it("promotes reads and evicts the least recently used entry at capacity", () => {
    let now = 5_000;
    const cache = new CognitionResponseCache<string>(10_000, 2, () => now);
    cache.set("a", "A");
    cache.set("b", "B");
    expect(cache.get("a")).toBe("A");
    cache.set("c", "C");
    expect(cache.get("a")).toBe("A");
    expect(cache.get("b")).toBeUndefined();
    expect(cache.get("c")).toBe("C");
    expect(cache.size).toBe(2);
  });

  it("replacing a key does not increase capacity", () => {
    const cache = new CognitionResponseCache<string>(1_000, 1, () => 10);
    cache.set("a", "first");
    cache.set("a", "second");
    expect(cache.size).toBe(1);
    expect(cache.get("a")).toBe("second");
  });

  it("rejects zero and unsafe cache limits", () => {
    expect(() => new CognitionResponseCache(0, 1)).toThrow("COGNITION_CACHE_TTL_INVALID");
    expect(() => new CognitionResponseCache(100, 0)).toThrow("COGNITION_CACHE_CAPACITY_INVALID");
    expect(() => new CognitionResponseCache(100, Number.MAX_SAFE_INTEGER + 1)).toThrow("COGNITION_CACHE_CAPACITY_INVALID");
  });

  it("clears entries explicitly", () => {
    const cache = new CognitionResponseCache<string>();
    cache.set("x", "X");
    cache.clear();
    expect(cache.size).toBe(0);
    expect(cache.get("x")).toBeUndefined();
  });
});

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
