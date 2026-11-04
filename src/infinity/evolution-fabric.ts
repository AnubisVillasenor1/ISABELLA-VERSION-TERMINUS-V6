/**
 * ISABELLA VILLASEÑOR AI™ — Evolution Fabric.
 * state: draft | engine-generated.
 *
 * Fuente: `ISABELLA_VILLASENOR_AI_MASTER_CONSOLIDATED.docx`, secciones 4 y 8
 * (Gen + Cápsula + A2A + GDI + selección natural).
 *
 * Todo ocurre **en memoria** y de forma determinista. No se publica en un hub,
 * no se emiten créditos, no se ejecuta un agente y no se adopta una cápsula.
 * Un `ALLOW` aquí es una evaluación, no una autorización.
 */
import { createHash } from 'node:crypto';
import { SkillInputError } from './skills';

export type GeneOrigin = 'declared' | 'inherited' | 'mutation';

export interface GeneInput {
  readonly id: string;
  /** Normalized trait in [0, 1]. */
  readonly value: number;
  readonly origin?: GeneOrigin;
}

export interface Gene {
  readonly id: string;
  /** Normalized trait in [0, 1]. */
  readonly value: number;
  readonly origin: GeneOrigin;
}

export interface CapsuleSignals {
  readonly quality: number;
  readonly evidence: number;
  readonly safety: number;
  readonly costEfficiency: number;
}

export interface CapsuleInput {
  readonly label: string;
  readonly genes: readonly GeneInput[];
  readonly signals?: Partial<CapsuleSignals>;
  readonly parents?: readonly string[];
  readonly generation?: number;
  readonly createdAt?: string;
}

export interface CapsuleFitness extends CapsuleSignals {
  readonly score: number;
}

export interface Capsule {
  readonly id: string;
  readonly label: string;
  readonly generation: number;
  readonly parents: readonly string[];
  readonly genes: readonly Gene[];
  readonly fitness: CapsuleFitness;
  readonly createdAt: string | null;
  readonly digest: string;
}

export const MAX_GENES = 64;
export const MAX_POPULATION = 32;
export const MAX_GENERATIONS = 5;
export const MAX_LEDGER_EVENTS = 500;

const FITNESS_WEIGHTS: Readonly<Record<keyof CapsuleSignals, number>> = {
  quality: 0.35,
  evidence: 0.3,
  safety: 0.25,
  costEfficiency: 0.1,
};

function sha3(value: unknown): string {
  return createHash('sha3-512').update(stableStringify(value)).digest('hex');
}

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

function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(1, Math.max(0, value));
}

function round4(value: number): number {
  return Math.round((value + Number.EPSILON) * 10_000) / 10_000;
}

function isGeneOrigin(value: unknown): value is GeneOrigin {
  return value === 'declared' || value === 'inherited' || value === 'mutation';
}

function parseGenes(value: unknown, field: string): readonly Gene[] {
  if (!Array.isArray(value)) {
    throw new SkillInputError('INVALID_FIELD', `${field} debe ser arreglo`);
  }
  if (value.length === 0) throw new SkillInputError('EMPTY_GENES', `${field} no puede estar vacío`);
  if (value.length > MAX_GENES)
    throw new SkillInputError('LIMIT_EXCEEDED', `${field} excede ${MAX_GENES}`);

  const seen = new Set<string>();
  return value.map((raw, index) => {
    if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
      throw new SkillInputError('INVALID_FIELD', `${field}[${index}] debe ser objeto`);
    }
    const item = raw as Record<string, unknown>;
    if (typeof item.id !== 'string' || !item.id.trim()) {
      throw new SkillInputError('INVALID_FIELD', `${field}[${index}].id requerido`);
    }
    const id = item.id.trim().slice(0, 120);
    if (seen.has(id)) throw new SkillInputError('DUPLICATE_GENE', `${field}: gen repetido ${id}`);
    seen.add(id);
    if (typeof item.value !== 'number' || !Number.isFinite(item.value)) {
      throw new SkillInputError('INVALID_FIELD', `${field}[${index}].value debe ser número`);
    }
    if (item.value < 0 || item.value > 1) {
      throw new SkillInputError('LIMIT_EXCEEDED', `${field}[${index}].value debe estar en [0, 1]`);
    }
    return {
      id,
      value: round4(item.value),
      origin: isGeneOrigin(item.origin) ? item.origin : 'declared',
    };
  });
}

