// Downloads an icon for every weapon in src/data/genshin/weapons.json into
// public/weapon-icons/<id>.webp, where <id> is the weapon's data key (its name
// lowercased, letters and digits only). Icons are resized to 160 px, enough
// for the largest one shown (72 px) on high-density screens. The files are
// committed; rerun after `npm run data:genshin` adds weapons:
//
//   npm run icons:weapons            # only weapons without an icon
//   npm run icons:weapons -- --force # download them all again
//
// The official HoYoLAB copy (linked from genshin-db) comes first; Enka.Network,
// which hosts the same game files, covers the few HoYoLAB links that are gone.

import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import sharp from "sharp";

const require = createRequire(import.meta.url);
const db = require("genshin-db");

const OUT = "public/weapon-icons";
const SIZE = 160;
const force = process.argv.includes("--force");
const normalize = (s) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

const { weapons } = JSON.parse(readFileSync("src/data/genshin/weapons.json", "utf8"));

// The game file name of each weapon's icon, e.g. "UI_EquipIcon_Bow_Amos".
const iconFile = new Map();
for (const name of db.weapons("names", { matchCategories: true })) {
  const weapon = db.weapons(name);
  const file = weapon?.images?.filename_icon;
  if (file && !iconFile.has(normalize(weapon.name))) iconFile.set(normalize(weapon.name), file);
}

mkdirSync(OUT, { recursive: true });
let saved = 0;
let skipped = 0;
const failed = [];
for (const [id, weapon] of Object.entries(weapons)) {
  const target = `${OUT}/${id}.webp`;
  if (!force && existsSync(target)) {
    skipped++;
    continue;
  }
  const file = iconFile.get(id);
  if (!file) {
    failed.push(`${weapon.name} (no icon in genshin-db)`);
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
    failed.push(`${weapon.name} (${file})`);
    continue;
  }
  await sharp(image).resize(SIZE, SIZE, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } }).webp({ quality: 85 }).toFile(target);
  saved++;
}

console.log(`Saved ${saved} weapon icons, ${skipped} already there.`);
if (failed.length) {
  console.log(`No icon for: ${failed.join(", ")}`);
  process.exitCode = 1;
}
