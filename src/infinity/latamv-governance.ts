/**
 * LATAMV shared governance assessment (draft; not legal advice or certification).
 * Evaluates declared evidence against the eight documented universal controls.
 * Jurisdiction packs are versioned review checklists, not legal rule engines.
 */
import { digest } from './skills';

export const LATAMV_CONTROL_IDS = [
  'C1_RISK_ASSESSMENT',
  'C2_HUMAN_OVERSIGHT',
  'C3_TRANSPARENCY',
  'C4_TRACEABILITY',
  'C5_DATA_PROTECTION',
  'C6_INFORMATION_INTEGRITY',
  'C7_FAIRNESS',
  'C8_SECURITY',
] as const;

export type LatamvControlId = (typeof LATAMV_CONTROL_IDS)[number];
export type LatamvControlStatus = 'implemented' | 'in_progress' | 'gap' | 'not_assessed';
export type LatamvJurisdiction = 'EU' | 'US' | 'CN' | 'LATAM' | 'MX' | 'SV';

export interface LatamvControlDeclaration {
  readonly controlId: LatamvControlId;
  readonly status: LatamvControlStatus;
  readonly evidenceRefs?: readonly string[];
}

export interface LatamvAssessmentInput {
  readonly assessmentId: string;
  readonly systemName: string;
  readonly systemVersion: string;
  readonly jurisdictions: readonly LatamvJurisdiction[];
  readonly assessedAt: string;
  readonly controls: readonly LatamvControlDeclaration[];
}

export interface LatamvControlDefinition {
  readonly id: LatamvControlId;
  readonly name: string;
  readonly objective: string;
  readonly evidenceExamples: readonly string[];
}

export interface LatamvPack {
  readonly id: LatamvJurisdiction;
  readonly name: string;
  readonly version: string;
  readonly maturity: 'draft-needs-primary-source-review';
  readonly scopeNote: string;
  readonly frameworks: readonly string[];
  readonly reviewTopics: readonly string[];
  readonly reviewRequired: true;
}

export interface LatamvAssessedControl extends LatamvControlDeclaration {
  readonly name: string;
  readonly evidenceState: 'none' | 'declared-unverified';
  readonly result: 'COMPLETE_FOR_REVIEW' | 'EVIDENCE_MISSING' | 'OPEN';
  readonly evidenceRefs: readonly string[];
}

export interface LatamvAssessmentResult {
  readonly schema: 'latamv.pev.draft.v1';
  readonly assessmentId: string;
  readonly system: { readonly name: string; readonly version: string };
  readonly assessedAt: string;
  readonly jurisdictions: readonly LatamvPack[];
  readonly controls: readonly LatamvAssessedControl[];
  readonly summary: {
    readonly totalControls: 8;
    readonly completeForReview: number;
    readonly evidenceMissing: number;
    readonly open: number;
    readonly completenessPercent: number;
    readonly state: 'READY_FOR_HUMAN_REVIEW' | 'INCOMPLETE';
  };
  readonly claims: {
    readonly legalConformity: 'NOT_ASSESSED';
    readonly evidenceAuthenticity: 'NOT_VERIFIED';
    readonly signature: 'UNSIGNED';
    readonly persistence: 'NOT_PERSISTED' | 'PERSISTED';
  };
  readonly hash: { readonly algorithm: 'SHA3-512'; readonly value: string };
  readonly executionPerformed: false;
  readonly production: false;
  readonly disclaimers: readonly string[];
}

