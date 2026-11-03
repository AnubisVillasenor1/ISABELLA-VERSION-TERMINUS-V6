/**
 * Nexus Knowledge Graph — memoria factual con procedencia, corrección y retiro.
 * state: draft | engine-generated.
 *
 * Patrón extraído de GBrain (hechos explícitos con fuente, correcciones que no
 * borran historia y retiro reversible), reimplementado sin copiar su código.
 *
 * Invariantes:
 * - Ningún hecho existe sin fuente declarada.
 * - Un hecho nunca se borra: se marca `superseded` o `withdrawn`.
 * - Un conflicto no se resuelve solo: se reporta y exige corrección explícita.
 * - El ranking es léxico + embedding local determinista. No hay LLM aquí.
 */
import { createHash, randomUUID } from 'node:crypto';
import { cosineSimilarity, embed } from '../inference/embeddings';

export type FactStatus = 'active' | 'superseded' | 'withdrawn';

export interface KnowledgeFact {
  readonly id: string;
  readonly subject: string;
  readonly predicate: string;
  readonly object: string;
  readonly source: string;
  readonly confidence: number;
  readonly status: FactStatus;
  readonly createdAt: number;
  readonly updatedAt: number;
  readonly supersedes: string | null;
  readonly supersededBy: string | null;
  readonly withdrawalReason: string | null;
  readonly checksum: string;
}

export interface AssertFactInput {
  subject: string;
  predicate: string;
  object: string;
  source: string;
  confidence?: number;
}

export type AssertStatus = 'inserted' | 'duplicate' | 'conflict' | 'rejected';

export interface AssertFactResult {
  ok: boolean;
  status: AssertStatus;
  factId?: string;
  conflictWith?: readonly string[];
  reason?: string;
}

export interface QueryOptions {
  text?: string;
  subject?: string;
  predicate?: string;
  limit?: number;
  includeInactive?: boolean;
}

export interface QueryHit {
  fact: KnowledgeFact;
  score: number;
}

export interface KnowledgeGraphSnapshot {
  readonly generatedAt: number;
  readonly total: number;
  readonly byStatus: Readonly<Record<FactStatus, number>>;
  readonly facts: readonly KnowledgeFact[];
}

const MAX_FIELD_CHARS = 512;
const MAX_SOURCE_CHARS = 2_048;
const MAX_FACTS = 10_000;
const MAX_QUERY_HITS = 50;
const DEFAULT_QUERY_HITS = 5;

/** Normaliza para comparar: minúsculas, sin acentos, sin espacios redundantes. */
export function normalizeFactText(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ');
}

function boundedField(name: string, value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (trimmed.length === 0 || trimmed.length > MAX_FIELD_CHARS) return null;
  return trimmed;
}

function clampConfidence(value: unknown): number | null {
  if (value === undefined) return 0.7;
  if (typeof value !== 'number' || !Number.isFinite(value)) return null;
  if (value < 0 || value > 1) return null;
  return Number(value.toFixed(4));
}

function checksumOf(fact: {
  subject: string;
  predicate: string;
  object: string;
  source: string;
  createdAt: number;
}): string {
  return createHash('sha256')
    .update(
      JSON.stringify([
        normalizeFactText(fact.subject),
        normalizeFactText(fact.predicate),
        normalizeFactText(fact.object),
        fact.source.trim(),
        fact.createdAt,
      ])
    )
    .digest('hex');
}

export class NexusKnowledgeGraph {
  private readonly facts = new Map<string, KnowledgeFact>();

  constructor(private readonly maxFacts = MAX_FACTS) {
    if (!Number.isSafeInteger(maxFacts) || maxFacts < 1) {
      throw new RangeError('KNOWLEDGE_GRAPH_MAX_FACTS_INVALID');
    }
  }

  size(): number {
    return this.facts.size;
  }

  get(id: string): KnowledgeFact | null {
    return this.facts.get(id) ?? null;
  }

