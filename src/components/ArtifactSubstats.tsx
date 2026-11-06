import { formatStat, isCritStat } from "@/lib/genshin/stats";
import type { GoodSubstat } from "@/lib/genshin/types";
import { cn } from "@/lib/utils";

/** An artifact's substats in grey, in the export's order, with CRIT brighter so it's easy to find. */
export default function ArtifactSubstats({ substats }: { substats: GoodSubstat[] }) {
  if (substats.length === 0) return null;
  return (
    <ul className="mt-2 space-y-0.5 text-gray-600 dark:text-slate-400">
      {substats.map((substat, i) => (
        <li key={i} className={cn(isCritStat(substat.key) && "font-semibold text-gray-900 dark:text-slate-100")}>
          {formatStat(substat.key, substat.value)}
        </li>
      ))}
    </ul>
  );
}
