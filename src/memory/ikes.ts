import { createHash } from 'node:crypto';

export type EpistemicState =
  | 'E0_UNVERIFIED'
  | 'E1_SOURCE_FOUND'
  | 'E2_CORROBORATED'
  | 'E3_ACADEMICALLY_SUPPORTED'
  | 'E4_REPRODUCIBLE'
  | 'E5_VALIDATED'
  | 'E6_ESTABLISHED'
  | 'ED_DISPUTED'
  | 'EX_REJECTED'
  | 'DP_DEPRECATED';

export type TemporalState = 'current' | 'historical' | 'superseded';

export interface KnowledgeClaim {
  claimId: string;
  subject: string;
  predicate: string;
  object: string;
  sourceIds: readonly string[];
  evidenceIds: readonly string[];
  epistemicState: EpistemicState;
  temporalState: TemporalState;
  validFrom?: string;
  validUntil?: string;
  license?: string;
  provenance: Readonly<Record<string, string>>;
  contentHash: string;
  version: number;
}

export interface KnowledgeSource {
  sourceId: string;
  uri: string;
  title: string;
  publisher?: string;
  publishedAt?: string;
  retrievedAt: string;
  contentHash: string;
  license?: string;
}

export interface KnowledgeProposal {
  claim: Omit<KnowledgeClaim, 'claimId' | 'contentHash' | 'version' | 'epistemicState'>;
  proposedBy: string;
  evidenceIds: readonly string[];
}

export function hashSourceContent(content: string): string {
  return createHash('sha256').update(content, 'utf8').digest('hex');
}

function hash(value: unknown): string {
  return createHash('sha256')
    .update(JSON.stringify(value) ?? '', 'utf8')
    .digest('hex');
}

const CLAIM_HASH_FIELDS = [
  'subject',
  'predicate',
  'object',
  'sourceIds',
  'evidenceIds',
  'epistemicState',
  'temporalState',
  'validFrom',
  'validUntil',
  'license',
  'provenance',
] as const;

function claimContentHash(claim: Pick<KnowledgeClaim, (typeof CLAIM_HASH_FIELDS)[number]>): string {
  return hash({
    subject: claim.subject,
    predicate: claim.predicate,
    object: claim.object,
    sourceIds: [...claim.sourceIds],
    evidenceIds: [...claim.evidenceIds],
    epistemicState: claim.epistemicState,
    temporalState: claim.temporalState,
    validFrom: claim.validFrom,
    validUntil: claim.validUntil,
    license: claim.license,
    provenance: { ...claim.provenance },
  });
}

/** Recomputes the canonical claim payload hash; it does not authenticate the source. */
export function verifyKnowledgeClaimIntegrity(claim: KnowledgeClaim): boolean {
  return /^[a-f0-9]{64}$/i.test(claim.contentHash) && claim.contentHash === claimContentHash(claim);
}

function freezeClaim(claim: KnowledgeClaim): KnowledgeClaim {
  return Object.freeze({
    ...claim,
    sourceIds: Object.freeze([...claim.sourceIds]),
    evidenceIds: Object.freeze([...claim.evidenceIds]),
    provenance: Object.freeze({ ...claim.provenance }),
  });
}

export interface IKESEngineSnapshot {
  sources: KnowledgeSource[];
  claims: KnowledgeClaim[];
}

export interface IKESEnginePersistencePort {
  load(): Promise<IKESEngineSnapshot>;
  saveSource(source: KnowledgeSource): Promise<void>;
  saveClaim(claim: KnowledgeClaim): Promise<void>;
  health(): Promise<{ healthy: boolean; reason: string }>;
}

/** Default bound for a readiness probe waiting on startup hydration. */
const DEFAULT_HYDRATION_PROBE_TIMEOUT_MS = 5_000;
/** Minimum wait before a failed hydration is retried by the readiness probe. */
const DEFAULT_HYDRATION_RETRY_COOLDOWN_MS = 30_000;

