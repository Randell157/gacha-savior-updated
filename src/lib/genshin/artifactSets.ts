import data from "@/data/genshin/artifactSets.json";
import type { GoodArtifact } from "@/lib/genshin/types";
import { compareVersions, formatArtifactSetDisplayName } from "@/lib/utils";

/** An artifact set's bonuses, from genshin-db via `npm run data:genshin`. */
export interface ArtifactSetInfo {
  name: string;
  /** Game version the set was released in, e.g. "4.3" */
  version: string | null;
  twoPiece: string | null;
  fourPiece: string | null;
}

const SETS: Record<string, ArtifactSetInfo> = data.sets;

/**
 * A set's id: its name lowercased with everything but letters and digits
 * removed, so a GOOD set key ("WanderersTroupe") matches the data
 * ("Wanderer's Troupe").
 */
export function artifactSetId(setKeyOrName: string): string {
  return setKeyOrName.toLowerCase().replace(/[^a-z0-9]/g, "");
}

export function getArtifactSet(setKey: string): ArtifactSetInfo | undefined {
  return SETS[artifactSetId(setKey)];
}

/**
 * A set's in-game name ("Emblem of Severed Fate"), falling back to the
 * spaced-out GOOD key for a set newer than the game data.
 */
export function artifactSetName(setKey: string): string {
  return getArtifactSet(setKey)?.name ?? formatArtifactSetDisplayName(setKey);
}

/**
 * A piece's icon from `npm run icons:artifacts` (its set's icon for that slot),
 * or null for a set newer than the game data.
 */
export function artifactIcon(setKey: string, slotKey: string): string | null {
  return getArtifactSet(setKey) ? `/artifact-icons/${artifactSetId(setKey)}-${slotKey}.webp` : null;
}

/** Compares game versions numerically, so "4.10" comes after "4.6". */

/** Every artifact set in the game data, newest release first, A–Z within a version. */
export const ALL_ARTIFACT_SETS: { id: string; name: string; version: string | null }[] =
  Object.entries(SETS)
    .map(([id, set]) => ({ id, name: set.name, version: set.version }))
    .sort(
      (a, b) =>
        compareVersions(b.version ?? "0", a.version ?? "0") || a.name.localeCompare(b.name)
    );

export interface ActiveSet {
  setKey: string;
  /** Pieces of this set the character wears */
  count: number;
  info: ArtifactSetInfo | undefined;
}

/**
 * Sets whose bonuses are active on a character: every set with two or more
 * pieces equipped. Two pieces give the 2-piece bonus; four or more give both
 * the 2-piece and 4-piece bonuses. Largest set first.
 */
export function activeSets(pieces: GoodArtifact[]): ActiveSet[] {
  const counts = new Map<string, number>();
  for (const piece of pieces) counts.set(piece.setKey, (counts.get(piece.setKey) ?? 0) + 1);
  return [...counts]
    .filter(([, count]) => count >= 2)
    .map(([setKey, count]) => ({ setKey, count, info: getArtifactSet(setKey) }))
    .sort((a, b) => b.count - a.count);
}
