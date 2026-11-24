// The material planner: what a character or weapon still needs to reach a
// target level and talent levels, against the materials in the upload. It
// counts materials only; it doesn't estimate resin or days.
//
// Costs come from `src/data/genshin/materialCosts.json` (genshin-db, written by
// `npm run data:genshin`) and are passed in, so this file stays free of `@/`
// imports and runs under the unit tests.

/** A step's materials: [index into `materials`, count]. */
type CostStep = [number, number][];

export interface MaterialCosts {
  /** [export key (lowercase, letters and digits), in-game name, rarity or null] */
  materials: [string, string, number | null][];
  characters: Record<string, { ascend: CostStep[]; talent: CostStep[] | null }>;
  travelerTalents: Record<string, CostStep[]>;
  weapons: Record<string, CostStep[]>;
  /** For today's farming list (`farming.ts`): [domain entrance name, region] */
  domains: [string, string][];
  /** Place in `materials` → [weekday bits, Sunday as bit 0; place in `domains`], for talent books and weapon materials */
  farming: Record<string, [number, number]>;
}

/**
 * EXP from each level to the next (index 0 is level 1 → 2), from the game's
 * AvatarLevelExcelConfigData as written out in Snap.Hutao by DGP Studio (MIT).
 * 1 → 90 adds up to 8,362,650.
 */
const CHARACTER_EXP = [
  1000, 1325, 1700, 2150, 2625, 3150, 3725, 4350, 5000, 5700,
  6450, 7225, 8050, 8925, 9825, 10750, 11725, 12725, 13775, 14875,
  16800, 18000, 19250, 20550, 21875, 23250, 24650, 26100, 27575, 29100,
  30650, 32250, 33875, 35550, 37250, 38975, 40750, 42575, 44425, 46300,
  50625, 52700, 54775, 56900, 59075, 61275, 63525, 65800, 68125, 70475,
  76500, 79050, 81650, 84275, 86950, 89650, 92400, 95175, 98000, 100875,
  108950, 112050, 115175, 118325, 121525, 124775, 128075, 131400, 134775, 138175,
  148700, 152375, 156075, 159825, 163600, 167425, 171300, 175225, 179175, 183175,
  216225, 243025, 273100, 306800, 344600, 386950, 434425, 487625, 547200,
];

