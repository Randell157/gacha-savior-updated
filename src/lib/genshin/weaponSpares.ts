import type { GoodWeapon } from "./types.ts";

/** The highest refinement a weapon can reach. */
export const MAX_REFINEMENT = 5;

/** Spare copies are worked out for these rarities only; lower ones are EXP fodder. */
export const SPARE_MIN_RARITY = 4;

/** Refining one copy with some of the spares. */
export interface RefineStep {
  /** The copy being refined: equipped, or the one kept when none is. */
  copy: GoodWeapon;
  from: number;
  to: number;
  /** The spares it uses up, lowest level first; empty when they ran out before this copy. */
  uses: GoodWeapon[];
}

export interface WeaponSpares {
  /** Every copy of the weapon. */
  total: number;
  /** Copies on a character, highest refinement (then level) first. */
  equipped: GoodWeapon[];
  /** With none equipped, the copy that stays (the highest level); null otherwise. */
  kept: GoodWeapon | null;
  /** Unequipped copies beyond the kept one, lowest level first. Locked ones included. */
  spare: GoodWeapon[];
  /** How many of `spare` are locked (the game needs them unlocked to refine with). */
  lockedSpare: number;
  /**
   * What the spares could do, in the order they'd be used: every copy below R5 that they're
   * meant for, including ones they run out before reaching (`to` < 5, or `uses` empty).
   */
  refines: RefineStep[];
  /** Spares not needed by any refine step (every copy already at R5, or more than enough). */
  leftover: GoodWeapon[];
}

const byStrength = (a: GoodWeapon, b: GoodWeapon) => b.refinement - a.refinement || b.level - a.level;
const byLevel = (a: GoodWeapon, b: GoodWeapon) => b.level - a.level || b.refinement - a.refinement;
const lowestFirst = (a: GoodWeapon, b: GoodWeapon) => a.level - b.level || a.refinement - b.refinement;

/**
 * Picks the spares that bring a copy `need` refinements up: as little past R5
 * as possible, then the lowest total level, then the fewest copies. Uses all
 * of them when even that isn't enough. Spares come in lowest level first.
 */
function pickSpares(spares: GoodWeapon[], need: number): GoodWeapon[] {
  // best[s]: the cheapest set of spares adding exactly s refinements.
  const cap = need + MAX_REFINEMENT - 1;
  type Pick = { levels: number; items: number[] };
  const best: (Pick | null)[] = Array.from({ length: cap + 1 }, () => null);
  best[0] = { levels: 0, items: [] };
  spares.forEach((spare, index) => {
    const gain = Math.max(1, spare.refinement);
    for (let s = cap; s >= gain; s--) {
      const from = best[s - gain];
      if (!from) continue;
      const pick = { levels: from.levels + spare.level, items: [...from.items, index] };
      const current = best[s];
      if (!current || pick.levels < current.levels || (pick.levels === current.levels && pick.items.length < current.items.length)) {
        best[s] = pick;
      }
    }
  });
  for (let s = need; s <= cap; s++) {
    const pick = best[s];
    if (pick) return pick.items.map((index) => spares[index]);
  }
  return spares;
}

/**
 * Works out the spare copies of one weapon from all the account's copies of it.
 * Returns null when there's nothing to say: a single copy, or a weapon below
 * `SPARE_MIN_RARITY`.
 */
export function weaponSpares(copies: GoodWeapon[], rarity: number): WeaponSpares | null {
  if (copies.length < 2 || rarity < SPARE_MIN_RARITY) return null;

  const equipped = copies.filter((w) => w.location).sort(byStrength);
  const unequipped = copies.filter((w) => !w.location).sort(byLevel);
  const kept = equipped.length === 0 ? unequipped.shift() ?? null : null;
  const spare = unequipped.sort(lowestFirst);

  const targets = kept ? [kept] : equipped;
  let left = spare;
  const refines: RefineStep[] = [];
  for (const copy of targets) {
    const from = copy.refinement;
    if (from >= MAX_REFINEMENT) continue;
    const uses = pickSpares(left, MAX_REFINEMENT - from);
    const gain = uses.reduce((sum, w) => sum + Math.max(1, w.refinement), 0);
    refines.push({ copy, from, to: Math.min(MAX_REFINEMENT, from + gain), uses });
    left = left.filter((w) => !uses.includes(w));
  }

  return {
    total: copies.length,
    equipped,
    kept,
    spare,
    lockedSpare: spare.filter((w) => w.lock).length,
    refines,
    leftover: left,
  };
}

const count = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/** One refine step in words; the page draws the arrow and the holder's face. */
export interface RefineLine {
  /** The holder's key, or null for the copy kept when none is equipped. */
  holder: string | null;
  /** "Zhongli's" or "The copy you keep (Lv. 70)" */
  who: string;
  from: number;
  to: number;
  /** "1 spare weapon for refinement", or "no spares left for it" */
  needs: string;
  /** "2 more copies needed for R5" when the spares don't reach R5, else "". Counts R1 copies. */
  short: string;
}

/** What the page says about a weapon's spares. `nameOf` turns a character key into a name. */
export interface SpareWords {
  /** "4 spare copies, all locked" */
  head: string;
  steps: RefineLine[];
  /** What's left once the steps are done, or "" when nothing is. */
  leftover: string;
  /** Set when any spare is locked. */
  lockNote: string;
}

export function spareWords(spares: WeaponSpares, nameOf: (key: string) => string): SpareWords {
  const n = spares.spare.length;
  const locked =
    spares.lockedSpare === 0 ? "" : spares.lockedSpare === n ? (n > 1 ? ", all locked" : ", locked") : `, ${spares.lockedSpare} locked`;
  const steps = spares.refines.map((step) => ({
    holder: step.copy.location ?? null,
    who: step.copy.location ? `${nameOf(step.copy.location)}'s` : `The copy you keep (Lv. ${step.copy.level})`,
    from: step.from,
    to: step.to,
    needs:
      step.uses.length === 0
        ? "no spares left for it"
        : `${count(step.uses.length, "spare weapon", "spare weapons")} for refinement`,
    short:
      step.to < MAX_REFINEMENT
        ? `${count(MAX_REFINEMENT - step.to, "more copy", "more copies")} needed for R${MAX_REFINEMENT}`
        : "",
  }));

  let leftover = "";
  const left = spares.leftover.length;
  if (left > 0 && steps.length === 0) {
    const which = spares.equipped.length > 1 ? "Every equipped copy is" : spares.equipped.length === 1 ? "The equipped copy is" : "The copy you keep is";
    const all = left === 1 ? "the spare is" : left === 2 ? "both spares are" : `all ${left} spares are`;
    leftover = `${which} already R${MAX_REFINEMENT}, so ${all} left over.`;
  } else if (left > 0) {
    leftover = `${count(left, "spare", "spares")} left over after that.`;
  }

  return {
    head: `${count(n, "spare copy", "spare copies")}${locked}`,
    steps,
    leftover,
    lockNote: spares.lockedSpare > 0 ? "Locked copies can't be used for refinement in the game until you unlock them." : "",
  };
}
