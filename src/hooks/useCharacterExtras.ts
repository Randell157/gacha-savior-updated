"use client";

import { useEffect, useState } from "react";
import {
  getCharacterBaseStats,
  getCharacterTexts,
  type BaseStat,
  type CharacterExtrasFile,
  type CharacterTexts,
} from "@/lib/genshin/characterExtras";
import { rosterKey } from "@/lib/genshinCharacters";

let cached: CharacterExtrasFile | null = null;

async function loadExtras(): Promise<CharacterExtrasFile> {
  const data = await import("@/data/genshin/characterExtras.json");
  cached = data.default as unknown as CharacterExtrasFile;
  return cached;
}

export interface CharacterExtras extends CharacterTexts {
  loading: boolean;
  stats: BaseStat[] | null;
}

/**
 * A character's talent and constellation text and base stats at a level. The
 * data file is large, so it's fetched the first time this runs on a page, not
 * with the site's main code. If that fails, everything stays empty and the
 * pieces showing it hide themselves.
 */
export function useCharacterExtras(
  characterKey: string,
  travelerElement: string | null,
  level: number,
  ascension: number
): CharacterExtras {
  const [file, setFile] = useState(cached);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (file) return;
    let current = true;
    loadExtras()
      .then((loaded) => {
        if (current) setFile(loaded);
      })
      .catch((error) => {
        console.error("Couldn't load character details:", error);
        if (current) setFailed(true);
      });
    return () => {
      current = false;
    };
  }, [file]);

  if (!file) return { loading: !failed, stats: null, talents: null, constellations: null };
  const id = rosterKey(characterKey);
  return {
    loading: false,
    stats: getCharacterBaseStats(file, id, level, ascension),
    ...getCharacterTexts(file, id, travelerElement),
  };
}
