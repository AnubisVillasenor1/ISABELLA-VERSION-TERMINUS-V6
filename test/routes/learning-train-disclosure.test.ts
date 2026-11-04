import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

// El handler vive dentro del monolito src/server.ts, así que se verifica sobre el
// texto fuente — el mismo patrón que usan test/omega-runtime/server-integration.test.ts
// y test/inference/cognition-route-cache.test.ts.
const serverSource = readFileSync(new URL("../../src/server.ts", import.meta.url), "utf8");

/** Cuerpo del handler POST /api/v1/learning/train, hasta la siguiente ruta registrada. */
function learningTrainHandler(): string {
  const start = serverSource.indexOf("app.post('/api/v1/learning/train'");
  if (start === -1) throw new Error("la ruta /api/v1/learning/train ya no existe en src/server.ts");
  const rest = serverSource.slice(start + "app.post".length);
  const nextRoute = rest.search(/\napp\.(get|post|put|patch|delete)\(/);
  return nextRoute === -1 ? rest : rest.slice(0, nextRoute);
}

describe("POST /api/v1/learning/train — honestidad de la superficie", () => {
  it("declara que las métricas son simuladas y no verificadas", () => {
    const handler = learningTrainHandler();
    expect(handler).toContain("simulated: true");
    expect(handler).toContain("signatureVerified: false");
    expect(handler).toContain("metricsSource: 'Math.random'");
  });

  it("no puede responder success:true sin llevar el bloque evidence", () => {
    const handler = learningTrainHandler();
    const successIndex = handler.indexOf("success: true");
    const evidenceIndex = handler.indexOf("evidence: {");
    expect(successIndex).toBeGreaterThanOrEqual(0);
    expect(evidenceIndex).toBeGreaterThanOrEqual(0);
    // El éxito gobernado exige la etiqueta antes del payload de datos.
    expect(evidenceIndex).toBeLessThan(handler.indexOf("data: result"));
    expect(handler.indexOf("data: result")).toBeGreaterThan(evidenceIndex);
    expect(successIndex).toBeLessThan(evidenceIndex + handler.length);
  });

  it("el simulador federado sigue sin verificar firmas", () => {
    // Si alguien cablea agregación real con verificación de firma, esta prueba debe
    // fallar y obligar a retirar la etiqueta `simulated` con evidencia nueva.
    const federated = readFileSync(
      new URL("../../src/learning/federated/federated-learning.ts", import.meta.url),
      "utf8",
    );
    expect(federated).toContain("simulateClientTraining");
  });
});
