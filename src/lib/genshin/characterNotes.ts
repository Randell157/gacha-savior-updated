// The player's own note and tags on each owned character (Phase 7 step 3).
// Saved with the account as one map on the Genshin document, keyed by the
// character's export key, and kept through new uploads.

/** Longest note, in characters. */
export const NOTE_MAX = 200;
/** Most tags on one character. */
export const TAGS_PER_CHARACTER = 5;
/** Longest tag, in characters. */
export const TAG_MAX = 20;
/** Most different tags on the account. */
export const MAX_TAGS = 30;

export interface CharacterNote {
  note: string;
  tags: string[];
}

/** Character key → note and tags. Characters with neither have no entry. */
export type CharacterNotes = Record<string, CharacterNote>;

export const NO_NOTE: CharacterNote = { note: "", tags: [] };

/** A tag as it's stored: trimmed, inner spaces collapsed, at most `TAG_MAX` characters. */
export function cleanTag(raw: string): string {
  return raw.replace(/\s+/g, " ").trim().slice(0, TAG_MAX).trim();
}

/** What's typed or pasted into the tag box, split at commas into tags ("a, b" is two). */
export function splitTags(raw: string): string[] {
  return raw.split(",").map(cleanTag).filter(Boolean);
}

/** Tags match whatever their case: "favorites" is the same tag as "Favorites". */
export function sameTag(a: string, b: string): boolean {
  return a.toLocaleLowerCase() === b.toLocaleLowerCase();
}

/** Drops empty and repeated tags (keeping the first spelling) and anything past `limit`. */
function uniqueTags(tags: readonly string[], limit = TAGS_PER_CHARACTER): string[] {
  const out: string[] = [];
  for (const raw of tags) {
    const tag = cleanTag(raw);
    if (tag && !out.some((t) => sameTag(t, tag))) out.push(tag);
  }
  return out.slice(0, limit);
}

/**
 * Every different tag in use, in the order first met. With `owned`, only the
 * tags on those characters: one missing from the latest upload has no page to
 * edit its tags on, so they mustn't count toward the limit or be suggested.
 */
export function allTags(notes: CharacterNotes, owned?: ReadonlySet<string>): string[] {
  const out: string[] = [];
  for (const [key, { tags }] of Object.entries(notes)) {
    if (owned && !owned.has(key)) continue;
    for (const tag of tags) if (!out.some((t) => sameTag(t, tag))) out.push(tag);
  }
  return out;
}

const isTraveler = (key: string) => /^Traveler/.test(key);

/**
 * Exports name the Traveler differently ("TravelerAnemo" in older GOOD files,
 * "Traveler" in newer ones), so on a new upload the Traveler's note moves to
 * the key the upload uses, unless that key already has one.
 */
export function alignTravelerNote(notes: CharacterNotes, ownedKeys: readonly string[]): CharacterNotes {
  const traveler = ownedKeys.find(isTraveler);
  if (!traveler || notes[traveler]) return notes;
  const old = Object.keys(notes).find((key) => isTraveler(key) && key !== traveler);
  if (!old) return notes;
  const moved: CharacterNotes = { ...notes, [traveler]: notes[old] };
  delete moved[old];
  return moved;
}

/**
 * Reads the saved map back, skipping anything malformed and holding each
 * character to the note and tag limits, so a hand-edited or older document
 * can't break the pages. The account-wide `MAX_TAGS` isn't applied here: it
 * counts only characters in the upload, which this doesn't know, so dropping
 * tags here could silently take them off owned characters. Saves enforce it.
 */
