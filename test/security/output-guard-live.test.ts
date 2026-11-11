/**
 * Las pruebas de `output-guard-http.test.ts` sustituyen el PDP por un doble para poder
 * forzar su fallo. Este archivo no simula nada: ejercita el gate canónico real
 * (`evaluateOutputSecurity`, ISA-140/175) a través del middleware, sobre el tipo de
 * contenido que un agente de Isabella puede reproducir en una respuesta.
 */
import { describe, expect, it } from "vitest";
import type { NextFunction, Request, Response } from "express";
import { createOutputGuardMiddleware } from "../../src/security/output-guard-http";
import { scanOutput } from "../../src/lib/lib/security/output-gate";

function respond(url: string, body: unknown): { statusCode: number; payload: unknown } {
  const res = {
    statusCode: 200,
    payload: undefined as unknown,
    status(code: number) {
      res.statusCode = code;
      return res;
    },
    json(b?: unknown) {
      res.payload = b;
      return res;
    },
  };
  const req = { originalUrl: url } as Request;
  createOutputGuardMiddleware()(req, res as unknown as Response, (() => undefined) as NextFunction);
  (res.json as (b?: unknown) => unknown)(body);
  return { statusCode: res.statusCode, payload: res.payload };
}

describe("compuerta de salida con el PDP real", () => {
  it("aprueba una respuesta general y niega una credencial de nube", () => {
    const benign = { success: true, reply: "La fotosíntesis convierte luz en energía química." };
    expect(respond("/api/v1/agents/run", benign).statusCode).toBe(200);
    expect(respond("/api/v1/agents/run", benign).payload).toEqual(benign);

    const leaked = { success: true, reply: "usa AKIAIOSFODNN7EXAMPLE para llamar a AWS" };
    const denied = respond("/api/v1/agents/run", leaked);
    expect(denied.statusCode).toBe(403);
    expect(JSON.stringify(denied.payload)).not.toContain("AKIAIOSFODNN7EXAMPLE");
  });

  it("niega una cadena de conexión y un token JWT reproducidos por un agente", () => {
    for (const body of [
      { dsn: "postgresql://isabella:SuP3rSecr3t@db.internal:5432/prod" },
      { token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NSJ9.abcdefghijk" },
    ]) {
      const outcome = respond("/api/v1/nexus/ask", body);
      expect(outcome.statusCode, JSON.stringify(body)).toBe(403);
      expect(JSON.stringify(outcome.payload)).not.toContain("SuP3rSecr3t");
    }
  });

  it("el PDP bajo prueba sigue siendo el mismo que usa la fachada", () => {
    // Si alguien reconecta la fachada a un verificador que siempre devuelve allowed,
    // esta aserción se cae: es el guard anti-regresión del propio scanOutput.
    expect(scanOutput("clave: AKIAIOSFODNN7EXAMPLE").allowed).toBe(false);
    expect(scanOutput("explicación general sobre cambio climático").allowed).toBe(true);
  });
});
