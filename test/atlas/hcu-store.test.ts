import { describe, expect, it } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { SupabaseAtlasHcuStore } from '../../src/atlas/hcu-store';

interface QueryBuilder {
  select(fields: string): QueryBuilder;
  eq(column: string, value: string): QueryBuilder;
  order(column: string, options: { ascending: boolean }): QueryBuilder;
  limit(count: number): Promise<{ data: unknown[]; error: null }>;
}

function createQuery(data: unknown[], ownerFilters: string[], table: string): QueryBuilder {
  let query: QueryBuilder;
  query = {
    select: () => query,
    eq: (column, value) => {
      ownerFilters.push(`${table}.${column}:${value}`);
      return query;
    },
    order: () => query,
    limit: async () => ({ data, error: null }),
  };
  return query;
}

describe('Supabase Atlas HCU store', () => {
  it('scopes both graph queries to the server-derived owner hash', async () => {
    const ownerKeyHash = 'a'.repeat(64);
    const ownerFilters: string[] = [];
    const nodeQuery = createQuery(
      [
        {
          id: 'node-1',
          name: 'Territorio',
          domain: 'Hidalgo',
          influence: '0.80',
          risk: '0.35',
          evidence: '0.20',
        },
      ],
      ownerFilters,
      'atlas_hcu_nodes'
    );
    const edgeQuery = createQuery(
      [
        {
          id: 'edge-1',
          source_node_id: 'node-1',
          target_node_id: 'node-2',
          effect_sign: -1,
          strength: '0.60',
          lag_years: 2,
          evidence_source: 'https://example.org/evidence',
        },
      ],
      ownerFilters,
      'atlas_hcu_edges'
    );
    const client = {
      from: (table: string) => (table === 'atlas_hcu_nodes' ? nodeQuery : edgeQuery),
    } as unknown as SupabaseClient;
    const store = new SupabaseAtlasHcuStore(client);

    const graph = await store.list(ownerKeyHash);

    expect(ownerFilters).toEqual([
      `atlas_hcu_nodes.owner_key_hash:${ownerKeyHash}`,
      `atlas_hcu_edges.owner_key_hash:${ownerKeyHash}`,
    ]);
    expect(graph.nodes[0]).toEqual({
      id: 'node-1',
      name: 'Territorio',
      domain: 'Hidalgo',
      influence: 0.8,
      risk: 0.35,
      evidence: 0.2,
    });
    expect(graph.edges[0]).toEqual({
      id: 'edge-1',
      sourceNodeId: 'node-1',
      targetNodeId: 'node-2',
      effectSign: -1,
      strength: 0.6,
      lagYears: 2,
      evidenceSource: 'https://example.org/evidence',
    });
  });

  it('rejects an invalid owner key before querying Supabase', async () => {
    const client = {
      from: () => {
        throw new Error('query should not run');
      },
    } as unknown as SupabaseClient;
    const store = new SupabaseAtlasHcuStore(client);

    await expect(store.list('not-a-hash')).rejects.toThrow('ATLAS_HCU_OWNER_KEY_INVALID');
  });
});
