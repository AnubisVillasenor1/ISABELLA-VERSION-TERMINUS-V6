/**
 * Isabella Domain Runtime (IDR) — policy-constrained semantic router.
 *
 * Deterministic by default; optional embeddings improve ranking but never bypass policy.
 * This module plans capabilities only. It does not mount domains, invoke tools, authorize
 * external side effects, or claim production readiness.
 */
export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';
export type Retention = 'none' | 'session' | 'user-controlled' | 'provider-defined';

export interface CapabilityNode {
  id: string;
  domainId: string;
  description: string;
  intents: string[];
  tags: string[];
  requires?: string[];
  inputTypes?: string[];
  outputTypes?: string[];
  risk: RiskLevel;
  estimatedCost: number;
  enabled: boolean;
  external: boolean;
  piiAllowed: boolean;
  retention: Retention;
  requiresHumanApproval: boolean;
}

export interface KnowledgeEdge {
  from: string;
  to: string;
  relation: 'requires' | 'produces' | 'related';
  weight?: number;
}

export interface RouterPolicy {
  allowedDomains?: string[];
  deniedCapabilities?: string[];
  maxRisk?: RiskLevel;
  allowExternal?: boolean;
  allowPii?: boolean;
  allowedRetention?: Retention[];
  requireHumanApprovalFor?: RiskLevel[];
  maxCost?: number;
  maxCapabilities?: number;
  minScore?: number;
}

export interface EmbeddingProvider {
  embed(text: string): Promise<number[]>;
}

export interface ResolveIntentInput {
  intent: string;
  capabilities: CapabilityNode[];
  edges?: KnowledgeEdge[];
  policy?: RouterPolicy;
  embeddingProvider?: EmbeddingProvider;
}

export interface PlannedCapability {
  capabilityId: string;
  domainId: string;
  score: number;
  estimatedCost: number;
  risk: RiskLevel;
  requiresHumanApproval: boolean;
  reasons: string[];
}

export interface IntentResolution {
  status: 'RESOLVED' | 'NO_SAFE_ROUTE' | 'INVALID_REQUEST';
  intent: string;
  plan: PlannedCapability[];
  totalEstimatedCost: number;
  requiresHumanApproval: boolean;
  policyVersion: 'idr-policy-v1';
  ranking: 'hybrid-lexical-embedding' | 'deterministic-lexical';
  rejected: Array<{ capabilityId: string; reason: string }>;
  executionPerformed: false;
  production: false;
}

const RISK_ORDER: Record<RiskLevel, number> = { low: 0, medium: 1, high: 2, critical: 3 };
const DEFAULT_POLICY: Required<RouterPolicy> = {
  allowedDomains: [],
  deniedCapabilities: [],
  maxRisk: 'high',
  allowExternal: false,
  allowPii: false,
  allowedRetention: ['none', 'session', 'user-controlled'],
  requireHumanApprovalFor: ['high', 'critical'],
  maxCost: 1,
  maxCapabilities: 5,
  minScore: 0.12,
};
const TOKEN_STOPWORDS = new Set([
  'a',
  'al',
  'de',
  'del',
  'el',
  'en',
  'la',
  'las',
  'los',
  'para',
  'por',
  'un',
  'una',
  'y',
  'the',
  'to',
  'and',
  'for',
  'in',
  'on',
  'with',
  'my',
  'me',
]);

function tokens(value: string): string[] {
  return value
    .toLocaleLowerCase('es-MX')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .split(/[^a-z0-9._-]+/)
    .filter((token) => token.length > 1 && !TOKEN_STOPWORDS.has(token));
}

function lexicalScore(intent: string, capability: CapabilityNode): number {
  const query = new Set(tokens(intent));
  const fields = [capability.id, capability.description, ...capability.intents, ...capability.tags];
  const terms = new Set(fields.flatMap(tokens));
  if (!query.size || !terms.size) return 0;
  let intersection = 0;
  for (const token of query) if (terms.has(token)) intersection++;
  const coverage = intersection / query.size;
  const jaccard = intersection / (query.size + terms.size - intersection);
  // Coverage favors capability descriptions that explicitly cover the user's intent.
  return Math.min(1, coverage * 0.75 + jaccard * 0.25);
}

