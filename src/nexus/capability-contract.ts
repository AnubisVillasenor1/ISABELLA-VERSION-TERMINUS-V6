/**
 * CAPABILITY CONTRACT (NEXUS ∞) — src/nexus/capability-contract.ts
 * state: draft | engine-generated — revisión humana pendiente.
 *
 * Un plugin, skill, agente, API o herramienta MCP no se registra aquí como
 * «herramienta»: se registra como CAPACIDAD con procedencia, límites, gobierno,
 * aseguración y reversión. Este módulo define el contrato y calcula su confianza;
 * no ejecuta nada (eso vive en `capability-engine.ts`).
 *
 * Reglas que no se negocian (AGENTS.md §1 y §4):
 * - Ningún número de confianza sale de `Math.random` ni de un default cortés. Cada
 *   término proviene de un hecho observable: formato verificable, archivo que existe
 *   en el árbol, salud medida por el monitor o riesgo declarado por el registro.
 * - Si un hecho_required no es observable, el contrato NO se aprueba: se cuarentena
 *   o queda en `shadow`. La ausencia de evidencia nunca suma confianza.
 * - El riesgo efectivo es `max(riesgo del contrato, riesgo del registro)`: un
 *   contrato nunca puede rebajar una garantía ya declarada en el registro.
 * - La proyección a `CapabilityState` usa la taxonomía canónica de
 *   `src/lib/lib/capability-registry.ts`; no se inventa una escalera paralela.
 */
import { createHash } from 'node:crypto';
import { existsSync, readdirSync } from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';
import { z } from 'zod';
import type { CapabilityState } from '../lib/lib/capability-registry';
import type { ToolRisk } from './tool-registry';

export const CAPABILITY_CONTRACT_VERSION = '1.0.0' as const;

/** Grados de autonomía del marco: de lectura (A0) a acción irreversible (A5). */
export const AUTONOMY_LEVELS = ['A0', 'A1', 'A2', 'A3', 'A4', 'A5'] as const;
export type AutonomyLevel = (typeof AUTONOMY_LEVELS)[number];

/** Ciclo de vida del contrato. Distinto del peldaño de madurez (`CapabilityState`). */
export const CONTRACT_STATUSES = ['draft', 'quarantined', 'shadow', 'approved', 'retired'] as const;
export type ContractStatus = (typeof CONTRACT_STATUSES)[number];

export const CONTRACT_SOURCE_TYPES = [
  'documentation',
  'code',
  'api',
  'mcp',
  'model',
  'internal',
] as const;

const SHA256_DIGEST = /^sha256:[0-9a-f]{64}$/;
const PLACEHOLDERISH = /^(todo|unknown|unknown-license|n\/a|na|tbd|xxxx|<[^<>\s]{2,}>)/i;
const HOSTNAME = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/i;

/** Techo duro del runtime: un contrato no puede pedirse más de lo que el plano permite. */
export const CONTRACT_CEILINGS = Object.freeze({
  timeoutMs: 30_000,
  memoryMb: 512,
  maxInputBytes: 65_536,
  maxOutputBytes: 262_144,
  /** A4/A5 implican gasto, contrato o acción irreversible: no los ejecuta este motor. */
  executableAutonomy: 'A3' as AutonomyLevel,
});

export const CapabilitySourceSchema = z
  .object({
    type: z.enum(CONTRACT_SOURCE_TYPES),
    uri: z.string().min(3),
    digest: z.string().regex(SHA256_DIGEST, 'digest must be sha256:<64 hex>'),
    license: z.string().min(2),
  })
  .strict()
  .superRefine((source, ctx) => {
    // Un `TODO` bien formateado sigue siendo un `TODO`: la procedencia se declara
    // con datos reales o el contrato no existe.
    if (PLACEHOLDERISH.test(source.uri.trim())) {
      ctx.addIssue({
        code: 'custom',
        message: 'source uri looks like a placeholder',
        path: ['uri'],
      });
    }
    if (PLACEHOLDERISH.test(source.license.trim())) {
      ctx.addIssue({
        code: 'custom',
        message: 'source license looks like a placeholder',
        path: ['license'],
      });
    }
  });
