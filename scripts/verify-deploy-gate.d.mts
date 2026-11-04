/** Tipos públicos de scripts/verify-deploy-gate.mjs. */

export interface ProductionEvidence {
  typecheck?: { ok?: boolean };
  tests?: { failed?: number; total?: number; parsed?: boolean; success?: boolean };
  gate?: { ok?: boolean };
  headCommit?: string;
}

export interface SecuritySuite {
  summary?: { ok?: boolean; failed?: number };
}

/** Un `.spdx.json` del directorio de artefactos: nombre tal cual y su JSON ya leído. */
export interface SbomArtifact {
  file: string;
  /** null cuando el archivo no existe como JSON legible. */
  doc: unknown;
}

export interface GateInput {
  evidence?: ProductionEvidence | null;
  security?: SecuritySuite | null;
  sboms?: SbomArtifact[];
  expectedSha?: string;
}

export interface GateVerdict {
  ok: boolean;
  problems: string[];
}

export declare const EVIDENCE_FILE = 'production-evidence.json';
export declare const SECURITY_FILE = 'security-suite.json';
export declare const SBOM_SUFFIX = '.spdx.json';

export function expectedShaFrom(argv: string[], env: Record<string, string | undefined>): string;
export function evaluateGate(input: GateInput): GateVerdict;
export function readDir(dir: string): Required<Pick<GateInput, 'evidence' | 'security' | 'sboms'>>;
export function main(): number;
