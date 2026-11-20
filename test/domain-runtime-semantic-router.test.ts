import { describe, expect, it } from 'vitest';
import { resolveSemanticIntent, type CapabilityNode } from '../src/domain-runtime/semantic-router';

const capabilities: CapabilityNode[] = [
  {
    id: 'cap.content.draft', domainId: 'dom.creator', description: 'Redactar borrador de publicación',
    intents: ['redactar contenido', 'crear publicación'], tags: ['texto', 'creador'],
    risk: 'low', estimatedCost: 0.01, enabled: true, external: false, piiAllowed: false,
    retention: 'session', requiresHumanApproval: false,
  },
  {
    id: 'cap.social.publish', domainId: 'dom.social', description: 'Publicar contenido en redes sociales',
    intents: ['publicar en redes', 'difundir publicación'], tags: ['social', 'publicación'],
    requires: ['cap.content.draft'], risk: 'medium', estimatedCost: 0.02, enabled: true,
    external: true, piiAllowed: false, retention: 'session', requiresHumanApproval: true,
  },
  {
    id: 'cap.admin.delete', domainId: 'dom.admin', description: 'Eliminar registros de forma irreversible',
    intents: ['eliminar registros'], tags: ['destrucción'], risk: 'critical', estimatedCost: 0,
    enabled: true, external: false, piiAllowed: true, retention: 'provider-defined', requiresHumanApproval: true,
  },
];

describe('IDR semantic router', () => {
  it('plans the minimum dependency chain without executing it', async () => {
    const result = await resolveSemanticIntent({
      intent: 'publicar en redes sociales',
      capabilities,
      policy: { allowExternal: true, maxCost: 0.1 },
    });
    expect(result.status).toBe('RESOLVED');
    expect(result.plan.map((item) => item.capabilityId)).toEqual(['cap.content.draft', 'cap.social.publish']);
    expect(result.totalEstimatedCost).toBeCloseTo(0.03);
    expect(result.requiresHumanApproval).toBe(true);
    expect(result.executionPerformed).toBe(false);
    expect(result.production).toBe(false);
  });

  it('fails closed when external execution is not allowed', async () => {
    const result = await resolveSemanticIntent({ intent: 'publicar en redes sociales', capabilities });
    expect(result.status).toBe('NO_SAFE_ROUTE');
    expect(result.plan).toEqual([]);
    expect(result.rejected).toContainEqual({ capabilityId: 'cap.social.publish', reason: 'EXTERNAL_EXECUTION_DISABLED' });
  });

  it('denies capabilities that exceed the risk policy', async () => {
    const result = await resolveSemanticIntent({
      intent: 'eliminar registros de forma irreversible',
      capabilities,
      policy: { maxRisk: 'medium', allowPii: true, allowedRetention: ['provider-defined', 'session'] },
    });
    expect(result.status).toBe('NO_SAFE_ROUTE');
    expect(result.rejected).toContainEqual({ capabilityId: 'cap.admin.delete', reason: 'RISK_EXCEEDS_POLICY' });
  });

  it('rejects missing dependencies and cycles instead of returning unsafe plans', async () => {
    const broken = capabilities.map((item) => item.id === 'cap.content.draft' ? { ...item, requires: ['cap.missing'] } : item);
    const result = await resolveSemanticIntent({
      intent: 'publicar en redes sociales', capabilities: broken, policy: { allowExternal: true, maxCost: 1 },
    });
    expect(result.status).toBe('NO_SAFE_ROUTE');
    expect(result.plan).toEqual([]);
  });

  it('uses embeddings when available and falls back if the provider fails', async () => {
    const provider = { embed: async (text: string) => text.includes('publicar') ? [1, 0] : [0.8, 0.2] };
    const embedded = await resolveSemanticIntent({
      intent: 'publicar contenido social', capabilities, policy: { allowExternal: true }, embeddingProvider: provider,
    });
    expect(embedded.ranking).toBe('hybrid-lexical-embedding');
    const fallback = await resolveSemanticIntent({
      intent: 'publicar contenido social', capabilities, policy: { allowExternal: true },
      embeddingProvider: { embed: async () => { throw new Error('provider unavailable'); } },
    });
    expect(fallback.ranking).toBe('deterministic-lexical');
  });

  it('rejects dependency cycles', async () => {
    const cyclic = capabilities.map((item) => item.id === 'cap.content.draft'
      ? { ...item, requires: ['cap.social.publish'] }
      : item);
    const result = await resolveSemanticIntent({
      intent: 'publicar en redes sociales', capabilities: cyclic,
      policy: { allowExternal: true, maxCost: 1 },
    });
    expect(result.status).toBe('NO_SAFE_ROUTE');
    expect(result.plan).toEqual([]);
    expect(result.rejected.some((entry) => entry.reason === 'DEPENDENCY_MISSING_OR_CYCLE')).toBe(true);
  });

  it('rejects duplicate capability identifiers and invalid budgets', async () => {
    const duplicate = await resolveSemanticIntent({ intent: 'crear publicación', capabilities: [capabilities[0], capabilities[0]] });
    expect(duplicate.status).toBe('INVALID_REQUEST');
    await expect(resolveSemanticIntent({ intent: 'x', capabilities, policy: { maxCost: -1 } })).rejects.toThrow('INVALID_POLICY_MAX_COST');
  });
});
