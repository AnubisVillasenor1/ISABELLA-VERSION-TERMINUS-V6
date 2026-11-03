import { createHash } from 'node:crypto';
import { MongoClient, type Collection, type Document } from 'mongodb';
import type { EpistemicState } from './ikes';

export const CONFIDENCE_LEVELS = ['E0', 'E1', 'E2', 'E3', 'E4', 'E5', 'E6'] as const;

export type ConfidenceLevel = (typeof CONFIDENCE_LEVELS)[number];

export interface VerifiedKnowledgeEntry {
  readonly id: string;
  readonly content: string;
  readonly source: string;
  readonly verifiedAt: string;
  readonly confidenceLevel: ConfidenceLevel;
}

export interface NewVerifiedKnowledge {
  readonly content: string;
  readonly source: string;
  readonly confidenceLevel: ConfidenceLevel;
}

export interface VerifiedKnowledgeSearchOptions {
  readonly limit?: number;
  readonly minConfidence?: ConfidenceLevel;
}

export interface VerifiedKnowledgeSearchHit {
  readonly entry: VerifiedKnowledgeEntry;
  readonly score: number;
}

export interface VerifiedKnowledgeBackend {
  save(entry: VerifiedKnowledgeEntry): Promise<void>;
  loadAll(): Promise<readonly VerifiedKnowledgeEntry[]>;
}

export class InMemoryVerifiedKnowledgeBackend implements VerifiedKnowledgeBackend {
  private readonly entries = new Map<string, VerifiedKnowledgeEntry>();

  async save(entry: VerifiedKnowledgeEntry): Promise<void> {
    this.entries.set(entry.id, Object.freeze({ ...entry }));
  }

  async loadAll(): Promise<readonly VerifiedKnowledgeEntry[]> {
    return [...this.entries.values()];
  }
}

interface SupabaseBackendConfig {
  readonly url: string;
  readonly serviceRoleKey: string;
}

interface MongoBackendConfig {
  readonly uri: string;
  readonly databaseName?: string;
}

interface MongoVerifiedKnowledgeDocument extends Document {
  readonly _id: string;
  readonly content: string;
  readonly source: string;
  readonly verifiedAt: string | Date;
  readonly confidenceLevel: ConfidenceLevel;
}

function supabaseConfigFromEnv(
  env: Readonly<Record<string, string | undefined>>
): SupabaseBackendConfig | null {
  const url = env.SUPABASE_URL?.trim();
  const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !serviceRoleKey) return null;
  return { url: url.replace(/\/+$/, ''), serviceRoleKey };
}

export class SupabaseVerifiedKnowledgeBackend implements VerifiedKnowledgeBackend {
  constructor(private readonly config: SupabaseBackendConfig) {}

  private get headers(): Readonly<Record<string, string>> {
    return {
      apikey: this.config.serviceRoleKey,
      Authorization: `Bearer ${this.config.serviceRoleKey}`,
      'Content-Type': 'application/json',
      Prefer: 'resolution=ignore-duplicates,return=minimal',
    };
  }

  async save(entry: VerifiedKnowledgeEntry): Promise<void> {
    const response = await fetch(`${this.config.url}/rest/v1/verified_knowledge`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify({
        id: entry.id,
        content: entry.content,
        source: entry.source,
        verified_at: entry.verifiedAt,
        confidence_level: entry.confidenceLevel,
      }),
      signal: AbortSignal.timeout(8_000),
    });
    if (!response.ok) {
      throw new Error(`VERIFIED_KNOWLEDGE_BACKEND_SAVE_FAILED_${response.status}`);
    }
  }

  async loadAll(): Promise<readonly VerifiedKnowledgeEntry[]> {
    const response = await fetch(
      `${this.config.url}/rest/v1/verified_knowledge?select=*&order=verified_at.desc&limit=5000`,
      { headers: this.headers, signal: AbortSignal.timeout(8_000) }
    );
    if (!response.ok) {
      throw new Error(`VERIFIED_KNOWLEDGE_BACKEND_LOAD_FAILED_${response.status}`);
    }
    const rows: unknown = await response.json();
    if (!Array.isArray(rows)) throw new Error('VERIFIED_KNOWLEDGE_BACKEND_RESPONSE_INVALID');
    return rows.flatMap((value: unknown) => {
      if (typeof value !== 'object' || value === null || Array.isArray(value)) return [];
      const row = value as Record<string, unknown>;
      const id = typeof row.id === 'string' ? row.id : '';
      const content = typeof row.content === 'string' ? row.content : '';
      const source = typeof row.source === 'string' ? row.source : '';
      const verifiedAt = typeof row.verified_at === 'string' ? row.verified_at : '';
      const confidenceLevel = row.confidence_level;
      if (!id || !content || !source || !verifiedAt || !isValidConfidenceLevel(confidenceLevel))
        return [];
      return [{ id, content, source, verifiedAt, confidenceLevel }];
    });
  }
}

