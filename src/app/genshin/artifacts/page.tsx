"use client";

import { useId, useLayoutEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight, ChevronDown } from "lucide-react";
import { useGenshinData } from "@/hooks/useGenshinData";
import { useRememberedState } from "@/hooks/useRememberedState";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import GenshinShell from "@/components/GenshinShell";
import RequireAuth from "@/components/RequireAuth";
import Segmented from "@/components/Segmented";
import SearchInput from "@/components/SearchInput";
import { ClearFilters, FilterChip, NoMatches, RARITY_CHIP } from "@/components/FilterChip";
import CharacterAvatar from "@/components/CharacterAvatar";
import ArtifactIcon from "@/components/ArtifactIcon";
import { CvBlock } from "@/components/ArtifactScore";
import ArtifactSetBonuses from "@/components/ArtifactSetBonuses";
import ArtifactSlotCard from "@/components/ArtifactSlotCard";
import ArtifactSubstats from "@/components/ArtifactSubstats";
import SignedOutBanner, { EmptyList } from "@/components/SignedOutBanner";
import { cn, formatCharacterDisplayName } from "@/lib/utils";
import { formatSlotName, formatStatName } from "@/lib/genshin/stats";
import {
  SCORE_TIERS,
  critValue,
  isLikelyFodder,
  roundCv,
  scoreTier,
  type ScoreTier,
} from "@/lib/genshin/artifactScore";
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

type ArtifactSort = "upload" | "cv-desc" | "cv-asc" | "level-desc" | "level-asc" | "set";
type EquippedSort = "name" | "cv-desc" | "cv-asc";
type LockFilter = "locked" | "unlocked";

/** How many of the five pieces a character has on: all of them, some of them, or none. */
type Completeness = "full" | "missing" | "none";

const COMPLETENESS: { value: Completeness; label: string }[] = [
  { value: "full", label: "Fully equipped" },
  { value: "missing", label: "Missing pieces" },
  { value: "none", label: "No artifacts" },
];

