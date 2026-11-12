/**
 * Wish history: reading UIGF exports, merging them with earlier imports, and
 * counting pity. Pure functions only, so they run under `npm test` too.
 *
 * UIGF (https://uigf.org) is the shared format wish-history tools export.
 * v4 keeps Genshin accounts under `hk4e: [{ uid, timezone, list }]`; v3 has one
 * account, with `info.uid` and a top-level `list`.
 */

export type WishPool = "character" | "weapon" | "standard" | "chronicled" | "beginner";

/** One pull, as stored. Newer pulls have larger ids. */
export interface Pull {
  /** The game's pull id, a numeric string of up to 19 digits. */
  id: string;
  /** As the game reports it: "400" is the second Character Event banner. */
  gachaType: string;
  itemId: string;
  name: string;
  rarity: 3 | 4 | 5;
  type: "Character" | "Weapon";
  /** Server local time, "YYYY-MM-DD HH:MM:SS", kept as the game wrote it. */
  time: string;
}

export interface WishItem {
  name: string;
  rarity: number;
  type: "Character" | "Weapon";
}

/** Looks up an item by the game's id; the site passes one built from `wishItems.json`. */
export type ItemLookup = (itemId: string) => WishItem | undefined;

export interface WishAccount {
  uid: string;
  pulls: Pull[];
}

export type ParseUigfResult =
  | { ok: true; accounts: WishAccount[]; warnings: string[] }
  | { ok: false; error: string };

export const POOLS: { pool: WishPool; label: string; hardPity: number | null }[] = [
  { pool: "character", label: "Character Event", hardPity: 90 },
  { pool: "weapon", label: "Weapon Event", hardPity: 80 },
  { pool: "standard", label: "Standard", hardPity: 90 },
  { pool: "chronicled", label: "Chronicled Wish", hardPity: 90 },
  { pool: "beginner", label: "Beginners' Wish", hardPity: null },
];

export type PityBand = "early" | "soft" | "hard";

/**
 * How the 5★ history colours a pity, counted back from hard pity (the user's
 * ranges, 2026-11-11): on a 90 banner 1–69 Early, 70–79 Soft pity, 80–90 Hard
 * pity; on Weapon Event (80) 1–59, 60–69 and 70–80. Beginners' Wish has none.
 */
export function pityBand(pool: WishPool, pity: number): PityBand {
  const hard = POOLS.find((p) => p.pool === pool)?.hardPity;
  if (!hard) return "early";
  if (pity >= hard - 10) return "hard";
  if (pity >= hard - 20) return "soft";
  return "early";
}

const POOL_BY_GACHA_TYPE: Record<string, WishPool> = {
  "100": "beginner",
  "200": "standard",
  "301": "character",
  "400": "character",
  "302": "weapon",
  "500": "chronicled",
};

export function poolOf(gachaType: string): WishPool | undefined {
  return POOL_BY_GACHA_TYPE[gachaType];
}

/**
 * The 5★ characters in the Standard Wish, and when each joined it. Getting one
 * of these from a Character Event banner means the 50/50 was lost. Check this
 * list after each patch: the game adds a character to the Standard Wish now
 * and then, and the game data doesn't say which.
 */
export const STANDARD_FIVE_STARS: { name: string; since: string }[] = [
  { name: "Diluc", since: "2020-09-28" },
  { name: "Jean", since: "2020-09-28" },
  { name: "Keqing", since: "2020-09-28" },
  { name: "Mona", since: "2020-09-28" },
  { name: "Qiqi", since: "2020-09-28" },
  { name: "Tighnari", since: "2022-09-28" },
  { name: "Dehya", since: "2023-04-12" },
  // In the Standard Wish by 2026-09: she came off Vesna's banner ahead of Vesna.
  // The date she joined is a guess.
  { name: "Yumemizuki Mizuki", since: "2025-03-26" },
];

/** True when `name` was in the Standard Wish at `time`. */
export function isStandardFiveStar(name: string, time: string): boolean {
  return STANDARD_FIVE_STARS.some((s) => s.name === name && time >= s.since);
}

/** Orders pull ids, which are too long for a JS number. */
export function compareIds(a: string, b: string): number {
  return a.length - b.length || (a < b ? -1 : a > b ? 1 : 0);
}

