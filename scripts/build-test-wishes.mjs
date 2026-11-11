// Writes made-up UIGF v4 wish history exports for testing the wish tracker:
// about two and a half years of pulls on every banner, with soft pity, the
// 50/50 on Character Event banners and the 75/25 on Weapon Event banners.
// The game only shows six months of history, so it writes two exports the way
// a player would get them: `wishes-older.json` up to mid-2025 and
// `wishes-newer.json` for the six months after that plus the six before, so
// the two overlap. It also writes the older pulls as a paimon.moe Excel export,
// `wishes-paimon.xlsx`, with no ids, as paimon.moe has none. Random choices are seeded, so the output only changes when
// this script or the game data does. Run with `npm run data:test-wishes`.

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { crc32, deflateRawSync } from "node:zlib";

const OUT_DIR = "public/sample-data/test-account";
const UID = "800000001";
const SPLIT = "2025-07-01"; // the older export ends here
const NEWER_FROM = "2025-01-01"; // the newer one starts here, six months earlier

const items = JSON.parse(readFileSync("src/data/genshin/wishItems.json", "utf8")).items;
const entries = Object.entries(items).map(([itemId, item]) => ({ itemId, ...item }));
const byName = (name) => {
  const item = entries.find((e) => e.name === name);
  if (!item) throw new Error(`No wish item named ${name}`);
  return item;
};

// Keep in step with STANDARD_FIVE_STARS in src/lib/genshin/wishes.ts.
const STANDARD_CHARACTERS = ["Diluc", "Jean", "Keqing", "Mona", "Qiqi", "Tighnari", "Dehya"].map(byName);
const STANDARD_WEAPONS = [
  "Amos' Bow", "Skyward Harp", "Lost Prayer to the Sacred Winds", "Skyward Atlas", "Aquila Favonia",
  "Skyward Blade", "Wolf's Gravestone", "Skyward Pride", "Primordial Jade Winged-Spear", "Skyward Spine",
].map(byName);
const NOT_ON_BANNERS = new Set(["Aether", "Lumine", "Aloy", "Manekin", "Manekina", "Yumemizuki Mizuki"]);
const FEATURED_CHARACTERS = entries.filter(
  (e) => e.type === "Character" && e.rarity === 5 && !NOT_ON_BANNERS.has(e.name) && !STANDARD_CHARACTERS.includes(e)
);
const FEATURED_WEAPONS = entries.filter((e) => e.type === "Weapon" && e.rarity === 5 && !STANDARD_WEAPONS.includes(e));
const FOUR_STARS = entries.filter((e) => e.rarity === 4 && !NOT_ON_BANNERS.has(e.name));
const THREE_STARS = entries.filter((e) => e.rarity === 3 && e.type === "Weapon");

