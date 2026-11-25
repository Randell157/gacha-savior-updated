// Quick search (Ctrl+K): matching what's typed against every character,
// weapon, artifact set and material, grouped by kind. The items are built in
// `searchIndex.ts` from the game data; this file stays free of `@/` imports
// so it runs under the unit tests.

export type SearchKind = "character" | "weapon" | "set" | "material";

export interface SearchItem {
  kind: SearchKind;
  /** The roster key, weapon id, set id or material export key */
  id: string;
  /** The in-game name */
  name: string;
  /** A second line: element and weapon type, weapon type, the 2-piece bonus, or where a material drops */
  sub: string;
  /** For the icon's background; null when the game data doesn't say */
  rarity: number | null;
  icon: string | null;
}

export interface SearchGroup {
  kind: SearchKind;
  label: string;
  items: SearchItem[];
  /** How many more matched than are shown */
  more: number;
}

export const GROUP_ORDER: [SearchKind, string][] = [
  ["character", "Characters"],
  ["weapon", "Weapons"],
  ["set", "Artifact sets"],
  ["material", "Materials"],
];

/** Up to this many results of each kind are shown; typing more narrows them down. */
export const PER_GROUP = 5;

/** Lowercase letters, digits and single spaces: "Amos' Bow" → "amos bow", "Hu Tao" stays two words. */
export function normalizeSearch(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/**
 * The items whose name holds every word typed, grouped by kind in a fixed
 * order. Within a group, names that start with the first word come first, then
 * names with a word starting with it, then the rest, each A–Z.
 */
export function searchItems(items: SearchItem[], query: string, perGroup = PER_GROUP): SearchGroup[] {
  const words = normalizeSearch(query).split(" ").filter(Boolean);
  if (words.length === 0) return [];
  const scored: { item: SearchItem; score: number }[] = [];
  for (const item of items) {
    const name = normalizeSearch(item.name);
    if (!words.every((word) => name.includes(word))) continue;
    const score = name.startsWith(words[0]) ? 0 : name.split(" ").some((part) => part.startsWith(words[0])) ? 1 : 2;
    scored.push({ item, score });
  }
  scored.sort((a, b) => a.score - b.score || a.item.name.localeCompare(b.item.name));
  const groups: SearchGroup[] = [];
  for (const [kind, label] of GROUP_ORDER) {
    const matches = scored.filter((s) => s.item.kind === kind);
    if (matches.length === 0) continue;
    groups.push({ kind, label, items: matches.slice(0, perGroup).map((s) => s.item), more: Math.max(0, matches.length - perGroup) });
  }
  return groups;
}

/** A stable id for an item across kinds, for the recently opened list. */
export const searchItemKey = (item: Pick<SearchItem, "kind" | "id">) => `${item.kind}:${item.id}`;

export const MAX_RECENT = 4;

/** The recently opened list with `key` moved to the front, at most MAX_RECENT long. */
export function addRecent(recent: unknown, key: string): string[] {
  const list = Array.isArray(recent) ? recent.filter((k): k is string => typeof k === "string" && k !== key) : [];
  return [key, ...list].slice(0, MAX_RECENT);
}
