import { test } from "node:test";
import assert from "node:assert/strict";
import {
  cleanupList,
  isWeakStart,
  keepMarkFor,
  levelingRange,
  matchKeepMarks,
  MAX_KEEP_MARKS,
  readKeepMarks,
  toggleKeepMark,
} from "./artifactCleanup.ts";
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
/** Substats worth exactly this much CV, from CRIT DMG, plus a filler line. */
const cv = (value: number): GoodSubstat[] => [
  { key: "critDMG_", value },
  { key: "atk_", value: 5.8 },
];
const reasonsOf = (list: ReturnType<typeof cleanupList>, index: number) =>
  list.find((e) => e.index === index)?.reasons ?? [];

// ---- Cleanup rules ----

test("beaten: a piece of the same set, slot, main stat and rarity, at least as high, with more CV", () => {
  const artifacts = [
    piece(cv(20)), // 0: beaten by 1 and 3; 3 is the best
    piece(cv(30)), // 1: beaten by 3
    piece(cv(25), { level: 0 }), // 2: beaten by 1 and 3 (higher level, more CV)
    piece(cv(40)), // 3: the best
    piece(cv(35), { level: 16 }), // 4: beaten by 3 only (20 ≥ 16)
  ];
  const list = cleanupList(artifacts);
  assert.equal(list.find((e) => e.index === 0)?.beatenBy, 3);
  assert.deepEqual(reasonsOf(list, 1), ["beaten"]);
  assert.equal(list.find((e) => e.index === 2)?.beatenBy, 3);
  assert.equal(list.find((e) => e.index === 4)?.beatenBy, 3);
  assert.equal(list.some((e) => e.index === 3), false);
});

test("beaten: a lower-level piece, an equal CV, or another main stat, slot, set or rarity doesn't count", () => {
  const artifacts = [
    piece(cv(20)), // 0
    piece(cv(30), { level: 16 }), // 1: lower level than 0, so it doesn't beat it
    piece(cv(20)), // 2: same CV as 0
    piece(cv(40), { mainStatKey: "atk_", slotKey: "sands" }),
    piece(cv(40), { slotKey: "plume" }),
    piece(cv(40), { setKey: "MarechausseeHunter" }),
  ];
  const list = cleanupList(artifacts);
  assert.equal(list.some((e) => e.index === 0), false);
  assert.equal(list.some((e) => e.index === 2), false);
});

test("beaten: a piece with no CRIT substat is never beaten, since CV says nothing about it", () => {
  const support = piece([{ key: "enerRech_", value: 16.8 }, { key: "eleMas", value: 40 }]); // an ER and EM piece
  const circlet = piece([{ key: "def_", value: 19.7 }], { slotKey: "circlet", mainStatKey: "critRate_" });
  const artifacts = [support, piece(cv(30)), circlet, piece(cv(15), { slotKey: "circlet", mainStatKey: "critRate_" })];
  assert.deepEqual(cleanupList(artifacts), []);
  // One CRIT line is enough to compare.
  assert.deepEqual(reasonsOf(cleanupList([piece(cv(5)), piece(cv(30))]), 0), ["beaten"]);
});

test("beaten: when two beat it with the same CV, the higher level is named", () => {
  const list = cleanupList([piece(cv(10), { level: 8 }), piece(cv(30), { level: 12 }), piece(cv(30))]);
  assert.equal(list.find((e) => e.index === 0)?.beatenBy, 2);
});

test("weak start: level 0 with at most one CRIT substat", () => {
  const one = piece([{ key: "critDMG_", value: 7.8 }, { key: "hp_", value: 5.3 }, { key: "def", value: 23 }], { level: 0 });
  const two = piece([{ key: "critRate_", value: 2.7 }, { key: "critDMG_", value: 5.4 }, { key: "def", value: 23 }], { level: 0 });
  assert.equal(isWeakStart(one), true); // 7.8 CV
  assert.equal(isWeakStart(two), false); // 10.8 CV, the lowest two CRIT lines can be
  assert.equal(isWeakStart({ ...one, level: 4 }), false);
  assert.equal(isWeakStart(piece([{ key: "atk_", value: 5.8 }], { level: 0 })), true);
});

test("weak start: counted by CRIT lines, so a 4★ with both CRIT stats isn't weak", () => {
  // 2.2 × 2 + 4.4 = 8.8 CV, under 10, but two CRIT lines.
  const four = piece([{ key: "critRate_", value: 2.2 }, { key: "critDMG_", value: 4.4 }], { level: 0, rarity: 4 });
  assert.equal(isWeakStart(four), false);
  assert.deepEqual(reasonsOf(cleanupList([four]), 0), ["lowRarity"]);
});