/**
 * Pull order: by time, then by id within the same second (a ten-pull). Ids alone
 * would do for UIGF, but paimon.moe imports have made-up ids (see paimonId).
 */
const byOrder = (a: Pull, b: Pull) => (a.time < b.time ? -1 : a.time > b.time ? 1 : compareIds(a.id, b.id));

type Raw = Record<string, unknown>;
const isObject = (v: unknown): v is Raw => typeof v === "object" && v !== null && !Array.isArray(v);
/** UIGF fields are strings, but some tools write numbers. */
const str = (v: unknown) => (typeof v === "string" ? v : typeof v === "number" && Number.isFinite(v) ? String(v) : "");

const TIME = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/;
const ID = /^\d{1,19}$/;

function parsePull(raw: unknown, lookup: ItemLookup): Pull | null {
  if (!isObject(raw)) return null;
  const id = str(raw.id);
  const gachaType = str(raw.gacha_type) || str(raw.uigf_gacha_type);
  const time = str(raw.time);
  const itemId = str(raw.item_id);
  if (!ID.test(id) || !poolOf(gachaType) || !TIME.test(time)) return null;

  const known = itemId ? lookup(itemId) : undefined;
  const rarity = known?.rarity ?? Number(str(raw.rank_type));
  if (rarity !== 3 && rarity !== 4 && rarity !== 5) return null;
  const name = known?.name ?? str(raw.name);
  if (!name) return null;
  // Character ids have 8 digits (10000089) and weapon ids 5 (11509); item_type
  // is in the export's own language, so it's only a last resort.
  const type =
    known?.type ??
    (itemId.length === 8 ? "Character" : itemId ? "Weapon" : str(raw.item_type) === "Character" ? "Character" : "Weapon");
  return { id, gachaType, itemId, name, rarity, type, time };
}

function parseAccount(uid: unknown, list: unknown, lookup: ItemLookup, warnings: string[]): WishAccount | null {
  const id = str(uid);
  if (!id || !Array.isArray(list)) return null;
  const seen = new Map<string, Pull>();
  let skipped = 0;
  for (const raw of list) {
    const pull = parsePull(raw, lookup);
    if (pull) seen.set(pull.id, pull);
    else skipped++;
  }
  if (skipped > 0) {
    warnings.push(`Skipped ${skipped} ${skipped === 1 ? "wish" : "wishes"} for UID ${id} with missing or unknown details.`);
  }
  return { uid: id, pulls: [...seen.values()].sort(byOrder) };
}

const NOT_UIGF =
  "This file isn't a UIGF wish history export. Import a paimon.moe Excel file (.xlsx) or a UIGF .json file instead.";

/** Reads a UIGF v4 or v3 export. Entries that can't be read are skipped with a warning. */
export function parseUigf(json: unknown, lookup: ItemLookup): ParseUigfResult {
  if (!isObject(json) || !isObject(json.info)) return { ok: false, error: NOT_UIGF };
  const warnings: string[] = [];
  let accounts: WishAccount[];

  if (Array.isArray(json.hk4e)) {
    accounts = json.hk4e
      .filter(isObject)
      .map((a) => parseAccount(a.uid, a.list, lookup, warnings))
      .filter((a): a is WishAccount => a !== null);
  } else if (Array.isArray(json.list)) {
    const account = parseAccount(json.info.uid, json.list, lookup, warnings);
    accounts = account ? [account] : [];
  } else if (["hkrpg", "nap", "hk4e_ugc"].some((key) => key in json)) {
    return {
      ok: false,
      error: "This export has no Genshin Impact wishes. Only Genshin Impact wish history can be imported for now.",
    };
  } else {
    return { ok: false, error: NOT_UIGF };
  }

  accounts = accounts.filter((a) => a.pulls.length > 0);
  if (!accounts.length) return { ok: false, error: "No wishes were found in the file." };
  return { ok: true, accounts, warnings };
}

export function parseUigfText(text: string, lookup: ItemLookup): ParseUigfResult {
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    return { ok: false, error: "This file couldn't be read. It may be incomplete. Export it again and import the new file." };
  }
  return parseUigf(json, lookup);
}

