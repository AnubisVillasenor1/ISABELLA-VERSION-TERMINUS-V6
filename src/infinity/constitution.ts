/**
 * ISABELLA VILLASEÑOR AI™ — motor constitucional determinista.
 * state: draft | engine-generated.
 *
 * Fuente: `ISABELLA_VILLASENOR_AI_MASTER_CONSOLIDATED.docx`, secciones 19–21.
 *
 *   ALLOW = IDENTITY × AUTHORITY × POLICY × EVIDENCE × SAFETY
 *
 * Si un vector es nulo, la acción se deniega. El motor evalúa; no ejecuta, no
 * concede autoridad y no sustituye una aprobación humana verificada fuera de
 * esta función.
 */
import { createHash } from 'node:crypto';

export type SecurityVectorName = 'identity' | 'authority' | 'policy' | 'evidence' | 'safety';

export const SECURITY_VECTORS: readonly SecurityVectorName[] = [
  'identity',
  'authority',
  'policy',
  'evidence',
  'safety',
];

export type SecurityVectors = Readonly<Record<SecurityVectorName, boolean>>;

export type DomainAction =
  | 'create'
  | 'supplant'
  | 'fraud'
  | 'unauthorized_access'
  | 'evidence_destruction'
  | 'deploy'
  | 'payment'
  | 'ingest'
  | 'learn'
  | 'execute';

export type ConstitutionalVerdict = 'ALLOW' | 'DENY';

export interface IngestionDeclaration {
  readonly sourceId?: string;
  readonly sourceUri?: string;
  readonly license?: string;
  readonly provenance?: string;
  readonly containsUnauthorizedPii?: boolean;
  readonly robotsAllowed?: boolean;
  readonly controlEvasion?: boolean;
  readonly rightToBeForgotten?: boolean;
  readonly authorityRecognized?: boolean;
  readonly bookpiSignature?: string;
  readonly quarantined?: boolean;
  readonly requiresHumanReview?: boolean;
  readonly humanReviewGranted?: boolean;
}

export type LearningOperation =
  'study' | 'copy' | 'ingest_without_permission' | 'train_without_license';

export interface ConstitutionalRequest {
  readonly action: DomainAction;
  readonly vectors: Partial<SecurityVectors>;
  /** Decided server-side before this call. A request body cannot set it. */
  readonly humanApproval?: boolean;
  readonly license?: string | null;
  readonly ingestion?: IngestionDeclaration;
  readonly learning?: { readonly operation: LearningOperation; readonly license?: string | null };
}

export interface ConstitutionalDecision {
  readonly verdict: ConstitutionalVerdict;
  readonly allowed: boolean;
  readonly action: DomainAction;
  readonly rule: string;
  readonly blockedBy: readonly string[];
  /** Product of the five boolean vectors: 1 only if all are true. */
  readonly vectorProduct: 0 | 1;
  readonly humanApprovalRequired: boolean;
  readonly humanApprovalPresent: boolean;
  readonly note: string;
}

const FORBIDDEN: Readonly<Record<string, string>> = {
  supplant: 'SUPPLANTAR exige consentimiento explícito y no se autoriza por este motor.',
  fraud: 'FRAUDE es bloqueo absoluto.',
  unauthorized_access: 'ACCESO NO AUTORIZADO es bloqueo absoluto.',
  evidence_destruction: 'DESTRUCCIÓN DE EVIDENCIA es bloqueo absoluto.',
};

export function vectorProduct(vectors: Partial<SecurityVectors>): 0 | 1 {
  return SECURITY_VECTORS.every((name) => vectors[name] === true) ? 1 : 0;
}

export function missingVectors(vectors: Partial<SecurityVectors>): readonly SecurityVectorName[] {
  return SECURITY_VECTORS.filter((name) => vectors[name] !== true);
}

const ACCEPTED_LICENSES = new Set([
  'CC0-1.0',
  'CC-BY-4.0',
  'CC-BY-SA-4.0',
  'MIT',
  'APACHE-2.0',
  'BSD-3-CLAUSE',
  'PUBLIC-DOMAIN',
  'EXPRESS-PERMISSION',
  'PROPRIETARY-AUTHORIZED',
]);

export interface LicenseVerdict {
  readonly valid: boolean;
  readonly normalized: string | null;
  readonly reason: string;
}

/**
 * Valida una *declaración* de licencia. No sustituye revisión legal ni prueba
 * que el titular haya concedido el permiso.
 */
