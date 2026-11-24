/**
 * ISABELLA VILLASEÑOR AI™ — Durable Recovery Adapter (native).
 * state: draft | engine-generated.
 *
 * Referencia: tamv-recovery/recovery.py (patrón durable local). Implementación
 * nativa en TypeScript, sin dependencias externas. Todo es determinista y
 * local: no hay conexión real a BookPI ni a PostgreSQL; el sink se inyecta.
 *
 * Patrones implementados:
 *   - Claves de idempotencia estables (tenant + operación lógica).
 *   - Lookup antes de reintentar (no asumir ausencia si el lookup falla).
 *   - Lease con token de fencing (evita commits de workers stale).
 *   - Crash recovery: si hay efecto ambiguo y el provider no es idempotente,
 *     se marca 'review' y se rechaza el reintento automático.
 *   - Outbox at-least-once con deduplicación por ID.
 *   - Compensación como operación durable separada (requiere autorización y
 *     confirmación del efecto original).
 *
 * `executionPerformed` es `false`: el adapter no ejecuta efectos externos;
 * solo orquesta la durabilidad. El provider implementa el efecto real.
 */
import { digest } from './skills';
import { SkillInputError } from './skills';
import { createHash } from 'node:crypto';

// ── TAMV Operation ID (stable across workers) ───────────────────────────────

/**
 * operation_id = SHA3-512(tenant_id + workflow_id + step_id + canonical_payload + actor_did)
 * La clave es estable entre Worker A y Worker B. El intento es metadato, no parte de la clave.
 */
export function stableOperationId(
  tenantId: string,
  workflowId: string,
  stepId: string,
  payload: Readonly<Record<string, unknown>>,
  actorDid: string
): string {
  const body = JSON.stringify(
    { tenant_id: tenantId, workflow_id: workflowId, step_id: stepId, payload, actor_did: actorDid },
    Object.keys({
      tenant_id: tenantId,
      workflow_id: workflowId,
      step_id: stepId,
      payload,
      actor_did: actorDid,
    }).sort()
  );
  // Use canonical key ordering
  const canonical = JSON.stringify(
    { tenant_id: tenantId, workflow_id: workflowId, step_id: stepId, payload, actor_did: actorDid },
    (key, value) => {
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        const sorted: Record<string, unknown> = {};
        for (const k of Object.keys(value).sort())
          sorted[k] = (value as Record<string, unknown>)[k];
        return sorted;
      }
      return value;
    }
  );
  return createHash('sha3-512').update(canonical).digest('hex');
}

/**
 * Merkle root simple (hoja impar duplicada) sobre una lista de hashes hex.
 */
export function merkleRoot(hashes: readonly string[]): string | null {
  if (hashes.length === 0) return null;
  let level = [...hashes];
  while (level.length > 1) {
    if (level.length % 2 === 1) level.push(level[level.length - 1]);
    const next: string[] = [];
    for (let i = 0; i < level.length; i += 2) {
      next.push(
        createHash('sha256')
          .update(level[i] + level[i + 1])
          .digest('hex')
      );
    }
    level = next;
  }
  return level[0];
}

// ── Types ──────────────────────────────────────────────────────────────────

export type JobState = 'pending' | 'running' | 'completed' | 'review';

export interface Job {
  readonly key: string;
  readonly payload: Readonly<Record<string, unknown>>;
  readonly state: JobState;
  readonly token: string | null;
  readonly expires: number;
  readonly result: unknown;
}

export interface OutboxEntry {
  readonly id: string;
  readonly body: Readonly<Record<string, unknown>>;
  readonly delivered: boolean;
}

export interface ProviderResult {
  readonly found: boolean;
  readonly result: unknown;
}

export interface RecoveryProvider {
  lookup(key: string): ProviderResult;
  execute(key: string, payload: Readonly<Record<string, unknown>>): unknown;
  readonly idempotent: boolean;
}