/**
 * Resolves when `promise` settles or the timeout elapses, whichever comes
 * first. The timer is always cleared so a slow probe never keeps the process
 * alive after the response is written.
 */
function waitForSettlement(promise: Promise<unknown>, timeoutMs: number): Promise<void> {
  return new Promise<void>((resolve) => {
    const timer = setTimeout(resolve, timeoutMs);
    const done = (): void => {
      clearTimeout(timer);
      resolve();
    };
    promise.then(done, done);
  });
}

export class IKESEngine {
  private readonly sources = new Map<string, KnowledgeSource>();
  private readonly claims = new Map<string, KnowledgeClaim>();
  private persistence?: IKESEnginePersistencePort;
  private persistenceInitialized = false;
  private pendingWrites: Promise<void> = Promise.resolve();
  private persistenceFailure: string | null = null;
  /** In-flight hydration, shared so readiness can wait instead of flapping. */
  private hydrationPromise: Promise<void> | null = null;
  private hydrationFailure: string | null = null;
  private lastHydrationAttemptAt = 0;

  constructor(persistence?: IKESEnginePersistencePort) {
    this.persistence = persistence;
  }

  /** Hydrates only integrity-valid records. It never promotes epistemic state. */
  async initPersistence(): Promise<void> {
    if (!this.persistence || this.persistenceInitialized) return;
    if (this.hydrationPromise) return this.hydrationPromise;
    const persistence = this.persistence;
    this.lastHydrationAttemptAt = Date.now();
    this.hydrationPromise = (async () => {
      try {
        const snapshot = await persistence.load();
        const nextSources = new Map<string, KnowledgeSource>();
        for (const source of snapshot.sources) {
          if (
            !source.sourceId.trim() ||
            !source.title.trim() ||
            !/^[a-f0-9]{64}$/i.test(source.contentHash) ||
            !Number.isFinite(Date.parse(source.retrievedAt))
          ) {
            throw new Error('IKES_PERSISTED_SOURCE_INVALID');
          }
          const uri = new URL(source.uri);
          if (uri.protocol !== 'https:' && uri.protocol !== 'http:')
            throw new Error('IKES_PERSISTED_SOURCE_URI_INVALID');
          nextSources.set(source.sourceId, Object.freeze({ ...source, uri: uri.toString() }));
        }
        const nextClaims = new Map<string, KnowledgeClaim>();
        for (const claim of snapshot.claims) {
          if (
            !verifyKnowledgeClaimIntegrity(claim) ||
            claim.sourceIds.some((id) => !nextSources.has(id)) ||
            claim.evidenceIds.some((id) => !nextSources.has(id)) ||
            !Number.isSafeInteger(claim.version) ||
            claim.version < 1
          ) {
            throw new Error('IKES_PERSISTED_CLAIM_INTEGRITY_FAILURE');
          }
          nextClaims.set(claim.claimId, freezeClaim(claim));
        }
        this.sources.clear();
        this.claims.clear();
        for (const [id, source] of nextSources) this.sources.set(id, source);
        for (const [id, claim] of nextClaims) this.claims.set(id, claim);
        this.persistenceFailure = null;
        this.hydrationFailure = null;
        this.persistenceInitialized = true;
      } catch (error) {
        this.hydrationFailure =
          error instanceof Error ? error.message : 'IKES_PERSISTENCE_HYDRATION_FAILED';
        throw error;
      } finally {
        this.hydrationPromise = null;
      }
    })();
    return this.hydrationPromise;
  }

  private assertInitialized(): void {
    if (this.persistence && !this.persistenceInitialized) {
      throw new Error('IKES_PERSISTENCE_NOT_INITIALIZED');
    }
  }

  private enqueuePersistence(write: () => Promise<void>): void {
    if (!this.persistence) return;
    this.pendingWrites = this.pendingWrites.then(write).catch(() => {
      this.persistenceFailure = 'IKES_PERSISTENCE_WRITE_FAILED';
    });
  }

