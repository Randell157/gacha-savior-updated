import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { addRecent, normalizeSearch, searchItemKey, searchItems, type SearchItem } from "./search.ts";

const item = (kind: SearchItem["kind"], name: string): SearchItem => ({
  kind,
  id: normalizeSearch(name).replace(/ /g, ""),
  name,
  sub: "",
  rarity: null,
  icon: null,
});

// Every weapon in the game data, plus a few hand-made entries of other kinds.
const weapons: SearchItem[] = Object.entries(
  JSON.parse(readFileSync("src/data/genshin/weapons.json", "utf8")).weapons as Record<string, { name: string }>
).map(([id, w]) => ({ ...item("weapon", w.name), id }));
const items: SearchItem[] = [
  item("character", "Furina"),
  item("character", "Hu Tao"),
  item("character", "Kaedehara Kazuha"),
  item("set", "Heart of the Furnace"),
  item("set", "Emblem of Severed Fate"),
  item("material", "Philosophies of Freedom"),
  item("material", "Teachings of Freedom"),
  ...weapons,
];
const names = (query: string) => searchItems(items, query).map((g) => [g.kind, g.items.map((i) => i.name), g.more]);

test("names are matched without punctuation, accents or case", () => {
  assert.equal(normalizeSearch("Amos' Bow"), "amos bow");
  assert.equal(normalizeSearch("  The   Catch "), "the catch");
  assert.equal(normalizeSearch("Pokémon"), "pokemon");
  assert.deepEqual(names("amos"), [["weapon", ["Amos' Bow"], 0]]);
  assert.deepEqual(names("AMOS' BOW"), [["weapon", ["Amos' Bow"], 0]]);
});

test("every word typed must be in the name, in any order", () => {
  assert.deepEqual(names("hu tao"), [["character", ["Hu Tao"], 0]]);
  assert.deepEqual(names("tao hu"), [["character", ["Hu Tao"], 0]]);
  assert.deepEqual(names("kazuha"), [["character", ["Kaedehara Kazuha"], 0]]);
  assert.deepEqual(names("freedom teach"), [["material", ["Teachings of Freedom"], 0]]);
  assert.deepEqual(names(""), []);
  assert.deepEqual(names("   "), []);
  assert.deepEqual(names("zzq"), []);
});

test("results come grouped in a fixed order, names starting with the first word first", () => {
  // "fur": Furina (starts with it) in Characters, then Heart of the Furnace (a word starts with it) in Artifact sets.
  assert.deepEqual(names("fur"), [
    ["character", ["Furina"], 0],
    ["set", ["Heart of the Furnace"], 0],
  ]);
  // Starts with the word, then a later word starts with it, then it's inside a word.
  const ranked = searchItems(
    [item("weapon", "Dawnlight"), item("weapon", "Harbinger of Dawn"), item("weapon", "Dawn Harbinger")],
    "dawn"
  )[0].items.map((i) => i.name);
  assert.deepEqual(ranked, ["Dawn Harbinger", "Dawnlight", "Harbinger of Dawn"]);
});

test("each group shows five and says how many more matched", () => {
  const swords = weapons.filter((w) => normalizeSearch(w.name).includes("sword")).length;
  const [group] = searchItems(items, "sword");
  assert.equal(group.kind, "weapon");
  assert.equal(group.items.length, 5);
  assert.equal(group.more, swords - 5);
  assert.ok(group.items.every((w) => normalizeSearch(w.name).includes("sword")));
});

test("the recently opened list keeps the last four, newest first, without repeats", () => {
  const furina = searchItemKey({ kind: "character", id: "Furina" });
  assert.equal(furina, "character:Furina");
  let recent = addRecent(undefined, furina);
  for (const key of ["weapon:amosbow", "set:emblemofseveredfate", "material:mora", "weapon:amosbow"]) {
    recent = addRecent(recent, key);
  }
  assert.deepEqual(recent, ["weapon:amosbow", "material:mora", "set:emblemofseveredfate", "character:Furina"]);
  assert.deepEqual(addRecent(recent, "character:Zhongli"), ["character:Zhongli", "weapon:amosbow", "material:mora", "set:emblemofseveredfate"]);
  assert.deepEqual(addRecent(["ok", 3, null], "x"), ["x", "ok"]);
});
