import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  ascensionFor,
  combinePlans,
  findPlannedWeapon,
  MAX_PLANS,
  normalizePlans,
  isPlanOn,
  setKindOn,
  setPlanOn,
  removePlan,
  upsertPlan,
  type SavedPlan,
  characterExp,
  costKey,
  planCharacter,
  planWeapon,
  weaponExp,
  type MaterialCosts,
  type Plan,
} from "./materialPlanner.ts";

const costs: MaterialCosts = JSON.parse(readFileSync("src/data/genshin/materialCosts.json", "utf8"));
const need = (plan: Plan | null, name: string) => plan?.materials.find((m) => m.name === name)?.need ?? 0;
const ten = { auto: 10, skill: 10, burst: 10 };
const one = { auto: 1, skill: 1, burst: 1 };

test("EXP tables add up to the game's totals", () => {
  assert.equal(characterExp(1, 90), 8362650);
  assert.equal(weaponExp(5, 1, 90), 9064450);
  assert.equal(weaponExp(4, 1, 90), 6042650);
  assert.equal(weaponExp(3, 1, 90), 3988200);
  assert.equal(weaponExp(2, 1, 70), 1079675);
  assert.equal(weaponExp(1, 1, 70), 719875);
  // Ten steps: 80 → 81 through 89 → 90.
  assert.equal(characterExp(80, 90), 183175 + 216225 +243025 + 273100 + 306800 + 344600 + 386950 + 434425 + 487625 + 547200);
  assert.equal(characterExp(90, 90), 0);
});

test("ascensions needed for a level", () => {
  assert.deepEqual([1, 20, 21, 40, 41, 80, 81, 90].map(ascensionFor), [0, 0, 1, 1, 2, 5, 6, 6]);
});

test("costKey matches the roster's keys", () => {
  assert.equal(costKey("HuTao"), "hutao");
  assert.equal(costKey("KaedeharaKazuha"), "kaedeharakazuha");
  assert.equal(costKey("TravelerAnemo"), "traveler");
});

test("a new 5★ character to level 90 and 10/10/10", () => {
  const plan = planCharacter(costs, { key: "Furina", level: 1, ascension: 0, talent: one }, { level: 90, talent: ten }, {});
  // Ascension 420,000 + three talents at 1,652,500 + 8,362,650 EXP / 5.
  assert.equal(need(plan, "Mora"), 420000 + 3 * 1652500 + 1672530);
  assert.equal(need(plan, "Varunada Lazurite Gemstone"), 6);
  assert.equal(need(plan, "Water That Failed To Transcend"), 46);
  assert.equal(need(plan, "Lakelight Lily"), 168);
  assert.equal(need(plan, "Philosophies of Justice"), 3 * 38);
  assert.equal(need(plan, "Lightless Mass"), 18);
  assert.equal(need(plan, "Crown of Insight"), 3);
  // Nectar is used by both ascension (18/30/36) and talents (3 × 6/22/31).
  assert.equal(need(plan, "Energy Nectar"), 36 + 3 * 31);
  assert.deepEqual(plan?.exp, {
    need: 8362650,
    have: 0,
    missing: 8362650,
    missingItems: { name: "Hero's Wit", count: 419 },
  });
});

test("only what's left: 80 → 90 needs the last ascension, and 9 → 10 one talent level", () => {
  const plan = planCharacter(
    costs,
    { key: "Furina", level: 80, ascension: 5, talent: { auto: 1, skill: 9, burst: 10 } },
    { level: 90, talent: { auto: 1, skill: 10, burst: 10 } },
    {}
  );
  assert.equal(need(plan, "Varunada Lazurite Gemstone"), 6);
  assert.equal(need(plan, "Varunada Lazurite Chunk"), 0);
  assert.equal(need(plan, "Crown of Insight"), 1);
  assert.equal(need(plan, "Philosophies of Justice"), 16);
  assert.equal(plan?.exp?.need, characterExp(80, 90));
});

test("a character at a cap who has already ascended doesn't pay for it again", () => {
  const before = planCharacter(costs, { key: "Bennett", level: 80, ascension: 5, talent: ten }, { level: 90, talent: ten }, {});
  const after = planCharacter(costs, { key: "Bennett", level: 80, ascension: 6, talent: ten }, { level: 90, talent: ten }, {});
  assert.equal(need(before, "Agnidus Agate Gemstone"), 6);
  assert.equal(need(after, "Agnidus Agate Gemstone"), 0);
  // Without an ascension in the export, a character at a cap counts as not ascended past it.
  const unknown = planCharacter(costs, { key: "Bennett", level: 80, talent: ten }, { level: 90, talent: ten }, {});
  assert.equal(need(unknown, "Agnidus Agate Gemstone"), 6);
});