/** paimon.moe's made-up ids are 13 digits; the game's are 18 or 19. */
export const isPaimonId = (id: string) => id.length === 13;

const keyName = (name: string) => name.toLowerCase().replace(/[^a-z0-9]/g, "");

/**
 * A key that finds the same pull in two exports without ids: pool, time, name,
 * and which of the identical ones it is within that second (a ten-pull can
 * hold the same 3★ weapon twice). Both kinds of export list a ten-pull whole,
 * so the counting agrees.
 */
function pullKeys(pulls: Pull[]): string[] {
  const seen = new Map<string, number>();
  return pulls.map((p) => {
    const base = `${poolOf(p.gachaType)}|${p.time}|${keyName(p.name)}`;
    const n = seen.get(base) ?? 0;
    seen.set(base, n + 1);
    return `${base}|${n}`;
  });
}

/**
 * Adds new pulls to the ones already saved, so pulls the game no longer shows
 * stay, and an overlapping export adds nothing twice. Pulls match by id, or,
 * for paimon.moe imports, which have no real ids, by pool, time and name. When
 * a game export matches a paimon.moe pull, the pull takes the game's id.
 */
export function mergePulls(existing: Pull[], incoming: Pull[]): { pulls: Pull[]; added: number } {
  const all = [...existing].sort(byOrder);
  const ids = new Set(all.map((p) => p.id));
  const keys = new Map(pullKeys(all).map((key, i) => [key, i]));
  const sorted = [...incoming].sort(byOrder);
  const incomingKeys = pullKeys(sorted);
  let added = 0;
  sorted.forEach((pull, i) => {
    if (ids.has(pull.id)) return;
    const match = keys.get(incomingKeys[i]);
    // Two game pulls are the same only if their ids are; time and name decide
    // only when one side came from paimon.moe.
    if (match !== undefined && (isPaimonId(all[match].id) || isPaimonId(pull.id))) {
      const saved = all[match];
      if (isPaimonId(saved.id) && !isPaimonId(pull.id)) {
        all[match] = { ...saved, id: pull.id, itemId: saved.itemId || pull.itemId };
        ids.add(pull.id);
      }
      return;
    }
    all.push(pull);
    ids.add(pull.id);
    keys.set(incomingKeys[i], all.length - 1);
    added++;
  });
  return { pulls: all.sort(byOrder), added };
}

/** Looks up an item by its English name, for paimon.moe exports, which have no item ids. */
export type NameLookup = (name: string) => (WishItem & { itemId: string }) | undefined;

/** Builds a NameLookup from the same table as ItemLookup (`wishItems.json`'s `items`). */
export function nameLookup(items: Record<string, WishItem>): NameLookup {
  const byName = new Map(Object.entries(items).map(([itemId, item]) => [keyName(item.name), { ...item, itemId }]));
  return (name) => byName.get(keyName(name));
}

const PAIMON_SHEETS: Record<string, string> = {
  "Character Event": "301",
  "Weapon Event": "302",
  Standard: "200",
  "Chronicled Wish": "500",
  "Beginners' Wish": "100",
};
const PAIMON_HEADER = ["Type", "Name", "Time", "⭐"];

/**
 * A made-up id for a paimon.moe pull: the time as seconds (10 digits) and its
 * place among the file's pulls in that second (3 digits). The game's ids are
 * longer, so the two never collide, and the same file always gives the same ids.
 */
function paimonId(time: string, n: number): string {
  const [date, clock] = time.split(" ");
  const [y, mo, d] = date.split("-").map(Number);
  const [h, mi, s] = clock.split(":").map(Number);
  return `${Math.floor(Date.UTC(y, mo - 1, d, h, mi, s) / 1000)}${String(n).padStart(3, "0")}`;
}

/**
 * Reads the sheets of a paimon.moe Excel export (see `readXlsx`): one sheet per
 * banner, rows of Type, Name, Time, ⭐, Pity, #Roll, Group, Banner, Part, where
 * Part is "Wish 2" for the second Character Event banner. The file has no UID,
 * so the account's `uid` is empty.
 */
