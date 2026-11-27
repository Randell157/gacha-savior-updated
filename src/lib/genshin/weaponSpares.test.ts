import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { spareWords, weaponSpares } from "./weaponSpares.ts";
import type { GoodWeapon } from "./types.ts";

const copy = (refinement: number, level = 1, location?: string, lock = false): GoodWeapon => ({
  key: "FavoniusSword",
  level,
  refinement,
  location,
  lock,
});

const summary = (result: ReturnType<typeof weaponSpares>) =>
  result && {
    equipped: result.equipped.map((w) => w.location),
    kept: result.kept && `R${result.kept.refinement} Lv${result.kept.level}`,
    spare: result.spare.length,
    locked: result.lockedSpare,
    refines: result.refines.map((r) => `${r.copy.location ?? "kept"} R${r.from}→R${r.to} using ${r.uses.length}`),
    leftover: result.leftover.length,
  };

test("one copy, or a 3★ weapon, has nothing to show", () => {
  assert.equal(weaponSpares([copy(1, 90, "Bennett")], 4), null);
  assert.equal(weaponSpares([copy(5, 90, "Bennett"), copy(1), copy(1)], 3), null);
});

test("equipped and spare copies, and the refinement the spares reach", () => {
  // The DESIGN.md example: 3 Favonius Swords, 1 on Bennett, 2 spare.
  assert.deepEqual(summary(weaponSpares([copy(1, 90, "Bennett"), copy(1), copy(1)], 4)), {
    equipped: ["Bennett"],
    kept: null,
    spare: 2,
    locked: 0,
    refines: ["Bennett R1→R3 using 2"],
    leftover: 0,
  });
});

test("an R2 spare adds 2, and nothing goes past R5", () => {
  // R3 needs 2: the single R2 copy does it, leaving the two R1s.
  assert.deepEqual(summary(weaponSpares([copy(3, 90, "Bennett"), copy(1), copy(2), copy(1)], 4))!.refines, [
    "Bennett R3→R5 using 1",
  ]);
  // R4 needs 1, and the only spare is R3: it still reaches R5, not R7.
  const r = weaponSpares([copy(4, 90, "Bennett"), copy(3, 20)], 4)!;
  assert.equal(r.refines[0].to, 5);
});

test("the lowest-level spares are used first", () => {
  const r = weaponSpares([copy(4, 90, "Bennett"), copy(1, 80), copy(1, 1), copy(1, 40)], 4)!;
  assert.deepEqual(r.refines[0].uses.map((w) => w.level), [1]);
  assert.deepEqual(r.leftover.map((w) => w.level), [40, 80]);
});

test("several equipped copies are refined best first, then the next", () => {
  const r = weaponSpares(
    [copy(2, 90, "Xingqiu"), copy(4, 80, "Bennett"), copy(1), copy(1), copy(1), copy(1)],
    4
  );
  assert.deepEqual(summary(r)!.refines, ["Bennett R4→R5 using 1", "Xingqiu R2→R5 using 3"]);
  assert.equal(r!.leftover.length, 0);
});

test("copies already at R5 are skipped, and spares left over are counted", () => {
  const r = weaponSpares([copy(5, 90, "Bennett"), copy(5, 90, "Kazuha"), copy(1), copy(1)], 4);
  assert.deepEqual(summary(r)!.refines, []);
  assert.equal(r!.leftover.length, 2);
});

test("with none equipped, the highest-level copy is kept and the rest are spare", () => {
  const r = weaponSpares([copy(1, 1), copy(2, 70), copy(1, 1)], 5);
  assert.deepEqual(summary(r), {
    equipped: [],
    kept: "R2 Lv70",
    spare: 2,
    locked: 0,
    refines: ["kept R2→R4 using 2"],
    leftover: 0,
  });
});

test("locked spares count as spare and are counted as locked", () => {
  const r = weaponSpares([copy(1, 90, "Bennett", true), copy(1, 1, undefined, true), copy(1)], 4)!;
  assert.equal(r.spare.length, 2);
  assert.equal(r.lockedSpare, 1);
  assert.equal(r.refines[0].to, 3);
});

test("read against the Feb 2026 sample", () => {
  const data = JSON.parse(
    readFileSync("public/sample-data/inventory-kamera/genshin_export_2026-02-11_12-16.json", "utf8")
  );
  const of = (key: string) => weaponSpares(data.weapons.filter((w: GoodWeapon) => w.key === key), 4);

  // Lance on Zhongli R4, Iansan R3, Chevreuse R2, and 4 locked R1 spares.
  assert.deepEqual(summary(of("FavoniusLance")), {
    equipped: ["Zhongli", "Iansan", "Chevreuse"],
    kept: null,
    spare: 4,
    locked: 4,
    refines: ["Zhongli R4→R5 using 1", "Iansan R3→R5 using 2", "Chevreuse R2→R3 using 1"],
    leftover: 0,
  });
  // The Widsith: both copies on characters are R5, so all 6 spares are left over.
  assert.deepEqual(summary(of("TheWidsith"))!.refines, []);
  assert.equal(of("TheWidsith")!.leftover.length, 6);
  // Sacrificial Sword: Xingqiu's is R5, Lynette's R4 takes one of the 5 spares.
  assert.deepEqual(summary(of("SacrificialSword"))!.refines, ["Lynette R4→R5 using 1"]);
  assert.equal(of("SacrificialSword")!.leftover.length, 4);
});

test("the words on the page", () => {
  const name = (key: string) => (key === "KujouSara" ? "Kujou Sara" : key);
  const lance = spareWords(
    weaponSpares([copy(4, 90, "Zhongli"), copy(2, 90, "KujouSara"), copy(1, 1, undefined, true), copy(1, 1, undefined, true)], 4)!,
    name
  );
  assert.equal(lance.head, "2 spare copies, all locked");
  assert.deepEqual(
    lance.steps.map((s) => `${s.who} R${s.from}→R${s.to}, ${s.needs}`),
    ["Zhongli's R4→R5, 1 spare weapon for refinement", "Kujou Sara's R2→R3, 1 spare weapon for refinement"]
  );
  assert.match(lance.lockNote, /unlock/);

  const done = spareWords(weaponSpares([copy(5, 90, "Bennett"), copy(1, 1, undefined, true), copy(1)], 4)!, name);
  assert.equal(done.head, "2 spare copies, 1 locked");
  assert.equal(done.leftover, "The equipped copy is already R5, so both spares are left over.");

  const kept = spareWords(weaponSpares([copy(1, 70), copy(1, 1)], 4)!, name);
  assert.equal(kept.head, "1 spare copy");
  assert.equal(kept.steps[0].who, "The copy you keep (Lv. 70)");
  assert.equal(kept.lockNote, "");
});
