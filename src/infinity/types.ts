/**
 * ISABELLA VILLASEÑOR AI™ — Master Consolidated (2026-11-01).
 * state: draft | engine-generated.
 *
 * Vocabulario de madurez compartido por los registros de la fusión maestra.
 * El invariante del repositorio se aplica sin excepciones:
 *
 *   SPECIFIED ≠ IMPLEMENTED ≠ TESTED ≠ VERIFIED ≠ PRODUCTION
 *   CAPABILITY ≠ AUTHORITY ≠ EXECUTION ≠ EVIDENCE
 *
 * `production` no se usa en ningún registro de esta fusión: nada aquí está
 * desplegado con rollback probado.
 */
export const MATURITY_STATES = [
  'research',
  'specified',
  'mapped',
  'implemented',
  'tested',
  'verified',
  'production',
] as const;

export type MaturityState = (typeof MATURITY_STATES)[number];

export const EVIDENCE_KINDS = ['module', 'test', 'document', 'observed'] as const;
export type EvidenceKind = (typeof EVIDENCE_KINDS)[number];

export interface EvidenceRef {
  readonly kind: EvidenceKind;
  readonly ref: string;
  /** What exactly the evidence proves. Never broader than the artifact. */
  readonly proves: string;
}

/** How a capability could act. `deterministic` never calls the network. */
export const EXECUTION_MODES = ['none', 'deterministic', 'external', 'human'] as const;
export type ExecutionMode = (typeof EXECUTION_MODES)[number];

export interface AuditIssue {
  readonly code: string;
  readonly subject: string;
  readonly detail: string;
}

export interface AuditReport {
  readonly ok: boolean;
  readonly issues: readonly AuditIssue[];
}

export function auditReport(issues: AuditIssue[]): AuditReport {
  return { ok: issues.length === 0, issues: Object.freeze(issues) };
}

export function isMaturityState(value: unknown): value is MaturityState {
  return typeof value === 'string' && (MATURITY_STATES as readonly string[]).includes(value);
}

export function isExecutionMode(value: unknown): value is ExecutionMode {
  return typeof value === 'string' && (EXECUTION_MODES as readonly string[]).includes(value);
}
