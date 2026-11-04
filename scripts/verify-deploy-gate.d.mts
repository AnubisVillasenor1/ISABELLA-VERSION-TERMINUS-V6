/** Tipos públicos de scripts/verify-deploy-gate.mjs. */

export interface ProductionEvidence {
  typecheck?: { ok?: boolean };
  tests?: { failed?: number };
  gate?: { ok?: boolean };
}

export interface SecuritySuite {
  summary?: { ok?: boolean; failed?: number };
}

export interface GateInput {
  evidence?: ProductionEvidence | null;
  security?: SecuritySuite | null;
  sbomFiles?: string[];
}

export interface GateVerdict {
  ok: boolean;
  problems: string[];
}

export declare const EVIDENCE_FILE = 'production-evidence.json';
export declare const SECURITY_FILE = 'security-suite.json';

export function evaluateGate(input: GateInput): GateVerdict;
export function readDir(dir: string): GateInput;
export function main(): number;