export function validateLicense(license: string | null | undefined): LicenseVerdict {
  if (typeof license !== 'string' || !license.trim()) {
    return { valid: false, normalized: null, reason: 'LICENSE_MISSING' };
  }
  const normalized = license.trim().toUpperCase().replace(/\s+/g, '-');
  if (!ACCEPTED_LICENSES.has(normalized)) {
    return { valid: false, normalized, reason: 'LICENSE_NOT_ACCEPTED' };
  }
  return { valid: true, normalized, reason: 'LICENSE_DECLARED' };
}

export type IngestionStageStatus = 'PASS' | 'FAIL' | 'PENDING';

export interface IngestionStage {
  readonly index: number;
  readonly id: string;
  readonly status: IngestionStageStatus;
  readonly detail: string;
}

export interface IngestionDecision {
  readonly verdict: 'ADMIT' | 'REJECT' | 'QUARANTINE';
  readonly admitted: boolean;
  readonly stages: readonly IngestionStage[];
  readonly failed: readonly string[];
  readonly evidenceDigest: string;
}

function stage(index: number, id: string, pass: boolean, detail: string): IngestionStage {
  return { index, id, status: pass ? 'PASS' : 'FAIL', detail };
}

/** Pipeline de 14 etapas del canon. Evalúa declaraciones, no descarga contenido. */
export function evaluateIngestion(declaration: IngestionDeclaration): IngestionDecision {
  const license = validateLicense(declaration.license);
  const signature = declaration.bookpiSignature ?? '';
  const signatureValid = /^[0-9a-f]{128}$/i.test(signature);
  const stages: IngestionStage[] = [
    stage(1, 'source.identified', Boolean(declaration.sourceId?.trim()), 'fuente con id'),
    stage(
      2,
      'source.traceable',
      typeof declaration.sourceUri === 'string' && /^https?:\/\//.test(declaration.sourceUri),
      'URI http(s) declarada'
    ),
    stage(3, 'license.valid', license.valid, license.reason),
    stage(
      4,
      'provenance.verifiable',
      Boolean(declaration.provenance?.trim()),
      'procedencia declarada'
    ),
    stage(
      5,
      'pii.authorized',
      declaration.containsUnauthorizedPii !== true,
      'sin PII no autorizada declarada'
    ),
    stage(6, 'robots.allowed', declaration.robotsAllowed === true, 'robots.txt permite la lectura'),
    stage(7, 'paywall.not_evaded', declaration.controlEvasion !== true, 'sin evasión de controles'),
    stage(
      8,
      'right_to_be_forgotten.available',
      declaration.rightToBeForgotten === true,
      'mecanismo de borrado disponible'
    ),
    stage(
      9,
      'authority.recognized',
      declaration.authorityRecognized === true,
      'autoridad de la fuente reconocida'
    ),
    stage(10, 'content.digest', true, 'digest SHA3-512 calculado sobre la declaración'),
    stage(11, 'bookpi.signed', signatureValid, 'firma BookPI de 128 hex'),
    stage(12, 'quarantine.passed', declaration.quarantined !== true, 'sin cuarentena activa'),
    stage(
      13,
      'human.review',
      declaration.requiresHumanReview !== true || declaration.humanReviewGranted === true,
      declaration.requiresHumanReview
        ? declaration.humanReviewGranted
          ? 'revisión humana concedida'
          : 'revisión humana pendiente'
        : 'no requerida'
    ),
    stage(14, 'admit', true, 'veredicto calculado'),
  ];

  const failed = stages.filter((item) => item.status === 'FAIL').map((item) => item.id);
  const pendingHuman =
    declaration.requiresHumanReview === true && declaration.humanReviewGranted !== true;
  const verdict: IngestionDecision['verdict'] =
    failed.length === 0 ? 'ADMIT' : pendingHuman ? 'QUARANTINE' : 'REJECT';
  const evidenceDigest = createHash('sha3-512')
    .update(
      JSON.stringify({
        sourceId: declaration.sourceId ?? null,
        sourceUri: declaration.sourceUri ?? null,
        license: license.normalized,
        stages: stages.map((item) => `${item.id}:${item.status}`),
      })
    )
    .digest('hex');

  return { verdict, admitted: verdict === 'ADMIT', stages, failed, evidenceDigest };
}

export interface LearningDecision {
  readonly verdict: ConstitutionalVerdict;
  readonly operation: LearningOperation;
  readonly reason: string;
}

