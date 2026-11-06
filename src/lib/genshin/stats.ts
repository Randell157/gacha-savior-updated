/**
 * Readable names for GOOD stat and artifact slot keys. In GOOD, a trailing
 * "_" marks a percentage stat ("hp_" is HP%, "hp" is flat HP), and
 * percentage values are already in percent (7.8 means 7.8%).
 */

export const STAT_LABELS: Record<string, string> = {
  hp: "HP",
  hp_: "HP",
  atk: "ATK",
  atk_: "ATK",
  def: "DEF",
  def_: "DEF",
  eleMas: "Elemental Mastery",
  enerRech_: "Energy Recharge",
  heal_: "Healing Bonus",
  critRate_: "CRIT Rate",
  critDMG_: "CRIT DMG",
  physical_dmg_: "Physical DMG Bonus",
  anemo_dmg_: "Anemo DMG Bonus",
  geo_dmg_: "Geo DMG Bonus",
  electro_dmg_: "Electro DMG Bonus",
  hydro_dmg_: "Hydro DMG Bonus",
  pyro_dmg_: "Pyro DMG Bonus",
  cryo_dmg_: "Cryo DMG Bonus",
  dendro_dmg_: "Dendro DMG Bonus",
};

export const SLOT_LABELS: Record<string, string> = {
  flower: "Flower of Life",
  plume: "Plume of Death",
  sands: "Sands of Eon",
  goblet: "Goblet of Eonothem",
  circlet: "Circlet of Logos",
};

/** True for percentage stats, which GOOD marks with a trailing "_". */
export function isPercentStat(key: string): boolean {
  return key.endsWith("_");
}

/** True for CRIT Rate and CRIT DMG, the stats players look for first. */
export function isCritStat(key: string): boolean {
  return key === "critRate_" || key === "critDMG_";
}

/**
 * Stat name for display. HP, ATK and DEF exist both flat and as a percentage,
 * so their percentage forms get a "%" ("HP%"); other percentage stats are
 * always percentages and keep their plain name.
 */
export function formatStatName(key: string): string {
  const label = STAT_LABELS[key];
  if (!label) return key;
  return key === "hp_" || key === "atk_" || key === "def_" ? `${label}%` : label;
}

/** A stat with its value, e.g. "CRIT DMG 7.8%" or "ATK 19". */
export function formatStat(key: string, value: number): string {
  const shown = isPercentStat(key)
    ? `${Number(value.toFixed(1))}%`
    : `${Math.round(value)}`;
  return `${formatStatName(key)} ${shown}`;
}

export function formatSlotName(slotKey: string): string {
  return SLOT_LABELS[slotKey] ?? slotKey;
}