function completenessOf(pieces: GoodArtifact[]): Completeness {
  if (pieces.length === 0) return "none";
  return pieces.length >= SLOT_ORDER.length ? "full" : "missing";
}

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
  const [show, setShow] = useRememberedState<Show>("artifacts:show", "equipped");
  const [limit, setLimit] = useState(PAGE_SIZE);
  // The one Equipped row opened on a smaller screen.
  const [openRow, setOpenRow] = useState<string | null>(null);
  const [setFilter, setSetFilter] = useRememberedState("artifacts:set", ALL_SETS);
  const [slotFilter, setSlotFilter] = useRememberedState<string | null>("artifacts:slot", null);
  const [mainStatFilter, setMainStatFilter] = useRememberedState("artifacts:mainStat", ANY_MAIN_STAT);
  const [sort, setSort] = useRememberedState<ArtifactSort>("artifacts:sort", "upload");
  const [characterSearch, setCharacterSearch] = useRememberedState("artifacts:search", "");
  const [completeness, setCompleteness] = useRememberedState<Completeness | null>("artifacts:completeness", null);
  const [equippedSort, setEquippedSort] = useRememberedState<EquippedSort>("artifacts:equippedSort", "name");
  const [scoreFilter, setScoreFilter] = useRememberedState<ScoreTier | null>("artifacts:score", null);
  const [lockFilter, setLockFilter] = useRememberedState<LockFilter | null>("artifacts:lock", null);
  const [rarityFilter, setRarityFilter] = useRememberedState<number | null>("artifacts:rarity", null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  // The Show toggle takes focus from the summary tile that leads away from it.
  const showRow = useRef<HTMLDivElement>(null);
  const artifacts = useMemo(() => genshinData?.artifacts ?? [], [genshinData]);

  const equippedCount = useMemo(() => artifacts.filter((a) => a.location).length, [artifacts]);

  // Each character's equipped pieces, characters A–Z, pieces in slot order.
  // Every owned character gets a row, including those with nothing equipped.
  const groups = useMemo(() => {
    const byCharacter = new Map<string, GoodArtifact[]>();
    for (const character of genshinData?.characters ?? []) byCharacter.set(character.key, []);
    for (const artifact of artifacts) {
      if (!artifact.location) continue;
      const list = byCharacter.get(artifact.location) ?? [];
      list.push(artifact);
      byCharacter.set(artifact.location, list);
    }
    return [...byCharacter.entries()]
      .map(([key, pieces]) => ({
        key,
        name: formatCharacterDisplayName(key),
        pieces: pieces.sort(bySlot),
        totalCv: roundCv(pieces.reduce((sum, piece) => sum + critValue(piece), 0)),
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [artifacts, genshinData]);

  const completenessCounts = useMemo(() => {
    const counts: Record<Completeness, number> = { full: 0, missing: 0, none: 0 };
    for (const group of groups) counts[completenessOf(group.pieces)] += 1;
    return counts;
  }, [groups]);

  const visibleGroups = useMemo(() => {
    const query = characterSearch.trim().toLowerCase();
    const visible = groups.filter(
      (group) =>
        (!completeness || completenessOf(group.pieces) === completeness) &&
        (!query || group.name.toLowerCase().includes(query))
    );
    // Characters with nothing on have no total to compare, so they stay last both ways.
    if (equippedSort !== "name") {
      const direction = equippedSort === "cv-desc" ? -1 : 1;
      visible.sort(
        (a, b) =>
          Number(a.pieces.length === 0) - Number(b.pieces.length === 0) ||
          direction * (a.totalCv - b.totalCv)
      );
    }
    return visible;
  }, [groups, characterSearch, completeness, equippedSort]);

  // The numbers in the summary tiles, always across the whole upload.
  const summary = useMemo(() => {
    const finished = artifacts.filter((a) => a.location && a.level === 20 && a.rarity === 5);
    const fodder = artifacts.filter(isLikelyFodder);
    return {
      equippedCount: finished.length,
      equippedAverage: finished.length
        ? roundCv(finished.reduce((sum, a) => sum + critValue(a), 0) / finished.length)
        : null,
      bestInBag: artifacts.filter((a) => !a.location && scoreTier(a) === "excellent").length,
      fodder: fodder.length,
      fodderUnlocked: fodder.filter((a) => !a.lock).length,
    };
  }, [artifacts]);

  const rarities = useMemo(
    () => [...new Set(artifacts.map((a) => a.rarity))].sort((a, b) => b - a),
    [artifacts]
  );

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

  // Only the tiers this view has, plus the chosen one so it can always be turned off.
  const tiers = useMemo(() => {
    const present = new Set(viewList.map(scoreTier));
    return SCORE_TIERS.filter(({ value }) => present.has(value) || value === scoreFilter);
  }, [viewList, scoreFilter]);

  // The list the main stat dropdown describes: every filter except main stat.
  const beforeMainStat = useMemo(
    () =>
      viewList.filter(
        (a) =>
          (setFilter === ALL_SETS || artifactSetId(a.setKey) === setFilter) &&
          (!slotFilter || a.slotKey === slotFilter) &&
          (!scoreFilter || scoreTier(a) === scoreFilter) &&
          (!lockFilter || Boolean(a.lock) === (lockFilter === "locked")) &&
          (!rarityFilter || a.rarity === rarityFilter)
      ),
    [viewList, setFilter, slotFilter, scoreFilter, lockFilter, rarityFilter]
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
    if (sort === "cv-desc") list.sort((a, b) => critValue(b) - critValue(a));
    if (sort === "cv-asc") list.sort((a, b) => critValue(a) - critValue(b));
    if (sort === "level-desc") list.sort((a, b) => b.level - a.level);
    if (sort === "level-asc") list.sort((a, b) => a.level - b.level);
    if (sort === "set") list.sort((a, b) => artifactSetName(a.setKey).localeCompare(artifactSetName(b.setKey)));
    return list;
  }, [beforeMainStat, mainStatFilter, sort]);

  const filterCount =
    Number(setFilter !== ALL_SETS) +
    Number(slotFilter !== null) +
    Number(mainStatFilter !== ANY_MAIN_STAT) +
    Number(scoreFilter !== null) +
    Number(lockFilter !== null) +
    Number(rarityFilter !== null);

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
    setScoreFilter(null);
    setLockFilter(null);
    setRarityFilter(null);
    setLimit(PAGE_SIZE);
  };

  /** A filter chip's press: choose it, or turn it off if it's already chosen. Main stat counts change with it. */
  const changeFilter = <T,>(current: T | null, next: T, apply: (value: T | null) => void) => {
    apply(current === next ? null : next);
    setMainStatFilter(ANY_MAIN_STAT);
    setLimit(PAGE_SIZE);
  };

  /** A summary tile's press: this tier in the bag, in the given order, and nothing else narrowing it. */
  const showBagTier = (tier: ScoreTier, order: ArtifactSort) => {
    clearFilters();
    setShow("unequipped");
    setScoreFilter(tier);
    setSort(order);
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
        <div ref={showRow} tabIndex={-1} className="flex flex-wrap items-center gap-3 focus:outline-none">
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
            <>
              <SearchInput value={characterSearch} onChange={setCharacterSearch} label="Search by character" />
              <div className="flex items-center gap-2">
                <label htmlFor="equipped-sort" className="text-sm font-medium">
                  Sort by:
                </label>
                <Select value={equippedSort} onValueChange={(next) => setEquippedSort(next as EquippedSort)}>
                  <SelectTrigger id="equipped-sort" className="w-[13rem]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="name">Name (A-Z)</SelectItem>
                    <SelectItem value="cv-desc">Total CV (High to Low)</SelectItem>
                    <SelectItem value="cv-asc">Total CV (Low to High)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </>
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
                <SelectTrigger id="artifact-sort" className="w-[13rem]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="upload">Upload order</SelectItem>
                  <SelectItem value="cv-desc">Crit Value (High to Low)</SelectItem>
                  <SelectItem value="cv-asc">Crit Value (Low to High)</SelectItem>
                  <SelectItem value="level-desc">Level (High to Low)</SelectItem>
                  <SelectItem value="level-asc">Level (Low to High)</SelectItem>
                  <SelectItem value="set">Set (A-Z)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
          {show !== "equipped" && (
            <Button
              variant="outline"
              aria-expanded={filtersOpen}
              onClick={() => setFiltersOpen((open) => !open)}
              className={cn("sm:hidden", filterCount > 0 && "border-indigo-500 text-indigo-700 dark:text-indigo-300")}
            >
              Filters{filterCount > 0 && ` (${filterCount})`}
              <ChevronDown className={cn("ml-2 h-4 w-4 transition-transform duration-150 ease-out-strong motion-reduce:transition-none", filtersOpen && "rotate-180")} aria-hidden />
            </Button>
          )}
        </div>
        {show !== "equipped" && (
          <div className="grid gap-3 pb-1 sm:grid-cols-3">
            <SummaryTile
              value={summary.equippedAverage === null ? "–" : String(summary.equippedAverage)}
              label="Equipped average CV"
              detail={
                summary.equippedCount === 0
                  ? "No level 20 pieces equipped yet"
                  : `Across your ${summary.equippedCount.toLocaleString()} equipped level 20 ${summary.equippedCount === 1 ? "piece" : "pieces"}`
              }
              onClick={() => {
                changeShow("equipped");
                setEquippedSort("cv-desc");
                showRow.current?.focus();
              }}
            />
            <SummaryTile
              value={summary.bestInBag.toLocaleString()}
              label="Excellent, not equipped"
              detail="Level 20 and 40+ CV, sitting in your bag"
              onClick={() => showBagTier("excellent", "cv-desc")}
            />
            <SummaryTile
              value={summary.fodder.toLocaleString()}
              label="Likely fodder"
              detail={`Unequipped, level 20, under 20 CV (${summary.fodderUnlocked.toLocaleString()} unlocked)`}
              onClick={() => showBagTier("low", "cv-asc")}
            />
          </div>
        )}
        {show === "equipped" && (
          <div className="flex flex-wrap items-center gap-3">
            <div role="group" aria-label="Filter by how many pieces are equipped" className="flex flex-wrap gap-2">
              {COMPLETENESS.map(({ value, label }) => (
                <FilterChip
                  key={value}
                  pressed={completeness === value}
                  onClick={() => setCompleteness(completeness === value ? null : value)}
                >
                  {label} ({completenessCounts[value].toLocaleString()})
                </FilterChip>
              ))}
            </div>
            <ClearFilters count={completeness ? 1 : 0} onClick={() => setCompleteness(null)} />
          </div>
        )}
        {show !== "equipped" && (
          <div className={cn(!filtersOpen && "hidden", "space-y-3 sm:block")}>
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
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-medium" aria-hidden>Score:</span>
              <div role="group" aria-label="Filter by score" className="flex flex-wrap gap-2">
                {tiers.map(({ value, label }) => (
                  <FilterChip
                    key={value}
                    pressed={scoreFilter === value}
                    onClick={() => changeFilter(scoreFilter, value, setScoreFilter)}
                  >
                    {label}
                  </FilterChip>
                ))}
              </div>
            </div>
            <span className="hidden h-5 w-px bg-gray-200 dark:bg-slate-700 sm:block" aria-hidden />
            <div role="group" aria-label="Filter by lock" className="flex flex-wrap gap-2">
              <FilterChip
                pressed={lockFilter === "locked"}
                onClick={() => changeFilter(lockFilter, "locked" as LockFilter, setLockFilter)}
              >
                Locked
              </FilterChip>
              <FilterChip
                pressed={lockFilter === "unlocked"}
                onClick={() => changeFilter(lockFilter, "unlocked" as LockFilter, setLockFilter)}
              >
                Unlocked
              </FilterChip>
            </div>
            {rarities.length > 1 && (
              <>
                <span className="hidden h-5 w-px bg-gray-200 dark:bg-slate-700 sm:block" aria-hidden />
                <div role="group" aria-label="Filter by rarity" className="flex flex-wrap gap-2">
                  {rarities.map((rarity) => (
                    <FilterChip
                      key={rarity}
                      pressed={rarityFilter === rarity}
                      onClick={() => changeFilter(rarityFilter, rarity, setRarityFilter)}
                      colors={RARITY_CHIP[String(rarity)]}
                    >
                      {rarity}★
                    </FilterChip>
                  ))}
                </div>
              </>
            )}
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
          </div>
        )}
      </div>

      {show === "equipped" ? (
        groups.length === 0 ? (
          <p className="text-gray-600 dark:text-slate-400">No artifacts are equipped.</p>
        ) : (
          <div className="space-y-3">
            {/* Column headings, shown where the five slots sit side by side, and pinned while the rows scroll. */}
            <div className="sticky top-0 z-10 hidden gap-3 border-b border-gray-200 bg-white px-3 py-2 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400 lg:grid lg:grid-cols-[14rem_repeat(5,minmax(0,1fr))]">
              <span>Character</span>
              {SLOT_ORDER.map((slot) => (
                <span key={slot}>{formatSlotName(slot)}</span>
              ))}
            </div>
            {(characterSearch.trim() || completeness) && (
              <p className="text-sm text-gray-500 dark:text-slate-400" aria-live="polite">
                {visibleGroups.length === 0 ? (
                  <NoMatches
                    message="No characters match."
                    filters={completeness !== null}
                    search={characterSearch.trim() !== ""}
                    onClear={() => {
                      setCompleteness(null);
                      setCharacterSearch("");
                    }}
                  />
                ) : (
                  `Showing ${visibleGroups.length} of ${groups.length} characters`
                )}
              </p>
            )}
            {visibleGroups.map((group) => (
              <EquippedRow
                key={group.key}
                characterKey={group.key}
                name={group.name}
                pieces={group.pieces}
                totalCv={group.totalCv}
                isOpen={openRow === group.key}
                onToggle={() => setOpenRow((open) => (open === group.key ? null : group.key))}
              />
            ))}
          </div>
        )
      ) : (
        <>
          <p className="mb-4 text-sm text-gray-500 dark:text-slate-400" aria-live="polite">
            {flatList.length === 0 ? (
              <NoMatches
                message="No artifacts match these filters."
                filters={filterCount > 0}
                search={false}
                onClear={clearFilters}
              />
            ) : (
              `Showing ${Math.min(limit, flatList.length).toLocaleString()} of ${flatList.length.toLocaleString()}`
            )}
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

/** A number above the list; pressing it sets the view, filters and sort that show those pieces. */
function SummaryTile({
  value,
  label,
  detail,
  onClick,
}: {
  value: string;
  label: string;
  detail: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-lg border bg-card p-3 text-left text-card-foreground shadow-sm transition-colors hover:border-indigo-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:hover:border-indigo-400 sm:p-4"
    >
      <span className="block text-2xl font-bold tabular-nums text-indigo-900 dark:text-indigo-200">{value}</span>
      <span className="block text-sm font-semibold">{label}</span>
      <span className="block text-xs text-gray-500 dark:text-slate-400">{detail}</span>
    </button>
  );
}

/**
 * One character's equipped set: portrait and name, then a fixed column per
 * slot so the same slot lines up from row to row. Below `lg` the row folds to
 * the name, the count and five small icons, because open rows made the page
 * about 75,000 px long on a phone; pressing it opens the bonuses and the pieces
 * in a wrapping grid, with each card naming its slot. One opens at a time, and
 * since closing a row higher up moves everything, the pressed row scrolls to the
 * top of the screen.
 */
function EquippedRow({
  characterKey,
  name,
  pieces,
  totalCv,
  isOpen,
  onToggle,
}: {
  characterKey: string;
  name: string;
  pieces: GoodArtifact[];
  totalCv: number;
  isOpen: boolean;
  onToggle: () => void;
}) {
  const detailsId = useId();
  const row = useRef<HTMLElement>(null);
  // Only a press scrolls, not a row that comes back open after a search or filter.
  const pressed = useRef(false);
  useLayoutEffect(() => {
    if (pressed.current && isOpen) row.current?.scrollIntoView({ block: "start" });
    pressed.current = false;
  }, [isOpen]);
  const href = `/genshin/characters/${encodeURIComponent(characterKey)}`;
  const count = (
    <span className="text-xs text-gray-500 dark:text-slate-400">{pieces.length} of 5 equipped</span>
  );
  // A total with no tier: a support's 0 fits their build, and says nothing bad about it.
  const total = (
    <span className="block text-xs font-semibold text-indigo-900 dark:text-indigo-200">Total CV {totalCv}</span>
  );

  // With nothing equipped there's nothing to open, so the row is a link on smaller
  // screens and one line across the five columns on wide ones.
  if (pieces.length === 0) {
    return (
      <section className="rounded-xl border border-gray-200 dark:border-slate-700 p-3 lg:grid lg:grid-cols-[14rem_repeat(5,minmax(0,1fr))] lg:items-stretch gap-3">
        <Link
          href={href}
          className="flex min-h-11 w-full items-center gap-3 rounded-lg lg:hidden"
        >
          <CharacterAvatar characterKey={characterKey} size={48} />
          <span className="min-w-0 flex-1">
            <span className="block font-semibold leading-tight text-indigo-900 dark:text-indigo-200">{name}</span>
            {count}
          </span>
          <ArrowRight aria-hidden="true" className="h-4 w-4 shrink-0 text-gray-500 dark:text-slate-400" />
        </Link>
        <div className="hidden items-center gap-3 lg:flex">
          <CharacterAvatar characterKey={characterKey} size={48} />
          <div className="min-w-0">
            <Link
              href={href}
              className="block font-semibold leading-tight text-indigo-900 dark:text-indigo-200 hover:underline underline-offset-2"
            >
              {name}
            </Link>
            {count}
          </div>
        </div>
        <div className="col-span-5 hidden items-center justify-center rounded-lg border border-dashed border-gray-300 dark:border-slate-600 p-3 text-center text-xs text-gray-500 dark:text-slate-400 lg:flex">
          Nothing equipped
        </div>
      </section>
    );
  }

  return (
    <section ref={row} className="scroll-mt-2 rounded-xl border border-gray-200 dark:border-slate-700 p-3 lg:grid lg:grid-cols-[14rem_repeat(5,minmax(0,1fr))] lg:items-stretch gap-3">
      {/* The folded row, below lg. */}
      <button
        type="button"
        aria-expanded={isOpen}
        aria-controls={detailsId}
        onClick={() => {
          pressed.current = true;
          onToggle();
        }}
        className="flex min-h-11 w-full items-center gap-3 rounded-lg text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 lg:hidden"
      >
        <CharacterAvatar characterKey={characterKey} size={48} />
        <span className="min-w-0 flex-1">
          <span className="block font-semibold leading-tight text-indigo-900 dark:text-indigo-200">{name}</span>
          {count}
          {total}
        </span>
        <ChevronDown
          aria-hidden="true"
          className={cn("h-4 w-4 shrink-0 text-gray-500 transition-transform duration-150 ease-out-strong motion-reduce:transition-none dark:text-slate-400", isOpen && "rotate-180")}
        />
      </button>
      {!isOpen && (
        <div aria-hidden="true" className="mt-2 flex gap-1 lg:hidden">
          {SLOT_ORDER.map((slot) => {
            const piece = pieces.find((p) => p.slotKey === slot);
            return piece ? (
              <ArtifactIcon key={slot} artifact={piece} size="xs" />
            ) : (
              <span key={slot} className="h-7 w-7 rounded border border-dashed border-gray-300 dark:border-slate-600" />
            );
          })}
        </div>
      )}
      <div id={detailsId} className={cn(isOpen ? "fade-in" : "hidden", "lg:contents")}>
      <div className="mb-3 mt-2 lg:my-0">
        <div className="hidden items-center gap-3 lg:flex">
          <CharacterAvatar characterKey={characterKey} size={48} />
          <div className="min-w-0">
            <Link
              href={href}
              className="block font-semibold leading-tight text-indigo-900 dark:text-indigo-200 hover:underline underline-offset-2"
            >
              {name}
            </Link>
            {count}
            {total}
          </div>
        </div>
        <Link
          href={href}
          className="text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:underline underline-offset-2 lg:hidden"
        >
          Open {name}&apos;s page
        </Link>
        <ArtifactSetBonuses pieces={pieces} className="mt-2 text-xs" />
      </div>
      {/* Below lg the pieces wrap, so nothing scrolls sideways; from lg each is a column of the row. */}
      <div
        role="group"
        aria-label={`${name}'s artifacts`}
        className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:contents"
      >
        {SLOT_ORDER.map((slot) => {
          const piece = pieces.find((p) => p.slotKey === slot);
          return piece ? (
            <ArtifactSlotCard key={slot} artifact={piece} slotNameNarrowOnly />
          ) : (
            <div
              key={slot}
              className="flex items-center justify-center rounded-lg border border-dashed border-gray-300 dark:border-slate-600 p-3 text-center text-xs text-gray-500 dark:text-slate-400"
            >
              No {formatSlotName(slot).split(" ")[0].toLowerCase()}
            </div>
          );
        })}
      </div>
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
      {/* Main stat and substats styled like the Equipped slot cards, with the score in the same place on every card. */}
      <CardContent className="flex items-start justify-between gap-3 text-sm">
        <div className="min-w-0">
          <p className="text-gray-500 dark:text-slate-400">
            {formatSlotName(artifact.slotKey)} · {artifact.rarity}★ · Lv. {artifact.level}
            {artifact.lock && " · Locked"}
          </p>
          {artifact.mainStatKey && (
            <p className="mt-2 font-semibold text-indigo-900 dark:text-indigo-200">
              {formatStatName(artifact.mainStatKey)}
            </p>
          )}
          <ArtifactSubstats substats={artifact.substats} />
        </div>
        <CvBlock artifact={artifact} />
      </CardContent>
    </Card>
  );
}