export type CapabilitySource = z.infer<typeof CapabilitySourceSchema>;

export const CapabilityExecutionSchema = z
  .object({
    timeoutMs: z.number().int().min(1).max(CONTRACT_CEILINGS.timeoutMs),
    memoryMb: z.number().int().min(1).max(CONTRACT_CEILINGS.memoryMb),
    maxInputBytes: z.number().int().min(1).max(CONTRACT_CEILINGS.maxInputBytes),
    maxOutputBytes: z.number().int().min(1).max(CONTRACT_CEILINGS.maxOutputBytes),
    network: z.enum(['none', 'allowlist']),
    allowedHosts: z.array(z.string()),
  })
  .strict()
  .superRefine((execution, ctx) => {
    if (execution.network === 'allowlist' && execution.allowedHosts.length === 0) {
      ctx.addIssue({
        code: 'custom',
        message: 'network=allowlist requires at least one allowedHosts entry',
        path: ['allowedHosts'],
      });
    }
    if (execution.network === 'none' && execution.allowedHosts.length > 0) {
      ctx.addIssue({
        code: 'custom',
        message: 'network=none cannot declare allowed hosts',
        path: ['allowedHosts'],
      });
    }
    for (const [index, host] of execution.allowedHosts.entries()) {
      if (!HOSTNAME.test(host)) {
        ctx.addIssue({
          code: 'custom',
          message: 'allowed host must be a bare hostname without scheme or wildcard',
          path: ['allowedHosts', index],
        });
      }
    }
  });
export type CapabilityExecution = z.infer<typeof CapabilityExecutionSchema>;

export const CapabilityGovernanceSchema = z
  .object({
    autonomy: z.enum(AUTONOMY_LEVELS),
    dataClasses: z.array(z.string().min(2)).min(1),
    privacyBudget: z.number().min(0).max(1),
    reversible: z.boolean(),
    approvalRequired: z.boolean(),
  })
  .strict()
  .superRefine((governance, ctx) => {
    // El plano exige aprobación server-side a partir de A3; un contrato más laxo
    // no debilita el plano, se rechaza en el esquema.
    if (autonomyRank(governance.autonomy) >= autonomyRank('A3') && !governance.approvalRequired) {
      ctx.addIssue({
        code: 'custom',
        message: 'autonomy A3+ requires approvalRequired',
        path: ['approvalRequired'],
      });
    }
    for (const [index, dataClass] of governance.dataClasses.entries()) {
      if (PLACEHOLDERISH.test(dataClass.trim())) {
        ctx.addIssue({
          code: 'custom',
          message: 'data class looks like a placeholder',
          path: ['dataClasses', index],
        });
      }
    }
  });
export type CapabilityGovernance = z.infer<typeof CapabilityGovernanceSchema>;

export const CapabilityAssuranceSchema = z
  .object({
    /** Rutas de prueba del repositorio. Deben existir: se comprueba, no se cree. */
    testFiles: z.array(z.string().min(1)).min(1),
    coverage: z.number().min(0).max(1),
    /** Autodeclarado hasta que un humano firma; `reviewedBy` cambia el peldaño. */
    reviewedBy: z.string().min(2).optional(),
    reviewedAt: z.string().min(8).optional(),
  })
  .strict()
  .superRefine((assurance, ctx) => {
    if (Boolean(assurance.reviewedBy) !== Boolean(assurance.reviewedAt)) {
      ctx.addIssue({
        code: 'custom',
        message: 'reviewedBy and reviewedAt must be declared together',
        path: ['reviewedBy'],
      });
    }
  });
export type CapabilityAssurance = z.infer<typeof CapabilityAssuranceSchema>;

