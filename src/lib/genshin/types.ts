/**
 * Genshin account data in the GOOD format (Genshin Open Object Description),
 * as exported by Inventory Kamera, Irminsul and similar scanners.
 * Fields the app doesn't use are dropped by parseGood.
 */

export interface GoodTalents {
  auto: number;
  skill: number;
  burst: number;
}

export interface GoodCharacter {
  key: string;
  level: number;
  constellation: number;
  ascension?: number;
  talent?: GoodTalents;
}

export interface GoodWeapon {
  key: string;
  level: number;
  refinement: number;
  ascension?: number;
  /** Key of the character holding it; undefined when unequipped */
  location?: string;
  lock?: boolean;
}

export interface GoodSubstat {
  /** Stat key, e.g. "critRate_" (a trailing "_" means a percentage) */
  key: string;
  value: number;
}

export interface GoodArtifact {
  setKey: string;
  /** "flower" | "plume" | "sands" | "goblet" | "circlet" */
  slotKey: string;
  level: number;
  rarity: number;
  mainStatKey?: string;
  /** Key of the character wearing it; undefined when unequipped */
  location?: string;
  lock?: boolean;
  substats: GoodSubstat[];
}

/** A parsed upload. Every list is always present (possibly empty). */
export interface GenshinData {
  format: "GOOD";
  version: number;
  source?: string;
  characters: GoodCharacter[];
  weapons: GoodWeapon[];
  artifacts: GoodArtifact[];
  materials: Record<string, number>;
}
