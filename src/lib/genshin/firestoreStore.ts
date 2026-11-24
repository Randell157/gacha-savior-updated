import {
  doc,
  getDoc,
  serverTimestamp,
  Timestamp,
  updateDoc,
  writeBatch,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { parseGood } from "./parseGood";
import type { GenshinData } from "./types";
import type { BuildSnapshot } from "./showcaseBuild";
import { normalizePlans, type SavedPlan } from "./materialPlanner";
import { normalizeFarmingTicks, type FarmingTicks } from "./farming";

// Firestore layout for a user's Genshin upload:
//   users/{uid}/games/genshin                      everything except artifacts
//   users/{uid}/games/genshin/artifactChunks/{n}   { items: GoodArtifact[] }
// A large export has more artifacts than fit in one document (1 MiB limit),
// so they're split into numbered chunks.

export const SHOWCASE_SIZE = 5;
const ARTIFACTS_PER_CHUNK = 400;

export type Showcase = (string | null)[];

/** One of the player's showcases: its title (shown on its tab) and its five slots. */
export interface NamedShowcase {
  title: string;
  picks: Showcase;
}
export const MAX_SHOWCASES = 5;
export const SHOWCASE_TITLE_MAX = 40;
export const DEFAULT_SHOWCASE_TITLE = "Showcase";

/** The showcase's two display settings, saved with the account. Both start off. */
export interface ShowcaseOptions {
  /** Tint each slot with its character's element */
  elementColors: boolean;
  /** Show each artifact's Crit Value under its icon */
  pieceCv: boolean;
}

export const DEFAULT_SHOWCASE_OPTIONS: ShowcaseOptions = { elementColors: false, pieceCv: false };

export interface StoredGenshin {
  data: GenshinData;
  /** At least one showcase; the first is the one the Your games card shows */
  showcases: NamedShowcase[];
  /** The previous upload's builds, for "Since your last upload"; null after the first upload */
  previousBuilds: BuildSnapshot | null;
  /** The element the player chose on the Traveler's page; the export doesn't say */
  travelerElement: string | null;
  showcaseOptions: ShowcaseOptions;
  /** The Planner tab's saved plans */
  plans: SavedPlan[];
  /** Today's farming list's ticks: the game day and the domains done; old ones read as none */
  farmingTicks: FarmingTicks | null;
  uploadedAt: Date | null;
  /** Number of artifact chunks currently stored, used to clean up on re-upload */
  artifactChunkCount: number;
}

const gameRef = (uid: string) => doc(db, "users", uid, "games", "genshin");
const chunkRef = (uid: string, index: number) =>
  doc(db, "users", uid, "games", "genshin", "artifactChunks", String(index));

export const emptyShowcase = (): Showcase => Array(SHOWCASE_SIZE).fill(null);
export const defaultShowcases = (): NamedShowcase[] => [
  { title: DEFAULT_SHOWCASE_TITLE, picks: emptyShowcase() },
];

function normalizeShowcase(value: unknown): Showcase {
  if (!Array.isArray(value) || value.length !== SHOWCASE_SIZE) return emptyShowcase();
  return value.map((key) => (typeof key === "string" ? key : null));
}

function normalizeShowcaseOptions(value: unknown): ShowcaseOptions {
  const stored = (value ?? {}) as Partial<Record<keyof ShowcaseOptions, unknown>>;
  return { elementColors: stored.elementColors === true, pieceCv: stored.pieceCv === true };
}

/**
 * The saved showcases, or the single unnamed `showcase` that uploads saved
 * before there could be several.
 */
function normalizeShowcases(value: unknown, legacy: unknown): NamedShowcase[] {
  if (Array.isArray(value) && value.length > 0) {
    return value.slice(0, MAX_SHOWCASES).map((entry) => {
      const title = typeof entry?.title === "string" ? entry.title.trim().slice(0, SHOWCASE_TITLE_MAX) : "";
      return { title: title || DEFAULT_SHOWCASE_TITLE, picks: normalizeShowcase(entry?.picks) };
    });
  }
  return [{ title: DEFAULT_SHOWCASE_TITLE, picks: normalizeShowcase(legacy) }];
}

function normalizeSnapshot(value: unknown): BuildSnapshot | null {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as BuildSnapshot) : null;
}

