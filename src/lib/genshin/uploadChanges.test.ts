import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { noUploadChanges, uploadChanges } from "./uploadChanges.ts";
import { parseGoodText } from "./parseGood.ts";
import type { GenshinData, GoodArtifact, GoodCharacter, GoodWeapon } from "./types.ts";

const piece = (extra: Partial<GoodArtifact> = {}): GoodArtifact => ({
  setKey: "GoldenTroupe",
  slotKey: "flower",
  level: 20,
  rarity: 5,
  mainStatKey: "hp",
  substats: [{ key: "critRate_", value: 3.9 }],
  ...extra,
});
const char = (key: string, extra: Partial<GoodCharacter> = {}): GoodCharacter => ({
  key,
  level: 90,
  constellation: 0,
  talent: { auto: 1, skill: 9, burst: 9 },
  ...extra,
});
const weapon = (key: string, extra: Partial<GoodWeapon> = {}): GoodWeapon => ({ key, level: 90, refinement: 1, ...extra });
const data = (characters: GoodCharacter[], weapons: GoodWeapon[] = [], artifacts: GoodArtifact[] = []): GenshinData => ({
  format: "GOOD",
  version: 2,
  characters,
  weapons,
  artifacts,
  materials: {},
});

test("the same upload twice lists nothing", () => {
  const upload = data([char("Furina")], [weapon("FesteringDesire", { location: "Furina" })], [piece({ location: "Furina" })]);
  const changes = uploadChanges(upload, structuredClone(upload));
  assert.equal(noUploadChanges(changes), true);
  assert.deepEqual(changes.artifacts, { before: 1, after: 1, added: 0, removed: 0, leveled: 0 });
});

test("new characters are listed apart from changed ones", () => {
  const changes = uploadChanges(
    data([char("Furina"), char("Bennett")]),
    data([char("Furina", { constellation: 1, talent: { auto: 1, skill: 10, burst: 10 } }), char("Bennett"), char("Xilonen")])
  );
  assert.deepEqual(changes.newCharacters, ["Xilonen"]);
  assert.deepEqual(changes.missingCharacters, []);
  assert.deepEqual(changes.characters, [
    {
      key: "Furina",
      changes: [
        { kind: "constellation", from: 0, to: 1 },
        { kind: "talent", talent: "Skill", from: 9, to: 10 },
        { kind: "talent", talent: "Burst", from: 9, to: 10 },
      ],
    },
  ]);
});

test("characters left out of the new upload are listed as missing", () => {
  const changes = uploadChanges(data([char("Furina"), char("Bennett")]), data([char("Furina")]));
  assert.deepEqual(changes.missingCharacters, ["Bennett"]);
  assert.equal(noUploadChanges(changes), false);
});

test("the Traveler is the same character whatever the export calls it", () => {
  const changes = uploadChanges(
    data([char("TravelerAnemo", { level: 80 })], [weapon("DullBlade", { location: "TravelerAnemo" })]),
    data([char("Traveler")], [weapon("DullBlade", { location: "Traveler" })])
  );
  assert.deepEqual(changes.newCharacters, []);
  assert.deepEqual(changes.missingCharacters, []);
  assert.deepEqual(changes.characters, [{ key: "Traveler", changes: [{ kind: "level", from: 80, to: 90 }] }]);
});

test("weapons are counted by key, both ways", () => {
  const changes = uploadChanges(
    data([], [weapon("FavoniusSword"), weapon("FavoniusSword"), weapon("DullBlade")]),
    data([], [weapon("FavoniusSword"), weapon("Absolution"), weapon("DullBlade"), weapon("DullBlade")])
  );
  assert.deepEqual(changes.newWeapons, [
    { key: "Absolution", count: 1 },
    { key: "DullBlade", count: 1 },
  ]);
  assert.deepEqual(changes.removedWeapons, [{ key: "FavoniusSword", count: 1 }]);
});

test("a leveled artifact is matched, not counted as removed and added", () => {
  const before = piece({ level: 0, substats: [{ key: "critRate_", value: 3.9 }, { key: "atk_", value: 5.8 }] });
  const after = piece({
    level: 8,
    substats: [
      { key: "critRate_", value: 7.4 },
      { key: "atk_", value: 5.8 },
      { key: "critDMG_", value: 7.0 },
    ],
  });
  const changes = uploadChanges(data([], [], [before]), data([], [], [after]));
  assert.deepEqual(changes.artifacts, { before: 1, after: 1, added: 0, removed: 0, leveled: 1 });
});

test("artifacts used up and newly owned are counted apart", () => {
  const kept = piece({ setKey: "EmblemOfSeveredFate" });
  const fodder = piece({ setKey: "Gambler", rarity: 4, level: 0 });
  const dropped = piece({ setKey: "MarechausseeHunter", slotKey: "goblet", level: 0 });
  const changes = uploadChanges(data([], [], [kept, fodder]), data([], [], [kept, dropped, piece({ level: 0 })]));
  assert.deepEqual(changes.artifacts, { before: 2, after: 3, added: 2, removed: 1, leveled: 0 });
});

test("a piece whose substat went down is a different piece", () => {
  const before = piece({ level: 4, substats: [{ key: "critRate_", value: 7.0 }] });
  const after = piece({ level: 8, substats: [{ key: "critRate_", value: 3.9 }] });
  const changes = uploadChanges(data([], [], [before]), data([], [], [after]));
  assert.deepEqual(changes.artifacts, { before: 1, after: 1, added: 1, removed: 1, leveled: 0 });
});

test("the two sample exports, 2024 then 2026", () => {
  const load = (path: string) => {
    const result = parseGoodText(readFileSync(path, "utf8"));
    if (!result.ok) throw new Error(result.error);
    return result.data;
  };
  const dir = "public/sample-data/inventory-kamera/";
  const older = load(dir + "genshinData_GOOD_2024_10_28_01_22.json");
  const newer = load(dir + "genshin_export_2026-02-11_12-16.json");
  const changes = uploadChanges(older, newer);
  assert.equal(noUploadChanges(changes), false);
  assert.equal(changes.artifacts.after, newer.artifacts.length);
  const { before, after, added, removed, leveled } = changes.artifacts;
  // Every piece is accounted for on both sides.
  assert.equal(before - removed, after - added);
  assert.ok(leveled <= before - removed);
  assert.equal(noUploadChanges(uploadChanges(newer, structuredClone(newer))), true);
});