export interface RecoveryConfig {
  readonly leaseMs: number;
  readonly now?: () => number;
  readonly idFactory?: () => string;
}

// ── In-memory durable store (reference; not multi-machine) ─────────────────

export class RecoveryStore {
  private readonly jobs = new Map<string, Job>();
  private readonly outbox = new Map<string, OutboxEntry>();
  private readonly operationDigests: string[] = [];

  enqueue(key: string, payload: Readonly<Record<string, unknown>>): void {
    if (this.jobs.has(key)) {
      const existing = this.jobs.get(key)!;
      if (JSON.stringify(existing.payload) !== JSON.stringify(payload)) {
        throw new Error('Idempotency key reused with different payload');
      }
      return;
    }
    this.jobs.set(key, { key, payload, state: 'pending', token: null, expires: 0, result: null });
  }

  getJob(key: string): Job | null {
    return this.jobs.get(key) ?? null;
  }

  updateJob(key: string, patch: Partial<Job>): boolean {
    const job = this.jobs.get(key);
    if (!job) return false;
    this.jobs.set(key, { ...job, ...patch });
    return true;
  }

  addOutbox(id: string, body: Readonly<Record<string, unknown>>): void {
    if (!this.outbox.has(id)) {
      this.outbox.set(id, { id, body, delivered: false });
      if (typeof body.resultHash === 'string') this.operationDigests.push(body.resultHash);
    }
  }

  getUndelivered(): readonly OutboxEntry[] {
    return [...this.outbox.values()].filter((e) => !e.delivered);
  }

  markDelivered(id: string): void {
    const entry = this.outbox.get(id);
    if (entry) this.outbox.set(id, { ...entry, delivered: true });
  }

  listJobs(): readonly Job[] {
    return [...this.jobs.values()];
  }

  size(): number {
    return this.jobs.size;
  }

  merkleRoot(): string | null {
    return merkleRoot(this.operationDigests);
  }
}

// ── Ed25519 Signer (TAMV Seal) ─────────────────────────────────────────────

import {
  generateKeyPairSync,
  sign as edSign,
  verify as edVerify,
  createPublicKey,
  createPrivateKey,
} from 'node:crypto';

export class Ed25519Signer {
  private readonly privateKey: ReturnType<typeof createPrivateKey>;
  readonly publicKeyHex: string;

  constructor(privateKeyBytes?: Buffer) {
    if (privateKeyBytes) {
      this.privateKey = createPrivateKey({
        key: privateKeyBytes,
        format: 'raw',
        type: 'pkcs8',
      } as any);
    } else {
      const { privateKey } = generateKeyPairSync('ed25519');
      this.privateKey = privateKey;
    }
    const pubKey = createPublicKey(this.privateKey);
    const spkiDer = pubKey.export({ type: 'spki', format: 'der' }) as Buffer;
    this.publicKeyHex = spkiDer.subarray(spkiDer.length - 32).toString('hex');
  }

  sign(data: string | Buffer): string {
    const sig = edSign(null, Buffer.from(data), this.privateKey);
    return sig.toString('hex');
  }

  static verify(publicHex: string, data: string | Buffer, signatureHex: string): boolean {
    try {
      // Construct SPKI DER from raw 32-byte public key
      const spkiDer = Buffer.concat([
        Buffer.from('302a300506032b6570032100', 'hex'),
        Buffer.from(publicHex, 'hex'),
      ]);
      const pubKey = createPublicKey({ key: spkiDer, format: 'der', type: 'spki' });
      return edVerify(null, Buffer.from(data), pubKey, Buffer.from(signatureHex, 'hex'));
    } catch {
      return false;
    }
  }

  publicHex(): string {
    return this.publicKeyHex;
  }
}

// ── Event Log (hash chain + Merkle) ────────────────────────────────────────

