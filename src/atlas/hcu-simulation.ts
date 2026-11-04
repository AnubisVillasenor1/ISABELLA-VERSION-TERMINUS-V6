import type { AtlasHcuEdge, AtlasHcuGraph } from './hcu-store';

export interface AtlasHcuSimulationOptions {
  readonly startYear: number;
  readonly endYear: number;
  readonly intensity?: number;
  readonly maxPaths?: number;
}

export interface AtlasHcuImpact {
  readonly nodeId: string;
  readonly delta: number;
  readonly arrivalYear: number;
  readonly pathCount: number;
}

export interface AtlasHcuSimulationResult {
  readonly impacts: readonly AtlasHcuImpact[];
  readonly exploredPaths: number;
  readonly truncated: boolean;
}

interface PathState {
  readonly nodeId: string;
  readonly year: number;
  readonly delta: number;
  readonly path: ReadonlySet<string>;
}

interface MutableImpact {
  delta: number;
  arrivalYear: number;
  pathCount: number;
}

const MIN_REPORTABLE_IMPACT = 0.01;
const DEFAULT_MAX_PATHS = 10_000;
const MAX_PATH_DEPTH = 12;

function clampImpact(value: number): number {
  return Math.max(-1, Math.min(1, value));
}

function groupOutgoingEdges(edges: readonly AtlasHcuEdge[]): Map<string, AtlasHcuEdge[]> {
  const outgoing = new Map<string, AtlasHcuEdge[]>();
  for (const edge of edges) {
    const bucket = outgoing.get(edge.sourceNodeId) ?? [];
    bucket.push(edge);
    outgoing.set(edge.sourceNodeId, bucket);
  }
  return outgoing;
}

export function simulateAtlasHcu(
  graph: AtlasHcuGraph,
  sourceNodeId: string,
  options: AtlasHcuSimulationOptions
): AtlasHcuSimulationResult {
  const intensity = options.intensity ?? 1;
  const maxPaths = options.maxPaths ?? DEFAULT_MAX_PATHS;
  if (
    !Number.isInteger(options.startYear) ||
    !Number.isInteger(options.endYear) ||
    options.endYear < options.startYear ||
    !Number.isFinite(intensity) ||
    Math.abs(intensity) > 1 ||
    !Number.isInteger(maxPaths) ||
    maxPaths < 1
  ) {
    throw new Error('ATLAS_HCU_SIMULATION_OPTIONS_INVALID');
  }

  if (!graph.nodes.some((node) => node.id === sourceNodeId)) {
    return { impacts: [], exploredPaths: 0, truncated: false };
  }

  const outgoing = groupOutgoingEdges(graph.edges);
  const impacts = new Map<string, MutableImpact>([
    [sourceNodeId, { delta: intensity, arrivalYear: options.startYear, pathCount: 1 }],
  ]);
  const stack: PathState[] = [
    {
      nodeId: sourceNodeId,
      year: options.startYear,
      delta: intensity,
      path: new Set([sourceNodeId]),
    },
  ];
  const maxDepth = Math.min(graph.nodes.length, MAX_PATH_DEPTH);
  let exploredPaths = 0;
  let truncated = false;

  while (stack.length > 0) {
    const current = stack.pop();
    if (!current) break;

    for (const edge of outgoing.get(current.nodeId) ?? []) {
      if (exploredPaths >= maxPaths) {
        truncated = true;
        break;
      }
      if (current.path.has(edge.targetNodeId)) continue;

      const arrivalYear = current.year + edge.lagYears;
      if (arrivalYear > options.endYear) continue;

      const delta = current.delta * edge.effectSign * edge.strength;
      if (Math.abs(delta) < MIN_REPORTABLE_IMPACT) continue;

      const previous = impacts.get(edge.targetNodeId);
      impacts.set(edge.targetNodeId, {
        delta: clampImpact((previous?.delta ?? 0) + delta),
        arrivalYear: Math.min(previous?.arrivalYear ?? arrivalYear, arrivalYear),
        pathCount: (previous?.pathCount ?? 0) + 1,
      });
      exploredPaths += 1;

      if (current.path.size < maxDepth) {
        const path = new Set(current.path);
        path.add(edge.targetNodeId);
        stack.push({ nodeId: edge.targetNodeId, year: arrivalYear, delta, path });
      }
    }

    if (truncated) break;
  }

  const result = [...impacts.entries()]
    .map(([nodeId, impact]) => ({ nodeId, ...impact }))
    .sort((left, right) => Math.abs(right.delta) - Math.abs(left.delta));

  return { impacts: result, exploredPaths, truncated };
}