/** Loads the saved upload, or null if this user hasn't uploaded yet. */
export async function loadGenshin(uid: string): Promise<StoredGenshin | null> {
  const snapshot = await getDoc(gameRef(uid));
  if (!snapshot.exists()) return null;
  const stored = snapshot.data();

  const chunkCount = typeof stored.artifactChunkCount === "number" ? stored.artifactChunkCount : 0;
  const chunks = await Promise.all(
    Array.from({ length: chunkCount }, (_, i) => getDoc(chunkRef(uid, i)))
  );
  const artifacts = chunks.flatMap((chunk) => {
    const items = chunk.data()?.items;
    return Array.isArray(items) ? items : [];
  });

  // Run it back through the parser so the rest of the app can rely on the
  // same normalized shape as a fresh upload.
  const parsed = parseGood({
    format: "GOOD",
    version: stored.version,
    source: stored.source,
    characters: stored.characters,
    weapons: stored.weapons,
    artifacts,
    materials: stored.materials,
  });
  if (!parsed.ok) throw new Error(parsed.error);

  return {
    data: parsed.data,
    showcases: normalizeShowcases(stored.showcases, stored.showcase),
    previousBuilds: normalizeSnapshot(stored.previousBuilds),
    travelerElement: typeof stored.travelerElement === "string" ? stored.travelerElement : null,
    showcaseOptions: normalizeShowcaseOptions(stored.showcaseOptions),
    plans: normalizePlans(stored.plans),
    farmingTicks: normalizeFarmingTicks(stored.farmingTicks),
    uploadedAt: stored.uploadedAt instanceof Timestamp ? stored.uploadedAt.toDate() : null,
    artifactChunkCount: chunkCount,
  };
}

/**
 * Replaces the saved upload in a single batch, so readers never see half of
 * an upload. `previousChunkCount` lets stale chunks from a bigger earlier
 * upload be deleted.
 */
export async function saveGenshin(
  uid: string,
  data: GenshinData,
  showcases: NamedShowcase[],
  previousChunkCount: number,
  travelerElement: string | null = null,
  showcaseOptions: ShowcaseOptions = DEFAULT_SHOWCASE_OPTIONS,
  previousBuilds: BuildSnapshot | null = null,
  plans: SavedPlan[] = [],
  farmingTicks: FarmingTicks | null = null
): Promise<StoredGenshin> {
  const chunks: GenshinData["artifacts"][] = [];
  for (let i = 0; i < data.artifacts.length; i += ARTIFACTS_PER_CHUNK) {
    chunks.push(data.artifacts.slice(i, i + ARTIFACTS_PER_CHUNK));
  }

  const batch = writeBatch(db);
  batch.set(gameRef(uid), {
    format: data.format,
    version: data.version,
    source: data.source ?? null,
    uploadedAt: serverTimestamp(),
    counts: {
      characters: data.characters.length,
      weapons: data.weapons.length,
      artifacts: data.artifacts.length,
    },
    artifactChunkCount: chunks.length,
    characters: data.characters,
    weapons: data.weapons,
    materials: data.materials,
    showcases,
    travelerElement,
    showcaseOptions,
    previousBuilds,
    plans,
    farmingTicks,
  });
  chunks.forEach((items, i) => batch.set(chunkRef(uid, i), { items }));
  for (let i = chunks.length; i < previousChunkCount; i++) {
    batch.delete(chunkRef(uid, i));
  }
  await batch.commit();

  return {
    data,
    showcases,
    previousBuilds,
    travelerElement,
    showcaseOptions,
    plans,
    farmingTicks,
    uploadedAt: new Date(),
    artifactChunkCount: chunks.length,
  };
}

/** Deletes the saved upload, with its showcase, its settings, the Traveler element, the plans and the farming ticks. */
export async function deleteGenshin(uid: string, chunkCount: number) {
  const batch = writeBatch(db);
  batch.delete(gameRef(uid));
  for (let i = 0; i < chunkCount; i++) {
    batch.delete(chunkRef(uid, i));
  }
  await batch.commit();
}

export async function saveShowcases(uid: string, showcases: NamedShowcase[]) {
  await updateDoc(gameRef(uid), { showcases });
}

export async function saveShowcaseOptions(uid: string, showcaseOptions: ShowcaseOptions) {
  await updateDoc(gameRef(uid), { showcaseOptions });
}

export async function saveTravelerElement(uid: string, travelerElement: string) {
  await updateDoc(gameRef(uid), { travelerElement });
}

export async function savePlans(uid: string, plans: SavedPlan[]) {
  await updateDoc(gameRef(uid), { plans });
}

export async function saveFarmingTicks(uid: string, farmingTicks: FarmingTicks) {
  await updateDoc(gameRef(uid), { farmingTicks });
}
