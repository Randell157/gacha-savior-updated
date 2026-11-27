"use client";

import { useState } from "react";
import { Star } from "lucide-react";
import { useGenshinData } from "@/hooks/useGenshinData";
import { toggleFavorite } from "@/lib/genshin/characterNotes";
import { cn } from "@/lib/utils";

/**
 * The favorite star beside an owned character's name (design "1A" from
 * `.mockups/favorites.html`): outlined grey when off, filled gold when on,
 * one press with no editing. Saved with the account.
 */
export default function FavoriteStar({ characterKey, name }: { characterKey: string; name: string }) {
  const { favorites, setFavorites } = useGenshinData();
  const [failed, setFailed] = useState(false);
  const on = favorites.includes(characterKey);

  const toggle = async () => {
    setFailed(false);
    const ok = await setFavorites(toggleFavorite(favorites, characterKey));
    if (!ok) setFailed(true);
  };

  return (
    <>
      <button
        type="button"
        aria-pressed={on}
        aria-label={`Favorite ${name}`}
        title={on ? "Remove from favorites" : "Add to favorites"}
        onClick={toggle}
        className={cn(
          "press inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500",
          on
            ? "border-amber-300 bg-amber-50 text-amber-500 hover:bg-amber-100 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-400 dark:hover:bg-amber-900/50"
            : "border-gray-300 bg-white text-gray-500 hover:bg-gray-50 hover:text-amber-500 dark:border-slate-600 dark:bg-slate-950 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-amber-400"
        )}
      >
        <Star className={cn("h-5 w-5", on && "fill-current")} aria-hidden />
      </button>
      {failed && (
        <p role="alert" className="text-sm text-red-600 dark:text-red-300">
          Couldn&apos;t save. Check your connection and try again.
        </p>
      )}
    </>
  );
}
