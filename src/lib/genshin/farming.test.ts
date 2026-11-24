import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { currentTicks, farmingDay, farmingList, toggleTick, weekdayNames, type FarmingPlan } from "./farming.ts";
import { planCharacter, planWeapon, type MaterialCosts } from "./materialPlanner.ts";

const costs: MaterialCosts = JSON.parse(readFileSync("src/data/genshin/materialCosts.json", "utf8"));
const ten = { auto: 10, skill: 10, burst: 10 };
const one = { auto: 1, skill: 1, burst: 1 };

// Bennett's talents use Resistance books (Tuesday and Friday, Forsaken Rift);
// a Favonius Sword ascends with Decarabian materials (Monday and Thursday, Cecilia Garden).
const bennett = (owned: Record<string, number> = {}): FarmingPlan => ({
  label: "Bennett",
  plan: planCharacter(costs, { key: "Bennett", level: 90, ascension: 6, talent: one }, { level: 90, talent: ten }, owned)!,
});
const favonius = (owned: Record<string, number> = {}): FarmingPlan => ({
  label: "Favonius Sword (Bennett)",
  plan: planWeapon(costs, 4, { key: "FavoniusSword", level: 1, ascension: 0 }, 90, owned)!,
});
// 2026-11-15 is a Sunday; on the Asia server (UTC+8) noon is 04:00 UTC.
const asia = (iso: string) => farmingDay(new Date(iso), 8);
const SUNDAY = asia("2026-11-15T04:00:00Z");
const MONDAY = asia("2026-11-16T04:00:00Z");
const TUESDAY = asia("2026-11-17T04:00:00Z");
const WEDNESDAY = asia("2026-11-18T04:00:00Z");

test("the cost data has weekdays and a domain for every talent book and weapon material", () => {
  const scheduled = Object.keys(costs.farming).length;
  assert.equal(scheduled, 168);
  const freedom = costs.materials.findIndex(([key]) => key === "teachingsoffreedom");
  const [days, domain] = costs.farming[String(freedom)];
  assert.deepEqual(weekdayNames(days), ["Monday", "Thursday", "Sunday"]);
  assert.deepEqual(costs.domains[domain], ["Forsaken Rift", "Mondstadt"]);
  // Every domain is open on Sunday.
  for (const [bits] of Object.values(costs.farming)) assert.ok(bits & 1);
});

test("the day turns over at 4 AM on the UID's server", () => {
  // Asia, UTC+8: 03:59 Monday there is still Sunday's game day.
  assert.equal(asia("2026-11-15T19:59:00Z").weekday, 0);
  assert.equal(asia("2026-11-15T19:59:00Z").key, "2026-11-15");
  assert.equal(asia("2026-11-15T20:00:00Z").weekday, 1);
  assert.equal(asia("2026-11-15T20:00:00Z").key, "2026-11-16");
  assert.equal(asia("2026-11-15T19:59:00Z").endsAt.toISOString(), "2026-11-15T20:00:00.000Z");
  // America, UTC−5: 4 AM there is 09:00 UTC.
  const america = (iso: string) => farmingDay(new Date(iso), -5);
  assert.equal(america("2026-11-16T08:59:00Z").weekday, 0);
  assert.equal(america("2026-11-16T09:00:00Z").weekday, 1);
  assert.equal(america("2026-11-16T09:00:00Z").endsAt.toISOString(), "2026-11-17T09:00:00.000Z");
  // Europe, UTC+1: 4 AM there is 03:00 UTC.
  assert.equal(farmingDay(new Date("2026-11-16T02:59:00Z"), 1).weekday, 0);
  assert.equal(farmingDay(new Date("2026-11-16T03:00:00Z"), 1).weekday, 1);
});

test("without a UID the day turns over at 4 AM local time", () => {
  const before = farmingDay(new Date(2026, 10, 16, 3, 59), null);
  const after = farmingDay(new Date(2026, 10, 16, 4, 0), null);
  assert.equal(before.weekday, 0);
  assert.equal(before.key, "2026-11-15");
  assert.equal(after.weekday, 1);
  assert.equal(after.key, "2026-11-16");
  assert.equal(before.endsAt.getTime(), new Date(2026, 10, 16, 4, 0).getTime());
  assert.equal(after.endsAt.getTime(), new Date(2026, 10, 17, 4, 0).getTime());
});

