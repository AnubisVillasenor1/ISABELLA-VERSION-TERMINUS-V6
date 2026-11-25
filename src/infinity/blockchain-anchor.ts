/**
 * ISABELLA VILLASEÑOR AI™ — Blockchain Anchor Fabric (TAMV MSR).
 * state: draft | engine-generated.
 *
 * Anclaje periódico de raíces Merkle en redes blockchain permisionadas.
 * Inspiración: LACChain (Hyperledger Besu), CIRCL (Cloudflare).
 *
 * TODO: este módulo es una SIMULACIÓN. No hay conexión real a ninguna
 * blockchain. El anclaje real requiere un nodo Besu/LACChain configurado
 * y un sink de transacciones. `anchored: false` siempre.
 *
 * Principios:
 * - El anclaje es periódico (no por evento).
 * - La raíz Merkle se ancla como transacción.
 * - La verificación es offline (prueba de inclusión Merkle).
 * - No se afirma finalidad ni inmutabilidad real.
 */
import { digest } from './skills';
import { SkillInputError } from './skills';

export interface AnchorRecord {
  readonly root: string;
  readonly leafCount: number;
  readonly anchoredAt: string;
  readonly network: string;
  readonly txHash: string | null;
  readonly anchored: false;
  readonly executionPerformed: false;
}

export interface AnchorProof {
  readonly root: string;
  readonly leafIndex: number;
  readonly proofPath: readonly { hash: string; position: 'left' | 'right' }[];
  readonly verified: boolean;
}

export const ANCHOR_NETWORKS = ['lacchain-besu', 'ethereum-sepolia', 'local-simulation'] as const;
export type AnchorNetwork = (typeof ANCHOR_NETWORKS)[number];

export function isAnchorNetwork(value: unknown): value is AnchorNetwork {
  return typeof value === 'string' && (ANCHOR_NETWORKS as readonly string[]).includes(value);
}

/**
 * Simula el anclaje de una raíz Merkle en una red blockchain.
 * NO envía ninguna transacción real. Devuelve un registro con txHash=null
 * y anchored=false.
 */
export function anchorMerkleRoot(
  root: string,
  leafCount: number,
  network: unknown
): AnchorRecord {
  if (typeof root !== 'string' || !/^[0-9a-f]{64}$/i.test(root)) {
    throw new SkillInputError('INVALID_ROOT', 'root debe ser un hash hex de 64 caracteres');
  }
  if (!Number.isInteger(leafCount) || leafCount < 1) {
    throw new SkillInputError('INVALID_LEAF_COUNT', 'leafCount debe ser entero ≥ 1');
  }
  if (!isAnchorNetwork(network)) {
    throw new SkillInputError('INVALID_NETWORK', `network debe ser ${ANCHOR_NETWORKS.join(', ')}`);
  }

  return {
    root: root.toLowerCase(),
    leafCount,
    anchoredAt: new Date().toISOString(),
    network,
    txHash: null, // No real transaction
    anchored: false,
    executionPerformed: false,
  };
}

/**
 * Verifica una prueba de inclusión Merkle offline.
 * No consulta ninguna blockchain; solo verifica el path contra la raíz.
 */
export function verifyMerkleProof(
  leaf: string,
  proofPath: readonly { hash: string; position: 'left' | 'right' }[],
  root: string
): boolean {
  if (typeof leaf !== 'string' || !/^[0-9a-f]{64}$/i.test(leaf)) return false;
  if (typeof root !== 'string' || !/^[0-9a-f]{64}$/i.test(root)) return false;

  let current = leaf.toLowerCase();
  for (const step of proofPath) {
    if (!step || typeof step.hash !== 'string' || !/^[0-9a-f]{64}$/i.test(step.hash)) return false;
    if (step.position !== 'left' && step.position !== 'right') return false;
    const combined = step.position === 'left'
      ? step.hash.toLowerCase() + current
      : current + step.hash.toLowerCase();
    current = digest(combined).slice(0, 64); // SHA3-512 truncated to 64 hex (256 bits) for Merkle
  }
  return current === root.toLowerCase();
}

export function describeBlockchainAnchor(): Readonly<Record<string, unknown>> {
  return {
    networks: ANCHOR_NETWORKS,
    realAnchoring: false,
    txHashReturned: false,
    proofVerification: 'offline-merkle',
    note: 'Simulación: no se envía ninguna transacción real. El anclaje real requiere un nodo Besu/LACChain configurado.',
  };
}