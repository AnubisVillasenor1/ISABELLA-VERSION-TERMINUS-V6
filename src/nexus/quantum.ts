/**
 * Nexus Quantum Simulator — statevector determinista para circuitos pequeños.
 * state: draft | engine-generated.
 *
 * Motivación tomada de PennyLane, TensorFlow Quantum y Quantum Katas: poder
 * ejecutar y verificar un circuito sin depender de un servicio externo. Este
 * simulador es local, acotado a 12 qubits y no sustituye a un backend real.
 *
 * Convenciones:
 * - `qubit: 0` es el bit menos significativo del índice base.
 * - La etiqueta de una base es `q{n-1}...q0` (el qubit 0 va al final).
 * - El muestreo usa un LCG sembrado: misma semilla, mismo resultado.
 */
import { createHash } from 'node:crypto';

export type NexusGateName = 'h' | 'x' | 'y' | 'z' | 's' | 't' | 'rx' | 'ry' | 'rz' | 'cnot' | 'cz';

export interface NexusGate {
  readonly gate: NexusGateName;
  readonly qubit?: number;
  readonly control?: number;
  readonly target?: number;
  readonly theta?: number;
}

export interface NexusCircuit {
  readonly qubits: number;
  readonly gates: readonly NexusGate[];
  readonly shots?: number;
  readonly seed?: number;
}

export interface Complex {
  readonly re: number;
  readonly im: number;
}

export interface SimulationResult {
  readonly ok: boolean;
  readonly qubits: number;
  readonly backend: 'isabella-statevector';
  readonly deterministic: true;
  readonly gateCount: number;
  readonly probabilities: Readonly<Record<string, number>>;
  /** P(qubit = 1) para cada qubit. */
  readonly marginals: readonly number[];
  /** ⟨Z⟩ para cada qubit: 1 - 2·P(1). */
  readonly expectationZ: readonly number[];
  readonly samples: Readonly<Record<string, number>> | null;
  readonly statevector: readonly Complex[];
  readonly circuitHash: string;
  readonly latencyMs: number;
  readonly error?: string;
}

const MAX_QUBITS = 12;
const MAX_GATES = 512;
const MAX_SHOTS = 4_096;

type Matrix2 = readonly [readonly [Complex, Complex], readonly [Complex, Complex]];

const ZERO: Complex = { re: 0, im: 0 };
const ONE: Complex = { re: 1, im: 0 };

function c(re: number, im = 0): Complex {
  return { re, im };
}

function add(a: Complex, b: Complex): Complex {
  return { re: a.re + b.re, im: a.im + b.im };
}

function mul(a: Complex, b: Complex): Complex {
  return { re: a.re * b.re - a.im * b.im, im: a.re * b.im + a.im * b.re };
}

function matrixFor(gate: NexusGate): Matrix2 | null {
  switch (gate.gate) {
    case 'h': {
      const s = Math.SQRT1_2;
      return [
        [c(s), c(s)],
        [c(s), c(-s)],
      ];
    }
    case 'x':
      return [
        [ZERO, ONE],
        [ONE, ZERO],
      ];
    case 'y':
      return [
        [ZERO, c(0, -1)],
        [c(0, 1), ZERO],
      ];
    case 'z':
      return [
        [ONE, ZERO],
        [ZERO, c(-1)],
      ];
    case 's':
      return [
        [ONE, ZERO],
        [ZERO, c(0, 1)],
      ];
    case 't': {
      const s = Math.SQRT1_2;
      return [
        [ONE, ZERO],
        [ZERO, c(s, s)],
      ];
    }
    case 'rx': {
      const theta = gate.theta ?? 0;
      const cos = Math.cos(theta / 2);
      const sin = Math.sin(theta / 2);
      return [
        [c(cos), c(0, -sin)],
        [c(0, -sin), c(cos)],
      ];
    }
    case 'ry': {
      const theta = gate.theta ?? 0;
      const cos = Math.cos(theta / 2);
      const sin = Math.sin(theta / 2);
      return [
        [c(cos), c(-sin)],
        [c(sin), c(cos)],
      ];
    }
    case 'rz': {
      const theta = gate.theta ?? 0;
      return [
        [c(Math.cos(-theta / 2), Math.sin(-theta / 2)), ZERO],
        [ZERO, c(Math.cos(theta / 2), Math.sin(theta / 2))],
      ];
    }
    default:
      return null;
  }
}

