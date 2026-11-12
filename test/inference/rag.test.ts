import { describe, expect, it } from 'vitest';
import { SovereignRagStore } from '../../src/inference/rag';

describe('SovereignRagStore', () => {
  it('retrieves source-labeled knowledge while preserving its identifier', () => {
    const rag = new SovereignRagStore();
    rag.add(
      'atlas-source',
      'Fuente documental ATLAS: registro canónico de documentos, versiones, hashes y eventos auditables.'
    );

    const [hit] = rag.search('documentos versiones hashes eventos auditables', 1);

    expect(hit.id).toBe('atlas-source');
    expect(hit.text).toContain('Fuente documental ATLAS');
    expect(hit.score).toBeGreaterThan(0);
  });

  it('does not replace an existing source when an identifier is reused', () => {
    const rag = new SovereignRagStore();
    rag.add('source', 'first version');
    rag.add('source', 'second version');

    expect(rag.search('first version', 1)[0]?.text).toBe('first version');
  });
});
