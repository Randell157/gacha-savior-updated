"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { FilterChip } from "@/components/FilterChip";
import WishesPerMonth from "@/components/WishesPerMonth";
import { getCharacterPortrait, rarityBackground } from "@/lib/genshinCharacters";
import { weaponIcon } from "@/lib/genshin/weapons";
import { POOLS, fiftyFiftyRecord, pityBand, poolOf, poolStats, wishSpending, type FiftyFifty, type PityBand, type Pull, type WishPool } from "@/lib/genshin/wishes";
import { cn } from "@/lib/utils";

// The Wishes page's stats (picks 1A, 2A and 3A from .mockups/wishes.html):
// banner chips, five tiles for the chosen banner, the next pull's 50/50 on
// Character Event, and its 5★ history as rows with pity bars, 10 per page.
// Pressing a chart month with a 5★ turns the history to that month's 5★s and
// highlights them (option A from .mockups/chart-click.html). The Wishes tile
// says roughly what the banner's wishes cost in Primogems, and the 50/50 record
// sits beside the Next 5★ chip (option 1A from .mockups/wish-additions.html).

const PAGE_SIZE = 10;
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "2026-09-29 02:07:00" (server time, as the game wrote it) to "Sep 29, 2026". */
export function wishDate(time: string): string {
  return `${MONTHS[Number(time.slice(5, 7)) - 1]} ${Number(time.slice(8, 10))}, ${time.slice(0, 4)}`;
}

const BANDS: Record<PityBand, { label: string; chip: string; bar: string }> = {
  early: {
    label: "Early",
    chip: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200",
    bar: "bg-emerald-500",
  },
  soft: {
    label: "Soft pity",
    chip: "bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-200",
    bar: "bg-sky-500",
  },
  hard: {
    label: "Hard pity",
    chip: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200",
    bar: "bg-amber-500",
  },
};