function cosine(a: number[], b: number[]): number {
  if (!a.length || a.length !== b.length) return 0;
  let dot = 0,
    normA = 0,
    normB = 0;
  for (let i = 0; i < a.length; i++) {
    if (!Number.isFinite(a[i]) || !Number.isFinite(b[i])) return 0;
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  if (!normA || !normB) return 0;
  return Math.max(0, Math.min(1, (dot / (Math.sqrt(normA) * Math.sqrt(normB)) + 1) / 2));
}

function policyRejection(
  capability: CapabilityNode,
  policy: Required<RouterPolicy>
): string | null {
  if (!capability.enabled) return 'CAPABILITY_DISABLED';
  if (policy.deniedCapabilities.includes(capability.id)) return 'CAPABILITY_DENIED_BY_POLICY';
  if (policy.allowedDomains.length && !policy.allowedDomains.includes(capability.domainId))
    return 'DOMAIN_NOT_ALLOWLISTED';
  if (RISK_ORDER[capability.risk] > RISK_ORDER[policy.maxRisk]) return 'RISK_EXCEEDS_POLICY';
  if (capability.external && !policy.allowExternal) return 'EXTERNAL_EXECUTION_DISABLED';
  if (capability.piiAllowed && !policy.allowPii) return 'PII_NOT_ALLOWED';
  if (!policy.allowedRetention.includes(capability.retention)) return 'RETENTION_NOT_ALLOWED';
  if (!Number.isFinite(capability.estimatedCost) || capability.estimatedCost < 0)
    return 'INVALID_COST';
  return null;
}

function normalizePolicy(policy: RouterPolicy = {}): Required<RouterPolicy> {
  const merged = { ...DEFAULT_POLICY, ...policy };
  if (!Number.isFinite(merged.maxCost) || merged.maxCost < 0)
    throw new Error('INVALID_POLICY_MAX_COST');
  if (
    !Number.isInteger(merged.maxCapabilities) ||
    merged.maxCapabilities < 1 ||
    merged.maxCapabilities > 20
  )
    throw new Error('INVALID_POLICY_MAX_CAPABILITIES');
  if (!Number.isFinite(merged.minScore) || merged.minScore < 0 || merged.minScore > 1)
    throw new Error('INVALID_POLICY_MIN_SCORE');
  if (!Object.hasOwn(RISK_ORDER, merged.maxRisk)) throw new Error('INVALID_POLICY_MAX_RISK');
  return merged;
}

function dependencyOrder(
  selectedId: string,
  capabilities: Map<string, CapabilityNode>,
  rejectedIds: Set<string>,
  edges: KnowledgeEdge[]
): { ids: string[]; error?: string } {
  const result: string[] = [];
  const visiting = new Set<string>();
  const visited = new Set<string>();
  const requires = new Map<string, Set<string>>();
  for (const capability of capabilities.values()) {
    for (const dependency of capability.requires ?? []) {
      const set = requires.get(capability.id) ?? new Set<string>();
      set.add(dependency);
      requires.set(capability.id, set);
    }
  }
  for (const edge of edges)
    if (edge.relation === 'requires') {
      const set = requires.get(edge.from) ?? new Set<string>();
      set.add(edge.to);
      requires.set(edge.from, set);
    }
  const visit = (id: string): boolean => {
    if (visited.has(id)) return true;
    if (visiting.has(id)) return false;
    const node = capabilities.get(id);
    if (!node || rejectedIds.has(id)) return false;
    visiting.add(id);
    for (const dependency of requires.get(id) ?? []) if (!visit(dependency)) return false;
    visiting.delete(id);
    visited.add(id);
    result.push(id);
    return true;
  };
  if (!visit(selectedId)) return { ids: [], error: 'DEPENDENCY_MISSING_OR_CYCLE' };
  return { ids: result };
}

/**
 * Resolve a natural-language intent into the minimum safe dependency chain.
 * An embedding provider is optional; failures degrade to lexical ranking without changing policy.
 */
export async function resolveSemanticIntent(input: ResolveIntentInput): Promise<IntentResolution> {
  const intent = typeof input.intent === 'string' ? input.intent.trim() : '';
  const policy = normalizePolicy(input.policy);
  const rejected: IntentResolution['rejected'] = [];
  const base = {
    intent,
    totalEstimatedCost: 0,
    requiresHumanApproval: false,
    policyVersion: 'idr-policy-v1' as const,
    executionPerformed: false as const,
    production: false as const,
  };
  if (!intent || intent.length > 2_000 || !Array.isArray(input.capabilities)) {
    return {
      ...base,
      status: 'INVALID_REQUEST',
      plan: [],
      ranking: 'deterministic-lexical',
      rejected,
    };
  }

  const byId = new Map<string, CapabilityNode>();
  for (const capability of input.capabilities) {
    if (
      !capability ||
      typeof capability.id !== 'string' ||
      !capability.id.trim() ||
      byId.has(capability.id)
    ) {
      return {
        ...base,
        status: 'INVALID_REQUEST',
        plan: [],
        ranking: 'deterministic-lexical',
        rejected: [
          {
            capabilityId: String(capability?.id ?? 'unknown'),
            reason: 'INVALID_OR_DUPLICATE_CAPABILITY_ID',
          },
        ],
      };
    }
    if (
      typeof capability.domainId !== 'string' ||
      !capability.domainId.trim() ||
      typeof capability.description !== 'string' ||
      !Array.isArray(capability.intents) ||
      !capability.intents.every((item) => typeof item === 'string') ||
      !Array.isArray(capability.tags) ||
      !capability.tags.every((item) => typeof item === 'string') ||
      (capability.requires !== undefined &&
        (!Array.isArray(capability.requires) ||
          !capability.requires.every(
            (item) => typeof item === 'string' && item.trim().length > 0
          ))) ||
      (capability.inputTypes !== undefined &&
        (!Array.isArray(capability.inputTypes) ||
          !capability.inputTypes.every((item) => typeof item === 'string'))) ||
      (capability.outputTypes !== undefined &&
        (!Array.isArray(capability.outputTypes) ||
          !capability.outputTypes.every((item) => typeof item === 'string'))) ||
      !Object.hasOwn(RISK_ORDER, capability.risk) ||
      !['none', 'session', 'user-controlled', 'provider-defined'].includes(capability.retention) ||
      !Number.isFinite(capability.estimatedCost) ||
      capability.estimatedCost < 0 ||
      typeof capability.enabled !== 'boolean' ||
      typeof capability.external !== 'boolean' ||
      typeof capability.piiAllowed !== 'boolean' ||
      typeof capability.requiresHumanApproval !== 'boolean'
    ) {
      return {
        ...base,
        status: 'INVALID_REQUEST',
        plan: [],
        ranking: 'deterministic-lexical',
        rejected: [{ capabilityId: capability.id, reason: 'INVALID_CAPABILITY_CONTRACT' }],
      };
    }
    byId.set(capability.id, capability);
  }

  const allowed = new Map<string, CapabilityNode>();
  for (const capability of byId.values()) {
    const reason = policyRejection(capability, policy);
    if (reason) rejected.push({ capabilityId: capability.id, reason });
    else allowed.set(capability.id, capability);
  }
  const rejectedIds = new Set(rejected.map((entry) => entry.capabilityId));

  let ranking: IntentResolution['ranking'] = 'deterministic-lexical';

  if (input.edges !== undefined && !Array.isArray(input.edges)) {
    return {
      ...base,
      status: 'INVALID_REQUEST',
      plan: [],
      ranking,
      rejected: [{ capabilityId: 'knowledge-graph', reason: 'INVALID_KNOWLEDGE_GRAPH' }],
    };
  }
  const edges = input.edges ?? [];
  for (const edge of edges) {
    if (
      !edge ||
      typeof edge.from !== 'string' ||
      typeof edge.to !== 'string' ||
      !byId.has(edge.from) ||
      !byId.has(edge.to) ||
      !['requires', 'produces', 'related'].includes(edge.relation) ||
      (edge.weight !== undefined &&
        (!Number.isFinite(edge.weight) || edge.weight < 0 || edge.weight > 1))
    ) {
      return {
        ...base,
        status: 'INVALID_REQUEST',
        plan: [],
        ranking,
        rejected: [
          ...rejected,
          {
            capabilityId: typeof edge?.from === 'string' ? edge.from : 'knowledge-graph',
            reason: 'INVALID_KNOWLEDGE_GRAPH_EDGE',
          },
        ],
      };
    }
  }

  let intentVector: number[] | null = null;
  let vectors = new Map<string, number[]>();
  // Do not disclose intent text to an embedding provider when policy leaves no eligible candidates.
  if (input.embeddingProvider && allowed.size > 0) {
    try {
      intentVector = await input.embeddingProvider.embed(intent);
      if (intentVector.length && intentVector.every(Number.isFinite)) {
        const entries = await Promise.all(
          [...allowed.values()].map(async (capability) => {
            const vector = await input.embeddingProvider!.embed(
              [
                capability.id,
                capability.description,
                ...capability.intents,
                ...capability.tags,
              ].join(' ')
            );
            return [capability.id, vector] as const;
          })
        );
        vectors = new Map(
          entries.filter((entry) => entry[1].length && entry[1].every(Number.isFinite))
        );
        const dimensions = new Set([
          intentVector.length,
          ...[...vectors.values()].map((vector) => vector.length),
        ]);
        if (vectors.size === allowed.size && vectors.size > 0 && dimensions.size === 1) {
          ranking = 'hybrid-lexical-embedding';
        } else {
          // Mixed model versions/dimensions must not silently depress semantic scores.
          intentVector = null;
          vectors.clear();
          ranking = 'deterministic-lexical';
        }
      }
    } catch {
      // Provider failure is non-fatal: deterministic lexical ranking remains available.
      intentVector = null;
      vectors.clear();
      ranking = 'deterministic-lexical';
    }
  }

  const queryVector = intentVector;
  const ranked = [...allowed.values()]
    .map((capability) => {
      const lexical = lexicalScore(intent, capability);
      const vector = queryVector ? vectors.get(capability.id) : undefined;
      const semantic = queryVector && vector ? cosine(queryVector, vector) : 0;
      const score =
        ranking === 'hybrid-lexical-embedding' ? lexical * 0.55 + semantic * 0.45 : lexical;
      return {
        capability,
        score,
        reasons: [
          lexical > 0 ? 'LEXICAL_MATCH' : 'LEXICAL_NO_MATCH',
          ...(vector ? ['EMBEDDING_MATCH'] : []),
        ],
      };
    })
    .filter((entry) => entry.score >= policy.minScore)
    .sort(
      (a, b) =>
        b.score - a.score ||
        a.capability.estimatedCost - b.capability.estimatedCost ||
        a.capability.id.localeCompare(b.capability.id)
    );

  for (const candidate of ranked) {
    const chain = dependencyOrder(candidate.capability.id, byId, rejectedIds, edges);
    if (chain.error) {
      rejected.push({ capabilityId: candidate.capability.id, reason: chain.error });
      continue;
    }
    const planNodes = chain.ids.map((id) => byId.get(id)!);
    const cost = planNodes.reduce((sum, node) => sum + node.estimatedCost, 0);
    if (planNodes.length > policy.maxCapabilities) {
      rejected.push({
        capabilityId: candidate.capability.id,
        reason: 'CAPABILITY_CHAIN_LIMIT_EXCEEDED',
      });
      continue;
    }
    if (cost > policy.maxCost) {
      rejected.push({ capabilityId: candidate.capability.id, reason: 'BUDGET_EXCEEDED' });
      continue;
    }
    const plan = planNodes.map((node) => {
      const score =
        node.id === candidate.capability.id ? candidate.score : lexicalScore(intent, node);
      return {
        capabilityId: node.id,
        domainId: node.domainId,
        score: Number(score.toFixed(4)),
        estimatedCost: node.estimatedCost,
        risk: node.risk,
        requiresHumanApproval:
          node.requiresHumanApproval || policy.requireHumanApprovalFor.includes(node.risk),
        reasons:
          node.id === candidate.capability.id ? candidate.reasons : ['KNOWLEDGE_GRAPH_DEPENDENCY'],
      };
    });
    return {
      ...base,
      status: 'RESOLVED',
      plan,
      totalEstimatedCost: Number(cost.toFixed(6)),
      requiresHumanApproval: plan.some((node) => node.requiresHumanApproval),
      ranking,
      rejected,
    };
  }

  return { ...base, status: 'NO_SAFE_ROUTE', plan: [], ranking, rejected };
}
