"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useGenshinData } from "@/hooks/useGenshinData";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import GenshinShell from "@/components/GenshinShell";
import RequireAuth from "@/components/RequireAuth";
import Segmented from "@/components/Segmented";
import CharacterAvatar from "@/components/CharacterAvatar";
import { cn, formatCharacterDisplayName } from "@/lib/utils";
import { formatSlotName, formatStat, formatStatName } from "@/lib/genshin/stats";
import type { GoodArtifact } from "@/lib/genshin/types";
import {
  ALL_ARTIFACT_SETS,
  activeSets,
  artifactSetId,
  artifactSetName,
} from "@/lib/genshin/artifactSets";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Show = "equipped" | "all" | "unequipped";

const ALL_SETS = "__all__";

/** Cards drawn at a time in the All and Unequipped views; "Show more" adds this many. */
const PAGE_SIZE = 60;

const SLOT_ORDER = ["flower", "plume", "sands", "goblet", "circlet"];
const bySlot = (a: GoodArtifact, b: GoodArtifact) =>
  SLOT_ORDER.indexOf(a.slotKey) - SLOT_ORDER.indexOf(b.slotKey);

export default function ArtifactsPage() {
  return (
    <RequireAuth>
      <Artifacts />
    </RequireAuth>
  );
}

function Artifacts() {
  const { data: genshinData } = useGenshinData();
  // Equipped is the default: a few hundred pieces grouped by character loads
  // quickly, where drawing every artifact at once was slow.
  const [show, setShow] = useState<Show>("equipped");
  const [limit, setLimit] = useState(PAGE_SIZE);
  const [setFilter, setSetFilter] = useState(ALL_SETS);
  const artifacts = useMemo(() => genshinData?.artifacts ?? [], [genshinData]);

  const equippedCount = useMemo(() => artifacts.filter((a) => a.location).length, [artifacts]);

  // Each character's equipped pieces, characters A–Z, pieces in slot order.
  const groups = useMemo(() => {
    const byCharacter = new Map<string, GoodArtifact[]>();
    for (const artifact of artifacts) {
      if (!artifact.location) continue;
      const list = byCharacter.get(artifact.location) ?? [];
      list.push(artifact);
      byCharacter.set(artifact.location, list);
    }
    return [...byCharacter.entries()]
      .map(([key, pieces]) => ({ key, name: formatCharacterDisplayName(key), pieces: pieces.sort(bySlot) }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [artifacts]);

  // The All or Unequipped list before the set filter, which the set counts describe.
  const viewList = useMemo(
    () => (show === "unequipped" ? artifacts.filter((a) => !a.location) : artifacts),
    [artifacts, show]
  );

  // Every set in the game data, grouped by the version it was released in
  // (newest first, A–Z within a version), with how many of the current view's
  // pieces belong to it. Owned sets newer than the data come first.
  const setGroups = useMemo(() => {
    const counts = new Map<string, number>();
    const ownedNames = new Map<string, string>();
    for (const a of viewList) {
      const id = artifactSetId(a.setKey);
      counts.set(id, (counts.get(id) ?? 0) + 1);
      ownedNames.set(id, artifactSetName(a.setKey));
    }
    const withCount = (set: { id: string; name: string }) => ({
      ...set,
      count: counts.get(set.id) ?? 0,
    });
    const known = new Set(ALL_ARTIFACT_SETS.map((set) => set.id));
    const newer = [...ownedNames]
      .filter(([id]) => !known.has(id))
      .map(([id, name]) => withCount({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name));

    const groups: { label: string; sets: { id: string; name: string; count: number }[] }[] = [];
    if (newer.length > 0) groups.push({ label: "Newer sets", sets: newer });
    // ALL_ARTIFACT_SETS is already newest first, so consecutive sets share a version.
    for (const set of ALL_ARTIFACT_SETS) {
      const label = set.version ? `Version ${set.version}` : "Unknown version";
      const last = groups[groups.length - 1];
      if (last?.label === label) last.sets.push(withCount(set));
      else groups.push({ label, sets: [withCount(set)] });
    }
    return groups;
  }, [viewList]);

  const flatList = useMemo(
    () =>
      setFilter === ALL_SETS
        ? viewList
        : viewList.filter((a) => artifactSetId(a.setKey) === setFilter),
    [viewList, setFilter]
  );

  const changeShow = (next: Show) => {
    setShow(next);
    setLimit(PAGE_SIZE);
  };

  const changeSetFilter = (next: string) => {
    setSetFilter(next);
    setLimit(PAGE_SIZE);
  };

  if (artifacts.length === 0) {
    return (
      <GenshinShell title="Artifacts">
        <p className="text-gray-600 dark:text-slate-400">
          No artifacts yet. Upload your data on the Genshin overview to see them here.
        </p>
      </GenshinShell>
    );
  }

  return (
    <GenshinShell title="Artifacts">
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <Segmented
          label="Show"
          value={show}
          onChange={changeShow}
          options={[
            { value: "equipped", label: `Equipped (${equippedCount.toLocaleString()})` },
            { value: "all", label: `All (${artifacts.length.toLocaleString()})` },
            {
              value: "unequipped",
              label: `Unequipped (${(artifacts.length - equippedCount).toLocaleString()})`,
            },
          ]}
        />
        {show !== "equipped" && (
          <div className="flex items-center gap-2">
            <label htmlFor="artifact-set" className="text-sm font-medium">
              Set:
            </label>
            <Select value={setFilter} onValueChange={changeSetFilter}>
              <SelectTrigger id="artifact-set" className="w-[17rem]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="max-h-80">
                <SelectItem value={ALL_SETS}>All sets ({viewList.length.toLocaleString()})</SelectItem>
                {setGroups.map((group) => (
                  <SelectGroup key={group.label}>
                    <SelectLabel className="text-xs text-indigo-700 dark:text-indigo-300">
                      {group.label}
                    </SelectLabel>
                    {group.sets.map((set) => (
                      // Sets with no pieces in this view stay listed but can't be picked.
                      <SelectItem key={set.id} value={set.id} disabled={set.count === 0}>
                        {set.name} ({set.count.toLocaleString()})
                      </SelectItem>
                    ))}
                  </SelectGroup>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {show === "equipped" ? (
        groups.length === 0 ? (
          <p className="text-gray-600 dark:text-slate-400">No artifacts are equipped.</p>
        ) : (
          <div className="space-y-3">
            {/* Column headings, shown where the five slots sit side by side. */}
            <div className="hidden lg:grid lg:grid-cols-[14rem_repeat(5,minmax(0,1fr))] gap-3 px-3 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-400">
              <span>Character</span>
              {SLOT_ORDER.map((slot) => (
                <span key={slot}>{formatSlotName(slot)}</span>
              ))}
            </div>
            {groups.map((group) => (
              <EquippedRow key={group.key} characterKey={group.key} name={group.name} pieces={group.pieces} />
            ))}
          </div>
        )
      ) : (
        <>
          <p className="mb-4 text-sm text-gray-500 dark:text-slate-400">
            Showing {Math.min(limit, flatList.length).toLocaleString()} of{" "}
            {flatList.length.toLocaleString()}
          </p>
          <ArtifactGrid artifacts={flatList.slice(0, limit)} />
          {limit < flatList.length && (
            <div className="mt-8 flex justify-center">
              <Button variant="outline" onClick={() => setLimit((n) => n + PAGE_SIZE)}>
                Show {Math.min(PAGE_SIZE, flatList.length - limit)} more
              </Button>
            </div>
          )}
        </>
      )}
    </GenshinShell>
  );
}

/**
 * One character's equipped set: portrait and name, then a fixed column per
 * slot so the same slot lines up from row to row. On narrower screens the
 * slots scroll sideways inside the row.
 */
function EquippedRow({
  characterKey,
  name,
  pieces,
}: {
  characterKey: string;
  name: string;
  pieces: GoodArtifact[];
}) {
  const sets = activeSets(pieces);
  return (
    <section className="rounded-xl border border-gray-200 dark:border-slate-700 p-3 lg:grid lg:grid-cols-[14rem_repeat(5,minmax(0,1fr))] lg:items-stretch gap-3">
      <div className="mb-3 lg:mb-0">
        <div className="flex items-center gap-3">
          <CharacterAvatar characterKey={characterKey} size={48} />
          <div className="min-w-0">
            <Link
              href={`/genshin/characters/${encodeURIComponent(characterKey)}`}
              className="block font-semibold leading-tight text-indigo-900 dark:text-indigo-200 hover:underline underline-offset-2"
            >
              {name}
            </Link>
            <span className="text-xs text-gray-500 dark:text-slate-400">
              {pieces.length} of 5 equipped
            </span>
          </div>
        </div>
        {sets.map((set) => {
          const name = artifactSetName(set.setKey);
          // A set newer than the game data shows a placeholder (fix: update genshin-db, run npm run data:genshin).
          const missing = "Set bonus not available yet.";
          return (
            <div key={set.setKey} className="mt-2 space-y-1.5 text-xs">
              <SetBonus pieces={2} name={name} text={set.info?.twoPiece ?? missing} />
              {set.count >= 4 && (
                <SetBonus pieces={4} name={name} text={set.info?.fourPiece ?? missing} />
              )}
            </div>
          );
        })}
      </div>
      {/* Scrolls sideways below lg, so it takes focus for keyboard scrolling. */}
      <div
        tabIndex={0}
        role="group"
        aria-label={`${name}'s artifacts`}
        className="flex gap-3 overflow-x-auto pb-1 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 lg:contents"
      >
        {SLOT_ORDER.map((slot) => {
          const piece = pieces.find((p) => p.slotKey === slot);
          return piece ? (
            <SlotCard key={slot} artifact={piece} />
          ) : (
            <div
              key={slot}
              className="flex w-44 shrink-0 items-center justify-center rounded-lg border border-dashed border-gray-300 dark:border-slate-600 p-3 text-center text-xs text-gray-500 dark:text-slate-400 lg:w-auto"
            >
              No {formatSlotName(slot).split(" ")[0].toLowerCase()}
            </div>
          );
        })}
      </div>
    </section>
  );
}

/** One set bonus: a badge (gold for 4-piece, indigo for 2-piece) and its text. */
function SetBonus({ pieces, name, text }: { pieces: 2 | 4; name: string; text: string }) {
  return (
    <div>
      <span
        className={cn(
          "inline-block rounded-full px-2 py-0.5 font-semibold",
          pieces === 4
            ? "bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-200"
            : "bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300"
        )}
      >
        {pieces}-piece · {name}
      </span>
      <SetBonusText text={text} />
    </div>
  );
}

/** Set bonus text cut to four lines, with More / Less when it's longer. */
function SetBonusText({ text }: { text: string }) {
  const [expanded, setExpanded] = useState(false);
  const long = text.length > 140;
  return (
    <div className="mt-1 leading-snug text-gray-600 dark:text-slate-400">
      <p className={cn(long && !expanded && "line-clamp-4")}>{text}</p>
      {long && (
        <button
          type="button"
          aria-expanded={expanded}
          onClick={() => setExpanded((v) => !v)}
          className="mt-0.5 font-medium text-indigo-600 dark:text-indigo-400 hover:underline underline-offset-2"
        >
          {expanded ? "Less" : "More"}
        </button>
      )}
    </div>
  );
}

/** A compact artifact for the equipped rows. */
function SlotCard({ artifact }: { artifact: GoodArtifact }) {
  return (
    <div className="w-44 shrink-0 rounded-lg bg-indigo-50/50 dark:bg-indigo-900/20 ring-1 ring-indigo-100 dark:ring-indigo-900 p-3 text-xs lg:w-auto">
      <div className="flex items-center justify-between gap-2 text-gray-500 dark:text-slate-400">
        <span className="font-semibold uppercase tracking-wide text-indigo-700 dark:text-indigo-300 lg:hidden">
          {formatSlotName(artifact.slotKey).split(" ")[0]}
        </span>
        <span>
          {artifact.rarity}★ · Lv. {artifact.level}
        </span>
      </div>
      <p className="mt-1 line-clamp-2 text-sm font-medium leading-snug text-gray-900 dark:text-slate-100">
        {artifactSetName(artifact.setKey)}
      </p>
      {artifact.mainStatKey && (
        <p className="mt-1 font-semibold text-indigo-900 dark:text-indigo-200">
          {formatStatName(artifact.mainStatKey)}
        </p>
      )}
      {artifact.substats.length > 0 && (
        <ul className="mt-1 space-y-0.5 text-gray-600 dark:text-slate-400">
          {artifact.substats.map((substat, i) => (
            <li key={i}>{formatStat(substat.key, substat.value)}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

function ArtifactGrid({ artifacts }: { artifacts: GoodArtifact[] }) {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
      {artifacts.map((artifact, index) => (
        <ArtifactCard key={index} artifact={artifact} />
      ))}
    </div>
  );
}

function ArtifactCard({ artifact }: { artifact: GoodArtifact }) {
  const setName = artifactSetName(artifact.setKey);
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-3 text-lg">
          {/* public/artifact-icons/ is empty until Phase 4 adds set icons, so
              show the placeholder directly instead of requesting a missing file. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/placeholder.svg" alt="" width={48} height={48} className="h-12 w-12 shrink-0 rounded-md" />
          <span className="min-w-0 flex-1">{setName}</span>
          {artifact.location && (
            <CharacterAvatar
              characterKey={artifact.location}
              label={`Equipped by ${formatCharacterDisplayName(artifact.location)}`}
            />
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-0.5 text-sm text-gray-700 dark:text-slate-300">
        <p>
          {formatSlotName(artifact.slotKey)} · {artifact.rarity}★ · Lv. {artifact.level}
          {artifact.lock && " · Locked"}
        </p>
        {artifact.mainStatKey && (
          <p className="font-medium text-gray-900 dark:text-slate-100">
            {formatStatName(artifact.mainStatKey)}
          </p>
        )}
        {artifact.substats.length > 0 && (
          <ul className="list-disc pl-5 pt-1">
            {artifact.substats.map((substat, subIndex) => (
              <li key={subIndex}>{formatStat(substat.key, substat.value)}</li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