test("Tuesday lists Bennett's books; the weapon's materials wait for Thursday", () => {
  const list = farmingList(costs, [bennett(), favonius()], {}, TUESDAY);
  assert.equal(list.today.length, 1);
  const [books] = list.today;
  assert.equal(books.domain, "Forsaken Rift");
  assert.equal(books.region, "Mondstadt");
  assert.equal(books.kind, "talent");
  assert.deepEqual(books.for, ["Bennett"]);
  assert.deepEqual(
    books.materials.map((m) => [m.name, m.missing]),
    [
      ["Teachings of Resistance", 9],
      ["Guide to Resistance", 63],
      ["Philosophies of Resistance", 114],
    ]
  );
  assert.equal(list.later.length, 1);
  assert.equal(list.later[0].kind, "weapon");
  assert.equal(list.later[0].domain, "Cecilia Garden");
  assert.deepEqual(list.later[0].for, ["Favonius Sword (Bennett)"]);
  assert.equal(list.next, null);
});

test("Sunday has everything open", () => {
  const list = farmingList(costs, [bennett(), favonius()], {}, SUNDAY);
  assert.deepEqual(
    list.today.map((g) => g.kind),
    ["talent", "weapon"]
  );
  assert.equal(list.later.length, 0);
});

test("a day with nothing names the next day with something", () => {
  // Bennett alone: Wednesday has nothing; Friday is two days away.
  const wednesday = farmingList(costs, [bennett()], {}, WEDNESDAY);
  assert.equal(wednesday.today.length, 0);
  assert.deepEqual(wednesday.next, { weekday: 5, inDays: 2 });
  // Monday: Tuesday, the next day.
  assert.deepEqual(farmingList(costs, [bennett()], {}, MONDAY).next, { weekday: 2, inDays: 1 });
  // No plans at all: nothing today and no next day.
  const empty = farmingList(costs, [], {}, MONDAY);
  assert.deepEqual([empty.today, empty.later, empty.next], [[], [], null]);
});

test("only materials still missing count, and a covered plan drops off", () => {
  const some = { TeachingsOfResistance: 9, GuideToResistance: 10 };
  const partly = farmingList(costs, [bennett(some)], some, TUESDAY);
  assert.deepEqual(
    partly.today[0].materials.map((m) => [m.key, m.missing]),
    [
      ["guidetoresistance", 53],
      ["philosophiesofresistance", 114],
    ]
  );
  const all = { TeachingsOfResistance: 9, GuideToResistance: 63, PhilosophiesOfResistance: 114 };
  const covered = farmingList(costs, [bennett(all)], all, TUESDAY);
  assert.equal(covered.today.length, 0);
  assert.equal(covered.next, null);
});

test("plans sharing books are compared once with what you have, and each is named", () => {
  // Diluc and Bennett both use Resistance books; 120 Philosophies cover one but not both.
  const owned = { PhilosophiesOfResistance: 120 };
  const diluc: FarmingPlan = {
    label: "Diluc",
    plan: planCharacter(costs, { key: "Diluc", level: 90, ascension: 6, talent: one }, { level: 90, talent: ten }, owned)!,
  };
  const list = farmingList(costs, [bennett(owned), diluc], owned, TUESDAY);
  assert.equal(list.today.length, 1);
  assert.deepEqual(list.today[0].for, ["Bennett", "Diluc"]);
  assert.equal(list.today[0].materials.find((m) => m.key === "philosophiesofresistance")?.missing, 228 - 120);
});

test("ticks clear when the game day changes", () => {
  const ticked = toggleTick(null, TUESDAY, "1:38");
  assert.deepEqual(ticked, { day: "2026-11-17", done: ["1:38"] });
  assert.deepEqual(currentTicks(ticked, TUESDAY), ["1:38"]);
  // Tuesday 03:59 on the next day is still Tuesday's game day.
  assert.deepEqual(currentTicks(ticked, asia("2026-11-17T19:59:00Z")), ["1:38"]);
  assert.deepEqual(currentTicks(ticked, asia("2026-11-17T20:00:00Z")), []);
  // Unticking, and ticking on a new day starting fresh.
  assert.deepEqual(toggleTick(ticked, TUESDAY, "1:38").done, []);
  assert.deepEqual(toggleTick(ticked, WEDNESDAY, "2:73"), { day: "2026-11-18", done: ["2:73"] });
  // Anything malformed reads as no ticks.
  for (const bad of [undefined, "x", { day: "2026-11-17", done: "1:38" }, { done: ["1:38"] }]) {
    assert.deepEqual(currentTicks(bad, TUESDAY), []);
  }
});