  async flushPersistence(): Promise<void> {
    await this.pendingWrites;
    if (this.persistenceFailure) throw new Error(this.persistenceFailure);
  }

  /**
   * Reports durable-memory readiness. A cold start can be probed while hydration
   * is still running, so the probe briefly waits for the in-flight promise
   * instead of publishing a transient `pending` that makes readiness flap.
   * `pending` means "still starting", never "silently healthy".
   */
  async persistenceProbe(
    options: { hydrationTimeoutMs?: number; retryCooldownMs?: number } = {}
  ): Promise<{
    healthy: boolean;
    backend: string;
    reason: string;
    pending: boolean;
  }> {
    if (!this.persistence) {
      return {
        healthy: false,
        backend: 'VOLATILE_MEMORY',
        reason: 'IKES has no durable persistence adapter configured.',
        pending: false,
      };
    }
    const hydrationTimeoutMs = Math.max(
      0,
      options.hydrationTimeoutMs ?? DEFAULT_HYDRATION_PROBE_TIMEOUT_MS
    );
    if (!this.persistenceInitialized && this.hydrationPromise) {
      await waitForSettlement(this.hydrationPromise, hydrationTimeoutMs);
    }
    // Self-healing: a failed hydration leaves memory process-local until the
    // next instance. The probe retries after a cooldown so a transient cold-start
    // abort cannot degrade the dependency forever. The retry is bounded by the
    // probe timeout and never throws out of the probe.
    if (!this.persistenceInitialized && this.hydrationFailure) {
      const cooldownMs = Math.max(
        0,
        options.retryCooldownMs ?? DEFAULT_HYDRATION_RETRY_COOLDOWN_MS
      );
      if (Date.now() - this.lastHydrationAttemptAt >= cooldownMs) {
        const retry = this.initPersistence().catch(() => undefined);
        await waitForSettlement(retry, hydrationTimeoutMs);
      }
    }
    if (!this.persistenceInitialized) {
      if (this.hydrationPromise) {
        return {
          healthy: false,
          backend: 'SUPABASE',
          reason: 'IKES startup hydration is still in progress.',
          pending: true,
        };
      }
      if (this.hydrationFailure) {
        const code = /^IKES_[A-Z0-9_]+$/u.test(this.hydrationFailure)
          ? this.hydrationFailure
          : 'IKES_PERSISTENCE_HYDRATION_FAILED';
        return {
          healthy: false,
          backend: 'SUPABASE',
          reason: `IKES startup hydration failed (${code}); memory stays process-local.`,
          pending: false,
        };
      }
      try {
        const health = await this.persistence.health();
        return {
          healthy: false,
          backend: 'SUPABASE',
          reason: health.healthy
            ? 'IKES persistence is reachable but startup hydration has not completed.'
            : health.reason,
          pending: true,
        };
      } catch {
        return {
          healthy: false,
          backend: 'SUPABASE',
          reason: 'IKES persistence health probe failed; inspect restricted server logs.',
          pending: true,
        };
      }
    }
    try {
      await this.flushPersistence();
      const health = await this.persistence.health();
      return {
        healthy: health.healthy && !this.persistenceFailure,
        backend: 'SUPABASE',
        reason: this.persistenceFailure ?? health.reason,
        pending: false,
      };
    } catch {
      return {
        healthy: false,
        backend: 'SUPABASE',
        reason:
          this.persistenceFailure ??
          'IKES persistence probe failed; inspect restricted server logs.',
        pending: false,
      };
    }
  }

