/**
 * ISABELLA VILLASEÑOR AI™ — TAMV Jurisdictional Gateway (TJG).
 * state: draft | engine-generated.
 *
 * Inspección y redacción de PII antes de inferencia, según jurisdicción
 * (GDPR/CCPA/LFPDPPP México). Determinista, sin red, sin modelo.
 *
 * Inspiración conceptual: XeoPhysics semantic resonance → renombrado como
 * TAMV Resonance Layer. El código es original de este repositorio.
 */
import { digest, SkillInputError } from './skills';

export type Jurisdiction = 'EU' | 'US' | 'MX' | 'GLOBAL';

export interface JurisdictionalPayload {
  readonly content: string;
  readonly jurisdiction: Jurisdiction;
  readonly piiFields?: readonly string[];
  readonly consentGranted?: boolean;
}

export interface JurisdictionalResult {
  readonly allowed: boolean;
  readonly sanitized: string;
  readonly redacted: readonly string[];
  readonly jurisdiction: Jurisdiction;
  readonly reason: string;
  readonly sanitizedDigest: string;
  readonly executionPerformed: false;
  readonly networkUsed: false;
}

const PII_PATTERNS: readonly RegExp[] = [
  /\b\d{3}-\d{2}-\d{4}\b/g, // SSN-like
  /\b[A-Z]{2}\d{6}\b/g, // passport-like
  /\b[\w.]+@[\w.]+\b/g, // email
];

function isJurisdiction(value: unknown): value is Jurisdiction {
  return value === 'EU' || value === 'US' || value === 'MX' || value === 'GLOBAL';
}

export function inspectJurisdiction(payload: JurisdictionalPayload): JurisdictionalResult {
  if (typeof payload.content !== 'string' || !payload.content.trim()) {
    throw new SkillInputError('INVALID_FIELD', 'content es requerido');
  }
  if (!isJurisdiction(payload.jurisdiction)) {
    throw new SkillInputError('INVALID_JURISDICTION', 'jurisdiction debe ser EU, US, MX o GLOBAL');
  }

  let sanitized = payload.content;
  const redacted: string[] = [];
  for (const pattern of PII_PATTERNS) {
    const matches = sanitized.match(pattern);
    if (matches) {
      redacted.push(...matches);
      sanitized = sanitized.replace(pattern, '[REDACTED]');
    }
  }

  let allowed = true;
  let reason = 'NO_PII_DETECTED';
  if (redacted.length > 0) {
    if (payload.jurisdiction === 'EU' && payload.consentGranted !== true) {
      allowed = false;
      reason = 'EU_PII_WITHOUT_CONSENT';
    } else {
      reason = 'PII_REDACTED';
    }
  }

  return {
    allowed,
    sanitized,
    redacted,
    jurisdiction: payload.jurisdiction,
    reason,
    sanitizedDigest: digest(sanitized),
    executionPerformed: false,
    networkUsed: false,
  };
}

export function isJurisdictionValue(value: unknown): value is Jurisdiction {
  return isJurisdiction(value);
}

export function describeJurisdictionalGateway(): Readonly<Record<string, unknown>> {
  return {
    jurisdictions: ['EU', 'US', 'MX', 'GLOBAL'],
    piiPatterns: ['ssn-like', 'passport-like', 'email'],
    euBlocksOnPii: true,
    redactsOnMxUs: true,
    executionPerformed: false,
    networkUsed: false,
    note: 'Inspección determinista; no envía datos a ningún servicio externo.',
  };
}