import { test } from "node:test";
import assert from "node:assert/strict";
import type { Pull } from "./wishes.ts";
import {
  expectedPity,
  fiveStarRate,
  luckierThan,
  pityDistribution,
  wishYears,
  yearInReview,
} from "./yearInReview.ts";

const GACHA = { character: "301", weapon: "302", standard: "200", chronicled: "500", beginner: "100" } as const;

/**
 * Builds a history from runs: each run is `count` wishes on one banner from a
 * start time, one a minute, ending with the given rarity (3 for none).
 */
function history(runs: { pool: keyof typeof GACHA; start: string; count: number; last?: { name: string; rarity: 4 | 5 } }[]): Pull[] {
  const pulls: Pull[] = [];
  let id = 1000;
  for (const run of runs) {
    const t0 = new Date(run.start.replace(" ", "T") + "Z").getTime();
    for (let i = 0; i < run.count; i++) {
      const time = new Date(t0 + i * 60_000).toISOString().slice(0, 19).replace("T", " ");
      const isLast = i === run.count - 1 && run.last;
      pulls.push({
        id: String(id++),
        gachaType: GACHA[run.pool],
        itemId: "",
        name: isLast ? run.last!.name : "Cool Steel",
        rarity: isLast ? run.last!.rarity : 3,
        type: isLast && run.last!.rarity === 5 && run.pool !== "weapon" ? "Character" : "Weapon",
        time,
      });
    }
  }
  return pulls;
}

test("the odds model: GGanalysis's rates, and an average of about 62.3 wishes", () => {
  assert.equal(fiveStarRate(1), 0.006);
  assert.equal(fiveStarRate(73), 0.006);
  assert.ok(Math.abs(fiveStarRate(74) - 0.066) < 1e-12);
  assert.ok(Math.abs(fiveStarRate(89) - 0.966) < 1e-12);
  assert.equal(fiveStarRate(90), 1);
  const dist = pityDistribution();
  assert.equal(dist.length, 91);
  assert.ok(Math.abs(dist.reduce((a, b) => a + b, 0) - 1) < 1e-12);
  // GGanalysis gives 62.297 for one 5★ from this table.
  assert.ok(Math.abs(expectedPity() - 62.297) < 0.001, String(expectedPity()));
});

test("the percentile: exact for one 5★, and matching a simulation for several", () => {
  const dist = pityDistribution();
  // One 5★ on wish 1: everyone else needed more, except the 0.6% who also got it first.
  assert.ok(Math.abs(luckierThan(1, 1) - (1 - dist[1] / 2)) < 1e-12);
  // One on wish 90: nobody needed more.
  assert.ok(Math.abs(luckierThan(1, 90) - dist[90] / 2) < 1e-12);
  // The model's own average sits near the middle.
  assert.ok(Math.abs(luckierThan(10, 623) - 0.5) < 0.06, String(luckierThan(10, 623)));

  // A seeded simulation (mulberry32) of 60,000 players each for 5 and 12 5★s (fixed seed, so the result never changes).
  let seed = 12345;
  const rand = () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const draw = () => {
    for (let k = 1; ; k++) if (rand() < fiveStarRate(k)) return k;
  };
  for (const [count, total] of [[5, 290], [12, 800]]) {
    let more = 0;
    let same = 0;
    const N = 60_000;
    for (let i = 0; i < N; i++) {
      let s = 0;
      for (let n = 0; n < count; n++) s += draw();
      if (s > total) more++;
      else if (s === total) same++;
    }
    const simulated = (more + same / 2) / N;
    assert.ok(Math.abs(luckierThan(count, total) - simulated) < 0.005, `${count} at ${total}: ${luckierThan(count, total)} vs ${simulated}`);
  }
});

test("past 100 5★s the percentile comes from a normal curve, close to the exact sum", () => {
  for (const total of [6000, 6300, 6500, 6800]) {
    const exact = luckierThan(101, total, Infinity);
    const approx = luckierThan(101, total);
    assert.ok(Math.abs(exact - approx) < 0.01, `${total}: ${exact} vs ${approx}`);
  }
  const start = Date.now();
  luckierThan(400, 400 * 60);
  assert.ok(Date.now() - start < 50);
});

