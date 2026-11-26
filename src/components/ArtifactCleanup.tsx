"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Bookmark, X } from "lucide-react";
import { useGenshinData } from "@/hooks/useGenshinData";
import { useRememberedState } from "@/hooks/useRememberedState";
import { Button } from "@/components/ui/button";
import { FilterChip, NoMatches } from "@/components/FilterChip";
import ArtifactCard from "@/components/ArtifactCard";
import ArtifactIcon from "@/components/ArtifactIcon";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn, formatCharacterDisplayName } from "@/lib/utils";
import { formatSlotName } from "@/lib/genshin/stats";
import { artifactSetName } from "@/lib/genshin/artifactSets";
import { critValue } from "@/lib/genshin/artifactScore";
import {
  MAX_KEEP_MARKS,
  critLines,
  levelingRange,
  toggleKeepMark,
  type CleanupEntry,
  type CleanupReason,
  type KeepMark,
} from "@/lib/genshin/artifactCleanup";
import type { GoodArtifact } from "@/lib/genshin/types";

const PAGE_SIZE = 60;

const REASONS: { value: CleanupReason; label: string }[] = [
  { value: "beaten", label: "Beaten" },
  { value: "weakStart", label: "Weak at +0" },
  { value: "lowRarity", label: "4★ or lower" },
];

/** The "What the reasons mean" fold-out under the chips. */
const HELP: { term: string; text: string }[] = [
  {
    term: "Beaten",
    text: "Another piece you own of the same set, slot, main stat and rarity is at least as high a level and has more Crit Value. Only pieces with a CRIT substat are compared: one without was built for other stats, like Energy Recharge or HP on a support.",
  },
  {
    term: "Weak at +0",
    text: "Not leveled yet, and it starts with at most one CRIT substat (a CRIT circlet: none). Pieces that start with both CRIT stats are left out, since they're worth a try.",
  },
  { term: "4★ or lower", text: "Below 5★. These are mostly fed to other pieces as EXP." },
  {
    term: "Kept",
    text: "Pieces you marked Keep. Cleanup never lists them, even when they're unlocked in the game. Press Kept on one to let it be listed again.",
  },
  {
    term: "Worth leveling?",
    text: "The lowest and highest Crit Value the piece could have at +20, from its substats, the upgrades it has left and the game's roll values. Plain math, not a prediction.",
  },
];

type CleanupSort ="cv-asc" | "cv-desc" | "level-asc" | "level-desc" | "set" | "upload";

/** "Noblesse Oblige plume", for labels and messages. */
const pieceName = (a: GoodArtifact) => `${artifactSetName(a.setKey)} ${formatSlotName(a.slotKey).split(" ")[0].toLowerCase()}`;

/**
 * The Artifacts page's Cleanup view: unlocked pieces likely safe to feed or
 * throw away, each with the reasons it's listed, its "worth leveling" range,
 * and a Keep button that stops it being listed. `entries` comes from
 * `cleanupList` and `kept` from `matchKeepMarks`, which the page also uses for
 * the Show toggle's count.
 */
