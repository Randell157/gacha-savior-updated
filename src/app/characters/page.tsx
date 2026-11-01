"use client";

import { useState, useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import { useGenshinData } from "@/hooks/useGenshinData";
import { Button } from "@/components/ui/button";
import Header from "@/components/header";
import Footer from "@/components/footer";
import { cn, formatCharacterDisplayName } from "@/lib/utils";
import {
  GENSHIN_CHARACTERS,
  normalizeCharacterKey,
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
    return (
      <div className="flex flex-col min-h-screen">
        <Header />
        <main className="flex-1 min-h-screen bg-gradient-to-b from-indigo-100 to-purple-100 flex items-center justify-center">
          <p className="text-gray-700">Loading character data...</p>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-1">
        <div className="min-h-screen bg-gradient-to-b from-indigo-100 to-purple-100">
          <header className="bg-white shadow">
            <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8 flex justify-between items-center flex-wrap gap-4">
              <h1 className="text-3xl font-bold text-indigo-900">All Characters</h1>
              <div className="flex items-center flex-wrap gap-4">
                <div className="flex items-center space-x-2">
                  <label htmlFor="sort-order" className="text-sm font-medium">
                    Sort by:
                  </label>
                  <select
                    id="sort-order"
                    value={sortOrder}
                    onChange={(e) => setSortOrder(e.target.value)}
                    className="bg-white border border-gray-300 rounded-md shadow-sm p-2 text-sm"
                  >
                    <option value="name-asc">Name (A-Z)</option>
                    <option value="name-desc">Name (Z-A)</option>
                    <option value="level-desc">Level (High to Low)</option>
                    <option value="level-asc">Level (Low to High)</option>
                    <option value="constellation-desc">Constellation (High to Low)</option>
                    <option value="constellation-asc">Constellation (Low to High)</option>
                  </select>
                </div>
                <div className="flex items-center space-x-2">
                  <label htmlFor="owned-filter" className="text-sm font-medium">
                    Filter:
                  </label>
                  <select
                    id="owned-filter"
                    value={ownedFilter}
                    onChange={(e) => setOwnedFilter(e.target.value)}
                    className="bg-white border border-gray-300 rounded-md shadow-sm p-2 text-sm"
                  >
                    <option value="all">All characters</option>
                    <option value="owned">Obtained</option>
                    <option value="unowned">Not obtained</option>
                  </select>
                </div>
              </div>
            </div>
          </header>
          <div className="max-w-7xl mx-auto py-12 sm:px-6 lg:px-8">
            <div className="bg-white shadow overflow-hidden sm:rounded-lg p-6">
              {ownedFilter === "all" && (
                <p className="text-sm text-gray-500 mb-6">
                  Greyed-out portraits are characters you have not obtained yet.
                </p>
              )}
              {roster.length === 0 ? (
                <p className="text-sm text-gray-500 mb-6">
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
                          "relative w-20 h-20 sm:w-24 sm:h-24 rounded-lg overflow-hidden bg-indigo-50 ring-1",
                          character.owned
                            ? "ring-indigo-100 group-hover:ring-indigo-400"
                            : "ring-gray-200"
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
                          className={cn(
                            "object-cover",
                            !character.owned && "grayscale opacity-40"
                          )}
                          title={displayName}
                          onError={() =>
                            setImageErrors((prev) => new Set(prev).add(character.key))
                          }
                        />
                      </div>
                      <span
                        className={cn(
                          "mt-2 w-full text-center text-xs sm:text-sm font-medium leading-tight line-clamp-2",
                          character.owned ? "text-gray-800" : "text-gray-400"
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
                      href={`/characters/${encodeURIComponent(character.ownedKey)}`}
                      title={displayName}
                      className="group flex flex-col items-center w-full max-w-[7.5rem] rounded-lg p-2 transition-colors hover:bg-indigo-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                    >
                      {portrait}
                    </Link>
                  );
                })}
              </div>
              )}
              <div className="mt-8">
                <Button asChild>
                  <Link href="/dashboard">Back to Dashboard</Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
