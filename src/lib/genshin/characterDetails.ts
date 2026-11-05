import data from "@/data/genshin/characters.json";
import reactionData from "@/data/genshin/reactions.json";
import roleData from "@/data/genshin/roles.json";
import { normalizeCharacterKey, rosterKey } from "@/lib/genshinCharacters";

/** A character's profile, from genshin-db via `npm run data:genshin`. */
export interface CharacterDetails {
  name: string;
  /** In-game title, e.g. "Admonishing Instruction" */
  title: string | null;
  description: string | null;
  /** "Pyro", "Hydro", ...; null for the Traveler, whose element the export doesn't give */
  element: string | null;
  weaponType: string | null;
  region: string | null;
  affiliation: string | null;
  constellation: string | null;
  /** Game version the character was released in, e.g. "5.3" */
  version: string | null;
  /** e.g. "October 13"; null for the Traveler */
  birthday: string | null;
  /** Talent names; null for the Traveler and the Wonderland Manekin */
  talents: { auto: string | null; skill: string | null; burst: string | null } | null;
}

const CHARACTERS: Record<string, CharacterDetails> = data.characters;

/** Playstyle roles (src/data/genshin/roles.json), keyed by the roster key normalized. */
const ROLES = new Map(
  Object.entries(roleData.roles as Record<string, string[]>).map(([key, roles]) => [
    normalizeCharacterKey(key),
    roles,
  ])
);

/** The elements each reaction involves. Swirl and Crystallize name only their own, since they work with several. */
export const REACTION_ELEMENTS: Record<string, string[]> = {
  Vaporize: ["Pyro", "Hydro"],
  Melt: ["Pyro", "Cryo"],
  Overloaded: ["Pyro", "Electro"],
  Superconduct: ["Cryo", "Electro"],
  "Electro-Charged": ["Electro", "Hydro"],
  Freeze: ["Cryo", "Hydro"],
  Shatter: ["Cryo", "Hydro"],
  Swirl: ["Anemo"],
  Crystallize: ["Geo"],
  Burning: ["Pyro", "Dendro"],
  Bloom: ["Dendro", "Hydro"],
  Hyperbloom: ["Dendro", "Hydro", "Electro"],
  Burgeon: ["Dendro", "Hydro", "Pyro"],
  Quicken: ["Dendro", "Electro"],
  Aggravate: ["Electro", "Dendro"],
  Spread: ["Dendro", "Electro"],
  "Lunar-Charged": ["Electro", "Hydro"],
  "Lunar-Bloom": ["Dendro", "Hydro"],
  "Lunar-Crystallize": ["Geo", "Hydro"],
  "Stellar-Conduct": ["Cryo", "Electro"],
  "Stellar Swirl": ["Anemo", "Cryo"],
  // Tags rather than reactions, listed with them.
  Generalist: [],
  "Swirl support": ["Anemo"],
};

export interface CharacterReaction {
  /** A key of REACTION_ELEMENTS */
  reaction: string;
  /** One line on how the character uses it */
  note: string;
}

/** Reactions (src/data/genshin/reactions.json), keyed by the roster key. */
const REACTIONS: Record<string, CharacterReaction[]> = reactionData.reactions;

export function getCharacterDetails(key: string): CharacterDetails | undefined {
  return CHARACTERS[rosterKey(key)];
}

/** The character's playstyle roles, e.g. ["Support", "Healer"]; empty when not set. */
export function getCharacterRoles(key: string): string[] {
  return ROLES.get(rosterKey(key)) ?? [];
}

/** True for characters who are best with their own element alone, rather than any reaction. */
export function isElementOnly(key: string): boolean {
  return reactionData.elementOnly.includes(rosterKey(key));
}

const TRAVELER_REACTIONS: Record<string, CharacterReaction[]> = reactionData.travelerReactions;

/** The elements a player can pick for the Traveler, whose element the export doesn't give. */
export const TRAVELER_ELEMENTS = Object.keys(TRAVELER_REACTIONS);

export function isTraveler(key: string): boolean {
  return rosterKey(key) === "traveler";
}

/**
 * The reactions that suit the character, the main one first; empty when not set.
 * The Traveler's depend on the element the player picked.
 */
export function getCharacterReactions(key: string, travelerElement?: string | null): CharacterReaction[] {
  if (isTraveler(key)) return (travelerElement && TRAVELER_REACTIONS[travelerElement]) || [];
  return REACTIONS[rosterKey(key)] ?? [];
}
