/**
 * GAME OVER UagpValidator (UAGP-1).
 *
 * Structural validation of a declared governance request. state: draft |
 * engine-generated. It checks shape and required fields; it makes no trust,
 * ethics or risk judgement (those engines run separately).
 */
import { isKnownEvidenceKind } from "./constitution";
import { UAGP_PROTOCOL } from "./types";

export interface ValidationResult {
  readonly valid: boolean;
  readonly errors: readonly string[];
}

const SHA256_HEX = /^[0-9a-f]{64}$/;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function nonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

export function validateRequest(input: unknown): ValidationResult {
  const errors: string[] = [];

  if (!isRecord(input)) {
    return Object.freeze({ valid: false, errors: Object.freeze(["REQUEST_NOT_AN_OBJECT"]) });
  }

  if (input.protocol !== UAGP_PROTOCOL) errors.push("PROTOCOL_UNSUPPORTED");
  if (!nonEmptyString(input.requestId)) errors.push("REQUEST_ID_REQUIRED");
  if (!nonEmptyString(input.passportId)) errors.push("PASSPORT_ID_REQUIRED");
  if (!nonEmptyString(input.objectiveTitle)) errors.push("OBJECTIVE_TITLE_REQUIRED");

  if (!isRecord(input.agent)) {
    errors.push("AGENT_REQUIRED");
  } else {
    if (!nonEmptyString(input.agent.id)) errors.push("AGENT_ID_REQUIRED");
    if (!nonEmptyString(input.agent.name)) errors.push("AGENT_NAME_REQUIRED");
    if (!nonEmptyString(input.agent.owner)) errors.push("AGENT_OWNER_REQUIRED");
    if (!isStringArray(input.agent.capabilities)) errors.push("AGENT_CAPABILITIES_INVALID");
  }

  if (!isStringArray(input.actions) || input.actions.length === 0 || !input.actions.every(nonEmptyString)) {
    errors.push("ACTIONS_REQUIRED");
  }

  if (input.dataClasses !== undefined && !isStringArray(input.dataClasses)) {
    errors.push("DATA_CLASSES_INVALID");
  }

  if (input.evidence !== undefined) {
    if (!Array.isArray(input.evidence)) {
      errors.push("EVIDENCE_INVALID");
    } else {
      input.evidence.forEach((entry, index) => {
        if (!isRecord(entry)) {
          errors.push(`EVIDENCE_${index}_INVALID`);
          return;
        }
        if (!nonEmptyString(entry.id)) errors.push(`EVIDENCE_${index}_ID_REQUIRED`);
        if (!nonEmptyString(entry.kind) || !isKnownEvidenceKind(entry.kind)) errors.push(`EVIDENCE_${index}_KIND_UNKNOWN`);
        if (!nonEmptyString(entry.uri)) errors.push(`EVIDENCE_${index}_URI_REQUIRED`);
        if (!nonEmptyString(entry.sha256) || !SHA256_HEX.test(entry.sha256)) errors.push(`EVIDENCE_${index}_SHA256_INVALID`);
      });
    }
  }

  return Object.freeze({ valid: errors.length === 0, errors: Object.freeze(errors) });
}