  registerSource(source: KnowledgeSource): void {
    this.assertInitialized();
    if (!source.sourceId.trim() || !source.title.trim())
      throw new Error('IKES_SOURCE_METADATA_REQUIRED');
    if (!/^[a-f0-9]{64}$/i.test(source.contentHash))
      throw new Error('IKES_SOURCE_HASH_MUST_BE_SHA256');
    if (!Number.isFinite(Date.parse(source.retrievedAt)))
      throw new Error('IKES_SOURCE_RETRIEVED_AT_INVALID');
    let parsedUri: URL;
    try {
      parsedUri = new URL(source.uri);
    } catch {
      throw new Error('IKES_SOURCE_URI_INVALID');
    }
    if (parsedUri.protocol !== 'https:' && parsedUri.protocol !== 'http:')
      throw new Error('IKES_SOURCE_URI_SCHEME_NOT_ALLOWED');
    const existing = this.sources.get(source.sourceId);
    if (existing && existing.contentHash !== source.contentHash)
      throw new Error('IKES_SOURCE_ID_HASH_CONFLICT');
    if (existing) return;
    const normalized = Object.freeze({ ...source, uri: parsedUri.toString() });
    this.sources.set(source.sourceId, normalized);
    this.enqueuePersistence(() => this.persistence!.saveSource(normalized));
  }

  /** Builds a candidate without mutating canonical IKES state. */
  prepareProposal(proposal: KnowledgeProposal): KnowledgeClaim {
    this.assertInitialized();
    if (!proposal || !Array.isArray(proposal.evidenceIds) || proposal.evidenceIds.length === 0) {
      throw new Error('IKES_EVIDENCE_REQUIRED');
    }
    if (!Array.isArray(proposal.claim.sourceIds) || proposal.claim.sourceIds.length === 0)
      throw new Error('IKES_SOURCE_IDS_REQUIRED');
    const missingEvidence = proposal.evidenceIds.filter((id) => !this.sources.has(id));
    if (missingEvidence.length > 0)
      throw new Error('IKES: evidence not registered: ' + missingEvidence.join(','));
    const missingSources = proposal.claim.sourceIds.filter((id) => !this.sources.has(id));
    if (missingSources.length > 0)
      throw new Error('IKES: source not registered: ' + missingSources.join(','));
    const base = {
      ...proposal.claim,
      sourceIds: [...new Set(proposal.claim.sourceIds)],
      evidenceIds: [...new Set(proposal.evidenceIds)],
      provenance: { ...proposal.claim.provenance },
      epistemicState: 'E1_SOURCE_FOUND' as const,
    };
    // Claim identity is the claim itself, not the evidence bundle. New sources
    // revise one claim instead of creating a fresh E1 claim that bypasses review.
    const identity = {
      subject: base.subject,
      predicate: base.predicate,
      object: base.object,
      temporalState: base.temporalState,
      validFrom: base.validFrom,
      validUntil: base.validUntil,
      license: base.license,
    };
    const claimId = 'clm_' + hash(identity).slice(0, 24);
    const existing = this.claims.get(claimId);
    const merged = {
      ...base,
      sourceIds: [...new Set([...(existing?.sourceIds ?? []), ...base.sourceIds])],
      evidenceIds: [...new Set([...(existing?.evidenceIds ?? []), ...base.evidenceIds])],
      epistemicState: existing?.epistemicState ?? base.epistemicState,
      temporalState: existing?.temporalState ?? base.temporalState,
      provenance: { ...(existing?.provenance ?? {}), ...base.provenance },
    };
    const record: KnowledgeClaim = {
      ...merged,
      claimId,
      contentHash: claimContentHash(merged),
      version: existing ? existing.version + 1 : 1,
    };
    return freezeClaim(record);
  }

  /** Commits a candidate to the in-memory canonical claim map. Call only after the caller's admission gate. */
  propose(proposal: KnowledgeProposal): KnowledgeClaim {
    const candidate = this.prepareProposal(proposal);
    this.claims.set(candidate.claimId, candidate);
    this.enqueuePersistence(() => this.persistence!.saveClaim(candidate));
    return candidate;
  }

