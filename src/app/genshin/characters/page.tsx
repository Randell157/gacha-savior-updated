"use client";

import { useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useGenshinData } from "@/hooks/useGenshinData";
import { useRememberedState } from "@/hooks/useRememberedState";
import { useAuth } from "@/contexts/AuthContext";
import SignedOutBanner from "@/components/SignedOutBanner";
import CharacterQuickView from "@/components/CharacterQuickView";
import CharacterFilters, {
  activeFilterCount,
  matchesCharacterFilters,
  NO_FILTERS,
} from "@/components/CharacterFilters";
import GenshinShell from "@/components/GenshinShell";
import PageSkeleton from "@/components/PageSkeleton";
import SearchInput from "@/components/SearchInput";
import Segmented from "@/components/Segmented";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn, compareVersions, formatCharacterDisplayName } from "@/lib/utils";
import { getCharacterDetails } from "@/lib/genshin/characterDetails";
import {
  GENSHIN_CHARACTERS,
  normalizeCharacterKey,
  rarityBackground,
} from "@/lib/genshinCharacters";
import type { GoodCharacter } from "@/lib/genshin/types";

type BuildField = "level" | "constellation" | "auto" | "skill" | "burst";
type SortField = "name" | "release" | "obtained" | BuildField;

function sortValue(character: GoodCharacter, field: BuildField): number {
  if (field === "level" || field === "constellation") return character[field];
  return character.talent?.[field] ?? -1;
}

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

function releaseVersion(key: string): string {
  return getCharacterDetails(key)?.version ?? "0";
}

export default function CharactersPage() {
  const { data: genshinData, loading } = useGenshinData();
  const { user } = useAuth();
  const [imageErrors, setImageErrors] = useState<Set<string>>(new Set());
  const [rememberedSort, setSortOrder] = useRememberedState("roster:sort", "name-asc");
  const [ownedFilter, setOwnedFilter] = useRememberedState<"all" | "owned" | "unowned">("roster:show", "all");
  const [search, setSearch] = useRememberedState("roster:search", "");
  const [filters, setFilters] = useRememberedState("roster:filters", NO_FILTERS);
  const [quickView, setQuickView] = useState<string | null>(null);
  // The tile that opened the quick view, which gets focus back when it closes.
  const quickViewTile = useRef<HTMLElement | null>(null);

  const ownedByNormalizedKey = useMemo(() => {
    const map = new Map<string, GoodCharacter>();
    for (const char of genshinData?.characters ?? []) {
      const normalized = normalizeCharacterKey(char.key);
      map.set(normalized, char);
      if (normalized.startsWith("traveler")) {
        map.set("traveler", char);
      }
    }
    return map;
  }, [genshinData]);

  // Irminsul lists characters in the order the account got them, Traveler first.
  // Inventory Kamera uses the in-game list's order, which says nothing about that.
  const hasObtainedOrder = genshinData?.source === "Irminsul";
  // A remembered Obtained sort can outlive the upload that allowed it.
  const sortOrder = rememberedSort.startsWith("obtained") && !hasObtainedOrder ? "name-asc" : rememberedSort;
  const obtainedPosition = useMemo(() => {
    const map = new Map<string, number>();
    genshinData?.characters.forEach((char, index) => {
      const normalized = normalizeCharacterKey(char.key);
      map.set(normalized.startsWith("traveler") ? "traveler" : normalized, index + 1);
    });
    return map;
  }, [genshinData]);
  const positionOf = (key: string) => obtainedPosition.get(normalizeCharacterKey(key));

  const roster = useMemo(() => {
    const query = search.trim().toLowerCase();
    const list = GENSHIN_CHARACTERS.map((entry) => {
      const owned = ownedByNormalizedKey.get(normalizeCharacterKey(entry.key));
      return {
        ...entry,
        owned: owned ?? null,
        ownedKey: owned?.key ?? entry.key,
      };
    }).filter((character) => {
      if (ownedFilter === "owned" && !character.owned) return false;
      if (ownedFilter === "unowned" && character.owned) return false;
      if (query && !formatCharacterDisplayName(character.key).toLowerCase().includes(query)) return false;
      return matchesCharacterFilters(character, filters);
    });

    const byName = (a: { key: string }, b: { key: string }) =>
      formatCharacterDisplayName(a.key).localeCompare(formatCharacterDisplayName(b.key));
    const [field, direction] = sortOrder.split("-") as [SortField, "asc" | "desc"];
    if (field === "name") {
      return list.sort((a, b) => (direction === "asc" ? byName(a, b) : byName(b, a)));
    }
    if (field === "release") {
      // A fact about the game, so owned and unowned characters mix.
      return list.sort((a, b) => {
        const difference = compareVersions(releaseVersion(a.key), releaseVersion(b.key));
        return (direction === "asc" ? difference : -difference) || byName(a, b);
      });
    }
    if (field === "obtained") {
      return list.sort((a, b) => {
        const first = obtainedPosition.get(normalizeCharacterKey(a.key));
        const second = obtainedPosition.get(normalizeCharacterKey(b.key));
        if (first === undefined || second === undefined) {
          return Number(first === undefined) - Number(second === undefined) || byName(a, b);
        }
        return direction === "asc" ? first - second : second - first;
      });
    }
    // Owned characters come first either way, so low-to-high starts on your
    // least-built character rather than on everyone you don't own.
    return list.sort((a, b) => {
      if (!a.owned || !b.owned) return Number(!a.owned) - Number(!b.owned) || byName(a, b);
      const difference = sortValue(a.owned, field) - sortValue(b.owned, field);
      return (direction === "asc" ? difference : -difference) || byName(a, b);
    });
  }, [ownedByNormalizedKey, obtainedPosition, sortOrder, ownedFilter, filters, search]);

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
          No characters match these filters.
        </p>
      ) : (
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-7 gap-4 justify-items-center">
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
                className="group flex flex-col items-center w-full max-w-[7.5rem] rounded-lg p-2 transition-colors hover:bg-indigo-50 dark:hover:bg-indigo-900/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
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
              className="group flex flex-col items-center w-full max-w-[7.5rem] rounded-lg p-2 transition-colors hover:bg-indigo-50 dark:hover:bg-indigo-900/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
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
