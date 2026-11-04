import { describe, expect, it } from 'vitest';
import type { AtlasHcuGraph } from '../../src/atlas/hcu-store';
import { simulateAtlasHcu } from '../../src/atlas/hcu-simulation';

const graph: AtlasHcuGraph = {
  nodes: [
    { id: 'source', name: 'Origen', domain: 'A', influence: 1, risk: 0.7, evidence: 0.2 },
    { id: 'middle', name: 'Intermedio', domain: 'B', influence: 0.6, risk: 0.5, evidence: 0.4 },
    { id: 'target', name: 'Resultado', domain: 'C', influence: 0.4, risk: 0.3, evidence: 0.1 },
    {
      id: 'outside',
      name: 'Fuera de horizonte',
      domain: 'D',
      influence: 0.2,
      risk: 0.2,
      evidence: 0.1,
    },
  ],
  edges: [
    {
      id: 'edge-1',
      sourceNodeId: 'source',
      targetNodeId: 'middle',
      effectSign: 1,
      strength: 0.5,
      lagYears: 1,
      evidenceSource: 'https://example.org/source',
    },
    {
      id: 'edge-2',
      sourceNodeId: 'middle',
      targetNodeId: 'target',
      effectSign: -1,
      strength: 0.4,
      lagYears: 2,
      evidenceSource: 'https://example.org/target',
    },
    {
      id: 'edge-cycle',
      sourceNodeId: 'target',
      targetNodeId: 'source',
      effectSign: 1,
      strength: 1,
      lagYears: 0,
      evidenceSource: '',
    },
    {
      id: 'edge-late',
      sourceNodeId: 'source',
      targetNodeId: 'outside',
      effectSign: 1,
      strength: 1,
      lagYears: 9,
      evidenceSource: '',
    },
  ],
};

describe('Atlas HCU simulation', () => {
  it('propagates signed effects through simple paths within the selected horizon', () => {
    const result = simulateAtlasHcu(graph, 'source', { startYear: 2026, endYear: 2034 });
    expect(result.impacts).toEqual([
      { nodeId: 'source', delta: 1, arrivalYear: 2026, pathCount: 1 },
      { nodeId: 'middle', delta: 0.5, arrivalYear: 2027, pathCount: 1 },
      { nodeId: 'target', delta: -0.2, arrivalYear: 2029, pathCount: 1 },
    ]);
    expect(result.truncated).toBe(false);
  });

  it('bounds graph expansion and reports when the path budget is exhausted', () => {
    const result = simulateAtlasHcu(graph, 'source', {
      startYear: 2026,
      endYear: 2040,
      maxPaths: 1,
    });
    expect(result.exploredPaths).toBe(1);
    expect(result.truncated).toBe(true);
  });

  it('returns an empty result for an unknown source and rejects invalid horizons', () => {
    expect(simulateAtlasHcu(graph, 'missing', { startYear: 2026, endYear: 2034 }).impacts).toEqual(
      []
    );
    expect(() => simulateAtlasHcu(graph, 'source', { startYear: 2035, endYear: 2034 })).toThrow(
      'ATLAS_HCU_SIMULATION_OPTIONS_INVALID'
    );
  });
});
