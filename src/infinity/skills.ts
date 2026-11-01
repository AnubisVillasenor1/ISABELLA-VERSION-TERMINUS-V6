/**
 * ISABELLA VILLASEÑOR AI™ — skills nativas deterministas.
 * state: draft | engine-generated.
 *
 * Fuente: `ISABELLA_VILLASENOR_AI_MASTER_CONSOLIDATED.docx`, sección 15.
 *
 * Cada skill hace exactamente lo que declara y nada más. Las que planifican
 * (música, voz, multimodal) devuelven un plan con `executionPerformed: false`;
 * las que evalúan (ingesta, gobernanza, investigación) no descargan ni ejecutan
 * acciones externas. Ninguna llama a la red.
 */
import { createHash } from 'node:crypto';
import {
  evaluateConstitutional,
  evaluateIngestion,
  validateLicense,
  type DomainAction,
  type IngestionDecision,
} from './constitution';

export class SkillInputError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(`${code}: ${message}`);
    this.name = 'SkillInputError';
    this.code = code;
  }
}

export type SkillId =
  | 'IV_Research'
  | 'IV_MusicStudio'
  | 'IV_VoiceStudio'
  | 'IV_LegalResearch'
  | 'IV_Bibliometrics'
  | 'IV_OpenScience'
  | 'IV_Governance'
  | 'IV_PromptEngineering'
  | 'IV_Multimodal'
  | 'IV_KnowledgeIngestion';

export type SkillStatus = 'OK' | 'REJECTED' | 'BLOCKED' | 'FAILED';

export interface SkillContext {
  /** Injected clock for deterministic tests. Never read from the request body. */
  readonly now?: string;
}

export interface SkillOutcome {
  readonly status: Exclude<SkillStatus, 'FAILED'>;
  readonly summary: string;
  readonly output: Readonly<Record<string, unknown>>;
  readonly warnings: readonly string[];
  readonly executionPerformed: boolean;
}

export interface SkillDefinition {
  readonly id: SkillId;
  readonly label: string;
  readonly summary: string;
  readonly maturity: 'tested';
  readonly executes: boolean;
  readonly note: string;
  run(input: Readonly<Record<string, unknown>>, context: SkillContext): SkillOutcome;
}

export interface SkillRunResult {
  readonly skillId: string;
  readonly ok: boolean;
  readonly status: SkillStatus;
  readonly summary: string;
  readonly output: Readonly<Record<string, unknown>>;
  readonly warnings: readonly string[];
  readonly evidenceDigest: string;
  readonly executionPerformed: boolean;
  readonly externalCalls: 0;
  readonly maturity: 'tested';
  readonly error?: string;
}

// ── Utilidades deterministas ────────────────────────────────────────────────

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value) ?? 'null';
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  const record = value as Record<string, unknown>;
  return `{${Object.keys(record)
    .sort()
    .filter((key) => record[key] !== undefined)
    .map((key) => `${JSON.stringify(key)}:${stableStringify(record[key])}`)
    .join(',')}}`;
}

export function digest(value: unknown): string {
  return createHash('sha3-512').update(stableStringify(value)).digest('hex');
}

function asRecord(value: unknown): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new SkillInputError('INVALID_INPUT', 'se esperaba un objeto');
  }
  return value as Record<string, unknown>;
}

function text(
  value: unknown,
  field: string,
  options: { readonly min?: number; readonly max?: number } = {}
): string {
  if (typeof value !== 'string')
    throw new SkillInputError('INVALID_FIELD', `${field} debe ser texto`);
  const trimmed = value.trim();
  const min = options.min ?? 1;
  const max = options.max ?? 20_000;
  if (trimmed.length < min)
    throw new SkillInputError('INVALID_FIELD', `${field} es demasiado corto`);
  if (trimmed.length > max)
    throw new SkillInputError('LIMIT_EXCEEDED', `${field} excede ${max} caracteres`);
  return trimmed;
}

function optionalText(value: unknown, field: string, max = 2_000): string | null {
  if (value === undefined || value === null) return null;
  return text(value, field, { max });
}

function integer(
  value: unknown,
  field: string,
  min: number,
  max: number,
  fallback?: number
): number {
  if (value === undefined || value === null) {
    if (fallback !== undefined) return fallback;
    throw new SkillInputError('INVALID_FIELD', `${field} es requerido`);
  }
  if (typeof value !== 'number' || !Number.isFinite(value) || !Number.isInteger(value)) {
    throw new SkillInputError('INVALID_FIELD', `${field} debe ser entero`);
  }
  if (value < min || value > max) {
    throw new SkillInputError('LIMIT_EXCEEDED', `${field} debe estar entre ${min} y ${max}`);
  }
  return value;
}

function array(value: unknown, field: string, max: number): readonly unknown[] {
  if (!Array.isArray(value))
    throw new SkillInputError('INVALID_FIELD', `${field} debe ser arreglo`);
  if (value.length > max) throw new SkillInputError('LIMIT_EXCEEDED', `${field} excede ${max}`);
  return value;
}

