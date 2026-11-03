import data from "@/data/genshin/weapons.json";
import { formatWeaponDisplayName } from "@/lib/utils";

/** A weapon's details, from genshin-db via `npm run data:genshin`. */
export interface WeaponInfo {
  name: string;
  rarity: number;
  /** "Sword", "Claymore", "Polearm", "Bow" or "Catalyst" */
  type: string;
  /** Game version the weapon was released in, e.g. "4.3" */
  version: string | null;
}

const WEAPONS: Record<string, WeaponInfo> = data.weapons;

/**
 * A weapon's id: its name lowercased with everything but letters and digits
 * removed, so a GOOD key ("FlameForgedInsight") matches the data
 * ("Flame-Forged Insight"). Icons are saved under the same id.
 */
export function weaponId(keyOrName: string): string {
  return keyOrName.toLowerCase().replace(/[^a-z0-9]/g, "");
}

export function getWeapon(key: string): WeaponInfo | undefined {
  return WEAPONS[weaponId(key)];
}

/**
 * A weapon's in-game name ("Ballad of the Boundless Blue"), falling back to the
 * spaced-out GOOD key for a weapon newer than the game data.
 */
export function weaponName(key: string): string {
  return getWeapon(key)?.name ?? formatWeaponDisplayName(key);
}

/** The weapon's icon from `npm run icons:weapons`, or null for a weapon newer than the data. */
export function weaponIcon(key: string): string | null {
  return getWeapon(key) ? `/weapon-icons/${weaponId(key)}.webp` : null;
}
