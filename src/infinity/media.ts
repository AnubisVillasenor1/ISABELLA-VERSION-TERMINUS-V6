/**
 * ISABELLA VILLASEÑOR AI™ — Sovereign Media Fabric.
 * state: draft | engine-generated.
 *
 * Fuente: `ISABELLA_VILLASENOR_AI_MASTER_CONSOLIDATED.docx`, sección 25
 * (equivalencias de Aftershoot). Todo es determinista y local:
 *
 *   - culling por métricas declaradas, no por un modelo de visión;
 *   - estilo por centroide de features declaradas, no por aprendizaje de píxeles;
 *   - retoque como plan acotado, nunca mutación de píxeles;
 *   - galería con tokens de prueba (no secretos de autenticación);
 *   - cotización de impresión con Profit Guard.
 *
 * `pixelsModified` y `networkUsed` son siempre `false`.
 */
import { minimumProfitablePrice } from '../economy/profit-guard';
import { digest, SkillInputError } from './skills';

export type MediaOperation =
  | 'cull'
  | 'style-learn'
  | 'style-score'
  | 'retouch-plan'
  | 'gallery'
  | 'print-quote'
  | 'face-index';

export const MEDIA_OPERATIONS: readonly MediaOperation[] = [
  'cull',
  'style-learn',
  'style-score',
  'retouch-plan',
  'gallery',
  'print-quote',
  'face-index',
];

export interface MediaResult {
  readonly operation: string;
  readonly ok: boolean;
  readonly status: 'OK' | 'REJECTED';
  readonly summary: string;
  readonly output: Readonly<Record<string, unknown>>;
  readonly warnings: readonly string[];
  readonly evidenceDigest: string;
  readonly pixelsModified: false;
  readonly networkUsed: false;
  readonly error?: string;
}

function record(value: unknown): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new SkillInputError('INVALID_INPUT', 'se esperaba un objeto');
  }
  return value as Record<string, unknown>;
}

function list(value: unknown, field: string, max: number): readonly unknown[] {
  if (!Array.isArray(value))
    throw new SkillInputError('INVALID_FIELD', `${field} debe ser arreglo`);
  if (value.length > max) throw new SkillInputError('LIMIT_EXCEEDED', `${field} excede ${max}`);
  return value;
}

function str(value: unknown, field: string, max = 200): string {
  if (typeof value !== 'string' || !value.trim())
    throw new SkillInputError('INVALID_FIELD', `${field} requerido`);
  return value.trim().slice(0, max);
}