function parseSignals(value: unknown, field: string): CapsuleSignals {
  if (value === undefined || value === null) {
    return { quality: 0, evidence: 0, safety: 0, costEfficiency: 0 };
  }
  if (typeof value !== 'object' || Array.isArray(value)) {
    throw new SkillInputError('INVALID_FIELD', `${field} debe ser objeto`);
  }
  const record = value as Record<string, unknown>;
  const read = (key: keyof CapsuleSignals): number => {
    const raw = record[key];
    if (raw === undefined || raw === null) return 0;
    if (typeof raw !== 'number' || !Number.isFinite(raw) || raw < 0 || raw > 1) {
      throw new SkillInputError('LIMIT_EXCEEDED', `${field}.${key} debe estar en [0, 1]`);
    }
    return round4(raw);
  };
  return {
    quality: read('quality'),
    evidence: read('evidence'),
    safety: read('safety'),
    costEfficiency: read('costEfficiency'),
  };
}

export function calculateFitness(signals: CapsuleSignals): CapsuleFitness {
  let score = 0;
  for (const key of Object.keys(FITNESS_WEIGHTS) as Array<keyof CapsuleSignals>) {
    score += clamp01(signals[key]) * FITNESS_WEIGHTS[key];
  }
  return {
    quality: round4(signals.quality),
    evidence: round4(signals.evidence),
    safety: round4(signals.safety),
    costEfficiency: round4(signals.costEfficiency),
    score: round4(score),
  };
}

export function createCapsule(input: CapsuleInput, fallbackGeneration = 0): Capsule {
  if (typeof input.label !== 'string' || !input.label.trim()) {
    throw new SkillInputError('INVALID_FIELD', 'label es requerido');
  }
  const genes = parseGenes(input.genes, 'genes');
  const generation =
    input.generation === undefined
      ? fallbackGeneration
      : Number.isInteger(input.generation) && input.generation >= 0 && input.generation <= 1_000
        ? input.generation
        : (() => {
            throw new SkillInputError(
              'LIMIT_EXCEEDED',
              'generation debe ser entero entre 0 y 1000'
            );
          })();
  const parents = Array.isArray(input.parents)
    ? input.parents
        .filter((parent): parent is string => typeof parent === 'string' && Boolean(parent.trim()))
        .map((parent) => parent.trim().slice(0, 128))
        .slice(0, 2)
    : [];
  const fitness = calculateFitness(parseSignals(input.signals, 'signals'));
  const createdAt =
    typeof input.createdAt === 'string' && Number.isFinite(Date.parse(input.createdAt))
      ? new Date(input.createdAt).toISOString()
      : null;
  const digest = sha3({ label: input.label.trim(), genes, signals: fitness, parents, generation });

  return {
    id: `capsule-${digest.slice(0, 16)}`,
    label: input.label.trim().slice(0, 120),
    generation,
    parents,
    genes,
    fitness,
    createdAt,
    digest,
  };
}

function geneVector(capsule: Capsule, geneIds: readonly string[]): readonly number[] {
  const index = new Map(capsule.genes.map((gene) => [gene.id, gene.value]));
  return geneIds.map((id) => index.get(id) ?? 0);
}

function cosine(left: readonly number[], right: readonly number[]): number {
  let dot = 0;
  let normLeft = 0;
  let normRight = 0;
  for (let index = 0; index < left.length; index += 1) {
    const a = left[index] ?? 0;
    const b = right[index] ?? 0;
    dot += a * b;
    normLeft += a * a;
    normRight += b * b;
  }
  if (normLeft === 0 || normRight === 0) return 0;
  return dot / (Math.sqrt(normLeft) * Math.sqrt(normRight));
}

/**
 * Genetic Diversity Index: `1 - mean pairwise cosine similarity` over the union
 * of gene ids. `0` means all capsules are identical; `1` is unreachable with
 * non-negative traits, which is why the report never claims `1`.
 */
export function geneticDiversityIndex(capsules: readonly Capsule[]): number {
  if (capsules.length < 2) return 0;
  const geneIds = [
    ...new Set(capsules.flatMap((capsule) => capsule.genes.map((gene) => gene.id))),
  ].sort();
  const vectors = capsules.map((capsule) => geneVector(capsule, geneIds));
  let total = 0;
  let pairs = 0;
  for (let i = 0; i < vectors.length; i += 1) {
    for (let j = i + 1; j < vectors.length; j += 1) {
      total += cosine(vectors[i] ?? [], vectors[j] ?? []);
      pairs += 1;
    }
  }
  return pairs === 0 ? 0 : round4(1 - total / pairs);
}

