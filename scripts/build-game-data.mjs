// Extracts the Genshin game data the site needs from `genshin-db` into small
// JSON files under src/data/genshin/, so the app never imports genshin-db
// itself (it's ~190 MB). The output is committed; rerun after a game patch:
//
//   npm run data:genshin
//
// It writes artifact set bonuses and weapon names and rarities. Weapon icons
// are downloaded separately with `npm run icons:weapons`.

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

const weapons = {};
for (const name of db.weapons("names", { matchCategories: true })) {
  const weapon = db.weapons(name);
  if (!weapon) continue;
  weapons[normalize(weapon.name)] = {
    name: weapon.name,
    rarity: weapon.rarity,
    // "Sword", "Claymore", "Polearm", "Bow" or "Catalyst".
    type: weapon.weaponText,
    version: weapon.version ?? null,
  };
}
writeFileSync(
  "src/data/genshin/weapons.json",
  JSON.stringify({ source: `genshin-db ${version}`, weapons }, null, 2) + "\n"
);
console.log(`Wrote ${Object.keys(weapons).length} weapons.`);

// Report sets and weapons in the sample exports that the data doesn't cover.
const SAMPLE_EXPORTS = [
  "public/sample-data/inventory-kamera/genshin_export_2026-02-11_12-16.json",
  "public/sample-data/inventory-kamera/genshinData_GOOD_2024_10_28_01_22.json",
];
const missingSets = new Set();
const missingWeapons = new Set();
for (const file of SAMPLE_EXPORTS) {
  const data = JSON.parse(readFileSync(file, "utf8"));
  for (const a of data.artifacts ?? []) {
    if (!artifactSets[normalize(a.setKey)]) missingSets.add(a.setKey);
  }
  for (const w of data.weapons ?? []) {
    if (!weapons[normalize(w.key)]) missingWeapons.add(w.key);
  }
}
console.log(missingSets.size ? `Sample sets with no data: ${[...missingSets].join(", ")}` : "Every set in the sample exports is covered.");
console.log(missingWeapons.size ? `Sample weapons with no data: ${[...missingWeapons].join(", ")}` : "Every weapon in the sample exports is covered.");