test("totals count only the year's own wishes, on every banner", () => {
  const pulls = history([
    { pool: "character", start: "2024-12-31 23:00:00", count: 30 }, // 30 in 2024
    { pool: "character", start: "2025-01-05 10:00:00", count: 40, last: { name: "Furina", rarity: 5 } },
    { pool: "weapon", start: "2025-03-01 10:00:00", count: 12, last: { name: "The Widsith", rarity: 4 } },
    { pool: "beginner", start: "2025-02-01 10:00:00", count: 0 },
    { pool: "standard", start: "2026-01-01 00:00:00", count: 5 }, // 2026
  ]);
  // A Beginners' ten-pull in the same second costs 8 fates.
  for (let i = 0; i < 10; i++) {
    pulls.push({ id: String(5000 + i), gachaType: "100", itemId: "", name: "Cool Steel", rarity: 3, type: "Weapon", time: "2025-02-01 10:00:00" });
  }
  const r = yearInReview(pulls, 2025);
  assert.equal(r.wishes, 62);
  assert.deepEqual(r.wishesByPool, { character: 40, weapon: 12, beginner: 10 });
  assert.equal(r.fates, 60);
  assert.equal(r.primogems, 9600);
  assert.equal(r.fourStars, 1);
  assert.deepEqual(wishYears(pulls), [2026, 2025, 2024]);
});

test("pity counts in full across the new year, and a run at year end is still going", () => {
  const pulls = history([
    { pool: "character", start: "2024-12-20 10:00:00", count: 50 },
    { pool: "character", start: "2025-01-03 10:00:00", count: 10, last: { name: "Furina", rarity: 5 } },
  ]);
  const y2025 = yearInReview(pulls, 2025);
  assert.equal(y2025.fiveStars.length, 1);
  assert.equal(y2025.fiveStars[0].pity, 60);
  assert.deepEqual(y2025.luckiest?.pull.name, "Furina");
  assert.equal(y2025.longestDryStreak?.wishes, 59);
  assert.equal(y2025.longestDryStreak?.stillGoing, false);
  assert.equal(y2025.longestDryStreak?.endedBy?.name, "Furina");
  assert.equal(y2025.wishes, 10);

  const y2024 = yearInReview(pulls, 2024);
  assert.equal(y2024.fiveStars.length, 0);
  assert.equal(y2024.luckiest, null);
  assert.equal(y2024.luck, null);
  assert.deepEqual(y2024.longestDryStreak, { pool: "character", wishes: 50, stillGoing: true });
});

test("luckiest and longest dry streak: lowest and highest across banners, earliest on a tie", () => {
  const pulls = history([
    { pool: "character", start: "2025-02-01 10:00:00", count: 20, last: { name: "Nahida", rarity: 5 } },
    { pool: "weapon", start: "2025-03-01 10:00:00", count: 20, last: { name: "Amos' Bow", rarity: 5 } },
    { pool: "standard", start: "2025-04-01 10:00:00", count: 85, last: { name: "Diluc", rarity: 5 } },
    { pool: "chronicled", start: "2025-05-01 10:00:00", count: 85, last: { name: "Jean", rarity: 5 } },
    { pool: "weapon", start: "2025-12-01 10:00:00", count: 70 }, // still going
    { pool: "beginner", start: "2025-01-01 10:00:00", count: 95 }, // no pity, never a streak
  ]);
  const r = yearInReview(pulls, 2025);
  assert.equal(r.luckiest?.pull.name, "Nahida");
  assert.equal(r.longestDryStreak?.endedBy?.name, "Diluc");
  assert.equal(r.longestDryStreak?.wishes, 84);
  assert.deepEqual(r.fiveStars.map((f) => f.pool), ["character", "weapon", "standard", "chronicled"]);
  // The luck line leaves the weapon banner out: Nahida 20, Diluc 85, Jean 85.
  assert.equal(r.luck?.fiveStars, 3);
  assert.equal(r.luck?.averagePity, 63.3);
  assert.equal(r.luck?.expectedAverage, 62.3);
  assert.ok(Math.abs((r.luck?.luckierThan ?? 0) - luckierThan(3, 190)) < 1e-12);
});

