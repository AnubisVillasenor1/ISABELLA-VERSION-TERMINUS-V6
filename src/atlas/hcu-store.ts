import { randomUUID } from 'node:crypto';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

export type AtlasHcuEffectSign = 1 | -1;

export interface AtlasHcuNode {
  readonly id: string;
  readonly name: string;
  readonly domain: string;
  readonly influence: number;
  readonly risk: number;
  readonly evidence: number;
}

export interface AtlasHcuEdge {
  readonly id: string;
  readonly sourceNodeId: string;
  readonly targetNodeId: string;
  readonly effectSign: AtlasHcuEffectSign;
  readonly strength: number;
  readonly lagYears: number;
  readonly evidenceSource: string;
}

export interface AtlasHcuGraph {
  readonly nodes: readonly AtlasHcuNode[];
  readonly edges: readonly AtlasHcuEdge[];
}

export type AtlasHcuNodeInput = Omit<AtlasHcuNode, 'id'>;
export type AtlasHcuEdgeInput = Omit<AtlasHcuEdge, 'id'>;

export interface AtlasHcuStore {
  list(ownerKeyHash: string): Promise<AtlasHcuGraph>;
  createNode(ownerKeyHash: string, input: AtlasHcuNodeInput): Promise<AtlasHcuNode>;
  updateNode(
    ownerKeyHash: string,
    id: string,
    input: AtlasHcuNodeInput
  ): Promise<AtlasHcuNode | null>;
  deleteNode(ownerKeyHash: string, id: string): Promise<boolean>;
  createEdge(ownerKeyHash: string, input: AtlasHcuEdgeInput): Promise<AtlasHcuEdge>;
  updateEdge(
    ownerKeyHash: string,
    id: string,
    input: AtlasHcuEdgeInput
  ): Promise<AtlasHcuEdge | null>;
  deleteEdge(ownerKeyHash: string, id: string): Promise<boolean>;
}

const NODE_FIELDS = 'id,name,domain,influence,risk,evidence';
const EDGE_FIELDS =
  'id,source_node_id,target_node_id,effect_sign,strength,lag_years,evidence_source';
const REQUEST_TIMEOUT_MS = 8_000;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function rowRecord(value: unknown): Record<string, unknown> {
  if (!isRecord(value)) throw new Error('ATLAS_HCU_ROW_INVALID');
  return value;
}

function rowText(value: unknown): string {
  if (typeof value !== 'string') throw new Error('ATLAS_HCU_ROW_INVALID');
  return value;
}

function rowNumber(value: unknown): number {
  const number =
    typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : NaN;
  if (!Number.isFinite(number)) throw new Error('ATLAS_HCU_ROW_INVALID');
  return number;
}

function toNode(value: unknown): AtlasHcuNode {
  const row = rowRecord(value);
  return {
    id: rowText(row.id),
    name: rowText(row.name),
    domain: rowText(row.domain),
    influence: rowNumber(row.influence),
    risk: rowNumber(row.risk),
    evidence: rowNumber(row.evidence),
  };
}

function toEdge(value: unknown): AtlasHcuEdge {
  const row = rowRecord(value);
  const effectSign = rowNumber(row.effect_sign);
  if (effectSign !== 1 && effectSign !== -1) throw new Error('ATLAS_HCU_ROW_INVALID');
  return {
    id: rowText(row.id),
    sourceNodeId: rowText(row.source_node_id),
    targetNodeId: rowText(row.target_node_id),
    effectSign,
    strength: rowNumber(row.strength),
    lagYears: rowNumber(row.lag_years),
    evidenceSource: rowText(row.evidence_source),
  };
}

function assertOwnerKeyHash(ownerKeyHash: string): void {
  if (!/^[a-f0-9]{64}$/i.test(ownerKeyHash)) throw new Error('ATLAS_HCU_OWNER_KEY_INVALID');
}

function timedFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const timeoutSignal = AbortSignal.timeout(REQUEST_TIMEOUT_MS);
  const signal = init?.signal ? AbortSignal.any([init.signal, timeoutSignal]) : timeoutSignal;
  return fetch(input, { ...init, signal });
}

export class SupabaseAtlasHcuStore implements AtlasHcuStore {
  constructor(private readonly client: SupabaseClient) {}