export const LATAMV_CONTROLS: readonly LatamvControlDefinition[] = [
  {
    id: 'C1_RISK_ASSESSMENT',
    name: 'Evaluación de riesgos',
    objective: 'Identificar, analizar, priorizar y revisar riesgos durante el ciclo de vida.',
    evidenceExamples: ['evaluación de impacto', 'registro de riesgos', 'criterios y revisiones'],
  },
  {
    id: 'C2_HUMAN_OVERSIGHT',
    name: 'Supervisión humana',
    objective:
      'Definir responsabilidades, capacidad de intervención y vías de escalamiento humano.',
    evidenceExamples: [
      'roles y responsables',
      'procedimiento de escalamiento',
      'prueba de intervención',
    ],
  },
  {
    id: 'C3_TRANSPARENCY',
    name: 'Transparencia',
    objective: 'Informar el uso, límites, capacidades y destinatarios relevantes del sistema.',
    evidenceExamples: ['ficha del sistema', 'avisos al usuario', 'documentación de límites'],
  },
  {
    id: 'C4_TRACEABILITY',
    name: 'Trazabilidad y registros',
    objective: 'Conservar registros suficientes para reconstruir decisiones y cambios relevantes.',
    evidenceExamples: ['esquema de eventos', 'política de retención', 'prueba de integridad'],
  },
  {
    id: 'C5_DATA_PROTECTION',
    name: 'Protección de datos',
    objective:
      'Documentar minimización, base de tratamiento, retención y transferencias aplicables.',
    evidenceExamples: ['inventario de datos', 'evaluación de privacidad', 'reglas de retención'],
  },
  {
    id: 'C6_INFORMATION_INTEGRITY',
    name: 'Integridad de información',
    objective:
      'Reducir contenido falso o manipulado y documentar controles de calidad de información.',
    evidenceExamples: ['pruebas de factualidad', 'procedencia de fuentes', 'gestión de incidentes'],
  },
  {
    id: 'C7_FAIRNESS',
    name: 'Sesgo y no discriminación',
    objective: 'Detectar y mitigar impactos diferenciales pertinentes a la población y al uso.',
    evidenceExamples: ['evaluación de impacto', 'pruebas por grupos', 'plan de mitigación'],
  },
  {
    id: 'C8_SECURITY',
    name: 'Seguridad y robustez',
    objective:
      'Proteger el sistema, sus datos y operación ante fallos, abuso y amenazas previsibles.',
    evidenceExamples: [
      'modelo de amenazas',
      'pruebas de seguridad',
      'plan de respuesta y recuperación',
    ],
  },
] as const;

const PACKS: Readonly<Record<LatamvJurisdiction, LatamvPack>> = {
  EU: {
    id: 'EU',
    name: 'Unión Europea',
    version: 'eu-draft-1.0',
    maturity: 'draft-needs-primary-source-review',
    scopeNote:
      'Checklist de ingeniería de alto nivel; no determina clasificación ni conformidad legal.',
    frameworks: ['Reglamento (UE) 2024/1689', 'RGPD (UE) 2016/679'],
    reviewTopics: [
      'clasificación y gestión de riesgos',
      'supervisión humana',
      'transparencia',
      'registros',
      'protección de datos',
      'precisión y ciberseguridad',
    ],
    reviewRequired: true,
  },
  US: {
    id: 'US',
    name: 'Estados Unidos',
    version: 'us-draft-1.0',
    maturity: 'draft-needs-primary-source-review',
    scopeNote:
      'NIST AI RMF es voluntario; leyes federales, estatales y sectoriales requieren análisis de aplicabilidad.',
    frameworks: ['NIST AI RMF 1.0', 'leyes estatales y sectoriales (por determinar)'],
    reviewTopics: [
      'Govern / Map / Measure / Manage',
      'obligaciones estatales y sectoriales',
      'protección del consumidor y privacidad',
    ],
    reviewRequired: true,
  },
  CN: {
    id: 'CN',
    name: 'China',
    version: 'cn-draft-1.0',
    maturity: 'draft-needs-primary-source-review',
    scopeNote:
      'La aplicabilidad depende del servicio, contenido, datos y obligaciones locales; requiere asesoría especializada.',
    frameworks: ['medidas CAC aplicables al servicio', 'PIPL / DSL / CSL según alcance'],
    reviewTopics: [
      'registro y evaluación aplicables',
      'gobernanza de contenido',
      'datos y transferencias',
      'ciberseguridad',
    ],
    reviewRequired: true,
  },
  LATAM: {
    id: 'LATAM',
    name: 'Latinoamérica (marco regional)',
    version: 'latam-draft-1.0',
    maturity: 'draft-needs-primary-source-review',
    scopeNote:
      'No existe una regla regional única; este pack no reemplaza la revisión país por país.',
    frameworks: [
      'Recomendación UNESCO sobre la Ética de la IA (2021)',
      'legislación nacional aplicable (por determinar)',
    ],
    reviewTopics: [
      'mapeo por país',
      'protección de datos',
      'impacto y supervisión',
      'transparencia y vías de reclamación',
    ],
    reviewRequired: true,
  },
  MX: {
    id: 'MX',
    name: 'México',
    version: 'mx-draft-1.0',
    maturity: 'draft-needs-primary-source-review',
    scopeNote:
      'No constituye una opinión sobre el estado o aplicabilidad de la legislación mexicana vigente.',
    frameworks: ['LFPDPPP y normativa sectorial vigente (verificación oficial pendiente)'],
    reviewTopics: [
      'base y finalidad del tratamiento',
      'avisos y derechos',
      'encargados y transferencias',
      'responsables y atención de incidentes',
    ],
    reviewRequired: true,
  },
  SV: {
    id: 'SV',
    name: 'El Salvador',
    version: 'sv-draft-1.0',
    maturity: 'draft-needs-primary-source-review',
    scopeNote:
      'Instrumentos, reformas y obligaciones deben confirmarse en fuentes oficiales antes de uso formal.',
    frameworks: ['marco nacional de IA y protección de datos (verificación oficial pendiente)'],
    reviewTopics: [
      'registro o reporte aplicable',
      'decisiones de alto impacto',
      'tratamiento de datos',
      'responsabilidad y vías de reclamación',
    ],
    reviewRequired: true,
  },
};

