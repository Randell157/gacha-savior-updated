// Downloads the icon of every piece of every set in src/data/genshin/artifactSets.json
// into public/artifact-icons/<setId>-<slot>.webp, where <setId> is the set's data
// key and <slot> is the GOOD slot key (flower, plume, sands, goblet, circlet).
// Some sets only have some slots (the Prayers sets are circlets only). Icons are
// resized to 160 px. The files are committed; rerun after `npm run data:genshin`
// adds sets:
//
//   npm run icons:artifacts            # only pieces without an icon
//   npm run icons:artifacts -- --force # download them all again
//
// Like icons:weapons, the official HoYoLAB copy comes first and Enka.Network
// covers any HoYoLAB link that is gone.

import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import sharp from "sharp";

const require = createRequire(import.meta.url);
const db = require("genshin-db");

const OUT = "public/artifact-icons";
const SIZE = 160;
const SLOTS = ["flower", "plume", "sands", "goblet", "circlet"];
const force = process.argv.includes("--force");
const normalize = (s) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

const { sets } = JSON.parse(readFileSync("src/data/genshin/artifactSets.json", "utf8"));

// The game file names of each set's piece icons, e.g. "UI_RelicIcon_15042_4".
const images = new Map();
for (const name of db.artifacts("names", { matchCategories: true })) {
  const set = db.artifacts(name);
  if (set?.images) images.set(normalize(set.name), set.images);
}

mkdirSync(OUT, { recursive: true });
let saved = 0;
let skipped = 0;
const failed = [];
for (const [id, set] of Object.entries(sets)) {
  for (const slot of SLOTS) {
    const file = images.get(id)?.[`filename_${slot}`];
    if (!file) continue; // the set has no piece in this slot
    const target = `${OUT}/${id}-${slot}.webp`;
    if (!force && existsSync(target)) {
      skipped++;
      continue;
    }
    let image = null;
    for (const url of [
      `https://upload-os-bbs.mihoyo.com/game_record/genshin/equip/${file}.png`,
      `https://enka.network/ui/${file}.png`,
    ]) {
      const res = await fetch(url);
      if (res.ok) {
        image = Buffer.from(await res.arrayBuffer());
        break;
      }
    }
    if (!image) {
      failed.push(`${set.name} ${slot} (${file})`);
      continue;
    }
    await sharp(image).resize(SIZE, SIZE, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } }).webp({ quality: 85 }).toFile(target);
    saved++;
  }
}

console.log(`Saved ${saved} artifact icons, ${skipped} already there.`);
if (failed.length) {
  console.log(`No icon for: ${failed.join(", ")}`);
  process.exitCode = 1;
}
