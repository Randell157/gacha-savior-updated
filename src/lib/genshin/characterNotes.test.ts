import { test } from "node:test";
import assert from "node:assert/strict";
import {
  alignTravelerNote,
  allTags,
  splitTags,
  cleanTag,
  MAX_TAGS,
  NOTE_MAX,
  PRESET_TAGS,
  presetSuggestions,
  readCharacterNotes,
  TAG_MAX,
  tagCounts,
  tagSuggestions,
  updateCharacterNote,
  type CharacterNotes,
} from "./characterNotes.ts";

const notes: CharacterNotes = {
  Furina: { note: "Waiting on a better goblet.", tags: ["Abyss team A", "Favorites"] },
  Bennett: { note: "", tags: ["Abyss team A"] },
};

test("cleanTag trims, collapses spaces and cuts long tags", () => {
  assert.equal(cleanTag("  Abyss   team  A "), "Abyss team A");
  assert.equal(cleanTag("x".repeat(30)).length, TAG_MAX);
  assert.equal(cleanTag("   "), "");
});

test("updateCharacterNote saves a note and tags, trimmed", () => {
  const result = updateCharacterNote(notes, "Xiangling", { note: "  Needs C6 \n", tags: [" Abyss  team B "] });
  assert.ok(result.ok);
  assert.deepEqual(result.notes.Xiangling, { note: "Needs C6", tags: ["Abyss team B"] });
  assert.deepEqual(result.notes.Furina, notes.Furina, "other characters are left alone");
});

test("updateCharacterNote reuses an existing tag's spelling and drops repeats", () => {
  const result = updateCharacterNote(notes, "Xiangling", { note: "", tags: ["favorites", "FAVORITES", "", "abyss team a"] });
  assert.ok(result.ok);
  assert.deepEqual(result.notes.Xiangling.tags, ["Favorites", "Abyss team A"]);
});

test("updateCharacterNote removes a character left with nothing", () => {
  const result = updateCharacterNote(notes, "Bennett", { note: "  ", tags: [] });
  assert.ok(result.ok);
  assert.equal("Bennett" in result.notes, false);
  assert.deepEqual(allTags(result.notes), ["Abyss team A", "Favorites"]);
});

test("updateCharacterNote refuses a long note and a sixth tag", () => {
  assert.equal(updateCharacterNote(notes, "Furina", { note: "x".repeat(NOTE_MAX + 1), tags: [] }).ok, false);
  assert.ok(updateCharacterNote(notes, "Furina", { note: "x".repeat(NOTE_MAX), tags: [] }).ok);
  assert.equal(updateCharacterNote(notes, "Furina", { note: "", tags: ["a", "b", "c", "d", "e", "f"] }).ok, false);
  assert.ok(updateCharacterNote(notes, "Furina", { note: "", tags: ["a", "b", "c", "d", "e"] }).ok);
});

test("updateCharacterNote refuses a 31st different tag, but allows reusing one", () => {
  const full: CharacterNotes = {};
  for (let i = 0; i < 6; i++) {
    full[`C${i}`] = { note: "", tags: Array.from({ length: 5 }, (_, j) => `tag ${i * 5 + j}`) };
  }
  assert.equal(allTags(full).length, MAX_TAGS);
  const refused = updateCharacterNote(full, "New", { note: "", tags: ["brand new"] });
  assert.equal(refused.ok, false);
  assert.ok(updateCharacterNote(full, "New", { note: "", tags: ["TAG 3"] }).ok);
  // Replacing a character's own tags frees them: C0's five can become five new ones.
  assert.ok(updateCharacterNote(full, "C0", { note: "", tags: ["v", "w", "x", "y", "z"] }).ok);
});

test("tags on characters missing from the upload don't count toward the limit or get suggested", () => {
  const full: CharacterNotes = {};
  for (let i = 0; i < 6; i++) {
    full[`C${i}`] = { note: "", tags: Array.from({ length: 5 }, (_, j) => `tag ${i * 5 + j}`) };
  }
  // C0 isn't in the latest upload, so its five tags free up room.
  const owned = new Set(["C1", "C2", "C3", "C4", "C5", "New"]);
  assert.equal(allTags(full, owned).length, MAX_TAGS - 5);
  assert.ok(updateCharacterNote(full, "New", { note: "", tags: ["brand new"] }, owned).ok);
  assert.equal(updateCharacterNote(full, "New", { note: "", tags: ["brand new"] }).ok, false);
});

