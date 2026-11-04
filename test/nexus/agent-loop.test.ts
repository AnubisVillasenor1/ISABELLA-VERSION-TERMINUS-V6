// state: draft | engine-generated — pruebas del bucle de agente Nexus.
import { describe, expect, it } from 'vitest';
import {
  EvidenceLedger,
  NexusAgentLoop,
  SkillMemory,
  heuristicPlanner,
} from '../../src/nexus/agent-loop';
import { NexusKnowledgeGraph } from '../../src/nexus/knowledge-graph';
import { NexusToolRegistry, toolDefinition } from '../../src/nexus/tool-registry';

function graphWithFact(): NexusKnowledgeGraph {
  const graph = new NexusKnowledgeGraph();
  graph.assertFact({
    subject: 'Isabella',
    predicate: 'reside_en',
    object: 'Real del Monte, Hidalgo',
    source: 'repo:docs/territorio.md',
  });
  return graph;
}

function loop() {
  const tools = new NexusToolRegistry();
  const ledger = new EvidenceLedger();
  const skills = new SkillMemory();
  return { tools, ledger, skills, agent: new NexusAgentLoop(tools, ledger, skills) };
}

describe('NexusAgentLoop', () => {
  it('responde con hechos y declara la fuente sin usar modelo', async () => {
    const graph = graphWithFact();
    const h = loop();
    h.tools.register(
      toolDefinition({
        id: 'knowledge.search',
        description: 'busca',
        risk: 'LOW',
        sideEffect: 'read',
        requiresApproval: false,
        run: async (args) => {
          const hits = graph.query({ text: String(args.query ?? '') });
          return {
            ok: true,
            summary: `${hits.length} hechos`,
            output: {
              hits: hits.map((hit) => ({
                subject: hit.fact.subject,
                predicate: hit.fact.predicate,
                object: hit.fact.object,
                source: hit.fact.source,
                confidence: hit.fact.confidence,
              })),
            },
          };
        },
      })
    );

    const result = await h.agent.run({ goal: '¿Dónde reside Isabella?' }, heuristicPlanner(graph));
    expect(result.status).toBe('completed');
    expect(result.answer).toContain('Real del Monte');
    expect(result.answer).toContain('repo:docs/territorio.md');
    expect(result.policy.modelUsed).toBe(false);
    expect(result.policy.grounded).toBe(true);
  });

  it('declara honestamente cuando no hay evidencia', async () => {
    const graph = new NexusKnowledgeGraph();
    const h = loop();
    h.tools.register(
      toolDefinition({
        id: 'knowledge.search',
        description: 'busca',
        risk: 'LOW',
        sideEffect: 'read',
        requiresApproval: false,
        run: async () => ({ ok: true, summary: '0 hechos', output: { hits: [] } }),
      })
    );
    const result = await h.agent.run({ goal: '¿Quién ganó el mundial de 1994?' }, heuristicPlanner(graph));
    expect(result.status).toBe('completed');
    expect(result.answer).toContain('No encontré');
    expect(result.policy.grounded).toBe(true);
    expect(result.answer).not.toMatch(/Brasil/);
  });

  it('bloquea escrituras sin aprobación y lo deja en evidencia', async () => {
    const h = loop();
    h.tools.register(
      toolDefinition({
        id: 'knowledge.assert',
        description: 'escribe',
        risk: 'MEDIUM',
        sideEffect: 'write',
        requiresApproval: true,
        run: async () => ({ ok: true, summary: 'insertado', output: { status: 'inserted' } }),
      })
    );
    const result = await h.agent.run(
      { goal: 'registra un hecho', approvalGranted: false, maxSteps: 1 },
      async () => ({ kind: 'tool', toolId: 'knowledge.assert', args: { subject: 'x' } })
    );
    expect(result.steps[0]?.ok).toBe(false);
    expect(result.steps[0]?.summary).toContain('aprobación');
    expect(result.evidence).toHaveLength(1);
    expect(result.evidence[0]?.ok).toBe(false);
    expect(h.ledger.verify()).toBe(true);
  });

  it('aplica el techo de pasos y no finge éxito', async () => {
    const h = loop();
    h.tools.register(
      toolDefinition({
        id: 'loop.echo',
        description: 'eco',
        risk: 'LOW',
        sideEffect: 'read',
        requiresApproval: false,
        run: async () => ({ ok: true, summary: 'eco', output: {} }),
      })
    );
    const result = await h.agent.run({ goal: 'bucle', maxSteps: 2 }, async () => ({
      kind: 'tool',
      toolId: 'loop.echo',
      args: {},
    }));
    expect(result.status).toBe('step_limit');
    expect(result.ok).toBe(false);
    expect(result.steps).toHaveLength(2);
  });

  it('aprende la secuencia pero no la presenta como autorización', async () => {
    const graph = graphWithFact();
    const h = loop();
    h.tools.register(
      toolDefinition({
        id: 'knowledge.search',
        description: 'busca',
        risk: 'LOW',
        sideEffect: 'read',
        requiresApproval: false,
        run: async () => ({ ok: true, summary: 'ok', output: { hits: [] } }),
      })
    );
    const result = await h.agent.run({ goal: 'consulta' }, heuristicPlanner(graph));
    expect(result.learnedSkills[0]?.toolIds).toContain('knowledge.search');
    expect(result.disclaimers.join(' ')).toContain('no una autorización');
  });

  it('detecta alteración del ledger', () => {
    const ledger = new EvidenceLedger();
    ledger.append({
      toolId: 'x.y',
      inputHash: 'a',
      outputHash: 'b',
      ok: true,
      summary: 'ok',
      at: 1,
    });
    expect(ledger.verify()).toBe(true);
    const record = ledger.list()[0];
    expect(record?.hash).toHaveLength(64);
  });
});