/** Weapon EXP from each level to the next, by rarity (same source). 5★ 1 → 90 adds up to 9,064,450. */
const WEAPON_EXP: Record<number, number[]> = {
  5: [
    600, 950, 1350, 1800, 2325, 2925, 3525, 4200, 4950, 5700,
    6525, 7400, 8300, 9225, 10200, 11250, 12300, 13425, 14600, 15750,
    17850, 19175, 20550, 21975, 23450, 24950, 26475, 28050, 29675, 31350,
    33050, 34800, 36575, 38400, 40250, 42150, 44100, 46100, 48125, 50150,
    54875, 57125, 59400, 61725, 64100, 66500, 68925, 71400, 73950, 76500,
    83075, 85850, 88650, 91550, 94425, 97400, 100350, 103400, 106475, 109575,
    118350, 121700, 125100, 128550, 132050, 135575, 139125, 142725, 146375, 150075,
    161525, 165500, 169500, 173550, 177650, 181800, 186000, 190250, 194525, 198875,
    234725, 263825, 296400, 332975, 373950, 419925, 471375, 529050, 593675,
  ],
  4: [
    400, 625, 900, 1200, 1550, 1950, 2350, 2800, 3300, 3800,
    4350, 4925, 5525, 6150, 6800, 7500, 8200, 8950, 9725, 10500,
    11900, 12775, 13700, 14650, 15625, 16625, 17650, 18700, 19775, 20900,
    22025, 23200, 24375, 25600, 26825, 28100, 29400, 30725, 32075, 33425,
    36575, 38075, 39600, 41150, 42725, 44325, 45950, 47600, 49300, 51000,
    55375, 57225, 59100, 61025, 62950, 64925, 66900, 68925, 70975, 73050,
    78900, 81125, 83400, 85700, 88025, 90375, 92750, 95150, 97575, 100050,
    107675, 110325, 113000, 115700, 118425, 121200, 124000, 126825, 129675, 132575,
    156475, 175875, 197600, 221975, 249300, 279950, 314250, 352700, 395775,
  ],
  3: [
    275, 425, 600, 800, 1025, 1275, 1550, 1850, 2175, 2500,
    2875, 3250, 3650, 4050, 4500, 4950, 5400, 5900, 6425, 6925,
    7850, 8425, 9050, 9675, 10325, 10975, 11650, 12350, 13050, 13800,
    14525, 15300, 16100, 16900, 17700, 18550, 19400, 20275, 21175, 22050,
    24150, 25125, 26125, 27150, 28200, 29250, 30325, 31425, 32550, 33650,
    36550, 37775, 39000, 40275, 41550, 42850, 44150, 45500, 46850, 48225,
    52075, 53550, 55050, 56550, 58100, 59650, 61225, 62800, 64400, 66025,
    71075, 72825, 74575, 76350, 78150, 80000, 81850, 83700, 85575, 87500,
    103275, 116075, 130425, 146500, 164550, 184775, 207400, 232775, 261200,
  ],
  2: [
    175, 275, 400, 550, 700, 875, 1050, 1250, 1475, 1700,
    1950, 2225, 2475, 2775, 3050, 3375, 3700, 4025, 4375, 4725,
    5350, 5750, 6175, 6600, 7025, 7475, 7950, 8425, 8900, 9400,
    9900, 10450, 10975, 11525, 12075, 12650, 13225, 13825, 14425, 15050,
    16450, 17125, 17825, 18525, 19225, 19950, 20675, 21425, 22175, 22950,
    24925, 25750, 26600, 27450, 28325, 29225, 30100, 31025, 31950, 32875,
    35500, 36500, 37525, 38575, 39600, 40675, 41750, 42825, 43900,
  ],
  1: [
    125, 200, 275, 350, 475, 575, 700, 850, 1000, 1150,
    1300, 1475, 1650, 1850, 2050, 2250, 2450, 2675, 2925, 3150,
    3575, 3825, 4100, 4400, 4700, 5000, 5300, 5600, 5925, 6275,
    6600, 6950, 7325, 7675, 8050, 8425, 8825, 9225, 9625, 10025,
    10975, 11425, 11875, 12350, 12825, 13300, 13775, 14275, 14800, 15300,
    16625, 17175, 17725, 18300, 18875, 19475, 20075, 20675, 21300, 21925,
    23675, 24350, 25025, 25700, 26400, 27125, 27825, 28550, 29275,
  ],
};

/** EXP materials and what each gives (from genshin-db's descriptions). */
export const CHARACTER_EXP_ITEMS = [
  { key: "heroswit", name: "Hero's Wit", exp: 20000, rarity: 4 },
  { key: "adventurersexperience", name: "Adventurer's Experience", exp: 5000, rarity: 3 },
  { key: "wanderersadvice", name: "Wanderer's Advice", exp: 1000, rarity: 2 },
] as const;
export const WEAPON_EXP_ITEMS = [
  { key: "mysticenhancementore", name: "Mystic Enhancement Ore", exp: 10000, rarity: 3 },
  { key: "fineenhancementore", name: "Fine Enhancement Ore", exp: 2000, rarity: 2 },
  { key: "enhancementore", name: "Enhancement Ore", exp: 400, rarity: 1 },
] as const;

/** Mora's rarity in the game data, for leveling costs that don't come from the cost file. */
const MORA_RARITY = 3;

/** Leveling costs 1 Mora per 5 character EXP and per 10 weapon EXP. */
const MORA_PER_CHARACTER_EXP = 1 / 5;
const MORA_PER_WEAPON_EXP = 1 / 10;

/** The level cap after each ascension: 0 ascensions cap at 20, 6 at 90. */
const LEVEL_CAPS = [20, 40, 50, 60, 70, 80, 90];
/** 1★ and 2★ weapons stop at 70 after four ascensions. */
export function maxLevel(kind: "character" | "weapon", rarity = 5): number {
  return kind === "weapon" && rarity <= 2 ? 70 : 90;
}

