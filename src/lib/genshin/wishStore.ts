import { doc, getDoc, serverTimestamp, Timestamp, writeBatch } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { chunkIds, pullsFromChunks, wishDocuments, type Pull, type WishMeta } from "./wishes";

// Firestore layout for a user's wish history, kept apart from the GOOD upload
// so deleting or replacing an upload never touches it:
//   users/{uid}/games/genshin/wishes/meta         { gameUid, lastImportedAt, totals, chunks }
//   users/{uid}/games/genshin/wishes/{pool}_{n}   { items: Pull[] }, at most 2,000 each

export interface StoredWishes {
  gameUid: string;
  pulls: Pull[];
  lastImportedAt: Date | null;
  /** Chunks per pool as saved, used to delete stale ones on the next save. */
  chunks: WishMeta["chunks"];
}

const wishRef = (uid: string, id: string) => doc(db, "users", uid, "games", "genshin", "wishes", id);

/** Loads the saved wish history, or null before the first import. */
export async function loadWishes(uid: string): Promise<StoredWishes | null> {
  const snapshot = await getDoc(wishRef(uid, "meta"));
  if (!snapshot.exists()) return null;
  const meta = snapshot.data();
  const chunks: WishMeta["chunks"] = typeof meta.chunks === "object" && meta.chunks ? meta.chunks : {};
  const docs = await Promise.all(chunkIds(chunks).map((id) => getDoc(wishRef(uid, id))));
  return {
    gameUid: typeof meta.gameUid === "string" ? meta.gameUid : "",
    pulls: pullsFromChunks(docs.map((d) => d.data()?.items)),
    lastImportedAt: meta.lastImportedAt instanceof Timestamp ? meta.lastImportedAt.toDate() : null,
    chunks,
  };
}

/**
 * Saves a whole (already merged) history in one batch, so a reader never sees
 * half of it, and deletes chunks left over from an earlier save.
 */
export async function saveWishes(
  uid: string,
  gameUid: string,
  pulls: Pull[],
  previousChunks: WishMeta["chunks"] = {}
): Promise<StoredWishes> {
  const { meta, chunks } = wishDocuments(gameUid, pulls);
  const batch = writeBatch(db);
  batch.set(wishRef(uid, "meta"), { ...meta, lastImportedAt: serverTimestamp() });
  for (const chunk of chunks) batch.set(wishRef(uid, chunk.id), { items: chunk.items });
  const keep = new Set(chunks.map((c) => c.id));
  for (const id of chunkIds(previousChunks)) if (!keep.has(id)) batch.delete(wishRef(uid, id));
  await batch.commit();
  return { gameUid, pulls: pullsFromChunks(chunks.map((c) => c.items)), lastImportedAt: new Date(), chunks: meta.chunks };
}

/** Deletes the whole wish history. */
export async function deleteWishes(uid: string, chunks: WishMeta["chunks"]) {
  const batch = writeBatch(db);
  batch.delete(wishRef(uid, "meta"));
  for (const id of chunkIds(chunks)) batch.delete(wishRef(uid, id));
  await batch.commit();
}
