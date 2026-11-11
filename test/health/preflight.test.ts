import { describe, expect, it } from "vitest";
import { assertPreflight, estimateEntropyBits, looksLikeTemplate, runPreflight, weakSecretReason } from "../../src/health/preflight";

/** state: draft | engine-generated */
const rand = "kT9#vL2$pQ7@xW4!mN8^bR5&hJ3*cF6(dG1)zY0_aS-eU+iO=lK";

describe("weakSecretReason", () => {
  it("flags short, placeholder, low-diversity and low-entropy values", () => {
    expect(weakSecretReason("short")).toContain("shorter");
    expect(weakSecretReason("a".repeat(64))).toContain("distinct");
    expect(weakSecretReason("abababababababababababababababab".repeat(2))).not.toBeNull();
    expect(weakSecretReason(rand)).toBeNull();
    expect(estimateEntropyBits("")).toBe(0);
  });
  it("rejects an unfilled template token even when it is long and diverse", () => {
    // El literal que el propio repo publica en .env.example: 38 caracteres, >8 distintivos y
    // más de 96 bits estimados. Sin control de forma, copiar el ejemplo abre la compuerta.
    const template = "<generate-with-openssl-rand-base64-32>";
    expect(template.length).toBeGreaterThan(32);
    expect(new Set(template).size).toBeGreaterThan(8);
    expect(estimateEntropyBits(template)).toBeGreaterThan(96);
    expect(weakSecretReason(template)).toBe("is an unfilled template token");
    expect(looksLikeTemplate("postgresql://<user>:<password>@<host>:5432/<database>")).toBe(true);
    expect(looksLikeTemplate(template)).toBe(true);
    expect(looksLikeTemplate(rand)).toBe(false);
    expect(looksLikeTemplate("<a>")).toBe(false); // un solo carácter entre Less-than no es una instrucción de relleno
    expect(looksLikeTemplate("mongodb+srv://u:p@cluster0.abc.mongodb.net/")).toBe(false);
  });
});

describe("runPreflight", () => {
  it("passes a sane production configuration", () => {
    const r = runPreflight({ NODE_ENV: "production", GENESIS_ADMIN_API_TOKEN: rand, OPS_API_TOKEN: rand.split("").reverse().join(""), OPENROUTER_API_KEY: rand, APP_PUBLIC_URL: "https://isabella.example", BOOKPI_LEDGER_PATH: "/data/l.jsonl", TRUST_PROXY: "1", PORT: "8080" });
    expect(r.findings).toEqual([]);
    expect(r.status).toBe("PASS");
  });
  it("fails on weak/reused tokens, insecure URL, bad proxy/port, stripe misconfig", () => {
    const r = runPreflight({ NODE_ENV: "production", GENESIS_ADMIN_API_TOKEN: "changeme", OPS_API_TOKEN: "changeme", APP_PUBLIC_URL: "http://x.test", TRUST_PROXY: "true", PORT: "99999", STRIPE_SECRET_KEY: "sk_test_abc" });
    const ids = r.findings.map((f) => f.id);
    expect(r.status).toBe("FAIL");
    expect(ids).toContain("PF-TOKEN-WEAK-GENESIS_ADMIN_API_TOKEN");
    expect(ids).toContain("PF-TOKEN-REUSED-OPS_API_TOKEN");
    expect(ids).toContain("PF-PUBLIC-URL-INSECURE");
    expect(ids).toContain("PF-TRUST-PROXY-INVALID");
    expect(ids).toContain("PF-PORT-INVALID");
    expect(ids).toContain("PF-STRIPE-WEBHOOK-MISSING");
    expect(ids).toContain("PF-STRIPE-TEST-KEY");
    expect(JSON.stringify(r)).not.toContain("sk_test_abc");
  });
  it("requires a provider credential and validates local vision pairing", () => {
    const missing = runPreflight({ NODE_ENV: "production", GENESIS_ADMIN_API_TOKEN: rand });
    expect(missing.findings.map((f) => f.id)).toContain("PF-AI-PROVIDER-MISSING");
    const unpaired = runPreflight({ NODE_ENV: "production", GENESIS_ADMIN_API_TOKEN: rand, OPENROUTER_API_KEY: rand, LOCAL_VISION_BASE_URL: "https://vision.example" });
    expect(unpaired.findings.map((f) => f.id)).toContain("PF-LOCAL-VISION-KEY-MISSING");
  });
  it("is lenient in development and warns when the kill switch is engaged", () => {
    const r = runPreflight({ ISA_KILL_SWITCH: "1" });
    expect(r.production).toBe(false);
    expect(r.status).toBe("WARN");
    expect(r.findings.map((f) => f.id)).toContain("PF-KILL-SWITCH-ENGAGED");
  });
  it("assertPreflight throws only on errors", () => {
    expect(() => assertPreflight({ NODE_ENV: "production" })).toThrow("PF-TOKEN-ADMIN-MISSING");
    expect(assertPreflight({}).status).toBe("WARN");
  });
});