const VALID_STATUSES: readonly LatamvControlStatus[] = [
  'implemented',
  'in_progress',
  'gap',
  'not_assessed',
];
const VALID_JURISDICTIONS = Object.keys(PACKS) as LatamvJurisdiction[];
const DISCLAIMER = [
  'Resultado generado desde declaraciones del solicitante; las referencias no se autentican ni se descargan.',
  'Completeness mide evidencias declaradas para revisión, no cumplimiento jurídico ni efectividad del control.',
  'Cada pack es un borrador que requiere verificación en fuentes primarias y revisión jurídica por jurisdicción.',
  'El PEV es un hash de integridad no firmado: no prueba autoría, identidad, fecha confiable ni almacenamiento durable.',
] as const;

export class LatamvInputError extends Error {
  readonly code = 'INVALID_LATAMV_ASSESSMENT';
}

export function listLatamvPacks(): readonly LatamvPack[] {
  return VALID_JURISDICTIONS.map((id) => PACKS[id]);
}

function requireText(value: unknown, field: string, maxLength: number): string {
  if (typeof value !== 'string' || !value.trim() || value.trim().length > maxLength) {
    throw new LatamvInputError(`${field} debe ser texto entre 1 y ${maxLength} caracteres`);
  }
  return value.trim();
}

function normalizeInput(value: unknown): LatamvAssessmentInput {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new LatamvInputError('El cuerpo debe ser un objeto JSON');
  }
  const input = value as Record<string, unknown>;
  const assessmentId = requireText(input.assessmentId, 'assessmentId', 128);
  const systemName = requireText(input.systemName, 'systemName', 160);
  const systemVersion = requireText(input.systemVersion, 'systemVersion', 80);
  if (typeof input.assessedAt !== 'string' || !Number.isFinite(Date.parse(input.assessedAt))) {
    throw new LatamvInputError('assessedAt debe ser una fecha ISO válida');
  }
  const assessedAt = new Date(input.assessedAt).toISOString();
  if (
    !Array.isArray(input.jurisdictions) ||
    input.jurisdictions.length === 0 ||
    input.jurisdictions.length > VALID_JURISDICTIONS.length
  ) {
    throw new LatamvInputError('jurisdictions debe contener entre 1 y 6 packs');
  }
  const jurisdictions = input.jurisdictions.map((id) => {
    if (typeof id !== 'string' || !VALID_JURISDICTIONS.includes(id as LatamvJurisdiction)) {
      throw new LatamvInputError('jurisdictions contiene un pack no soportado');
    }
    return id as LatamvJurisdiction;
  });
  if (new Set(jurisdictions).size !== jurisdictions.length) {
    throw new LatamvInputError('jurisdictions no puede contener duplicados');
  }
  if (!Array.isArray(input.controls) || input.controls.length > LATAMV_CONTROL_IDS.length) {
    throw new LatamvInputError('controls debe ser una lista de hasta 8 controles');
  }
  const seen = new Set<string>();
  const controls = input.controls.map((raw): LatamvControlDeclaration => {
    if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
      throw new LatamvInputError('cada control debe ser un objeto');
    }
    const control = raw as Record<string, unknown>;
    if (
      typeof control.controlId !== 'string' ||
      !LATAMV_CONTROL_IDS.includes(control.controlId as LatamvControlId)
    ) {
      throw new LatamvInputError('controlId no pertenece al núcleo C1–C8');
    }
    if (seen.has(control.controlId))
      throw new LatamvInputError(`control duplicado: ${control.controlId}`);
    seen.add(control.controlId);
    if (
      typeof control.status !== 'string' ||
      !VALID_STATUSES.includes(control.status as LatamvControlStatus)
    ) {
      throw new LatamvInputError(`status inválido en ${control.controlId}`);
    }
    const evidenceRefs = control.evidenceRefs ?? [];
    if (
      !Array.isArray(evidenceRefs) ||
      evidenceRefs.length > 10 ||
      evidenceRefs.some((ref) => typeof ref !== 'string' || !ref.trim() || ref.length > 2048)
    ) {
      throw new LatamvInputError(`evidenceRefs inválidas en ${control.controlId}`);
    }
    return {
      controlId: control.controlId as LatamvControlId,
      status: control.status as LatamvControlStatus,
      evidenceRefs: [...new Set(evidenceRefs.map((ref) => (ref as string).trim()))].sort(),
    };
  });
  return {
    assessmentId,
    systemName,
    systemVersion,
    jurisdictions: jurisdictions.sort(),
    assessedAt,
    controls: controls.sort((left, right) => left.controlId.localeCompare(right.controlId)),
  };
}

