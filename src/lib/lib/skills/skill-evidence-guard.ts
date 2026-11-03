/**
 * Compuerta de honestidad de evidencia para skills.
 *
 * Una skill puede calcular, planear y trazar sobre el input que recibió. No puede
 * afirmar que rastreado una web, abierto un navegador o medido Core Web Vitals si
 * ningún adaptador attestó esa observación. Cuando aparece una afirmación externa
 * sin attestación, la evidencia se retira del resultado y el estado se degrada a
 * BLOCKED: es preferible una habilidad bloqueada a un éxito simulado (AUD-233).
 *
 * state: engine-generated — revisión humana pendiente.
 */
import type { Evidence, SkillResult, SkillStatus } from './contracts';
import { createAuditEvent } from './contracts';

export const SKILL_EVIDENCE_GUARD_VERSION = '1.0.0' as const;
export const DISCLOSURE_EVIDENCE =
  'NATIVE-ANALYSIS ≠ WEB-EVIDENCE ≠ EXECUTION ≠ PRODUCTION' as const;

export const MISSING_ADAPTER = 'external-observation-adapter';

const EXTERNAL_CLAIM_PATTERNS: readonly RegExp[] = [
  /crawl/i,
  /scrap/i,
  /rastreo/i,
  /rastreando/i,
  /fetch/i,
  /devtools/i,
  /chrome\b.*\bprotocol/i,
  /navegador/i,
  /browser/i,
  /monitoreo\s+continuo/i,
  /\bscan\s+completado\b/i,
  /escaneo\s+(completado|realizado)/i,
  /auditor[ií]a\s+seo/i,
  /lectura\s+de\s+(la\s+)?url/i,
  /openai|tavily|firecrawl\s*api|serp/i,
  /\bdescarga\s+del?\s+(sitio|portal)\b/i,
  /llamada\s+(http|api|saliente)/i,
  /observaci[oó]n\s+en\s+(producci[oó]n|vivo)/i,
  /comprobado\s+en\s+(servidor|producci[oó]n)/i,
  /reporte\s+de\s+rendimiento/i,
];

export interface SuppressedClaim {
  readonly evidenceId: string;
  readonly source: string;
  readonly reason: string;
}

export interface GuardOutcome<T> {
  readonly result: SkillResult<T>;
  readonly suppressed: readonly SuppressedClaim[];
}

/** Trazabilidad de la resta: qué había antes de que la compuerta bloqueara el resultado. */
export interface GuardMetadata {
  readonly guardVersion: typeof SKILL_EVIDENCE_GUARD_VERSION;
  readonly originalStatus: SkillStatus;
  readonly suppressedClaims: readonly SuppressedClaim[];
  readonly missingAdapters: readonly string[];
}

export interface GuardOptions {
  /**
   * Un adaptador autorizado attestó las observaciones externas de esta ejecución.
   * Sin esto, cualquier afirmación externa se considera no reproducible.
   */
  readonly adapterAttested?: boolean;
  /** Identificador del ejecutor, para el evento de auditoría. */
  readonly actorId?: string;
}

/** Detecta una afirmación de observación externa en el texto de una evidencia. */
export function claimsExternalObservation(text: string): boolean {
  return EXTERNAL_CLAIM_PATTERNS.some((pattern) => pattern.test(text));
}

function evidenceText(evidence: Evidence): string {
  return `${evidence.source ?? ''} ${evidence.excerpt ?? ''} ${evidence.uri ?? ''}`;
}

/**
 * Retira la evidencia no attestable y degrada el estado. Determinista: no añade
 * observaciones, solo resta afirmaciones y documenta la resta.
 */
export function guardEvidence<T>(
  result: SkillResult<T>,
  options: GuardOptions = {}
): GuardOutcome<T> {
  if (options.adapterAttested === true) {
    return { result, suppressed: [] };
  }

  const suppressed: SuppressedClaim[] = [];
  const surviving: Evidence[] = [];
  for (const evidence of result.evidence ?? []) {
    if (claimsExternalObservation(evidenceText(evidence))) {
      suppressed.push({
        evidenceId: evidence.id,
        source: evidence.source,
        reason: 'afirmacion de observacion externa sin adaptador que la atteste',
      });
      continue;
    }
    surviving.push(evidence);
  }

  if (suppressed.length === 0) return { result, suppressed: [] };

  const status =
    result.status === 'SUCCESS' || result.status === 'PARTIAL' || result.status === 'ESCALATED'
      ? ('BLOCKED' as const)
      : result.status;

  const warnings = [
    ...result.warnings,
    `${suppressed.length} afirmacion(es) de observacion externa retiradas: se requiere ${MISSING_ADAPTER} autorizado.`,
    DISCLOSURE_EVIDENCE,
  ];

  const metadata: GuardMetadata = {
    guardVersion: SKILL_EVIDENCE_GUARD_VERSION,
    originalStatus: result.status,
    suppressedClaims: suppressed,
    missingAdapters: [MISSING_ADAPTER],
  };

  const guarded: SkillResult<T> = {
    ...result,
    status,
    summary:
      `${result.skillId}: resultado no attestable; la ejecucion queda bloqueada hasta ` +
      `autorizar ${MISSING_ADAPTER}.`,
    data: Object.assign({}, result.data, metadata),
    evidence: surviving,
    warnings,
    auditEvents: [
      ...result.auditEvents,
      createAuditEvent(
        'SKILL_BLOCKED',
        result.skillId,
        {
          guardVersion: SKILL_EVIDENCE_GUARD_VERSION,
          suppressedEvidenceIds: suppressed.map((item) => item.evidenceId),
          missingAdapters: [MISSING_ADAPTER],
        },
        options.actorId
      ),
    ],
    requiresHumanReview: true,
  };

  return { result: guarded, suppressed };
}
