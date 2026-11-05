"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useGenshinData } from "@/hooks/useGenshinData";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import GenshinShell from "@/components/GenshinShell";
import RequireAuth from "@/components/RequireAuth";
import Segmented from "@/components/Segmented";
import SearchInput from "@/components/SearchInput";
import { ClearFilters, FilterChip } from "@/components/FilterChip";
import CharacterAvatar from "@/components/CharacterAvatar";
import ArtifactIcon from "@/components/ArtifactIcon";
import ArtifactSetBonuses from "@/components/ArtifactSetBonuses";
import ArtifactSlotCard from "@/components/ArtifactSlotCard";
import SignedOutBanner, { EmptyList } from "@/components/SignedOutBanner";
import { formatCharacterDisplayName } from "@/lib/utils";
import { formatSlotName, formatStat, formatStatName } from "@/lib/genshin/stats";
import type { GoodArtifact } from "@/lib/genshin/types";
import {
  ALL_ARTIFACT_SETS,
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
const ANY_MAIN_STAT = "__any__";

/** Flowers and plumes only ever have one main stat, so filtering them by it does nothing. */
const SINGLE_MAIN_STAT = ["flower", "plume"];

type ArtifactSort = "upload" | "level-desc" | "level-asc" | "set";

/** Cards drawn at a time in the All and Unequipped views; "Show more" adds this many. */
const PAGE_SIZE = 60;

const SLOT_ORDER = ["flower", "plume", "sands", "goblet", "circlet"];
const bySlot = (a: GoodArtifact, b: GoodArtifact) =>
  SLOT_ORDER.indexOf(a.slotKey) - SLOT_ORDER.indexOf(b.slotKey);

export default function ArtifactsPage() {
  return (
    <RequireAuth signedOut={<Artifacts signedOut />}>
      <Artifacts />
    </RequireAuth>
  );
}

/** Signed out, the page shows the log-in banner, the Show toggle faded and disabled, and an empty list. */
function Artifacts({ signedOut = false }: { signedOut?: boolean }) {
  const { data: genshinData } = useGenshinData();
  // Equipped is the default: a few hundred pieces grouped by character loads
  // quickly, where drawing every artifact at once was slow.
  const [show, setShow] = useState<Show>("equipped");
  const [limit, setLimit] = useState(PAGE_SIZE);
  const [setFilter, setSetFilter] = useState(ALL_SETS);
  const [slotFilter, setSlotFilter] = useState<string | null>(null);
  const [mainStatFilter, setMainStatFilter] = useState(ANY_MAIN_STAT);
  const [sort, setSort] = useState<ArtifactSort>("upload");
  const [characterSearch, setCharacterSearch] = useState("");
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

  const visibleGroups = useMemo(() => {
    const query = characterSearch.trim().toLowerCase();
    return query ? groups.filter((group) => group.name.toLowerCase().includes(query)) : groups;
  }, [groups, characterSearch]);

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

  // The list the main stat dropdown describes: every filter except main stat.
  const beforeMainStat = useMemo(
    () =>
      viewList.filter(
        (a) =>
          (setFilter === ALL_SETS || artifactSetId(a.setKey) === setFilter) &&
          (!slotFilter || a.slotKey === slotFilter)
      ),
    [viewList, setFilter, slotFilter]
  );

  const mainStats = useMemo(() => {
    const counts = new Map<string, number>();
    for (const a of beforeMainStat) {
      if (a.mainStatKey) counts.set(a.mainStatKey, (counts.get(a.mainStatKey) ?? 0) + 1);
    }
    return [...counts]
      .map(([key, count]) => ({ key, count, name: formatStatName(key) }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [beforeMainStat]);

  const flatList = useMemo(() => {
    const list =
      mainStatFilter === ANY_MAIN_STAT
        ? [...beforeMainStat]
        : beforeMainStat.filter((a) => a.mainStatKey === mainStatFilter);
    if (sort === "level-desc") list.sort((a, b) => b.level - a.level);
    if (sort === "level-asc") list.sort((a, b) => a.level - b.level);
    if (sort === "set") list.sort((a, b) => artifactSetName(a.setKey).localeCompare(artifactSetName(b.setKey)));
    return list;
  }, [beforeMainStat, mainStatFilter, sort]);

  const filterCount =
    Number(setFilter !== ALL_SETS) + Number(slotFilter !== null) + Number(mainStatFilter !== ANY_MAIN_STAT);

  const changeShow = (next: Show) => {
    setShow(next);
    setLimit(PAGE_SIZE);
  };

  const changeSetFilter = (next: string) => {
    setSetFilter(next);
    setMainStatFilter(ANY_MAIN_STAT);
    setLimit(PAGE_SIZE);
  };

  const changeSlotFilter = (next: string | null) => {
    setSlotFilter(next);
    setMainStatFilter(ANY_MAIN_STAT);
    setLimit(PAGE_SIZE);
  };

  const clearFilters = () => {
    setSetFilter(ALL_SETS);
    setSlotFilter(null);
    setMainStatFilter(ANY_MAIN_STAT);
    setLimit(PAGE_SIZE);
  };

  if (signedOut) {
    return (
      <GenshinShell title="Artifacts">
        <SignedOutBanner>Log in and upload your account to see your artifacts here.</SignedOutBanner>
        <fieldset disabled className="mb-6 opacity-50">
          <legend className="sr-only">Artifact views (log in to use them)</legend>
          <Segmented
            label="Show"
            value={show}
            onChange={changeShow}
            options={[
              { value: "equipped", label: "Equipped (0)" },
              { value: "all", label: "All (0)" },
              { value: "unequipped", label: "Unequipped (0)" },
            ]}
          />
        </fieldset>
        <EmptyList>No artifacts to show yet.</EmptyList>
      </GenshinShell>
    );
  }

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
      <div className="mb-6 space-y-3">
        <div className="flex flex-wrap items-center gap-3">
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
          {show === "equipped" ? (
            <SearchInput value={characterSearch} onChange={setCharacterSearch} label="Search by character" />
          ) : (
            <div className="flex items-center gap-2">
              <label htmlFor="artifact-sort" className="text-sm font-medium">
                Sort by:
              </label>
              <Select
                value={sort}
                onValueChange={(next) => {
                  setSort(next as ArtifactSort);
                  setLimit(PAGE_SIZE);
                }}
              >
                <SelectTrigger id="artifact-sort" className="w-[11.5rem]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="upload">Upload order</SelectItem>
                  <SelectItem value="level-desc">Level (High to Low)</SelectItem>
                  <SelectItem value="level-asc">Level (Low to High)</SelectItem>
                  <SelectItem value="set">Set (A-Z)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
        {show !== "equipped" && (
          <>
          <div role="group" aria-label="Filter by slot" className="flex flex-wrap gap-2">
            {SLOT_ORDER.map((slot) => (
              <FilterChip
                key={slot}
                pressed={slotFilter === slot}
                onClick={() => changeSlotFilter(slotFilter === slot ? null : slot)}
              >
                {formatSlotName(slot).split(" ")[0]}
              </FilterChip>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <label htmlFor="artifact-set" className="text-sm font-medium">
              Set:
            </label>
            <Select value={setFilter} onValueChange={changeSetFilter}>
              <SelectTrigger id="artifact-set" className="w-[15rem] sm:w-[17rem]">
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
          {!(slotFilter && SINGLE_MAIN_STAT.includes(slotFilter)) && (
            <div className="flex items-center gap-2">
              <label htmlFor="artifact-main-stat" className="text-sm font-medium">
                Main stat:
              </label>
              <Select
                value={mainStatFilter}
                onValueChange={(next) => {
                  setMainStatFilter(next);
                  setLimit(PAGE_SIZE);
                }}
              >
                <SelectTrigger id="artifact-main-stat" className="w-[14rem]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="max-h-80">
                  <SelectItem value={ANY_MAIN_STAT}>Any</SelectItem>
                  {mainStatFilter !== ANY_MAIN_STAT && !mainStats.some((m) => m.key === mainStatFilter) && (
                    <SelectItem value={mainStatFilter}>{formatStatName(mainStatFilter)} (0)</SelectItem>
                  )}
                  {mainStats.map((stat) => (
                    <SelectItem key={stat.key} value={stat.key}>
                      {stat.name} ({stat.count.toLocaleString()})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <ClearFilters count={filterCount} onClick={clearFilters} />
          </div>
          </>
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
            {characterSearch.trim() && (
              <p className="text-sm text-gray-500 dark:text-slate-400" aria-live="polite">
                {visibleGroups.length === 0
                  ? "No equipped characters match that name."
                  : `Showing ${visibleGroups.length} of ${groups.length} characters`}
              </p>
            )}
            {visibleGroups.map((group) => (
              <EquippedRow key={group.key} characterKey={group.key} name={group.name} pieces={group.pieces} />
            ))}
          </div>
        )
      ) : (
        <>
          <p className="mb-4 text-sm text-gray-500 dark:text-slate-400" aria-live="polite">
            {flatList.length === 0
              ? "No artifacts match these filters."
              : `Showing ${Math.min(limit, flatList.length).toLocaleString()} of ${flatList.length.toLocaleString()}`}
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
        <ArtifactSetBonuses pieces={pieces} className="mt-2 text-xs" />
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
            <ArtifactSlotCard key={slot} artifact={piece} slotNameNarrowOnly className="w-44 shrink-0 lg:w-auto" />
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
          <ArtifactIcon artifact={artifact} />
          <span className="min-w-0 flex-1">{setName}</span>
          {artifact.location && (
            <CharacterAvatar
              characterKey={artifact.location}
              label={`Equipped by ${formatCharacterDisplayName(artifact.location)}`}
            />
          )}
        </CardTitle>
      </CardHeader>
      {/* Main stat and substats styled like the Equipped slot cards. */}
      <CardContent className="text-sm">
        <p className="text-gray-500 dark:text-slate-400">
          {formatSlotName(artifact.slotKey)} · {artifact.rarity}★ · Lv. {artifact.level}
          {artifact.lock && " · Locked"}
        </p>
        {artifact.mainStatKey && (
          <p className="mt-2 font-semibold text-indigo-900 dark:text-indigo-200">
            {formatStatName(artifact.mainStatKey)}
          </p>
        )}
        {artifact.substats.length > 0 && (
          <ul className="mt-2 space-y-0.5 text-gray-600 dark:text-slate-400">
            {artifact.substats.map((substat, subIndex) => (
              <li key={subIndex}>{formatStat(substat.key, substat.value)}</li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