export class MongoVerifiedKnowledgeBackend implements VerifiedKnowledgeBackend {
  private clientPromise: Promise<MongoClient> | null = null;

  constructor(
    private readonly config: MongoBackendConfig,
    private readonly client: MongoClient = new MongoClient(config.uri, {
      serverSelectionTimeoutMS: 8_000,
      connectTimeoutMS: 8_000,
      maxPoolSize: 5,
    })
  ) {}

  private async collection(): Promise<Collection<MongoVerifiedKnowledgeDocument>> {
    if (!this.clientPromise) {
      this.clientPromise = this.client.connect().catch((error: unknown) => {
        this.clientPromise = null;
        throw error;
      });
    }
    const client = await this.clientPromise;
    return client
      .db(this.config.databaseName)
      .collection<MongoVerifiedKnowledgeDocument>('verified_knowledge');
  }

  async save(entry: VerifiedKnowledgeEntry): Promise<void> {
    const collection = await this.collection();
    await collection.updateOne(
      { _id: entry.id },
      {
        $setOnInsert: {
          _id: entry.id,
          content: entry.content,
          source: entry.source,
          verifiedAt: entry.verifiedAt,
          confidenceLevel: entry.confidenceLevel,
        },
      },
      { upsert: true }
    );
  }

  async loadAll(): Promise<readonly VerifiedKnowledgeEntry[]> {
    const collection = await this.collection();
    const documents = await collection
      .find({})
      .sort({ verifiedAt: -1, _id: 1 })
      .limit(5_000)
      .toArray();
    return documents.flatMap((document) => {
      const verifiedAt =
        document.verifiedAt instanceof Date
          ? document.verifiedAt.toISOString()
          : document.verifiedAt;
      if (
        !document._id ||
        !document.content.trim() ||
        !document.source.trim() ||
        !Number.isFinite(Date.parse(verifiedAt)) ||
        !isValidConfidenceLevel(document.confidenceLevel)
      ) {
        return [];
      }
      return [
        {
          id: document._id,
          content: document.content,
          source: document.source,
          verifiedAt,
          confidenceLevel: document.confidenceLevel,
        },
      ];
    });
  }

  async close(): Promise<void> {
    if (!this.clientPromise) return;
    await this.client.close();
    this.clientPromise = null;
  }
}

export type VerifiedKnowledgeProvider = 'mongodb' | 'supabase' | 'memory';

export function createVerifiedKnowledgeBackend(
  env: Readonly<Record<string, string | undefined>> = process.env
): VerifiedKnowledgeBackend {
  const provider =
    env.ISABELLA_VERIFIED_KNOWLEDGE_BACKEND?.trim().toLowerCase() ||
    (env.NODE_ENV === 'test' ? 'memory' : 'mongodb');

  switch (provider) {
    case 'mongodb': {
      const uri = env.MONGODB_URI?.trim();
      if (!uri) throw new Error('VERIFIED_KNOWLEDGE_MONGODB_URI_MISSING');
      return new MongoVerifiedKnowledgeBackend({
        uri,
        databaseName: env.MONGODB_DATABASE?.trim() || undefined,
      });
    }
    case 'supabase': {
      const config = supabaseConfigFromEnv(env);
      if (!config) throw new Error('VERIFIED_KNOWLEDGE_SUPABASE_CONFIG_MISSING');
      return new SupabaseVerifiedKnowledgeBackend(config);
    }
    case 'memory':
      return new InMemoryVerifiedKnowledgeBackend();
    default:
      throw new Error('VERIFIED_KNOWLEDGE_BACKEND_INVALID');
  }
}

export function toConfidenceLevel(state: EpistemicState): ConfidenceLevel | null {
  switch (state) {
    case 'E0_UNVERIFIED':
      return 'E0';
    case 'E1_SOURCE_FOUND':
      return 'E1';
    case 'E2_CORROBORATED':
      return 'E2';
    case 'E3_ACADEMICALLY_SUPPORTED':
      return 'E3';
    case 'E4_REPRODUCIBLE':
      return 'E4';
    case 'E5_VALIDATED':
      return 'E5';
    case 'E6_ESTABLISHED':
      return 'E6';
    default:
      return null;
  }
}