export default function ArtifactCleanup({
  artifacts,
  entries,
  kept,
}: {
  artifacts: GoodArtifact[];
  entries: CleanupEntry[];
  kept: ReadonlySet<number>;
}) {
  const { keepMarks, setKeepMarks, droppedKeepMarks } = useGenshinData();
  const [reason, setReason] = useRememberedState<CleanupReason | null>("artifacts:cleanupReason", null);
  const [sort, setSort] = useRememberedState<CleanupSort>("artifacts:cleanupSort", "cv-asc");
  const [showKept, setShowKept] = useState(false);
  const [limit, setLimit] = useState(PAGE_SIZE);
  // The last Keep or Stop keeping, for the status line and its Undo. A new
  // object each time, so pressing the same piece twice still runs the effects.
  // `before` and `after` are the marks around it: the line shows while the
  // marks are still `after`, and Undo saves `before` again. (Two identical
  // pieces can trade places, so the line doesn't go by which piece is kept.)
  const [lastChange, setLastChange] = useState<{
    index: number;
    kept: boolean;
    before: KeepMark[];
    after: KeepMark[];
  } | null>(null);
  // After Undo, the piece's own Keep button takes focus back.
  const [restored, setRestored] = useState<{ index: number } | null>(null);
  const [saveFailed, setSaveFailed] = useState(false);
  const [droppedSeen, setDroppedSeen] = useState(false);
  const undo = useRef<HTMLButtonElement>(null);
  const full = keepMarks.length >= MAX_KEEP_MARKS;

  // The piece just pressed leaves the view it was in, so focus moves to Undo.
  useEffect(() => {
    if (lastChange !== null) undo.current?.focus();
  }, [lastChange]);
  useEffect(() => {
    if (restored === null) return;
    // The piece may land past the cards shown, so fall back to the results line.
    (document.getElementById(`cleanup-keep-${restored.index}`) ?? document.getElementById("cleanup-results"))?.focus();
  }, [restored]);

  const counts = useMemo(() => {
    const c: Record<CleanupReason, number> = { beaten: 0, weakStart: 0, lowRarity: 0 };
    for (const e of entries) for (const r of e.reasons) c[r]++;
    return c;
  }, [entries]);

  const list = useMemo(() => {
    const out = reason ? entries.filter((e) => e.reasons.includes(reason)) : [...entries];
    const cv = (e: CleanupEntry) => critValue(e.artifact);
    if (sort === "cv-asc") out.sort((a, b) => cv(a) - cv(b));
    if (sort === "cv-desc") out.sort((a, b) => cv(b) - cv(a));
    if (sort === "level-asc") out.sort((a, b) => a.artifact.level - b.artifact.level);
    if (sort === "level-desc") out.sort((a, b) => b.artifact.level - a.artifact.level);
    if (sort === "set") out.sort((a, b) => artifactSetName(a.artifact.setKey).localeCompare(artifactSetName(b.artifact.setKey)));
    return out;
  }, [entries, reason, sort]);

  const keptList = useMemo(() => [...kept].sort((a, b) => a - b), [kept]);

  const save = (marks: KeepMark[]) => {
    setSaveFailed(false);
    void setKeepMarks(marks).then((saved) => {
      if (saved) return;
      setSaveFailed(true);
      setLastChange(null);
    });
  };

  const toggleKeep = (index: number) => {
    const after = toggleKeepMark(keepMarks, artifacts, index);
    setLastChange({ index, kept: !kept.has(index), before: keepMarks, after });
    save(after);
  };

  const undoLast = () => {
    if (!lastChange) return;
    save(lastChange.before);
    setLastChange(null);
    setRestored({ index: lastChange.index });
  };

  const chooseReason = (next: CleanupReason) => {
    setReason(reason === next ? null : next);
    setShowKept(false);
    setLimit(PAGE_SIZE);
  };

  const keepButton = (index: number) => {
    const isKept = kept.has(index);
    const name = pieceName(artifacts[index]);
    return (
      <Button
        id={`cleanup-keep-${index}`}
        type="button"
        variant="outline"
        size="sm"
        aria-pressed={isKept}
        aria-label={isKept ? `Stop keeping ${name}` : `Keep ${name}`}
        disabled={!isKept && full}
        onClick={() => toggleKeep(index)}
        className={cn(
          "mt-3",
          isKept && "border-indigo-600 bg-indigo-50 text-indigo-800 hover:bg-indigo-100 dark:border-indigo-400 dark:bg-indigo-950 dark:text-indigo-200 dark:hover:bg-indigo-900"
        )}
      >
        <Bookmark aria-hidden="true" className="mr-1.5 h-4 w-4" fill={isKept ? "currentColor" : "none"} />
        {isKept ? "Kept" : "Keep"}
      </Button>
    );
  };

  const keptAnnouncement =
    lastChange !== null && keepMarks === lastChange.after ? (
      <p
        role="status"
        className="mb-4 flex flex-wrap items-center gap-x-2 rounded-md bg-gray-50 px-3 py-2 text-sm text-gray-700 dark:bg-slate-800/60 dark:text-slate-300"
      >
        {lastChange.kept
          ? `Kept the ${pieceName(artifacts[lastChange.index])}. It won't be listed again.`
          : `Stopped keeping the ${pieceName(artifacts[lastChange.index])}. It can be listed again.`}
        <button
          ref={undo}
          type="button"
          onClick={undoLast}
          className="font-medium text-indigo-700 underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:text-indigo-300 dark:focus-visible:ring-indigo-400"
        >
          Undo
        </button>
      </p>
    ) : null;

  return (
    <div>
      <p className="mb-3 max-w-3xl text-sm text-gray-600 dark:text-slate-400">
        Pieces that are likely safe to feed or throw away, each with the reason it&apos;s here. Locked pieces and
        pieces you mark Keep are never listed. Nothing is deleted: this only reads your upload.
      </p>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium" aria-hidden>
            Reason:
          </span>
          <div role="group" aria-label="Filter by reason" className="flex flex-wrap gap-2">
            {REASONS.map(({ value, label }) => (
              <FilterChip key={value} pressed={!showKept && reason === value} onClick={() => chooseReason(value)}>
                {label} ({counts[value].toLocaleString()})
              </FilterChip>
            ))}
          </div>
          <span className="hidden h-5 w-px bg-gray-200 dark:bg-slate-700 sm:block" aria-hidden />
          <FilterChip
            pressed={showKept}
            onClick={() => {
              setShowKept((open) => !open);
              setLastChange(null);
              setLimit(PAGE_SIZE);
            }}
          >
            Kept ({kept.size.toLocaleString()})
          </FilterChip>
        </div>
        {!showKept && (
          <div className="flex items-center gap-2">
            <label htmlFor="cleanup-sort" className="text-sm font-medium">
              Sort by:
            </label>
            <Select
              value={sort}
              onValueChange={(next) => {
                setSort(next as CleanupSort);
                setLimit(PAGE_SIZE);
              }}
            >
              <SelectTrigger id="cleanup-sort" className="w-[13rem]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cv-asc">Crit Value (Low to High)</SelectItem>
                <SelectItem value="cv-desc">Crit Value (High to Low)</SelectItem>
                <SelectItem value="level-asc">Level (Low to High)</SelectItem>
                <SelectItem value="level-desc">Level (High to Low)</SelectItem>
                <SelectItem value="set">Set (A-Z)</SelectItem>
                <SelectItem value="upload">Upload order</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      <details className="mb-4 max-w-3xl text-sm">
        <summary className="cursor-pointer text-indigo-700 dark:text-indigo-300">What the reasons mean</summary>
        <dl className="mt-2 space-y-2 rounded-md bg-gray-50 px-3 py-2 dark:bg-slate-800/60">
          {HELP.map(({ term, text }) => (
            <div key={term}>
              <dt className="font-medium text-gray-900 dark:text-slate-100">{term}</dt>
              <dd className="text-gray-600 dark:text-slate-400">{text}</dd>
            </div>
          ))}
        </dl>
      </details>

      {droppedKeepMarks > 0 && !droppedSeen && (
        <div className="mb-4 flex items-start gap-2 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-700 dark:bg-amber-950/60 dark:text-amber-100">
          <p className="min-w-0 flex-1">
            {droppedKeepMarks === 1
              ? "1 piece you marked Keep wasn't in your new upload, so its mark was removed. It may have been used up or deleted."
              : `${droppedKeepMarks.toLocaleString()} pieces you marked Keep weren't in your new upload, so their marks were removed. They may have been used up or deleted.`}
          </p>
          <button
            type="button"
            aria-label="Dismiss this note"
            onClick={() => setDroppedSeen(true)}
            className="-m-1 shrink-0 rounded p-1 text-amber-800 hover:bg-amber-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-600 dark:text-amber-200 dark:hover:bg-amber-900 dark:focus-visible:ring-amber-400"
          >
            <X aria-hidden="true" className="h-4 w-4" />
          </button>
        </div>
      )}
      {saveFailed && (
        <p
          role="alert"
          className="mb-4 rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-800 dark:bg-red-950/60 dark:text-red-200"
        >
          Couldn&apos;t save that change, so it was put back. Check your connection and try again.
        </p>
      )}
      {full && (
        <p className="mb-4 rounded-md bg-gray-50 px-3 py-2 text-sm text-gray-700 dark:bg-slate-800/60 dark:text-slate-300">
          You&apos;ve kept {MAX_KEEP_MARKS.toLocaleString()} pieces, the most the site saves. Lock pieces in the game
          instead, or stop keeping some.
        </p>
      )}
      {keptAnnouncement}

      {showKept ? (
        keptList.length === 0 ? (
          <p className="rounded-md border border-dashed border-gray-300 p-4 text-sm text-gray-600 dark:border-slate-600 dark:text-slate-400">
            No pieces kept yet. Press Keep on a listed piece and cleanup stops listing it, even if it isn&apos;t locked
            in the game.
          </p>
        ) : (
          <>
            <p id="cleanup-results" tabIndex={-1} className="mb-4 text-sm text-gray-500 focus:outline-none dark:text-slate-400">
              {keptList.length.toLocaleString()} kept. Press Kept to let a piece be listed again.
            </p>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {keptList.slice(0, limit).map((index) => (
                <ArtifactCard key={index} artifact={artifacts[index]}>
                  <LevelingRange artifact={artifacts[index]} />
                  {keepButton(index)}
                </ArtifactCard>
              ))}
            </div>
            <ShowMore shown={limit} total={keptList.length} onMore={() => setLimit((n) => n + PAGE_SIZE)} />
          </>
        )
      ) : entries.length === 0 ? (
        <p className="rounded-md bg-gray-50 p-4 text-sm text-gray-700 dark:bg-slate-800/60 dark:text-slate-300">
          Nothing to clean up. Every piece is locked, kept, or doesn&apos;t meet a rule.
        </p>
      ) : (
        <>
          <p
            id="cleanup-results"
            tabIndex={-1}
            className="mb-4 text-sm text-gray-500 focus:outline-none dark:text-slate-400"
            aria-live="polite"
          >
            {list.length === 0 ? (
              <NoMatches
                message="No pieces are listed for this reason."
                filters
                search={false}
                onClear={() => setReason(null)}
              />
            ) : (
              `Showing ${Math.min(limit, list.length).toLocaleString()} of ${list.length.toLocaleString()}`
            )}
          </p>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {list.slice(0, limit).map((entry) => (
              <ArtifactCard key={entry.index} artifact={entry.artifact}>
                <LevelingRange artifact={entry.artifact} />
                <Reasons entry={entry} artifacts={artifacts} />
                {entry.artifact.location && (
                  <p className="mt-2 text-xs text-gray-500 dark:text-slate-400">
                    Equipped by {formatCharacterDisplayName(entry.artifact.location)}: take it off in the game first.
                  </p>
                )}
                {keepButton(entry.index)}
              </ArtifactCard>
            ))}
          </div>
          <ShowMore shown={limit} total={list.length} onMore={() => setLimit((n) => n + PAGE_SIZE)} />
        </>
      )}
    </div>
  );
}

function ShowMore({ shown, total, onMore }: { shown: number; total: number; onMore: () => void }) {
  if (shown >= total) return null;
  return (
    <div className="mt-8 flex justify-center">
      <Button variant="outline" onClick={onMore}>
        Show {Math.min(PAGE_SIZE, total - shown)} more
      </Button>
    </div>
  );
}

/** "Worth leveling? CV 7.8 now, 7.8–46.6 at +20", for a 5★ piece below +20. */
function LevelingRange({ artifact }: { artifact: GoodArtifact }) {
  const range = levelingRange(artifact);
  if (!range) return null;
  return (
    <div className="mt-2 text-xs">
      <p className="font-medium text-gray-700 dark:text-slate-300">
        Worth leveling?{" "}
        {range.max === range.now
          ? `CV ${range.now} now, and it can't gain CRIT by +20`
          : `CV ${range.now} now, ${range.min}–${range.max} at +20`}
      </p>
      <p className="text-gray-500 dark:text-slate-400">
        {range.upgradesLeft} {range.upgradesLeft === 1 ? "upgrade" : "upgrades"} left, from the game&apos;s roll values
      </p>
    </div>
  );
}

/** The facts that put a piece on the list, with the piece that beats it. */
function Reasons({ entry, artifacts }: { entry: CleanupEntry; artifacts: GoodArtifact[] }) {
  const { artifact } = entry;
  const by = entry.beatenBy !== undefined ? artifacts[entry.beatenBy] : undefined;
  return (
    <ul className="mt-3 space-y-2 border-t border-gray-200 pt-3 text-xs dark:border-slate-700">
      {entry.reasons.map((r) => {
        if (r === "beaten" && by) {
          const where = [by.lock && "locked", by.location && `on ${formatCharacterDisplayName(by.location)}`].filter(Boolean);
          return (
            <li key={r} className="flex items-center gap-2">
              <ArtifactIcon artifact={by} size="xs" />
              <span className="min-w-0">
                <span className="block font-medium text-gray-800 dark:text-slate-200">
                  Beaten: your +{by.level} with CV {critValue(by)}
                </span>
                <span className="block text-gray-500 dark:text-slate-400">
                  Same set, slot and main stat{where.length ? `, ${where.join(", ")}` : ""}
                </span>
              </span>
            </li>
          );
        }
        if (r === "weakStart") {
          return (
            <li key={r} className="font-medium text-gray-800 dark:text-slate-200">
              {critLines(artifact) === 0
                ? "Unleveled, with no CRIT substat"
                : `Unleveled, CV ${critValue(artifact)}: one CRIT substat`}
            </li>
          );
        }
        return (
          <li key={r} className="font-medium text-gray-800 dark:text-slate-200">
            {artifact.rarity}★, often kept only as fodder
          </li>
        );
      })}
    </ul>
  );
}