function bool(value: unknown): boolean {
  return value === true;
}

const STOPWORDS = new Set([
  'de',
  'la',
  'el',
  'los',
  'las',
  'un',
  'una',
  'y',
  'o',
  'en',
  'por',
  'para',
  'con',
  'sin',
  'que',
  'del',
  'al',
  'se',
  'su',
  'es',
  'son',
  'como',
  'the',
  'of',
  'and',
  'to',
  'in',
  'for',
  'on',
  'with',
  'is',
  'are',
  'a',
  'an',
]);

export function tokens(value: string): readonly string[] {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length > 2 && !STOPWORDS.has(token));
}

export function jaccard(left: string, right: string): number {
  const a = new Set(tokens(left));
  const b = new Set(tokens(right));
  if (a.size === 0 || b.size === 0) return 0;
  let intersection = 0;
  for (const token of a) if (b.has(token)) intersection += 1;
  const union = a.size + b.size - intersection;
  return union === 0 ? 0 : Math.round((intersection / union) * 10_000) / 10_000;
}

const DOI_PATTERN = /^10\.\d{4,9}\/\S+$/;
export function isValidDoi(value: string): boolean {
  return DOI_PATTERN.test(value.trim());
}

// ── IV_PromptEngineering ────────────────────────────────────────────────────

const INJECTION_PATTERNS: ReadonlyArray<readonly [string, RegExp]> = [
  ['ignore-instructions', /ignora\s+(todas\s+)?(las\s+)?instrucciones/i],
  ['reveal-system-prompt', /(revela|muestra|imprime)\s+(el\s+)?(system\s+)?prompt/i],
  ['role-override', /act[uú]a\s+como\s+(root|administrador|system)/i],
  ['jailbreak', /jailbreak|modo\s+sin\s+restricciones/i],
  ['fake-system-tag', /<\s*\/?\s*system\s*>/i],
];

function runPromptEngineering(
  input: Readonly<Record<string, unknown>>,
  _context: SkillContext
): SkillOutcome {
  const prompt = text(input.prompt, 'prompt', { min: 3, max: 8_000 });
  const target = optionalText(input.target, 'target', 40) ?? 'chat';
  const maxChars = integer(input.maxChars, 'maxChars', 400, 12_000, 4_000);

  const warnings: string[] = [];
  const injection = INJECTION_PATTERNS.filter(([, pattern]) => pattern.test(prompt)).map(
    ([id]) => id
  );
  if (injection.length > 0) {
    warnings.push(`posible inyección de prompt: ${injection.join(', ')}`);
  }

  const normalized = prompt.replace(/\s+/g, ' ').trim();
  const lines = prompt
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);
  const seen = new Set<string>();
  const constraints: string[] = [];
  for (const line of lines) {
    const key = line.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    if (/^(no\s|sin\s|evita\s|restric|formato|responde|máximo|maximo|usa\s)/i.test(line)) {
      constraints.push(line.slice(0, 240));
    }
    if (constraints.length >= 12) break;
  }

  const sections = [
    { id: 'ROL', content: `Actúa como un asistente experto en ${target}.` },
    { id: 'OBJETIVO', content: normalized },
    {
      id: 'CONTEXTO',
      content: 'Usa solo la información proporcionada; declara cuando falte evidencia.',
    },
    {
      id: 'RESTRICCIONES',
      content:
        constraints.length > 0
          ? constraints.join(' ')
          : 'No inventes hechos, fuentes ni cifras. Distingue especificación de implementación.',
    },
    {
      id: 'FORMATO',
      content: 'Responde en español de México, claro y estructurado; incluye límites declarados.',
    },
    {
      id: 'CRITERIOS',
      content: 'Toda afirmación debe ser verificable; si no lo es, se declara como inferencia.',
    },
  ];

  let composed = sections.map((section) => `[${section.id}] ${section.content}`).join('\n');
  if (composed.length > maxChars) composed = composed.slice(0, maxChars).trimEnd();

  return {
    status: 'OK',
    summary: `Prompt reestructurado en ${sections.length} secciones (${composed.length} caracteres).`,
    output: {
      target,
      sections,
      prompt: composed,
      chars: composed.length,
      injectionSuspected: injection.length > 0,
      injectionSignals: injection,
      limits: { maxChars },
      modelUsed: false,
    },
    warnings,
    executionPerformed: false,
  };
}

// ── IV_Bibliometrics ────────────────────────────────────────────────────────

interface Work {
  readonly id: string;
  readonly title: string;
  readonly year: number | null;
  readonly citations: number;
  readonly authors: readonly string[];
  readonly doi: string | null;
}