function isValidConfidenceLevel(value: unknown): value is ConfidenceLevel {
  return typeof value === 'string' && (CONFIDENCE_LEVELS as readonly string[]).includes(value);
}

export class VerifiedKnowledgeStore {
  private readonly backend: VerifiedKnowledgeBackend;
  private entries: Map<string, VerifiedKnowledgeEntry> | null = null;

  constructor(backend?: VerifiedKnowledgeBackend) {
    this.backend = backend ?? createVerifiedKnowledgeBackend();
  }

  private async all(): Promise<readonly VerifiedKnowledgeEntry[]> {
    if (this.entries === null) {
      const loaded = await this.backend.loadAll();
      this.entries = new Map(loaded.map((entry) => [entry.id, entry]));
    }
    return [...(this.entries?.values() ?? [])];
  }

  async addVerifiedKnowledge(input: NewVerifiedKnowledge): Promise<VerifiedKnowledgeEntry> {
    const content = input.content.trim();
    const source = input.source.trim();
    if (!content) throw new Error('VERIFIED_KNOWLEDGE: content required');
    if (!source) throw new Error('VERIFIED_KNOWLEDGE: source required');
    if (!isValidConfidenceLevel(input.confidenceLevel)) {
      throw new Error('VERIFIED_KNOWLEDGE: confidenceLevel must be E0-E6');
    }
    if (content.length > 100_000) throw new Error('VERIFIED_KNOWLEDGE: content too large');
    const entry: VerifiedKnowledgeEntry = Object.freeze({
      id: `vkn-${createHash('sha256')
        .update(JSON.stringify({ content, source, at: Date.now() }))
        .digest('hex')
        .slice(0, 12)}`,
      content,
      source,
      verifiedAt: new Date().toISOString(),
      confidenceLevel: input.confidenceLevel,
    });
    await this.backend.save(entry);
    if (this.entries !== null) {
      this.entries.set(entry.id, entry);
    }
    return entry;
  }

  async getVerifiedKnowledge(id: string): Promise<VerifiedKnowledgeEntry | null> {
    const found = (await this.all()).find((entry) => entry.id === id);
    return found ?? null;
  }

  async searchVerifiedKnowledge(
    query: string,
    options: VerifiedKnowledgeSearchOptions = {}
  ): Promise<VerifiedKnowledgeSearchHit[]> {
    const terms = tokenize(query);
    if (terms.length === 0) return [];
    const limit = options.limit ?? 10;
    if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
      throw new Error('VERIFIED_KNOWLEDGE: limit must be an integer between 1 and 100');
    }
    const minRank =
      options.minConfidence === undefined ? 0 : CONFIDENCE_LEVELS.indexOf(options.minConfidence);
    if (
      options.minConfidence !== undefined &&
      (minRank < 0 || minRank >= CONFIDENCE_LEVELS.length)
    ) {
      throw new Error('VERIFIED_KNOWLEDGE: minConfidence must be E0-E6');
    }
    const hits: VerifiedKnowledgeSearchHit[] = [];
    for (const entry of await this.all()) {
      const entryRank = CONFIDENCE_LEVELS.indexOf(entry.confidenceLevel);
      if (entryRank < minRank) continue;
      const haystack = tokenize(`${entry.content} ${entry.source}`);
      if (haystack.length === 0) continue;
      let matches = 0;
      for (const term of terms) {
        if (haystack.includes(term)) matches += 1;
      }
      if (matches === 0) continue;
      const coverage = matches / terms.length;
      const density = matches / haystack.length;
      hits.push({
        entry,
        score: Object.freeze({ value: Number((coverage * 0.75 + density * 0.25).toFixed(4)) })
          .value,
      });
    }
    return hits.sort((a, b) => b.score - a.score).slice(0, limit);
  }
}

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .split(/[^a-z0-9áéíóúñü]+/i)
    .filter((token) => token.length > 2);
}

export function formatVerifiedKnowledgeContext(
  hits: readonly VerifiedKnowledgeSearchHit[]
): string {
  if (hits.length === 0) return '';
  const lines = hits.map((hit) => {
    const excerpt =
      hit.entry.content.length > 400 ? `${hit.entry.content.slice(0, 400)}…` : hit.entry.content;
    return `[${hit.entry.confidenceLevel} · ${hit.entry.source} · ${hit.entry.verifiedAt}] ${excerpt}`;
  });
  return `Conocimiento verificado recuperado:\n${lines.join('\n')}`;
}