export function simulateCircuit(
  circuit: NexusCircuit,
  latencyStart = Date.now()
): SimulationResult {
  const startedAt = latencyStart;
  const empty = (error: string, qubits = 0): SimulationResult => ({
    ok: false,
    qubits,
    backend: 'isabella-statevector',
    deterministic: true,
    gateCount: 0,
    probabilities: {},
    marginals: [],
    expectationZ: [],
    samples: null,
    statevector: [],
    circuitHash: circuitHashOf(circuit),
    latencyMs: Math.max(1, Date.now() - startedAt),
    error,
  });

  if (!circuit || !Number.isInteger(circuit.qubits) || circuit.qubits < 1) {
    return empty('QUANTUM_QUBITS_INVALID');
  }
  if (circuit.qubits > MAX_QUBITS) return empty('QUANTUM_QUBITS_EXCEEDED', circuit.qubits);
  if (!Array.isArray(circuit.gates)) return empty('QUANTUM_GATES_INVALID', circuit.qubits);
  if (circuit.gates.length > MAX_GATES) return empty('QUANTUM_GATES_EXCEEDED', circuit.qubits);

  const dimension = 1 << circuit.qubits;
  const state: Complex[] = Array.from({ length: dimension }, (_, index) =>
    index === 0 ? ONE : ZERO
  );

  for (const gate of circuit.gates) {
    const validation = validateGate(gate, circuit.qubits);
    if (validation) return empty(validation, circuit.qubits);
    if (gate.gate === 'cnot') {
      applyControlledFlip(state, gate.control as number, gate.target as number, false);
      continue;
    }
    if (gate.gate === 'cz') {
      applyControlledFlip(state, gate.control as number, gate.target as number, true);
      continue;
    }
    const matrix = matrixFor(gate);
    if (!matrix) return empty('QUANTUM_GATE_UNSUPPORTED', circuit.qubits);
    applySingle(state, circuit.qubits, gate.qubit as number, matrix);
  }

  const probabilities: Record<string, number> = {};
  const marginals = Array.from({ length: circuit.qubits }, () => 0);
  for (let index = 0; index < dimension; index += 1) {
    const amplitude = state[index] as Complex;
    const probability = amplitude.re * amplitude.re + amplitude.im * amplitude.im;
    if (probability < 1e-12) continue;
    probabilities[basisLabel(index, circuit.qubits)] = Number(probability.toFixed(12));
    for (let qubit = 0; qubit < circuit.qubits; qubit += 1) {
      if ((index >> qubit) & 1) marginals[qubit] += probability;
    }
  }

  const shots =
    circuit.shots === undefined ? 0 : Math.min(MAX_SHOTS, Math.max(0, Math.floor(circuit.shots)));
  const samples = shots > 0 ? sampleBases(probabilities, shots, circuit.seed ?? 42) : null;
  const norm = Object.values(probabilities).reduce((total, value) => total + value, 0);

  return {
    ok: true,
    qubits: circuit.qubits,
    backend: 'isabella-statevector',
    deterministic: true,
    gateCount: circuit.gates.length,
    probabilities: normalize(probabilities, norm),
    marginals: marginals.map((value) => Number((value / (norm || 1)).toFixed(12))),
    expectationZ: marginals.map((value) => Number((1 - (2 * value) / (norm || 1)).toFixed(12))),
    samples,
    statevector: state.map((amplitude) => ({
      re: Number(amplitude.re.toFixed(12)),
      im: Number(amplitude.im.toFixed(12)),
    })),
    circuitHash: circuitHashOf(circuit),
    latencyMs: Math.max(1, Date.now() - startedAt),
  };
}

function validateGate(gate: NexusGate, qubits: number): string | null {
  const singleGates: NexusGateName[] = ['h', 'x', 'y', 'z', 's', 't', 'rx', 'ry', 'rz'];
  if (!gate || typeof gate.gate !== 'string') return 'QUANTUM_GATE_INVALID';
  if (gate.gate === 'cnot' || gate.gate === 'cz') {
    const control = gate.control;
    const target = gate.target;
    if (
      !Number.isInteger(control) ||
      !Number.isInteger(target) ||
      (control as number) < 0 ||
      (target as number) < 0 ||
      (control as number) >= qubits ||
      (target as number) >= qubits ||
      control === target
    ) {
      return 'QUANTUM_CONTROL_TARGET_INVALID';
    }
    return null;
  }
  if (!singleGates.includes(gate.gate)) return 'QUANTUM_GATE_UNSUPPORTED';
  if (
    !Number.isInteger(gate.qubit) ||
    (gate.qubit as number) < 0 ||
    (gate.qubit as number) >= qubits
  ) {
    return 'QUANTUM_QUBIT_OUT_OF_RANGE';
  }
  if (gate.gate === 'rx' || gate.gate === 'ry' || gate.gate === 'rz') {
    if (typeof gate.theta !== 'number' || !Number.isFinite(gate.theta)) {
      return 'QUANTUM_THETA_INVALID';
    }
  }
  return null;
}