// Mulberry32: small, and the same on every run.
let seed = 5;
function random() {
  seed = (seed + 0x6d2b79f5) | 0;
  let t = seed;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
const pick = (list) => list[Math.floor(random() * list.length)];

// Rates by pity, close to the community's measured numbers.
const RATES = {
  character: { base5: 0.006, soft5: 74, step5: 0.06, base4: 0.051, soft4: 9, step4: 0.51 },
  weapon: { base5: 0.007, soft5: 63, step5: 0.07, base4: 0.06, soft4: 8, step4: 0.6 },
};
RATES.standard = RATES.character;
RATES.chronicled = RATES.character;

const POOL_GACHA_TYPE = { character: "301", weapon: "302", standard: "200", chronicled: "500", beginner: "100" };
const state = Object.fromEntries(Object.keys(POOL_GACHA_TYPE).map((p) => [p, { pity5: 0, pity4: 0, lost: false }]));

let nextId = BigInt("1704067200000000000");
const pulls = [];

function record(pool, item, time, wish2 = false) {
  nextId += BigInt(1 + Math.floor(random() * 900));
  const gachaType = pool === "character" && wish2 ? "400" : POOL_GACHA_TYPE[pool];
  pulls.push({
    uigf_gacha_type: POOL_GACHA_TYPE[pool],
    gacha_type: gachaType,
    item_id: item.itemId,
    count: "1",
    time,
    name: item.name,
    item_type: item.type,
    rank_type: String(item.rarity),
    id: String(nextId),
  });
}

function fiveStar(pool, featured) {
  const s = state[pool];
  if (pool === "character") {
    const win = s.lost || random() < 0.5;
    s.lost = !win;
    return win ? featured.character : pick(STANDARD_CHARACTERS);
  }
  if (pool === "weapon") return random() < 0.75 ? pick(featured.weapons) : pick(STANDARD_WEAPONS);
  if (pool === "chronicled") return pick([...STANDARD_CHARACTERS, ...STANDARD_WEAPONS]);
  return pick([...STANDARD_CHARACTERS, ...STANDARD_WEAPONS]);
}

function pull(pool, time, featured, wish2) {
  const r = RATES[pool];
  const s = state[pool];
  s.pity5++;
  s.pity4++;
  const chance5 = r.base5 + Math.max(0, s.pity5 - r.soft5 + 1) * r.step5;
  const chance4 = r.base4 + Math.max(0, s.pity4 - r.soft4 + 1) * r.step4;
  const roll = random();
  if (roll < chance5) {
    s.pity5 = 0;
    record(pool, fiveStar(pool, featured), time, wish2);
  } else if (roll < chance5 + chance4) {
    s.pity4 = 0;
    record(pool, pick(FOUR_STARS), time, wish2);
  } else {
    record(pool, pick(THREE_STARS), time, wish2);
  }
}

const pad = (n) => String(n).padStart(2, "0");
const stamp = (d) =>
  `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}`;

// Beginners' Wish: 20 pulls in the first two days, Noelle in the first ten.
const start = new Date(Date.UTC(2024, 0, 1, 10, 0, 0));
for (let ten = 0; ten < 2; ten++) {
  const time = stamp(new Date(start.getTime() + ten * 86_400_000));
  for (let i = 0; i < 10; i++) {
    if (ten === 0 && i === 3) record("beginner", byName("Noelle"), time);
    else {
      const roll = random();
      record("beginner", roll < 0.1 ? pick(FOUR_STARS) : pick(THREE_STARS), time);
    }
  }
}

// Then a play session every few days until early 2026. Banners change every 21 days.
const end = new Date(Date.UTC(2026, 0, 15));
let banner = -1;
let featured;
for (let day = new Date(start.getTime() + 3 * 86_400_000); day < end; day = new Date(day.getTime() + (2 + Math.floor(random() * 5)) * 86_400_000)) {
  const bannerIndex = Math.floor((day - start) / (21 * 86_400_000));
  if (bannerIndex !== banner) {
    banner = bannerIndex;
    featured = { character: FEATURED_CHARACTERS[(bannerIndex * 7) % FEATURED_CHARACTERS.length], weapons: [pick(FEATURED_WEAPONS), pick(FEATURED_WEAPONS)] };
  }
  const plan = [
    ["character", random() < 0.8 ? (random() < 0.5 ? 10 : 1) : 0],
    ["character", random() < 0.15 ? 10 : 0],
    ["weapon", random() < 0.15 ? 10 : 0],
    ["standard", random() < 0.25 ? (random() < 0.5 ? 10 : 1) : 0],
    ["chronicled", day >= new Date(Date.UTC(2025, 2, 1)) && day < new Date(Date.UTC(2025, 2, 22)) ? 10 : 0],
  ];
  let minute = 0;
  plan.forEach(([pool, count], i) => {
    for (let n = 0; n < count; n += count === 10 ? 10 : 1) {
      const time = stamp(new Date(day.getTime() + (18 * 60 + minute++) * 60_000));
      for (let k = 0; k < Math.min(count, 10); k++) pull(pool, time, featured, i === 1);
    }
  });
}

// The older pulls again as a paimon.moe Excel export (`wishes-paimon.xlsx`):
// one sheet per banner with Type, Name, Time, ⭐, Pity, #Roll, Group, Banner,
// Part, and an Information sheet, as paimon.moe writes it. Cells are inline
// strings rather than paimon.moe's shared strings, so the reader's other path
// gets tested too. No ids, as in the real thing.
function paimonWorkbook(list) {
  const SHEETS = [["Character Event", "301"], ["Weapon Event", "302"], ["Standard", "200"], ["Chronicled Wish", "500"], ["Beginners' Wish", "100"]];
  const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/'/g, "&apos;");
  const col = (i) => String.fromCharCode(65 + i);
  const sheetXml = (rows) =>
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>${rows
      .map((row, r) => `<row r="${r + 1}">${row.map((v, c) => `<c r="${col(c)}${r + 1}" t="inlineStr"><is><t>${esc(v)}</t></is></c>`).join("")}</row>`)
      .join("")}</sheetData></worksheet>`;
  const sheets = SHEETS.map(([name, type]) => {
    const rows = [["Type", "Name", "Time", "⭐", "Pity", "#Roll", "Group", "Banner", "Part"]];
    let pity5 = 0, pity4 = 0, group = 0, lastTime = "";
    list.filter((p) => p.uigf_gacha_type === type).forEach((p, i) => {
      pity5++; pity4++;
      if (p.time !== lastTime) { group++; lastTime = p.time; }
      const pity = p.rank_type === "5" ? pity5 : p.rank_type === "4" ? pity4 : 1;
      if (p.rank_type === "5") pity5 = 0;
      if (p.rank_type === "4") pity4 = 0;
      rows.push([p.item_type, p.name, p.time, p.rank_type, String(pity), String(i + 1), String(group), "Test banner", p.gacha_type === "400" ? "Wish 2" : ""]);
    });
    return [name, rows];
  });
  sheets.push(["Information", [["Paimon.moe Wish History Export", ""], ["Version", "3"], ["Export Date", "2025-07-01 00:00:00"]]]);
  const files = [
    ["[Content_Types].xml", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>${sheets.map((_, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join("")}</Types>`],
    ["_rels/.rels", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`],
    ["xl/workbook.xml", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>${sheets.map(([name], i) => `<sheet name="${esc(name)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join("")}</sheets></workbook>`],
    ["xl/_rels/workbook.xml.rels", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${sheets.map((_, i) => `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join("")}</Relationships>`],
    ...sheets.map(([, rows], i) => [`xl/worksheets/sheet${i + 1}.xml`, sheetXml(rows)]),
  ];
  return zip(files);
}

/** A minimal zip writer (deflate, no zip64), enough for the workbook above. */
function zip(files) {
  const locals = [];
  const central = [];
  let offset = 0;
  for (const [name, text] of files) {
    const nameBytes = Buffer.from(name);
    const data = Buffer.from(text);
    const packed = deflateRawSync(data);
    const crc = crc32(data);
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0); local.writeUInt16LE(20, 4); local.writeUInt16LE(0x0800, 6); local.writeUInt16LE(8, 8);
    local.writeUInt32LE(crc, 14); local.writeUInt32LE(packed.length, 18); local.writeUInt32LE(data.length, 22); local.writeUInt16LE(nameBytes.length, 26);
    const entry = Buffer.alloc(46);
    entry.writeUInt32LE(0x02014b50, 0); entry.writeUInt16LE(20, 4); entry.writeUInt16LE(20, 6); entry.writeUInt16LE(0x0800, 8); entry.writeUInt16LE(8, 10);
    entry.writeUInt32LE(crc, 16); entry.writeUInt32LE(packed.length, 20); entry.writeUInt32LE(data.length, 24); entry.writeUInt16LE(nameBytes.length, 28); entry.writeUInt32LE(offset, 42);
    locals.push(local, nameBytes, packed);
    central.push(entry, nameBytes);
    offset += 30 + nameBytes.length + packed.length;
  }
  const dir = Buffer.concat(central);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0); end.writeUInt16LE(files.length, 8); end.writeUInt16LE(files.length, 10);
  end.writeUInt32LE(dir.length, 12); end.writeUInt32LE(offset, 16);
  return Buffer.concat([...locals, dir, end]);
}