export function parsePaimon(sheets: Record<string, string[][]>, lookup: NameLookup): ParseUigfResult {
  const info = sheets.Information?.[0]?.[0] ?? "";
  if (!info.startsWith("Paimon.moe")) {
    return { ok: false, error: "This Excel file isn't a paimon.moe wish history export. Export it again from paimon.moe's Wish Counter, or use a UIGF .json file." };
  }
  const warnings: string[] = [];
  const pulls: Pull[] = [];
  const perSecond = new Map<string, number>();
  let skipped = 0;
  for (const [sheet, rows] of Object.entries(sheets)) {
    const header = rows[0] ?? [];
    if (!PAIMON_HEADER.every((h, i) => header[i] === h)) continue;
    const gachaType = PAIMON_SHEETS[sheet];
    if (!gachaType) {
      if (rows.length > 1) warnings.push(`Skipped the "${sheet}" sheet, which isn't a banner this site knows.`);
      continue;
    }
    for (const row of rows.slice(1)) {
      const [type, rawName, time, stars, , , , , part] = row;
      const known = rawName ? lookup(rawName) : undefined;
      const rarity = Number(stars);
      if (!TIME.test(time ?? "") || !rawName || (rarity !== 3 && rarity !== 4 && rarity !== 5)) {
        skipped++;
        continue;
      }
      const n = perSecond.get(time) ?? 0;
      perSecond.set(time, n + 1);
      pulls.push({
        id: paimonId(time, n),
        gachaType: gachaType === "301" && part === "Wish 2" ? "400" : gachaType,
        itemId: known?.itemId ?? "",
        name: known?.name ?? rawName,
        rarity,
        type: known?.type ?? (type === "Character" ? "Character" : "Weapon"),
        time,
      });
    }
  }
  if (skipped) warnings.push(`Skipped ${skipped} ${skipped === 1 ? "wish" : "wishes"} with missing or unknown details.`);
  if (!pulls.length) return { ok: false, error: "No wishes were found in the file." };
  return { ok: true, accounts: [{ uid: "", pulls: pulls.sort(byOrder) }], warnings };
}

/** How a Character Event 5★ went: the featured one, a standard one, or featured after a loss. */
export type FiftyFifty = "won" | "lost" | "guaranteed";

export interface FiveStarPull {
  pull: Pull;
  /** Pulls it took, counting this one. */
  pity: number;
  /** Character Event only. */
  fiftyFifty?: FiftyFifty;
}

export interface PoolStats {
  pool: WishPool;
  total: number;
  /** Pulls since the last 5★. */
  pity5: number;
  /** Pulls since the last 4★. A 5★ doesn't reset it: the game holds the 4★ for the next pull. */
  pity4: number;
  fourStars: number;
  /** Oldest first. */
  fiveStars: FiveStarPull[];
  /** Pulls per 5★, counting only pulls up to the last one; null before the first. */
  averagePity: number | null;
  /** Character Event only: true when the last 5★ lost the 50/50, so the next is the featured one. */
  guaranteed?: boolean;
}

/** Stats for one pool. `pulls` may hold every pool; the others are ignored. */
export function poolStats(pulls: Pull[], pool: WishPool): PoolStats {
  const list = pulls.filter((p) => poolOf(p.gachaType) === pool).sort(byOrder);
  const fiveStars: FiveStarPull[] = [];
  let since5 = 0;
  let since4 = 0;
  let fourStars = 0;
  let lastLost = false;

  for (const pull of list) {
    since5++;
    since4++;
    if (pull.rarity === 4) {
      fourStars++;
      since4 = 0;
    } else if (pull.rarity === 5) {
      const entry: FiveStarPull = { pull, pity: since5 };
      if (pool === "character") {
        entry.fiftyFifty = lastLost ? "guaranteed" : isStandardFiveStar(pull.name, pull.time) ? "lost" : "won";
        lastLost = entry.fiftyFifty === "lost";
      }
      fiveStars.push(entry);
      since5 = 0;
    }
  }

  const upToLast = list.length - since5;
  return {
    pool,
    total: list.length,
    pity5: since5,
    pity4: since4,
    fourStars,
    fiveStars,
    averagePity: fiveStars.length ? Math.round((upToLast / fiveStars.length) * 10) / 10 : null,
    ...(pool === "character" ? { guaranteed: lastLost } : {}),
  };
}