function applySingle(state: Complex[], qubits: number, qubit: number, matrix: Matrix2): void {
  const bit = 1 << qubit;
  const dimension = 1 << qubits;
  const [[m00, m01], [m10, m11]] = matrix;
  for (let index = 0; index < dimension; index += 1) {
    if ((index & bit) !== 0) continue;
    const other = index | bit;
    const a = state[index] as Complex;
    const b = state[other] as Complex;
    state[index] = add(mul(m00, a), mul(m01, b));
    state[other] = add(mul(m10, a), mul(m11, b));
  }
}

function applyControlledFlip(
  state: Complex[],
  control: number,
  target: number,
  phaseOnly: boolean
): void {
  const controlBit = 1 << control;
  const targetBit = 1 << target;
  const dimension = state.length;
  if (phaseOnly) {
    for (let index = 0; index < dimension; index += 1) {
      if ((index & controlBit) !== 0 && (index & targetBit) !== 0) {
        const amplitude = state[index] as Complex;
        state[index] = c(-amplitude.re, -amplitude.im);
      }
    }
    return;
  }
  for (let index = 0; index < dimension; index += 1) {
    if ((index & controlBit) === 0 || (index & targetBit) !== 0) continue;
    const other = index | targetBit;
    const a = state[index] as Complex;
    state[index] = state[other] as Complex;
    state[other] = a;
  }
}

function basisLabel(index: number, qubits: number): string {
  let label = '';
  for (let qubit = qubits - 1; qubit >= 0; qubit -= 1) {
    label += (index >> qubit) & 1 ? '1' : '0';
  }
  return label;
}

function sampleBases(
  probabilities: Readonly<Record<string, number>>,
  shots: number,
  seed: number
): Record<string, number> {
  const entries = Object.entries(probabilities).sort(([a], [b]) => (a < b ? -1 : 1));
  const total = entries.reduce((sum, [, probability]) => sum + probability, 0);
  if (total <= 0) return {};
  const random = lcg(seed);
  const counts: Record<string, number> = {};
  for (let shot = 0; shot < shots; shot += 1) {
    let threshold = random() * total;
    let chosen = entries[entries.length - 1]?.[0] ?? '0';
    for (const [basis, probability] of entries) {
      threshold -= probability;
      if (threshold <= 0) {
        chosen = basis;
        break;
      }
    }
    counts[chosen] = (counts[chosen] ?? 0) + 1;
  }
  return counts;
}

function lcg(seed: number): () => number {
  let value = Math.abs(Math.floor(seed)) % 2 ** 31 || 1;
  return () => {
    value = (value * 48_271) % 2 ** 31;
    return value / 2 ** 31;
  };
}

function normalize(
  probabilities: Readonly<Record<string, number>>,
  norm: number
): Record<string, number> {
  if (norm <= 0 || Math.abs(norm - 1) < 1e-9) return { ...probabilities };
  return Object.fromEntries(
    Object.entries(probabilities).map(([basis, probability]) => [
      basis,
      Number((probability / norm).toFixed(12)),
    ])
  );
}

export function circuitHashOf(circuit: NexusCircuit): string {
  try {
    return createHash('sha256')
      .update(
        JSON.stringify([
          circuit?.qubits,
          circuit?.gates?.map((gate) => [
            gate.gate,
            gate.qubit,
            gate.control,
            gate.target,
            gate.theta,
          ]),
        ])
      )
      .digest('hex');
  } catch {
    return createHash('sha256').update('invalid-circuit').digest('hex');
  }
}

/** Verificación tipo kata: probabilidades normalizadas y sin amplitudes negativas. */
export function verifySimulation(result: SimulationResult, tolerance = 1e-6): boolean {
  if (!result.ok) return false;
  const total = Object.values(result.probabilities).reduce((sum, value) => sum + value, 0);
  if (Math.abs(total - 1) > tolerance) return false;
  return Object.values(result.probabilities).every((value) => value >= 0 && value <= 1);
}