test("weak start: a CRIT circlet only with no CRIT substat", () => {
  const circlet = (substats: GoodSubstat[]) => piece(substats, { level: 0, slotKey: "circlet", mainStatKey: "critRate_" });
  assert.equal(isWeakStart(circlet([{ key: "critDMG_", value: 5.4 }, { key: "atk_", value: 5.8 }])), false);
  assert.equal(isWeakStart(circlet([{ key: "atk_", value: 5.8 }, { key: "hp", value: 299 }])), true);
});

test("low rarity: 4★ and below", () => {
  const list = cleanupList([piece(cv(20), { rarity: 4 }), piece(cv(5), { rarity: 3, setKey: "Instructor" }), piece(cv(5))]);
  assert.deepEqual(reasonsOf(list, 0), ["lowRarity"]);
  assert.deepEqual(reasonsOf(list, 1), ["lowRarity"]);
  assert.equal(list.some((e) => e.index === 2), false);
});

test("a piece can meet several rules", () => {
  const list = cleanupList([piece(cv(5), { rarity: 4, level: 0 }), piece(cv(15), { rarity: 4, level: 16 })]);
  assert.deepEqual(reasonsOf(list, 0), ["beaten", "weakStart", "lowRarity"]);
});

test("locked and kept pieces are never listed, but a locked piece still beats others", () => {
  const artifacts = [piece(cv(10)), piece(cv(40), { lock: true }), piece(cv(5), { rarity: 4, lock: true }), piece(cv(8))];
  const list = cleanupList(artifacts, new Set([3]));
  assert.deepEqual(
    list.map((e) => e.index),
    [0]
  );
  assert.equal(list[0].beatenBy, 1);
});

test("equipped pieces are listed with their wearer", () => {
  const list = cleanupList([piece(cv(10), { location: "Furina" }), piece(cv(40))]);
  assert.equal(list[0].artifact.location, "Furina");
  assert.deepEqual(list[0].reasons, ["beaten"]);
});

// ---- Worth leveling? ----
// The game's 5★ CRIT rolls: Rate 2.72 / 3.11 / 3.50 / 3.89, DMG 5.44 / 6.22 / 6.99 / 7.77.
// So one roll adds at most 7.78 CV on CRIT Rate (3.89 × 2) and 7.77 on CRIT DMG.

test("worth leveling: four-line +0 with both CRIT stats", () => {
  // 3.9 × 2 + 7.8 = 15.6 now; five rolls on CRIT Rate: + 5 × 7.78 = 38.9 → 54.5.
  const range = levelingRange(
    piece(
      [
        { key: "critRate_", value: 3.9 },
        { key: "critDMG_", value: 7.8 },
        { key: "atk_", value: 5.8 },
        { key: "hp", value: 299 },
      ],
      { level: 0 }
    )
  );
  assert.deepEqual(range, { now: 15.6, min: 15.6, max: 54.5, upgradesLeft: 5 });
});

test("worth leveling: three-line +0 gains a fourth line, which can be the missing CRIT stat", () => {
  // 3.1 × 2 = 6.2 now; the +4 upgrade adds CRIT DMG at 7.77, then four rolls on
  // CRIT Rate add 31.12: 6.2 + 7.77 + 31.12 = 45.09 → 45.1.
  const range = levelingRange(
    piece([{ key: "critRate_", value: 3.1 }, { key: "atk_", value: 5.8 }, { key: "def", value: 23 }], { level: 0 })
  );
  assert.deepEqual(range, { now: 6.2, min: 6.2, max: 45.1, upgradesLeft: 5 });
});

test("worth leveling: three-line +0 that already has both CRIT stats spends its first upgrade elsewhere", () => {
  // 3.5 × 2 + 7.0 = 14.0; the fourth line can't be CRIT, then 4 × 7.78 = 31.12 → 45.1.
  const range = levelingRange(
    piece([{ key: "critRate_", value: 3.5 }, { key: "critDMG_", value: 7.0 }, { key: "hp_", value: 5.3 }], { level: 0 })
  );
  assert.equal(range?.max, 45.1);
});

test("worth leveling: a +16 piece has one upgrade left", () => {
  // 7.0 × 2 + 14.0 = 28.0, one more CRIT Rate roll: 35.8.
  const range = levelingRange(
    piece(
      [
        { key: "critRate_", value: 7.0 },
        { key: "critDMG_", value: 14.0 },
        { key: "atk_", value: 5.8 },
        { key: "hp", value: 299 },
      ],
      { level: 16 }
    )
  );
  assert.deepEqual(range, { now: 28.0, min: 28.0, max: 35.8, upgradesLeft: 1 });
  assert.equal(levelingRange(piece(cv(10), { level: 19 }))?.upgradesLeft, 1);
  assert.equal(levelingRange(piece(cv(10), { level: 3 }))?.upgradesLeft, 5);
  assert.equal(levelingRange(piece(cv(10), { level: 4 }))?.upgradesLeft, 4);
});

