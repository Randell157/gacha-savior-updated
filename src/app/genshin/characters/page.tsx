"use client";

import { useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useGenshinData } from "@/hooks/useGenshinData";
import { useRememberedState } from "@/hooks/useRememberedState";
import { useAuth } from "@/contexts/AuthContext";
import SignedOutBanner from "@/components/SignedOutBanner";
import CharacterQuickView from "@/components/CharacterQuickView";
import CharacterFilters from "@/components/CharacterFilters";
import { NoMatches } from "@/components/FilterChip";
import GenshinShell from "@/components/GenshinShell";
import PageSkeleton from "@/components/PageSkeleton";
import { useFadeAfterLoading } from "@/hooks/useFadeAfterLoading";
import SearchInput from "@/components/SearchInput";
import Segmented from "@/components/Segmented";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn, formatCharacterDisplayName } from "@/lib/utils";
import {
  activeFilterCount,
  buildRoster,
  DEFAULT_ROSTER_CHOICES,
  hasObtainedOrder as uploadHasObtainedOrder,
  obtainedPositions,
  releaseVersion,
  ROSTER_MEMORY_KEYS,
  usableSortOrder,
  type OwnedFilter,
  type SortField,
} from "@/lib/genshin/roster";
import {
  GENSHIN_CHARACTERS,
  normalizeCharacterKey,
  rarityBackground,
} from "@/lib/genshinCharacters";
import type { GoodCharacter } from "@/lib/genshin/types";

/**
 * The two lines under an owned character's name: level and constellation, then
 * Normal Attack / Skill / Burst. The value being sorted by turns indigo, so the
 * order explains itself.
 */
function BuildLines({ character, sortField }: { character: GoodCharacter; sortField: string }) {
  const { level, constellation, talent } = character;
  const value = (field: SortField, text: string | number) => (
    <span className={cn(sortField === field && "font-bold text-indigo-700 dark:text-indigo-300")}>{text}</span>
  );
  return (
    <>
      <span
        aria-hidden
        className="mt-1 text-center text-xs leading-snug tabular-nums text-gray-600 dark:text-slate-400"
      >
        {value("level", `Lv ${level}`)} · {value("constellation", `C${constellation}`)}
        {talent && (
          <>
            <br />
            {value("auto", talent.auto)}/{value("skill", talent.skill)}/{value("burst", talent.burst)}
          </>
        )}
      </span>
      <span className="sr-only">
        , level {level}, constellation {constellation}
        {talent && `, talents: Normal Attack ${talent.auto}, Skill ${talent.skill}, Burst ${talent.burst}`}
      </span>
    </>
  );
}

/** The value behind a release or obtained sort, in the same indigo as the build values. */
function SortedValue({ text, spoken }: { text: string; spoken: string }) {
  return (
    <>
      <span
        aria-hidden
        className="mt-1 text-center text-xs font-bold leading-snug tabular-nums text-indigo-700 dark:text-indigo-300"
      >
        {text}
      </span>
      <span className="sr-only">, {spoken}</span>
    </>
  );
}

