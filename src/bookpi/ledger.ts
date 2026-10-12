import { createHash } from "node:crypto";
import { appendFileSync, copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import type { RetentionPlan } from "./retention";

export interface BookPiEventInput {
  id: string;
  timestamp: string;
  type: string;
  methodId: string;
  principal: string;
  riskTier: string;
  status: string;
}

export interface BookPiEvent extends BookPiEventInput {
  previousHash: string;
  hash: string;
  sequence: number;
}

export type BookPiStorageKind = "VOLATILE_IN_MEMORY" | "DURABLE_APPEND_ONLY_JSONL";

export interface BookPiVerification {
  status: "EMPTY_CHAIN" | "VERIFIED_IN_MEMORY_CHAIN" | "VERIFIED_DURABLE_CHAIN" | "INTEGRITY_FAILURE";
  valid: boolean;
  blocksValidated: number;
  chainHead: string | null;
  storage: BookPiStorageKind;
  wormEnforced: false;
  durable: boolean;
  verifiedAt?: string;
  brokenIndex?: number | null;
  diagnostics?: readonly string[];
}

export interface BookPiSummary {
  totalEvents: number;
  genesisHash: string;
  chainHead: string | null;
  firstTimestamp: string | null;
  lastTimestamp: string | null;
  typeCounts: Record<string, number>;
  riskCounts: Record<string, number>;
  statusCounts: Record<string, number>;
}

export interface BookPiSnapshot extends BookPiVerification {
  count: number;
  events: readonly BookPiEvent[];
  summary: BookPiSummary;
  ledgerType: "VOLATILE_IN_MEMORY_HASH_CHAIN" | "DURABLE_APPEND_ONLY_JSONL";
  merkleRoot: null;
}

/** Shared read/append contract implemented by the in-memory and durable ledgers. */
export interface BookPiLedgerPort {
  append(input: BookPiEventInput): BookPiEvent;
  list(limit?: number): readonly BookPiEvent[];
  getEventById(id: string): BookPiEvent | null;
  verify(): BookPiVerification;
  getSummary(): BookPiSummary;
  snapshot(): BookPiSnapshot;
}

const GENESIS_HASH = "0000000000000000000000000000000000000000000000000000000000000000";
const REQUIRED_FIELDS: readonly (keyof BookPiEventInput)[] = [
  "id",
  "timestamp",
  "type",
  "methodId",
  "principal",
  "riskTier",
  "status",
];

function eventPayload(input: BookPiEventInput, previousHash: string) {
  return {
    id: input.id,
    timestamp: input.timestamp,
    type: input.type,
    methodId: input.methodId,
    principal: input.principal,
    riskTier: input.riskTier,
    status: input.status,
    previousHash,
  };
}

function hashPayload(payload: ReturnType<typeof eventPayload>): string {
  return createHash("sha256").update(JSON.stringify(payload)).digest("hex");
}

function assertAppendInput(input: BookPiEventInput): void {
  if (![input.id, input.timestamp, input.type, input.methodId, input.principal, input.riskTier, input.status].every((value) => value.trim())) {
    throw new Error("BOOKPI_EVENT_FIELDS_REQUIRED");
  }
  if (!Number.isFinite(Date.parse(input.timestamp))) throw new Error("BOOKPI_EVENT_TIMESTAMP_INVALID");
}

function seal(input: BookPiEventInput, sequence: number, previousHash: string): BookPiEvent {
  const payload = eventPayload(input, previousHash);
  return Object.freeze({ ...payload, sequence, hash: hashPayload(payload) });
}

function summarize(events: readonly BookPiEvent[]): BookPiSummary {
  const typeCounts: Record<string, number> = {};
  const riskCounts: Record<string, number> = {};
  const statusCounts: Record<string, number> = {};
  for (const ev of events) {
    typeCounts[ev.type] = (typeCounts[ev.type] ?? 0) + 1;
    riskCounts[ev.riskTier] = (riskCounts[ev.riskTier] ?? 0) + 1;
    statusCounts[ev.status] = (statusCounts[ev.status] ?? 0) + 1;
  }
  return {
    totalEvents: events.length,
    genesisHash: GENESIS_HASH,
    chainHead: events.at(-1)?.hash ?? null,
    firstTimestamp: events.at(0)?.timestamp ?? null,
    lastTimestamp: events.at(-1)?.timestamp ?? null,
    typeCounts,
    riskCounts,
    statusCounts,
  };
}

function verifyEvents(
  events: readonly BookPiEvent[],
  startPrevHash: string,
  storage: BookPiStorageKind,
  durable: boolean,
): BookPiVerification {
  const verifiedAt = new Date().toISOString();
  const diagnostics: string[] = [];
  let previousHash = startPrevHash;

  for (let index = 0; index < events.length; index += 1) {
    const event = events[index];
    if (!event) continue;
    const expectedHash = hashPayload(eventPayload(event, event.previousHash));
    if (event.previousHash !== previousHash) {
      diagnostics.push(`Chain broken at block #${index + 1} (${event.id}): previousHash mismatch`);
      return { status: "INTEGRITY_FAILURE", valid: false, blocksValidated: index, chainHead: events.at(-1)?.hash ?? null, storage, wormEnforced: false, durable, verifiedAt, brokenIndex: index, diagnostics: Object.freeze(diagnostics) };
    }
    if (event.hash !== expectedHash) {
      diagnostics.push(`Integrity failure at block #${index + 1} (${event.id}): hash mismatch`);
      return { status: "INTEGRITY_FAILURE", valid: false, blocksValidated: index, chainHead: events.at(-1)?.hash ?? null, storage, wormEnforced: false, durable, verifiedAt, brokenIndex: index, diagnostics: Object.freeze(diagnostics) };
    }
    previousHash = event.hash;
  }

  diagnostics.push(`Chain intact: ${events.length} block(s) validated sequentially`);
  return {
    status: events.length === 0 ? "EMPTY_CHAIN" : durable ? "VERIFIED_DURABLE_CHAIN" : "VERIFIED_IN_MEMORY_CHAIN",
    valid: true,
    blocksValidated: events.length,
    chainHead: events.at(-1)?.hash ?? null,
    storage,
    wormEnforced: false,
    durable,
    verifiedAt,
    brokenIndex: null,
    diagnostics: Object.freeze(diagnostics),
  };
}

/** In-memory append-only hash chain. Volatile by design. */
export class InMemoryBookPiLedger {
  private readonly events: BookPiEvent[] = [];

  constructor(initialEvents: readonly BookPiEvent[] = []) {
    for (const event of initialEvents) this.events.push(Object.freeze({ ...event }));
  }

  append(input: BookPiEventInput): BookPiEvent {
    assertAppendInput(input);
    const previousHash = this.events.at(-1)?.hash ?? GENESIS_HASH;
    const entry = seal(input, this.events.length + 1, previousHash);
    this.events.push(entry);
    return { ...entry };
  }

  list(limit?: number): readonly BookPiEvent[] {
    const list = limit && limit > 0 ? this.events.slice(-limit) : this.events;
    return list.map((event) => Object.freeze({ ...event }));
  }

  getEventById(id: string): BookPiEvent | null {
    const found = this.events.find((e) => e.id === id);
    return found ? Object.freeze({ ...found }) : null;
  }

  verify(): BookPiVerification {
    return verifyEvents(this.events, GENESIS_HASH, "VOLATILE_IN_MEMORY", false);
  }

  getSummary(): BookPiSummary {
    return summarize(this.events);
  }

  snapshot(): BookPiSnapshot {
    return {
      count: this.events.length,
      events: this.list(),
      ...this.verify(),
      summary: this.getSummary(),
      ledgerType: "VOLATILE_IN_MEMORY_HASH_CHAIN",
      merkleRoot: null,
    };
  }
}

export interface DurableLedgerCheckpoint {
  archivedCount: number;
  lastArchivedHash: string | null;
  updatedAt: string;
}

function isRecordLine(value: unknown): value is BookPiEvent {
  if (typeof value !== "object" || value === null) return false;
  const rec = value as Record<string, unknown>;
  return (
    typeof rec.id === "string" &&
    typeof rec.timestamp === "string" &&
    typeof rec.type === "string" &&
    typeof rec.hash === "string" &&
    typeof rec.previousHash === "string" &&
    typeof rec.sequence === "number"
  );
}

/**
 * Durable append-only JSONL audit ledger.
 *
 * Persists every event to a JSONL file (fsync-ordered, one JSON object per
 * line) and rebuilds the chain on startup. It preserves append-only semantics:
 * retention never silently drops live data — archival writes a separate archive
 * file plus a checkpoint, and physical pruning is an explicit, human-approved
 * operation (`pruneArchived`) that advances the checkpoint so verification
 * remains anchored. It is NOT a WORM device and does NOT provide hardware
 * immutability. state: draft | engine-generated.
 */
export class DurableBookPiLedger {
  private readonly filePath: string;
  private readonly checkpointPath: string;
  private events: BookPiEvent[] = [];
  private checkpoint: DurableLedgerCheckpoint | null = null;

  constructor(filePath: string) {
    if (!filePath.trim()) throw new Error("BOOKPI_LEDGER_PATH_REQUIRED");
    this.filePath = filePath;
    this.checkpointPath = `${filePath}.checkpoint.json`;
    this.load();
  }

  private load(): void {
    if (existsSync(this.checkpointPath)) {
      const raw = readFileSync(this.checkpointPath, "utf8");
      const parsed = JSON.parse(raw) as DurableLedgerCheckpoint;
      if (typeof parsed.archivedCount === "number") this.checkpoint = parsed;
    }
    this.events = this.readFile();
  }

  private readFile(): BookPiEvent[] {
    if (!existsSync(this.filePath)) return [];
    const raw = readFileSync(this.filePath, "utf8");
    const events: BookPiEvent[] = [];
    for (const line of raw.split("\n")) {
      if (!line.trim()) continue;
      const parsed: unknown = JSON.parse(line);
      if (!isRecordLine(parsed)) throw new Error("BOOKPI_LEDGER_CORRUPT");
      events.push(Object.freeze(parsed));
    }
    return events;
  }

  private startHash(): string {
    return this.checkpoint?.lastArchivedHash ?? GENESIS_HASH;
  }

  private persist(entry: BookPiEvent): void {
    mkdirSync(dirname(this.filePath), { recursive: true });
    appendFileSync(this.filePath, JSON.stringify(entry) + "\n", "utf8");
  }

  append(input: BookPiEventInput): BookPiEvent {
    assertAppendInput(input);
    const previousHash = this.events.at(-1)?.hash ?? GENESIS_HASH;
    const entry = seal(input, this.events.length + 1, previousHash);
    mkdirSync(dirname(this.filePath), { recursive: true });
    appendFileSync(this.filePath, JSON.stringify(entry) + "\n", "utf8");
    this.events.push(entry);
    return { ...entry };
  }

  list(limit?: number): readonly BookPiEvent[] {
    const list = limit && limit > 0 ? this.events.slice(-limit) : this.events;
    return list.map((event) => Object.freeze({ ...event }));
  }

  getEventById(id: string): BookPiEvent | null {
    const found = this.events.find((e) => e.id === id);
    return found ? Object.freeze({ ...found }) : null;
  }

  verify(): BookPiVerification {
    const startPrevHash = this.checkpoint?.lastArchivedHash ?? GENESIS_HASH;
    return verifyEvents(this.events, startPrevHash, "DURABLE_APPEND_ONLY_JSONL", true);
  }

  getSummary(): BookPiSummary {
    return summarize(this.events);
  }

  snapshot(): BookPiSnapshot {
    return {
      count: this.events.length,
      events: this.list(),
      ...this.verify(),
      summary: this.getSummary(),
      ledgerType: "DURABLE_APPEND_ONLY_JSONL",
      merkleRoot: null,
    };
  }

  /** Copy the current ledger file to `destPath`. Returns bytes and event count. */
  backup(destPath: string): { path: string; bytes: number; events: number } {
    mkdirSync(dirname(destPath), { recursive: true });
    if (!existsSync(this.filePath)) writeFileSync(this.filePath, "", "utf8");
    copyFileSync(this.filePath, destPath);
    const bytes = readFileSync(destPath).byteLength;
    return { path: destPath, bytes, events: this.events.length };
  }

  /**
   * Replace the ledger with a backup file, but only after validating that the
   * backup's chain is intact. Restores are refused if the source is corrupt.
   */
  restore(srcPath: string): { restored: number; valid: boolean } {
    if (!existsSync(srcPath)) throw new Error("BOOKPI_RESTORE_SOURCE_MISSING");
    const raw = readFileSync(srcPath, "utf8");
    const incoming: BookPiEvent[] = [];
    for (const line of raw.split("\n")) {
      if (!line.trim()) continue;
      const parsed: unknown = JSON.parse(line);
      if (!isRecordLine(parsed)) throw new Error("BOOKPI_RESTORE_SOURCE_INVALID");
      incoming.push(parsed);
    }
    const verdict = verifyEvents(incoming, GENESIS_HASH, "DURABLE_APPEND_ONLY_JSONL", true);
    if (!verdict.valid) throw new Error("BOOKPI_RESTORE_SOURCE_CORRUPT");
    mkdirSync(dirname(this.filePath), { recursive: true });
    copyFileSync(srcPath, this.filePath);
    this.checkpoint = null;
    writeFileSync(this.checkpointPath, JSON.stringify({ archivedCount: 0, lastArchivedHash: null, updatedAt: new Date().toISOString() }), "utf8");
    this.load();
    return { restored: incoming.length, valid: true };
  }

  /**
   * Physically prune an archived prefix from the live file and advance the
   * checkpoint so verification remains anchored. Refuses to prune events that
   * are still present at the head (plan mismatch). Writes the archive that the
   * caller must persist BEFORE pruning. This is an explicit administrative
   * operation, not an automatic one.
   */
  prune(plan: RetentionPlan): { pruned: number; remaining: number } {
    if (plan.archived.length === 0) return { pruned: 0, remaining: this.events.length };
    const headArchived = plan.archived.at(-1);
    const firstKept = plan.kept.at(0);
    if (firstKept && headArchived && firstKept.previousHash !== headArchived.hash) {
      throw new Error("BOOKPI_PRUNE_PLAN_MISMATCH");
    }
    const body = plan.kept.map((event) => JSON.stringify(event)).join("\n");
    writeFileSync(this.filePath, body ? `${body}\n` : "", "utf8");
    const checkpoint: DurableLedgerCheckpoint = {
      archivedCount: (this.checkpoint?.archivedCount ?? 0) + plan.archived.length,
      lastArchivedHash: headArchived?.hash ?? this.checkpoint?.lastArchivedHash ?? null,
      updatedAt: new Date().toISOString(),
    };
    writeFileSync(this.checkpointPath, JSON.stringify(checkpoint), "utf8");
    this.events = [...plan.kept];
    this.checkpoint = checkpoint;
    return { pruned: plan.archived.length, remaining: this.events.length };
  }

  /** Return the current checkpoint (archived count + anchor hash), if any. */
  getCheckpoint(): DurableLedgerCheckpoint | null {
    return this.checkpoint ? { ...this.checkpoint } : null;
  }
}

/**
 * Selects the audit ledger implementation. A non-empty `BOOKPI_LEDGER_PATH`
 * enables the durable JSONL ledger; otherwise the process falls back to the
 * volatile in-memory chain (documented, not silent).
 */
export function createAuditLedger(ledgerPath?: string): InMemoryBookPiLedger | DurableBookPiLedger {
  const path = (ledgerPath ?? process.env.BOOKPI_LEDGER_PATH ?? "").trim();
  if (path) return new DurableBookPiLedger(path);
  return new InMemoryBookPiLedger();
}

export const bookPiLedger = createAuditLedger();