export function readCharacterNotes(raw: unknown): CharacterNotes {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const notes: CharacterNotes = {};
  const seen: string[] = [];
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    if (!key || !value || typeof value !== "object") continue;
    const { note, tags } = value as Partial<Record<keyof CharacterNote, unknown>>;
    const text = typeof note === "string" ? note.trim().slice(0, NOTE_MAX) : "";
    const kept = uniqueTags(Array.isArray(tags) ? tags.filter((t): t is string => typeof t === "string") : []);
    // One spelling per tag across the account (saves keep it that way too).
    const spelled = kept.map((tag) => {
      const known = seen.find((t) => sameTag(t, tag));
      if (known) return known;
      seen.push(tag);
      return tag;
    });
    if (text || spelled.length) notes[key] = { note: text, tags: spelled };
  }
  return notes;
}

export type NoteUpdate = { ok: true; notes: CharacterNotes } | { ok: false; error: string };

/**
 * The map with one character's note and tags replaced. A tag already used on
 * another character keeps that spelling; a character left with neither note nor
 * tags is taken out. Refuses (with a message for the player) anything over the
 * limits. With `owned`, only those characters' tags count toward `MAX_TAGS`.
 */
export function updateCharacterNote(
  notes: CharacterNotes,
  key: string,
  edit: CharacterNote,
  owned?: ReadonlySet<string>
): NoteUpdate {
  const note = edit.note.trim();
  if (note.length > NOTE_MAX) {
    return { ok: false, error: `A note can be at most ${NOTE_MAX} characters.` };
  }
  const tags = uniqueTags(edit.tags, Infinity);
  if (tags.length > TAGS_PER_CHARACTER) {
    return { ok: false, error: `A character can have at most ${TAGS_PER_CHARACTER} tags.` };
  }
  const others: CharacterNotes = { ...notes };
  delete others[key];
  // Spelling follows every character's tags; the limit counts only owned ones.
  const spelling = allTags(others);
  const existing = allTags(others, owned);
  const spelled = tags.map((tag) => spelling.find((t) => sameTag(t, tag)) ?? tag);
  const added = spelled.filter((tag) => !existing.some((t) => sameTag(t, tag)));
  if (existing.length + added.length > MAX_TAGS) {
    return {
      ok: false,
      error: `You can have at most ${MAX_TAGS} different tags. Use one you already have, or remove a tag from every character that has it.`,
    };
  }
  if (!note && spelled.length === 0) return { ok: true, notes: others };
  return { ok: true, notes: { ...others, [key]: { note, tags: spelled } } };
}

/**
 * Each tag the given characters use, with how many of them have it, sorted by
 * name. Pass the owned characters' keys, so notes on a character missing from
 * the latest upload don't show up in the roster's filter.
 */
export function tagCounts(notes: CharacterNotes, keys: Iterable<string>): { tag: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const key of keys) {
    for (const tag of notes[key]?.tags ?? []) counts.set(tag, (counts.get(tag) ?? 0) + 1);
  }
  return [...counts]
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => a.tag.localeCompare(b.tag, undefined, { sensitivity: "base" }));
}

/**
 * Tags offered before the player has made their own: endgame modes and what a
 * character still needs. No playstyles, since the roster's Playstyle filter has them.
 */
export const PRESET_TAGS = [
  "Abyss 1",
  "Abyss 2",
  "Imaginarium Theater",
  "Stygian Onslaught",
  "Favorites",
  "Needs artifacts",
  "Needs talents",
  "Needs leveling",
  "Exploration",
];

/** The preset tags to suggest: not in use yet (those are among `known`), not on this character, matching what's typed. */
export function presetSuggestions(known: readonly string[], current: readonly string[], typed: string): string[] {
  return tagSuggestions(PRESET_TAGS, [...known, ...current], typed);
}

/** Tags to suggest while typing on one character: ones in use, not already on it, matching what's typed. */
export function tagSuggestions(known: readonly string[], current: readonly string[], typed: string): string[] {
  const query = cleanTag(typed).toLocaleLowerCase();
  return known.filter(
    (tag) => !current.some((t) => sameTag(t, tag)) && (!query || tag.toLocaleLowerCase().includes(query))
  );
}
