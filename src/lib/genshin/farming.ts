// Today's farming list: of the materials the saved plans are still short of,
// the talent books and weapon materials whose domain is open today. The
// weekdays and domains come from `materialCosts.json` (`farming`, `domains`,
// written by `npm run data:genshin`), passed in so this file stays free of `@/`
// imports and runs under the unit tests.

import { combinePlans, type MaterialCosts, type Plan } from "./materialPlanner.ts";

export const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"] as const;

/** The game's day turns over at 4 AM server time. */
const TURNOVER_HOUR = 4;

export interface FarmingDay {
  /** 0 is Sunday, as `Date.getDay` counts */
  weekday: number;
  /** The game day as YYYY-MM-DD, for clearing ticks when it changes */
  key: string;
  /** When this game day ends */
  endsAt: Date;
}

const pad = (n: number) => String(n).padStart(2, "0");

/**
 * The game day at `now`. With a server's UTC offset (from `uigfTimezone`) it's
 * that server's day, which turns over at 4 AM there; with null it's the
 * browser's own day, turning over at 4 AM local time.
 */
export function farmingDay(now: Date, utcOffset: number | null): FarmingDay {
  if (utcOffset !== null) {
    // Shift so the UTC fields read the server's clock, 4 hours back.
    const shifted = new Date(now.getTime() + (utcOffset - TURNOVER_HOUR) * 3600_000);
    const start = Date.UTC(shifted.getUTCFullYear(), shifted.getUTCMonth(), shifted.getUTCDate());
    return {
      weekday: shifted.getUTCDay(),
      key: `${shifted.getUTCFullYear()}-${pad(shifted.getUTCMonth() + 1)}-${pad(shifted.getUTCDate())}`,
      endsAt: new Date(start + 86_400_000 - (utcOffset - TURNOVER_HOUR) * 3600_000),
    };
  }
  const shifted = new Date(now.getTime() - TURNOVER_HOUR * 3600_000);
  const end = new Date(shifted.getFullYear(), shifted.getMonth(), shifted.getDate() + 1, TURNOVER_HOUR);
  return {
    weekday: shifted.getDay(),
    key: `${shifted.getFullYear()}-${pad(shifted.getMonth() + 1)}-${pad(shifted.getDate())}`,
    endsAt: end,
  };
}

/** The weekdays a set of bits stands for, Monday first ("Monday, Thursday and Sunday"). */
export function weekdayNames(bits: number): string[] {
  return [1, 2, 3, 4, 5, 6, 0].filter((d) => bits & (1 << d)).map((d) => WEEKDAYS[d]);
}

/** One plan, with what to call it on the list. */
export interface FarmingPlan {
  /** "Chevreuse", "Favonius Sword (Bennett)" */
  label: string;
  plan: Plan;
}

export interface FarmingGroup {
  /** Stable for ticks: the domain and its days */
  id: string;
  domain: string;
  region: string;
  /** Weekday bits; Sunday is always among them */
  days: number;
  kind: "talent" | "weapon";
  /** The tiers still short, lowest rarity first */
  materials: { key: string; name: string; rarity: number | null; missing: number }[];
  /** The plans that use these materials, in plan order */
  for: string[];
}

export interface FarmingList {
  day: FarmingDay;
  /** Groups whose domain is open today (every one on Sunday) */
  today: FarmingGroup[];
  /** Groups for other days, by the next day they open */
  later: FarmingGroup[];
  /** When nothing is open today: the next weekday with something, and how many days away */
  next: { weekday: number; inDays: number } | null;
}

/**
 * What the plans are still short of, by domain and days. Only materials still
 * missing after adding every plan up count, so a fully covered plan drops off.
 * A group is "weapon" when weapon ascensions use its materials (a Domain of
 * Forgery), "talent" otherwise (a Domain of Mastery).
 */