function parseWorks(value: unknown): readonly Work[] {
  return array(value, 'works', 200).map((raw, index) => {
    const work = asRecord(raw);
    const year =
      work.year === undefined || work.year === null
        ? null
        : integer(work.year, `works[${index}].year`, 1900, 2100);
    const doi = optionalText(work.doi, `works[${index}].doi`, 200);
    if (doi && !isValidDoi(doi)) {
      throw new SkillInputError('INVALID_DOI', `works[${index}].doi no tiene formato DOI`);
    }
    return {
      id: text(work.id, `works[${index}].id`, { max: 120 }),
      title: text(work.title, `works[${index}].title`, { max: 500 }),
      year,
      citations: integer(work.citations, `works[${index}].citations`, 0, 10_000_000),
      authors: Array.isArray(work.authors)
        ? work.authors
            .filter((author): author is string => typeof author === 'string')
            .map((author) => author.trim())
            .filter(Boolean)
            .slice(0, 100)
        : [],
      doi,
    };
  });
}

function runBibliometrics(
  input: Readonly<Record<string, unknown>>,
  _context: SkillContext
): SkillOutcome {
  const works = parseWorks(input.works);
  if (works.length === 0) throw new SkillInputError('EMPTY_WORKS', 'works no puede estar vacío');

  const sorted = [...works].sort((a, b) => b.citations - a.citations);
  let hIndex = 0;
  while (hIndex < sorted.length && (sorted[hIndex]?.citations ?? 0) >= hIndex + 1) hIndex += 1;

  let gIndex = 0;
  let cumulative = 0;
  for (let index = 0; index < sorted.length; index += 1) {
    cumulative += sorted[index]?.citations ?? 0;
    const candidate = index + 1;
    if (cumulative >= candidate * candidate) gIndex = candidate;
  }

  const byYear: Record<string, number> = {};
  for (const work of works) {
    if (work.year !== null) byYear[String(work.year)] = (byYear[String(work.year)] ?? 0) + 1;
  }
  const authorCounts: Record<string, number> = {};
  for (const work of works) {
    for (const author of work.authors) authorCounts[author] = (authorCounts[author] ?? 0) + 1;
  }
  const topCollaborators = Object.entries(authorCounts)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 10)
    .map(([author, worksTogether]) => ({ author, worksTogether }));

  return {
    status: 'OK',
    summary: `${works.length} obras: h-index ${hIndex}, g-index ${gIndex}.`,
    output: {
      works: works.length,
      totalCitations: works.reduce((total, work) => total + work.citations, 0),
      hIndex,
      gIndex,
      i10: works.filter((work) => work.citations >= 10).length,
      byYear,
      uniqueAuthors: Object.keys(authorCounts).length,
      topCollaborators,
      topWorks: sorted.slice(0, 10).map((work) => ({
        id: work.id,
        title: work.title,
        citations: work.citations,
      })),
      externalSourcesQueried: 0,
    },
    warnings: [],
    executionPerformed: false,
  };
}

// ── IV_Research ─────────────────────────────────────────────────────────────

interface Source {
  readonly id: string;
  readonly title: string;
  readonly doi: string | null;
  readonly url: string | null;
  readonly abstract: string;
}

function runResearch(
  input: Readonly<Record<string, unknown>>,
  _context: SkillContext
): SkillOutcome {
  const warnings: string[] = [];
  const sources: Source[] = array(input.sources, 'sources', 100).map((raw, index) => {
    const source = asRecord(raw);
    const doi = optionalText(source.doi, `sources[${index}].doi`, 200);
    if (doi && !isValidDoi(doi)) {
      throw new SkillInputError('INVALID_DOI', `sources[${index}].doi no tiene formato DOI`);
    }
    const url = optionalText(source.url, `sources[${index}].url`, 500);
    if (url && !/^https:\/\//.test(url)) {
      warnings.push(`sources[${index}].url no es https; no se usará como enlace verificado`);
    }
    return {
      id: text(source.id, `sources[${index}].id`, { max: 120 }),
      title: text(source.title, `sources[${index}].title`, { max: 500 }),
      doi,
      url: url && /^https:\/\//.test(url) ? url : null,
      abstract: optionalText(source.abstract, `sources[${index}].abstract`, 8_000) ?? '',
    };
  });
  const sourceIds = new Set(sources.map((source) => source.id));
  if (sourceIds.size !== sources.length)
    throw new SkillInputError('DUPLICATE_SOURCE', 'los ids de sources deben ser únicos');

  const claims = array(input.claims, 'claims', 100).map((raw, index) => {
    const claim = asRecord(raw);
    const sourceId = optionalText(claim.sourceId, `claims[${index}].sourceId`, 120);
    if (sourceId && !sourceIds.has(sourceId)) {
      throw new SkillInputError(
        'UNKNOWN_SOURCE',
        `claims[${index}] referencia una fuente que no existe`
      );
    }
    return {
      id: text(claim.id, `claims[${index}].id`, { max: 120 }),
      text: text(claim.text, `claims[${index}].text`, { max: 2_000 }),
      sourceId,
    };
  });

  const verdicts = claims.map((claim) => {
    if (!claim.sourceId) {
      return { claimId: claim.id, verdict: 'NO_SOURCE' as const, support: 0, sourceId: null };
    }
    const source = sources.find((item) => item.id === claim.sourceId);
    if (!source) {
      return {
        claimId: claim.id,
        verdict: 'NO_SOURCE' as const,
        support: 0,
        sourceId: claim.sourceId,
      };
    }
    const support = jaccard(claim.text, `${source.title} ${source.abstract}`);
    const verdict =
      support >= 0.5
        ? ('SUPPORTED' as const)
        : support >= 0.2
          ? ('PARTIAL' as const)
          : ('UNSUPPORTED' as const);
    return { claimId: claim.id, verdict, support, sourceId: source.id };
  });

  const supported = verdicts.filter((item) => item.verdict === 'SUPPORTED').length;
  const noSource = verdicts.filter((item) => item.verdict === 'NO_SOURCE').length;
  const coverage =
    claims.length === 0 ? 0 : Math.round((supported / claims.length) * 10_000) / 10_000;

  return {
    status: 'OK',
    summary: `${supported}/${claims.length} afirmaciones con soporte textual; ${noSource} sin fuente.`,
    output: {
      verdicts,
      coverage,
      unsourced: noSource,
      sourcesUsed: [...new Set(verdicts.map((item) => item.sourceId).filter(Boolean))],
      method: 'lexical-jaccard',
      truthProven: false,
      externalSourcesFetched: 0,
    },
    warnings: [
      ...warnings,
      'El soporte léxico no demuestra verdad factual; solo coincidencia de términos.',
    ],
    executionPerformed: false,
  };
}

