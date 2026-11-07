"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import NumberButtons from "@/components/NumberButtons";
import { Skeleton } from "@/components/ui/skeleton";
import { TALENT_KINDS, type BaseStat, type GameText } from "@/lib/genshin/characterExtras";
import { cn } from "@/lib/utils";

const LABEL = "text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-400";

/** Base stats before gear: a short list under the portrait, or a row of tiles. */
export function BaseStats({
  stats,
  level,
  loading,
  variant,
}: {
  stats: BaseStat[] | null;
  level: number;
  loading: boolean;
  variant: "list" | "tiles";
}) {
  if (!loading && !stats) return null;
  const heading = <p className={cn(LABEL, "mb-1.5")}>Base stats at Lv. {level}, before gear</p>;
  if (variant === "tiles") {
    return (
      <div>
        {heading}
        {stats ? (
          <dl className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {stats.map((stat) => (
              <div
                key={stat.label}
                className="flex flex-col-reverse justify-end rounded-lg border border-gray-200 dark:border-slate-700 px-3 py-2"
              >
                <dd className="text-lg font-semibold tabular-nums text-gray-900 dark:text-slate-100">{stat.value}</dd>
                <dt className="text-xs text-gray-500 dark:text-slate-400">{stat.label}</dt>
              </div>
            ))}
          </dl>
        ) : (
          <Skeleton className="h-16" />
        )}
      </div>
    );
  }
  return (
    <div>
      {heading}
      {stats ? (
        <dl className="divide-y divide-gray-200 dark:divide-slate-700 text-sm">
          {stats.map((stat) => (
            <div key={stat.label} className="flex justify-between gap-2 py-1">
              <dt className="text-gray-500 dark:text-slate-400">{stat.label}</dt>
              <dd className="font-semibold tabular-nums text-gray-900 dark:text-slate-100">{stat.value}</dd>
            </div>
          ))}
        </dl>
      ) : (
        <Skeleton className="h-28" />
      )}
    </div>
  );
}

/** Game text, whose newer entries mark terms as **bold**. */
function MarkedText({ text }: { text: string }) {
  return text.split(/\*\*(.+?)\*\*/g).map((part, i) =>
    i % 2 === 1 ? (
      <strong key={i} className="font-semibold text-gray-900 dark:text-slate-100">
        {part}
      </strong>
    ) : (
      part
    )
  );
}

/** The description of the talent that's open. */
export function TalentText({ talent, id }: { talent: GameText; id: string }) {
  return (
    <div id={id} className="mt-2 rounded-lg border border-gray-200 dark:border-slate-700 p-3">
      <p key={talent.name} className="fade-up font-semibold text-gray-900 dark:text-slate-100">{talent.name}</p>
      <p key={`${talent.name}-text`} className="fade-up mt-1 whitespace-pre-line text-sm text-gray-600 dark:text-slate-400">
        <MarkedText text={talent.text} />
      </p>
    </div>
  );
}

/** "Normal Attack" and so on, kept on one line with its arrow so the talent names below line up. */
export function TalentKindLabel({
  kind,
  arrow,
  open,
  className,
}: {
  kind: string;
  arrow: boolean;
  open: boolean;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "flex items-center gap-1 whitespace-nowrap text-xs font-semibold uppercase tracking-wide text-indigo-700 dark:text-indigo-300",
        className
      )}
    >
      {kind}
      {arrow && <ChevronDown aria-hidden="true" className={cn("h-3 w-3 shrink-0 transition-transform duration-150 ease-out-strong motion-reduce:transition-none", open && "rotate-180")} />}
    </span>
  );
}

/** Three buttons for a character with no build to show levels for; one press opens that talent's text. */
export function TalentButtons({ talents }: { talents: GameText[] }) {
  const [open, setOpen] = useState<number | null>(null);
  return (
    <div>
      <p className={cn(LABEL, "mb-1.5")}>Talents</p>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        {talents.map((talent, i) => (
          <button
            key={TALENT_KINDS[i]}
            type="button"
            aria-expanded={open === i}
            aria-controls="quick-view-talent"
            onClick={() => setOpen(open === i ? null : i)}
            className={cn(
              "flex flex-col justify-start rounded-lg p-2.5 text-left ring-1 ring-indigo-100 dark:ring-indigo-900 hover:bg-indigo-100/70 dark:hover:bg-indigo-900/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500",
              open === i ? "bg-indigo-100 dark:bg-indigo-900/50" : "bg-indigo-50/60 dark:bg-indigo-900/20"
            )}
          >
            <TalentKindLabel kind={TALENT_KINDS[i]} arrow open={open === i} />
            <span className="mt-0.5 block text-sm text-gray-700 dark:text-slate-300">{talent.name}</span>
          </button>
        ))}
      </div>
      {open !== null ? (
        <TalentText talent={talents[open]} id="quick-view-talent" />
      ) : (
        <p className="mt-2 text-xs text-gray-500 dark:text-slate-400">Press a talent to read what it does.</p>
      )}
    </div>
  );
}

/**
 * C1 to C6 with the chosen one's effect below. Given `owned` (how many the
 * player has), unlocked ones get a star and it opens on the next to unlock;
 * without it, for a character they don't have, it opens on C1 with no marks.
 */
export function ConstellationPicker({
  constellations,
  loading,
  owned,
}: {
  constellations: GameText[] | null;
  loading: boolean;
  owned?: number;
}) {
  const [picked, setPicked] = useState<number | null>(null);
  if (loading) return <Skeleton className="h-24" />;
  if (!constellations) return null;
  const hasBuild = owned !== undefined;
  const selected = picked ?? (hasBuild ? Math.min(owned + 1, 6) : 1);
  const current = constellations[selected - 1];
  const status = !hasBuild ? null : selected <= owned ? "Unlocked" : selected === owned + 1 ? "Next to unlock" : "Locked";
  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        <span className={LABEL}>Constellations</span>
        <NumberButtons
          label="Constellation"
          prefix="C"
          count={6}
          selected={selected}
          onSelect={setPicked}
          isMarked={hasBuild ? (n) => n <= owned : undefined}
          markLabel="unlocked"
          markTitle="Unlocked"
          dimUnmarked={hasBuild}
        />
        {hasBuild && <span className="text-sm text-gray-500 dark:text-slate-400">{owned} of 6 unlocked</span>}
      </div>
      <div aria-live="polite">
        <p className="mt-2 text-sm font-semibold text-gray-900 dark:text-slate-100">
          {current.name}
          {status && (
            <span className="ml-2 whitespace-nowrap rounded bg-indigo-100 dark:bg-indigo-900/50 px-1.5 py-0.5 text-xs text-indigo-700 dark:text-indigo-300">
              C{selected} · {status}
            </span>
          )}
        </p>
        <p key={current.name} className="fade-up mt-1 max-w-4xl whitespace-pre-line text-sm text-gray-600 dark:text-slate-400">
          <MarkedText text={current.text} />
        </p>
      </div>
    </div>
  );
}

/** Asks for the Traveler's element, which their talents and constellations depend on. */
export function ChooseElementHint() {
  return (
    <p className="text-sm text-gray-600 dark:text-slate-400">
      Choose your element above to see the Traveler&apos;s talents and constellations.
    </p>
  );
}
