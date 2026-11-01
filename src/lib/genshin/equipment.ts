import type { GenshinData, GoodArtifact, GoodWeapon } from "./types";

export interface CharacterEquipment {
  weapon?: GoodWeapon;
  artifacts: GoodArtifact[];
}

/**
 * GOOD stores gear separately from characters: a weapon or artifact is
 * equipped when its `location` matches a character's `key`.
 */
export function buildEquipmentIndex(
  data: GenshinData
): Map<string, CharacterEquipment> {
  const index = new Map<string, CharacterEquipment>();
  for (const char of data.characters) {
    index.set(char.key, { artifacts: [] });
  }
  for (const weapon of data.weapons) {
    const entry = weapon.location && index.get(weapon.location);
    if (entry) entry.weapon = weapon;
  }
  for (const artifact of data.artifacts) {
    const entry = artifact.location && index.get(artifact.location);
    if (entry) entry.artifacts.push(artifact);
  }
  return index;
}
