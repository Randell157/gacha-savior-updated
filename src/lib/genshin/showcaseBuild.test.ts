import { test } from "node:test";
import assert from "node:assert/strict";
import {
  artifactTotals,
  mainStatValue,
  buildChanges,
  buildGaps,
  critFromArtifacts,
  fillOrder,
  fillSlots,
  mainStatShort,
  moveSlot,
  snapshotBuilds,
  swapSlots,
} from "./showcaseBuild.ts";
import type { GenshinData, GoodArtifact, GoodCharacter, GoodWeapon } from "./types.ts";

const piece = (extra: Partial<GoodArtifact> = {}): GoodArtifact => ({
  setKey: "GoldenTroupe",
  slotKey: "flower",
  level: 20,
  rarity: 5,
  mainStatKey: "hp",
  substats: [],
  ...extra,
});
const char = (key: string, extra: Partial<GoodCharacter> = {}): GoodCharacter => ({
  key,
  level: 90,
  constellation: 0,
  talent: { auto: 1, skill: 9, burst: 9 },
  ...extra,
});
const weapon = (extra: Partial<GoodWeapon> = {}): GoodWeapon =>
  ({ key: "FesteringDesire", level: 90, ascension: 6, refinement: 5, location: "Furina", lock: true, ...extra }) as GoodWeapon;
const data = (characters: GoodCharacter[], weapons: GoodWeapon[] = [], artifacts: GoodArtifact[] = []): GenshinData => ({
  format: "GOOD",
  version: 2,
  characters,
  weapons,
  artifacts,
  materials: {},
});

test("mainStatShort uses short in-game names and falls back to the key", () => {
  assert.equal(mainStatShort("atk_"), "ATK%");
  assert.equal(mainStatShort("pyro_dmg_"), "Pyro DMG");
  assert.equal(mainStatShort("critDMG_"), "CRIT DMG");
  assert.equal(mainStatShort("newStat_"), "newStat_");
});

test("critFromArtifacts adds substats and 5★ +20 CRIT main stats", () => {
  const totals = critFromArtifacts([
    piece({ substats: [{ key: "critRate_", value: 3.9 }, { key: "critDMG_", value: 7.8 }] }),
    piece({ slotKey: "circlet", mainStatKey: "critDMG_", substats: [{ key: "critRate_", value: 10.5 }] }),
  ]);
  assert.deepEqual(totals, { critRate: 14.4, critDMG: 70, partial: false });
});

test("critFromArtifacts leaves out CRIT main stats it can't value, and says so", () => {
  const totals = critFromArtifacts([piece({ slotKey: "circlet", mainStatKey: "critRate_", level: 16 })]);
  assert.deepEqual(totals, { critRate: 0, critDMG: 0, partial: true });
  assert.equal(critFromArtifacts([piece({ mainStatKey: "critRate_", rarity: 4 })]).partial, true);
});

test("buildGaps lists only plain facts", () => {
  const full = (["flower", "plume", "sands", "goblet", "circlet"] as const).map((slotKey) => piece({ slotKey }));
  assert.deepEqual(buildGaps(char("Furina"), weapon(), full), []);
  assert.deepEqual(
    buildGaps(char("Collei", { level: 80 }), undefined, [piece({ slotKey: "goblet", level: 12 })]),
    [
      { kind: "level", level: 80 },
      { kind: "noWeapon" },
      { kind: "missingPieces", slots: ["flower", "plume", "sands", "circlet"] },
      { kind: "leveling", count: 1 },
    ]
  );
  assert.deepEqual(buildGaps(char("Navia"), weapon({ level: 80 }), full.slice(0, 4)), [
    { kind: "weaponLevel", level: 80 },
    { kind: "missingPieces", slots: ["circlet"] },
  ]);
  // A 4★ piece below +20 isn't a gap: it may be all the player has.
  assert.deepEqual(buildGaps(char("Furina"), weapon(), full.map((p) => ({ ...p, rarity: 4, level: 16 }))), []);
});