function mulberry32(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4_294_967_296;
  };
}

function seedFrom(value: string): number {
  return Number.parseInt(createHash('sha256').update(value).digest('hex').slice(0, 8), 16);
}

export interface EvolutionRequest {
  readonly population: readonly CapsuleInput[];
  readonly generations?: number;
  readonly populationSize?: number;
  readonly mutationRate?: number;
  readonly selectionPressure?: number;
  readonly seed?: string;
  readonly now?: string;
}

export interface GenerationReport {
  readonly generation: number;
  readonly gdi: number;
  readonly bestFitness: number;
  readonly meanFitness: number;
  readonly survivorIds: readonly string[];
  readonly offspringIds: readonly string[];
}

export interface EvolutionReport {
  readonly status: 'SIMULATED';
  readonly seed: string;
  readonly generations: readonly GenerationReport[];
  readonly survivors: readonly Capsule[];
  readonly gdiBefore: number;
  readonly gdiAfter: number;
  readonly mutationsApplied: number;
  readonly digest: string;
  readonly executionPerformed: false;
  readonly published: false;
  readonly creditsIssued: false;
  readonly adoptionPerformed: false;
  readonly production: false;
  readonly note: string;
}

function breed(
  left: Capsule,
  right: Capsule,
  generation: number,
  mutationRate: number,
  random: () => number,
  now: string | null
): { capsule: Capsule; mutations: number } {
  const leftGenes = new Map(left.genes.map((gene) => [gene.id, gene.value]));
  const rightGenes = new Map(right.genes.map((gene) => [gene.id, gene.value]));
  const ids = [...new Set([...leftGenes.keys(), ...rightGenes.keys()])].sort();

  let mutations = 0;
  const genes: Gene[] = ids.map((id) => {
    const fromLeft = leftGenes.get(id);
    const fromRight = rightGenes.get(id);
    let value: number;
    if (fromLeft !== undefined && fromRight !== undefined && fromLeft !== fromRight) {
      value = random() < 0.5 ? fromLeft : fromRight;
    } else {
      value = fromLeft ?? fromRight ?? 0;
    }
    let origin: GeneOrigin = 'inherited';
    if (random() < mutationRate) {
      const delta = (random() - 0.5) * 0.2;
      value = clamp01(value + delta);
      origin = 'mutation';
      mutations += 1;
    }
    return { id, value: round4(value), origin };
  });

  const signals: CapsuleSignals = {
    quality: (left.fitness.quality + right.fitness.quality) / 2,
    evidence: (left.fitness.evidence + right.fitness.evidence) / 2,
    safety: (left.fitness.safety + right.fitness.safety) / 2,
    costEfficiency: (left.fitness.costEfficiency + right.fitness.costEfficiency) / 2,
  };

  const capsule = createCapsule(
    {
      label: `${left.label}×${right.label}`.slice(0, 120),
      genes,
      signals,
      parents: [left.id, right.id],
      generation,
      ...(now ? { createdAt: now } : {}),
    },
    generation
  );
  return { capsule, mutations };
}

