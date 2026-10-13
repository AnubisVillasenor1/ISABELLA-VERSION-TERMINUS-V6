import { BOOKPI_PROTOCOL } from "../bookpi/types";
import type { BookPiStorage, JsonValue } from "../bookpi/types";

export interface RetentionObject {
  id: string;
  createdAt: string;
  byteLength: number;
  expiresAt?: string;
  legalHold?: boolean;
  pinned?: boolean;
  inUse?: boolean;
}

export interface RetentionPolicy {
  version: string;
  maxObjects: number;
  maxBytes: number;
  maxAgeMs: number;
  minimumAgeMs: number;
  batchSize: number;
}

export interface RetentionPlan {
  policyVersion: string;
  plannedAt: string;
  candidates: Array<{ id: string; reason: "EXPIRED" | "OLDEST_FIRST_CAPACITY" }>;
  currentObjects: number;
  projectedObjects: number;
  currentBytes: number;
  projectedBytes: number;
  capacitySatisfied: boolean;
  blockedBy: string[];
}

export interface RetentionRepository {
  listObjects(): Promise<readonly RetentionObject[]>;
  /** Must delete mutable payload/shards only; it must never delete the BookPI audit ledger. */
  erasePayload(id: string): Promise<{ physicalDeletionComplete: boolean; details?: string }>;
}

export interface RetentionAudit {
  append(type: string, payload: Record<string, string | number | boolean | string[]>): Promise<void>;
}

function validatePolicy(policy: RetentionPolicy): void {
  if (!policy.version.trim() || !Number.isSafeInteger(policy.maxObjects) || policy.maxObjects < 1
    || !Number.isSafeInteger(policy.maxBytes) || policy.maxBytes < 1
    || !Number.isSafeInteger(policy.maxAgeMs) || policy.maxAgeMs < 1
    || !Number.isSafeInteger(policy.minimumAgeMs) || policy.minimumAgeMs < 0
    || policy.minimumAgeMs > policy.maxAgeMs
    || !Number.isSafeInteger(policy.batchSize) || policy.batchSize < 1) {
    throw new Error("BOOKPI_RETENTION_POLICY_INVALID");
  }
}

function objectAge(item: RetentionObject, nowMs: number): number {
  return nowMs - Date.parse(item.createdAt);
}

function isExpired(item: RetentionObject, nowMs: number, policy: RetentionPolicy): boolean {
  const expires = item.expiresAt ? Date.parse(item.expiresAt) : Number.NaN;
  return (Number.isFinite(expires) && expires <= nowMs) || objectAge(item, nowMs) >= policy.maxAgeMs;
}

function deletable(item: RetentionObject, nowMs: number, policy: RetentionPolicy): boolean {
  if (item.legalHold || item.pinned || item.inUse) return false;
  return isExpired(item, nowMs, policy) || objectAge(item, nowMs) >= policy.minimumAgeMs;
}

function validateObjects(objects: readonly RetentionObject[], nowMs: number): number {
  const ids = new Set<string>();
  let totalBytes = 0;
  for (const item of objects) {
    const createdAt = Date.parse(item.createdAt);
    if (!item.id.trim() || ids.has(item.id) || !Number.isSafeInteger(item.byteLength) || item.byteLength < 0
      || !Number.isFinite(createdAt) || createdAt > nowMs
      || (item.expiresAt !== undefined && !Number.isFinite(Date.parse(item.expiresAt)))) {
      throw new Error("BOOKPI_RETENTION_OBJECT_INVALID_OR_DUPLICATE");
    }
    ids.add(item.id);
    totalBytes += item.byteLength;
    if (!Number.isSafeInteger(totalBytes)) throw new Error("BOOKPI_RETENTION_TOTAL_BYTES_OVERFLOW");
  }
  return totalBytes;
}

/** Deterministic retention plan; pinned/legal-hold/in-use objects are never evicted. */
export function planRetention(objects: readonly RetentionObject[], policy: RetentionPolicy, nowMs = Date.now()): RetentionPlan {
  validatePolicy(policy);
  const totalBytes = validateObjects(objects, nowMs);
  let count = objects.length;
  let bytes = totalBytes;
  const candidates: RetentionPlan["candidates"] = [];
  const eligible = objects
    .filter((item) => deletable(item, nowMs, policy))
    .sort((a, b) => {
      const expiredA = isExpired(a, nowMs, policy);
      const expiredB = isExpired(b, nowMs, policy);
      if (expiredA !== expiredB) return expiredA ? -1 : 1;
      return objectAge(b, nowMs) - objectAge(a, nowMs) || a.id.localeCompare(b.id);
    });

  for (const item of eligible) {
    const expired = isExpired(item, nowMs, policy);
    const overCapacity = count > policy.maxObjects || bytes > policy.maxBytes;
    if (!expired && !overCapacity) continue;
    if (candidates.length >= policy.batchSize) break;
    candidates.push({ id: item.id, reason: expired ? "EXPIRED" : "OLDEST_FIRST_CAPACITY" });
    count -= 1;
    bytes -= item.byteLength;
  }

  const blockedBy: string[] = [];
  if (count > policy.maxObjects) blockedBy.push("MAX_OBJECT_COUNT_BLOCKED_BY_HOLD_OR_BATCH_LIMIT");
  if (bytes > policy.maxBytes) blockedBy.push("MAX_BYTE_CAP_BLOCKED_BY_HOLD_OR_BATCH_LIMIT");
  if (objects.some((item) => item.legalHold || item.pinned || item.inUse) && blockedBy.length > 0) blockedBy.push("PROTECTED_OBJECTS_PRESENT");

  return {
    policyVersion: policy.version,
    plannedAt: new Date(nowMs).toISOString(),
    candidates,
    currentObjects: objects.length,
    projectedObjects: count,
    currentBytes: totalBytes,
    projectedBytes: bytes,
    capacitySatisfied: count <= policy.maxObjects && bytes <= policy.maxBytes,
    blockedBy,
  };
}

