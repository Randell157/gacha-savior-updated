import { test } from "node:test";
import assert from "node:assert/strict";
import { critValue, isCritCirclet, isLikelyFodder, roundCv, scoreTier, tierLabel, SCORE_TIERS } from "./artifactScore.ts";
import type { GoodArtifact, GoodSubstat } from "./types.ts";

const piece = (substats: GoodSubstat[], extra: Partial<GoodArtifact> = {}): GoodArtifact => ({
  setKey: "GoldenTroupe",
  slotKey: "flower",
  level: 20,
  rarity: 5,
  mainStatKey: "hp",
  substats,
  ...extra,
});

/** Substats worth exactly this much CV, from CRIT DMG alone. */
const cv = (value: number) => [{ key: "critDMG_", value }];

test("critValue doubles CRIT Rate and adds CRIT DMG", () => {
  assert.equal(critValue(piece([{ key: "critRate_", value: 3.9 }, { key: "critDMG_", value: 7.8 }])), 15.6);
});

test("critValue ignores other substats and the main stat", () => {
  assert.equal(critValue(piece([{ key: "atk_", value: 5.8 }, { key: "eleMas", value: 23 }], { mainStatKey: "critRate_" })), 0);
  assert.equal(critValue(piece([])), 0);
});

test("critValue clears floating-point noise", () => {
  // 0.1 + 0.2 style sums: 6.2 + 7 + 3.5 * 2 would otherwise print with stray digits.
  const result = critValue(piece([{ key: "critDMG_", value: 6.2 }, { key: "critDMG_", value: 7 }, { key: "critRate_", value: 3.5 }]));
  assert.equal(result, 20.2);
  assert.equal(roundCv(0.1 + 0.2), 0.3);
});

test("scoreTier uses the tier minimums at their edges", () => {
  assert.equal(scoreTier(piece(cv(40))), "excellent");
  assert.equal(scoreTier(piece(cv(39.9))), "great");
  assert.equal(scoreTier(piece(cv(30))), "great");
  assert.equal(scoreTier(piece(cv(29.9))), "good");
  assert.equal(scoreTier(piece(cv(20))), "good");
  assert.equal(scoreTier(piece(cv(19.9))), "low");
  assert.equal(scoreTier(piece([])), "low");
});

test("scoreTier leaves out lower rarities, unfinished pieces and CRIT circlets", () => {
  assert.equal(scoreTier(piece(cv(50), { rarity: 4 })), "unrated");
  assert.equal(scoreTier(piece(cv(50), { rarity: 4, level: 4 })), "unrated");
  assert.equal(scoreTier(piece(cv(50), { level: 19 })), "leveling");
  assert.equal(scoreTier(piece(cv(50), { slotKey: "circlet", mainStatKey: "critDMG_" })), "critCirclet");
});

test("isCritCirclet needs both a circlet and a CRIT main stat", () => {
  assert.equal(isCritCirclet({ slotKey: "circlet", mainStatKey: "critRate_" }), true);
  assert.equal(isCritCirclet({ slotKey: "circlet", mainStatKey: "critDMG_" }), true);
  assert.equal(isCritCirclet({ slotKey: "circlet", mainStatKey: "atk_" }), false);
  assert.equal(isCritCirclet({ slotKey: "goblet", mainStatKey: "critRate_" }), false);
  assert.equal(isCritCirclet({ slotKey: "circlet", mainStatKey: undefined }), false);
});

test("isLikelyFodder means unequipped with a Low score", () => {
  assert.equal(isLikelyFodder(piece(cv(10))), true);
  assert.equal(isLikelyFodder(piece(cv(10), { location: "Furina" })), false);
  assert.equal(isLikelyFodder(piece(cv(25))), false);
  assert.equal(isLikelyFodder(piece(cv(10), { level: 8 })), false);
});

test("every tier has a label", () => {
  for (const { value, label } of SCORE_TIERS) assert.equal(tierLabel(value), label);
  assert.equal(tierLabel("leveling"), "Still leveling");
});