export function evolvePopulation(request: EvolutionRequest): EvolutionReport {
  if (!Array.isArray(request.population) || request.population.length < 2) {
    throw new SkillInputError('EMPTY_POPULATION', 'population requiere al menos 2 cápsulas');
  }
  if (request.population.length > MAX_POPULATION) {
    throw new SkillInputError('LIMIT_EXCEEDED', `population excede ${MAX_POPULATION}`);
  }

  const generations =
    request.generations === undefined
      ? 1
      : Number.isInteger(request.generations) &&
          request.generations >= 1 &&
          request.generations <= MAX_GENERATIONS
        ? request.generations
        : (() => {
            throw new SkillInputError(
              'LIMIT_EXCEEDED',
              `generations debe estar entre 1 y ${MAX_GENERATIONS}`
            );
          })();

  const size =
    request.populationSize === undefined
      ? request.population.length
      : Number.isInteger(request.populationSize) &&
          request.populationSize >= 2 &&
          request.populationSize <= MAX_POPULATION
        ? Math.max(request.populationSize, request.population.length)
        : (() => {
            throw new SkillInputError(
              'LIMIT_EXCEEDED',
              `populationSize debe estar entre 2 y ${MAX_POPULATION}`
            );
          })();

  const mutationRate =
    request.mutationRate === undefined
      ? 0.1
      : typeof request.mutationRate === 'number' &&
          Number.isFinite(request.mutationRate) &&
          request.mutationRate >= 0 &&
          request.mutationRate <= 0.5
        ? request.mutationRate
        : (() => {
            throw new SkillInputError('LIMIT_EXCEEDED', 'mutationRate debe estar entre 0 y 0.5');
          })();

  const pressure =
    request.selectionPressure === undefined
      ? 0.5
      : typeof request.selectionPressure === 'number' &&
          Number.isFinite(request.selectionPressure) &&
          request.selectionPressure > 0 &&
          request.selectionPressure <= 1
        ? request.selectionPressure
        : (() => {
            throw new SkillInputError('LIMIT_EXCEEDED', 'selectionPressure debe estar en (0, 1]');
          })();

  const now =
    typeof request.now === 'string' && Number.isFinite(Date.parse(request.now))
      ? new Date(request.now).toISOString()
      : null;
  const seed = request.seed?.trim() || sha3(request.population).slice(0, 32);
  const random = mulberry32(seedFrom(seed));

  let population = request.population.map((draft) =>
    createCapsule({ ...draft, ...(now && !draft.createdAt ? { createdAt: now } : {}) }, 0)
  );
  const gdiBefore = geneticDiversityIndex(population);
  const reports: GenerationReport[] = [];
  let mutationsApplied = 0;

  for (let generation = 1; generation <= generations; generation += 1) {
    const ranked = [...population].sort(
      (a, b) => b.fitness.score - a.fitness.score || a.id.localeCompare(b.id)
    );
    const survivorCount = Math.max(2, Math.ceil(ranked.length * pressure));
    const survivors = ranked.slice(0, survivorCount);
    const offspring: Capsule[] = [];
    const offspringIds: string[] = [];

    while (survivors.length + offspring.length < size) {
      const left = survivors[Math.floor(random() * survivors.length)] ?? survivors[0];
      const right = survivors[Math.floor(random() * survivors.length)] ?? survivors[0];
      if (!left || !right) break;
      const { capsule, mutations } = breed(left, right, generation, mutationRate, random, now);
      const duplicate = [...survivors, ...offspring].some((item) => item.id === capsule.id);
      mutationsApplied += mutations;
      if (duplicate) continue;
      offspring.push(capsule);
      offspringIds.push(capsule.id);
      if (offspring.length > MAX_POPULATION * 2) break;
    }

    population = [...survivors, ...offspring];
    const scores = population.map((capsule) => capsule.fitness.score);
    reports.push({
      generation,
      gdi: geneticDiversityIndex(population),
      bestFitness: round4(Math.max(...scores)),
      meanFitness: round4(scores.reduce((total, score) => total + score, 0) / scores.length),
      survivorIds: survivors.map((capsule) => capsule.id),
      offspringIds,
    });
  }

  const finalRanked = [...population].sort(
    (a, b) => b.fitness.score - a.fitness.score || a.id.localeCompare(b.id)
  );

  return {
    status: 'SIMULATED',
    seed,
    generations: reports,
    survivors: finalRanked,
    gdiBefore,
    gdiAfter: geneticDiversityIndex(finalRanked),
    mutationsApplied,
    digest: sha3({ seed, reports, population: finalRanked.map((capsule) => capsule.digest) }),
    executionPerformed: false,
    published: false,
    creditsIssued: false,
    adoptionPerformed: false,
    production: false,
    note: 'Evolución simulada en memoria: no se publica, no se adoptan cápsulas, no se emiten créditos y no se ejecuta ningún agente.',
  };
}

// ── A2A verbs ───────────────────────────────────────────────────────────────

export const A2A_VERBS = ['describe', 'propose', 'evaluate', 'adopt'] as const;
export type A2AVerb = (typeof A2A_VERBS)[number];

export type A2AVerdict = 'ALLOW' | 'DENY' | 'ESCALATE';

export interface A2AEvaluation {
  readonly verb: A2AVerb;
  readonly verdict: A2AVerdict;
  readonly reason: string;
  readonly executionPerformed: false;
  readonly adoptionPerformed: false;
  readonly note: string;
}