  corroborate(claimId: string, evidenceIds: readonly string[]): KnowledgeClaim {
    this.assertInitialized();
    const claim = this.requireClaim(claimId);
    if (!Array.isArray(evidenceIds) || evidenceIds.length === 0) {
      throw new Error('IKES_CORROBORATION_EVIDENCE_REQUIRED');
    }
    if (['ED_DISPUTED', 'EX_REJECTED', 'DP_DEPRECATED'].includes(claim.epistemicState)) {
      throw new Error('IKES_CLAIM_STATE_BLOCKS_CORROBORATION');
    }
    if (evidenceIds.some((id) => !this.sources.has(id))) {
      throw new Error('IKES: no se puede corroborar con evidencia inexistente.');
    }
    const newEvidenceIds = [...new Set(evidenceIds)].filter(
      (id) => !claim.evidenceIds.includes(id)
    );
    if (newEvidenceIds.length === 0) throw new Error('IKES_CORROBORATION_REQUIRES_NEW_EVIDENCE');
    const next: KnowledgeClaim = {
      ...claim,
      sourceIds: [...new Set([...claim.sourceIds, ...newEvidenceIds])],
      evidenceIds: [...new Set([...claim.evidenceIds, ...newEvidenceIds])],
      epistemicState:
        epistemicRank(claim.epistemicState) >= epistemicRank('E2_CORROBORATED')
          ? claim.epistemicState
          : 'E2_CORROBORATED',
      version: claim.version + 1,
    };
    next.contentHash = claimContentHash(next);
    const frozen = freezeClaim(next);
    this.claims.set(claimId, frozen);
    this.enqueuePersistence(() => this.persistence!.saveClaim(frozen));
    return frozen;
  }

  deprecate(claimId: string): KnowledgeClaim {
    this.assertInitialized();
    const claim = this.requireClaim(claimId);
    const next: KnowledgeClaim = {
      ...claim,
      temporalState: 'superseded',
      epistemicState: 'DP_DEPRECATED',
      version: claim.version + 1,
    };
    next.contentHash = claimContentHash(next);
    const frozen = freezeClaim(next);
    this.claims.set(claimId, frozen);
    this.enqueuePersistence(() => this.persistence!.saveClaim(frozen));
    return frozen;
  }

  retrieve(
    query: string,
    opts: { temporal?: TemporalState; minEvidence?: EpistemicState } = {}
  ): KnowledgeClaim[] {
    this.assertInitialized();
    const q = query.toLowerCase();
    return [...this.claims.values()]
      .filter((c) =>
        opts.temporal ? c.temporalState === opts.temporal : c.temporalState === 'current'
      )
      .filter((c) =>
        opts.minEvidence
          ? epistemicRank(c.epistemicState) >= epistemicRank(opts.minEvidence)
          : !['ED_DISPUTED', 'EX_REJECTED', 'DP_DEPRECATED'].includes(c.epistemicState)
      )
      .filter((c) => `${c.subject} ${c.predicate} ${c.object}`.toLowerCase().includes(q))
      .sort((a, b) => epistemicRank(b.epistemicState) - epistemicRank(a.epistemicState));
  }

  listClaims(): readonly KnowledgeClaim[] {
    this.assertInitialized();
    return [...this.claims.values()];
  }

  private requireClaim(id: string): KnowledgeClaim {
    const claim = this.claims.get(id);
    if (!claim) throw new Error(`IKES: claim inexistente: ${id}`);
    return claim;
  }
}

function epistemicRank(state: EpistemicState): number {
  const ranks: Record<EpistemicState, number> = {
    E0_UNVERIFIED: 0,
    E1_SOURCE_FOUND: 1,
    E2_CORROBORATED: 2,
    E3_ACADEMICALLY_SUPPORTED: 3,
    E4_REPRODUCIBLE: 4,
    E5_VALIDATED: 5,
    E6_ESTABLISHED: 6,
    ED_DISPUTED: -1,
    EX_REJECTED: -2,
    DP_DEPRECATED: -3,
  };
  return ranks[state];
}
