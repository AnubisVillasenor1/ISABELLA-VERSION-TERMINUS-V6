import { createServer, type RequestListener, type Server } from "node:http";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { verifyDeployment } from "../../src/deployment/production-smoke";

// Prevent the application from opening a production listener while this smoke imports it.
process.env.VERCEL = "1";

let server: Server | undefined;
let baseUrl = "";

function smokeFetchFor(readinessStatus: 200 | 503): typeof fetch {
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
      const ready = readinessStatus === 200;
      return new Response(JSON.stringify({ success: ready, snapshot: { readiness: { ready } } }), {
        status: readinessStatus,
      });
    }
    if (path === "/api/v1/healthz") {
      return new Response(
        JSON.stringify({ scope: "deep-dependency-readiness", evidence: [] }),
        { status: 503 }
      );
    }
    return new Response("{}", { status: 404 });
  };
}

beforeAll(async () => {
  const { default: app } = await import("../../src/server");
  const created = createServer(app as unknown as RequestListener);
  await new Promise<void>((resolve, reject) => {
    created.once("error", reject);
    created.listen(0, "127.0.0.1", resolve);
  });
  const address = created.address();
  if (!address || typeof address !== "object") throw new Error("smoke server failed to bind an ephemeral port");
  server = created;
  baseUrl = `http://127.0.0.1:${address.port}`;
  // This hook imports the full server module and builds the workspace. Under CI/parallel
  // load that alone can exceed a minute, so it must sit above the global hookTimeout
  // rather than the old 60_000 override that silently defeated it.
}, 180_000);

afterAll(async () => {
  if (!server) return;
  await new Promise<void>((resolve, reject) => server?.close((error) => (error ? reject(error) : resolve())));
}, 30_000);

describe("post-deployment smoke", () => {
  it(
    "verifies the runtime deployment surface end-to-end",
    async () => {
      const result = await verifyDeployment(baseUrl, fetch, { requireReadiness: false });
      const names = result.checks.map((check) => check.name);
      expect(names).toEqual([
        "liveness",
        "security-headers",
        "public-health",
        "dependency-readiness",
        "deep-readiness",
      ]);
      expect(result.ok).toBe(true);
      expect(result.baseUrl).toBe(baseUrl);
    },
    30_000,
  );

  it(
    "reports unreachable deployments as failed checks instead of throwing",
    async () => {
      const result = await verifyDeployment("http://127.0.0.1:9");
      expect(result.ok).toBe(false);
      expect(result.checks.every((check) => check.ok === false)).toBe(true);
    },
    30_000,
  );

  it("fails the strict release gate when dependency readiness is blocked", async () => {
    const result = await verifyDeployment("https://example.org", smokeFetchFor(503));
    expect(result.ok).toBe(false);
    expect(result.checks.find((check) => check.name === "dependency-readiness")).toMatchObject({
      ok: false,
      status: 503,
    });
  });

  it("passes the strict release gate only when required dependencies are ready", async () => {
    const result = await verifyDeployment("https://example.org", smokeFetchFor(200));
    expect(result.ok).toBe(true);
    expect(result.checks.find((check) => check.name === "dependency-readiness")).toMatchObject({
      ok: true,
      status: 200,
    });
  });
});