/** Ascensions needed to reach a level: 20 needs none, 21–40 one, and so on. */
export function ascensionFor(level: number): number {
  const i = LEVEL_CAPS.findIndex((cap) => level <= cap);
  return i < 0 ? LEVEL_CAPS.length - 1 : i;
}

/**
 * The ascensions already done. Exports usually include it; when they don't,
 * a character at a cap (say level 40) counts as not yet ascended past it.
 */
export function currentAscension(level: number, ascension?: number): number {
  return ascension ?? ascensionFor(level);
}

export const normalizeMaterialKey = (key: string) => key.toLowerCase().replace(/[^a-z0-9]/g, "");

const sumExp = (table: number[], from: number, to: number) =>
  table.slice(Math.max(from, 1) - 1, Math.max(to, 1) - 1).reduce((sum, exp) => sum + exp, 0);

export function characterExp(from: number, to: number): number {
  return sumExp(CHARACTER_EXP, from, Math.min(to, 90));
}

export function weaponExp(rarity: number, from: number, to: number): number {
  const table = WEAPON_EXP[rarity] ?? WEAPON_EXP[5];
  return sumExp(table, from, Math.min(to, table.length + 1));
}

/** One line of a plan. `have` is null when the export doesn't list the material at all (Irminsul leaves out Mora). */
export interface PlanLine {
  key: string;
  name: string;
  /** For the icon's background; null when genshin-db doesn't say (local specialties) */
  rarity: number | null;
  need: number;
  have: number | null;
  missing: number;
}

export interface ExpLine {
  /** EXP still to gain */
  need: number;
  /** EXP in the books or ore the upload has */
  have: number;
  missing: number;
  /** The largest item, rounded up, to cover what's missing (e.g. 12 Hero's Wit) */
  missingItems: { name: string; count: number };
}

export interface Plan {
  materials: PlanLine[];
  /** Character EXP (books) or weapon EXP (ore); null when no levels are gained */
  exp: ExpLine | null;
}

/** Adds up needs by material, keeping the order materials first appear in. */
class Needs {
  private counts = new Map<string, { name: string; rarity: number | null; need: number }>();
  add(key: string, name: string, count: number, rarity: number | null = null) {
    if (count <= 0) return;
    const line = this.counts.get(key);
    if (line) line.need += count;
    else this.counts.set(key, { name, rarity, need: count });
  }
  addSteps(costs: MaterialCosts, steps: CostStep[]) {
    for (const step of steps) {
      for (const [index, count] of step) {
        const [key, name, rarity] = costs.materials[index];
        this.add(key, name, count, rarity);
      }
    }
  }
  entries() {
    return [...this.counts.entries()];
  }
}

function lines(needs: Needs, materials: Record<string, number>): PlanLine[] {
  const owned = new Map(Object.entries(materials).map(([key, count]) => [normalizeMaterialKey(key), count]));
  const result = needs.entries().map(([key, { name, rarity, need }]) => {
    const have = owned.has(key) ? owned.get(key)! : key === "mora" ? null : 0;
    return { key, name, rarity, need, have, missing: Math.max(0, need - (have ?? 0)) };
  });
  // Mora first, then what's missing most, as a share of what's needed; ties keep the cost order.
  return result
    .map((line, i) => ({ line, i }))
    .sort(
      (a, b) =>
        Number(b.line.key === "mora") - Number(a.line.key === "mora") ||
        b.line.missing / b.line.need - a.line.missing / a.line.need ||
        a.i - b.i
    )
    .map(({ line }) => line);
}

function expLine(
  need: number,
  items: readonly { key: string; name: string; exp: number }[],
  materials: Record<string, number>
): ExpLine | null {
  if (need <= 0) return null;
  const owned = new Map(Object.entries(materials).map(([key, count]) => [normalizeMaterialKey(key), count]));
  const have = items.reduce((sum, item) => sum + (owned.get(item.key) ?? 0) * item.exp, 0);
  const missing = Math.max(0, need - have);
  return { need, have, missing, missingItems: { name: items[0].name, count: Math.ceil(missing / items[0].exp) } };
}

export interface CharacterNow {
  key: string;
  level: number;
  ascension?: number;
  talent?: { auto: number; skill: number; burst: number };
}

