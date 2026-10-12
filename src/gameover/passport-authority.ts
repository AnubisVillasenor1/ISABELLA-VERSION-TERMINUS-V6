/**
 * GAME OVER PassportAuthority (UAGP-1).
 *
 * Issues, stores, verifies and revokes AI Passports in memory. state: draft |
 * engine-generated. This is an application-level registry: it is NOT a
 * cryptographic identity provider and does NOT federate with an external CA.
 */
import { randomUUID } from "node:crypto";
import { GAMEOVER_CONSTITUTION } from "./constitution";
import type { AgentIdentity, AIPassport, CertificationState, PassportVerification } from "./types";

export interface IssuePassportInput {
  readonly agent: AgentIdentity;
  readonly issuer: string;
  readonly trustScore: number;
  readonly validityDays?: number;
  readonly id?: string;
}

export interface PassportAuthorityOptions {
  readonly now?: () => Date;
  readonly idFactory?: () => string;
}

export interface PassportAuthority {
  issue(input: IssuePassportInput): AIPassport;
  get(id: string): AIPassport | null;
  verify(id: string): PassportVerification;
  revoke(id: string, reason: string): AIPassport;
  list(): readonly AIPassport[];
}

function certificationFor(trustScore: number): CertificationState {
  const { certified, provisional } = GAMEOVER_CONSTITUTION.passportCertificationThresholds;
  if (trustScore >= certified) return "CERTIFIED";
  if (trustScore >= provisional) return "PROVISIONAL";
  return "UNKNOWN";
}

function addDays(base: Date, days: number): Date {
  const next = new Date(base.getTime());
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

export function createPassportAuthority(options: PassportAuthorityOptions = {}): PassportAuthority {
  const now = options.now ?? (() => new Date());
  const idFactory = options.idFactory ?? (() => `GOP-${randomUUID()}`);
  const passports = new Map<string, AIPassport>();

  function issue(input: IssuePassportInput): AIPassport {
    if (!input.agent.id.trim()) throw new Error("PASSPORT_AGENT_ID_REQUIRED");
    if (!input.issuer.trim()) throw new Error("PASSPORT_ISSUER_REQUIRED");
    const issuedAt = now();
    const validityDays = input.validityDays ?? GAMEOVER_CONSTITUTION.defaultPassportValidityDays;
    const passport: AIPassport = Object.freeze({
      id: input.id ?? idFactory(),
      agent: Object.freeze({ ...input.agent, capabilities: Object.freeze([...input.agent.capabilities]) }),
      issuedAt: issuedAt.toISOString(),
      expiresAt: addDays(issuedAt, validityDays).toISOString(),
      issuer: input.issuer.trim(),
      certification: certificationFor(input.trustScore),
      trustScore: input.trustScore,
    });
    passports.set(passport.id, passport);
    return passport;
  }

  function get(id: string): AIPassport | null {
    const found = passports.get(id);
    return found ? Object.freeze({ ...found }) : null;
  }

  function verify(id: string): PassportVerification {
    const passport = passports.get(id);
    if (!passport) {
      return Object.freeze({ id, valid: false, certification: "UNKNOWN", reason: "PASSPORT_NOT_FOUND", expiresAt: "" });
    }
    if (passport.certification === "REVOKED") {
      return Object.freeze({ id, valid: false, certification: "REVOKED", reason: "PASSPORT_REVOKED", expiresAt: passport.expiresAt });
    }
    if (Date.parse(passport.expiresAt) <= now().getTime()) {
      return Object.freeze({ id, valid: false, certification: passport.certification, reason: "PASSPORT_EXPIRED", expiresAt: passport.expiresAt });
    }
    if (passport.certification === "UNKNOWN") {
      return Object.freeze({ id, valid: false, certification: "UNKNOWN", reason: "PASSPORT_NOT_CERTIFIED", expiresAt: passport.expiresAt });
    }
    return Object.freeze({ id, valid: true, certification: passport.certification, reason: "PASSPORT_VALID", expiresAt: passport.expiresAt });
  }

  function revoke(id: string, reason: string): AIPassport {
    const passport = passports.get(id);
    if (!passport) throw new Error("PASSPORT_NOT_FOUND");
    if (!reason.trim()) throw new Error("PASSPORT_REVOKE_REASON_REQUIRED");
    const revoked: AIPassport = Object.freeze({
      ...passport,
      certification: "REVOKED",
      revokedAt: now().toISOString(),
      revokedReason: reason.trim(),
    });
    passports.set(id, revoked);
    return revoked;
  }

  function list(): readonly AIPassport[] {
    return [...passports.values()].map((passport) => Object.freeze({ ...passport }));
  }

  return { issue, get, verify, revoke, list };
}
