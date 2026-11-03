import data from "@/data/genshin/weaponDetails.json";
import { getWeapon, weaponId } from "@/lib/genshin/weapons";

/**
 * What the character page shows about a weapon beyond weapons.ts: its flavour
 * text, its passive at each refinement and its stats at any level. From
 * genshin-db via `npm run data:genshin`. Kept apart from weapons.json so only
 * the character page loads it.
 */
interface WeaponDetails {
  description: string | null;
  passive: { name: string; parts: string[]; values: string[][] } | null;
  substat: string | null;
  stats: {
    base: { attack: number; specialized: number };
    curve: { attack: string; specialized: string };
    /** [level cap, ATK added above it] for each ascension phase */
    promotion: number[][];
  } | null;
}

const WEAPONS = data.weapons as Record<string, WeaponDetails>;
const CURVES = data.curves as Record<string, number[]>;

export function getWeaponDescription(key: string): string | null {
  return WEAPONS[weaponId(key)]?.description ?? null;
}

/** One piece of a passive's text: plain text, or a number that changes with refinement. */
export type PassivePart = { text: string; value: boolean };

/**
 * A weapon's passive at a refinement (1 to 5): its name and its text split
 * into parts, with the refinement's numbers marked so they can be highlighted.
 */
export function getWeaponPassive(
  key: string,
  refinement: number
): { name: string; parts: PassivePart[] } | null {
  const passive = WEAPONS[weaponId(key)]?.passive;
  if (!passive) return null;
  const values = passive.values[Math.min(Math.max(refinement, 1), 5) - 1];
  return {
    name: passive.name,
    // Odd parts are the index of the number that goes there.
    parts: passive.parts
      .map((part, i) => (i % 2 ? { text: values[Number(part)] ?? "", value: true } : { text: part, value: false }))
      .filter((part) => part.text),
  };
}

/** Whether refinement changes the passive at all (a few weapons can't be refined). */
export function canRefine(key: string): boolean {
  const passive = WEAPONS[weaponId(key)]?.passive;
  return !!passive && JSON.stringify(passive.values[0]) !== JSON.stringify(passive.values[4]);
}

/**
 * Base ATK and the second stat at a level and ascension (GOOD's 0 to 6), the
 * same way genshin-db and the game work them out: base value x growth curve at
 * the level, plus the ATK bonus of the ascension phase reached.
 */
export function getWeaponStats(
  key: string,
  level: number,
  ascension: number
): { baseAtk: number; substat: { name: string; value: string } | null } | null {
  const details = WEAPONS[weaponId(key)];
  const stats = details?.stats;
  if (!stats || level < 1 || level > 90) return null;
  // The phase is the number of caps below the level, or at it once ascended past it.
  let promotion = stats.promotion[0][1];
  for (let i = stats.promotion.length - 2; i >= 0; i--) {
    const [cap] = stats.promotion[i];
    if (level > cap || (level === cap && ascension > i)) {
      promotion = stats.promotion[i + 1][1];
      break;
    }
  }
  const baseAtk = Math.round(stats.base.attack * CURVES[stats.curve.attack][level - 1] + promotion);
  const raw = stats.base.specialized * CURVES[stats.curve.specialized][level - 1];
  const substat = details.substat
    ? {
        name: details.substat,
        // Elemental Mastery is a flat number; every other second stat is a percentage.
        value: details.substat === "Elemental Mastery" ? String(Math.round(raw)) : `${(raw * 100).toFixed(1)}%`,
      }
    : null;
  return { baseAtk, substat };
}

/** The weapon's rarity, for the star chip; undefined for a weapon newer than the data. */
export function getWeaponRarity(key: string): number | undefined {
  return getWeapon(key)?.rarity;
}
