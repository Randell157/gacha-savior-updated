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

// Firestore layout for a user's Genshin upload:
//   users/{uid}/games/genshin                      everything except artifacts
//   users/{uid}/games/genshin/artifactChunks/{n}   { items: GoodArtifact[] }
// A large export has more artifacts than fit in one document (1 MiB limit),
// so they're split into numbered chunks.

export const SHOWCASE_SIZE = 5;
const ARTIFACTS_PER_CHUNK = 400;

export type Showcase = (string | null)[];

export interface StoredGenshin {
  data: GenshinData;
  showcase: Showcase;
  /** The element the player chose on the Traveler's page; the export doesn't say */
  travelerElement: string | null;
  uploadedAt: Date | null;
  /** Number of artifact chunks currently stored, used to clean up on re-upload */
  artifactChunkCount: number;
}

const gameRef = (uid: string) => doc(db, "users", uid, "games", "genshin");
const chunkRef = (uid: string, index: number) =>
  doc(db, "users", uid, "games", "genshin", "artifactChunks", String(index));

export const emptyShowcase = (): Showcase => Array(SHOWCASE_SIZE).fill(null);

function normalizeShowcase(value: unknown): Showcase {
  if (!Array.isArray(value) || value.length !== SHOWCASE_SIZE) return emptyShowcase();
  return value.map((key) => (typeof key === "string" ? key : null));
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
    showcase: normalizeShowcase(stored.showcase),
    travelerElement: typeof stored.travelerElement === "string" ? stored.travelerElement : null,
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
  showcase: Showcase,
  previousChunkCount: number,
  travelerElement: string | null = null
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
    showcase,
    travelerElement,
  });
  chunks.forEach((items, i) => batch.set(chunkRef(uid, i), { items }));
  for (let i = chunks.length; i < previousChunkCount; i++) {
    batch.delete(chunkRef(uid, i));
  }
  await batch.commit();

  return { data, showcase, travelerElement, uploadedAt: new Date(), artifactChunkCount: chunks.length };
}

export async function saveShowcase(uid: string, showcase: Showcase) {
  await updateDoc(gameRef(uid), { showcase });
}

export async function saveTravelerElement(uid: string, travelerElement: string) {
  await updateDoc(gameRef(uid), { travelerElement });
}
