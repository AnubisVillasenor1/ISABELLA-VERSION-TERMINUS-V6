import type { Application, Request, Response } from 'express';
import { z } from 'zod';
import type { AppDatabase } from '../database/app-db';
import { simulateAtlasHcu } from '../atlas/hcu-simulation';
import type { AtlasHcuEdgeInput, AtlasHcuNodeInput, AtlasHcuStore } from '../atlas/hcu-store';
import { FixedWindowRateLimiter } from '../security/rate-limit';
import { hasSameOrigin, resolveGuestOwner } from './guest-session';

const nodeInputSchema = z
  .object({
    name: z.string().trim().min(1).max(140),
    domain: z.string().trim().min(1).max(80),
    influence: z.number().finite().min(0).max(1),
    risk: z.number().finite().min(0).max(1),
    evidence: z.number().finite().min(0).max(1),
  })
  .strict();

const edgeInputSchema = z
  .object({
    sourceNodeId: z.string().uuid(),
    targetNodeId: z.string().uuid(),
    effectSign: z.union([z.literal(1), z.literal(-1)]),
    strength: z.number().finite().min(0.1).max(1),
    lagYears: z.number().int().min(0).max(100),
    evidenceSource: z.string().trim().max(600),
  })
  .strict()
  .refine((input) => input.sourceNodeId !== input.targetNodeId);

const simulationInputSchema = z
  .object({
    sourceNodeId: z.string().uuid(),
    endYear: z.number().int().min(new Date().getFullYear()).max(2100),
  })
  .strict();
const recordIdSchema = z.string().uuid();

function publicError(response: Response, status: number, code: string): void {
  response.status(status).json({ success: false, error: code });
}

function requestLimit(
  request: Request,
  response: Response,
  limiter: FixedWindowRateLimiter,
  bucket: string
): boolean {
  const decision = limiter.consume(`${bucket}:${request.ip || 'unknown'}`);
  if (decision.allowed) return true;
  response.setHeader('Retry-After', String(Math.max(1, Math.ceil(decision.retryAfterMs / 1_000))));
  publicError(response, 429, 'RATE_LIMIT_EXCEEDED');
  return false;
}

function writeAllowed(
  request: Request,
  response: Response,
  limiter: FixedWindowRateLimiter,
  bucket: string
): boolean {
  if (!hasSameOrigin(request)) {
    publicError(response, 403, 'CROSS_ORIGIN_REQUEST_BLOCKED');
    return false;
  }
  return requestLimit(request, response, limiter, bucket);
}

function requirePersistence(
  store: AtlasHcuStore | null,
  database: AppDatabase | null,
  response: Response
): { readonly store: AtlasHcuStore; readonly database: AppDatabase } | null {
  if (store && database) return { store, database };
  publicError(response, 503, 'ATLAS_HCU_PERSISTENCE_UNAVAILABLE');
  return null;
}

async function resolveOwnerKey(
  request: Request,
  response: Response,
  database: AppDatabase
): Promise<string | null> {
  try {
    return await resolveGuestOwner(request, response, database);
  } catch {
    publicError(response, 503, 'ATLAS_HCU_SESSION_UNAVAILABLE');
    return null;
  }
}

function setPrivateResponse(response: Response): void {
  response.setHeader('Cache-Control', 'no-store');
}