export interface MonthCount {
  /** "YYYY-MM" */
  month: string;
  wishes: number;
  /** Names of the 5★s pulled that month, in order. */
  fiveStars: string[];
}

/**
 * Wishes per calendar month on one pool, from its first wish's month to its
 * last, with empty months included as 0 so a chart's columns stay evenly spaced.
 */
export function monthlyCounts(pulls: Pull[], pool: WishPool): MonthCount[] {
  const list = pulls.filter((p) => poolOf(p.gachaType) === pool).sort(byOrder);
  if (!list.length) return [];
  const byMonth = new Map<string, MonthCount>();
  for (const p of list) {
    const month = p.time.slice(0, 7);
    const entry = byMonth.get(month) ?? { month, wishes: 0, fiveStars: [] };
    entry.wishes++;
    if (p.rarity === 5) entry.fiveStars.push(p.name);
    byMonth.set(month, entry);
  }
  const out: MonthCount[] = [];
  let [y, m] = list[0].time.slice(0, 7).split("-").map(Number);
  const last = list.at(-1)!.time.slice(0, 7);
  for (;;) {
    const month = `${y}-${String(m).padStart(2, "0")}`;
    out.push(byMonth.get(month) ?? { month, wishes: 0, fiveStars: [] });
    if (month === last) break;
    m++;
    if (m > 12) {
      m = 1;
      y++;
    }
  }
  return out;
}

/**
 * Firestore limits a document to 1 MiB. A stored pull is about 150 bytes, so
 * 2,000 per chunk is well under it.
 */
export const PULLS_PER_CHUNK = 2000;

export function chunkPulls(pulls: Pull[], size = PULLS_PER_CHUNK): Pull[][] {
  const chunks: Pull[][] = [];
  for (let i = 0; i < pulls.length; i += size) chunks.push(pulls.slice(i, i + size));
  return chunks;
}

/**
 * What `users/{uid}/games/genshin/wishes/meta` holds, besides `lastImportedAt`.
 * `chunks` says how many `{pool}_{n}` documents each pool has, so they can be
 * read without listing the collection, and stale ones deleted.
 */
export interface WishMeta {
  /** The game account the history belongs to. */
  gameUid: string;
  totals: Partial<Record<WishPool, number>>;
  chunks: Partial<Record<WishPool, number>>;
}

/** Splits a whole history into the documents to save: the meta and `{pool}_{n}` chunks. */
export function wishDocuments(gameUid: string, pulls: Pull[]): { meta: WishMeta; chunks: { id: string; items: Pull[] }[] } {
  const meta: WishMeta = { gameUid, totals: {}, chunks: {} };
  const chunks: { id: string; items: Pull[] }[] = [];
  for (const { pool } of POOLS) {
    const list = pulls.filter((p) => poolOf(p.gachaType) === pool).sort(byOrder);
    if (!list.length) continue;
    const parts = chunkPulls(list);
    meta.totals[pool] = list.length;
    meta.chunks[pool] = parts.length;
    parts.forEach((items, n) => chunks.push({ id: `${pool}_${n}`, items }));
  }
  return { meta, chunks };
}

/** Every chunk id a meta's `chunks` counts point to. */
export function chunkIds(chunks: WishMeta["chunks"]): string[] {
  return POOLS.flatMap(({ pool }) => Array.from({ length: chunks[pool] ?? 0 }, (_, n) => `${pool}_${n}`));
}

const isPull = (p: unknown): p is Pull =>
  isObject(p) &&
  typeof p.id === "string" && ID.test(p.id) &&
  typeof p.gachaType === "string" && poolOf(p.gachaType) !== undefined &&
  typeof p.itemId === "string" &&
  typeof p.name === "string" && p.name !== "" &&
  (p.rarity === 3 || p.rarity === 4 || p.rarity === 5) &&
  (p.type === "Character" || p.type === "Weapon") &&
  typeof p.time === "string" && TIME.test(p.time);

