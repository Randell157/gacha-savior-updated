/**
 * Year in review: one calendar year of wish history, worked out from the
 * stored pulls. Pure functions only, so they run under `npm test` too.
 *
 * Years are read from each pull's own time, which is the server's local time,
 * so a year turns over at midnight on the account's server.
 *
 * Pity counts in full, as on the Wishes page: a January 5★ counts the wishes
 * made for it the December before. Wishes and Primogems count only the year's
 * own wishes.
 */
import { compareIds, poolOf, poolStats, wishSpending, POOLS, type FiftyFiftyRecord, type FiveStarPull, type Pull, type WishPool } from "./wishes.ts";

/** A 5★ with the pool it came from. */
export interface YearFiveStar extends FiveStarPull {
  pool: WishPool;
}

/** The most wishes on one banner without a 5★. */
export interface DryStreak {
  pool: WishPool;
  /** Wishes without a 5★: the 5★'s pity less one, or the wishes so far for a run still going. */
  wishes: number;
  /** The 5★ that ended it; absent when the run was still going at the end of the year. */
  endedBy?: Pull;
  /** True when no 5★ had ended it by the end of the year. */
  stillGoing: boolean;
}

export interface YearLuck {
  /** 5★s from the 90-pity banners (Character Event, Standard, Chronicled). */
  fiveStars: number;
  /** Their average pity, to one decimal. */
  averagePity: number;
  /** The model's average, to one decimal (62.3). */
  expectedAverage: number;
  /** Share of players, 0–1, the model says would have needed more wishes for as many 5★s. */
  luckierThan: number;
}

/** A character's first copy in the history, pulled this year. */
export interface NewCharacter {
  pull: Pull;
}

/** The ten-pull with the most 5★s, then the most 4★s. */
export interface BestTenPull {
  pool: WishPool;
  time: string;
  fiveStars: number;
  fourStars: number;
  /** Its 5★ and 4★ pulls, 5★s first, in the order pulled. */
  pulls: Pull[];
}

export interface YearInReview {
  year: number;
  /** Every wish made in the year, on every banner (Beginners' Wish included). */
  wishes: number;
  wishesByPool: Partial<Record<WishPool, number>>;
  fates: number;
  primogems: number;
  fourStars: number;
  /** Oldest first. */
  fiveStars: YearFiveStar[];
  /** Lowest pity, the earliest on a tie; null without a 5★. */
  luckiest: YearFiveStar | null;
  /** Longest, the earliest on a tie; null without a wish on a banner with pity. */
  longestDryStreak: DryStreak | null;
  fiftyFifty: FiftyFiftyRecord;
  /** The month with the most wishes ("YYYY-MM"), the earliest on a tie; null without wishes. */
  busiestMonth: { month: string; wishes: number } | null;
  /** Every month of the year, January to December, with its wish count. */
  months: { month: string; wishes: number }[];
  /** Null without a 5★ on the 90-pity banners. */
  luck: YearLuck | null;
  /**
   * 4★ and 5★ characters whose first copy in the history came this year, oldest
   * first. Characters had before the history starts, or got outside wishes, can
   * show here, so the page calls them new to the wish history.
   */
  newCharacters: NewCharacter[];
  /** Later copies this year that added a constellation (the 2nd to 7th copy). */
  constellations: number;
  /** Null without a ten-pull in the year. */
  bestTenPull: BestTenPull | null;
}

const yearOf = (p: Pull) => Number(p.time.slice(0, 4));
/** Pull order: by time, then by id within a ten-pull (ids are numeric strings). */
const byTime = (a: Pull, b: Pull) => (a.time < b.time ? -1 : a.time > b.time ? 1 : compareIds(a.id, b.id));

/** Every year the history has wishes in, newest first. */
export function wishYears(pulls: Pull[]): number[] {
  return [...new Set(pulls.filter((p) => poolOf(p.gachaType)).map(yearOf))].sort((a, b) => b - a);
}

/** The banners the luck line covers: they share one 90-wish pity model. */
export const LUCK_POOLS: WishPool[] = ["character", "standard", "chronicled"];

/**
 * The chance of a 5★ on each wish of a 90-pity banner, from GGanalysis
 * (https://github.com/OneBST/GGanalysis, `PITY_5STAR` in
 * `games/genshin_impact/gacha_model.py`): 0.6% until wish 73, then 6% more on
 * each wish, and certain on wish 90. The rise from 74 is community-measured;
 * HoYoverse publishes only the 0.6% and the 90.
 */
