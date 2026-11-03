import data from "@/data/genshin/characters.json";
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

export function getCharacterDetails(key: string): CharacterDetails | undefined {
  return CHARACTERS[rosterKey(key)];
}

/** The character's playstyle roles, e.g. ["Support", "Healer"]; empty when not set. */
export function getCharacterRoles(key: string): string[] {
  return ROLES.get(rosterKey(key)) ?? [];
}
