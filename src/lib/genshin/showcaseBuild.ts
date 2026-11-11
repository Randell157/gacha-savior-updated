import { critValue, roundCv } from "./artifactScore.ts";
import type { GenshinData, GoodArtifact, GoodCharacter, GoodWeapon } from "./types.ts";

// What a showcase slot says about a build, beyond the pieces themselves:
// main stats, CRIT from artifacts, what's still missing, what changed since the
// previous upload, and which characters "Fill empty slots" picks.

export const SLOT_ORDER = ["flower", "plume", "sands", "goblet", "circlet"] as const;

/** Short main stat names for the one-line sands · goblet · circlet summary. */
const MAIN_STAT_SHORT: Record<string, string> = {
  hp: "HP",
  hp_: "HP%",
  atk: "ATK",
  atk_: "ATK%",
  def_: "DEF%",
  eleMas: "Elemental Mastery",
  enerRech_: "Energy Recharge",
  heal_: "Healing Bonus",
  critRate_: "CRIT Rate",
  critDMG_: "CRIT DMG",
  physical_dmg_: "Physical DMG",
  anemo_dmg_: "Anemo DMG",
  geo_dmg_: "Geo DMG",
  electro_dmg_: "Electro DMG",
  hydro_dmg_: "Hydro DMG",
  pyro_dmg_: "Pyro DMG",
  cryo_dmg_: "Cryo DMG",
  dendro_dmg_: "Dendro DMG",
};

export function mainStatShort(key: string): string {
  return MAIN_STAT_SHORT[key] ?? key;
}

/**
 * Main stat values on a 5★ piece at +20. GOOD exports don't include main stat
 * values, and these are the only ones that need no level-by-level table, so
 * lower levels and rarities aren't counted.
 */
const MAIN_STAT_MAX: Record<string, number> = {
  hp: 4780,
  atk: 311,
  hp_: 46.6,
  atk_: 46.6,
  def_: 58.3,
  eleMas: 186.5,
  enerRech_: 51.8,
  heal_: 35.9,
  critRate_: 31.1,
  critDMG_: 62.2,
  physical_dmg_: 58.3,
  anemo_dmg_: 46.6,
  geo_dmg_: 46.6,
  electro_dmg_: 46.6,
  hydro_dmg_: 46.6,
  pyro_dmg_: 46.6,
  cryo_dmg_: 46.6,
  dendro_dmg_: 46.6,
};

/** A piece's main stat value when it's known: 5★ at +20. */
export function mainStatValue(piece: Pick<GoodArtifact, "mainStatKey" | "rarity" | "level">): number | null {
  if (!piece.mainStatKey || piece.rarity !== 5 || piece.level !== 20) return null;
  return MAIN_STAT_MAX[piece.mainStatKey] ?? null;
}

export interface CritTotals {
  critRate: number;
  critDMG: number;
  /** True when a CRIT main stat below 5★ +20 was left out */
  partial: boolean;
}

/** CRIT Rate and CRIT DMG from a character's pieces: substats, plus 5★ +20 CRIT main stats. */
export function critFromArtifacts(pieces: GoodArtifact[]): CritTotals {
  let critRate = 0;
  let critDMG = 0;
  let partial = false;
  for (const piece of pieces) {
    if (piece.mainStatKey === "critRate_" || piece.mainStatKey === "critDMG_") {
      const value = mainStatValue(piece);
      if (value === null) partial = true;
      else if (piece.mainStatKey === "critRate_") critRate += value;
      else critDMG += value;
    }
    for (const sub of piece.substats ?? []) {
      if (sub.key === "critRate_") critRate += sub.value;
      if (sub.key === "critDMG_") critDMG += sub.value;
    }
  }
  return { critRate: roundCv(critRate), critDMG: roundCv(critDMG), partial };
}

/** The order the build card lists stats in: HP, ATK and DEF first, then the rest. */
const TOTALS_ORDER = [
  "hp", "hp_", "atk", "atk_", "def", "def_", "eleMas", "enerRech_", "critRate_", "critDMG_", "heal_",
  "anemo_dmg_", "geo_dmg_", "electro_dmg_", "dendro_dmg_", "hydro_dmg_", "pyro_dmg_", "cryo_dmg_", "physical_dmg_",
];

