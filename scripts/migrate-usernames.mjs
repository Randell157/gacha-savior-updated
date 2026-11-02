// One-time migration: lowercases the document IDs in `usernames`, so
// usernames are case-insensitive ("Zach" and "zach" are the same name).
// users/{uid}.username keeps each name as originally typed, for display.
//
//   npm run migrate:usernames               dry run against the real project
//   npm run migrate:usernames -- --apply    make the changes
//   npm run migrate:usernames:emu [-- --apply]   same, against the emulator
//
// Names that would collide between *different* accounts are never changed;
// they're listed so a person can decide which account keeps the name.

import { readFileSync } from "node:fs";
import { cert, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const apply = process.argv.includes("--apply");

function createApp() {
  if (process.env.FIRESTORE_EMULATOR_HOST) {
    const projectId = process.env.GCLOUD_PROJECT ?? "demo-gachasavior";
    console.log(`Using the Firestore emulator (${process.env.FIRESTORE_EMULATOR_HOST}, project ${projectId}).`);
    return initializeApp({ projectId });
  }
  const line = readFileSync(".env.local", "utf8")
    .split(/\r?\n/)
    .find((l) => l.startsWith("FIREBASE_SERVICE_ACCOUNT_KEY="));
  if (!line) throw new Error("FIREBASE_SERVICE_ACCOUNT_KEY is missing from .env.local");
  const key = JSON.parse(Buffer.from(line.slice(line.indexOf("=") + 1).trim(), "base64").toString("utf8"));
  console.log(`Using the live project ${key.project_id}.`);
  return initializeApp({ credential: cert(key) });
}

const db = getFirestore(createApp());
const snapshot = await db.collection("usernames").get();

// Group every document by the lowercase name it should end up as.
const groups = new Map();
for (const d of snapshot.docs) {
  const lower = d.id.toLowerCase();
  if (!groups.has(lower)) groups.set(lower, []);
  groups.get(lower).push({ id: d.id, uid: d.get("uid") });
}

const moves = []; // { from, to, uid }
const duplicates = []; // same account, extra spelling to delete
const conflicts = []; // different accounts want the same lowercase name

for (const [lower, docs] of groups) {
  if (docs.length === 1 && docs[0].id === lower) continue; // already fine
  const uids = new Set(docs.map((d) => d.uid));
  if (uids.size > 1) {
    conflicts.push({ lower, docs });
    continue;
  }
  const uid = docs[0].uid;
  const hasLower = docs.some((d) => d.id === lower);
  const others = docs.filter((d) => d.id !== lower);
  if (hasLower) {
    duplicates.push(...others.map((d) => ({ from: d.id, to: lower, uid })));
  } else {
    moves.push({ from: others[0].id, to: lower, uid });
    duplicates.push(...others.slice(1).map((d) => ({ from: d.id, to: lower, uid })));
  }
}

console.log(`\n${snapshot.size} usernames checked.`);
console.log(`  ${moves.length} to rename to lowercase`);
console.log(`  ${duplicates.length} extra spellings of the same account to remove`);
console.log(`  ${conflicts.length} conflicts between different accounts (left unchanged)`);

for (const m of moves) console.log(`  rename  "${m.from}" -> "${m.to}"`);
for (const d of duplicates) console.log(`  remove  "${d.from}" (same account as "${d.to}")`);
for (const c of conflicts) {
  const who = c.docs.map((d) => `"${d.id}" (uid ${String(d.uid).slice(0, 6)}...)`).join(", ");
  console.log(`  CONFLICT "${c.lower}": ${who}. Decide which account keeps this name.`);
}

if (!apply) {
  console.log("\nDry run only. Re-run with --apply to make these changes.");
  process.exit(0);
}

// Firestore batches hold up to 500 writes; each move is 2, each removal 1.
let batch = db.batch();
let writes = 0;
async function add(fn, count) {
  if (writes + count > 500) {
    await batch.commit();
    batch = db.batch();
    writes = 0;
  }
  fn(batch);
  writes += count;
}
for (const m of moves) {
  await add((b) => {
    b.create(db.collection("usernames").doc(m.to), { uid: m.uid });
    b.delete(db.collection("usernames").doc(m.from));
  }, 2);
}
for (const d of duplicates) {
  await add((b) => b.delete(db.collection("usernames").doc(d.from)), 1);
}
if (writes) await batch.commit();
console.log(`\nDone: ${moves.length} renamed, ${duplicates.length} removed.`);