test("a target at or below the current levels needs nothing", () => {
  const plan = planCharacter(costs, { key: "Furina", level: 90, ascension: 6, talent: ten }, { level: 80, talent: one }, {});
  assert.deepEqual(plan, { materials: [], exp: null });
});

test("what you have is matched by export key, and what's missing comes first", () => {
  const plan = planCharacter(
    costs,
    { key: "Furina", level: 80, ascension: 5, talent: ten },
    { level: 90, talent: ten },
    { VarunadaLazuriteGemstone: 6, WaterThatFailedToTranscend: 3, LakelightLily: 100, HerosWit: 100, AdventurersExperience: 3, Mora: 5000000 }
  );
  const names = plan!.materials.map((m) => [m.name, m.have, m.missing]);
  assert.deepEqual(names[0], ["Mora", 5000000, 0]);
  const water = plan!.materials.find((m) => m.name === "Water That Failed To Transcend")!;
  assert.deepEqual([water.need, water.have, water.missing], [20, 3, 17]);
  const gem = plan!.materials.find((m) => m.name === "Varunada Lazurite Gemstone")!;
  assert.equal(gem.missing, 0);
  // Fully covered materials sort after the ones still missing.
  assert.ok(plan!.materials.indexOf(water) < plan!.materials.indexOf(gem));
  assert.equal(plan!.exp!.have, 100 * 20000 + 3 * 5000);
  assert.equal(plan!.exp!.missing, characterExp(80, 90) - 2015000);
});

test("Mora that isn't in the export is unknown, not zero", () => {
  const plan = planCharacter(costs, { key: "Furina", level: 80, ascension: 5, talent: ten }, { level: 90, talent: ten }, {});
  const mora = plan!.materials.find((m) => m.key === "mora")!;
  assert.equal(mora.have, null);
  assert.equal(mora.missing, mora.need);
});

test("the Traveler's talents follow the chosen element", () => {
  const now = { key: "Traveler", level: 90, ascension: 6, talent: one };
  const anemo = planCharacter(costs, now, { level: 90, talent: ten }, {}, "Anemo");
  assert.equal(need(anemo, "Crown of Insight"), 3);
  assert.equal(need(anemo, "Dvalin's Sigh"), 18);
  // With no element picked, talents can't be counted.
  const none = planCharacter(costs, now, { level: 90, talent: ten }, {});
  assert.equal(need(none, "Crown of Insight"), 0);
});

test("unknown characters and weapons have no plan", () => {
  assert.equal(planCharacter(costs, { key: "NotACharacter", level: 1 }, { level: 90, talent: ten }, {}), null);
  assert.equal(planWeapon(costs, 5, { key: "NotAWeapon", level: 1 }, 90, {}), null);
});

test("a 5★ weapon to 90, and a 4★ from 80", () => {
  const harp = planWeapon(costs, 5, { key: "SkywardHarp", level: 1, ascension: 0 }, 90, {});
  assert.equal(need(harp, "Mora"), 225000 + 906445);
  assert.equal(need(harp, "Boreal Wolf's Nostalgia"), 6);
  assert.equal(need(harp, "Ley Line Sprout"), 41);
  assert.deepEqual(harp?.exp?.missingItems, { name: "Mystic Enhancement Ore", count: 907 });

  const favonius = planWeapon(costs, 4, { key: "FavoniusSword", level: 80, ascension: 5 }, 90, { MysticEnhancementOre: 50 });
  assert.equal(need(favonius, "Scattered Piece of Decarabian's Dream"), 4);
  assert.equal(favonius?.exp?.need, weaponExp(4, 80, 90));
  assert.equal(favonius?.exp?.have, 500000);
});

test("1★ and 2★ weapons stop at 70", () => {
  const plan = planWeapon(costs, 1, { key: "DullBlade", level: 1, ascension: 0 }, 90, {});
  assert.equal(plan?.exp?.need, 719875);
});

test("normalizePlans keeps well-formed plans once and clamps levels", () => {
  const plans = normalizePlans([
    { kind: "character", key: "Furina", level: 95, talent: { auto: 1, skill: 12, burst: 9 } },
    { kind: "character", key: "Furina", level: 80, talent: { auto: 1, skill: 1, burst: 1 } },
    { kind: "weapon", key: "FavoniusSword", location: "", level: 90 },
    { kind: "weapon", key: "FavoniusSword", location: "Bennett", level: 90 },
    { kind: "character", key: "Bennett", level: 90 },
    { kind: "artifact", key: "x", level: 20 },
    "nonsense",
  ]);
  assert.deepEqual(plans, [
    { kind: "character", key: "Furina", level: 90, talent: { auto: 1, skill: 10, burst: 9 } },
    { kind: "weapon", key: "FavoniusSword", location: null, level: 90 },
    { kind: "weapon", key: "FavoniusSword", location: "Bennett", level: 90 },
  ]);
  assert.deepEqual(normalizePlans(undefined), []);
  const many = Array.from({ length: 30 }, (_, i) => ({ kind: "weapon", key: `W${i}`, location: null, level: 90 }));
  assert.equal(normalizePlans(many).length, MAX_PLANS);
});

