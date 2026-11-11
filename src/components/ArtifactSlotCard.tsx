import ArtifactIcon from "@/components/ArtifactIcon";
import { CvChip } from "@/components/ArtifactScore";
import ArtifactSubstats from "@/components/ArtifactSubstats";
import { artifactSetName } from "@/lib/genshin/artifactSets";
import { mainStatValue } from "@/lib/genshin/showcaseBuild";
import { formatSlotName, formatStat, formatStatName } from "@/lib/genshin/stats";
import type { GoodArtifact } from "@/lib/genshin/types";
import { cn } from "@/lib/utils";

/**
 * A compact artifact: icon, slot, rarity, level and CV, set name, then the main
 * stat (semibold indigo) and substats (grey). Used in the Artifacts page's
 * Equipped rows and on the character page. The slot name is hidden from the
 * `lg` breakpoint when `slotNameNarrowOnly` is set, where the Equipped rows have
 * column headings instead.
 */
export default function ArtifactSlotCard({
  artifact,
  slotNameNarrowOnly = false,
  showMainValue = false,
  className,
}: {
  artifact: GoodArtifact;
  slotNameNarrowOnly?: boolean;
  /** Add the main stat's value where it's known (5★ at +20), as on the build card */
  showMainValue?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-lg bg-indigo-50/50 dark:bg-indigo-900/20 ring-1 ring-indigo-100 dark:ring-indigo-900 p-3 text-xs",
        className
      )}
    >
      {/* Icon beside the slot, rarity and level; the set name gets the full width below. */}
      <div className="flex items-center gap-2.5">
        <ArtifactIcon artifact={artifact} size="sm" />
        <div className="min-w-0 text-gray-500 dark:text-slate-400">
          <p
            className={cn(
              "font-semibold uppercase tracking-wide text-indigo-700 dark:text-indigo-300",
              slotNameNarrowOnly && "lg:hidden"
            )}
          >
            {formatSlotName(artifact.slotKey).split(" ")[0]}
          </p>
          <p>
            {artifact.rarity}★ · Lv. {artifact.level}
          </p>
          <CvChip artifact={artifact} className="mt-0.5" />
        </div>
      </div>
      <p className="mt-2 line-clamp-2 text-sm font-medium leading-snug text-gray-900 dark:text-slate-100">
        {artifactSetName(artifact.setKey)}
      </p>
      {artifact.mainStatKey && (
        <p className="mt-2 font-semibold text-indigo-900 dark:text-indigo-200">
          {(() => {
            const value = showMainValue ? mainStatValue(artifact) : null;
            return value === null ? formatStatName(artifact.mainStatKey) : formatStat(artifact.mainStatKey, value);
          })()}
        </p>
      )}
      <ArtifactSubstats substats={artifact.substats} />
    </div>
  );
}