/** Puts saved chunks back together, dropping anything that isn't a valid pull. */
export function pullsFromChunks(chunks: unknown[]): Pull[] {
  return chunks
    .flatMap((items) => (Array.isArray(items) ? items : []))
    .filter(isPull)
    .map(({ id, gachaType, itemId, name, rarity, type, time }) => ({ id, gachaType, itemId, name, rarity, type, time }))
    .sort(byOrder);
}

/** What one wish costs: an Intertwined or Acquaint Fate is 160 Primogems. */
export const PRIMOGEMS_PER_WISH = 160;

export interface WishSpending {
  /** Fates used. Beginners' Wish ten-pulls take 8, so this can be less than the wish count. */
  fates: number;
  /** `fates` × 160. An estimate: some fates come from Starglitter, events or the shop, not Primogems. */
  primogems: number;
}

/**
 * Fates and Primogems spent on one pool, or on all of them when `pool` is left
 * out. A Beginners' Wish ten-pull (ten pulls in the same second) costs 8 fates.
 */
export function wishSpending(pulls: Pull[], pool?: WishPool): WishSpending {
  const list = pulls.filter((p) => (pool ? poolOf(p.gachaType) === pool : poolOf(p.gachaType) !== undefined));
  const beginnerPerSecond = new Map<string, number>();
  let fates = 0;
  for (const p of list) {
    if (poolOf(p.gachaType) === "beginner") beginnerPerSecond.set(p.time, (beginnerPerSecond.get(p.time) ?? 0) + 1);
    else fates++;
  }
  for (const n of beginnerPerSecond.values()) fates += n - Math.floor(n / 10) * 2;
  return { fates, primogems: fates * PRIMOGEMS_PER_WISH };
}

export interface FiftyFiftyRecord {
  won: number;
  lost: number;
  /** 5★s that came guaranteed after a loss; they aren't 50/50s. */
  guaranteed: number;
  /** won ÷ (won + lost), from 0 to 1; null before the first 50/50. */
  winRate: number | null;
}

/**
 * The Character Event 50/50s: how many were won and lost. Capturing Radiance
 * (5.0 on) can turn a loss into a win, which the history can't show, so a win
 * here may have been one.
 */
export function fiftyFiftyRecord(pulls: Pull[]): FiftyFiftyRecord {
  const record = { won: 0, lost: 0, guaranteed: 0 };
  for (const { fiftyFifty } of poolStats(pulls, "character").fiveStars) if (fiftyFifty) record[fiftyFifty]++;
  const played = record.won + record.lost;
  return { ...record, winRate: played ? record.won / played : null };
}

/** UIGF's `uigf_gacha_type` folds the second Character Event banner (400) into 301. */
const UIGF_GACHA_TYPE: Record<string, string> = { "400": "301" };

/**
 * The server's offset from UTC in hours, which UIGF v4 asks for: a UID starting
 * with 6 is America (UTC−5), 7 Europe (UTC+1); Asia, TW/HK/MO and the Chinese
 * servers are UTC+8.
 */
export function uigfTimezone(uid: string): number {
  const first = uid.replace(/^0+/, "")[0];
  return first === "6" ? -5 : first === "7" ? 1 : 8;
}

export const UIGF_VERSION = "v4.2";

/**
 * A whole history as a UIGF v4 file, for keeping a copy or moving it to another
 * tool. Times stay as the game wrote them. Pulls imported from paimon.moe keep
 * their made-up 13-digit ids, so importing the file back adds nothing. Names
 * are the site's English ones, so `lang` is en-us.
 */
export function toUigf(uid: string, pulls: Pull[], app: { name: string; version: string; exportedAt: Date }) {
  return {
    info: {
      export_timestamp: Math.floor(app.exportedAt.getTime() / 1000),
      export_app: app.name,
      export_app_version: app.version,
      version: UIGF_VERSION,
    },
    hk4e: [
      {
        uid,
        timezone: uigfTimezone(uid),
        lang: "en-us",
        list: [...pulls].sort(byOrder).map((p) => ({
          uigf_gacha_type: UIGF_GACHA_TYPE[p.gachaType] ?? p.gachaType,
          gacha_type: p.gachaType,
          item_id: p.itemId,
          count: "1",
          time: p.time,
          name: p.name,
          item_type: p.type,
          rank_type: String(p.rarity),
          id: p.id,
        })),
      },
    ],
  };
}