export function evaluateLearning(
  operation: LearningOperation,
  license: string | null | undefined
): LearningDecision {
  const licenseVerdict = validateLicense(license);
  if (operation === 'study') {
    return licenseVerdict.valid
      ? { verdict: 'ALLOW', operation, reason: 'STUDY_WITH_DECLARED_LICENSE' }
      : { verdict: 'DENY', operation, reason: 'STUDY_REQUIRES_LICENSE' };
  }
  if (operation === 'copy') {
    return { verdict: 'DENY', operation, reason: 'APRENDER_NO_ES_COPIAR' };
  }
  if (operation === 'ingest_without_permission') {
    return { verdict: 'DENY', operation, reason: 'APRENDER_NO_ES_INGERIR_SIN_PERMISO' };
  }
  return { verdict: 'DENY', operation, reason: 'APRENDER_NO_ES_ENTRENAR_SIN_LICENCIA' };
}

const APPROVAL_ACTIONS = new Set<DomainAction>(['deploy', 'payment']);

export function evaluateConstitutional(request: ConstitutionalRequest): ConstitutionalDecision {
  const action = request.action;
  const vectors = request.vectors ?? {};
  const product = vectorProduct(vectors);
  const missing = missingVectors(vectors);
  const humanApprovalRequired = APPROVAL_ACTIONS.has(action);
  const humanApprovalPresent = request.humanApproval === true;

  const deny = (
    rule: string,
    blockedBy: readonly string[],
    note: string
  ): ConstitutionalDecision => ({
    verdict: 'DENY',
    allowed: false,
    action,
    rule,
    blockedBy,
    vectorProduct: product,
    humanApprovalRequired,
    humanApprovalPresent,
    note,
  });

  if (FORBIDDEN[action]) {
    return deny('DOMAIN_RULE', [action], FORBIDDEN[action]);
  }

  if (action === 'ingest') {
    const ingestion = evaluateIngestion(request.ingestion ?? {});
    if (!ingestion.admitted) {
      return deny('INGESTION_GATE', ingestion.failed, `ingesta ${ingestion.verdict}`);
    }
  }

  if (action === 'learn') {
    const learning = request.learning ?? { operation: 'study' as const, license: request.license };
    const decision = evaluateLearning(learning.operation, learning.license);
    if (decision.verdict === 'DENY') {
      return deny('LEARNING_RULE', [decision.reason], decision.reason);
    }
  }

  if (missing.length > 0) {
    return deny('NULL_SECURITY_VECTOR', missing, `vectores nulos: ${missing.join(', ')}`);
  }

  if (humanApprovalRequired && !humanApprovalPresent) {
    return deny('HUMAN_APPROVAL_REQUIRED', [action], 'requiere aprobación humana verificada');
  }

  return {
    verdict: 'ALLOW',
    allowed: true,
    action,
    rule: 'CONSTITUTIONAL_ALLOW',
    blockedBy: [],
    vectorProduct: product,
    humanApprovalRequired,
    humanApprovalPresent,
    note: 'ALLOW significa que la política se satisface; no autoriza ni ejecuta por sí mismo.',
  };
}

export interface TrustSignals {
  readonly identity: number;
  readonly evidence: number;
  readonly trackRecord: number;
  readonly transparency: number;
  readonly reversibility: number;
}

const TRUST_WEIGHTS: Readonly<Record<keyof TrustSignals, number>> = {
  identity: 0.25,
  evidence: 0.25,
  trackRecord: 0.2,
  transparency: 0.15,
  reversibility: 0.15,
};

export type TrustBand = 'UNTRUSTED' | 'LIMITED' | 'TRUSTED' | 'HIGH';

export interface TrustScore {
  readonly score: number;
  readonly band: TrustBand;
  /** Advisory only. A score is not an authorization. */
  readonly authorizes: false;
}

function clampSignal(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(1, Math.max(0, value));
}

export function calculateTrust(signals: Partial<TrustSignals>): TrustScore {
  let total = 0;
  for (const key of Object.keys(TRUST_WEIGHTS) as Array<keyof TrustSignals>) {
    total += clampSignal(signals[key] ?? 0) * TRUST_WEIGHTS[key];
  }
  const score = Math.round(total * 100);
  const band: TrustBand =
    score >= 90 ? 'HIGH' : score >= 70 ? 'TRUSTED' : score >= 40 ? 'LIMITED' : 'UNTRUSTED';
  return { score, band, authorizes: false };
}