export function evaluateA2A(verb: string, approvalGranted = false): A2AEvaluation {
  if (!(A2A_VERBS as readonly string[]).includes(verb)) {
    return {
      verb: verb as A2AVerb,
      verdict: 'DENY',
      reason: 'UNKNOWN_VERB',
      executionPerformed: false,
      adoptionPerformed: false,
      note: 'Verbo A2A no reconocido.',
    };
  }
  const typed = verb as A2AVerb;
  if (typed === 'adopt') {
    return approvalGranted
      ? {
          verb: typed,
          verdict: 'ALLOW',
          reason: 'HUMAN_APPROVAL_VERIFIED',
          executionPerformed: false,
          adoptionPerformed: false,
          note: 'La adopción la aplica un humano; esta función solo evalúa.',
        }
      : {
          verb: typed,
          verdict: 'ESCALATE',
          reason: 'HUMAN_APPROVAL_REQUIRED',
          executionPerformed: false,
          adoptionPerformed: false,
          note: 'Adoptar exige aprobación humana verificada en el servidor.',
        };
  }
  return {
    verb: typed,
    verdict: 'ALLOW',
    reason: 'READ_ONLY_VERB',
    executionPerformed: false,
    adoptionPerformed: false,
    note: 'Los verbos de descripción, propuesta y evaluación no cambian el estado.',
  };
}

// ── In-memory event chain ───────────────────────────────────────────────────

export interface EvolutionEvent {
  readonly seq: number;
  readonly type: string;
  readonly at: string | null;
  readonly payloadDigest: string;
  readonly prevHash: string;
  readonly hash: string;
}

const GENESIS_HASH = '0'.repeat(128);

/**
 * Cadena append-only en memoria. No sobrevive un reinicio y no sustituye el
 * pipeline durable de BookPI; sirve para hacer visible el orden de la simulación.
 */
export class EvolutionLedger {
  private readonly events: EvolutionEvent[] = [];

  append(type: string, payload: unknown, at: string | null = null): EvolutionEvent {
    const previous = this.events[this.events.length - 1];
    const seq = this.events.length + 1;
    const payloadDigest = sha3(payload);
    const hash = sha3({
      seq,
      type,
      at,
      payloadDigest,
      prevHash: previous?.hash ?? GENESIS_HASH,
    });
    const event: EvolutionEvent = {
      seq,
      type: type.slice(0, 80),
      at,
      payloadDigest,
      prevHash: previous?.hash ?? GENESIS_HASH,
      hash,
    };
    this.events.push(event);
    if (this.events.length > MAX_LEDGER_EVENTS) this.events.shift();
    return event;
  }

  list(): readonly EvolutionEvent[] {
    return [...this.events];
  }

  verify(): boolean {
    let previous = GENESIS_HASH;
    for (const event of this.events) {
      if (event.prevHash !== previous) return false;
      const expected = sha3({
        seq: event.seq,
        type: event.type,
        at: event.at,
        payloadDigest: event.payloadDigest,
        prevHash: event.prevHash,
      });
      if (expected !== event.hash) return false;
      previous = event.hash;
    }
    return true;
  }

  size(): number {
    return this.events.length;
  }
}

export interface EvolutionFabricResult {
  readonly report: EvolutionReport;
  readonly event: EvolutionEvent;
  readonly ledgerSize: number;
  readonly ledgerValid: boolean;
}

export class EvolutionFabric {
  private readonly ledger = new EvolutionLedger();

  evolve(request: EvolutionRequest): EvolutionFabricResult {
    const report = evolvePopulation(request);
    const event = this.ledger.append(
      'evolution.simulated',
      {
        seed: report.seed,
        digest: report.digest,
        gdiBefore: report.gdiBefore,
        gdiAfter: report.gdiAfter,
      },
      request.now ?? null
    );
    return {
      report,
      event,
      ledgerSize: this.ledger.size(),
      ledgerValid: this.ledger.verify(),
    };
  }

  events(): readonly EvolutionEvent[] {
    return this.ledger.list();
  }

  verify(): boolean {
    return this.ledger.verify();
  }
}

export function describeEvolutionFabric(): Readonly<Record<string, unknown>> {
  return {
    capsule: {
      maxGenes: MAX_GENES,
      maxPopulation: MAX_POPULATION,
      maxGenerations: MAX_GENERATIONS,
      fitnessWeights: FITNESS_WEIGHTS,
    },
    a2aVerbs: A2A_VERBS,
    gdi: 'índice de diversidad genética sobre genes declarados',
    storage: 'in-memory',
    executionPerformed: false,
    published: false,
    creditsIssued: false,
    note: 'Evolution Fabric simula; no publica, no adopta, no emite créditos y no ejecuta.',
  };
}
