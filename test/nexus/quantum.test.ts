// state: draft | engine-generated — pruebas del simulador cuántico Nexus.
import { describe, expect, it } from 'vitest';
import { simulateCircuit, verifySimulation } from '../../src/nexus/quantum';

describe('Nexus quantum simulator', () => {
  it('crea un estado de Bell con dos resultados equiprobables', () => {
    const result = simulateCircuit({
      qubits: 2,
      gates: [
        { gate: 'h', qubit: 0 },
        { gate: 'cnot', control: 0, target: 1 },
      ],
    });
    expect(result.ok).toBe(true);
    expect(result.probabilities['00']).toBeCloseTo(0.5, 9);
    expect(result.probabilities['11']).toBeCloseTo(0.5, 9);
    expect(result.probabilities['01']).toBeUndefined();
    expect(result.marginals).toEqual([0.5, 0.5]);
    expect(verifySimulation(result)).toBe(true);
  });

  it('aplica X y coloca el qubit en |1>', () => {
    const result = simulateCircuit({ qubits: 1, gates: [{ gate: 'x', qubit: 0 }] });
    expect(result.probabilities['1']).toBeCloseTo(1, 9);
    expect(result.expectationZ[0]).toBeCloseTo(-1, 9);
  });

  it('respeta la rotación RY', () => {
    const result = simulateCircuit({
      qubits: 1,
      gates: [{ gate: 'ry', qubit: 0, theta: Math.PI / 2 }],
    });
    expect(result.probabilities['0']).toBeCloseTo(0.5, 9);
    expect(result.probabilities['1']).toBeCloseTo(0.5, 9);
  });

  it('muestrea de forma determinista con la misma semilla', () => {
    const circuit = {
      qubits: 2,
      gates: [
        { gate: 'h' as const, qubit: 0 },
        { gate: 'h' as const, qubit: 1 },
      ],
      shots: 200,
      seed: 123,
    };
    const a = simulateCircuit(circuit);
    const b = simulateCircuit(circuit);
    expect(a.samples).toEqual(b.samples);
    const total = Object.values(a.samples ?? {}).reduce((sum, value) => sum + value, 0);
    expect(total).toBe(200);
  });

  it('rechaza circuitos inválidos con códigos estables', () => {
    expect(simulateCircuit({ qubits: 0, gates: [] }).error).toBe('QUANTUM_QUBITS_INVALID');
    expect(simulateCircuit({ qubits: 13, gates: [] }).error).toBe('QUANTUM_QUBITS_EXCEEDED');
    expect(
      simulateCircuit({ qubits: 2, gates: [{ gate: 'cnot', control: 1, target: 1 }] }).error
    ).toBe('QUANTUM_CONTROL_TARGET_INVALID');
    expect(simulateCircuit({ qubits: 1, gates: [{ gate: 'h', qubit: 3 }] }).error).toBe(
      'QUANTUM_QUBIT_OUT_OF_RANGE'
    );
  });

  it('normaliza y expone hash reproducible del circuito', () => {
    const circuit = { qubits: 1, gates: [{ gate: 'h' as const, qubit: 0 }] };
    const a = simulateCircuit(circuit);
    const b = simulateCircuit(circuit);
    expect(a.circuitHash).toBe(b.circuitHash);
    expect(Object.values(a.probabilities).reduce((sum, value) => sum + value, 0)).toBeCloseTo(1, 9);
  });
});
