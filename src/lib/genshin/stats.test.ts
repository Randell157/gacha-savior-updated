import { test } from "node:test";
import assert from "node:assert/strict";
import { formatSlotName, formatStat, formatStatName, isCritStat, isPercentStat } from "./stats.ts";

test("formatStatName tells flat and percentage HP, ATK and DEF apart", () => {
  assert.equal(formatStatName("hp"), "HP");
  assert.equal(formatStatName("hp_"), "HP%");
  assert.equal(formatStatName("atk_"), "ATK%");
  assert.equal(formatStatName("def_"), "DEF%");
});

test("formatStatName keeps the plain name for stats that are always percentages", () => {
  assert.equal(formatStatName("critRate_"), "CRIT Rate");
  assert.equal(formatStatName("enerRech_"), "Energy Recharge");
  assert.equal(formatStatName("dendro_dmg_"), "Dendro DMG Bonus");
});

test("formatStatName falls back to the key for unknown stats", () => {
  assert.equal(formatStatName("mystery_"), "mystery_");
});

test("formatStat shows percentages to one decimal and flat stats as whole numbers", () => {
  assert.equal(formatStat("critDMG_", 7.8), "CRIT DMG 7.8%");
  assert.equal(formatStat("hp_", 46.6), "HP% 46.6%");
  assert.equal(formatStat("critRate_", 31.099999999), "CRIT Rate 31.1%");
  assert.equal(formatStat("enerRech_", 6), "Energy Recharge 6%");
  assert.equal(formatStat("atk", 18.68), "ATK 19");
  assert.equal(formatStat("eleMas", 187), "Elemental Mastery 187");
});

test("isPercentStat and isCritStat", () => {
  assert.equal(isPercentStat("hp_"), true);
  assert.equal(isPercentStat("hp"), false);
  assert.equal(isCritStat("critRate_"), true);
  assert.equal(isCritStat("critDMG_"), true);
  assert.equal(isCritStat("atk_"), false);
});

test("formatSlotName", () => {
  assert.equal(formatSlotName("sands"), "Sands of Eon");
  assert.equal(formatSlotName("unknown"), "unknown");
});
