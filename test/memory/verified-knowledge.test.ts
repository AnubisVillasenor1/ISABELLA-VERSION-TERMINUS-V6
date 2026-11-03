import { describe, expect, it, vi } from 'vitest';
import type { MongoClient } from 'mongodb';
import {
  InMemoryVerifiedKnowledgeBackend,
  MongoVerifiedKnowledgeBackend,
  SupabaseVerifiedKnowledgeBackend,
  VerifiedKnowledgeStore,
  type ConfidenceLevel,
  createVerifiedKnowledgeBackend,
  formatVerifiedKnowledgeContext,
} from '../../src/memory/verified-knowledge';

describe('verified knowledge store', () => {
  it('stores and retrieves an admitted entry by id', async () => {
    const store = new VerifiedKnowledgeStore(new InMemoryVerifiedKnowledgeBackend());
    const entry = await store.addVerifiedKnowledge({
      content: 'Real del Monte (Mineral del Monte) está a 2,660 msnm.',
      source: 'INEGI',
      confidenceLevel: 'E2',
    });
    expect(entry.id).toMatch(/^vkn-[a-f0-9]{12}$/);
    const found = await store.getVerifiedKnowledge(entry.id);
    expect(found?.source).toBe('INEGI');
    expect(found?.confidenceLevel).toBe('E2');
  });

  it('rejects invalid admission inputs', async () => {
    const store = new VerifiedKnowledgeStore(new InMemoryVerifiedKnowledgeBackend());
    await expect(
      store.addVerifiedKnowledge({ content: '   ', source: 's', confidenceLevel: 'E0' })
    ).rejects.toThrow('content required');
    await expect(
      store.addVerifiedKnowledge({ content: 'c', source: ' ', confidenceLevel: 'E0' })
    ).rejects.toThrow('source required');
    await expect(
      store.addVerifiedKnowledge({
        content: 'c',
        source: 's',
        confidenceLevel: 'E9' as ConfidenceLevel,
      })
    ).rejects.toThrow('confidenceLevel must be E0-E6');
  });

  it('ranks search hits by token coverage and filters by minConfidence', async () => {
    const store = new VerifiedKnowledgeStore(new InMemoryVerifiedKnowledgeBackend());
    await store.addVerifiedKnowledge({
      content: 'El Panteón Inglés de Real del Monte fue fundado en 1851.',
      source: 'archivo',
      confidenceLevel: 'E1',
    });
    await store.addVerifiedKnowledge({
      content: 'El paste es patrimonio gastronómico de Real del Monte.',
      source: 'museo',
      confidenceLevel: 'E4',
    });

    const hits = await store.searchVerifiedKnowledge('paste Real del Monte', { limit: 5 });
    expect(hits.length).toBeGreaterThan(0);
    expect(hits[0]?.entry.confidenceLevel).toBe('E4');

    const filtered = await store.searchVerifiedKnowledge('paste Real del Monte', {
      minConfidence: 'E3',
    });
    expect(filtered.length).toBe(1);
    expect(filtered[0]?.entry.source).toBe('museo');
  });

  it('returns no hits for unrelated queries and validates the limit', async () => {
    const store = new VerifiedKnowledgeStore(new InMemoryVerifiedKnowledgeBackend());
    await store.addVerifiedKnowledge({
      content: 'Memoria epistemológica IKES.',
      source: 'spec',
      confidenceLevel: 'E0',
    });
    expect(await store.searchVerifiedKnowledge('zzzznoexist')).toEqual([]);
    await expect(store.searchVerifiedKnowledge('memoria', { limit: 0 })).rejects.toThrow('limit');
  });

  it('formats context only when hits exist and truncates long excerpts', () => {
    expect(formatVerifiedKnowledgeContext([])).toBe('');
    const long = 'x'.repeat(600);
    const out = formatVerifiedKnowledgeContext([
      {
        entry: {
          id: 'vkn-1',
          content: long,
          source: 's',
          verifiedAt: '2026-01-01T00:00:00.000Z',
          confidenceLevel: 'E5',
        },
        score: 0.9,
      },
    ]);
    expect(out).toContain('[E5 · s · 2026-01-01T00:00:00.000Z]');
    expect(out.slice(-1)).toBe('…');
  });

  it('selects MongoDB by default, supports explicit providers, and fails closed', () => {
    expect(
      createVerifiedKnowledgeBackend({ MONGODB_URI: 'mongodb://localhost/isabella' })
    ).toBeInstanceOf(MongoVerifiedKnowledgeBackend);
    expect(
      createVerifiedKnowledgeBackend({
        ISABELLA_VERIFIED_KNOWLEDGE_BACKEND: 'supabase',
        SUPABASE_URL: 'https://example.supabase.co',
        SUPABASE_SERVICE_ROLE_KEY: 'server-only-test-key',
      })
    ).toBeInstanceOf(SupabaseVerifiedKnowledgeBackend);
    expect(
      createVerifiedKnowledgeBackend({ ISABELLA_VERIFIED_KNOWLEDGE_BACKEND: 'memory' })
    ).toBeInstanceOf(InMemoryVerifiedKnowledgeBackend);
    expect(() => createVerifiedKnowledgeBackend({})).toThrow(
      'VERIFIED_KNOWLEDGE_MONGODB_URI_MISSING'
    );
    expect(() =>
      createVerifiedKnowledgeBackend({ ISABELLA_VERIFIED_KNOWLEDGE_BACKEND: 'unknown' })
    ).toThrow('VERIFIED_KNOWLEDGE_BACKEND_INVALID');
  });

  it('writes append-only Mongo records and reuses its connection for reads', async () => {
    const storedDocuments = [
      {
        _id: 'vkn-test-record',
        content: 'Registro validado.',
        source: 'fuente de prueba',
        verifiedAt: '2026-10-31T00:00:00.000Z',
        confidenceLevel: 'E3' as const,
      },
    ];
    const cursor = {
      sort: vi.fn(() => cursor),
      limit: vi.fn(() => cursor),
      toArray: vi.fn(async () => storedDocuments),
    };
    const collection = {
      updateOne: vi.fn(async () => ({
        acknowledged: true,
        matchedCount: 0,
        modifiedCount: 0,
        upsertedCount: 1,
      })),
      find: vi.fn(() => cursor),
    };
    const database = { collection: vi.fn(() => collection) };
    let client: MongoClient;
    const clientMock = {
      connect: vi.fn(async () => client),
      db: vi.fn(() => database),
      close: vi.fn(async () => undefined),
    };
    client = clientMock as unknown as MongoClient;
    const backend = new MongoVerifiedKnowledgeBackend(
      { uri: 'mongodb://localhost/isabella', databaseName: 'isabella' },
      client
    );
    const entry = {
      id: 'vkn-test-record',
      content: 'Registro validado.',
      source: 'fuente de prueba',
      verifiedAt: '2026-10-31T00:00:00.000Z',
      confidenceLevel: 'E3' as const,
    };

    await backend.save(entry);
    const loaded = await backend.loadAll();

    expect(clientMock.connect).toHaveBeenCalledTimes(1);
    expect(collection.updateOne).toHaveBeenCalledWith(
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
    expect(loaded).toEqual([
      {
        id: entry.id,
        content: entry.content,
        source: entry.source,
        verifiedAt: entry.verifiedAt,
        confidenceLevel: entry.confidenceLevel,
      },
    ]);
    await backend.close();
    expect(clientMock.close).toHaveBeenCalledOnce();
  });
});
