import { describe, expect, it } from "vitest";
import { verifyDeployment } from "../../src/deployment/production-smoke";

// Compuerta de despliegue por niveles, sin levantar el servidor: el stub reproduce
// las dos caras del contrato de readiness que la aplicacion sirve en produccion.
function stubFetch(readinessStatus: 200 | 503, brokenContract = false): typeof fetch {
  return async (input) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    const path = new URL(url).pathname;
    if (path === "/health") {
      return new Response(JSON.stringify({ status: "healthy" }), {
        status: 200,
        headers: {
          "x-content-type-options": "nosniff",
          "x-frame-options": "DENY",
          "referrer-policy": "strict-origin-when-cross-origin",
        },
      });
    }
    if (path === "/api/v1/health") {
      return new Response(JSON.stringify({ inferenceMode: "local-fallback" }), { status: 200 });
    }
    if (path === "/api/v1/readyz") {
      if (brokenContract) return new Response("{}", { status: 503 });
      const ready = readinessStatus === 200;
      return new Response(JSON.stringify({ success: ready, snapshot: { readiness: { ready } } }), {
        status: readinessStatus,
      });
    }
    if (path === "/api/v1/healthz") {
      return new Response(JSON.stringify({ scope: "deep-dependency-readiness", evidence: [] }), { status: 503 });
    }
    return new Response("{}", { status: 404 });
  };
}

describe("deployment smoke readiness tiers", () => {
  it("keeps the strict tier fail-closed when readiness is a declared 503", async () => {
    const result = await verifyDeployment("https://smoke.invalid", stubFetch(503));
    const dependency = result.checks.find((check) => check.name === "dependency-readiness");
    expect(result.ok).toBe(false);
    expect(dependency?.ok).toBe(false);
    expect(dependency?.status).toBe(503);
  });

  it("passes the strict tier when readiness reports ready", async () => {
    const result = await verifyDeployment("https://smoke.invalid", stubFetch(200), { requireReadiness: true });
    expect(result.ok).toBe(true);
    expect(result.checks.every((check) => check.ok)).toBe(true);
  });

  it("lets a draft deploy pass a consistent 503 without claiming certification", async () => {
    const result = await verifyDeployment("https://smoke.invalid", stubFetch(503), { requireReadiness: false });
    const dependency = result.checks.find((check) => check.name === "dependency-readiness");
    expect(dependency?.status).toBe(503);
    expect(dependency?.ok).toBe(true);
    expect(result.ok).toBe(true);
  });

  it("still fails the draft tier when the readiness envelope is malformed", async () => {
    const result = await verifyDeployment("https://smoke.invalid", stubFetch(503, true), { requireReadiness: false });
    const dependency = result.checks.find((check) => check.name === "dependency-readiness");
    expect(dependency?.ok).toBe(false);
    expect(result.ok).toBe(false);
  });
});
