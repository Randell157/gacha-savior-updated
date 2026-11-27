"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { readRememberedTabState } from "@/hooks/useRememberedState";
import type { GenshinData } from "@/lib/genshin/types";
import { useGenshinData } from "@/hooks/useGenshinData";
import {
  characterNeighbours,
  DEFAULT_ROSTER_CHOICES,
  ownedTags,
  ROSTER_MEMORY_KEYS,
  withKnownTags,
  type RosterChoices,
} from "@/lib/genshin/roster";
import { formatCharacterDisplayName } from "@/lib/utils";

function rememberedRosterChoices(): RosterChoices {
  return {
    sortOrder: readRememberedTabState(ROSTER_MEMORY_KEYS.sortOrder, DEFAULT_ROSTER_CHOICES.sortOrder),
    ownedFilter: readRememberedTabState(ROSTER_MEMORY_KEYS.ownedFilter, DEFAULT_ROSTER_CHOICES.ownedFilter),
    search: readRememberedTabState(ROSTER_MEMORY_KEYS.search, DEFAULT_ROSTER_CHOICES.search),
    filters: readRememberedTabState(ROSTER_MEMORY_KEYS.filters, DEFAULT_ROSTER_CHOICES.filters),
    favoritesFirst: readRememberedTabState(ROSTER_MEMORY_KEYS.favoritesFirst, DEFAULT_ROSTER_CHOICES.favoritesFirst),
  };
}

/** Which button was pressed: the next page mounts a new one, and focus should land on it. */
let focusAfterStep: "previous" | "next" | null = null;

/**
 * Previous and next character buttons, stepping through what the roster is
 * showing, in the title bar and again at the bottom of the page. Rendered only
 * behind `RequireAuth`, so it can read the remembered choices during its first
 * render.
 */
export default function CharacterStepper({
  data,
  characterKey,
  label = "Other characters",
}: {
  data: GenshinData | null;
  characterKey: string;
  /** Two on one page need different names for screen readers. */
  label?: string;
}) {
  const [remembered] = useState(rememberedRosterChoices);
  const { characterNotes, favorites } = useGenshinData();
  const neighbours = useMemo(() => {
    const known = ownedTags(data, characterNotes).map(({ tag }) => tag);
    const choices = { ...remembered, filters: withKnownTags(remembered.filters, known) };
    return characterNeighbours(data, characterKey, choices, { notes: characterNotes, favorites });
  }, [data, characterKey, remembered, characterNotes, favorites]);
  const previousLink = useRef<HTMLAnchorElement>(null);
  const nextLink = useRef<HTMLAnchorElement>(null);

  // Keeps a keyboard user on the button, so stepping again doesn't mean tabbing back from the top.
  // Of the two on a page, the title bar's mounts first and takes the focus, where the new page starts.
  useEffect(() => {
    if (focusAfterStep === "previous") previousLink.current?.focus();
    if (focusAfterStep === "next") nextLink.current?.focus();
    focusAfterStep = null;
  }, []);

  if (!neighbours) return null;

  const { previous, next, position, total } = neighbours;
  const href = (key: string) => `/genshin/characters/${encodeURIComponent(key)}`;
  return (
    <nav aria-label={label} className="flex flex-wrap items-center gap-2">
      <Button asChild variant="outline" size="sm" className="h-11 sm:h-9">
        <Link
          ref={previousLink}
          href={href(previous)}
          onClick={() => {
            focusAfterStep = "previous";
          }}
          aria-label={`Previous character: ${formatCharacterDisplayName(previous)}`}>
          <ArrowLeft className="mr-1.5 h-4 w-4" aria-hidden="true" />
          {formatCharacterDisplayName(previous)}
        </Link>
      </Button>
      <span className="px-1 text-xs tabular-nums text-gray-700 dark:text-slate-300">
        {position} of {total}
      </span>
      <Button asChild variant="outline" size="sm" className="h-11 sm:h-9">
        <Link
          ref={nextLink}
          href={href(next)}
          onClick={() => {
            focusAfterStep = "next";
          }}
          aria-label={`Next character: ${formatCharacterDisplayName(next)}`}>
          {formatCharacterDisplayName(next)}
          <ArrowRight className="ml-1.5 h-4 w-4" aria-hidden="true" />
        </Link>
      </Button>
    </nav>
  );
}