test("upsertPlan replaces a plan in place, adds a new one at the end, and removePlan drops it", () => {
  const a: SavedPlan = { kind: "character", key: "Furina", level: 90, talent: ten };
  const b: SavedPlan = { kind: "weapon", key: "FavoniusSword", location: "Bennett", level: 80 };
  const plans = upsertPlan(upsertPlan([], a), b);
  const raised = upsertPlan(plans, { ...b, level: 90 });
  assert.deepEqual(raised, [a, { ...b, level: 90 }]);
  // Another holder's copy is a separate plan.
  assert.equal(upsertPlan(raised, { ...b, location: null }).length, 3);
  assert.deepEqual(removePlan(raised, a), [{ ...b, level: 90 }]);
});

test("findPlannedWeapon picks the holder's copy, or the best unequipped one", () => {
  const weapons = [
    { key: "FavoniusSword", level: 40 },
    { key: "FavoniusSword", level: 70 },
    { key: "FavoniusSword", level: 90, location: "Bennett" },
  ];
  assert.equal(findPlannedWeapon(weapons, "FavoniusSword", "Bennett")?.level, 90);
  assert.equal(findPlannedWeapon(weapons, "FavoniusSword", null)?.level, 70);
  assert.equal(findPlannedWeapon(weapons, "FavoniusSword", "Xingqiu"), undefined);
});

test("combinePlans adds needs up before comparing with what you have", () => {
  const furina = planCharacter(costs, { key: "Furina", level: 90, ascension: 6, talent: { auto: 1, skill: 9, burst: 9 } }, { level: 90, talent: { auto: 1, skill: 10, burst: 10 } }, {})!;
  const neuvillette = planCharacter(costs, { key: "Neuvillette", level: 80, ascension: 5, talent: ten }, { level: 90, talent: ten }, {})!;
  const harp = planWeapon(costs, 5, { key: "SkywardHarp", level: 80, ascension: 5 }, 90, {})!;
  const total = combinePlans([furina, neuvillette, harp], ["character", "character", "weapon"], { PhilosophiesOfJustice: 20, HerosWit: 10 });
  const justice = total.materials.find((m) => m.name === "Philosophies of Justice")!;
  // Both characters' needs count against the same 20 books.
  assert.equal(justice.need, need(furina, "Philosophies of Justice") + need(neuvillette, "Philosophies of Justice"));
  assert.equal(justice.have, 20);
  assert.equal(total.characterExp?.need, characterExp(80, 90));
  assert.equal(total.characterExp?.have, 200000);
  assert.equal(total.weaponExp?.need, weaponExp(5, 80, 90));
  assert.equal(need({ materials: total.materials, exp: null }, "Mora"), need(furina, "Mora") + need(neuvillette, "Mora") + need(harp, "Mora"));
});

test("plans switched off are read back, kept through edits, and switched one by one or by kind", () => {
  const furina: SavedPlan = { kind: "character", key: "Furina", level: 90, talent: ten };
  const kazuha: SavedPlan = { kind: "character", key: "KaedeharaKazuha", level: 90, talent: ten };
  const lance: SavedPlan = { kind: "weapon", key: "FavoniusLance", location: "Iansan", level: 90 };

  // Saved and read back; anything but true reads as on.
  const read = normalizePlans([{ ...furina, off: true }, { ...kazuha, off: "yes" }, lance]);
  assert.deepEqual(read.map(isPlanOn), [false, true, true]);
  assert.equal(read[0].off, true);
  assert.equal("off" in read[1], false);

  // One plan off and back on; "on" leaves no off field, since Firestore refuses undefined.
  const off = setPlanOn([furina, kazuha, lance], kazuha, false);
  assert.deepEqual(off.map(isPlanOn), [true, false, true]);
  const back = setPlanOn(off, kazuha, true);
  assert.deepEqual(back, [furina, kazuha, lance]);
  assert.equal("off" in back[1], false);

  // Editing a plan's targets keeps it off.
  const edited = upsertPlan(off, { ...kazuha, talent: one });
  assert.equal(edited[1].off, true);
  assert.deepEqual(edited[1].kind === "character" && edited[1].talent, one);

  // Every character at once; weapons untouched. Then all back on.
  const noCharacters = setKindOn([furina, kazuha, lance], "character", false);
  assert.deepEqual(noCharacters.map(isPlanOn), [false, false, true]);
  assert.deepEqual(setKindOn(noCharacters, "character", true), [furina, kazuha, lance]);
  assert.deepEqual(setKindOn([furina, lance], "weapon", false).map(isPlanOn), [true, false]);
});