export const CapabilityRollbackSchema = z
  .object({
    strategy: z.enum(['compensating-tool', 'none-declared']),
    toolId: z.string().optional(),
    note: z.string().min(10),
  })
  .strict()
  .superRefine((rollback, ctx) => {
    if (rollback.strategy === 'compensating-tool' && !rollback.toolId) {
      ctx.addIssue({
        code: 'custom',
        message: 'compensating-tool rollback requires the toolId that undoes it',
        path: ['toolId'],
      });
    }
    if (rollback.strategy === 'none-declared' && rollback.toolId) {
      ctx.addIssue({
        code: 'custom',
        message: 'none-declared rollback cannot name a compensating tool',
        path: ['toolId'],
      });
    }
  });
export type CapabilityRollback = z.infer<typeof CapabilityRollbackSchema>;

/** La parte serializable del contrato, validable y huellable. */
export const CapabilityContractBodySchema = z
  .object({
    id: z.string().regex(/^[a-z][a-z0-9.]{6,120}$/),
    version: z.string().regex(/^\d+\.\d+\.\d+$/),
    domain: z.string().min(2),
    description: z.string().min(10),
    /** Enlace al registro gobernado: la capacidad se ejecuta por esa herramienta. */
    toolId: z.string().regex(/^[a-z][a-z0-9.]{2,63}$/),
    riskTier: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
    source: CapabilitySourceSchema,
    execution: CapabilityExecutionSchema,
    governance: CapabilityGovernanceSchema,
    assurance: CapabilityAssuranceSchema,
    rollback: CapabilityRollbackSchema,
  })
  .strict();
export type CapabilityContractBody = z.infer<typeof CapabilityContractBodySchema>;

export interface CapabilityContractDefinition {
  readonly body: CapabilityContractBody;
  /** Esquemas reales de zod: validar de verdad, no describir un JSON Schema ajeno. */
  readonly inputSchema: z.ZodType<unknown>;
  readonly outputSchema: z.ZodType<unknown>;
}

export interface CapabilityContract {
  readonly id: string;
  readonly fingerprint: string;
  readonly body: CapabilityContractBody;
  readonly inputSchema: z.ZodType<unknown>;
  readonly outputSchema: z.ZodType<unknown>;
  /** Resumen legible de los esquemas, para la superficie de descripción. */
  readonly inputSummary: string;
  readonly outputSummary: string;
}

export function autonomyRank(level: AutonomyLevel): number {
  return AUTONOMY_LEVELS.indexOf(level);
}

const RISK_RANK: Record<ToolRisk, number> = { LOW: 0, MEDIUM: 1, HIGH: 2, CRITICAL: 3 };

/** El peor de los dos riesgos: el contrato no puede rebajar lo que dicta el registro. */
export function effectiveRiskTier(declared: ToolRisk, registered: ToolRisk): ToolRisk {
  return RISK_RANK[registered] >= RISK_RANK[declared] ? registered : declared;
}

