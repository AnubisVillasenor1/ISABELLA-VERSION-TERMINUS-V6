import { describe, expect, it } from "vitest";
import { parseMethodId } from "../../src/authority/method-id";

/**
 * Registro de arbitraje DIV-0001: los identificadores que CROWN usa como llave literal
 * del gate. Cambiar uno sin cambiar su descriptor rompe `callGate` con un 403 silencioso,
 * y un literal no canónico hace la capacidad inalcanzable. Estos tres casos fijan la
 * decisión y evitan que la forma antigua vuelva a colarse por copiar y pegar.
 */
const ARBITRATED_GATE_METHOD_IDS = [
  "A.COLLECTIVE_INTELLIGENCE.E14_COGNITIVE_SAFETY.mediate_isabella.v2.0.0.LOW.CONSTITUTIONAL",
  "A.COLLECTIVE_INTELLIGENCE.E19_CAPABILITY.invoke_hsf.v1.0.0.MEDIUM.INSTITUTIONAL",
  "A.TWINS.E20_EXECUTION.execute_pennylane.v1.0.0.MEDIUM.INSTITUTIONAL",
] as const;

describe("capacidades registradas en el gate de Isabella", () => {
  it.each(ARBITRATED_GATE_METHOD_IDS)("cumple el canon de 7 segmentos: %s", (methodId) => {
    expect(() => parseMethodId(methodId)).not.toThrow();
  });

  it("asigna la federación correcta a cada capacidad", () => {
    expect(parseMethodId(ARBITRATED_GATE_METHOD_IDS[0]).yun).toBe("COLLECTIVE_INTELLIGENCE");
    expect(parseMethodId(ARBITRATED_GATE_METHOD_IDS[1]).module).toBe("E19_CAPABILITY");
    expect(parseMethodId(ARBITRATED_GATE_METHOD_IDS[2]).tina).toBe("A");
    expect(parseMethodId(ARBITRATED_GATE_METHOD_IDS[2]).yun).toBe("TWINS");
  });

  it("rechaza las formas históricas que el canon nunca aceptó", () => {
    // "COGNITION" no es una federación y "QUANTUM" tampoco; ambas quedaron registradas
    // así en el gate y CROWN las bloqueaba antes de llegar al handler.
    expect(() => parseMethodId("A.COGNITION.E14_COGNITIVE_SAFETY.mediate_isabella.v2.0.0.LOW.CONSTITUTIONAL"))
      .toThrow(/federación desconocida/);
    expect(() => parseMethodId("Q.QUANTUM.E20_EXECUTION.execute_pennylane.v1.0.0.MEDIUM.INSTITUTIONAL"))
      .toThrow(/TINA tipo desconocido/);
  });
});
