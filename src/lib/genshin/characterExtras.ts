/**
 * Reading src/data/genshin/characterExtras.json (from genshin-db via
 * `npm run data:genshin`). The file is large, so it's loaded on demand by
 * useCharacterExtras and passed in here rather than imported.
 */

export interface GameText {
  name: string;
  text: string;
}

export interface CharacterTexts {
  /** Normal Attack, Elemental Skill and Elemental Burst, in that order */
  talents: GameText[] | null;
  /** C1 to C6 */
  constellations: GameText[] | null;
}

interface CharacterExtra extends CharacterTexts {
  substat: string | null;
  stats: {
    base: { hp: number; attack: number; defense: number };
    curve: { hp: string; attack: string; defense: string };
    specializedBase: number;
    /** [level cap, HP, ATK, DEF, ascension stat] added in each ascension phase */
    promotion: number[][];
  } | null;
}

export interface CharacterExtrasFile {
  curves: Record<string, number[]>;
  characters: Record<string, CharacterExtra>;
  travelerElements: Record<string, CharacterTexts>;
}

export const TALENT_KINDS = ["Normal Attack", "Elemental Skill", "Elemental Burst"] as const;

/** A shown stat: "HP" and "15,307", or "Energy Recharge" and "+26.7%". */
export interface BaseStat {
  label: string;
  value: string;
}

/** Stats that have a flat and a percentage version, so the label has to say which. */
const PERCENT_LABELS: Record<string, string> = { ATK: "ATK%", HP: "HP%", DEF: "DEF%" };

function formatAscensionStat(name: string, value: number): BaseStat {
  if (name === "Elemental Mastery") return { label: name, value: `+${Math.round(value)}` };
  const percent = `${(value * 100).toFixed(1)}%`;
  // CRIT includes the 5% and 50% every character starts with, so it's the whole value, not a bonus.
  if (name === "CRIT Rate" || name === "CRIT DMG") return { label: name, value: percent };
  return { label: PERCENT_LABELS[name] ?? name, value: `+${percent}` };
}

/**
 * HP, ATK, DEF and the ascension stat at a level and ascension (GOOD's 0 to 6),
 * before weapon and artifacts. Worked out the way genshin-db's stats() does it:
 * base value x growth curve at the level, plus the bonus of the ascension phase
 * reached. Null for a level out of range or a character with no stat data.
 */
export function getCharacterBaseStats(
  file: CharacterExtrasFile,
  id: string,
  level: number,
  ascension: number
): BaseStat[] | null {
  const extra = file.characters[id];
  const stats = extra?.stats;
  if (!stats || level < 1 || level > 100) return null;
  // The phase is the number of caps below the level, or at it once ascended past it.
  let promotion = stats.promotion[0];
  for (let i = stats.promotion.length - 2; i >= 0; i--) {
    const cap = stats.promotion[i][0];
    if (level > cap || (level === cap && ascension > i)) {
      promotion = stats.promotion[i + 1];
      break;
    }
  }
  const at = (part: "hp" | "attack" | "defense", bonus: number) =>
    Math.round(stats.base[part] * file.curves[stats.curve[part]][level - 1] + bonus).toLocaleString("en-US");
  const result: BaseStat[] = [
    { label: "HP", value: at("hp", promotion[1]) },
    { label: "ATK", value: at("attack", promotion[2]) },
    { label: "DEF", value: at("defense", promotion[3]) },
  ];
  if (extra.substat) result.push(formatAscensionStat(extra.substat, promotion[4] + stats.specializedBase));
  return result;
}

/** A character's talent and constellation text; the Traveler's needs their element. */
export function getCharacterTexts(
  file: CharacterExtrasFile,
  id: string,
  travelerElement: string | null | undefined
): CharacterTexts {
  if (id === "traveler") {
    return (travelerElement && file.travelerElements[travelerElement]) || { talents: null, constellations: null };
  }
  const extra = file.characters[id];
  return { talents: extra?.talents ?? null, constellations: extra?.constellations ?? null };
}