function canonical(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value) ?? 'null';
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  const record = value as Record<string, unknown>;
  return `{${Object.keys(record)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${canonical(record[key])}`)
    .join(',')}}`;
}

function shortSummary(schema: z.ZodType<unknown>): string {
  const description = schema.description;
  if (typeof description === 'string' && description.length > 0) return description.slice(0, 160);
  const typeName = (schema as unknown as { typeName?: string }).typeName;
  return typeName ?? 'zod-schema';
}

/**
 * Construye el contrato. Un esquema inválido aborta: no existe «contrato a medias»
 * que después la superficie HTTP intente gobernar.
 */
export function defineCapabilityContract(
  definition: CapabilityContractDefinition
): CapabilityContract {
  const body = CapabilityContractBodySchema.parse(definition.body);
  const fingerprint = createHash('sha256')
    .update(`isa-capability:${CAPABILITY_CONTRACT_VERSION}:${canonical(body)}`)
    .digest('hex')
    .slice(0, 32);
  return Object.freeze({
    id: body.id,
    fingerprint,
    body,
    inputSchema: definition.inputSchema,
    outputSchema: definition.outputSchema,
    inputSummary: shortSummary(definition.inputSchema),
    outputSummary: shortSummary(definition.outputSchema),
  });
}

/** Hechos observables que alimentan la confianza. Nada de estos entra «a ojo». */
export interface CapabilityEvidenceFacts {
  readonly repoRoot: string;
  /** descriptor del registro gobernado; `null` si la herramienta no está registrada. */
  readonly registeredRisk: ToolRisk | null;
  readonly registeredRequiresApproval: boolean;
  /** salud medida por el monitor antifrágil; `null` si nunca se ejecutó. */
  readonly observedSamples: number | null;
  readonly observedSuccessRate: number | null;
  readonly observedCircuit: 'closed' | 'open' | 'half-open' | null;
}

export interface TrustTerm {
  readonly weight: number;
  readonly score: number;
  readonly observed: boolean;
  readonly basis: string;
}

export interface TrustVector {
  readonly provenance: TrustTerm;
  readonly tests: TrustTerm;
  readonly reputation: TrustTerm;
  readonly risk: TrustTerm;
  readonly compliance: TrustTerm;
  /** Suma ponderada sobre los términos observados, renormalizada y reportada tal cual. */
  readonly score: number;
  readonly observedWeight: number;
  readonly reasons: readonly string[];
}

const WEIGHTS = Object.freeze({
  provenance: 0.25,
  tests: 0.2,
  reputation: 0.2,
  risk: 0.2,
  compliance: 0.15,
});

/** Ruta del repositorio, con glob simple en el segmento final (`dir/*`). */
function resolveRepoPath(repoRoot: string, claim: string): boolean {
  if (claim.includes('..') || claim.startsWith('/') || /^[A-Za-z]:/.test(claim)) return false;
  if (!claim.includes('*')) return existsSync(resolve(repoRoot, claim));
  const pattern = new RegExp(
    '^' +
      basename(claim)
        .replace(/[.+?^${}()|[\]\\]/g, '\\$&')
        .replace(/\*/g, '.*') +
      '$'
  );
  try {
    return readdirSync(join(repoRoot, dirname(claim))).some((entry) => pattern.test(entry));
  } catch {
    return false;
  }
}

function provenanceTerm(source: CapabilitySource): TrustTerm {
  const checks = [
    !PLACEHOLDERISH.test(source.uri.trim()),
    SHA256_DIGEST.test(source.digest),
    !PLACEHOLDERISH.test(source.license.trim()),
    CONTRACT_SOURCE_TYPES.includes(source.type),
  ];
  const passed = checks.filter(Boolean).length;
  return {
    weight: WEIGHTS.provenance,
    score: passed / checks.length,
    observed: true,
    basis: `${passed}/${checks.length} controles de procedencia superados (uri, digest sha256, licencia, tipo)`,
  };
}

function testsTerm(assurance: CapabilityAssurance, repoRoot: string): TrustTerm {
  const resolved = assurance.testFiles.filter((file) => resolveRepoPath(repoRoot, file));
  return {
    weight: WEIGHTS.tests,
    score: resolved.length / assurance.testFiles.length,
    observed: true,
    basis: `${resolved.length}/${assurance.testFiles.length} archivos de prueba existen en el árbol`,
  };
}

function reputationTerm(facts: CapabilityEvidenceFacts): TrustTerm {
  const { observedSamples, observedSuccessRate, observedCircuit } = facts;
  if (observedSamples === null || observedSuccessRate === null || observedCircuit === null) {
    return {
      weight: WEIGHTS.reputation,
      score: 0,
      observed: false,
      basis: 'sin ejecuciones medidas: la reputación no se presume',
    };
  }
  if (observedSamples < MIN_REPUTATION_SAMPLES) {
    return {
      weight: WEIGHTS.reputation,
      score: 0,
      observed: false,
      basis: `${observedSamples} muestra(s): se requieren ${MIN_REPUTATION_SAMPLES} para medir reputación`,
    };
  }
  const circuitFactor = observedCircuit === 'open' ? 0.5 : 1;
  return {
    weight: WEIGHTS.reputation,
    score: observedSuccessRate * circuitFactor,
    observed: true,
    basis: `tasa de éxito ${observedSuccessRate.toFixed(3)} sobre ${observedSamples} llamadas (cortocircuito ${observedCircuit})`,
  };
}

