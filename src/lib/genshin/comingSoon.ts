/**
 * Characters HoYoverse has announced for the next update, shown in a strip
 * above the roster with only their portrait, name and version. Hand-written,
 * not game data: the user gives the names and portraits when they're
 * announced. Portraits go in `public/character-portraits/` like the others.
 *
 * When the update is out and the character is added to `GENSHIN_CHARACTERS`,
 * it drops out of the strip on its own (see `upcomingCharacters`); remove its
 * entry here in the same change.
 */
export type ComingSoonCharacter = {
  name: string;
  iconFile: string;
  version: string;
};

export const COMING_SOON: ComingSoonCharacter[] = [
  { name: "Anastasya", iconFile: "Anastasya_Icon.png", version: "7.3" },
  { name: "Danica", iconFile: "Danica_Icon.png", version: "7.3" },
];

const normalize = (key: string) => key.toLowerCase().replace(/[\s_'-]/g, "");

/**
 * The announced characters that aren't on the roster yet, grouped by version
 * in the order given. `rosterKeys` are the roster's keys, matched the way
 * `normalizeCharacterKey` matches them.
 */
export function upcomingCharacters(
  list: ComingSoonCharacter[],
  rosterKeys: Iterable<string>
): { version: string; characters: ComingSoonCharacter[] }[] {
  const known = new Set(Array.from(rosterKeys, normalize));
  const groups = new Map<string, ComingSoonCharacter[]>();
  for (const character of list) {
    if (known.has(normalize(character.name))) continue;
    const group = groups.get(character.version) ?? [];
    group.push(character);
    groups.set(character.version, group);
  }
  return Array.from(groups, ([version, characters]) => ({ version, characters }));
}
