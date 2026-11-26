import { critValue, isCritCirclet, roundCv } from "./artifactScore.ts";
import { artifactGroup, leveledInto, sameArtifact } from "./uploadChanges.ts";
import type { GoodArtifact, GoodSubstat } from "./types.ts";

// Artifact cleanup (Phase 7 step 2): pieces that are likely safe to feed or
// throw away, each with the plain fact that put it on the list, never a verdict
// on what a character needs. Locked and kept pieces are never listed. Nothing is
// deleted: the data comes from the export.

export type CleanupReason = "beaten" | "weakStart" | "lowRarity";

export interface CleanupEntry {
  /** Index of the piece in the upload's `artifacts` */
  index: number;
  artifact: GoodArtifact;
  /** Every rule the piece meets, in the order of `CleanupReason` */
  reasons: CleanupReason[];
  /** For "beaten": the index of the best piece that beats it (highest CV, then highest level) */
  beatenBy?: number;
}

/** How many of the piece's substats are CRIT Rate or CRIT DMG. */
export const critLines = (artifact: GoodArtifact) =>
  artifact.substats.filter((s) => s.key === "critRate_" || s.key === "critDMG_").length;

/**
 * A level 0 piece that starts with at most one CRIT substat. Counted by lines,
 * not CV, so it holds for every rarity (two 4★ CRIT lines can start under 10
 * CV). A CRIT circlet can roll only the other CRIT stat, so it counts as weak
 * only with no CRIT substat at all.
 */
export function isWeakStart(artifact: GoodArtifact): boolean {
  if (artifact.level !== 0) return false;
  return critLines(artifact) < (isCritCirclet(artifact) ? 1 : 2);
}

/** 4★ and below, often kept only as fodder. */
export const isLowRarity = (artifact: GoodArtifact) => artifact.rarity <= 4;

/**
 * The pieces cleanup lists. `kept` holds indices of pieces with a Keep mark
 * (from `matchKeepMarks`); they and locked pieces are left out. Equipped pieces
 * are listed, and their `location` names the wearer.
 *
 * "Beaten" compares every piece owned, listed or not: another piece of the same
 * set, slot, main stat and rarity at least as high a level with more CV. Only
 * pieces with a CRIT substat can be beaten, since CV is all it compares.
 */
export function cleanupList(artifacts: GoodArtifact[], kept: ReadonlySet<number> = new Set()): CleanupEntry[] {
  const cvs = artifacts.map((a) => critValue(a));
  const groups = new Map<string, number[]>();
  artifacts.forEach((a, i) => {
    const key = artifactGroup(a);
    const list = groups.get(key);
    if (list) list.push(i);
    else groups.set(key, [i]);
  });

  const entries: CleanupEntry[] = [];
  artifacts.forEach((artifact, index) => {
    if (artifact.lock || kept.has(index)) return;
    let beatenBy: number | undefined;
    // A piece with no CRIT substat was built for other stats (ER, EM, HP or DEF
    // on a support), so more CV elsewhere says nothing about it.
    const comparable = critLines(artifact) > 0;
    for (const j of comparable ? groups.get(artifactGroup(artifact))! : []) {
      const other = artifacts[j];
      if (j === index || other.level < artifact.level || cvs[j] <= cvs[index]) continue;
      if (
        beatenBy === undefined ||
        cvs[j] > cvs[beatenBy] ||
        (cvs[j] === cvs[beatenBy] && other.level > artifacts[beatenBy].level)
      ) {
        beatenBy = j;
      }
    }
    const reasons: CleanupReason[] = [];
    if (beatenBy !== undefined) reasons.push("beaten");
    if (isWeakStart(artifact)) reasons.push("weakStart");
    if (isLowRarity(artifact)) reasons.push("lowRarity");
    if (!reasons.length) return;
    entries.push(beatenBy === undefined ? { index, artifact, reasons } : { index, artifact, reasons, beatenBy });
  });
  return entries;
}

// ---- Worth leveling? ----

/**
 * A 5★ piece's possible CRIT rolls (the game's four tiers). Each roll adds one
 * of these to the substat; CV counts CRIT Rate twice.
 */
export const CRIT_ROLLS_5 = {
  critRate_: [2.72, 3.11, 3.5, 3.89],
  critDMG_: [5.44, 6.22, 6.99, 7.77],
} as const;