export const MIN_REPUTATION_SAMPLES = 3;
export const APPROVAL_TRUST_THRESHOLD = 0.7;

function riskTerm(effective: ToolRisk): TrustTerm {
  return {
    weight: WEIGHTS.risk,
    score: 1 - RISK_RANK[effective] / 3,
    observed: true,
    basis: `riesgo efectivo ${effective}`,
  };
}

/**
 * Cinco comprobaciones que el esquema NO puede resolver por sí solo: relacionan el
 * contrato con el registro gobernado. Cada una es falsable; una tautología sería
 * relleno de confianza y este plano la rechaza.
 */
function complianceTerm(
  contract: CapabilityContract,
  effective: ToolRisk,
  facts: CapabilityEvidenceFacts
): TrustTerm {
  const { governance, assurance } = contract.body;
  const rank = autonomyRank(governance.autonomy);
  const checks: ReadonlyArray<readonly [string, boolean]> = [
    ['approval-matches-registry', !facts.registeredRequiresApproval || governance.approvalRequired],
    [
      'risk-caps-autonomy',
      !(rank > autonomyRank('A2') && (effective === 'HIGH' || effective === 'CRITICAL')),
    ],
    [
      'personal-data-budget',
      !governance.dataClasses.includes('personal') ||
        (governance.reversible && governance.privacyBudget <= 0.5),
    ],
    [
      'escalation-has-compensation',
      rank <= autonomyRank('A2') ||
        governance.reversible ||
        contract.body.rollback.strategy === 'compensating-tool',
    ],
    ['coverage-measured', assurance.coverage > 0],
  ];
  const failed = checks.filter(([, passed]) => !passed).map(([name]) => name);
  return {
    weight: WEIGHTS.compliance,
    score: (checks.length - failed.length) / checks.length,
    observed: true,
    basis:
      failed.length === 0
        ? `${checks.length}/${checks.length} obligaciones de gobierno conformes`
        : `obligaciones no conformes: ${failed.join(', ')}`,
  };
}

export function computeTrustVector(
  contract: CapabilityContract,
  facts: CapabilityEvidenceFacts
): TrustVector {
  const provenance = provenanceTerm(contract.body.source);
  const tests = testsTerm(contract.body.assurance, facts.repoRoot);
  const reputation = reputationTerm(facts);
  const effective =
    facts.registeredRisk === null
      ? contract.body.riskTier
      : effectiveRiskTier(contract.body.riskTier, facts.registeredRisk);
  const risk = riskTerm(effective);
  const compliance = complianceTerm(contract, effective, facts);
  const terms = { provenance, tests, reputation, risk, compliance };

  let weighted = 0;
  let observedWeight = 0;
  for (const term of Object.values(terms)) {
    weighted += term.score * term.weight;
    observedWeight += term.observed ? term.weight : 0;
  }
  const score = observedWeight === 0 ? 0 : Number((weighted / observedWeight).toFixed(4));

  const reasons: string[] = [];
  if (facts.registeredRisk === null) {
    reasons.push('TOOL_NOT_REGISTERED: la capacidad no está enlazada a una herramienta gobernada');
  }
  if (provenance.score < 1) reasons.push(`PROVENANCE_INCOMPLETE: ${provenance.basis}`);
  if (tests.score < 1) reasons.push(`TESTS_MISSING: ${tests.basis}`);
  if (!reputation.observed) reasons.push(`REPUTATION_UNOBSERVED: ${reputation.basis}`);
  if (compliance.score < 1) reasons.push(`COMPLIANCE_GAP: ${compliance.basis}`);

  return Object.freeze({
    provenance,
    tests,
    reputation,
    risk,
    compliance,
    score,
    observedWeight,
    reasons: Object.freeze(reasons),
  });
}

