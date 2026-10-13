/**
 * Isabella Native ML — provider-agnostic, seed-deterministic, trainable engine.
 *
 * Pure TypeScript (Node built-ins only): no external API, no cost, no network at
 * train/predict time. Every model carries explicit governance hooks and returns
 * `approvalStatus: "PENDING_REVIEW"` — capability never implies authority.
 *
 * Ported from the open-source native-ml suite (isabella-ai-tina) and kept
 * self-contained so it never introduces cross-domain coupling.
 */
export * from "./types";
export * from "./engine";
export * from "./text-classifier";
export * from "./genesis-turbo";
export * from "./teacher-convergence";
export * from "./convergence-engine";
export * from "./federated";
export * from "./moe-native";
export * from "./moe-engine";
export * from "./bias-weakness-mitigation";

// canonical-engine re-exports engine/text-classifier; expose only its unique facade.
export { nativeML, NATIVE_ML_CONTRACT_VERSION } from "./canonical-engine";
export type { NativeMLRuntime } from "./canonical-engine";