export interface ArtifactTotals {
  /** Every stat the pieces give, in `TOTALS_ORDER`, rounded to one decimal */
  stats: { key: string; value: number }[];
  /** True when a main stat below 5★ +20 was left out */
  partial: boolean;
}

/** All the stats a character's pieces give: main stats (5★ +20 only) and substats. */
export function artifactTotals(pieces: GoodArtifact[]): ArtifactTotals {
  const totals = new Map<string, number>();
  const add = (key: string, value: number) => totals.set(key, (totals.get(key) ?? 0) + value);
  let partial = false;
  for (const piece of pieces) {
    const main = mainStatValue(piece);
    if (main === null) {
      if (piece.mainStatKey) partial = true;
    } else {
      add(piece.mainStatKey!, main);
    }
    for (const sub of piece.substats ?? []) add(sub.key, sub.value);
  }
  const known = TOTALS_ORDER.filter((key) => totals.has(key));
  const others = [...totals.keys()].filter((key) => !TOTALS_ORDER.includes(key));
  return {
    stats: [...known, ...others].map((key) => ({ key, value: roundCv(totals.get(key)!) })),
    partial,
  };
}

export function totalCritValue(pieces: GoodArtifact[]): number {
  return roundCv(pieces.reduce((sum, piece) => sum + critValue(piece), 0));
}

export type BuildGap =
  | { kind: "level"; level: number }
  | { kind: "weaponLevel"; level: number }
  | { kind: "noWeapon" }
  | { kind: "missingPieces"; slots: string[] }
  | { kind: "leveling"; count: number };

/**
 * Plain facts a build is still missing: no opinions about talents or stats.
 * Level and weapon level below 90, empty slots, and 5★ pieces below +20.
 */
export function buildGaps(
  char: Pick<GoodCharacter, "level">,
  weapon: Pick<GoodWeapon, "level"> | undefined,
  pieces: Pick<GoodArtifact, "slotKey" | "rarity" | "level">[]
): BuildGap[] {
  const gaps: BuildGap[] = [];
  if (char.level < 90) gaps.push({ kind: "level", level: char.level });
  if (!weapon) gaps.push({ kind: "noWeapon" });
  else if (weapon.level < 90) gaps.push({ kind: "weaponLevel", level: weapon.level });
  const missing = SLOT_ORDER.filter((slot) => !pieces.some((p) => p.slotKey === slot));
  if (missing.length) gaps.push({ kind: "missingPieces", slots: missing });
  const leveling = pieces.filter((p) => p.rarity === 5 && p.level < 20).length;
  if (leveling) gaps.push({ kind: "leveling", count: leveling });
  return gaps;
}

/** One character's build as it was in an upload, kept to compare with the next one. */
export interface BuildSnapshotEntry {
  level: number;
  constellation: number;
  talent: [number, number, number] | null;
  weapon: { key: string; level: number; refinement: number } | null;
  totalCv: number;
}
export type BuildSnapshot = Record<string, BuildSnapshotEntry>;

function entryFor(
  char: GoodCharacter,
  weapon: GoodWeapon | undefined,
  pieces: GoodArtifact[]
): BuildSnapshotEntry {
  return {
    level: char.level,
    constellation: char.constellation,
    talent: char.talent ? [char.talent.auto, char.talent.skill, char.talent.burst] : null,
    weapon: weapon ? { key: weapon.key, level: weapon.level, refinement: weapon.refinement } : null,
    totalCv: totalCritValue(pieces),
  };
}

/** Every owned character's build in an upload, small enough to keep beside the next one. */
export function snapshotBuilds(data: GenshinData): BuildSnapshot {
  const snapshot: BuildSnapshot = {};
  for (const char of data.characters) {
    const weapon = data.weapons.find((w) => w.location === char.key);
    const pieces = data.artifacts.filter((a) => a.location === char.key);
    snapshot[char.key] = entryFor(char, weapon, pieces);
  }
  return snapshot;
}