export interface ContractDecision {
  readonly status: ContractStatus;
  readonly trust: TrustVector;
  readonly reasons: readonly string[];
  readonly state: CapabilityState;
}

/**
 * Veredicto fail-closed. El orden importa: primero lo que impide la existencia,
 * después lo que impide la aprobación.
 */
export function decideContractStatus(
  contract: CapabilityContract,
  facts: CapabilityEvidenceFacts
): ContractDecision {
  const trust = computeTrustVector(contract, facts);
  const blocking: string[] = [];

  if (facts.registeredRisk === null) blocking.push('TOOL_NOT_REGISTERED');
  if (trust.provenance.score < 0.75) blocking.push('PROVENANCE_BELOW_CEILING');
  if (trust.tests.score < 1) blocking.push('TEST_FILES_UNRESOLVED');
  if (
    autonomyRank(contract.body.governance.autonomy) >= autonomyRank('A3') &&
    !contract.body.governance.reversible &&
    contract.body.rollback.strategy === 'none-declared'
  ) {
    blocking.push('IRREVERSIBLE_ACTION_WITHOUT_COMPENSATION');
  }
  if (contract.body.riskTier === 'CRITICAL')
    blocking.push('CRITICAL_RISK_REQUIRES_HUMAN_DEPLOYMENT');

  if (blocking.length > 0) {
    return { status: 'quarantined', trust, reasons: Object.freeze(blocking), state: 'unavailable' };
  }
  if (contract.body.governance.autonomy === 'A0') {
    // Solo lectura y análisis: no necesita reputación medida para existir, pero nunca
    // se afirma más allá de `implemented`.
    return {
      status: 'approved',
      trust,
      reasons: trust.reasons,
      state: toCapabilityState('approved', contract),
    };
  }
  if (!trust.reputation.observed) {
    return {
      status: 'shadow',
      trust,
      reasons: Object.freeze([
        'SHADOW_UNTIL_OBSERVED: sin ejecuciones medidas; la capacidad no se aprueba por declaración',
        ...trust.reasons,
      ]),
      state: 'shadow',
    };
  }
  if (trust.score < APPROVAL_TRUST_THRESHOLD) {
    return {
      status: 'quarantined',
      trust,
      reasons: Object.freeze([
        `TRUST_BELOW_THRESHOLD: ${trust.score} < ${APPROVAL_TRUST_THRESHOLD}`,
      ]),
      state: 'unavailable',
    };
  }
  return {
    status: 'approved',
    trust,
    reasons: trust.reasons,
    state: toCapabilityState('approved', contract),
  };
}

/**
 * Proyección a la taxonomía canónica. `verified` exige la firma humana de
 * AGENTS.md §7: nunca la otorga un cálculo.
 */
export function toCapabilityState(
  status: ContractStatus,
  contract: CapabilityContract
): CapabilityState {
  switch (status) {
    case 'retired':
    case 'quarantined':
      return 'unavailable';
    case 'draft':
      return 'planned';
    case 'shadow':
      return 'shadow';
    case 'approved':
      return contract.body.assurance.reviewedBy ? 'verified' : 'implemented';
    default:
      return 'unavailable';
  }
}

export function describeContract(contract: CapabilityContract) {
  return {
    id: contract.id,
    fingerprint: contract.fingerprint,
    version: contract.body.version,
    domain: contract.body.domain,
    description: contract.body.description,
    toolId: contract.body.toolId,
    riskTier: contract.body.riskTier,
    source: contract.body.source,
    execution: contract.body.execution,
    governance: contract.body.governance,
    assurance: {
      testFiles: contract.body.assurance.testFiles,
      coverage: contract.body.assurance.coverage,
      reviewedBy: contract.body.assurance.reviewedBy ?? null,
    },
    rollback: contract.body.rollback,
    inputSchema: contract.inputSummary,
    outputSchema: contract.outputSummary,
  };
}
