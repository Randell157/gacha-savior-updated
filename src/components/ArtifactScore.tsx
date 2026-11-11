import { critValue, scoreTier, tierLabel, type ScoreTier } from "@/lib/genshin/artifactScore";
import type { GoodArtifact } from "@/lib/genshin/types";
import { cn } from "@/lib/utils";

/** From loud to quiet: Low is plain grey rather than red, since a low score can be fine on a support. */
const QUIET = "ring-1 ring-inset ring-gray-300 text-gray-600 dark:ring-slate-600 dark:text-slate-400";
const TIER_CHIP: Record<ScoreTier, string> = {
  excellent: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300",
  great: "bg-sky-100 text-sky-800 dark:bg-sky-900/50 dark:text-sky-300",
  good: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  low: QUIET,
  critCirclet: QUIET,
  leveling: QUIET,
  unrated: QUIET,
};

const CHIP = "inline-block whitespace-nowrap rounded-full px-2 py-px text-xs font-semibold";

/**
 * The small score for narrow cards: "CV 49.8" in its tier's colour. The tier's
 * name is there for screen readers and on hover, since colour alone can't say it.
 */
export function CvChip({ artifact, className }: { artifact: GoodArtifact; className?: string }) {
  const tier = scoreTier(artifact);
  return (
    <span className={cn(CHIP, TIER_CHIP[tier], className)} title={tierLabel(tier)}>
      CV {critValue(artifact)}
      <span className="sr-only">, {tierLabel(tier)}</span>
    </span>
  );
}

/** The large score for full cards: the number, "CV", then the tier by name. */
export function CvBlock({ artifact, className }: { artifact: GoodArtifact; className?: string }) {
  const tier = scoreTier(artifact);
  return (
    <div className={cn("flex-none text-right", className)}>
      <p className="text-2xl font-bold leading-none tabular-nums text-indigo-900 dark:text-indigo-200">
        {critValue(artifact)}
      </p>
      <p className="text-xs text-gray-500 dark:text-slate-400">CV</p>
      <p className={cn(CHIP, TIER_CHIP[tier], "mt-1")}>{tierLabel(tier)}</p>
    </div>
  );
}

/**
 * The smallest score, under a piece's icon in a showcase slot: just the number
 * in its tier's colour, with "CV" and the tier for screen readers and on hover.
 */
export function CvMini({ artifact }: { artifact: GoodArtifact }) {
  const tier = scoreTier(artifact);
  const cv = critValue(artifact);
  return (
    <span
      className={cn(
        "inline-block whitespace-nowrap rounded-full px-1 text-[11px] font-semibold leading-4 tabular-nums",
        TIER_CHIP[tier]
      )}
      title={`CV ${cv}, ${tierLabel(tier)}`}
    >
      <span className="sr-only">CV </span>
      {cv}
      <span className="sr-only">, {tierLabel(tier)}</span>
    </span>
  );
}
