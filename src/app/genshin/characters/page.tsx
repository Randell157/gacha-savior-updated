"use client";

import { useState, useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import { useGenshinData } from "@/hooks/useGenshinData";
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

export default function CharactersPage() {
  const { data: genshinData, loading } = useGenshinData();
  const [imageErrors, setImageErrors] = useState<Set<string>>(new Set());
  const [sortOrder, setSortOrder] = useState("name-asc");
  const [ownedFilter, setOwnedFilter] = useState("all");

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
        owned: !!owned,
        ownedKey: owned?.key ?? entry.key,
        level: owned?.level ?? -1,
        constellation: owned?.constellation ?? -1,
      };
    }).filter((character) => {
      if (ownedFilter === "owned") return character.owned;
      if (ownedFilter === "unowned") return !character.owned;
      return true;
    });

    switch (sortOrder) {
      case "name-desc":
        return list.sort((a, b) =>
          formatCharacterDisplayName(b.key).localeCompare(
            formatCharacterDisplayName(a.key)
          )
        );
      case "level-asc":
        return list.sort((a, b) => a.level - b.level || a.key.localeCompare(b.key));
      case "level-desc":
        return list.sort((a, b) => b.level - a.level || a.key.localeCompare(b.key));
      case "constellation-asc":
        return list.sort(
          (a, b) => a.constellation - b.constellation || a.key.localeCompare(b.key)
        );
      case "constellation-desc":
        return list.sort(
          (a, b) => b.constellation - a.constellation || a.key.localeCompare(b.key)
        );
      case "name-asc":
      default:
        return list.sort((a, b) =>
          formatCharacterDisplayName(a.key).localeCompare(
            formatCharacterDisplayName(b.key)
          )
        );
    }
  }, [ownedByNormalizedKey, sortOrder, ownedFilter]);

  if (loading) {
    return <PageSkeleton kind="grid" />;
  }

  return (
    <GenshinShell
      title="All Characters"
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
                <SelectItem value="owned">Obtained</SelectItem>
                <SelectItem value="unowned">Not obtained</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </>
      }
    >
      {ownedFilter === "all" && (
        <p className="text-sm text-gray-500 dark:text-slate-400 mb-6">
          Greyed-out portraits are characters you have not obtained yet.
        </p>
      )}
      {roster.length === 0 ? (
        <p className="text-sm text-gray-500 dark:text-slate-400 mb-6">
          No characters match this filter.
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
                  alt={displayName}
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
                  character.owned ? "text-gray-800 dark:text-slate-200" : "text-gray-400 dark:text-slate-500"
                )}
              >
                {displayName}
              </span>
            </>
          );

          if (!character.owned) {
            return (
              <div
                key={character.key}
                title={`${displayName} (not obtained)`}
                className="flex flex-col items-center w-full max-w-[7.5rem] rounded-lg p-2 cursor-not-allowed"
              >
                {portrait}
              </div>
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
    </GenshinShell>
  );
}