export function registerAtlasHcuRoutes(
  app: Application,
  store: AtlasHcuStore | null,
  database: AppDatabase | null,
  limiter = new FixedWindowRateLimiter(90, 60_000)
): void {
  app.get('/api/v1/atlas/hcu', async (request, response) => {
    setPrivateResponse(response);
    if (!requestLimit(request, response, limiter, 'atlas-hcu-read')) return;
    const persistence = requirePersistence(store, database, response);
    if (!persistence) return;
    const { store: activeStore, database: activeDatabase } = persistence;
    const ownerKeyHash = await resolveOwnerKey(request, response, activeDatabase);
    if (!ownerKeyHash) return;

    try {
      const graph = await activeStore.list(ownerKeyHash);
      response.json({ success: true, ...graph });
    } catch {
      publicError(response, 503, 'ATLAS_HCU_LOAD_FAILED');
    }
  });

  app.post('/api/v1/atlas/hcu/simulate', async (request, response) => {
    setPrivateResponse(response);
    if (!writeAllowed(request, response, limiter, 'atlas-hcu-simulation')) return;
    const parsed = simulationInputSchema.safeParse(request.body);
    if (!parsed.success) return publicError(response, 400, 'ATLAS_HCU_SIMULATION_INVALID');
    const persistence = requirePersistence(store, database, response);
    if (!persistence) return;
    const { store: activeStore, database: activeDatabase } = persistence;
    const ownerKeyHash = await resolveOwnerKey(request, response, activeDatabase);
    if (!ownerKeyHash) return;

    try {
      const graph = await activeStore.list(ownerKeyHash);
      if (!graph.nodes.some((node) => node.id === parsed.data.sourceNodeId)) {
        return publicError(response, 404, 'ATLAS_HCU_SOURCE_NOT_FOUND');
      }
      const startYear = new Date().getFullYear();
      const result = simulateAtlasHcu(graph, parsed.data.sourceNodeId, {
        startYear,
        endYear: parsed.data.endYear,
        intensity: 1,
      });
      response.json({ success: true, startYear, endYear: parsed.data.endYear, result });
    } catch {
      publicError(response, 503, 'ATLAS_HCU_SIMULATION_FAILED');
    }
  });

  app.post('/api/v1/atlas/hcu/nodes', async (request, response) => {
    setPrivateResponse(response);
    if (!writeAllowed(request, response, limiter, 'atlas-hcu-node-write')) return;
    const parsed = nodeInputSchema.safeParse(request.body);
    if (!parsed.success) return publicError(response, 400, 'ATLAS_HCU_NODE_INVALID');
    const persistence = requirePersistence(store, database, response);
    if (!persistence) return;
    const { store: activeStore, database: activeDatabase } = persistence;
    const ownerKeyHash = await resolveOwnerKey(request, response, activeDatabase);
    if (!ownerKeyHash) return;

    try {
      const node = await activeStore.createNode(ownerKeyHash, parsed.data as AtlasHcuNodeInput);
      response.status(201).json({ success: true, node });
    } catch {
      publicError(response, 503, 'ATLAS_HCU_NODE_CREATE_FAILED');
    }
  });

  app.patch('/api/v1/atlas/hcu/nodes/:id', async (request, response) => {
    setPrivateResponse(response);
    if (!writeAllowed(request, response, limiter, 'atlas-hcu-node-write')) return;
    const id = recordIdSchema.safeParse(request.params.id);
    const parsed = nodeInputSchema.safeParse(request.body);
    if (!id.success || !parsed.success) return publicError(response, 400, 'ATLAS_HCU_NODE_INVALID');
    const persistence = requirePersistence(store, database, response);
    if (!persistence) return;
    const { store: activeStore, database: activeDatabase } = persistence;
    const ownerKeyHash = await resolveOwnerKey(request, response, activeDatabase);
    if (!ownerKeyHash) return;

    try {
      const node = await activeStore.updateNode(
        ownerKeyHash,
        id.data,
        parsed.data as AtlasHcuNodeInput
      );
      if (!node) return publicError(response, 404, 'ATLAS_HCU_NODE_NOT_FOUND');
      response.json({ success: true, node });
    } catch {
      publicError(response, 503, 'ATLAS_HCU_NODE_UPDATE_FAILED');
    }
  });

  app.delete('/api/v1/atlas/hcu/nodes/:id', async (request, response) => {
    setPrivateResponse(response);
    if (!writeAllowed(request, response, limiter, 'atlas-hcu-node-write')) return;
    const id = recordIdSchema.safeParse(request.params.id);
    if (!id.success) return publicError(response, 400, 'ATLAS_HCU_NODE_ID_INVALID');
    const persistence = requirePersistence(store, database, response);
    if (!persistence) return;
    const { store: activeStore, database: activeDatabase } = persistence;
    const ownerKeyHash = await resolveOwnerKey(request, response, activeDatabase);
    if (!ownerKeyHash) return;

    try {
      const deleted = await activeStore.deleteNode(ownerKeyHash, id.data);
      if (!deleted) return publicError(response, 404, 'ATLAS_HCU_NODE_NOT_FOUND');
      response.json({ success: true });
    } catch {
      publicError(response, 503, 'ATLAS_HCU_NODE_DELETE_FAILED');
    }
  });

  app.post('/api/v1/atlas/hcu/edges', async (request, response) => {
    setPrivateResponse(response);
    if (!writeAllowed(request, response, limiter, 'atlas-hcu-edge-write')) return;
    const parsed = edgeInputSchema.safeParse(request.body);
    if (!parsed.success) return publicError(response, 400, 'ATLAS_HCU_EDGE_INVALID');
    const persistence = requirePersistence(store, database, response);
    if (!persistence) return;
    const { store: activeStore, database: activeDatabase } = persistence;
    const ownerKeyHash = await resolveOwnerKey(request, response, activeDatabase);
    if (!ownerKeyHash) return;

    try {
      const edge = await activeStore.createEdge(ownerKeyHash, parsed.data as AtlasHcuEdgeInput);
      response.status(201).json({ success: true, edge });
    } catch {
      publicError(response, 503, 'ATLAS_HCU_EDGE_CREATE_FAILED');
    }
  });

  app.patch('/api/v1/atlas/hcu/edges/:id', async (request, response) => {
    setPrivateResponse(response);
    if (!writeAllowed(request, response, limiter, 'atlas-hcu-edge-write')) return;
    const id = recordIdSchema.safeParse(request.params.id);
    const parsed = edgeInputSchema.safeParse(request.body);
    if (!id.success || !parsed.success) return publicError(response, 400, 'ATLAS_HCU_EDGE_INVALID');
    const persistence = requirePersistence(store, database, response);
    if (!persistence) return;
    const { store: activeStore, database: activeDatabase } = persistence;
    const ownerKeyHash = await resolveOwnerKey(request, response, activeDatabase);
    if (!ownerKeyHash) return;

    try {
      const edge = await activeStore.updateEdge(
        ownerKeyHash,
        id.data,
        parsed.data as AtlasHcuEdgeInput
      );
      if (!edge) return publicError(response, 404, 'ATLAS_HCU_EDGE_NOT_FOUND');
      response.json({ success: true, edge });
    } catch {
      publicError(response, 503, 'ATLAS_HCU_EDGE_UPDATE_FAILED');
    }
  });

  app.delete('/api/v1/atlas/hcu/edges/:id', async (request, response) => {
    setPrivateResponse(response);
    if (!writeAllowed(request, response, limiter, 'atlas-hcu-edge-write')) return;
    const id = recordIdSchema.safeParse(request.params.id);
    if (!id.success) return publicError(response, 400, 'ATLAS_HCU_EDGE_ID_INVALID');
    const persistence = requirePersistence(store, database, response);
    if (!persistence) return;
    const { store: activeStore, database: activeDatabase } = persistence;
    const ownerKeyHash = await resolveOwnerKey(request, response, activeDatabase);
    if (!ownerKeyHash) return;

    try {
      const deleted = await activeStore.deleteEdge(ownerKeyHash, id.data);
      if (!deleted) return publicError(response, 404, 'ATLAS_HCU_EDGE_NOT_FOUND');
      response.json({ success: true });
    } catch {
      publicError(response, 503, 'ATLAS_HCU_EDGE_DELETE_FAILED');
    }
  });
}
