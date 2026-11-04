"use client";

import { useState, useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import { useGenshinData } from "@/hooks/useGenshinData";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn, formatCharacterDisplayName } from "@/lib/utils";
import {
  GENSHIN_CHARACTERS,
  normalizeCharacterKey,
  rarityBackground,
} from "@/lib/genshinCharacters";
import type { GoodCharacter } from "@/lib/genshin/types";

type SortField = "name" | "level" | "constellation" | "auto" | "skill" | "burst";

function sortValue(character: GoodCharacter, field: Exclude<SortField, "name">): number {
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

export default function CharactersPage() {
  const { data: genshinData, loading } = useGenshinData();
  const { user } = useAuth();
  const [imageErrors, setImageErrors] = useState<Set<string>>(new Set());
  const [sortOrder, setSortOrder] = useState("name-asc");
  const [ownedFilter, setOwnedFilter] = useState("all");
  const [filters, setFilters] = useState(NO_FILTERS);
  const [quickView, setQuickView] = useState<string | null>(null);

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

  const roster = useMemo(() => {
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
      return matchesCharacterFilters(character, filters);
    });

    const byName = (a: { key: string }, b: { key: string }) =>
      formatCharacterDisplayName(a.key).localeCompare(formatCharacterDisplayName(b.key));
    const [field, direction] = sortOrder.split("-") as [SortField, "asc" | "desc"];
    if (field === "name") {
      return list.sort((a, b) => (direction === "asc" ? byName(a, b) : byName(b, a)));
    }
    // Owned characters come first either way, so low-to-high starts on your
    // least-built character rather than on everyone you don't own.
    return list.sort((a, b) => {
      if (!a.owned || !b.owned) return Number(!a.owned) - Number(!b.owned) || byName(a, b);
      const difference = sortValue(a.owned, field) - sortValue(b.owned, field);
      return (direction === "asc" ? difference : -difference) || byName(a, b);
    });
  }, [ownedByNormalizedKey, sortOrder, ownedFilter, filters]);

  const sortField = sortOrder.split("-")[0];

  if (loading) {
    return <PageSkeleton kind="grid" />;
  }

  return (
    <GenshinShell
      title="Characters"
      actions={
        <>
          <div className="flex items-center gap-2">
            <label htmlFor="sort-order" className="text-sm font-medium">
              Sort by:
            </label>
            <Select value={sortOrder} onValueChange={setSortOrder}>
              <SelectTrigger id="sort-order" className="w-[13rem]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="name-asc">Name (A-Z)</SelectItem>
                <SelectItem value="name-desc">Name (Z-A)</SelectItem>
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
          <div className="flex items-center gap-2">
            <label htmlFor="owned-filter" className="text-sm font-medium">
              Filter:
            </label>
            <Select value={ownedFilter} onValueChange={setOwnedFilter}>
              <SelectTrigger id="owned-filter" className="w-[10rem]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All characters</SelectItem>
                <SelectItem value="owned">Owned</SelectItem>
                <SelectItem value="unowned">Not owned</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </>
      }
    >
      {!user && (
        <SignedOutBanner>
          Log in to see which characters you own, with their levels and builds. Until then, every
          character shows greyed out.
        </SignedOutBanner>
      )}
      <CharacterFilters filters={filters} onChange={setFilters} />
      <p className="text-sm text-gray-500 dark:text-slate-400 mb-4" aria-live="polite">
        {activeFilterCount(filters) > 0 || ownedFilter !== "all"
          ? `Showing ${roster.length} of ${GENSHIN_CHARACTERS.length} characters. `
          : user
            ? "Greyed-out portraits are characters you don't own yet. "
            : null}
        {genshinData?.characters.length
          ? "Under each name: level, constellation, then Normal Attack / Skill / Burst."
          : null}
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
              {character.owned && <BuildLines character={character.owned} sortField={sortField} />}
            </>
          );

          if (!character.owned) {
            return (
              <button
                key={character.key}
                type="button"
                title={`${displayName} (not owned)`}
                onClick={() => setQuickView(character.key)}
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
      <CharacterQuickView characterKey={quickView} onClose={() => setQuickView(null)} />
    </GenshinShell>
  );
}