type CritKey = keyof typeof CRIT_ROLLS_5;
const CRIT_KEYS: CritKey[] = ["critRate_", "critDMG_"];

/** The most CV one roll can add to this substat. */
const bestRollCv = (key: CritKey) => Math.max(...CRIT_ROLLS_5[key]) * (key === "critRate_" ? 2 : 1);

export interface LevelingRange {
  /** Total CV now */
  now: number;
  /** The lowest Total CV it can end with at +20 (every roll missing CRIT) */
  min: number;
  /** The highest (every roll landing on CRIT at the top tier) */
  max: number;
  /** Upgrades left before +20 (one at each of +4, +8, +12, +16 and +20) */
  upgradesLeft: number;
}

/**
 * For a 5★ piece below +20: the Total CV it could still end with at +20, from
 * its substats now, the upgrades it has left, and the game's roll values. A
 * piece with fewer than four lines spends its next upgrade on a new line, which
 * can be a CRIT stat it doesn't have yet (and that isn't its main stat).
 * Plain math, not a prediction. Null for other rarities and maxed pieces.
 */
export function levelingRange(artifact: GoodArtifact): LevelingRange | null {
  if (artifact.rarity !== 5 || artifact.level >= 20) return null;
  const now = critValue(artifact);
  const upgradesLeft = 5 - Math.floor(artifact.level / 4);
  const has = new Set<string>(artifact.substats.map((s: GoodSubstat) => s.key));
  let lines = artifact.substats.length;
  let gain = 0;
  for (let i = 0; i < upgradesLeft; i++) {
    if (lines < 4) {
      // A new line: the best CRIT stat it can still gain, or a non-CRIT one.
      lines++;
      const open = CRIT_KEYS.filter((k) => !has.has(k) && artifact.mainStatKey !== k);
      if (open.length) {
        const best = open.reduce((a, b) => (bestRollCv(b) > bestRollCv(a) ? b : a));
        has.add(best);
        gain += bestRollCv(best);
      }
      continue;
    }
    const owned = CRIT_KEYS.filter((k) => has.has(k));
    if (owned.length) gain += Math.max(...owned.map(bestRollCv));
  }
  // A missed roll still lands on some line, and a new line can always be a
  // non-CRIT stat, so the low end is today's CV.
  return { now, min: now, max: roundCv(now + gain), upgradesLeft };
}

// ---- Keep marks ----

/**
 * A piece marked "Keep" on the site. GOOD has no artifact ids, so the mark
 * holds what identifies the piece and is matched again after each upload.
 */
export type KeepMark = Pick<GoodArtifact, "setKey" | "slotKey" | "rarity" | "mainStatKey" | "level" | "substats">;

/**
 * At most this many marks, so the Genshin document stays well under
 * Firestore's 1 MiB (a mark is about 200 bytes).
 */
export const MAX_KEEP_MARKS = 1000;

/** The mark for a piece, without where it's equipped or its lock. */
export function keepMarkFor(artifact: GoodArtifact): KeepMark {
  const mark: KeepMark = {
    setKey: artifact.setKey,
    slotKey: artifact.slotKey,
    rarity: artifact.rarity,
    level: artifact.level,
    substats: artifact.substats.map(({ key, value }) => ({ key, value })),
  };
  if (artifact.mainStatKey !== undefined) mark.mainStatKey = artifact.mainStatKey;
  return mark;
}

export interface KeepMatch {
  /** Indices of the upload's pieces that have a Keep mark */
  kept: Set<number>;
  /** The marks that found their piece, updated to it (so they follow it as it levels), in the old order */
  marks: KeepMark[];
  /** Marks whose piece is gone (used up, deleted, or changed past recognizing) */
  dropped: number;
}

/**
 * Matches saved marks to an upload's pieces the way upload changes match
 * artifacts: by set, slot, rarity and main stat, first to an identical piece,
 * then to one it could have been leveled into (so a +0 mark doesn't take the
 * piece a +16 one needs, see below). Each piece takes one mark.
 */
