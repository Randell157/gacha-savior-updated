// Downloads each character's splash art (the "Avatar" picture in the Gallery
// section of their HoYoLAB wiki page) into public/character-splash/<key>.webp,
// with its empty see-through edges cropped away and scaled to fit SIZE px, and lists the ones saved in
// src/data/genshin/splashArt.json for the character page. Keys are those of
// src/data/genshin/characters.json. The files are committed; rerun after
// `npm run data:genshin` adds characters:
//
//   npm run images:splash            # only characters without splash art
//   npm run images:splash -- --force # download them all again
//
// The wiki's own page API is public and needs no sign-in. HoYoverse's image
// server sends the art as WebP; sharp scales it down.

import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, unlinkSync, writeFileSync } from "node:fs";
import sharp from "sharp";

const OUT = "public/character-splash";
const LIST = "src/data/genshin/splashArt.json";
// The longer side, after cropping. 1,024 px keeps all ~125 files near 22 MB.
const SIZE = 1024;
// Pixels at least this opaque (of 255) count as picture; fainter specks at the
// edges are left out. A margin of 2% of the picture's longer side stays around it.
const ALPHA = 24;
const MARGIN = 0.02;

/**
 * The box around the visible picture, so the empty see-through edges many
 * splash arts have (over half of Alyosha's) don't make the character small.
 */
async function pictureBounds(input) {
  const { data, info } = await sharp(input).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;
  let left = width, top = height, right = -1, bottom = -1;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (data[(y * width + x) * channels + 3] < ALPHA) continue;
      if (x < left) left = x;
      if (x > right) right = x;
      if (y < top) top = y;
      if (y > bottom) bottom = y;
    }
  }
  if (right < 0) return { left: 0, top: 0, width, height };
  const pad = Math.round(Math.max(right - left, bottom - top) * MARGIN);
  left = Math.max(0, left - pad);
  top = Math.max(0, top - pad);
  right = Math.min(width - 1, right + pad);
  bottom = Math.min(height - 1, bottom + pad);
  return { left, top, width: right - left + 1, height: bottom - top + 1 };
}
const force = process.argv.includes("--force");
const normalize = (s) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
const API = "https://sg-wiki-api.hoyolab.com/hoyowiki/genshin/wapi";
const STATIC_API = "https://sg-wiki-api-static.hoyolab.com/hoyowiki/genshin/wapi";
const HEADERS = { "x-rpc-language": "en-us", Referer: "https://wiki.hoyolab.com/" };

// Wiki names that don't match the roster's key once normalized.
// genshin-db calls the Wonderland Manekin "Manekin"; the wiki also has
// "Manekina", the other body type, which the roster doesn't list apart.
const NAME_OVERRIDES = { Manekin: "WonderlandManekin" };

const { characters } = JSON.parse(readFileSync("src/data/genshin/characters.json", "utf8"));
const rosterKeys = new Map(Object.keys(characters).map((key) => [normalize(key), key]));

async function json(url, init) {
  const res = await fetch(url, { ...init, headers: { ...HEADERS, ...init?.headers } });
  if (!res.ok) throw new Error(`${res.status} from ${url}`);
  const body = await res.json();
  if (body.retcode !== 0) throw new Error(`${body.message} from ${url}`);
  return body.data;
}

// Every character entry on the wiki (menu 2), 50 at a time.
const entries = [];
for (let page = 1; ; page++) {
  const data = await json(`${API}/get_entry_page_list`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ filters: [], menu_id: "2", page_num: page, page_size: 50, use_es: true }),
  });
  entries.push(...data.list);
  if (entries.length >= data.total || data.list.length === 0) break;
}

const saved = existsSync(LIST) ? JSON.parse(readFileSync(LIST, "utf8")) : {};
mkdirSync(OUT, { recursive: true });
let downloaded = 0;
let skipped = 0;
const notOnRoster = [];
const failed = [];
for (const entry of entries) {
  const key = rosterKeys.get(normalize(NAME_OVERRIDES[entry.name] ?? entry.name));
  if (!key) {
    notOnRoster.push(entry.name);
    continue;
  }
  if (!force && saved[key] && existsSync(`${OUT}/${saved[key]}`)) {
    skipped++;
    continue;
  }
  try {
    const { page } = await json(`${STATIC_API}/entry_page?entry_page_id=${entry.entry_page_id}`);
    const gallery = page.modules
      .flatMap((m) => m.components ?? [])
      .find((c) => c.component_id === "gallery_character");
    const avatar = gallery && JSON.parse(gallery.data).list?.find((item) => item.key === "Avatar");
    if (!avatar?.img) {
      failed.push(`${entry.name} (no Avatar picture in the wiki's gallery)`);
      continue;
    }
    const res = await fetch(`${avatar.img}?x-oss-process=image%2Fformat%2Cwebp`);
    if (!res.ok) throw new Error(`${res.status} for the picture`);
    const full = Buffer.from(await res.arrayBuffer());
    const image = await sharp(full)
      .extract(await pictureBounds(full))
      .resize({ width: SIZE, height: SIZE, fit: "inside", withoutEnlargement: true })
      .webp({ quality: 78 })
      .toBuffer();
    // The name carries a fingerprint of the picture: /_next/image caches by
    // address, so a new picture under an old name would keep showing the old one.
    const file = `${key}-${createHash("sha1").update(image).digest("hex").slice(0, 8)}.webp`;
    writeFileSync(`${OUT}/${file}`, image);
    if (saved[key] && saved[key] !== file && existsSync(`${OUT}/${saved[key]}`)) unlinkSync(`${OUT}/${saved[key]}`);
    saved[key] = file;
    downloaded++;
  } catch (error) {
    failed.push(`${entry.name} (${error.message})`);
  }
}

const sorted = Object.fromEntries(Object.entries(saved).sort(([a], [b]) => a.localeCompare(b)));
writeFileSync(LIST, JSON.stringify(sorted, null, 2) + "\n");
// Files no character points to any more (older names) are removed.
const listed = new Set(Object.values(sorted));
for (const file of readdirSync(OUT)) if (!listed.has(file)) unlinkSync(`${OUT}/${file}`);
const bytes = Object.values(sorted).reduce((sum, file) => sum + statSync(`${OUT}/${file}`).size, 0);
const missing = [...rosterKeys.values()].filter((key) => !sorted[key]);

console.log(`Saved ${downloaded} splash arts, ${skipped} already there; ${Object.keys(sorted).length} in all, ${(bytes / 1048576).toFixed(1)} MB.`);
if (notOnRoster.length) console.log(`On the wiki but not the roster: ${notOnRoster.join(", ")}`);
if (missing.length) console.log(`Roster characters without splash art: ${missing.join(", ")}`);
if (failed.length) {
  console.log(`Failed: ${failed.join("; ")}`);
  process.exitCode = 1;
}