const exportOf = (list, timestamp) => ({
  info: { export_timestamp: timestamp, export_app: "Gacha Savior test data", export_app_version: "1.0", version: "v4.0" },
  hk4e: [{ uid: UID, timezone: 8, lang: "en-us", list }],
});

const older = pulls.filter((p) => p.time < SPLIT);
const newer = pulls.filter((p) => p.time >= NEWER_FROM);
mkdirSync(OUT_DIR, { recursive: true });
writeFileSync(`${OUT_DIR}/wishes-older.json`, JSON.stringify(exportOf(older, 1751328000)) + "\n");
writeFileSync(`${OUT_DIR}/wishes-newer.json`, JSON.stringify(exportOf(newer, 1768435200)) + "\n");
writeFileSync(`${OUT_DIR}/wishes-paimon.xlsx`, paimonWorkbook(older));
const overlap = older.filter((p) => p.time >= NEWER_FROM).length;
console.log(`Wrote ${pulls.length} pulls: ${older.length} in wishes-older.json, ${newer.length} in wishes-newer.json (${overlap} in both).`);
for (const pool of Object.keys(POOL_GACHA_TYPE)) {
  const list = pulls.filter((p) => p.uigf_gacha_type === POOL_GACHA_TYPE[pool]);
  console.log(`  ${pool}: ${list.length} pulls, ${list.filter((p) => p.rank_type === "5").length} 5★`);
}
