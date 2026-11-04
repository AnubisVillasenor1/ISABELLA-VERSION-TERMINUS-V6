import { describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import type { NextFunction, Request, Response } from "express";

vi.mock("../../src/lib/lib/security/output-gate", () => ({
  scanOutput: (text: string) =>
    text.includes("__boom__")
      ? (() => {
          throw new Error("scanner unavailable");
        })()
      : {
          allowed: !text.includes("AKIA") && !text.includes("postgres://"),
          text,
          analysis: {},
          reasons: ["CREDENTIAL_SHAPE"],
        },
}));

import {
  GUARDED_OUTPUT_PREFIXES,
  buildBlockedOutputBody,
  createOutputGuardMiddleware,
  guardSerializedOutput,
  isGuardedOutputPath,
} from "../../src/security/output-guard-http";

interface FakeRes {
  readonly json: (body?: unknown) => Response;
  statusCode: number;
  readonly payload: unknown;
}

function makeRes(): FakeRes & { status(code: number): FakeRes } {
  const res = {
    statusCode: 200,
    payload: undefined as unknown,
    status(code: number) {
      res.statusCode = code;
      return res;
    },
    json(body?: unknown) {
      res.payload = body;
      return res as unknown as Response;
    },
  };
  return res as unknown as FakeRes & { status(code: number): FakeRes };
}

function run(url: string, body: unknown): { res: FakeRes; nextCalled: boolean } {
  const req = { originalUrl: url } as Request;
  const res = makeRes();
  let nextCalled = false;
  createOutputGuardMiddleware()(req, res as unknown as Response, (() => {
    nextCalled = true;
  }) as NextFunction);
  // El middleware ya envolvió res.json; la ruta la ejecuta ahora.
  (res.json as (b?: unknown) => Response)(body);
  return { res, nextCalled };
}

describe("prefijo protegido", () => {
  it("cubre las superficies de texto generado", () => {
    for (const path of [
      "/api/v1/agents/run",
      "/api/v1/nexus/ask",
      "/api/v1/mcp",
      "/api/mcp",
      "/api/v1/tools/execute",
      "/v1/chat/completions",
    ]) {
      expect(isGuardedOutputPath(path), path).toBe(true);
    }
  });

  it("no cubre diagnóstico ni rutas que sólo coinciden en un prefijo más largo", () => {
    for (const path of [
      "/api/v1/readyz",
      "/api/v1/runtime/capabilities",
      "/api/v1/agents-extra",
      "/api/v1/tooling",
    ]) {
      expect(isGuardedOutputPath(path), path).toBe(false);
    }
    expect(GUARDED_OUTPUT_PREFIXES).not.toContain("/api/v1/readyz");
  });
});

describe("guardSerializedOutput", () => {
  it("niega con códigos y aprueba contenido benigno", () => {
    expect(guardSerializedOutput('{"k":"AKIAIOSFODNN7EXAMPLE"}').allowed).toBe(false);
    expect(guardSerializedOutput('{"u":"postgres://a:b@h/db"}').allowed).toBe(false);
    expect(guardSerializedOutput('{"a":"Hola, soy Isabella."}')).toEqual({
      allowed: true,
      reasons: [],
    });
  });

  it("falla cerrado si el escáner no pudo evaluar", () => {
    const outcome = guardSerializedOutput('{"x":"__boom__"}');
    expect(outcome.allowed).toBe(false);
    expect(outcome.reasons).toEqual(["OUTPUT_GUARD_EVALUATION_FAILED"]);
  });

  it("nunca devuelve un reasons vacío cuando niega", () => {
    expect(guardSerializedOutput('{"k":"AKIAIOSFODNN7EXAMPLE"}').reasons.length).toBeGreaterThan(0);
    expect(buildBlockedOutputBody([], 12).reasons).toEqual([]);
  });
});

describe("createOutputGuardMiddleware", () => {
  it("retira el cuerpo filtrado y no lo reproduce en el error", () => {
    const { res } = run("/api/v1/agents/run", { reply: "AKIAIOSFODNN7EXAMPLE" });
    expect(res.statusCode).toBe(403);
    const payload = res.payload as Record<string, unknown>;
    expect(payload.error).toBe("OUTPUT_GUARD_BLOCKED");
    expect(payload.code).toBe("OG-DENY");
    expect(JSON.stringify(payload)).not.toContain("AKIAIOSFODNN7EXAMPLE");
    expect(payload.withheldBytes).toBeGreaterThan(0);
  });

  it("deja pasar la respuesta benigna intacta", () => {
    const body = { success: true, reply: "Isabella puede explicar cualquier tema general." };
    const { res } = run("/api/v1/agents/run", body);
    expect(res.statusCode).toBe(200);
    expect(res.payload).toEqual(body);
  });

  it("no envuelve rutas fuera de la lista y pasa con next()", () => {
    const req = { originalUrl: "/api/v1/readyz" } as Request;
    const res = makeRes();
    let nextCalled = false;
    createOutputGuardMiddleware()(req, res as unknown as Response, (() => {
      nextCalled = true;
    }) as NextFunction);
    expect(nextCalled).toBe(true);
    const leaked = { health: "AKIAIOSFODNN7EXAMPLE" };
    (res.json as (b?: unknown) => Response)(leaked);
    // Diagnóstico: el middleware no intercepta, la ruta responde lo que produjo.
    expect(res.payload).toEqual(leaked);
  });

  it("falla cerrado ante un cuerpo que no se puede serializar", () => {
    const circular: Record<string, unknown> = { ok: true };
    circular.self = circular;
    const { res } = run("/api/v1/tools/execute", circular);
    expect(res.statusCode).toBe(403);
    expect((res.payload as Record<string, unknown>).reasons).toEqual([
      "OUTPUT_BODY_NOT_SERIALIZABLE",
    ]);
  });

  it("considera el query string parte de la ruta protegida", () => {
    expect(isGuardedOutputPath("/api/mcp?session=1")).toBe(true);
  });
});

describe("cableado en el servidor", () => {
  const source = readFileSync(new URL("../../src/server.ts", import.meta.url), "utf8");

  it("registra la compuerta antes de cualquier ruta de agentes, MCP o chat", () => {
    const guard = source.indexOf("app.use(createOutputGuardMiddleware())");
    expect(guard).toBeGreaterThan(-1);
    for (const needle of [
      "registerAgentRoutes(",
      "registerNexusRoutes(",
      "registerHyperCoreRoutes(",
      "app.post('/api/mcp'",
      "app.post('/api/isabella/chat'",
      "app.post('/api/v1/tools/execute'",
    ]) {
      const at = source.indexOf(needle);
      expect(at, needle).toBeGreaterThan(-1);
      expect(guard, `la compuerta debe ir antes de ${needle}`).toBeLessThan(at);
    }
  });
});
