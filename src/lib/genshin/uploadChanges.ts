import { buildChanges, snapshotBuilds, type BuildChange } from "./showcaseBuild.ts";
import type { GenshinData, GoodArtifact } from "./types.ts";

// What changed between two uploads of the same account, for the summary shown
// once after an upload replaces an earlier one. Worked out in the browser from
// the data already loaded, so nothing extra is stored.

export interface CharacterChanges {
  key: string;
  changes: BuildChange[];
}

export interface CountedKey {
  key: string;
  count: number;
}

export interface ArtifactChanges {
  before: number;
  after: number;
  /** Pieces in the new upload that match nothing in the old one */
  added: number;
  /** Pieces in the old upload that match nothing in the new one (used up or deleted) */
  removed: number;
  /** Pieces found in both uploads at a higher level */
  leveled: number;
}

export interface UploadChanges {
  /** Characters owned now that weren't before, in the new upload's order */
  newCharacters: string[];
  /** Characters missing from the new upload (an export that left them out) */
  missingCharacters: string[];
  /** Characters in both uploads with level, constellation, talent, weapon or Total CV changes */
  characters: CharacterChanges[];
  /** Weapon keys with more copies now, and how many more */
  newWeapons: CountedKey[];
  /** Weapon keys with fewer copies now (used to refine or level), and how many fewer */
  removedWeapons: CountedKey[];
  artifacts: ArtifactChanges;
}

/** Counts how many of each key, keeping the order keys first appear in. */
function countKeys(keys: string[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const key of keys) counts.set(key, (counts.get(key) ?? 0) + 1);
  return counts;
}

function weaponDiff(before: string[], after: string[]): { added: CountedKey[]; removed: CountedKey[] } {
  const was = countKeys(before);
  const now = countKeys(after);
  const added: CountedKey[] = [];
  const removed: CountedKey[] = [];
  for (const [key, count] of now) {
    const diff = count - (was.get(key) ?? 0);
    if (diff > 0) added.push({ key, count: diff });
  }
  for (const [key, count] of was) {
    const diff = count - (now.get(key) ?? 0);
    if (diff > 0) removed.push({ key, count: diff });
  }
  return { added, removed };
}

/** Pieces that can only be the same piece share these; level and substats can still grow. */
function artifactGroup(a: GoodArtifact): string {
  return `${a.setKey}|${a.slotKey}|${a.rarity}|${a.mainStatKey ?? ""}`;
}

function sameArtifact(a: GoodArtifact, b: GoodArtifact): boolean {
  return (
    a.level === b.level &&
    a.substats.length === b.substats.length &&
    a.substats.every((s) => b.substats.some((t) => t.key === s.key && t.value === s.value))
  );
}

/** Could `before` have been leveled into `after`? Every old substat is still there, no lower. */
function leveledInto(before: GoodArtifact, after: GoodArtifact): boolean {
  return (
    after.level > before.level &&
    before.substats.every((s) => after.substats.some((t) => t.key === s.key && t.value >= s.value))
  );
}

/**
 * Matches the old upload's pieces to the new one's. GOOD has no artifact ids,
 * so a piece is matched by set, slot, rarity and main stat: first to an
 * identical piece, then to one it could have been leveled into.
 */
function artifactDiff(before: GoodArtifact[], after: GoodArtifact[]): ArtifactChanges {
  const groups = new Map<string, { was: GoodArtifact[]; now: GoodArtifact[] }>();
  const group = (key: string) => {
    let g = groups.get(key);
    if (!g) groups.set(key, (g = { was: [], now: [] }));
    return g;
  };
  for (const a of before) group(artifactGroup(a)).was.push(a);
  for (const a of after) group(artifactGroup(a)).now.push(a);

  let added = 0;
  let removed = 0;
  let leveled = 0;
  for (const { was, now } of groups.values()) {
    const unmatched = [...now];
    const leftOver: GoodArtifact[] = [];
    for (const old of was) {
      const i = unmatched.findIndex((a) => sameArtifact(old, a));
      if (i >= 0) unmatched.splice(i, 1);
      else leftOver.push(old);
    }
    // Lowest levels first, so a +0 piece doesn't take the match a +16 one needs.
    leftOver.sort((a, b) => a.level - b.level);
    for (const old of leftOver) {
      const i = unmatched.findIndex((a) => leveledInto(old, a));
      if (i >= 0) {
        unmatched.splice(i, 1);
        leveled++;
      } else {
        removed++;
      }
    }
    added += unmatched.length;
  }
  return { before: before.length, after: after.length, added, removed, leveled };
}

const isTravelerKey = (key: string | undefined) => !!key && /^Traveler/.test(key);

/**
 * Exports name the Traveler differently ("TravelerAnemo" in older GOOD files,
 * "Traveler" in newer ones), so the previous upload's Traveler takes the new
 * upload's key before comparing.
 */
function alignTraveler(previous: GenshinData, next: GenshinData): GenshinData {
  const key = next.characters.find((c) => isTravelerKey(c.key))?.key;
  if (!key) return previous;
  const rename = <T extends { location?: string }>(item: T): T =>
    isTravelerKey(item.location) ? { ...item, location: key } : item;
  return {
    ...previous,
    characters: previous.characters.map((c) => (isTravelerKey(c.key) ? { ...c, key } : c)),
    weapons: previous.weapons.map(rename),
    artifacts: previous.artifacts.map(rename),
  };
}

/** Everything that changed from the `previous` upload to `next`. */
export function uploadChanges(earlier: GenshinData, next: GenshinData): UploadChanges {
  const previous = alignTraveler(earlier, next);
  const snapshot = snapshotBuilds(previous);
  const nextKeys = new Set(next.characters.map((c) => c.key));
  const newCharacters: string[] = [];
  const characters: CharacterChanges[] = [];
  for (const char of next.characters) {
    if (!snapshot[char.key]) {
      newCharacters.push(char.key);
      continue;
    }
    const weapon = next.weapons.find((w) => w.location === char.key);
    const pieces = next.artifacts.filter((a) => a.location === char.key);
    const changes = buildChanges(snapshot, char, weapon, pieces);
    if (changes.length) characters.push({ key: char.key, changes });
  }
  const weapons = weaponDiff(
    previous.weapons.map((w) => w.key),
    next.weapons.map((w) => w.key)
  );
  return {
    newCharacters,
    missingCharacters: previous.characters.map((c) => c.key).filter((key) => !nextKeys.has(key)),
    characters,
    newWeapons: weapons.added,
    removedWeapons: weapons.removed,
    artifacts: artifactDiff(previous.artifacts, next.artifacts),
  };
}

/** True when the two uploads are the same as far as the summary can tell. */
export function noUploadChanges(changes: UploadChanges): boolean {
  const a = changes.artifacts;
  return (
    !changes.newCharacters.length &&
    !changes.missingCharacters.length &&
    !changes.characters.length &&
    !changes.newWeapons.length &&
    !changes.removedWeapons.length &&
    !a.added &&
    !a.removed &&
    !a.leveled
  );
}