  /**
   * Declara un hecho. Si ya existe el mismo triple activo es `duplicate`; si el
   * mismo sujeto+predicado tiene otro objeto activo es `conflict` y NO se inserta:
   * resolverlo exige `correct()` o `withdraw()` con actor humano identificado.
   */
  assertFact(input: AssertFactInput, now = Date.now()): AssertFactResult {
    const subject = boundedField('subject', input.subject);
    const predicate = boundedField('predicate', input.predicate);
    const object = boundedField('object', input.object);
    const source =
      typeof input.source === 'string' && input.source.trim().length <= MAX_SOURCE_CHARS
        ? input.source.trim()
        : '';
    const confidence = clampConfidence(input.confidence);

    if (!subject || !predicate || !object) {
      return { ok: false, status: 'rejected', reason: 'FACT_FIELD_INVALID' };
    }
    if (!source) return { ok: false, status: 'rejected', reason: 'FACT_SOURCE_REQUIRED' };
    if (confidence === null) {
      return { ok: false, status: 'rejected', reason: 'FACT_CONFIDENCE_INVALID' };
    }
    if (this.facts.size >= this.maxFacts) {
      return { ok: false, status: 'rejected', reason: 'FACT_CAPACITY_EXCEEDED' };
    }

    const ns = normalizeFactText(subject);
    const np = normalizeFactText(predicate);
    const no = normalizeFactText(object);
    const active = [...this.facts.values()].filter((fact) => fact.status === 'active');

    const duplicate = active.find(
      (fact) =>
        normalizeFactText(fact.subject) === ns &&
        normalizeFactText(fact.predicate) === np &&
        normalizeFactText(fact.object) === no
    );
    if (duplicate) {
      return { ok: true, status: 'duplicate', factId: duplicate.id };
    }

    const conflictWith = active
      .filter(
        (fact) => normalizeFactText(fact.subject) === ns && normalizeFactText(fact.predicate) === np
      )
      .map((fact) => fact.id);
    if (conflictWith.length > 0) {
      return { ok: false, status: 'conflict', conflictWith };
    }

    const id = `fact_${randomUUID()}`;
    const createdAt = now;
    const fact: KnowledgeFact = {
      id,
      subject,
      predicate,
      object,
      source,
      confidence,
      status: 'active',
      createdAt,
      updatedAt: createdAt,
      supersedes: null,
      supersededBy: null,
      withdrawalReason: null,
      checksum: checksumOf({ subject, predicate, object, source, createdAt }),
    };
    this.facts.set(id, fact);
    return { ok: true, status: 'inserted', factId: id };
  }

  /**
   * Corrige un hecho activo creando una nueva versión que lo supersede. La
   * versión anterior permanece consultable en el historial.
   */
  correctFact(
    id: string,
    patch: { object?: string; confidence?: number; source?: string },
    actor: string,
    now = Date.now()
  ): KnowledgeFact | null {
    const previous = this.facts.get(id);
    if (!previous || previous.status !== 'active') return null;
    const nextObject =
      patch.object === undefined
        ? previous.object
        : boundedField('object', patch.object) === null
          ? null
          : patch.object.trim();
    if (nextObject === null) return null;
    const nextConfidence =
      patch.confidence === undefined ? previous.confidence : clampConfidence(patch.confidence);
    if (nextConfidence === null) return null;
    const nextSource =
      patch.source === undefined
        ? previous.source
        : typeof patch.source === 'string' &&
            patch.source.trim().length > 0 &&
            patch.source.trim().length <= MAX_SOURCE_CHARS
          ? patch.source.trim()
          : null;
    if (nextSource === null) return null;
    if (
      nextObject === previous.object &&
      nextConfidence === previous.confidence &&
      nextSource === previous.source
    ) {
      return previous;
    }
    if (this.facts.size >= this.maxFacts) return null;

    const nextId = `fact_${randomUUID()}`;
    const createdAt = now;
    const next: KnowledgeFact = {
      id: nextId,
      subject: previous.subject,
      predicate: previous.predicate,
      object: nextObject,
      source: nextSource,
      confidence: nextConfidence,
      status: 'active',
      createdAt,
      updatedAt: createdAt,
      supersedes: previous.id,
      supersededBy: null,
      withdrawalReason: null,
      checksum: checksumOf({
        subject: previous.subject,
        predicate: previous.predicate,
        object: nextObject,
        source: nextSource,
        createdAt,
      }),
    };
    this.facts.set(nextId, next);
    this.facts.set(previous.id, {
      ...previous,
      status: 'superseded',
      supersededBy: nextId,
      updatedAt: createdAt,
    });
    void actor;
    return next;
  }