test("buildChanges compares with the previous upload", () => {
  const before = data(
    [char("Bennett", { level: 71, talent: { auto: 1, skill: 6, burst: 7 } })],
    [weapon({ key: "SkywardBlade", location: "Bennett", level: 80, refinement: 1 })],
    [piece({ location: "Bennett", substats: [{ key: "critDMG_", value: 7.8 }] })]
  );
  const snapshot = snapshotBuilds(before);
  const now = char("Bennett", { level: 90, constellation: 1, talent: { auto: 1, skill: 6, burst: 8 } });
  const w = weapon({ key: "SkywardBlade", location: "Bennett", level: 90, refinement: 2 });
  const pieces = [piece({ location: "Bennett", substats: [{ key: "critDMG_", value: 20 }] })];
  assert.deepEqual(buildChanges(snapshot, now, w, pieces), [
    { kind: "level", from: 71, to: 90 },
    { kind: "constellation", from: 0, to: 1 },
    { kind: "talent", talent: "Burst", from: 7, to: 8 },
    { kind: "weaponLevel", from: 80, to: 90 },
    { kind: "refinement", from: 1, to: 2 },
    { kind: "totalCv", by: 12.2 },
  ]);
  // A different weapon is one change, not a level change too.
  assert.deepEqual(buildChanges(snapshot, char("Bennett", { level: 71, talent: { auto: 1, skill: 6, burst: 7 } }), weapon({ key: "AquilaFavonia", location: "Bennett" }), [piece({ location: "Bennett", substats: [{ key: "critDMG_", value: 7.8 }] })]), [
    { kind: "newWeapon", key: "AquilaFavonia" },
  ]);
});

test("buildChanges: nothing on the first upload, 'new' for a new character, nothing when unchanged", () => {
  const before = data([char("Furina")], [weapon()]);
  assert.deepEqual(buildChanges(null, char("Furina"), weapon(), []), []);
  assert.deepEqual(buildChanges(snapshotBuilds(before), char("Skirk"), undefined, []), [{ kind: "new" }]);
  assert.deepEqual(buildChanges(snapshotBuilds(before), char("Furina"), weapon(), []), []);
  assert.deepEqual(buildChanges(snapshotBuilds(before), char("Furina"), undefined, []), [{ kind: "newWeapon", key: null }]);
});

test("fillOrder ranks by Total CV or by level then talents, and fillSlots skips picked characters", () => {
  const account = data(
    [char("A", { level: 80 }), char("B", { talent: { auto: 10, skill: 10, burst: 10 } }), char("C"), char("D", { level: 90 })],
    [],
    [
      piece({ location: "A", substats: [{ key: "critDMG_", value: 30 }] }),
      piece({ location: "C", substats: [{ key: "critDMG_", value: 10 }] }),
    ]
  );
  assert.deepEqual(fillOrder(account, "cv"), ["A", "C", "B", "D"]);
  assert.deepEqual(fillOrder(account, "level"), ["B", "C", "D", "A"]);
  assert.deepEqual(fillSlots(["C", null, null, null, null], fillOrder(account, "cv")), ["C", "A", "B", "D", null]);
});

test("moveSlot shifts the characters between", () => {
  assert.deepEqual(moveSlot(["A", "B", "C", null, null], 0, 2), ["B", "C", "A", null, null]);
  assert.deepEqual(moveSlot(["A", "B", "C", null, null], 2, 1), ["A", "C", "B", null, null]);
  assert.deepEqual(moveSlot(["A", "B"], 1, 5), ["A", "B"]);
});

test("swapSlots trades two slots and leaves the rest", () => {
  assert.deepEqual(swapSlots(["A", "B", "C", "D", null], 0, 3), ["D", "B", "C", "A", null]);
  assert.deepEqual(swapSlots(["A", "B", "C"], 1, 1), ["A", "B", "C"]);
  assert.deepEqual(swapSlots(["A", "B"], 0, 4), ["A", "B"]);
});

test("mainStatValue knows 5★ +20 main stats only", () => {
  assert.equal(mainStatValue(piece({ mainStatKey: "hp" })), 4780);
  assert.equal(mainStatValue(piece({ mainStatKey: "pyro_dmg_" })), 46.6);
  assert.equal(mainStatValue(piece({ mainStatKey: "eleMas" })), 186.5);
  assert.equal(mainStatValue(piece({ mainStatKey: "atk_", level: 16 })), null);
  assert.equal(mainStatValue(piece({ mainStatKey: "atk_", rarity: 4 })), null);
});

test("artifactTotals adds main stats and substats in a fixed order", () => {
  const totals = artifactTotals([
    piece({ mainStatKey: "hp", substats: [{ key: "critDMG_", value: 7.8 }, { key: "atk_", value: 5.3 }] }),
    piece({ slotKey: "plume", mainStatKey: "atk", substats: [{ key: "critDMG_", value: 14 }, { key: "hp", value: 299 }] }),
    piece({ slotKey: "goblet", mainStatKey: "hydro_dmg_", level: 12, substats: [{ key: "eleMas", value: 23 }] }),
  ]);
  assert.deepEqual(totals.stats, [
    { key: "hp", value: 5079 },
    { key: "atk", value: 311 },
    { key: "atk_", value: 5.3 },
    { key: "eleMas", value: 23 },
    { key: "critDMG_", value: 21.8 },
  ]);
  assert.equal(totals.partial, true);
});
