/**
 * @fileoverview Canonical Barrel Export Interface
 * @project ISABELLA-VERSION-TERMINUS-V6
 * @description Centralized, modularized, and strictly disambiguated export nexus 
 *              for the Isabella Sovereign Fabric (ISVF) and TAMV Ecosystem.
 */

// ============================================================================
// 1. CORE FOUNDATIONS, INGRESS & IDENTITY SUBSYSTEMS
// ============================================================================
export * from "./authority/method-id";
export * from "./core";
export * from "./ingress";
export * from "./identity";
export * from "./crown";
export * from "./evolution";
export * from "./memory";
export * from "./bookpi";
export * from "./security";
export * from "./tools";
export * from "./skills";
export * from "./observability";
export * from "./federation";
export * from "./intelligence";
export * from "./genesis";
export * from "./inference";

// ============================================================================
// 2. VERITAS VERIFICATION, EVALUATION & DEPLOYMENT
// ============================================================================
export * from "./veritas";
export * from "./evaluation";
export * from "./deployment";

// ============================================================================
// 3. COMPANION, COGNITION & EXPERT MODULES (MoE / SOPHIA)
// ============================================================================
export * from "./companion/safety";
export * from "./companion/escalation";
export * from "./cognition/explainability";
export * from "./cognition/emotional-trace";
export * from "./cognition/experts";
export * from "./cognition/moe";
export * from "./cognition/consent";
export * from "./cognition/orchestrator";
export * from "./cognition/sophia";
export * from "./cognition/contradiction";

// ============================================================================
// 4. TERRITORY, XR, QUANTUM & SYSTEM INFRASTRUCTURE
// ============================================================================
export * from "./territory/context";
export * from "./territory/tamv-integration";
export * from "./xr/safety";
export * from "./quantum";
export * from "./protocols";
export * from "./modules";
export * from "./osiris";
export * from "./capabilities";
export * from "./messaging";
export * from "./sanitization";
export * from "./governance";
export * from "./plugins";
export * from "./commerce";
export * from "./tenancy/isolation";
export * from "./gameover";
export * from "./hypercore";
export * from "./isabella";

// ============================================================================
// 5. EXPLICIT BARREL CONFLICT RESOLUTIONS & TYPE ALIASES
// ============================================================================

/**
 * --- Risk Level Disambiguation ---
 * Resolves naming collisions between Crown and Game Over / UAGP-1 semmantics.
 */
export type { RiskLevel } from "./crown";
export type { RiskLevel as GameOverRiskLevel } from "./gameover";

/**
 * --- Decision Explanation Disambiguation ---
 */
export { explainDecision } from "./cognition/explainability";
export { explainDecision as explainGameOverDecision } from "./gameover";

/**
 * --- Capability Descriptor & Verification Result ---
 * Resolves homonyms between Crown gates and HSF capability contracts.
 */
export type { CapabilityDescriptor, VerificationResult } from "./capabilities";
export type { CapabilityDescriptor as CrownCapabilityDescriptor } from "./crown";
export type { VerificationResult as CrownVerificationResult } from "./crown";
export type { CapabilityDescriptor as HsfCapabilityDescriptor } from "./capabilities";
export type { VerificationResult as HsfVerificationResult } from "./capabilities";

/**
 * --- Rate Limit Decision Disambiguation ---
 * Separates Security (Fixed Window) from Deployment (Token Bucket).
 */
export type { RateLimitDecision } from "./security/rate-limit";
export type { RateLimitDecision as FixedWindowRateLimitDecision } from "./security/rate-limit";
export type { RateLimitDecision as TokenBucketRateLimitDecision } from "./deployment/production-ops";

/**
 * --- Confidence Level Disambiguation ---
 * Separates Commerce metrics from Verified Knowledge epistemological tiers (E0-E6).
 */
export type { ConfidenceLevel } from "./commerce";
export type { ConfidenceLevel as CommerceConfidenceLevel } from "./commerce";
export type { ConfidenceLevel as VerifiedConfidenceLevel } from "./memory/verified-knowledge";

// ============================================================================
// 6. NAMESPACED SUBSYSTEMS
// ============================================================================

/**
 * Namespaced export to prevent collisions with the core BookPI retention contract.
 */
export * as Terminus from "./terminus";

/**
 * Native, provider-agnostic, seed-deterministic trainable ML engine (pure TS).
 * Namespaced to avoid collisions with existing ML/evaluation contracts.
 */
export * as NativeML from "./lib/native-ml";