  /** Retira un hecho sin borrarlo. La razón se conserva para auditoría. */
  withdrawFact(id: string, reason: string, now = Date.now()): KnowledgeFact | null {
    const fact = this.facts.get(id);
    if (!fact || fact.status === 'withdrawn') return null;
    const trimmed = typeof reason === 'string' ? reason.trim().slice(0, MAX_FIELD_CHARS) : '';
    if (trimmed.length === 0) return null;
    const next: KnowledgeFact = {
      ...fact,
      status: 'withdrawn',
      withdrawalReason: trimmed,
      updatedAt: now,
    };
    this.facts.set(id, next);
    return next;
  }

  history(subject: string, predicate?: string): KnowledgeFact[] {
    const ns = normalizeFactText(subject);
    const np = predicate ? normalizeFactText(predicate) : null;
    return [...this.facts.values()]
      .filter(
        (fact) =>
          normalizeFactText(fact.subject) === ns &&
          (np === null || normalizeFactText(fact.predicate) === np)
      )
      .sort((a, b) => a.createdAt - b.createdAt);
  }

  /** Ranking léxico + embedding local. Sin texto, devuelve los más recientes. */
  query(options: QueryOptions = {}): QueryHit[] {
    const limit = Math.min(
      MAX_QUERY_HITS,
      Math.max(
        1,
        Number.isFinite(options.limit) ? Math.floor(options.limit as number) : DEFAULT_QUERY_HITS
      )
    );
    const text = typeof options.text === 'string' ? options.text.trim() : '';
    const queryVector = text ? embed(text) : null;
    const ns = options.subject ? normalizeFactText(options.subject) : null;
    const np = options.predicate ? normalizeFactText(options.predicate) : null;

    const candidates = [...this.facts.values()].filter((fact) => {
      if (!options.includeInactive && fact.status !== 'active') return false;
      if (ns !== null && normalizeFactText(fact.subject) !== ns) return false;
      if (np !== null && normalizeFactText(fact.predicate) !== np) return false;
      return true;
    });

    const scored = candidates.map((fact) => {
      if (!queryVector) return { fact, score: 1 };
      const haystack = embed(`${fact.subject} ${fact.predicate} ${fact.object}`);
      const semantic = cosineSimilarity(queryVector, haystack);
      const lexical = lexicalOverlap(text, `${fact.subject} ${fact.predicate} ${fact.object}`);
      return { fact, score: Number((semantic * 0.7 + lexical * 0.3).toFixed(6)) };
    });

    scored.sort((a, b) =>
      b.score === a.score ? b.fact.updatedAt - a.fact.updatedAt : b.score - a.score
    );
    return scored.slice(0, limit);
  }

  snapshot(now = Date.now()): KnowledgeGraphSnapshot {
    const byStatus: Record<FactStatus, number> = { active: 0, superseded: 0, withdrawn: 0 };
    for (const fact of this.facts.values()) byStatus[fact.status] += 1;
    return {
      generatedAt: now,
      total: this.facts.size,
      byStatus,
      facts: [...this.facts.values()].sort((a, b) => b.updatedAt - a.updatedAt),
    };
  }
}

function lexicalOverlap(query: string, document: string): number {
  const tokens = (value: string): Set<string> =>
    new Set(
      normalizeFactText(value)
        .split(/[^a-z0-9]+/)
        .filter((token) => token.length >= 3)
    );
  const q = tokens(query);
  if (q.size === 0) return 0;
  const d = tokens(document);
  if (d.size === 0) return 0;
  let shared = 0;
  for (const token of q) if (d.has(token)) shared += 1;
  return shared / q.size;
}

export function createKnowledgeGraph(maxFacts?: number): NexusKnowledgeGraph {
  return new NexusKnowledgeGraph(maxFacts);
}