export interface TAMVEvent {
  readonly eventId: string;
  readonly kind: string;
  readonly tenantId: string;
  readonly workflowId: string;
  readonly stepId: string;
  readonly payload: Readonly<Record<string, unknown>>;
  readonly actorDid: string;
  readonly previousHash: string;
  readonly timestamp: string;
  readonly signature: string;
  readonly digest: string;
}

export class EventLog {
  private readonly events: TAMVEvent[] = [];
  private readonly signer: Ed25519Signer;

  constructor(signer?: Ed25519Signer) {
    this.signer = signer ?? new Ed25519Signer();
  }

  append(event: Omit<TAMVEvent, 'previousHash' | 'digest' | 'signature'>): TAMVEvent {
    // Check duplicate
    if (this.events.some((e) => e.eventId === event.eventId)) {
      throw new Error('duplicate event_id');
    }
    const previousHash =
      this.events.length > 0 ? this.events[this.events.length - 1].digest : '0'.repeat(64);
    const body = { ...event, previousHash };
    const digest = createHash('sha256')
      .update(JSON.stringify(body, Object.keys(body).sort()))
      .digest('hex');
    const signature = this.signer.sign(digest);
    const fullEvent: TAMVEvent = { ...body, signature, digest };
    this.events.push(fullEvent);
    return fullEvent;
  }

  verifyChain(): boolean {
    let previous = '0'.repeat(64);
    for (const event of this.events) {
      if (event.previousHash !== previous) return false;
      const body = {
        eventId: event.eventId,
        kind: event.kind,
        tenantId: event.tenantId,
        workflowId: event.workflowId,
        stepId: event.stepId,
        payload: event.payload,
        actorDid: event.actorDid,
        previousHash: event.previousHash,
        timestamp: event.timestamp,
        signature: event.signature,
      };
      const expected = createHash('sha256')
        .update(JSON.stringify(body, Object.keys(body).sort()))
        .digest('hex');
      // Actually verify digest without signature
      const bodyNoSig = {
        eventId: event.eventId,
        kind: event.kind,
        tenantId: event.tenantId,
        workflowId: event.workflowId,
        stepId: event.stepId,
        payload: event.payload,
        actorDid: event.actorDid,
        previousHash: event.previousHash,
        timestamp: event.timestamp,
      };
      const expectedDigest = createHash('sha256')
        .update(JSON.stringify(bodyNoSig, Object.keys(bodyNoSig).sort()))
        .digest('hex');
      if (event.digest !== expectedDigest) return false;
      if (!Ed25519Signer.verify(this.signer.publicHex(), event.digest, event.signature))
        return false;
      previous = event.digest;
    }
    return true;
  }

  merkleRoot(): string | null {
    const digests = this.events.map((e) => e.digest);
    if (digests.length === 0) return null;
    let level = [...digests];
    while (level.length > 1) {
      if (level.length % 2 === 1) level.push(level[level.length - 1]);
      const next: string[] = [];
      for (let i = 0; i < level.length; i += 2) {
        next.push(
          createHash('sha256')
            .update(level[i] + level[i + 1])
            .digest('hex')
        );
      }
      level = next;
    }
    return level[0];
  }

  list(): readonly TAMVEvent[] {
    return [...this.events];
  }

  size(): number {
    return this.events.length;
  }
}

// ── Recovery engine ────────────────────────────────────────────────────────

export class RecoveryEngine {
  readonly store: RecoveryStore;
  private readonly config: RecoveryConfig;
  private readonly now: () => number;
  private readonly idFactory: () => string;

  constructor(store: RecoveryStore, config: RecoveryConfig = { leaseMs: 60000 }) {
    this.store = store;
    this.config = config;
    this.now = config.now ?? (() => Date.now());
    this.idFactory = config.idFactory ?? (() => crypto.randomUUID());
  }

