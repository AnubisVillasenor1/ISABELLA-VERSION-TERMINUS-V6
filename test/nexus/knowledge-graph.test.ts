// state: draft | engine-generated — pruebas del grafo de conocimiento Nexus.
import { describe, expect, it } from 'vitest';
import { NexusKnowledgeGraph } from '../../src/nexus/knowledge-graph';

const base = {
  subject: 'Isabella',
  predicate: 'opera_en',
  object: 'Real del Monte',
  source: 'repo:docs/territorio.md',
};

describe('NexusKnowledgeGraph', () => {
  it('rechaza hechos sin fuente', () => {
    const graph = new NexusKnowledgeGraph();
    const result = graph.assertFact({ ...base, source: '   ' });
    expect(result).toEqual({ ok: false, status: 'rejected', reason: 'FACT_SOURCE_REQUIRED' });
    expect(graph.size()).toBe(0);
  });

  it('inserta y detecta duplicados sin duplicar almacenamiento', () => {
    const graph = new NexusKnowledgeGraph();
    const first = graph.assertFact(base);
    const second = graph.assertFact({ ...base, subject: '  isabella  ' });
    expect(first.status).toBe('inserted');
    expect(second.status).toBe('duplicate');
    expect(second.factId).toBe(first.factId);
    expect(graph.size()).toBe(1);
  });

  it('no resuelve conflictos solo: exige corrección explícita', () => {
    const graph = new NexusKnowledgeGraph();
    graph.assertFact(base);
    const conflict = graph.assertFact({ ...base, object: 'Pachuca' });
    expect(conflict.status).toBe('conflict');
    expect(conflict.conflictWith).toHaveLength(1);
    expect(graph.size()).toBe(1);

    const original = graph.snapshot().facts.find((fact) => fact.status === 'active');
    expect(original).toBeDefined();
    const corrected = graph.correctFact(original!.id, { object: 'Pachuca' }, 'human:revisor');
    expect(corrected?.object).toBe('Pachuca');
    expect(corrected?.supersedes).toBe(original!.id);
    expect(graph.get(original!.id)?.status).toBe('superseded');
    expect(graph.history('Isabella', 'opera_en')).toHaveLength(2);
  });

  it('retira sin borrar y conserva la razón', () => {
    const graph = new NexusKnowledgeGraph();
    const inserted = graph.assertFact(base);
    const withdrawn = graph.withdrawFact(inserted.factId as string, 'fuente retirada');
    expect(withdrawn?.status).toBe('withdrawn');
    expect(withdrawn?.withdrawalReason).toBe('fuente retirada');
    expect(graph.get(inserted.factId as string)).not.toBeNull();
    expect(graph.query({ text: 'Real del Monte' })).toHaveLength(0);
    expect(graph.query({ text: 'Real del Monte', includeInactive: true })).toHaveLength(1);
  });

  it('ordena por relevancia léxica y no inventa resultados', () => {
    const graph = new NexusKnowledgeGraph();
    graph.assertFact({
      subject: 'Panteón Inglés',
      predicate: 'se_ubica_en',
      object: 'Real del Monte',
      source: 'repo:docs/territorio.md',
    });
    graph.assertFact({
      subject: 'Profit Guard',
      predicate: 'impone',
      object: 'margen mínimo',
      source: 'repo:docs/economia.md',
    });
    const hits = graph.query({ text: 'Panteón Inglés Real del Monte' });
    expect(hits[0]?.fact.subject).toBe('Panteón Inglés');
    expect(graph.query({ text: 'fútbol americano' }).every((hit) => hit.score < 0.9)).toBe(true);
  });
});
