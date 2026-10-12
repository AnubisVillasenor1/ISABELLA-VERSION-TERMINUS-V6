/**
 * GAME OVER RiskEngine (UAGP-1).
 *
 * Maps an action criticality plus the number of declared agent capabilities to a
 * bounded risk score. state: draft | engine-generated. Heuristic, not measured.
 */
import { GAMEOVER_CONSTITUTION, riskLevelFor } from "./constitution";
import type { RiskAssessment, RiskLevel } from "./types";

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

export interface RiskInput {
  readonly criticality?: RiskLevel;
  readonly capabilityCount?: number;
}

/** Bounded risk score (0..1) + level for a governed action. */
export function assessRisk(input: RiskInput = {}): RiskAssessment {
  const criticality: RiskLevel = input.criticality ?? "MEDIUM";
  const capabilityCount = Math.max(0, Math.trunc(input.capabilityCount ?? 0));
  const base = GAMEOVER_CONSTITUTION.riskBaseByCriticality[criticality];
  const penalty = Math.min(
    GAMEOVER_CONSTITUTION.capabilityPenaltyCap,
    capabilityCount * GAMEOVER_CONSTITUTION.capabilityPenaltyPerItem,
  );
  const score = Math.round(clamp01(base + penalty) * 100) / 100;
  const level = riskLevelFor(score);
  return Object.freeze({
    score,
    level,
    criticality,
    capabilityCount,
    summary: `risk=${score} (${level}) from criticality ${criticality} + ${capabilityCount} capabilities`,
  });
}