test("worth leveling: only CRIT DMG to roll on adds 7.77 a roll", () => {
  // A CRIT Rate circlet can't have CRIT Rate as a substat: 5.4 + 5 × 7.77 = 44.25,
  // which rounds to 44.2 or 44.3 depending on floating-point noise.
  const range = levelingRange(
    piece(
      [
        { key: "critDMG_", value: 5.4 },
        { key: "atk_", value: 5.8 },
        { key: "hp", value: 299 },
        { key: "def", value: 23 },
      ],
      { level: 0, slotKey: "circlet", mainStatKey: "critRate_" }
    )
  );
  assert.ok(range && Math.abs(range.max - 44.25) <= 0.05);
});

test("worth leveling: a CRIT DMG circlet's new line can be CRIT Rate, never CRIT DMG", () => {
  // 0 now; the new line is CRIT Rate (7.78), then four rolls on it: 5 × 7.78 = 38.9.
  const range = levelingRange(
    piece([{ key: "atk_", value: 5.8 }, { key: "hp", value: 299 }, { key: "def", value: 23 }], {
      level: 0,
      slotKey: "circlet",
      mainStatKey: "critDMG_",
    })
  );
  assert.equal(range?.max, 38.9);
});

test("worth leveling: four lines without CRIT can't gain any", () => {
  const range = levelingRange(
    piece(
      [
        { key: "atk_", value: 5.8 },
        { key: "hp", value: 299 },
        { key: "def", value: 23 },
        { key: "eleMas", value: 23 },
      ],
      { level: 0 }
    )
  );
  assert.deepEqual(range, { now: 0, min: 0, max: 0, upgradesLeft: 5 });
});

test("worth leveling: none for a maxed piece or a 4★", () => {
  assert.equal(levelingRange(piece(cv(20))), null);
  assert.equal(levelingRange(piece(cv(20), { level: 0, rarity: 4 })), null);
});

// ---- Keep marks ----

const crit = (rate: number, dmg: number): GoodSubstat[] => [
  { key: "critRate_", value: rate },
  { key: "critDMG_", value: dmg },
  { key: "atk_", value: 5.8 },
];

test("keep marks: an unchanged piece is found and its mark kept", () => {
  const artifacts = [piece(crit(3.9, 7.8)), piece(crit(3.1, 6.2), { location: "Furina", lock: true })];
  const marks = [keepMarkFor(artifacts[1])];
  assert.deepEqual(marks[0], { setKey: "GoldenTroupe", slotKey: "flower", rarity: 5, mainStatKey: "hp", level: 20, substats: crit(3.1, 6.2) });
  const match = matchKeepMarks(marks, artifacts);
  assert.deepEqual([...match.kept], [1]);
  assert.equal(match.dropped, 0);
  assert.equal(cleanupList([piece(crit(3.9, 7.8), { level: 0 }), ...artifacts], new Set([0])).length, 0);
});

test("keep marks: a kept piece is still found after a new upload where it was leveled", () => {
  const before = piece(crit(3.1, 6.2), { level: 0 });
  const marks = [keepMarkFor(before)];
  const after = [piece(crit(3.1, 6.2)), piece(crit(6.6, 6.2), { level: 4, location: "Furina" })];
  const match = matchKeepMarks(marks, after);
  assert.deepEqual([...match.kept], [1]);
  assert.equal(match.dropped, 0);
  // The mark follows the piece, so the next upload matches it from +4.
  assert.equal(match.marks[0].level, 4);
  assert.deepEqual(match.marks[0].substats, crit(6.6, 6.2));
});

test("keep marks: a mark whose piece is gone is dropped and counted", () => {
  const marks = [keepMarkFor(piece(crit(3.1, 6.2))), keepMarkFor(piece(crit(3.9, 7.8), { slotKey: "plume", mainStatKey: "atk" }))];
  const match = matchKeepMarks(marks, [piece(crit(3.1, 6.2))]);
  assert.deepEqual([...match.kept], [0]);
  assert.equal(match.marks.length, 1);
  assert.equal(match.dropped, 1);
  // A piece can't lose a substat or a level, so a lower one isn't the same piece.
  assert.equal(matchKeepMarks([keepMarkFor(piece(crit(3.9, 7.8)))], [piece(crit(3.9, 7.8), { level: 16 })]).dropped, 1);
});