// ── IV_LegalResearch ────────────────────────────────────────────────────────

const LEGAL_TYPES = new Set(['constitution', 'statute', 'regulation', 'precedent', 'doctrine']);

function runLegalResearch(
  input: Readonly<Record<string, unknown>>,
  _context: SkillContext
): SkillOutcome {
  const jurisdiction = text(input.jurisdiction, 'jurisdiction', { max: 120 });
  const asOfRaw = text(input.asOf, 'asOf', { max: 40 });
  const asOf = Date.parse(asOfRaw);
  if (!Number.isFinite(asOf)) throw new SkillInputError('INVALID_DATE', 'asOf debe ser ISO 8601');

  const warnings: string[] = [];
  const sources = array(input.sources, 'sources', 100).map((raw, index) => {
    const source = asRecord(raw);
    const type = optionalText(source.type, `sources[${index}].type`, 40) ?? 'unknown';
    if (!LEGAL_TYPES.has(type)) warnings.push(`sources[${index}].type no reconocido: ${type}`);
    const officialUrl = optionalText(source.officialUrl, `sources[${index}].officialUrl`, 500);
    const publishedAtRaw = optionalText(source.publishedAt, `sources[${index}].publishedAt`, 40);
    const publishedAt = publishedAtRaw ? Date.parse(publishedAtRaw) : Number.NaN;
    const reasons: string[] = [];
    if (!officialUrl || !/^https:\/\//.test(officialUrl)) reasons.push('OFFICIAL_URL_REQUIRED');
    if (!Number.isFinite(publishedAt)) reasons.push('PUBLISHED_AT_INVALID');
    else if (publishedAt > asOf) reasons.push('PUBLISHED_AFTER_AS_OF');
    const citation = text(source.citation, `sources[${index}].citation`, { max: 300 });
    return {
      id: text(source.id, `sources[${index}].id`, { max: 120 }),
      title: text(source.title, `sources[${index}].title`, { max: 500 }),
      type,
      citation,
      officialUrl: officialUrl && /^https:\/\//.test(officialUrl) ? officialUrl : null,
      publishedAt: Number.isFinite(publishedAt) ? new Date(publishedAt).toISOString() : null,
      traceable: reasons.length === 0,
      reasons,
    };
  });

  const traceable = sources.filter((source) => source.traceable).length;
  return {
    status: 'OK',
    summary: `${traceable}/${sources.length} fuentes jurídicas trazables a ${asOfRaw}.`,
    output: {
      jurisdiction,
      asOf: new Date(asOf).toISOString(),
      sources,
      traceable,
      advisoryOnly: true,
      disclaimer:
        'No es asesoría jurídica. La trazabilidad de una fuente no acredita su vigencia ni su aplicabilidad.',
    },
    warnings,
    executionPerformed: false,
  };
}

// ── IV_OpenScience ──────────────────────────────────────────────────────────

function runOpenScience(
  input: Readonly<Record<string, unknown>>,
  _context: SkillContext
): SkillOutcome {
  const study = asRecord(input.study);
  const id = text(study.id, 'study.id', { max: 120 });
  const title = text(study.title, 'study.title', { max: 500 });
  const authors = array(study.authors, 'study.authors', 100)
    .filter((author): author is string => typeof author === 'string')
    .map((author) => author.trim())
    .filter(Boolean);
  const license = validateLicense(optionalText(study.license, 'study.license', 120));
  const dataUrl = optionalText(study.dataUrl, 'study.dataUrl', 500);
  const codeUrl = optionalText(study.codeUrl, 'study.codeUrl', 500);
  const method = optionalText(study.method, 'study.method', 4_000);
  const results = optionalText(study.results, 'study.results', 4_000);
  const doi = optionalText(study.doi, 'study.doi', 200);
  if (doi && !isValidDoi(doi)) throw new SkillInputError('INVALID_DOI', 'study.doi inválido');

  const missing: string[] = [];
  if (authors.length === 0) missing.push('authors');
  if (!license.valid) missing.push('license');
  if (!dataUrl || !/^https:\/\//.test(dataUrl)) missing.push('dataUrl');
  if (!method) missing.push('method');
  if (!results) missing.push('results');
  if (!codeUrl) missing.push('codeUrl');

  const fair = [
    { id: 'findable', pass: Boolean(id && title && (doi || dataUrl)) },
    { id: 'accessible', pass: Boolean(dataUrl && /^https:\/\//.test(dataUrl)) },
    { id: 'interoperable', pass: Boolean(method && results) },
    { id: 'reusable', pass: Boolean(license.valid && codeUrl) },
  ];
  const manifest = {
    id,
    title,
    authors,
    license: license.normalized,
    dataUrl,
    codeUrl,
    method,
    results,
    doi,
    fair,
  };

  return {
    status: 'OK',
    summary:
      missing.length === 0
        ? 'Manifiesto de reproducibilidad completo según metadatos declarados.'
        : `Manifiesto incompleto: faltan ${missing.join(', ')}.`,
    output: {
      manifest,
      fairScore: fair.filter((item) => item.pass).length,
      fairTotal: fair.length,
      missing,
      manifestDigest: digest(manifest),
      complete: missing.length === 0,
      reproduced: false,
    },
    warnings: ['Un manifiesto completo no demuestra que el estudio sea reproducible.'],
    executionPerformed: false,
  };
}

// ── IV_KnowledgeIngestion ───────────────────────────────────────────────────

function runKnowledgeIngestion(
  input: Readonly<Record<string, unknown>>,
  _context: SkillContext
): SkillOutcome {
  const source = asRecord(input.source);
  const decision: IngestionDecision = evaluateIngestion({
    sourceId: typeof source.id === 'string' ? source.id : undefined,
    sourceUri: typeof source.uri === 'string' ? source.uri : undefined,
    license: typeof source.license === 'string' ? source.license : undefined,
    provenance: typeof source.provenance === 'string' ? source.provenance : undefined,
    containsUnauthorizedPii: bool(source.containsUnauthorizedPii),
    robotsAllowed: bool(source.robotsAllowed),
    controlEvasion: bool(source.controlEvasion),
    rightToBeForgotten: bool(source.rightToBeForgotten),
    authorityRecognized: bool(source.authorityRecognized),
    bookpiSignature:
      typeof source.bookpiSignature === 'string' ? source.bookpiSignature : undefined,
    quarantined: bool(source.quarantined),
    requiresHumanReview: bool(source.requiresHumanReview),
    humanReviewGranted: bool(source.humanReviewGranted),
  });

  return {
    status: decision.admitted ? 'OK' : 'BLOCKED',
    summary: `Ingesta ${decision.verdict} (${decision.stages.length} etapas, ${decision.failed.length} fallidas).`,
    output: {
      verdict: decision.verdict,
      stages: decision.stages,
      failed: decision.failed,
      evidenceDigest: decision.evidenceDigest,
      downloadPerformed: false,
      trainingPerformed: false,
    },
    warnings:
      decision.verdict === 'QUARANTINE'
        ? ['La fuente queda en cuarentena hasta revisión humana verificada.']
        : [],
    executionPerformed: false,
  };
}

// ── IV_Governance ───────────────────────────────────────────────────────────

const DOMAIN_ACTIONS = new Set<DomainAction>([
  'create',
  'supplant',
  'fraud',
  'unauthorized_access',
  'evidence_destruction',
  'deploy',
  'payment',
  'ingest',
  'learn',
  'execute',
]);

function runGovernance(
  input: Readonly<Record<string, unknown>>,
  _context: SkillContext
): SkillOutcome {
  const actions = array(input.actions, 'actions', 50).map((raw, index) => {
    const action = asRecord(raw);
    const requested = optionalText(action.action, `actions[${index}].action`, 40) ?? 'execute';
    if (!DOMAIN_ACTIONS.has(requested as DomainAction)) {
      throw new SkillInputError('UNKNOWN_ACTION', `actions[${index}].action desconocida`);
    }
    return {
      id: text(action.id, `actions[${index}].id`, { max: 120 }),
      decision: evaluateConstitutional({
        action: requested as DomainAction,
        vectors: {
          identity: bool(action.identity),
          authority: bool(action.authority),
          policy: bool(action.policy),
          evidence: bool(action.evidence),
          safety: bool(action.safety),
        },
        humanApproval: bool(action.humanApproval),
      }),
    };
  });

  const allowed = actions.filter((item) => item.decision.allowed).length;
  return {
    status: 'OK',
    summary: `${allowed}/${actions.length} acciones satisfacen la constitución.`,
    output: {
      decisions: actions,
      allowed,
      denied: actions.length - allowed,
      executionPerformed: false,
      authorizationPerformed: false,
    },
    warnings: ['ALLOW no concede autoridad ni ejecuta: CROWN sigue siendo la autoridad.'],
    executionPerformed: false,
  };
}

// ── IV_Multimodal ───────────────────────────────────────────────────────────

const MODALITIES = new Set(['text', 'image', 'audio', 'video']);

function runMultimodal(
  input: Readonly<Record<string, unknown>>,
  _context: SkillContext
): SkillOutcome {
  const requested = array(input.modalities, 'modalities', 4).map((value, index) =>
    text(value, `modalities[${index}]`, { max: 20 })
  );
  const unknown = requested.filter((value) => !MODALITIES.has(value));
  if (unknown.length > 0)
    throw new SkillInputError(
      'UNKNOWN_MODALITY',
      `modalidades no soportadas: ${unknown.join(', ')}`
    );

  const task = text(input.task, 'task', { max: 500 });
  const payload = input.payload === undefined ? {} : asRecord(input.payload);
  const limits: Record<
    string,
    {
      readonly maxBytes?: number;
      readonly maxChars?: number;
      readonly maxSeconds?: number;
      readonly maxPixels?: number;
    }
  > = {
    text: { maxChars: 32_000 },
    image: { maxBytes: 20 * 1024 * 1024, maxPixels: 4_096 * 4_096 },
    audio: { maxBytes: 25 * 1024 * 1024, maxSeconds: 300 },
    video: { maxBytes: 200 * 1024 * 1024, maxSeconds: 120 },
  };
  const providers: Record<string, string> = {
    text: 'cognition',
    image: 'vision',
    audio: 'transcription',
    video: 'wan-i2v',
  };

  const plan = requested.map((modality) => {
    const limit = limits[modality] ?? {};
    const violations: string[] = [];
    if (limit.maxChars && typeof payload.chars === 'number' && payload.chars > limit.maxChars)
      violations.push('CHARS_EXCEEDED');
    if (limit.maxBytes && typeof payload.bytes === 'number' && payload.bytes > limit.maxBytes)
      violations.push('BYTES_EXCEEDED');
    if (
      limit.maxSeconds &&
      typeof payload.durationSec === 'number' &&
      payload.durationSec > limit.maxSeconds
    )
      violations.push('DURATION_EXCEEDED');
    if (limit.maxPixels && typeof payload.pixels === 'number' && payload.pixels > limit.maxPixels)
      violations.push('PIXELS_EXCEEDED');
    return {
      modality,
      provider: providers[modality] ?? 'unknown',
      accepted: violations.length === 0,
      violations,
      limits: limit,
    };
  });

  return {
    status: plan.every((item) => item.accepted) ? 'OK' : 'REJECTED',
    summary: `Plan multimodal para ${plan.length} modalidad(es); no se procesó contenido.`,
    output: { task, plan, executionPerformed: false, pixelsProcessed: 0, audioProcessedSec: 0 },
    warnings: ['Este skill planifica el ruteo; no ejecuta OCR, visión, transcripción ni video.'],
    executionPerformed: false,
  };
}

// ── IV_MusicStudio ──────────────────────────────────────────────────────────

const KEY_PATTERN = /^[A-G](#|b)?m?$/;

function runMusicStudio(
  input: Readonly<Record<string, unknown>>,
  _context: SkillContext
): SkillOutcome {
  const brief = text(input.brief, 'brief', { max: 2_000 });
  const tempo = integer(input.tempo, 'tempo', 40, 220, 96);
  const durationSec = integer(input.durationSec, 'durationSec', 10, 600, 60);
  const key = optionalText(input.key, 'key', 8) ?? 'C';
  if (!KEY_PATTERN.test(key))
    throw new SkillInputError('INVALID_KEY', 'key debe ser A–G, con #/b y m');
  const stems = Array.isArray(input.stems)
    ? input.stems
        .filter((stem): stem is string => typeof stem === 'string')
        .map((stem) => stem.trim().toLowerCase())
        .filter((stem) => ['vocals', 'drums', 'bass', 'keys', 'other'].includes(stem))
        .slice(0, 8)
    : ['drums', 'bass', 'keys'];

  const totalBars = Math.max(4, Math.round((durationSec * tempo) / 60 / 4));
  const shape = [
    { name: 'intro', weight: 0.15 },
    { name: 'verse', weight: 0.3 },
    { name: 'chorus', weight: 0.35 },
    { name: 'outro', weight: 0.2 },
  ] as const;
  let assigned = 0;
  const sections = shape.map((section, index) => {
    const bars =
      index === shape.length - 1
        ? Math.max(1, totalBars - assigned)
        : Math.max(1, Math.floor(totalBars * section.weight));
    assigned += bars;
    return {
      name: section.name,
      bars,
      startBar: assigned - bars + 1,
      energy: section.name === 'chorus' ? 'high' : section.name === 'intro' ? 'low' : 'medium',
    };
  });

  return {
    status: 'OK',
    summary: `Plan de ${totalBars} compases a ${tempo} BPM en ${key}; sin síntesis.`,
    output: {
      brief,
      tempo,
      key,
      durationSec,
      totalBars,
      sections,
      stems,
      estimatedPcmBytes: durationSec * 44_100 * 2 * 2,
      provider: 'tamv-local',
      synthesisPerformed: false,
      stemsSeparated: false,
      modelUsed: false,
    },
    warnings: ['La separación de stems por modelo no está implementada; solo existe DSP clásico.'],
    executionPerformed: false,
  };
}

// ── IV_VoiceStudio ──────────────────────────────────────────────────────────

interface ConsentRecord {
  readonly granted: boolean;
  readonly subjectId: string | null;
  readonly scopes: readonly string[];
  readonly recordedAt: string | null;
  readonly expiresAt: string | null;
}

function readConsent(value: unknown): ConsentRecord {
  const consent = asRecord(value);
  return {
    granted: bool(consent.granted),
    subjectId: optionalText(consent.subjectId, 'consent.subjectId', 120),
    scopes: Array.isArray(consent.scopes)
      ? consent.scopes.filter((scope): scope is string => typeof scope === 'string').slice(0, 20)
      : [],
    recordedAt: optionalText(consent.recordedAt, 'consent.recordedAt', 40),
    expiresAt: optionalText(consent.expiresAt, 'consent.expiresAt', 40),
  };
}

function runVoiceStudio(
  input: Readonly<Record<string, unknown>>,
  context: SkillContext
): SkillOutcome {
  const textValue = text(input.text, 'text', { max: 2_000 });
  const voiceId = text(input.voiceId, 'voiceId', { max: 120 });
  const consent = readConsent(input.consent);
  const watermark = asRecord(input.watermark ?? {});
  const now = Date.parse(context.now ?? new Date().toISOString());
  if (!Number.isFinite(now)) throw new SkillInputError('INVALID_CONTEXT_CLOCK', 'now inválido');

  const reasons: string[] = [];
  if (!consent.granted) reasons.push('CONSENT_NOT_GRANTED');
  if (!consent.subjectId) reasons.push('SUBJECT_ID_REQUIRED');
  if (!consent.scopes.includes('voice.synthesis') && !consent.scopes.includes('synthesis')) {
    reasons.push('SCOPE_MISSING');
  }
  const recordedAt = consent.recordedAt ? Date.parse(consent.recordedAt) : Number.NaN;
  if (!Number.isFinite(recordedAt)) reasons.push('RECORDED_AT_INVALID');
  else if (recordedAt > now) reasons.push('RECORDED_AT_IN_FUTURE');
  if (consent.expiresAt) {
    const expiresAt = Date.parse(consent.expiresAt);
    if (!Number.isFinite(expiresAt)) reasons.push('EXPIRES_AT_INVALID');
    else if (expiresAt <= now) reasons.push('CONSENT_EXPIRED');
  }
  if (!bool(watermark.enabled)) reasons.push('WATERMARK_REQUIRED');

  if (reasons.length > 0) {
    return {
      status: 'BLOCKED',
      summary: `Síntesis bloqueada: ${reasons.join(', ')}.`,
      output: {
        voiceId,
        chars: textValue.length,
        reasons,
        synthesisPerformed: false,
        audioProduced: false,
        consentValid: false,
      },
      warnings: ['Sin consentimiento verificable no se sintetiza voz.'],
      executionPerformed: false,
    };
  }

  const consentRef = digest({
    subjectId: consent.subjectId,
    voiceId,
    scopes: consent.scopes,
    recordedAt: consent.recordedAt,
    expiresAt: consent.expiresAt,
  });
  const watermarkToken = digest({ consentRef, voiceId, text: textValue, at: context.now ?? null });

  return {
    status: 'OK',
    summary: 'Consentimiento y marca de agua verificados; se autoriza un plan de síntesis.',
    output: {
      voiceId,
      chars: textValue.length,
      consentRef,
      watermark: { required: true, token: watermarkToken, audible: bool(watermark.audible) },
      request: { format: 'wav', sampleRate: 24_000, text: textValue },
      synthesisPerformed: false,
      audioProduced: false,
      nextStep: 'invocar la superficie TTS gobernada con consentRef',
    },
    warnings: [
      'Este skill no sintetiza audio; solo valida el consentimiento y prepara la solicitud.',
    ],
    executionPerformed: false,
  };
}

// ── Registro ────────────────────────────────────────────────────────────────

export const NATIVE_SKILLS: readonly SkillDefinition[] = [
  {
    id: 'IV_PromptEngineering',
    label: 'Prompt Engineering',
    summary: 'Reestructura y audita un prompt sin usar un modelo.',
    maturity: 'tested',
    executes: false,
    note: 'La calidad semántica no se evalúa aquí.',
    run: runPromptEngineering,
  },
  {
    id: 'IV_Research',
    label: 'Research',
    summary: 'Contrasta afirmaciones con fuentes declaradas.',
    maturity: 'tested',
    executes: false,
    note: 'Soporte léxico, no verdad factual.',
    run: runResearch,
  },
  {
    id: 'IV_Bibliometrics',
    label: 'Bibliometrics',
    summary: 'Calcula índices bibliométricos sobre obras declaradas.',
    maturity: 'tested',
    executes: false,
    note: 'No consulta bases externas.',
    run: runBibliometrics,
  },
  {
    id: 'IV_LegalResearch',
    label: 'Legal Research',
    summary: 'Evalúa trazabilidad de fuentes jurídicas.',
    maturity: 'tested',
    executes: false,
    note: 'No es asesoría jurídica.',
    run: runLegalResearch,
  },
  {
    id: 'IV_OpenScience',
    label: 'Open Science',
    summary: 'Construye un manifiesto de reproducibilidad y checklist FAIR.',
    maturity: 'tested',
    executes: false,
    note: 'No reproduce el estudio.',
    run: runOpenScience,
  },
  {
    id: 'IV_KnowledgeIngestion',
    label: 'Knowledge Ingestion',
    summary: 'Aplica el gate de 14 etapas a una fuente declarada.',
    maturity: 'tested',
    executes: false,
    note: 'No descarga ni entrena.',
    run: runKnowledgeIngestion,
  },
  {
    id: 'IV_Governance',
    label: 'Governance',
    summary: 'Evalúa un lote de acciones contra la constitución.',
    maturity: 'tested',
    executes: false,
    note: 'ALLOW no autoriza ni ejecuta.',
    run: runGovernance,
  },
  {
    id: 'IV_Multimodal',
    label: 'Multimodal',
    summary: 'Planifica el ruteo multimodal y valida límites.',
    maturity: 'tested',
    executes: false,
    note: 'No procesa contenido.',
    run: runMultimodal,
  },
  {
    id: 'IV_MusicStudio',
    label: 'Music Studio',
    summary: 'Genera un plan de arreglo y stems.',
    maturity: 'tested',
    executes: false,
    note: 'No sintetiza audio.',
    run: runMusicStudio,
  },
  {
    id: 'IV_VoiceStudio',
    label: 'Voice Studio',
    summary: 'Valida consentimiento y marca de agua para voz.',
    maturity: 'tested',
    executes: false,
    note: 'No sintetiza ni clona voz.',
    run: runVoiceStudio,
  },
];

const SKILL_INDEX = new Map<string, SkillDefinition>(
  NATIVE_SKILLS.map((skill) => [skill.id, skill])
);

export function isNativeSkillId(value: unknown): value is SkillId {
  return typeof value === 'string' && SKILL_INDEX.has(value);
}

export function describeNativeSkills(): ReadonlyArray<{
  readonly id: SkillId;
  readonly label: string;
  readonly summary: string;
  readonly maturity: 'tested';
  readonly executes: boolean;
  readonly note: string;
}> {
  return NATIVE_SKILLS.map((skill) => ({
    id: skill.id,
    label: skill.label,
    summary: skill.summary,
    maturity: skill.maturity,
    executes: skill.executes,
    note: skill.note,
  }));
}

export function runNativeSkill(
  skillId: string,
  input: Readonly<Record<string, unknown>> = {},
  context: SkillContext = {}
): SkillRunResult {
  const skill = SKILL_INDEX.get(skillId);
  if (!skill) {
    return {
      skillId,
      ok: false,
      status: 'REJECTED',
      summary: `Skill desconocida: ${skillId}`,
      output: {},
      warnings: [],
      evidenceDigest: digest({ skillId, error: 'UNKNOWN_SKILL' }),
      executionPerformed: false,
      externalCalls: 0,
      maturity: 'tested',
      error: 'UNKNOWN_SKILL',
    };
  }

  try {
    const outcome = skill.run(input, context);
    return {
      skillId,
      ok: outcome.status === 'OK',
      status: outcome.status,
      summary: outcome.summary,
      output: outcome.output,
      warnings: outcome.warnings,
      evidenceDigest: digest({
        skillId,
        status: outcome.status,
        input,
        output: outcome.output,
      }),
      executionPerformed: outcome.executionPerformed,
      externalCalls: 0,
      maturity: 'tested',
    };
  } catch (error) {
    const code = error instanceof SkillInputError ? error.code : 'SKILL_FAILED';
    return {
      skillId,
      ok: false,
      status: error instanceof SkillInputError ? 'REJECTED' : 'FAILED',
      summary: error instanceof Error ? error.message : 'SKILL_FAILED',
      output: {},
      warnings: [],
      evidenceDigest: digest({ skillId, error: code }),
      executionPerformed: false,
      externalCalls: 0,
      maturity: 'tested',
      error: code,
    };
  }
}
