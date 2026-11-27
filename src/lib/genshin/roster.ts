import { getCharacterDetails, getCharacterRoles } from "@/lib/genshin/characterDetails";
import type { GenshinData, GoodCharacter } from "@/lib/genshin/types";
import { favoritesFirst, tagCounts, type CharacterNotes } from "@/lib/genshin/characterNotes";
import { GENSHIN_CHARACTERS, normalizeCharacterKey } from "@/lib/genshinCharacters";
import { compareVersions, formatCharacterDisplayName } from "@/lib/utils";

/** The chosen values in each group; an empty group means any. */
export interface CharacterFilterState {
  element: string[];
  weapon: string[];
  rarity: string[];
  role: string[];
  region: string[];
  /** The player's own tags (Phase 7 step 3); only owned characters have them */
  tags: string[];
}

export const NO_FILTERS: CharacterFilterState = { element: [], weapon: [], rarity: [], role: [], region: [], tags: [] };

export function activeFilterCount(filters: CharacterFilterState): number {
  return Object.values(filters).reduce((n, values) => n + (Array.isArray(values) ? values.length : 0), 0);
}

/**
 * The filters with any remembered tag that no owned character has any more
 * taken out, so a tag removed since can't leave the roster empty with nothing
 * to show why.
 */
export function withKnownTags(filters: CharacterFilterState, known: readonly string[]): CharacterFilterState {
  const tags = (filters.tags ?? []).filter((tag) => known.includes(tag));
  return tags.length === (filters.tags ?? []).length ? filters : { ...filters, tags };
}

/** The tags on the upload's characters, with how many have each, sorted by name. */
export function ownedTags(data: GenshinData | null | undefined, notes: CharacterNotes) {
  return tagCounts(notes, (data?.characters ?? []).map((character) => character.key));
}

/**
 * Whether a roster character matches: any chosen value within a group
 * (Support or Healer), and every group with a choice (Pyro and Sword).
 * `tags` are the character's own tags.
 */
export function matchesCharacterFilters(
  character: { key: string; rarity: number },
  filters: CharacterFilterState,
  tags: readonly string[] = []
): boolean {
  const details = getCharacterDetails(character.key);
  const checks: [string[], readonly string[]][] = [
    [filters.element, details?.element ? [details.element] : []],
    [filters.weapon, details?.weaponType ? [details.weaponType] : []],
    [filters.rarity, [String(character.rarity)]],
    [filters.role, getCharacterRoles(character.key)],
    [filters.region, [details?.region ?? "Other"]],
    [filters.tags ?? [], tags],
  ];
  return checks.every(([chosen, values]) => chosen.length === 0 || chosen.some((v) => values.includes(v)));
}

type BuildField = "level" | "constellation" | "auto" | "skill" | "burst";
export type SortField = "name" | "release" | "obtained" | BuildField;
export type OwnedFilter = "all" | "owned" | "unowned" | "favorites";

/** What the roster is showing. The roster remembers these, and character pages step through the result. */
export interface RosterChoices {
  sortOrder: string;
  ownedFilter: OwnedFilter;
  search: string;
  filters: CharacterFilterState;
  /** Starred characters before everyone else, in the same sort (on by default) */
  favoritesFirst: boolean;
}

export const DEFAULT_ROSTER_CHOICES: RosterChoices = {
  sortOrder: "name-asc",
  ownedFilter: "all",
  search: "",
  filters: NO_FILTERS,
  favoritesFirst: true,
};

/** Where `useRememberedState` keeps each choice. */
export const ROSTER_MEMORY_KEYS = {
  sortOrder: "roster:sort",
  ownedFilter: "roster:show",
  search: "roster:search",
  filters: "roster:filters",
  favoritesFirst: "roster:favoritesFirst",
} as const;

/** The player's own marks on characters, by export key: notes and tags, and the favorites. */
export interface RosterMarks {
  notes: CharacterNotes;
  favorites: readonly string[];
}

const NO_MARKS: RosterMarks = { notes: {}, favorites: [] };

function sortValue(character: GoodCharacter, field: BuildField): number {
  if (field === "level" || field === "constellation") return character[field];
  return character.talent?.[field] ?? -1;
}

export function releaseVersion(key: string): string {
  return getCharacterDetails(key)?.version ?? "0";
}

