/**
 * GAME OVER — Universal Agent Governance Protocol (UAGP-1) (state: draft).
 *
 * Decide, score and record agent actions before execution. Never execute,
 * never certify. See docs/GAME_OVER_UAGP1_CANONICAL.md for the fidelity
 * contract and the Jenkins gate that consumes this engine.
 */
export * from "./types";
export * from "./constitution";
export * from "./trust-engine";
export * from "./risk-engine";
export * from "./ethics-engine";
export * from "./explainability-engine";
export * from "./cognitive-court";
export * from "./passport-authority";
export * from "./validator";
export * from "./human-approval-gate";
export * from "./audit";
export * from "./gateway";

import { createPassportAuthority } from "./passport-authority";
import { createUagpGateway } from "./gateway";

/** Process-wide AI Passport registry (in-memory). */
export const passportAuthority = createPassportAuthority();

/** Process-wide UAGP-1 gateway wired to the shared passport authority. */
export const uagpGateway = createUagpGateway({ passportAuthority });