export interface CharacterTarget {
  level: number;
  talent: { auto: number; skill: number; burst: number };
}

/** The roster key costs are stored under ("HuTao" → "hutao", any Traveler → "traveler"). */
export function costKey(characterKey: string): string {
  const key = normalizeMaterialKey(characterKey);
  return key.startsWith("traveler") ? "traveler" : key;
}

/**
 * What a character needs from where they are to the target: ascensions,
 * talent levels and EXP, against the upload's materials. Targets below the
 * current levels count nothing. `travelerElement` picks the Traveler's talent costs.
 */
export function planCharacter(
  costs: MaterialCosts,
  now: CharacterNow,
  target: CharacterTarget,
  materials: Record<string, number>,
  travelerElement?: string | null
): Plan | null {
  const entry = costs.characters[costKey(now.key)];
  if (!entry) return null;
  const needs = new Needs();
  const toLevel = Math.min(Math.max(target.level, now.level), 90);
  const ascended = currentAscension(now.level, now.ascension);
  needs.addSteps(costs, entry.ascend.slice(ascended, Math.max(ascended, ascensionFor(toLevel))));

  const talentSteps = costKey(now.key) === "traveler" ? (travelerElement ? costs.travelerTalents[travelerElement] : null) : entry.talent;
  if (talentSteps) {
    for (const part of ["auto", "skill", "burst"] as const) {
      const from = now.talent?.[part] ?? 1;
      const to = Math.min(target.talent[part], 10);
      // talentSteps[0] is level 1 → 2.
      if (to > from) needs.addSteps(costs, talentSteps.slice(from - 1, to - 1));
    }
  }

  const exp = characterExp(now.level, toLevel);
  needs.add("mora", "Mora", Math.round(exp * MORA_PER_CHARACTER_EXP), MORA_RARITY);
  return { materials: lines(needs, materials), exp: expLine(exp, CHARACTER_EXP_ITEMS, materials) };
}

export interface WeaponNow {
  key: string;
  level: number;
  ascension?: number;
}

/** What a weapon needs to reach a target level: ascensions and ore. */
export function planWeapon(
  costs: MaterialCosts,
  rarity: number,
  now: WeaponNow,
  targetLevel: number,
  materials: Record<string, number>
): Plan | null {
  const steps = costs.weapons[normalizeMaterialKey(now.key)];
  if (!steps) return null;
  const needs = new Needs();
  const toLevel = Math.min(Math.max(targetLevel, now.level), maxLevel("weapon", rarity));
  const ascended = currentAscension(now.level, now.ascension);
  needs.addSteps(costs, steps.slice(ascended, Math.max(ascended, ascensionFor(toLevel))));
  const exp = weaponExp(rarity, now.level, toLevel);
  needs.add("mora", "Mora", Math.round(exp * MORA_PER_WEAPON_EXP), MORA_RARITY);
  return { materials: lines(needs, materials), exp: expLine(exp, WEAPON_EXP_ITEMS, materials) };
}

/**
 * A plan saved with the account (the Planner tab): a character with a target
 * level and talents, or a weapon with a target level. A weapon is picked by
 * its key and who holds it (null for an unequipped copy), since exports have
 * no weapon ids. `off` is set (only ever `true`) on a plan switched off on the
 * Planner tab: it keeps its card but leaves the totals and the farming list.
 */
export type SavedPlan =
  | { kind: "character"; key: string; level: number; talent: { auto: number; skill: number; burst: number }; off?: true }
  | { kind: "weapon"; key: string; location: string | null; level: number; off?: true };

export const MAX_PLANS = 20;

const clampLevel = (value: unknown, max = 90) =>
  typeof value === "number" && Number.isFinite(value) ? Math.min(max, Math.max(1, Math.round(value))) : null;