export interface WriteCapacityDecision {
  admitted: boolean;
  requiresRetentionSweep: boolean;
  reason: "CAPACITY_AVAILABLE" | "RETENTION_REQUIRED_BEFORE_ADMISSION" | "CAPACITY_BLOCKED";
}

/**
 * Call before each logical object write. Existing objects are not silently
 * deleted on the hot path; the writer must run the audited sweep and retry.
 */
export function checkWriteCapacity(
  objects: readonly RetentionObject[],
  incomingBytes: number,
  policy: RetentionPolicy,
  nowMs = Date.now(),
): WriteCapacityDecision {
  if (!Number.isSafeInteger(incomingBytes) || incomingBytes < 0) throw new Error("BOOKPI_INCOMING_SIZE_INVALID");
  const plan = planRetention(objects, policy, nowMs);
  if (plan.candidates.length > 0) return { admitted: false, requiresRetentionSweep: true, reason: "RETENTION_REQUIRED_BEFORE_ADMISSION" };
  if (!plan.capacitySatisfied || objects.length + 1 > policy.maxObjects || plan.currentBytes + incomingBytes > policy.maxBytes) {
    return { admitted: false, requiresRetentionSweep: false, reason: "CAPACITY_BLOCKED" };
  }
  return { admitted: true, requiresRetentionSweep: false, reason: "CAPACITY_AVAILABLE" };
}

function jsonValue(value: unknown): JsonValue {
  return value as JsonValue;
}

/** Adapter that writes retention events as BookPI append-only records. */
export function createBookPiRetentionAudit(ledger: BookPiStorage): RetentionAudit {
  return {
    async append(type, payload) {
      await ledger.appendEvent({
        header: {
          type,
          source: "isabella.terminus-omega",
          protocol: BOOKPI_PROTOCOL,
          hehepcontext: { hexagon: "BOOKPI", domain: "RETENTION" },
        },
        schemaVersion: "bookpi-retention.v1",
        meta: { policy: "bounded-retention-v1" },
        payload: jsonValue(payload),
      });
    },
  };
}

/**
 * A sweep first appends its intent, then performs idempotent payload erasure, then
 * appends per-object completion. If the intent audit fails, nothing is deleted.
 */
export async function runRetentionSweep(
  repository: RetentionRepository,
  audit: RetentionAudit,
  policy: RetentionPolicy,
  nowMs = Date.now(),
): Promise<{ plan: RetentionPlan; erased: string[]; failed: Array<{ id: string; reason: string }> }> {
  const plan = planRetention(await repository.listObjects(), policy, nowMs);
  if (plan.candidates.length === 0) return { plan, erased: [], failed: [] };

  await audit.append("bookpi.retention.requested", {
    policyVersion: policy.version,
    plannedAt: plan.plannedAt,
    candidateIds: plan.candidates.map((candidate) => candidate.id),
    candidateCount: plan.candidates.length,
    projectedObjects: plan.projectedObjects,
    projectedBytes: plan.projectedBytes,
  });

  const erased: string[] = [];
  const failed: Array<{ id: string; reason: string }> = [];
  for (const candidate of plan.candidates) {
    let physicalDeletionComplete = false;
    try {
      const result = await repository.erasePayload(candidate.id);
      if (!result.physicalDeletionComplete) throw new Error(result.details ?? "PHYSICAL_DELETION_INCOMPLETE");
      physicalDeletionComplete = true;
      erased.push(candidate.id);
    } catch (error) {
      failed.push({ id: candidate.id, reason: error instanceof Error ? error.message : String(error) });
    }

    try {
      await audit.append(physicalDeletionComplete ? "bookpi.retention.completed" : "bookpi.retention.failed", {
        policyVersion: policy.version,
        objectId: candidate.id,
        reason: candidate.reason,
        physicalDeletionComplete,
        completedAt: new Date(nowMs).toISOString(),
      });
    } catch (error) {
      failed.push({ id: candidate.id, reason: "RETENTION_RESULT_AUDIT_FAILED: " + (error instanceof Error ? error.message : String(error)) });
    }
  }
  return { plan, erased, failed };
}
