import costs from "@/data/genshin/materialCosts.json";
import weapons from "@/data/genshin/weapons.json";
import { ALL_ARTIFACT_SETS, getArtifactSet } from "@/lib/genshin/artifactSets";
import { getCharacterDetails } from "@/lib/genshin/characterDetails";
import { weekdayNames } from "@/lib/genshin/farming";
import type { SearchItem } from "@/lib/genshin/search";
import { GENSHIN_CHARACTERS, getCharacterPortrait } from "@/lib/genshinCharacters";
import { formatCharacterDisplayName } from "@/lib/utils";

// Everything quick search can find, built once from the game data. This module
// pulls in the material cost file (about 160 KB), so it's only loaded when the
// search first opens.

const SHORT_DAY: Record<string, string> = {
  Monday: "Mon",
  Tuesday: "Tue",
  Wednesday: "Wed",
  Thursday: "Thu",
  Friday: "Fri",
  Saturday: "Sat",
};

/** "Forsaken Rift · Mon/Thu + Sun", or "" for materials without farming days. */
export function materialWhere(index: number): string {
  const entry = (costs.farming as unknown as Record<string, [number, number]>)[String(index)];
  if (!entry) return "";
  const [days, domain] = entry;
  const weekdays = weekdayNames(days)
    .filter((d) => d !== "Sunday")
    .map((d) => SHORT_DAY[d])
    .join("/");
  return `${(costs.domains as unknown as [string, string][])[domain][0]} · ${weekdays} + Sun`;
}

/**
 * The set's icon: its flower, or its circlet for the sets that only come as
 * circlets ("Prayers for…"); null when the site has no icon for it.
 */
function setIcon(id: string): string | null {
  const set = getArtifactSet(id);
  if (!set) return null;
  return set.twoPiece ? `/artifact-icons/${id}-flower.webp` : `/artifact-icons/${id}-circlet.webp`;
}

let cached: SearchItem[] | null = null;

export function searchIndex(): SearchItem[] {
  if (cached) return cached;
  const characters: SearchItem[] = GENSHIN_CHARACTERS.map(({ key, rarity }) => {
    const details = getCharacterDetails(key);
    return {
      kind: "character",
      id: key,
      name: formatCharacterDisplayName(key),
      sub: [details?.element, details?.weaponType].filter(Boolean).join(" · "),
      rarity,
      icon: getCharacterPortrait(key),
    };
  });
  const weaponItems: SearchItem[] = Object.entries(
    weapons.weapons as Record<string, { name: string; rarity: number; type: string }>
  ).map(([id, w]) => ({ kind: "weapon", id, name: w.name, sub: w.type, rarity: w.rarity, icon: `/weapon-icons/${id}.webp` }));
  const sets: SearchItem[] = ALL_ARTIFACT_SETS.map(({ id, name }) => {
    const set = getArtifactSet(id);
    return {
      kind: "set",
      id,
      name,
      // The "Prayers" sets have no bonus text in the data: they only come as circlets.
      sub: set?.twoPiece ? `2-piece: ${set.twoPiece}` : "Circlet only",
      rarity: null,
      icon: setIcon(id),
    };
  });
  const materials: SearchItem[] = (costs.materials as unknown as [string, string, number | null][]).map(([id, name, rarity], i) => ({
    kind: "material",
    id,
    name,
    sub: materialWhere(i),
    rarity,
    icon: `/material-icons/${id}.webp`,
  }));
  cached = [...characters, ...weaponItems, ...sets, ...materials];
  return cached;
}