  async list(ownerKeyHash: string): Promise<AtlasHcuGraph> {
    assertOwnerKeyHash(ownerKeyHash);
    const [nodeResult, edgeResult] = await Promise.all([
      this.client
        .from('atlas_hcu_nodes')
        .select(NODE_FIELDS)
        .eq('owner_key_hash', ownerKeyHash)
        .order('influence', { ascending: false })
        .limit(5_000),
      this.client
        .from('atlas_hcu_edges')
        .select(EDGE_FIELDS)
        .eq('owner_key_hash', ownerKeyHash)
        .order('created_at', { ascending: true })
        .limit(5_000),
    ]);
    if (nodeResult.error || edgeResult.error) throw new Error('ATLAS_HCU_LOAD_FAILED');
    return {
      nodes: ((nodeResult.data ?? []) as unknown[]).map(toNode),
      edges: ((edgeResult.data ?? []) as unknown[]).map(toEdge),
    };
  }

  async createNode(ownerKeyHash: string, input: AtlasHcuNodeInput): Promise<AtlasHcuNode> {
    assertOwnerKeyHash(ownerKeyHash);
    const { data, error } = await this.client
      .from('atlas_hcu_nodes')
      .insert({ owner_key_hash: ownerKeyHash, id: randomUUID(), ...input })
      .select(NODE_FIELDS)
      .single();
    if (error || !data) throw new Error('ATLAS_HCU_NODE_CREATE_FAILED');
    return toNode(data);
  }

  async updateNode(
    ownerKeyHash: string,
    id: string,
    input: AtlasHcuNodeInput
  ): Promise<AtlasHcuNode | null> {
    assertOwnerKeyHash(ownerKeyHash);
    const { data, error } = await this.client
      .from('atlas_hcu_nodes')
      .update(input)
      .eq('owner_key_hash', ownerKeyHash)
      .eq('id', id)
      .select(NODE_FIELDS)
      .maybeSingle();
    if (error) throw new Error('ATLAS_HCU_NODE_UPDATE_FAILED');
    return data ? toNode(data) : null;
  }

  async deleteNode(ownerKeyHash: string, id: string): Promise<boolean> {
    assertOwnerKeyHash(ownerKeyHash);
    const { data, error } = await this.client
      .from('atlas_hcu_nodes')
      .delete()
      .eq('owner_key_hash', ownerKeyHash)
      .eq('id', id)
      .select('id')
      .maybeSingle();
    if (error) throw new Error('ATLAS_HCU_NODE_DELETE_FAILED');
    return Boolean(data);
  }

  async createEdge(ownerKeyHash: string, input: AtlasHcuEdgeInput): Promise<AtlasHcuEdge> {
    assertOwnerKeyHash(ownerKeyHash);
    const { data, error } = await this.client
      .from('atlas_hcu_edges')
      .insert({
        owner_key_hash: ownerKeyHash,
        id: randomUUID(),
        source_node_id: input.sourceNodeId,
        target_node_id: input.targetNodeId,
        effect_sign: input.effectSign,
        strength: input.strength,
        lag_years: input.lagYears,
        evidence_source: input.evidenceSource,
      })
      .select(EDGE_FIELDS)
      .single();
    if (error || !data) throw new Error('ATLAS_HCU_EDGE_CREATE_FAILED');
    return toEdge(data);
  }

  async updateEdge(
    ownerKeyHash: string,
    id: string,
    input: AtlasHcuEdgeInput
  ): Promise<AtlasHcuEdge | null> {
    assertOwnerKeyHash(ownerKeyHash);
    const { data, error } = await this.client
      .from('atlas_hcu_edges')
      .update({
        source_node_id: input.sourceNodeId,
        target_node_id: input.targetNodeId,
        effect_sign: input.effectSign,
        strength: input.strength,
        lag_years: input.lagYears,
        evidence_source: input.evidenceSource,
      })
      .eq('owner_key_hash', ownerKeyHash)
      .eq('id', id)
      .select(EDGE_FIELDS)
      .maybeSingle();
    if (error) throw new Error('ATLAS_HCU_EDGE_UPDATE_FAILED');
    return data ? toEdge(data) : null;
  }

  async deleteEdge(ownerKeyHash: string, id: string): Promise<boolean> {
    assertOwnerKeyHash(ownerKeyHash);
    const { data, error } = await this.client
      .from('atlas_hcu_edges')
      .delete()
      .eq('owner_key_hash', ownerKeyHash)
      .eq('id', id)
      .select('id')
      .maybeSingle();
    if (error) throw new Error('ATLAS_HCU_EDGE_DELETE_FAILED');
    return Boolean(data);
  }
}

export function createSupabaseAtlasHcuStoreFromEnv(
  env: Readonly<Record<string, string | undefined>> = process.env
): SupabaseAtlasHcuStore | null {
  const url = env.SUPABASE_URL?.trim();
  const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !serviceRoleKey) return null;

  const client = createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, detectSessionInUrl: false, persistSession: false },
    global: { fetch: timedFetch },
  });
  return new SupabaseAtlasHcuStore(client);
}