function num(value: unknown, field: string, min: number, max: number, fallback?: number): number {
  if (value === undefined || value === null) {
    if (fallback !== undefined) return fallback;
    throw new SkillInputError('INVALID_FIELD', `${field} requerido`);
  }
  if (typeof value !== 'number' || !Number.isFinite(value) || value < min || value > max) {
    throw new SkillInputError('LIMIT_EXCEEDED', `${field} debe estar entre ${min} y ${max}`);
  }
  return value;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function round(value: number, decimals = 4): number {
  const factor = 10 ** decimals;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

function cosine(a: readonly number[], b: readonly number[]): number {
  if (a.length !== b.length || a.length === 0) return 0;
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let index = 0; index < a.length; index += 1) {
    const left = a[index] ?? 0;
    const right = b[index] ?? 0;
    dot += left * right;
    normA += left * left;
    normB += right * right;
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

function vector(value: unknown, field: string, maxDims: number): readonly number[] {
  const values = list(value, field, maxDims);
  if (values.length < 3)
    throw new SkillInputError('INVALID_FIELD', `${field} requiere al menos 3 dimensiones`);
  return values.map((item, index) => {
    if (typeof item !== 'number' || !Number.isFinite(item)) {
      throw new SkillInputError('INVALID_FIELD', `${field}[${index}] debe ser número`);
    }
    return item;
  });
}

function cull(input: Readonly<Record<string, unknown>>): MediaResult {
  const candidates = list(input.candidates, 'candidates', 500).map((raw, index) => {
    const item = record(raw);
    return {
      id: str(item.id, `candidates[${index}].id`, 120),
      sharpness: num(item.sharpness, `candidates[${index}].sharpness`, 0, 1),
      exposure: num(item.exposure, `candidates[${index}].exposure`, 0, 1),
      faceCount: num(item.faceCount, `candidates[${index}].faceCount`, 0, 20, 0),
      duplicateGroup:
        typeof item.duplicateGroup === 'string' && item.duplicateGroup.trim()
          ? item.duplicateGroup.trim().slice(0, 80)
          : null,
    };
  });
  if (candidates.length === 0) throw new SkillInputError('EMPTY_CANDIDATES', 'candidates vacío');
  const keepRatio = num(input.keepRatio, 'keepRatio', 0.05, 1, 0.5);

  const scored = candidates.map((candidate) => ({
    ...candidate,
    score: round(
      0.45 * candidate.sharpness +
        0.35 * candidate.exposure +
        0.1 * Math.min(1, candidate.faceCount / 3) +
        (candidate.duplicateGroup ? 0 : 0.1)
    ),
  }));

  const bestOfGroup = new Map<string, string>();
  for (const item of scored) {
    if (!item.duplicateGroup) continue;
    const current = bestOfGroup.get(item.duplicateGroup);
    const currentScore = scored.find((entry) => entry.id === current)?.score ?? -1;
    if (item.score > currentScore) bestOfGroup.set(item.duplicateGroup, item.id);
  }

  const sorted = [...scored].sort((a, b) => b.score - a.score || a.id.localeCompare(b.id));
  const keepCount = Math.max(1, Math.ceil(sorted.length * keepRatio));
  const keepIds = new Set(sorted.slice(0, keepCount).map((item) => item.id));
  for (const id of bestOfGroup.values()) keepIds.add(id);

  const decisions = sorted.map((item, rank) => {
    const reasons: string[] = [];
    let keep = keepIds.has(item.id);
    if (item.duplicateGroup && bestOfGroup.get(item.duplicateGroup) !== item.id) {
      keep = false;
      reasons.push('DUPLICATE_LOWER_SCORE');
    }
    if (!keep && reasons.length === 0) reasons.push('BELOW_KEEP_THRESHOLD');
    if (item.sharpness < 0.25) reasons.push('LOW_SHARPNESS');
    if (item.exposure < 0.2) reasons.push('LOW_EXPOSURE');
    return { id: item.id, rank: rank + 1, score: item.score, keep, reasons };
  });

  return {
    operation: 'cull',
    ok: true,
    status: 'OK',
    summary: `${decisions.filter((item) => item.keep).length}/${decisions.length} candidatas conservadas.`,
    output: {
      decisions,
      kept: decisions.filter((item) => item.keep).map((item) => item.id),
      rejected: decisions.filter((item) => !item.keep).map((item) => item.id),
      keepRatio,
      modelUsed: false,
    },
    warnings: ['El puntaje usa métricas declaradas; no inspecciona píxeles ni caras reales.'],
    evidenceDigest: digest({ operation: 'cull', decisions }),
    pixelsModified: false,
    networkUsed: false,
  };
}

function styleLearn(input: Readonly<Record<string, unknown>>): MediaResult {
  const samples = list(input.samples, 'samples', 200).map((raw, index) => {
    const item = record(raw);
    return {
      id: str(item.id, `samples[${index}].id`, 120),
      features: vector(item.features, `samples[${index}].features`, 512),
    };
  });
  if (samples.length === 0) throw new SkillInputError('EMPTY_SAMPLES', 'samples vacío');
  const dims = samples[0]?.features.length ?? 0;
  if (samples.some((sample) => sample.features.length !== dims)) {
    throw new SkillInputError(
      'DIMENSION_MISMATCH',
      'todas las muestras deben tener la misma dimensión'
    );
  }
  const centroid = Array.from({ length: dims }, (_, dim) => {
    const sum = samples.reduce((total, sample) => total + (sample.features[dim] ?? 0), 0);
    return round(sum / samples.length, 6);
  });
  const dispersion = round(
    samples.reduce((total, sample) => total + (1 - cosine(sample.features, centroid)), 0) /
      samples.length,
    6
  );

  return {
    operation: 'style-learn',
    ok: true,
    status: 'OK',
    summary: `Perfil de estilo aprendido de ${samples.length} muestra(s) de ${dims}D.`,
    output: {
      profile: { dims, centroid, dispersion, samples: samples.length },
      modelUsed: false,
      styleLearnedFromPixels: false,
    },
    warnings: ['El perfil se calcula sobre features declaradas; no aprende de imágenes.'],
    evidenceDigest: digest({ operation: 'style-learn', centroid, dispersion }),
    pixelsModified: false,
    networkUsed: false,
  };
}

function styleScore(input: Readonly<Record<string, unknown>>): MediaResult {
  const profile = record(input.profile);
  const centroid = vector(profile.centroid, 'profile.centroid', 512);
  const threshold = num(input.threshold, 'threshold', 0.5, 1, 0.85);
  const items = list(input.items, 'items', 200).map((raw, index) => {
    const item = record(raw);
    const features = vector(item.features, `items[${index}].features`, 512);
    const similarity = round(cosine(features, centroid), 4);
    return {
      id: str(item.id, `items[${index}].id`, 120),
      similarity,
      match: similarity >= threshold,
    };
  });

  return {
    operation: 'style-score',
    ok: true,
    status: 'OK',
    summary: `${items.filter((item) => item.match).length}/${items.length} coinciden con el estilo.`,
    output: { threshold, items, modelUsed: false },
    warnings: ['La similitud depende de las features que aporte el llamador.'],
    evidenceDigest: digest({ operation: 'style-score', items, threshold }),
    pixelsModified: false,
    networkUsed: false,
  };
}

function retouchPlan(input: Readonly<Record<string, unknown>>): MediaResult {
  const metadata = record(input.metadata ?? {});
  const exposureEv = num(metadata.exposureEv, 'metadata.exposureEv', -5, 5, 0);
  const contrast = num(metadata.contrast, 'metadata.contrast', -100, 100, 0);
  const temperatureK = num(metadata.temperatureK, 'metadata.temperatureK', 2_000, 12_000, 5_500);
  const shadows = num(metadata.shadows, 'metadata.shadows', -100, 100, 0);
  const highlights = num(metadata.highlights, 'metadata.highlights', -100, 100, 0);

  const plan = {
    exposureEv: round(clamp(-exposureEv * 0.5, -1.5, 1.5), 2),
    contrast: round(clamp(-contrast * 0.3, -40, 40), 2),
    temperatureShift: round(clamp((5_500 - temperatureK) / 100, -40, 40), 2),
    shadows: round(clamp(-shadows * 0.3, -40, 40), 2),
    highlights: round(clamp(-highlights * 0.3, -40, 40), 2),
  };

  return {
    operation: 'retouch-plan',
    ok: true,
    status: 'OK',
    summary: 'Plan de retoque acotado; no se modificó ningún píxel.',
    output: {
      plan,
      limits: { exposureEv: 1.5, contrast: 40, temperatureShift: 40 },
      pixelsModified: false,
    },
    warnings: ['Los valores son una sugerencia determinista, no un retoque aplicado.'],
    evidenceDigest: digest({ operation: 'retouch-plan', plan }),
    pixelsModified: false,
    networkUsed: false,
  };
}

function gallery(input: Readonly<Record<string, unknown>>): MediaResult {
  const galleryId = str(input.galleryId, 'galleryId', 120);
  const title = str(input.title, 'title', 300);
  const expiresAtRaw = str(input.expiresAt, 'expiresAt', 40);
  const expiresAt = Date.parse(expiresAtRaw);
  if (!Number.isFinite(expiresAt)) throw new SkillInputError('INVALID_DATE', 'expiresAt inválido');
  const items = list(input.items, 'items', 200).map((raw, index) => {
    const item = record(raw);
    const id = str(item.id, `items[${index}].id`, 120);
    const hash = typeof item.hash === 'string' ? item.hash.slice(0, 200) : null;
    return {
      id,
      hash,
      proofingToken: digest({ galleryId, id, index, expiresAt: new Date(expiresAt).toISOString() }),
      approved: item.approved === true,
    };
  });

  return {
    operation: 'gallery',
    ok: true,
    status: 'OK',
    summary: `Galería ${galleryId} con ${items.length} elemento(s) de proofing.`,
    output: {
      galleryId,
      title,
      expiresAt: new Date(expiresAt).toISOString(),
      items,
      publicUrl: null,
      published: false,
      note: 'Los tokens de proofing no son credenciales de autenticación.',
    },
    warnings: ['No se publica ni se aloja la galería; solo se genera el manifiesto.'],
    evidenceDigest: digest({ operation: 'gallery', galleryId, items }),
    pixelsModified: false,
    networkUsed: false,
  };
}

function printQuote(input: Readonly<Record<string, unknown>>): MediaResult {
  const items = list(input.items, 'items', 50).map((raw, index) => {
    const item = record(raw);
    const cost = num(item.cost, `items[${index}].cost`, 0, 1_000_000);
    const marginBps = num(item.marginBps, `items[${index}].marginBps`, 0, 9_900, 2_500);
    const qty = num(item.qty, `items[${index}].qty`, 1, 1_000, 1);
    const unitPrice = minimumProfitablePrice(cost, marginBps);
    return {
      id: str(item.id, `items[${index}].id`, 120),
      cost: round(cost, 2),
      marginBps,
      qty: Math.trunc(qty),
      unitPrice,
      lineTotal: round(unitPrice * Math.trunc(qty), 2),
      lineCost: round(cost * Math.trunc(qty), 2),
      lineProfit: round((unitPrice - cost) * Math.trunc(qty), 2),
    };
  });
  const totalPrice = round(
    items.reduce((total, item) => total + item.lineTotal, 0),
    2
  );
  const totalCost = round(
    items.reduce((total, item) => total + item.lineCost, 0),
    2
  );
  const totalProfit = round(totalPrice - totalCost, 2);
  const margin = totalPrice > 0 ? round(totalProfit / totalPrice, 4) : 0;

  return {
    operation: 'print-quote',
    ok: totalProfit >= 0,
    status: totalProfit >= 0 ? 'OK' : 'REJECTED',
    summary: `Cotización ${totalPrice} con utilidad ${totalProfit}; margen ${(margin * 100).toFixed(2)}%.`,
    output: {
      currency: 'MXN',
      items,
      totalPrice,
      totalCost,
      totalProfit,
      margin,
      belowCost: totalProfit < 0,
      charged: false,
      paymentExecuted: false,
    },
    warnings: ['Cotización determinista; no cobra ni reserva inventario.'],
    evidenceDigest: digest({ operation: 'print-quote', items, totalPrice, totalCost }),
    pixelsModified: false,
    networkUsed: false,
  };
}

function faceIndex(input: Readonly<Record<string, unknown>>): MediaResult {
  const threshold = num(input.threshold, 'threshold', 0.5, 1, 0.85);
  const faces = list(input.faces, 'faces', 500).map((raw, index) => {
    const item = record(raw);
    return {
      id: str(item.id, `faces[${index}].id`, 120),
      vector: vector(item.vector, `faces[${index}].vector`, 512),
    };
  });
  const dims = faces[0]?.vector.length ?? 0;
  if (faces.some((face) => face.vector.length !== dims)) {
    throw new SkillInputError(
      'DIMENSION_MISMATCH',
      'todos los vectores deben tener la misma dimensión'
    );
  }

  const clusters: Array<{ clusterId: string; members: string[] }> = [];
  for (const face of faces) {
    let assigned = false;
    for (const cluster of clusters) {
      const representative = faces.find((item) => item.id === cluster.members[0]);
      if (representative && cosine(face.vector, representative.vector) >= threshold) {
        cluster.members.push(face.id);
        assigned = true;
        break;
      }
    }
    if (!assigned)
      clusters.push({ clusterId: `cluster-${clusters.length + 1}`, members: [face.id] });
  }

  return {
    operation: 'face-index',
    ok: true,
    status: 'OK',
    summary: `${faces.length} embedding(s) agrupados en ${clusters.length} clúster(es).`,
    output: {
      clusters,
      threshold,
      detectionPerformed: false,
      embeddingsProvided: faces.length,
    },
    warnings: ['No se detectan caras: solo se agrupan embeddings provistos por el llamador.'],
    evidenceDigest: digest({ operation: 'face-index', clusters, threshold }),
    pixelsModified: false,
    networkUsed: false,
  };
}

const OPERATIONS: Readonly<
  Record<MediaOperation, (input: Readonly<Record<string, unknown>>) => MediaResult>
> = {
  cull,
  'style-learn': styleLearn,
  'style-score': styleScore,
  'retouch-plan': retouchPlan,
  gallery,
  'print-quote': printQuote,
  'face-index': faceIndex,
};

export function isMediaOperation(value: unknown): value is MediaOperation {
  return typeof value === 'string' && (MEDIA_OPERATIONS as readonly string[]).includes(value);
}

export function runMediaOperation(
  operation: string,
  input: Readonly<Record<string, unknown>> = {}
): MediaResult {
  if (!isMediaOperation(operation)) {
    return {
      operation,
      ok: false,
      status: 'REJECTED',
      summary: `Operación de media desconocida: ${operation}`,
      output: {},
      warnings: [],
      evidenceDigest: digest({ operation, error: 'UNKNOWN_OPERATION' }),
      pixelsModified: false,
      networkUsed: false,
      error: 'UNKNOWN_OPERATION',
    };
  }

  try {
    return OPERATIONS[operation](input);
  } catch (error) {
    const code = error instanceof SkillInputError ? error.code : 'MEDIA_FAILED';
    return {
      operation,
      ok: false,
      status: 'REJECTED',
      summary: error instanceof Error ? error.message : code,
      output: {},
      warnings: [],
      evidenceDigest: digest({ operation, error: code }),
      pixelsModified: false,
      networkUsed: false,
      error: code,
    };
  }
}

export function describeMediaOperations(): ReadonlyArray<{ id: MediaOperation; note: string }> {
  return [
    { id: 'cull', note: 'selección por métricas declaradas' },
    { id: 'style-learn', note: 'centroide de features declaradas' },
    { id: 'style-score', note: 'similitud coseno contra el perfil' },
    { id: 'retouch-plan', note: 'plan acotado, sin píxeles' },
    { id: 'gallery', note: 'manifiesto de proofing, sin publicación' },
    { id: 'print-quote', note: 'cotización con Profit Guard' },
    { id: 'face-index', note: 'agrupación de embeddings, sin detección' },
  ];
}