  run(key: string, provider: RecoveryProvider, crash = false): unknown {
    const token = this.idFactory();
    const now = this.now();
    const job = this.store.getJob(key);
    if (!job) throw new Error('KEY_NOT_FOUND: ' + key);

    // Already completed → return cached result.
    if (job.state === 'completed') {
      return job.result;
    }
    if (job.state === 'review') {
      throw new Error('Manual reconciliation required');
    }

    // Lease check: if another worker holds the lease, reject.
    if (job.expires > now) {
      throw new Error('Lease held');
    }

    const prior = job.state === 'running';
    // Acquire lease.
    this.store.updateJob(key, { state: 'running', token, expires: now + this.config.leaseMs });

    // Lookup before retry.
    let found: boolean;
    let result: unknown;
    try {
      const lookupResult = provider.lookup(key);
      found = lookupResult.found;
      result = lookupResult.result;
    } catch {
      // Lookup failure must raise — never imply absence.
      this.store.updateJob(key, { state: 'review', expires: 0, token: null });
      throw new Error('Lookup failed; automatic retry refused');
    }

    if (!found) {
      if (prior && !provider.idempotent) {
        this.store.updateJob(key, { state: 'review', expires: 0, token: null });
        throw new Error('Uncertain external effect; automatic retry refused');
      }
      result = provider.execute(key, job.payload);
    }

    if (crash) {
      throw new Error('Injected crash after external effect');
    }

    // Commit completion atomically.
    const currentJob = this.store.getJob(key);
    if (!currentJob || currentJob.token !== token) {
      throw new Error('Stale worker fenced');
    }
    const encoded = JSON.stringify(result);
    const eventBody = { operation: key, status: 'completed', resultHash: digest(encoded) };
    this.store.updateJob(key, { state: 'completed', result, expires: 0, token: null });
    this.store.addOutbox(key + ':completed', eventBody);

    return result;
  }

  relay(sink: (id: string, body: Readonly<Record<string, unknown>>) => void): number {
    const undelivered = this.store.getUndelivered();
    let count = 0;
    for (const entry of undelivered) {
      sink(entry.id, entry.body);
      this.store.markDelivered(entry.id);
      count += 1;
    }
    return count;
  }

  compensate(key: string, payload: Readonly<Record<string, unknown>>, approved: boolean): string {
    const job = this.store.getJob(key);
    if (!approved) throw new Error('Explicit authorization required');
    if (!job || job.state !== 'completed') throw new Error('Original effect not confirmed');
    const compKey = key + ':compensate';
    this.store.enqueue(compKey, payload);
    return compKey;
  }

  describe(): Readonly<Record<string, unknown>> {
    return {
      jobs: this.store.size(),
      leaseMs: this.config.leaseMs,
      executionPerformed: false,
      note: 'Adapter de durabilidad; el provider implementa el efecto real.',
    };
  }
}

// ── MetaCognitive Recovery Adapter ─────────────────────────────────────────

export class MetaCognitiveRecoveryAdapter {
  private readonly recovery: RecoveryEngine;
  private readonly provider: RecoveryProvider;

  constructor(recovery: RecoveryEngine, provider: RecoveryProvider) {
    this.recovery = recovery;
    this.provider = provider;
  }

  execute(operationId: string, sanitizedPayload: Readonly<Record<string, unknown>>): unknown {
    this.recovery.store.enqueue(operationId, sanitizedPayload);
    return this.recovery.run(operationId, this.provider);
  }

  describe(): Readonly<Record<string, unknown>> {
    return { ...this.recovery.describe(), executionPerformed: false };
  }
}

export function describeDurableRecovery(): Readonly<Record<string, unknown>> {
  return {
    patterns: [
      'idempotency-key',
      'lease-fencing',
      'lookup-before-retry',
      'crash-recovery',
      'at-least-once-relay',
      'compensation',
    ],
    storage: 'in-memory (reference; use Postgres for production)',
    multiMachine: false,
    executionPerformed: false,
    note: 'Referencia local; no es un despliegue multi-máquina.',
  };
}