/** A remembered Obtained sort can outlive the upload that allowed it. */
export function usableSortOrder(sortOrder: string, data: GenshinData | null | undefined): string {
  return sortOrder.startsWith("obtained") && !hasObtainedOrder(data) ? DEFAULT_ROSTER_CHOICES.sortOrder : sortOrder;
}

/**
 * Irminsul lists characters in the order the account got them, Traveler first.
 * Inventory Kamera uses the in-game list's order, which says nothing about that.
 */
export function hasObtainedOrder(data: GenshinData | null | undefined): boolean {
  return data?.source === "Irminsul";
}

/** Each owned character's position in the upload, from 1, by normalized key. */
export function obtainedPositions(data: GenshinData | null | undefined): Map<string, number> {
  const map = new Map<string, number>();
  data?.characters.forEach((char, index) => {
    const normalized = normalizeCharacterKey(char.key);
    map.set(normalized.startsWith("traveler") ? "traveler" : normalized, index + 1);
  });
  return map;
}

/** The roster's characters for these choices, in order, each with its build if owned. */
export function buildRoster(
  data: GenshinData | null | undefined,
  choices: RosterChoices,
  marks: RosterMarks = NO_MARKS
) {
  const { notes } = marks;
  const favorites = new Set(marks.favorites);
  const isFavorite = (character: { owned: GoodCharacter | null }) =>
    !!character.owned && favorites.has(character.owned.key);
  const sorted = sortRoster(data, choices, notes, isFavorite);
  return choices.favoritesFirst ? favoritesFirst(sorted, isFavorite) : sorted;
}

function sortRoster(
  data: GenshinData | null | undefined,
  choices: RosterChoices,
  notes: CharacterNotes,
  isFavorite: (character: { owned: GoodCharacter | null }) => boolean
) {
  const ownedByNormalizedKey = new Map<string, GoodCharacter>();
  for (const char of data?.characters ?? []) {
    const normalized = normalizeCharacterKey(char.key);
    ownedByNormalizedKey.set(normalized, char);
    if (normalized.startsWith("traveler")) ownedByNormalizedKey.set("traveler", char);
  }
  const positions = obtainedPositions(data);
  const query = choices.search.trim().toLowerCase();

  const list = GENSHIN_CHARACTERS.map((entry) => {
    const owned = ownedByNormalizedKey.get(normalizeCharacterKey(entry.key));
    return {
      ...entry,
      owned: owned ?? null,
      ownedKey: owned?.key ?? entry.key,
    };
  }).filter((character) => {
    if (choices.ownedFilter === "owned" && !character.owned) return false;
    if (choices.ownedFilter === "unowned" && character.owned) return false;
    if (choices.ownedFilter === "favorites" && !isFavorite(character)) return false;
    if (query && !formatCharacterDisplayName(character.key).toLowerCase().includes(query)) return false;
    return matchesCharacterFilters(character, choices.filters, character.owned ? notes[character.owned.key]?.tags : []);
  });

  const byName = (a: { key: string }, b: { key: string }) =>
    formatCharacterDisplayName(a.key).localeCompare(formatCharacterDisplayName(b.key));
  const [field, direction] = usableSortOrder(choices.sortOrder, data).split("-") as [SortField, "asc" | "desc"];
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
      const first = positions.get(normalizeCharacterKey(a.key));
      const second = positions.get(normalizeCharacterKey(b.key));
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
}

/**
 * Who comes before and after a character when stepping through their pages:
 * the owned characters the roster is showing, in its order. A character the
 * roster's filters leave out (reached from the Artifacts page, say) steps
 * through everyone owned instead, in the same sort. Wraps around at the ends.
 */
export function characterNeighbours(
  data: GenshinData | null | undefined,
  characterKey: string,
  choices: RosterChoices,
  marks: RosterMarks = NO_MARKS
): { previous: string; next: string; position: number; total: number } | null {
  const ownedKeys = (from: RosterChoices) =>
    buildRoster(data, from, marks)
      .filter((character) => character.owned)
      .map((character) => character.ownedKey);

  let keys = ownedKeys(choices);
  if (!keys.includes(characterKey)) {
    keys = ownedKeys({ ...DEFAULT_ROSTER_CHOICES, sortOrder: choices.sortOrder, favoritesFirst: choices.favoritesFirst });
  }
  const index = keys.indexOf(characterKey);
  if (index === -1 || keys.length < 2) return null;
  return {
    previous: keys[(index - 1 + keys.length) % keys.length],
    next: keys[(index + 1) % keys.length],
    position: index + 1,
    total: keys.length,
  };
}