export function fiveStarRate(wish: number): number {
  if (wish >= 90) return 1;
  if (wish >= 74) return 0.006 + (wish - 73) * 0.06;
  return 0.006;
}

/** The chance a 5★ comes on exactly wish k, for k = 1..90 (index 0 is unused). */
export function pityDistribution(): number[] {
  const dist = [0];
  let none = 1;
  for (let k = 1; k <= 90; k++) {
    const p = Math.min(1, fiveStarRate(k));
    dist.push(none * p);
    none *= 1 - p;
  }
  return dist;
}

/** The model's average wishes per 5★ (about 62.3). */
export function expectedPity(): number {
  return pityDistribution().reduce((sum, p, k) => sum + p * k, 0);
}

/**
 * The share of players the model says were less lucky: for `count` 5★s that
 * took `totalPity` wishes in all, the chance another player needed more, plus
 * half the chance they needed exactly as many (a mid-rank percentile, so equal
 * luck sits in the middle). Worked out exactly by adding the pity distribution
 * to itself `count` times, and past `exactUpTo` 5★s from the normal curve the
 * sum is close to by then.
 */
export function luckierThan(count: number, totalPity: number, exactUpTo = EXACT_UP_TO): number {
  if (count <= 0) return 0.5;
  const single = SINGLE;
  // The exact sum takes about count² × 90 steps (over a second past 300 5★s);
  // past 100 the sum is close enough to a normal curve.
  if (count > exactUpTo) {
    const mean = expectedPity();
    const variance = single.reduce((v, p, k) => v + p * (k - mean) ** 2, 0);
    const z = (totalPity + 0.5 - count * mean) / Math.sqrt(count * variance);
    const tie = Math.exp(-((totalPity - count * mean) ** 2) / (2 * count * variance)) / Math.sqrt(2 * Math.PI * count * variance);
    return Math.min(1, Math.max(0, 1 - normalCdf(z) + tie / 2));
  }
  let sum = [1]; // the chance the total is i after 0 draws
  for (let n = 0; n < count; n++) {
    const next = new Array(sum.length + 90).fill(0);
    for (let i = 0; i < sum.length; i++) {
      if (!sum[i]) continue;
      for (let k = 1; k <= 90; k++) next[i + k] += sum[i] * single[k];
    }
    sum = next;
  }
  let more = 0;
  for (let i = totalPity + 1; i < sum.length; i++) more += sum[i];
  return Math.min(1, Math.max(0, more + (sum[totalPity] ?? 0) / 2));
}

const round1 = (n: number) => Math.round(n * 10) / 10;

const SINGLE = pityDistribution();
/** Up to this many 5★s, `luckierThan` is worked out exactly. */
export const EXACT_UP_TO = 100;

/** The standard normal curve's cumulative share (Abramowitz and Stegun 7.1.26, error under 1.5e-7). */
function normalCdf(z: number): number {
  const t = 1 / (1 + 0.3275911 * (Math.abs(z) / Math.SQRT2));
  const erf = 1 - t * (0.254829592 + t * (-0.284496736 + t * (1.421413741 + t * (-1.453152027 + t * 1.061405429)))) * Math.exp(-(z * z) / 2);
  return z >= 0 ? (1 + erf) / 2 : (1 - erf) / 2;
}

