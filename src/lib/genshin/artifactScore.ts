import type { GoodArtifact } from "./types";

/**
 * Crit Value: CRIT Rate × 2 + CRIT DMG, from substats only. The main stat is left
 * out, as is the common convention, or every CRIT circlet would score high.
 */
export function critValue(artifact: Pick<GoodArtifact, "substats">): number {
  let total = 0;
  for (const { key, value } of artifact.substats) {
    if (key === "critRate_") total += value * 2;
    else if (key === "critDMG_") total += value;
  }
  return roundCv(total);
}

/** One decimal place, as the game shows; also clears floating-point noise from adding. */
export function roundCv(value: number): number {
  return Number(value.toFixed(1));
}

export type ScoreTier = "excellent" | "great" | "good" | "low" | "leveling" | "critCirclet" | "unrated";

/** Lowest CV for each tier that a score can earn. Below the last one is Low. */
export const TIER_MINIMUMS = { excellent: 40, great: 30, good: 20 } as const;

/** Every tier in the order the filters list them, with its label. */
export const SCORE_TIERS: { value: ScoreTier; label: string }[] = [
  { value: "excellent", label: "Excellent" },
  { value: "great", label: "Great" },
  { value: "good", label: "Good" },
  { value: "low", label: "Low" },
  { value: "critCirclet", label: "CRIT circlet" },
  { value: "leveling", label: "Still leveling" },
  { value: "unrated", label: "Not rated" },
];

export function tierLabel(tier: ScoreTier): string {
  return SCORE_TIERS.find((t) => t.value === tier)?.label ?? tier;
}

/**
 * A circlet with a CRIT main stat can't roll that stat as a substat, so it scores
 * from the other one alone. In the Irminsul sample the best of 88 reached 27.2 CV
 * and 80% would be Low, so the tiers don't judge them fairly.
 */
export function isCritCirclet(artifact: Pick<GoodArtifact, "slotKey" | "mainStatKey">): boolean {
  return (
    artifact.slotKey === "circlet" &&
    (artifact.mainStatKey === "critRate_" || artifact.mainStatKey === "critDMG_")
  );
}

/**
 * The tiers describe a finished 5★ piece. Lower rarities roll smaller values and
 * aren't rated, and a piece below level 20 is still gaining substats.
 */
export function scoreTier(artifact: GoodArtifact): ScoreTier {
  if (artifact.rarity < 5) return "unrated";
  if (artifact.level < 20) return "leveling";
  if (isCritCirclet(artifact)) return "critCirclet";
  const cv = critValue(artifact);
  if (cv >= TIER_MINIMUMS.excellent) return "excellent";
  if (cv >= TIER_MINIMUMS.great) return "great";
  if (cv >= TIER_MINIMUMS.good) return "good";
  return "low";
}

/** Unequipped and finished, with a Low score: probably safe to feed to something else. */
export function isLikelyFodder(artifact: GoodArtifact): boolean {
  return !artifact.location && scoreTier(artifact) === "low";
}