const FIFTY_FIFTY: Record<FiftyFifty, { label: string; chip: string }> = {
  won: { label: "Won 50/50", chip: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200" },
  lost: { label: "Lost 50/50", chip: "ring-1 ring-inset ring-gray-300 text-gray-600 dark:ring-slate-600 dark:text-slate-300" },
  guaranteed: { label: "Guaranteed", chip: "bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-200" },
};

const chipClass = "inline-block whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold";

/** A 5★'s portrait or weapon icon, from its name with punctuation removed. */
export function itemIcon(pull: Pull): string | null {
  const key = pull.name.replace(/[^A-Za-z0-9]/g, "");
  return pull.type === "Character" ? getCharacterPortrait(key) : weaponIcon(key);
}

export default function WishStats({ pulls }: { pulls: Pull[] }) {
  const pools = useMemo(() => POOLS.filter(({ pool }) => pulls.some((p) => poolOf(p.gachaType) === pool)), [pulls]);
  const [chosen, setChosen] = useState<WishPool>("character");
  const [page, setPage] = useState(0);
  // The chart month last pressed; `n` counts presses so pressing again flashes again.
  const [picked, setPicked] = useState<{ month: string; n: number } | null>(null);
  const list = useRef<HTMLOListElement>(null);
  const pool = pools.some((p) => p.pool === chosen) ? chosen : (pools[0]?.pool ?? "character");
  const info = POOLS.find((p) => p.pool === pool)!;
  const stats = useMemo(() => poolStats(pulls, pool), [pulls, pool]);
  const spent = useMemo(() => wishSpending(pulls, pool), [pulls, pool]);
  const record = useMemo(() => fiftyFiftyRecord(pulls), [pulls]);

  const history = [...stats.fiveStars].reverse();
  const pages = Math.max(1, Math.ceil(history.length / PAGE_SIZE));
  const current = Math.min(page, pages - 1);
  const shown = history.slice(current * PAGE_SIZE, current * PAGE_SIZE + PAGE_SIZE);
  const n = (value: number) => value.toLocaleString("en-US");
  const found = picked ? history.filter(({ pull }) => pull.time.startsWith(picked.month)) : [];

  const pickMonth = (month: string) => {
    const index = history.findIndex(({ pull }) => pull.time.startsWith(month));
    if (index < 0) return;
    setPage(Math.floor(index / PAGE_SIZE));
    setPicked((prev) => ({ month, n: (prev?.n ?? 0) + 1 }));
  };
  const turnPage = (to: number) => {
    setPage(to);
    setPicked(null);
  };

  // Bring the found rows into view (a DOM effect only; no state is set here).
  useEffect(() => {
    if (!picked) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    list.current?.querySelector("[data-picked]")?.scrollIntoView({ block: "center", behavior: reduce ? "auto" : "smooth" });
  }, [picked]);

  return (
    <div>
      <div className="mb-4 flex gap-2 overflow-x-auto pb-1" role="group" aria-label="Banner">
        {pools.map((p) => (
          <FilterChip
            key={p.pool}
            pressed={p.pool === pool}
            onClick={() => {
              setChosen(p.pool);
              turnPage(0);
            }}
          >
            <span className="whitespace-nowrap">{p.label}</span>
          </FilterChip>
        ))}
      </div>

      {info.hardPity === null ? (
        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-5">
          <Tile value={`${n(stats.total)}`} unit=" / 20" label="Wishes" detail={`≈ ${n(spent.primogems)} Primogems`} />
          <Tile value={n(stats.fourStars)} label="4★ wishes" />
        </div>
      ) : (
        <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-5">
          <Tile value={String(stats.pity5)} unit={` / ${info.hardPity}`} label="5★ pity" detail="Wishes since your last 5★" />
          <Tile value={String(stats.pity4)} unit=" / 10" label="4★ pity" detail="Since your last 4★" />
          <Tile value={n(stats.total)} label="Wishes" detail={`≈ ${n(spent.primogems)} Primogems`} />
          <Tile value={n(stats.fiveStars.length)} label="5★ wishes" detail={`${n(stats.fourStars)} 4★`} />
          <Tile value={stats.averagePity === null ? "—" : String(stats.averagePity)} label="Average per 5★" detail="Wishes each" />
        </div>
      )}

      {pool === "character" && (
        <div className="mb-6">
          <div className="flex flex-wrap items-center gap-2">
            <span className={cn(chipClass, "bg-indigo-50 text-indigo-900 ring-1 ring-inset ring-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-100 dark:ring-indigo-800")}>
              {stats.guaranteed ? "Next 5★: guaranteed featured" : "Next 5★: 50/50"}
            </span>
            {record.winRate !== null && (
              <>
                <span className={cn(chipClass, FIFTY_FIFTY.won.chip)}>{n(record.won)} won</span>
                <span className={cn(chipClass, FIFTY_FIFTY.lost.chip)}>{n(record.lost)} lost</span>
                <span className="text-xs text-gray-500 dark:text-slate-400">
                  {Math.round(record.winRate * 100)}% of your 50/50s won
                </span>
              </>
            )}
          </div>
          <p className="mt-1 text-xs text-gray-500 dark:text-slate-400">
            An estimate: since Version 5.0, Capturing Radiance raises your odds after lost 50/50s, and the game doesn&apos;t show where you stand.
          </p>
        </div>
      )}

      <div className="mb-3 flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
        <h2 className="text-lg font-semibold text-indigo-900 dark:text-indigo-200">
          5★ history{" "}
          {history.length > 0 && (
            <span className="text-sm font-normal text-gray-500 dark:text-slate-400">({n(history.length)}, newest first)</span>
          )}
        </h2>
        {history.length > 0 && (
          <div className="flex flex-wrap gap-1.5" aria-hidden="true">
            {(Object.keys(BANDS) as PityBand[]).map((b) => (
              <span key={b} className={cn(chipClass, BANDS[b].chip)}>
                {BANDS[b].label}
              </span>
            ))}
          </div>
        )}
      </div>

      {history.length === 0 ? (
        <p className="text-sm text-gray-500 dark:text-slate-400">No 5★ wishes on this banner yet.</p>
      ) : (
        <>
          <ol ref={list} className="divide-y rounded-lg border dark:divide-slate-700 dark:border-slate-700">
            {shown.map(({ pull, pity, fiftyFifty }) => {
              const band = pityBand(pool, pity);
              const icon = itemIcon(pull);
              const on = !!picked && pull.time.startsWith(picked.month);
              return (
                <li
                  key={on ? `${pull.id}-${picked.n}` : pull.id}
                  data-picked={on || undefined}
                  className={cn(
                    "grid grid-cols-[2.5rem_minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 px-3 py-2 sm:grid-cols-[2.75rem_minmax(0,1.4fr)_minmax(0,2fr)_8.5rem]",
                    on &&
                      "[--wish-flash-bar:theme(colors.indigo.500)] [--wish-flash:theme(colors.indigo.100)] motion-safe:animate-wish-flash motion-reduce:bg-indigo-50 motion-reduce:shadow-[inset_3px_0_0_theme(colors.indigo.500)] dark:[--wish-flash-bar:theme(colors.indigo.400)] dark:[--wish-flash:rgb(99_102_241/0.3)] dark:motion-reduce:bg-indigo-500/20 dark:motion-reduce:shadow-[inset_3px_0_0_theme(colors.indigo.400)]",
                  )}
                >
                  <span className={cn("block h-10 w-10 overflow-hidden rounded-lg sm:h-11 sm:w-11", rarityBackground(5))}>
                    {icon && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={icon} alt="" className="h-full w-full object-cover" />
                    )}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate font-semibold leading-tight text-gray-900 dark:text-slate-100">{pull.name}</p>
                    <p className="text-xs text-gray-500 dark:text-slate-400">{wishDate(pull.time)}</p>
                  </div>
                  <div className="col-span-2 col-start-2 flex items-center gap-2 sm:col-span-1 sm:col-start-auto">
                    <span className="h-2.5 flex-1 overflow-hidden rounded-full bg-gray-100 dark:bg-slate-800" aria-hidden="true">
                      <span
                        className={cn("block h-full rounded-full", BANDS[band].bar)}
                        style={{ width: `${Math.min(100, Math.round((pity / (info.hardPity ?? 90)) * 100))}%` }}
                      />
                    </span>
                    <span className="w-8 text-right font-semibold tabular-nums text-gray-900 dark:text-slate-100">{pity}</span>
                    <span className="w-24 text-xs text-gray-500 dark:text-slate-400">
                      <span className="sr-only">wishes, </span>
                      {BANDS[band].label}
                    </span>
                  </div>
                  <div className="col-start-3 row-start-1 text-right sm:col-start-auto sm:row-start-auto">
                    {fiftyFifty && <span className={cn(chipClass, FIFTY_FIFTY[fiftyFifty].chip)}>{FIFTY_FIFTY[fiftyFifty].label}</span>}
                  </div>
                </li>
              );
            })}
          </ol>
          {pages > 1 && (
            <div className="mt-3 flex items-center justify-end gap-2">
              <span className="text-sm text-gray-500 dark:text-slate-400" aria-live="polite">
                Page {current + 1} of {pages}
              </span>
              <Button size="sm" variant="outline" disabled={current === 0} onClick={() => turnPage(current - 1)}>
                Previous
              </Button>
              <Button size="sm" variant="outline" disabled={current >= pages - 1} onClick={() => turnPage(current + 1)}>
                Next
              </Button>
            </div>
          )}
        </>
      )}

      <p className="sr-only" aria-live="polite">
        {found.length > 0 && `Found in the 5★ history: ${found.map(({ pull }) => `${pull.name}, ${wishDate(pull.time)}`).join("; ")}.`}
      </p>

      <WishesPerMonth pulls={pulls} pool={pool} label={info.label} picked={picked?.month ?? null} onPickMonth={pickMonth} />
    </div>
  );
}

function Tile({ value, unit, label, detail }: { value: string; unit?: string; label: string; detail?: string }) {
  return (
    <div className="rounded-lg border bg-card p-3 text-card-foreground shadow-sm sm:p-4">
      <span className="block text-2xl font-bold tabular-nums text-indigo-900 dark:text-indigo-200">
        {value}
        {unit && <span className="text-sm font-medium text-gray-500 dark:text-slate-400">{unit}</span>}
      </span>
      <span className="block text-sm font-semibold">{label}</span>
      {detail && <span className="block text-xs text-gray-500 dark:text-slate-400">{detail}</span>}
    </div>
  );
}