const TALENT_NAMES = ["Normal Attack", "Skill", "Burst"] as const;

export type BuildChange =
  | { kind: "new" }
  | { kind: "level"; from: number; to: number }
  | { kind: "constellation"; from: number; to: number }
  | { kind: "talent"; talent: (typeof TALENT_NAMES)[number]; from: number; to: number }
  | { kind: "newWeapon"; key: string | null }
  | { kind: "weaponLevel"; from: number; to: number }
  | { kind: "refinement"; from: number; to: number }
  | { kind: "totalCv"; by: number };

/**
 * What changed for one character since the previous upload. With no snapshot
 * (the first upload) there's nothing to compare, so nothing is listed.
 */
export function buildChanges(
  previous: BuildSnapshot | null,
  char: GoodCharacter,
  weapon: GoodWeapon | undefined,
  pieces: GoodArtifact[]
): BuildChange[] {
  if (!previous) return [];
  const before = previous[char.key];
  if (!before) return [{ kind: "new" }];
  const now = entryFor(char, weapon, pieces);
  const changes: BuildChange[] = [];
  if (before.level !== now.level) changes.push({ kind: "level", from: before.level, to: now.level });
  if (before.constellation !== now.constellation) {
    changes.push({ kind: "constellation", from: before.constellation, to: now.constellation });
  }
  if (before.talent && now.talent) {
    now.talent.forEach((to, i) => {
      const from = before.talent![i];
      if (from !== to) changes.push({ kind: "talent", talent: TALENT_NAMES[i], from, to });
    });
  }
  if ((before.weapon?.key ?? null) !== (now.weapon?.key ?? null)) {
    changes.push({ kind: "newWeapon", key: now.weapon?.key ?? null });
  } else if (before.weapon && now.weapon) {
    if (before.weapon.level !== now.weapon.level) {
      changes.push({ kind: "weaponLevel", from: before.weapon.level, to: now.weapon.level });
    }
    if (before.weapon.refinement !== now.weapon.refinement) {
      changes.push({ kind: "refinement", from: before.weapon.refinement, to: now.weapon.refinement });
    }
  }
  const by = roundCv(now.totalCv - before.totalCv);
  if (by !== 0) changes.push({ kind: "totalCv", by });
  return changes;
}

/**
 * Characters for "Fill empty slots", best first: by Total CV, or by level and
 * then talent levels. Ties keep the upload's order.
 */
export function fillOrder(data: GenshinData, by: "cv" | "level"): string[] {
  const talentSum = (c: GoodCharacter) => (c.talent ? c.talent.auto + c.talent.skill + c.talent.burst : 0);
  const cv = new Map(
    data.characters.map((c) => [c.key, totalCritValue(data.artifacts.filter((a) => a.location === c.key))])
  );
  return data.characters
    .map((c, i) => ({ c, i }))
    .sort((a, b) =>
      by === "cv"
        ? cv.get(b.c.key)! - cv.get(a.c.key)! || a.i - b.i
        : b.c.level - a.c.level || talentSum(b.c) - talentSum(a.c) || a.i - b.i
    )
    .map(({ c }) => c.key);
}

/** Fills a showcase's empty slots from `order`, skipping characters already in it. */
export function fillSlots(picks: (string | null)[], order: string[]): (string | null)[] {
  const queue = order.filter((key) => !picks.includes(key));
  return picks.map((key) => key ?? queue.shift() ?? null);
}

/** Moves the character in slot `from` to slot `to`, shifting the ones between. */
export function moveSlot(picks: (string | null)[], from: number, to: number): (string | null)[] {
  if (from === to || to < 0 || to >= picks.length) return picks;
  const next = [...picks];
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved);
  return next;
}

/** Swaps the characters in two slots, as when one card is dropped on another. */
export function swapSlots(picks: (string | null)[], a: number, b: number): (string | null)[] {
  if (a === b || a < 0 || b < 0 || a >= picks.length || b >= picks.length) return picks;
  const next = [...picks];
  [next[a], next[b]] = [next[b], next[a]];
  return next;
}