export function matchKeepMarks(marks: readonly KeepMark[], artifacts: GoodArtifact[]): KeepMatch {
  const byGroup = new Map<string, number[]>();
  artifacts.forEach((a, i) => {
    const key = artifactGroup(a);
    const list = byGroup.get(key);
    if (list) list.push(i);
    else byGroup.set(key, [i]);
  });
  const taken = new Set<number>();
  const found: (number | undefined)[] = marks.map(() => undefined);
  // The lowest level first. Between pieces at the same level, an unlocked one,
  // since a locked twin is never listed anyway and the mark is there to hide the
  // unlocked one.
  const better = (a: GoodArtifact, b: GoodArtifact) =>
    a.level !== b.level ? a.level < b.level : !a.lock && !!b.lock;

  // The pieces a mark fits that no earlier pass took, best first.
  const candidatesFor = (m: number, fits: (mark: KeepMark, piece: GoodArtifact) => boolean) =>
    (byGroup.get(artifactGroup(marks[m] as GoodArtifact)) ?? [])
      .filter((c) => !taken.has(c) && fits(marks[m], artifacts[c]))
      .sort((a, b) => (better(artifacts[a], artifacts[b]) ? -1 : better(artifacts[b], artifacts[a]) ? 1 : a - b));

  // Identical pieces first: look-alikes are interchangeable, so the first that fits will do.
  const all = marks.map((_, m) => m);
  for (const m of all) {
    const [c] = candidatesFor(m, (mark, piece) => sameArtifact(mark as GoodArtifact, piece));
    if (c !== undefined) {
      taken.add(c);
      found[m] = c;
    }
  }

  // Then leveled pieces, highest marks first, each to the best piece it fits. If
  // that piece is already held by another mark that has somewhere else to go,
  // that mark moves (an augmenting path), so no mark is dropped while a piece for
  // it exists: a +0 mark fits almost anything, a +16 mark only pieces at +20.
  const fitsLeveled = (mark: KeepMark, piece: GoodArtifact) => leveledInto(mark as GoodArtifact, piece);
  const options = new Map<number, number[]>();
  const holder = new Map<number, number>();
  const place = (m: number, seen: Set<number>): boolean => {
    for (const c of options.get(m)!) {
      if (seen.has(c)) continue;
      seen.add(c);
      const other = holder.get(c);
      if (other === undefined || place(other, seen)) {
        holder.set(c, m);
        found[m] = c;
        return true;
      }
    }
    return false;
  };
  for (const m of [...all].sort((a, b) => marks[b].level - marks[a].level)) {
    if (found[m] !== undefined) continue;
    options.set(m, candidatesFor(m, fitsLeveled));
    place(m, new Set());
  }

  const kept = new Set<number>();
  const updated: KeepMark[] = [];
  let dropped = 0;
  found.forEach((i) => {
    if (i === undefined) {
      dropped++;
      return;
    }
    kept.add(i);
    updated.push(keepMarkFor(artifacts[i]));
  });
  return { kept, marks: updated, dropped };
}

/**
 * Adds a mark for `artifacts[index]`, or removes the one that matches it. Marks
 * whose piece is gone are left out, and nothing is added past `MAX_KEEP_MARKS`.
 */
export function toggleKeepMark(marks: readonly KeepMark[], artifacts: GoodArtifact[], index: number): KeepMark[] {
  const { kept, marks: matched } = matchKeepMarks(marks, artifacts);
  if (!kept.has(index)) {
    return matched.length >= MAX_KEEP_MARKS ? matched : [...matched, keepMarkFor(artifacts[index])];
  }
  // Rebuild from the pieces that stay kept, so the right mark goes when two look alike.
  return [...kept].filter((i) => i !== index).sort((a, b) => a - b).map((i) => keepMarkFor(artifacts[i]));
}

/** Reads saved marks back from Firestore, skipping anything malformed. */
export function readKeepMarks(raw: unknown): KeepMark[] {
  if (!Array.isArray(raw)) return [];
  const marks: KeepMark[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const m = item as Record<string, unknown>;
    if (
      typeof m.setKey !== "string" ||
      typeof m.slotKey !== "string" ||
      typeof m.rarity !== "number" ||
      typeof m.level !== "number" ||
      !Array.isArray(m.substats) ||
      (m.mainStatKey !== undefined && typeof m.mainStatKey !== "string")
    ) {
      continue;
    }
    const substats = m.substats.filter(
      (s): s is GoodSubstat =>
        !!s && typeof s === "object" && typeof (s as GoodSubstat).key === "string" && typeof (s as GoodSubstat).value === "number"
    );
    marks.push(keepMarkFor({ ...(m as unknown as GoodArtifact), substats }));
  }
  return marks.slice(0, MAX_KEEP_MARKS);
}