test("keep marks: two identical pieces with two marks are both kept", () => {
  const twin = piece(crit(3.1, 6.2));
  const match = matchKeepMarks([keepMarkFor(twin), keepMarkFor(twin)], [twin, structuredClone(twin), piece(crit(3.9, 7.8))]);
  assert.deepEqual([...match.kept].sort(), [0, 1]);
});

test("keep marks: a +0 mark doesn't take the piece a +16 mark needs", () => {
  // Both could have become the +20 piece; only the +0 could have become the +4.
  const low = piece(crit(3.1, 6.2), { level: 0 });
  const high = piece(crit(3.1, 12.4), { level: 16 });
  const after = [piece(crit(3.1, 13.2)), piece(crit(3.1, 6.2), { level: 4 })];
  const match = matchKeepMarks([keepMarkFor(low), keepMarkFor(high)], after);
  assert.equal(match.dropped, 0);
  assert.deepEqual([...match.kept].sort(), [0, 1]);
});

test("keep marks: a mark moves over rather than leave another with nothing", () => {
  // The +4 mark fits both +8 pieces and comes first; the +0 mark fits only the first.
  const markB = piece(crit(3.1, 6.2), { level: 4 });
  const markA = piece(crit(3.9, 6.2), { level: 0 });
  const after = [piece(crit(3.9, 6.2), { level: 8 }), piece(crit(3.1, 12.4), { level: 8 })];
  const match = matchKeepMarks([keepMarkFor(markB), keepMarkFor(markA)], after);
  assert.equal(match.dropped, 0);
  assert.deepEqual(match.marks.map((m) => m.substats), [crit(3.1, 12.4), crit(3.9, 6.2)]);
});

test("keep marks: a new mark goes to the unlocked twin, not a locked one", () => {
  const twin = piece(crit(3.1, 6.2));
  const artifacts = [{ ...twin, lock: true }, structuredClone(twin)];
  const marks = toggleKeepMark([], artifacts, 1);
  assert.deepEqual([...matchKeepMarks(marks, artifacts).kept], [1]);
  assert.deepEqual(cleanupList(artifacts, matchKeepMarks(marks, artifacts).kept), []);
});

test("toggleKeepMark adds and removes, and the right twin's mark goes", () => {
  const twin = piece(crit(3.1, 6.2));
  const artifacts = [twin, structuredClone(twin), piece(crit(3.9, 7.8))];
  let marks = toggleKeepMark([], artifacts, 0);
  marks = toggleKeepMark(marks, artifacts, 2);
  assert.deepEqual([...matchKeepMarks(marks, artifacts).kept].sort(), [0, 2]);
  marks = toggleKeepMark(marks, artifacts, 2);
  assert.deepEqual([...matchKeepMarks(marks, artifacts).kept], [0]);
  marks = toggleKeepMark(marks, artifacts, 0);
  assert.deepEqual(marks, []);
});

test("readKeepMarks reads saved marks and skips anything malformed", () => {
  const good = keepMarkFor(piece(crit(3.1, 6.2), { location: "Furina", lock: true }));
  const noMain = { ...good, mainStatKey: undefined };
  delete noMain.mainStatKey;
  const marks = readKeepMarks([
    good,
    noMain,
    { ...good, setKey: 5 },
    { ...good, substats: "no" },
    { ...good, mainStatKey: 3 },
    { ...good, substats: [{ key: "hp", value: 299 }, { key: 1 }, null], extra: "dropped" },
    null,
    "x",
  ]);
  assert.equal(marks.length, 3);
  assert.deepEqual(marks[0], good);
  assert.equal("mainStatKey" in marks[1], false);
  assert.deepEqual(marks[2].substats, [{ key: "hp", value: 299 }]);
  assert.equal("extra" in marks[2], false);
  assert.deepEqual(readKeepMarks(undefined), []);
});

test("no more than MAX_KEEP_MARKS marks are added or read back", () => {
  const artifacts = Array.from({ length: MAX_KEEP_MARKS + 1 }, (_, i) => piece([{ key: "hp", value: i }]));
  const full = artifacts.slice(0, MAX_KEEP_MARKS).map(keepMarkFor);
  assert.equal(toggleKeepMark(full, artifacts, MAX_KEEP_MARKS).length, MAX_KEEP_MARKS);
  assert.equal(toggleKeepMark(full, artifacts, 0).length, MAX_KEEP_MARKS - 1);
  assert.equal(readKeepMarks(artifacts.map(keepMarkFor)).length, MAX_KEEP_MARKS);
});