/** The saved plans, with anything malformed dropped and duplicates kept once. */
export function normalizePlans(value: unknown): SavedPlan[] {
  if (!Array.isArray(value)) return [];
  const plans: SavedPlan[] = [];
  const seen = new Set<string>();
  for (const entry of value) {
    if (!entry || typeof entry !== "object" || typeof entry.key !== "string" || !entry.key) continue;
    const level = clampLevel(entry.level);
    if (level === null) continue;
    let plan: SavedPlan | null = null;
    if (entry.kind === "character") {
      const t = entry.talent ?? {};
      const auto = clampLevel(t.auto, 10);
      const skill = clampLevel(t.skill, 10);
      const burst = clampLevel(t.burst, 10);
      if (auto === null || skill === null || burst === null) continue;
      plan = { kind: "character", key: entry.key, level, talent: { auto, skill, burst } };
    } else if (entry.kind === "weapon") {
      const location = typeof entry.location === "string" && entry.location ? entry.location : null;
      plan = { kind: "weapon", key: entry.key, location, level };
    }
    if (!plan) continue;
    if (entry.off === true) plan.off = true;
    const id = planId(plan);
    if (seen.has(id)) continue;
    seen.add(id);
    plans.push(plan);
    if (plans.length === MAX_PLANS) break;
  }
  return plans;
}

/** One plan per character, and per weapon and holder. */
export function planId(plan: SavedPlan): string {
  return plan.kind === "character" ? `character:${plan.key}` : `weapon:${plan.key}:${plan.location ?? ""}`;
}

/**
 * Adds a plan, or replaces the one for the same character or weapon in place.
 * A replaced plan stays switched off if it was, since editing targets isn't
 * switching it back on.
 */
export function upsertPlan(plans: SavedPlan[], plan: SavedPlan): SavedPlan[] {
  const id = planId(plan);
  const i = plans.findIndex((p) => planId(p) === id);
  if (i >= 0) return plans.map((p, j) => (j === i ? withOff(plan, p.off === true) : p));
  return plans.length >= MAX_PLANS ? plans : [...plans, plan];
}

/** Whether a plan counts toward the totals and the farming list. */
export const isPlanOn = (plan: SavedPlan) => plan.off !== true;

/** A copy with `off` set, or left out entirely when on (Firestore refuses undefined fields). */
function withOff(plan: SavedPlan, off: boolean): SavedPlan {
  const { off: _old, ...rest } = plan;
  return off ? { ...rest, off: true } : rest;
}

/** Switches one plan on or off. */
export function setPlanOn(plans: SavedPlan[], plan: SavedPlan, on: boolean): SavedPlan[] {
  const id = planId(plan);
  return plans.map((p) => (planId(p) === id ? withOff(p, !on) : p));
}

/** Switches every character plan, or every weapon plan, on or off. */
export function setKindOn(plans: SavedPlan[], kind: SavedPlan["kind"], on: boolean): SavedPlan[] {
  return plans.map((p) => (p.kind === kind ? withOff(p, !on) : p));
}

export function removePlan(plans: SavedPlan[], plan: SavedPlan): SavedPlan[] {
  const id = planId(plan);
  return plans.filter((p) => planId(p) !== id);
}

/**
 * The copy of a weapon a plan means: the one its holder has, or for an
 * unequipped plan the highest-level unequipped copy.
 */
export function findPlannedWeapon<W extends { key: string; level: number; location?: string }>(
  weapons: W[],
  key: string,
  location: string | null
): W | undefined {
  return weapons
    .filter((w) => w.key === key && (w.location ?? null) === location)
    .sort((a, b) => b.level - a.level)[0];
}

/**
 * Several plans added up: each material's need summed, compared once with
 * what you have. EXP is added up separately for characters and weapons.
 */
export function combinePlans(plans: Plan[], kinds: ("character" | "weapon")[], materials: Record<string, number>): {
  materials: PlanLine[];
  characterExp: ExpLine | null;
  weaponExp: ExpLine | null;
} {
  const needs = new Needs();
  let characterNeed = 0;
  let weaponNeed = 0;
  plans.forEach((plan, i) => {
    for (const line of plan.materials) needs.add(line.key, line.name, line.need, line.rarity);
    if (plan.exp) {
      if (kinds[i] === "weapon") weaponNeed += plan.exp.need;
      else characterNeed += plan.exp.need;
    }
  });
  return {
    materials: lines(needs, materials),
    characterExp: expLine(characterNeed, CHARACTER_EXP_ITEMS, materials),
    weaponExp: expLine(weaponNeed, WEAPON_EXP_ITEMS, materials),
  };
}
