// Extracts the Genshin game data the site needs from `genshin-db` into small
// JSON files under src/data/genshin/, so the app never imports genshin-db
// itself (it's ~190 MB). The output is committed; rerun after a game patch:
//
//   npm run data:genshin
//
// Today it writes artifact set bonuses. Phase 4 adds characters and weapons.

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const db = require("genshin-db");
const { version } = require("genshin-db/package.json");

/** Same idea as normalizeCharacterKey: GOOD's "WanderersTroupe" matches "Wanderer's Troupe". */
const normalize = (s) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

const artifactSets = {};
for (const name of db.artifacts("names", { matchCategories: true })) {
  const set = db.artifacts(name);
  if (!set) continue;
  artifactSets[normalize(set.name)] = {
    name: set.name,
    // Game version the set was released in, e.g. "4.3".
    version: set.version ?? null,
    twoPiece: set.effect2Pc ?? null,
    fourPiece: set.effect4Pc ?? null,
  };
}

mkdirSync("src/data/genshin", { recursive: true });
writeFileSync(
  "src/data/genshin/artifactSets.json",
  JSON.stringify({ source: `genshin-db ${version}`, sets: artifactSets }, null, 2) + "\n"
);
console.log(`Wrote ${Object.keys(artifactSets).length} artifact sets (genshin-db ${version}).`);

// Report sets in the sample exports that the data doesn't cover.
const missing = new Set();
for (const file of [
  "public/sample-data/inventory-kamera/genshin_export_2026-02-11_12-16.json",
  "public/sample-data/inventory-kamera/genshinData_GOOD_2024_10_28_01_22.json",
]) {
  for (const a of JSON.parse(readFileSync(file, "utf8")).artifacts ?? []) {
    if (!artifactSets[normalize(a.setKey)]) missing.add(a.setKey);
  }
}
console.log(missing.size ? `Sample sets with no data: ${[...missing].join(", ")}` : "Every set in the sample exports is covered.");