export function farmingList(
  costs: MaterialCosts,
  plans: FarmingPlan[],
  owned: Record<string, number>,
  day: FarmingDay
): FarmingList {
  const index = new Map(costs.materials.map(([key], i) => [key, i]));
  const weaponKeys = weaponMaterialKeys(costs);
  const combined = combinePlans(
    plans.map((p) => p.plan),
    plans.map(() => "character"),
    owned
  );

  const groups = new Map<string, FarmingGroup>();
  for (const line of combined.materials) {
    if (line.missing <= 0) continue;
    const i = index.get(line.key);
    const entry = i === undefined ? undefined : costs.farming[String(i)];
    if (!entry) continue;
    const [days, domainAt] = entry;
    const id = `${domainAt}:${days}`;
    let group = groups.get(id);
    if (!group) {
      const [domain, region] = costs.domains[domainAt];
      group = {
        id,
        domain,
        region,
        days,
        kind: weaponKeys.has(line.key) ? "weapon" : "talent",
        materials: [],
        for: [],
      };
      groups.set(id, group);
    }
    group.materials.push({ key: line.key, name: line.name, rarity: line.rarity, missing: line.missing });
  }

  for (const group of groups.values()) {
    const keys = new Set(group.materials.map((m) => m.key));
    group.materials.sort((a, b) => (a.rarity ?? 0) - (b.rarity ?? 0));
    group.for = plans.filter((p) => p.plan.materials.some((m) => m.need > 0 && keys.has(m.key))).map((p) => p.label);
  }

  const all = [...groups.values()];
  const isOpen = (g: FarmingGroup, weekday: number) => (g.days & (1 << weekday)) !== 0;
  const daysUntil = (g: FarmingGroup) => {
    for (let n = 1; n <= 7; n++) if (isOpen(g, (day.weekday + n) % 7)) return n;
    return 7;
  };
  // Talent books first, then weapon materials; within each, the plan order.
  const order = (a: FarmingGroup, b: FarmingGroup) => Number(a.kind === "weapon") - Number(b.kind === "weapon");
  const today = all.filter((g) => isOpen(g, day.weekday)).sort(order);
  const later = all
    .filter((g) => !isOpen(g, day.weekday))
    .sort((a, b) => daysUntil(a) - daysUntil(b) || order(a, b));
  const next =
    today.length === 0 && later.length > 0
      ? { weekday: (day.weekday + daysUntil(later[0])) % 7, inDays: daysUntil(later[0]) }
      : null;
  return { day, today, later, next };
}

/** Every material a weapon's ascension uses that also has farming days: the Domain of Forgery ones. */
function weaponMaterialKeys(costs: MaterialCosts): Set<string> {
  const keys = new Set<string>();
  for (const steps of Object.values(costs.weapons)) {
    for (const step of steps) {
      for (const [i] of step) if (costs.farming[String(i)]) keys.add(costs.materials[i][0]);
    }
  }
  return keys;
}

/** Ticks on the list: the game day they were made on, and the groups ticked. */
export interface FarmingTicks {
  day: string;
  done: string[];
}

/** Saved ticks read back: a YYYY-MM-DD day and up to 50 ids, or null for anything else. */
export function normalizeFarmingTicks(value: unknown): FarmingTicks | null {
  if (!value || typeof value !== "object") return null;
  const { day, done } = value as Partial<FarmingTicks>;
  if (typeof day !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(day) || !Array.isArray(done)) return null;
  return { day, done: done.filter((id): id is string => typeof id === "string").slice(0, 50) };
}

/** The ticks that still count today; ones from an earlier game day are cleared. */
export function currentTicks(saved: unknown, day: FarmingDay): string[] {
  const ticks = normalizeFarmingTicks(saved);
  return ticks && ticks.day === day.key ? ticks.done : [];
}

/** Ticks or unticks a group, starting fresh when the saved ticks are from another day. */
export function toggleTick(saved: unknown, day: FarmingDay, id: string): FarmingTicks {
  const done = currentTicks(saved, day);
  return { day: day.key, done: done.includes(id) ? done.filter((d) => d !== id) : [...done, id] };
}