/** The year's numbers. `pulls` is the whole history, so pity can reach back before the year. */
export function yearInReview(pulls: Pull[], year: number): YearInReview {
  const inYear = pulls.filter((p) => poolOf(p.gachaType) && yearOf(p) === year);
  const wishesByPool: Partial<Record<WishPool, number>> = {};
  for (const p of inYear) {
    const pool = poolOf(p.gachaType)!;
    wishesByPool[pool] = (wishesByPool[pool] ?? 0) + 1;
  }
  const { fates, primogems } = wishSpending(inYear);

  const fiveStars: YearFiveStar[] = [];
  const fifty = { won: 0, lost: 0, guaranteed: 0 };
  let longestDryStreak: DryStreak | null = null;
  let streakTime = "";
  // Longest wins; on a tie, the one that ended (or last ran) earliest.
  const consider = (streak: DryStreak, time: string) => {
    const best = longestDryStreak;
    if (!best || streak.wishes > best.wishes || (streak.wishes === best.wishes && time < streakTime)) {
      longestDryStreak = streak;
      streakTime = time;
    }
  };

  for (const { pool, hardPity } of POOLS) {
    const list = pulls.filter((p) => poolOf(p.gachaType) === pool);
    if (!list.length) continue;
    const stats = poolStats(list, pool);
    for (const f of stats.fiveStars) {
      if (yearOf(f.pull) !== year) continue;
      fiveStars.push({ ...f, pool });
      if (f.fiftyFifty) fifty[f.fiftyFifty]++;
      if (hardPity) consider({ pool, wishes: f.pity - 1, endedBy: f.pull, stillGoing: false }, f.pull.time);
    }
    if (!hardPity) continue;
    // A run still going at the end of the year: the wishes after the last 5★
    // made by then, if any of them fall in the year.
    const upTo = list.filter((p) => yearOf(p) <= year);
    const upToYear = poolStats(upTo, pool);
    const last = upTo.reduce<Pull | null>((a, p) => (!a || p.time > a.time ? p : a), null);
    if (upToYear.pity5 > 0 && last && yearOf(last) === year) {
      consider({ pool, wishes: upToYear.pity5, stillGoing: true }, last.time);
    }
  }
  fiveStars.sort((a, b) => (a.pull.time < b.pull.time ? -1 : a.pull.time > b.pull.time ? 1 : 0));

  let luckiest: YearFiveStar | null = null;
  for (const f of fiveStars) if (!luckiest || f.pity < luckiest.pity) luckiest = f;

  const months = Array.from({ length: 12 }, (_, i) => ({ month: `${year}-${String(i + 1).padStart(2, "0")}`, wishes: 0 }));
  for (const p of inYear) months[Number(p.time.slice(5, 7)) - 1].wishes++;
  let busiestMonth: YearInReview["busiestMonth"] = null;
  for (const m of months) if (m.wishes && (!busiestMonth || m.wishes > busiestMonth.wishes)) busiestMonth = { ...m };

  const luckPulls = fiveStars.filter((f) => LUCK_POOLS.includes(f.pool));
  const totalPity = luckPulls.reduce((s, f) => s + f.pity, 0);
  const luck: YearLuck | null = luckPulls.length
    ? {
        fiveStars: luckPulls.length,
        averagePity: round1(totalPity / luckPulls.length),
        expectedAverage: round1(expectedPity()),
        luckierThan: luckierThan(luckPulls.length, totalPity),
      }
    : null;

  // New characters and constellations, counting copies from the whole history.
  const copies = new Map<string, number>();
  const newCharacters: NewCharacter[] = [];
  let constellations = 0;
  for (const p of [...pulls].sort(byTime)) {
    if (!poolOf(p.gachaType) || p.type !== "Character" || p.rarity < 4) continue;
    const had = copies.get(p.name) ?? 0;
    copies.set(p.name, had + 1);
    if (yearOf(p) !== year) continue;
    if (had === 0) newCharacters.push({ pull: p });
    else if (had <= 6) constellations++;
  }

  // Ten-pulls: ten wishes on one banner in the same second.
  let bestTenPull: BestTenPull | null = null;
  const groups = new Map<string, Pull[]>();
  for (const p of inYear) {
    const key = `${poolOf(p.gachaType)}|${p.time}`;
    groups.set(key, [...(groups.get(key) ?? []), p]);
  }
  for (const [key, group] of groups) {
    if (group.length !== 10) continue;
    const fives = group.filter((p) => p.rarity === 5).length;
    const fours = group.filter((p) => p.rarity === 4).length;
    const time = group[0].time;
    const better =
      !bestTenPull ||
      fives > bestTenPull.fiveStars ||
      (fives === bestTenPull.fiveStars && (fours > bestTenPull.fourStars || (fours === bestTenPull.fourStars && time < bestTenPull.time)));
    if (better) {
      const sorted = [...group].sort(byTime);
      bestTenPull = {
        pool: key.split("|")[0] as WishPool,
        time,
        fiveStars: fives,
        fourStars: fours,
        pulls: [...sorted.filter((p) => p.rarity === 5), ...sorted.filter((p) => p.rarity === 4)],
      };
    }
  }

  const played = fifty.won + fifty.lost;
  return {
    year,
    wishes: inYear.length,
    wishesByPool,
    fates,
    primogems,
    fourStars: inYear.filter((p) => p.rarity === 4).length,
    fiveStars,
    luckiest,
    longestDryStreak,
    fiftyFifty: { ...fifty, winRate: played ? fifty.won / played : null },
    busiestMonth,
    months,
    luck,
    newCharacters,
    constellations,
    bestTenPull,
  };
}
