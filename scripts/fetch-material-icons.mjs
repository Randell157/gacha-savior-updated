// Downloads an icon for every material the material planner can list (those in
// src/data/genshin/materialCosts.json, plus the EXP books and ore) into
// public/material-icons/<id>.webp, where <id> is the material's export key
// (its name lowercased, letters and digits only). Icons are resized to 64 px,
// enough for the largest one shown (32 px) on high-density screens. The files
// are committed; rerun after `npm run data:genshin` adds materials:
//
//   npm run icons:materials            # only materials without an icon
//   npm run icons:materials -- --force # download them all again
//
// The game file name of each icon comes from genshin-db (or, for a material too
// new for its material list, the item ID in its cost lists). Enka.Network hosts
// most of the game's icons; Project Amber (gi.yatta.moe) covers the ones it lacks.

import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import sharp from "sharp";

const require = createRequire(import.meta.url);
const db = require("genshin-db");

const OUT = "public/material-icons";
const SIZE = 64;
const force = process.argv.includes("--force");
const normalize = (s) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

// Kept in step with CHARACTER_EXP_ITEMS and WEAPON_EXP_ITEMS in src/lib/genshin/materialPlanner.ts.
const EXP_ITEMS = [
  "Hero's Wit",
  "Adventurer's Experience",
  "Wanderer's Advice",
  "Mystic Enhancement Ore",
  "Fine Enhancement Ore",
  "Enhancement Ore",
];

const { materials } = JSON.parse(readFileSync("src/data/genshin/materialCosts.json", "utf8"));
const wanted = new Map(materials.map(([id, name]) => [id, name]));
for (const name of EXP_ITEMS) wanted.set(normalize(name), name);

// Item IDs from the cost lists, for materials genshin-db's material list doesn't
// have yet (new ones): their icon is named after the ID, UI_ItemIcon_<id>.
const costIds = new Map();
const collectIds = (costs) => {
  for (const step of Object.values(costs ?? {})) for (const { id, name } of step) costIds.set(name, id);
};
for (const name of db.characters("names", { matchCategories: true })) collectIds(db.characters(name)?.costs);
for (const name of db.talents("names", { matchCategories: true })) collectIds(db.talents(name)?.costs);
for (const name of db.weapons("names", { matchCategories: true })) collectIds(db.weapons(name)?.costs);

mkdirSync(OUT, { recursive: true });
let saved = 0;
let skipped = 0;
const failed = [];
for (const [id, name] of wanted) {
  const target = `${OUT}/${id}.webp`;
  if (!force && existsSync(target)) {
    skipped++;
    continue;
  }
  const itemId = costIds.get(name);
  const file = db.materials(name)?.images?.filename_icon ?? (itemId ? `UI_ItemIcon_${itemId}` : null);
  if (!file) {
    failed.push(`${name} (no icon or item ID in genshin-db)`);
    continue;
  }
  let image = null;
  for (const url of [`https://enka.network/ui/${file}.png`, `https://gi.yatta.moe/assets/UI/${file}.png`]) {
    const res = await fetch(url);
    if (res.ok && (res.headers.get("content-type") ?? "").startsWith("image/")) {
      image = Buffer.from(await res.arrayBuffer());
      break;
    }
  }
  if (!image) {
    failed.push(`${name} (${file})`);
    continue;
  }
  await sharp(image)
    .resize(SIZE, SIZE, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .webp({ quality: 85 })
    .toFile(target);
  saved++;
}

console.log(`Saved ${saved} material icons, ${skipped} already there.`);
if (failed.length) {
  console.log(`No icon for: ${failed.join(", ")}`);
  process.exitCode = 1;
}