test("alignTravelerNote moves the Traveler's note to the key the new upload uses", () => {
  const old: CharacterNotes = { TravelerAnemo: { note: "Main", tags: ["Favorites"] }, Furina: notes.Furina };
  const moved = alignTravelerNote(old, ["Traveler", "Furina"]);
  assert.deepEqual(moved.Traveler, old.TravelerAnemo);
  assert.equal("TravelerAnemo" in moved, false);
  assert.equal(alignTravelerNote(old, ["TravelerAnemo", "Furina"]), old, "same key: unchanged");
  assert.equal(alignTravelerNote(old, ["Furina"]), old, "no Traveler in the upload: unchanged");
  const both = { ...old, Traveler: { note: "New", tags: [] } };
  assert.equal(alignTravelerNote(both, ["Traveler"]), both, "an existing note on the new key wins");
});

test("splitTags splits pasted text at commas", () => {
  assert.deepEqual(splitTags("Abyss team A, Favorites,,  "), ["Abyss team A", "Favorites"]);
  assert.deepEqual(splitTags("  "), []);
});

test("readCharacterNotes skips malformed entries and holds to the limits", () => {
  const read = readCharacterNotes({
    Furina: { note: "ok", tags: ["A", "a", 3, " B "] },
    Empty: { note: "  ", tags: [] },
    Broken: "not an object",
    Long: { note: "x".repeat(500), tags: ["1", "2", "3", "4", "5", "6"] },
    Respelled: { tags: ["b"] },
  });
  assert.deepEqual(read.Furina, { note: "ok", tags: ["A", "B"] });
  assert.equal("Empty" in read, false);
  assert.equal("Broken" in read, false);
  assert.equal(read.Long.note.length, NOTE_MAX);
  assert.equal(read.Long.tags.length, 5);
  assert.deepEqual(read.Respelled, { note: "", tags: ["B"] });
  assert.deepEqual(readCharacterNotes(undefined), {});
  assert.deepEqual(readCharacterNotes([1, 2]), {});
});

test("readCharacterNotes drops no tags past 30, since characters missing from the upload don't count", () => {
  // An unowned character's 5 tags plus 30 on owned characters, as saves allow.
  const raw: Record<string, unknown> = {};
  for (let i = 0; i < 7; i++) raw[`C${i}`] = { tags: Array.from({ length: 5 }, (_, j) => `t${i * 5 + j}`) };
  assert.equal(allTags(readCharacterNotes(raw)).length, 35);
});

test("a tag's spelling follows characters missing from the upload too", () => {
  const withUnowned: CharacterNotes = { Albedo: { note: "", tags: ["Favorites"] } };
  const result = updateCharacterNote(withUnowned, "Furina", { note: "", tags: ["favorites"] }, new Set(["Furina"]));
  assert.ok(result.ok);
  assert.deepEqual(result.notes.Furina.tags, ["Favorites"]);
});

test("tagCounts counts only the given characters, sorted by name", () => {
  assert.deepEqual(tagCounts(notes, ["Furina", "Bennett"]), [
    { tag: "Abyss team A", count: 2 },
    { tag: "Favorites", count: 1 },
  ]);
  assert.deepEqual(tagCounts(notes, ["Bennett"]), [{ tag: "Abyss team A", count: 1 }]);
});

test("presetSuggestions leaves out presets already in use or on the character, and matches what's typed", () => {
  const presets = presetSuggestions(["favorites"], ["Abyss 1"], "");
  assert.equal(presets.includes("Favorites"), false, "in use: it shows under Your tags instead");
  assert.equal(presets.includes("Abyss 1"), false);
  assert.ok(presets.includes("Abyss 2"));
  assert.deepEqual(presetSuggestions([], [], "needs"), ["Needs artifacts", "Needs talents", "Needs leveling"]);
  assert.ok(PRESET_TAGS.every((tag) => cleanTag(tag) === tag), "presets fit the tag limits");
});

test("tagSuggestions leaves out the character's own tags and matches what's typed", () => {
  const known = ["Abyss team A", "Abyss team B", "Favorites"];
  assert.deepEqual(tagSuggestions(known, ["abyss team a"], ""), ["Abyss team B", "Favorites"]);
  assert.deepEqual(tagSuggestions(known, [], "abyss"), ["Abyss team A", "Abyss team B"]);
});