export default function CharactersPage() {
  const { data: genshinData, loading } = useGenshinData();
  useFadeAfterLoading(loading);
  const { user } = useAuth();
  const [imageErrors, setImageErrors] = useState<Set<string>>(new Set());
  const [rememberedSort, setSortOrder] = useRememberedState(ROSTER_MEMORY_KEYS.sortOrder, DEFAULT_ROSTER_CHOICES.sortOrder);
  const [ownedFilter, setOwnedFilter] = useRememberedState<OwnedFilter>(
    ROSTER_MEMORY_KEYS.ownedFilter,
    DEFAULT_ROSTER_CHOICES.ownedFilter
  );
  const [search, setSearch] = useRememberedState(ROSTER_MEMORY_KEYS.search, DEFAULT_ROSTER_CHOICES.search);
  const [filters, setFilters] = useRememberedState(ROSTER_MEMORY_KEYS.filters, DEFAULT_ROSTER_CHOICES.filters);
  const [quickView, setQuickView] = useState<string | null>(null);
  // The tile that opened the quick view, which gets focus back when it closes.
  const quickViewTile = useRef<HTMLElement | null>(null);
  const rosterGrid = useRef<HTMLDivElement>(null);

  const hasObtainedOrder = uploadHasObtainedOrder(genshinData);
  const sortOrder = usableSortOrder(rememberedSort, genshinData);
  const obtainedPosition = useMemo(() => obtainedPositions(genshinData), [genshinData]);
  const positionOf = (key: string) => obtainedPosition.get(normalizeCharacterKey(key));

  const roster = useMemo(
    () => buildRoster(genshinData, { sortOrder, ownedFilter, search, filters }),
    [genshinData, sortOrder, ownedFilter, search, filters]
  );

  const sortField = sortOrder.split("-")[0];

  if (loading) {
    return <PageSkeleton kind="grid" />;
  }

  return (
    <GenshinShell title="Characters">
      {!user && (
        <SignedOutBanner>
          Log in to see which characters you own, with their levels and builds. Until then, every
          character shows greyed out.
        </SignedOutBanner>
      )}
      <div className="mb-3 flex flex-wrap items-center gap-3">
        <SearchInput value={search} onChange={setSearch} label="Search characters" />
        {/* For keyboard users only: without it, the first character is 35 Tab stops down the page. */}
        {roster.length > 0 && (
          <a
            href="#roster"
            onClick={(event) => {
              event.preventDefault();
              rosterGrid.current?.querySelector<HTMLElement>("a, button")?.focus();
            }}
            className="sr-only rounded-md bg-indigo-600 text-sm font-medium text-white focus:not-sr-only focus:px-3 focus:py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:focus:ring-offset-slate-900"
          >
            Skip to characters
          </a>
        )}
        <div className="flex items-center gap-2">
          <label htmlFor="sort-order" className="text-sm font-medium">
            Sort by:
          </label>
          <Select value={sortOrder} onValueChange={setSortOrder}>
            <SelectTrigger id="sort-order" className="w-[13rem] sm:w-[15rem]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="name-asc">Name (A-Z)</SelectItem>
              <SelectItem value="name-desc">Name (Z-A)</SelectItem>
              <SelectItem value="release-desc">Release (Newest First)</SelectItem>
              <SelectItem value="release-asc">Release (Oldest First)</SelectItem>
              {hasObtainedOrder ? (
                <>
                  <SelectItem value="obtained-desc">Obtained (Newest First)</SelectItem>
                  <SelectItem value="obtained-asc">Obtained (Oldest First)</SelectItem>
                </>
              ) : (
                genshinData?.characters.length ? (
                  <SelectItem value="obtained-unavailable" disabled>
                    Obtained (Irminsul exports only)
                  </SelectItem>
                ) : null
              )}
              <SelectItem value="level-desc">Level (High to Low)</SelectItem>
              <SelectItem value="level-asc">Level (Low to High)</SelectItem>
              <SelectItem value="constellation-desc">Constellation (High to Low)</SelectItem>
              <SelectItem value="constellation-asc">Constellation (Low to High)</SelectItem>
              <SelectItem value="auto-desc">Normal Attack (High to Low)</SelectItem>
              <SelectItem value="skill-desc">Elemental Skill (High to Low)</SelectItem>
              <SelectItem value="burst-desc">Elemental Burst (High to Low)</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Segmented
          label="Show"
          value={ownedFilter}
          onChange={setOwnedFilter}
          options={[
            { value: "all", label: "All" },
            { value: "owned", label: "Owned" },
            { value: "unowned", label: "Not owned" },
          ]}
        />
      </div>
      <CharacterFilters filters={filters} onChange={setFilters} />
      <p className="text-sm text-gray-500 dark:text-slate-400 mb-4" aria-live="polite">
        {[
          activeFilterCount(filters) > 0 || ownedFilter !== "all" || search.trim()
            ? `Showing ${roster.length} of ${GENSHIN_CHARACTERS.length} characters.`
            : user && "Greyed-out portraits are characters you don't own yet.",
          genshinData?.characters.length &&
            "Under each name: level, constellation, then Normal Attack / Skill / Burst.",
          sortField === "obtained" &&
            "Obtained order comes from your Irminsul export, which lists characters in the order you got them.",
        ]
          .filter(Boolean)
          .join(" ")}
      </p>
      {roster.length === 0 ? (
        <p className="text-sm text-gray-500 dark:text-slate-400 mb-6">
          <NoMatches
            message="No characters match these filters."
            filters={activeFilterCount(filters) > 0 || ownedFilter !== "all"}
            search={search.trim() !== ""}
            onClear={() => {
              setFilters(DEFAULT_ROSTER_CHOICES.filters);
              setOwnedFilter(DEFAULT_ROSTER_CHOICES.ownedFilter);
              setSearch(DEFAULT_ROSTER_CHOICES.search);
            }}
          />
        </p>
      ) : (
      <div ref={rosterGrid} id="roster" className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-7 gap-4 justify-items-center">
        {roster.map((character) => {
          const displayName = formatCharacterDisplayName(character.key);
          const portrait = (
            <>
              <div
                className={cn(
                  "relative w-20 h-20 sm:w-24 sm:h-24 rounded-lg overflow-hidden ring-1",
                  rarityBackground(character.rarity),
                  character.owned
                    ? "ring-indigo-100 dark:ring-indigo-900 group-hover:ring-indigo-400"
                    : "ring-gray-200 dark:ring-slate-700 grayscale opacity-40"
                )}
              >
                <Image
                  src={
                    imageErrors.has(character.key)
                      ? "/placeholder.svg"
                      : `/character-portraits/${character.iconFile}`
                  }
                  alt=""
                  fill
                  sizes="(min-width: 640px) 96px, 80px"
                  className="object-cover"
                  title={displayName}
                  onError={() =>
                    setImageErrors((prev) => new Set(prev).add(character.key))
                  }
                />
              </div>
              <span
                className={cn(
                  "mt-2 w-full text-center text-xs sm:text-sm font-medium leading-tight line-clamp-2",
                  character.owned ? "text-gray-800 dark:text-slate-200" : "text-gray-500 dark:text-slate-400"
                )}
              >
                {displayName}
              </span>
              {sortField === "release" && (
                <SortedValue
                  text={`Version ${releaseVersion(character.key)}`}
                  spoken={`released in version ${releaseVersion(character.key)}`}
                />
              )}
              {sortField === "obtained" && positionOf(character.key) !== undefined && (
                <SortedValue
                  text={`#${positionOf(character.key)}`}
                  spoken={`number ${positionOf(character.key)} obtained`}
                />
              )}
              {character.owned && <BuildLines character={character.owned} sortField={sortField} />}
            </>
          );

          if (!character.owned) {
            return (
              <button
                key={character.key}
                type="button"
                title={`${displayName} (not owned)`}
                onClick={(event) => {
                  quickViewTile.current = event.currentTarget;
                  setQuickView(character.key);
                }}
                className="press group flex flex-col items-center w-full max-w-[7.5rem] rounded-lg p-2 hover:bg-indigo-50 dark:hover:bg-indigo-900/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
              >
                {portrait}
              </button>
            );
          }

          return (
            <Link
              key={character.key}
              href={`/genshin/characters/${encodeURIComponent(character.ownedKey)}`}
              title={displayName}
              className="press group flex flex-col items-center w-full max-w-[7.5rem] rounded-lg p-2 hover:bg-indigo-50 dark:hover:bg-indigo-900/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
            >
              {portrait}
            </Link>
          );
        })}
      </div>
      )}
      <CharacterQuickView
        characterKey={quickView}
        onClose={() => setQuickView(null)}
        onCloseAutoFocus={(event) => {
          event.preventDefault();
          quickViewTile.current?.focus();
        }}
      />
    </GenshinShell>
  );
}