test("the 50/50 counts the year's 5★s, guaranteed by a loss the year before", () => {
  const pulls = history([
    { pool: "character", start: "2024-11-01 10:00:00", count: 70, last: { name: "Keqing", rarity: 5 } }, // lost, 2024
    { pool: "character", start: "2025-01-10 10:00:00", count: 60, last: { name: "Furina", rarity: 5 } }, // guaranteed
    { pool: "character", start: "2025-06-10 10:00:00", count: 60, last: { name: "Qiqi", rarity: 5 } }, // lost
    { pool: "character", start: "2025-07-10 10:00:00", count: 60, last: { name: "Skirk", rarity: 5 } }, // guaranteed
    { pool: "character", start: "2025-09-10 10:00:00", count: 60, last: { name: "Mavuika", rarity: 5 } }, // won
  ]);
  const r = yearInReview(pulls, 2025);
  assert.deepEqual(r.fiftyFifty, { won: 1, lost: 1, guaranteed: 2, winRate: 0.5 });
});

test("the busiest month, the earliest on a tie, and all twelve months listed", () => {
  const pulls = history([
    { pool: "character", start: "2025-03-01 10:00:00", count: 30 },
    { pool: "character", start: "2025-08-01 10:00:00", count: 30 },
    { pool: "weapon", start: "2025-01-01 10:00:00", count: 10 },
  ]);
  const r = yearInReview(pulls, 2025);
  assert.deepEqual(r.busiestMonth, { month: "2025-03", wishes: 30 });
  assert.equal(r.months.length, 12);
  assert.deepEqual(r.months.map((m) => m.wishes), [10, 0, 30, 0, 0, 0, 0, 30, 0, 0, 0, 0]);
  assert.equal(yearInReview(pulls, 2023).busiestMonth, null);
  assert.equal(yearInReview(pulls, 2023).wishes, 0);
});

/** One pull at a given time, for the ten-pull and new-character tests. */
let nextId = 90000;
const pull = (time: string, name: string, rarity: 3 | 4 | 5, type: "Character" | "Weapon" = "Character", gachaType = "301"): Pull => ({
  id: String(nextId++), gachaType, itemId: "", name, rarity, type, time,
});
const tenPull = (time: string, hits: Pull[], gachaType = "301") => [
  ...hits.map((p) => ({ ...p, time, gachaType })),
  ...Array.from({ length: 10 - hits.length }, () => pull(time, "Cool Steel", 3, "Weapon", gachaType)),
];

test("new characters: first copies in the history this year, and constellations up to the 7th copy", () => {
  const pulls = [
    pull("2024-05-01 10:00:00", "Bennett", 4), // had before the year
    pull("2025-01-01 10:00:00", "Bennett", 4), // C1
    pull("2025-01-02 10:00:00", "Furina", 5), // new
    pull("2025-01-03 10:00:00", "Xiangling", 4), // new
    ...Array.from({ length: 7 }, (_, i) => pull(`2025-02-0${i + 1} 10:00:00`, "Xiangling", 4)), // C1–C6, then a 7th extra copy
    pull("2025-03-01 10:00:00", "The Widsith", 4, "Weapon"), // weapons don't count
    pull("2025-03-02 10:00:00", "Noelle", 4, "Character", "100"), // Beginners' Wish counts too
  ];
  const r = yearInReview(pulls, 2025);
  assert.deepEqual(r.newCharacters.map((c) => c.pull.name), ["Furina", "Xiangling", "Noelle"]);
  assert.equal(r.constellations, 1 + 6);
});

test("best ten-pull: most 5★s, then most 4★s, then the earliest; ten wishes in one second only", () => {
  const pulls = [
    ...tenPull("2025-02-01 10:00:00", [pull("", "Bennett", 4), pull("", "Xingqiu", 4), pull("", "Sucrose", 4)]),
    ...tenPull("2025-03-01 10:00:00", [pull("", "Diluc", 5), pull("", "Bennett", 4)], "200"),
    ...tenPull("2025-04-01 10:00:00", [pull("", "Bennett", 4), pull("", "Furina", 5)]),
    // Nine in one second isn't a ten-pull, however good.
    ...tenPull("2025-05-01 10:00:00", [pull("", "Nahida", 5), pull("", "Raiden Shogun", 5)]).slice(0, 9),
  ];
  const best = yearInReview(pulls, 2025).bestTenPull;
  assert.equal(best?.time, "2025-03-01 10:00:00");
  assert.equal(best?.pool, "standard");
  assert.equal(best?.fiveStars, 1);
  assert.equal(best?.fourStars, 1);
  assert.deepEqual(best?.pulls.map((p) => p.name), ["Diluc", "Bennett"]);
  assert.equal(yearInReview(pulls.slice(0, 5), 2025).bestTenPull, null);
});