export function assessLatamv(value: unknown): LatamvAssessmentResult {
  const input = normalizeInput(value);
  const declared = new Map(input.controls.map((control) => [control.controlId, control]));
  const controls: LatamvAssessedControl[] = LATAMV_CONTROLS.map((definition) => {
    const declaration = declared.get(definition.id) ?? {
      controlId: definition.id,
      status: 'not_assessed' as const,
      evidenceRefs: [],
    };
    const evidenceRefs = [...(declaration.evidenceRefs ?? [])];
    const hasEvidence = evidenceRefs.length > 0;
    const result: LatamvAssessedControl['result'] =
      declaration.status === 'implemented' && hasEvidence
        ? 'COMPLETE_FOR_REVIEW'
        : declaration.status === 'implemented'
          ? 'EVIDENCE_MISSING'
          : 'OPEN';
    return {
      ...declaration,
      name: definition.name,
      evidenceRefs,
      evidenceState: hasEvidence ? 'declared-unverified' : 'none',
      result,
    };
  });
  const completeForReview = controls.filter(
    (control) => control.result === 'COMPLETE_FOR_REVIEW'
  ).length;
  const evidenceMissing = controls.filter(
    (control) => control.result === 'EVIDENCE_MISSING'
  ).length;
  const open = controls.filter((control) => control.result === 'OPEN').length;
  const hashPayload = {
    schema: 'latamv.pev.draft.v1',
    assessmentId: input.assessmentId,
    system: { name: input.systemName, version: input.systemVersion },
    assessedAt: input.assessedAt,
    jurisdictions: input.jurisdictions.map((id) => ({ id, version: PACKS[id].version })),
    controls: controls.map(({ controlId, status, evidenceRefs }) => ({
      controlId,
      status,
      evidenceRefs,
    })),
  };
  return {
    schema: 'latamv.pev.draft.v1',
    assessmentId: input.assessmentId,
    system: { name: input.systemName, version: input.systemVersion },
    assessedAt: input.assessedAt,
    jurisdictions: input.jurisdictions.map((id) => PACKS[id]),
    controls,
    summary: {
      totalControls: 8,
      completeForReview,
      evidenceMissing,
      open,
      completenessPercent: Math.round((completeForReview / 8) * 100),
      state: completeForReview === 8 ? 'READY_FOR_HUMAN_REVIEW' : 'INCOMPLETE',
    },
    claims: {
      legalConformity: 'NOT_ASSESSED',
      evidenceAuthenticity: 'NOT_VERIFIED',
      signature: 'UNSIGNED',
      persistence: 'NOT_PERSISTED',
    },
    hash: { algorithm: 'SHA3-512', value: digest(hashPayload) },
    executionPerformed: false,
    production: false,
    disclaimers: DISCLAIMER,
  };
}
