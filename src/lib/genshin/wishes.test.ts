import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  chunkIds,
  chunkPulls,
  compareIds,
  isPaimonId,
  monthlyCounts,
  nameLookup,
  parsePaimon,
  pityBand,
  pullsFromChunks,
  wishDocuments,
  fiftyFiftyRecord,
  toUigf,
  uigfTimezone,
  wishSpending,
  UIGF_VERSION,
  isStandardFiveStar,
  mergePulls,
  parseUigf,
  parseUigfText,
  poolOf,
  poolStats,
  type ItemLookup,
  type Pull,
} from "./wishes.ts";
import { readXlsx } from "../xlsx.ts";

const ITEMS: Record<string, { name: string; rarity: number; type: "Character" | "Weapon" }> = {
  "10000089": { name: "Furina", rarity: 5, type: "Character" },
  "10000042": { name: "Keqing", rarity: 5, type: "Character" },
  "10000031": { name: "Fischl", rarity: 4, type: "Character" },
  "11509": { name: "Mistsplitter Reforged", rarity: 5, type: "Weapon" },
  "13401": { name: "Dragon's Bane", rarity: 4, type: "Weapon" },
  "15301": { name: "Raven Bow", rarity: 3, type: "Weapon" },
};
const lookup: ItemLookup = (id) => ITEMS[id];

const raw = (id: number | string, itemId: string, extra: Record<string, unknown> = {}) => ({
  uigf_gacha_type: "301",
  gacha_type: "301",
  item_id: itemId,
  count: "1",
  time: "2024-01-01 12:00:00",
  id: String(id),
  ...extra,
});

const v4 = (list: unknown[], uid: unknown = "800000001") => ({
  info: { export_timestamp: 1700000000, export_app: "Test", export_app_version: "1.0", version: "v4.0" },
  hk4e: [{ uid, timezone: 8, lang: "en-us", list }],
});

/** A run of pulls for poolStats: one character per letter, 3 = 3★, 4 = 4★, F = Furina, K = Keqing (standard). */
function pulls(pattern: string, gachaType = "301", time = "2024-01-01 12:00:00"): Pull[] {
  const kinds: Record<string, Pick<Pull, "name" | "rarity" | "type" | "itemId">> = {
    "3": { name: "Raven Bow", rarity: 3, type: "Weapon", itemId: "15301" },
    "4": { name: "Fischl", rarity: 4, type: "Character", itemId: "10000031" },
    F: { name: "Furina", rarity: 5, type: "Character", itemId: "10000089" },
    K: { name: "Keqing", rarity: 5, type: "Character", itemId: "10000042" },
  };
  return [...pattern].map((c, i) => ({ id: String(BigInt("1700000000000000000") + BigInt(i)), gachaType, time, ...kinds[c] }));
}

function parseOk(json: unknown) {
  const result = parseUigf(json, lookup);
  assert.ok(result.ok, result.ok ? "" : result.error);
  return result;
}

test("reads a UIGF v4 export, taking names and rarity from the game data", () => {
  const { accounts, warnings } = parseOk(v4([raw(2, "10000089", { name: "フリーナ", rank_type: "5" }), raw(1, "15301")]));
  assert.deepEqual(warnings, []);
  assert.equal(accounts.length, 1);
  assert.equal(accounts[0].uid, "800000001");
  assert.deepEqual(
    accounts[0].pulls.map((p) => [p.id, p.name, p.rarity, p.type]),
    [
      ["1", "Raven Bow", 3, "Weapon"],
      ["2", "Furina", 5, "Character"],
    ]
  );
});

test("reads a UIGF v3 export", () => {
  const { accounts } = parseOk({
    info: { uid: "700000002", uigf_version: "v3.0", lang: "en-us" },
    list: [raw(5, "11509", { gacha_type: "302", uigf_gacha_type: "302" })],
  });
  assert.equal(accounts[0].uid, "700000002");
  assert.equal(poolOf(accounts[0].pulls[0].gachaType), "weapon");
});

test("keeps every Genshin account in the file, accepting a number UID", () => {
  const json = v4([raw(1, "10000089")]);
  json.hk4e.push({ uid: 600000003, timezone: -5, lang: "en-us", list: [raw(2, "15301")] });
  assert.deepEqual(parseOk(json).accounts.map((a) => a.uid), ["800000001", "600000003"]);
});

test("falls back to the export's own name and rarity for items the game data doesn't have", () => {
  const { accounts } = parseOk(v4([raw(1, "10009999", { name: "New Character", rank_type: "5", item_type: "Character" })]));
  assert.deepEqual(
    [accounts[0].pulls[0].name, accounts[0].pulls[0].rarity, accounts[0].pulls[0].type],
    ["New Character", 5, "Character"]
  );
});

test("skips wishes it can't read and says how many", () => {
  const { accounts, warnings } = parseOk(
    v4([
      raw(1, "10000089"),
      raw(2, "99999"), // unknown item with no rank_type or name
      raw("abc", "10000089"),
      raw(4, "10000089", { gacha_type: "999", uigf_gacha_type: "999" }),
      raw(5, "10000089", { time: "2024/01/01" }),
      null,
    ])
  );
  assert.equal(accounts[0].pulls.length, 1);
  assert.deepEqual(warnings, ["Skipped 5 wishes for UID 800000001 with missing or unknown details."]);
});

test("a pull listed twice in one file counts once", () => {
  assert.equal(parseOk(v4([raw(1, "15301"), raw(1, "15301")])).accounts[0].pulls.length, 1);
});

test("rejects files that aren't Genshin UIGF exports", () => {
  const error = (json: unknown) => {
    const result = parseUigf(json, lookup);
    assert.equal(result.ok, false);
    return result.ok ? "" : result.error;
  };
  assert.match(error(null), /isn't a UIGF/);
  assert.match(error({ format: "GOOD", version: 2, characters: [] }), /isn't a UIGF/);
  assert.match(error({ info: { version: "v4.0" }, hkrpg: [{ uid: "1", list: [] }] }), /no Genshin Impact wishes/);
  assert.match(error(v4([])), /No wishes were found/);
  assert.match(parseUigfText("{", lookup).ok ? "" : "couldn't be read", /couldn't be read/);
});

test("compareIds orders 19-digit ids correctly", () => {
  assert.ok(compareIds("1700000000000000009", "1700000000000000010") < 0);
  assert.ok(compareIds("999", "1000") < 0);
  assert.equal(compareIds("1700000000000000001", "1700000000000000001"), 0);
});

test("merging an overlapping export adds only the new pulls", () => {
  const older = pulls("3334333F");
  const newer = [...older.slice(4), ...pulls("33", "301").map((p, i) => ({ ...p, id: `18${String(i).padStart(17, "0")}` }))];
  const first = mergePulls([], older);
  assert.equal(first.added, 8);
  const second = mergePulls(first.pulls, newer);
  assert.equal(second.added, 2);
  assert.equal(second.pulls.length, 10);
  assert.equal(new Set(second.pulls.map((p) => p.id)).size, 10);
  // Merging the same export again changes nothing.
  assert.equal(mergePulls(second.pulls, newer).added, 0);
  // The result is in pull order.
  assert.deepEqual(second.pulls.map((p) => p.id), [...second.pulls].sort((a, b) => compareIds(a.id, b.id)).map((p) => p.id));
});

test("poolStats counts pity since the last 5★ and 4★", () => {
  const stats = poolStats(pulls("333433F3343"), "character");
  assert.equal(stats.total, 11);
  assert.equal(stats.pity5, 4);
  assert.equal(stats.pity4, 1);
  assert.equal(stats.fourStars, 2);
  assert.deepEqual(stats.fiveStars.map((f) => f.pity), [7]);
  assert.equal(stats.averagePity, 7);
});

test("a 5★ doesn't reset the 4★ count", () => {
  // 4★ at pull 1, then eight 3★, a 5★, and the held 4★: that 4★ took 10 pulls.
  const stats = poolStats(pulls("433333333F"), "character");
  assert.equal(stats.pity4, 9);
  assert.equal(stats.pity5, 0);
});

test("poolStats with no pulls", () => {
  const stats = poolStats([], "weapon");
  assert.deepEqual([stats.total, stats.pity5, stats.pity4, stats.averagePity], [0, 0, 0, null]);
  assert.equal(stats.guaranteed, undefined);
});

test("both Character Event banners share one pity", () => {
  const list = [...pulls("3333", "301"), ...pulls("F", "400").map((p) => ({ ...p, id: "1800000000000000000" }))];
  assert.deepEqual(poolStats(list, "character").fiveStars.map((f) => f.pity), [5]);
  assert.equal(poolStats(list, "standard").total, 0);
});

test("the 50/50: a standard 5★ is a loss and makes the next one guaranteed", () => {
  const stats = poolStats(pulls("3F3K3F3F3K"), "character");
  assert.deepEqual(stats.fiveStars.map((f) => f.fiftyFifty), ["won", "lost", "guaranteed", "won", "lost"]);
  assert.equal(stats.guaranteed, true);
  assert.equal(poolStats(pulls("3K3F"), "character").guaranteed, false);
});

test("the 50/50 isn't worked out for other pools", () => {
  const stats = poolStats(pulls("3K", "200"), "standard");
  assert.equal(stats.fiveStars[0].fiftyFifty, undefined);
  assert.equal(stats.guaranteed, undefined);
});

test("a character counts as standard only after joining the Standard Wish", () => {
  assert.equal(isStandardFiveStar("Tighnari", "2022-08-30 12:00:00"), false);
  assert.equal(isStandardFiveStar("Tighnari", "2022-10-01 12:00:00"), true);
  assert.equal(isStandardFiveStar("Furina", "2025-01-01 12:00:00"), false);
});

test("the two overlapping test exports merge without duplicates", () => {
  const items = JSON.parse(readFileSync(new URL("../../data/genshin/wishItems.json", import.meta.url), "utf8")).items;
  const realLookup: ItemLookup = (id) => items[id];
  const load = (file: string) => {
    const text = readFileSync(new URL(`../../../public/sample-data/test-account/${file}`, import.meta.url), "utf8");
    const result = parseUigfText(text, realLookup);
    assert.ok(result.ok, `${file}: ${result.ok ? "" : result.error}`);
    assert.deepEqual(result.warnings, [], file);
    return result.accounts[0].pulls;
  };
  const older = load("wishes-older.json");
  const newer = load("wishes-newer.json");
  const first = mergePulls([], older);
  const merged = mergePulls(first.pulls, newer);
  const overlap = newer.filter((p) => older.some((o) => o.id === p.id)).length;
  assert.ok(overlap > 0, "the exports should overlap");
  assert.equal(merged.added, newer.length - overlap);
  assert.equal(merged.pulls.length, new Set([...older, ...newer].map((p) => p.id)).size);
  // Importing them the other way round gives the same history.
  assert.deepEqual(mergePulls(mergePulls([], newer).pulls, older).pulls, merged.pulls);
  for (const [pool, hard] of [["character", 90], ["weapon", 80], ["standard", 90]] as const) {
    const stats = poolStats(merged.pulls, pool);
    assert.ok(stats.fiveStars.length > 0, pool);
    assert.ok(stats.fiveStars.every((f) => f.pity <= hard), `${pool} 5★ within hard pity`);
  }
});

test("wishDocuments splits a history by pool into chunks of at most 2,000", () => {
  const list = [
    ...pulls("3".repeat(4500), "301"),
    ...pulls("3".repeat(10), "400").map((p, i) => ({ ...p, id: String(BigInt("1800000000000000000") + BigInt(i)) })),
    ...pulls("34", "200").map((p, i) => ({ ...p, id: String(BigInt("1900000000000000000") + BigInt(i)) })),
  ];
  const { meta, chunks } = wishDocuments("800000001", list);
  assert.deepEqual(meta, { gameUid: "800000001", totals: { character: 4510, standard: 2 }, chunks: { character: 3, standard: 1 } });
  assert.deepEqual(chunks.map((c) => [c.id, c.items.length]), [["character_0", 2000], ["character_1", 2000], ["character_2", 510], ["standard_0", 2]]);
  assert.deepEqual(chunkIds(meta.chunks), ["character_0", "character_1", "character_2", "standard_0"]);
  // Reading the chunks back gives the same pulls, in order.
  assert.deepEqual(pullsFromChunks(chunks.map((c) => c.items)), [...list].sort((a, b) => compareIds(a.id, b.id)));
});

test("pullsFromChunks drops anything that isn't a valid pull", () => {
  const good = pulls("F")[0];
  const read = pullsFromChunks([[good, { ...good, id: "x" }, { ...good, rarity: 6 }, null, { ...good, id: "2", extra: 1 }], "not a list", undefined]);
  assert.deepEqual(read.map((p) => p.id), ["2", good.id]);
  assert.equal("extra" in read[0], false);
});

const realItems = () => JSON.parse(readFileSync(new URL("../../data/genshin/wishItems.json", import.meta.url), "utf8")).items;
const testFile = (name: string) => new URL(`../../../public/sample-data/test-account/${name}`, import.meta.url);
const uigf = (name: string) => {
  const items = realItems();
  const r = parseUigfText(readFileSync(testFile(name), "utf8"), (id) => items[id]);
  assert.ok(r.ok);
  return r.accounts[0].pulls;
};
async function paimonPulls() {
  const sheets = await readXlsx(new Uint8Array(readFileSync(testFile("wishes-paimon.xlsx"))));
  const r = parsePaimon(sheets, nameLookup(realItems()));
  assert.ok(r.ok, r.ok ? "" : r.error);
  return { sheets, pulls: r.accounts[0].pulls, warnings: r.warnings };
}

test("parsePaimon reads the test paimon.moe export with paimon.moe's own pity", async () => {
  const { sheets, pulls, warnings } = await paimonPulls();
  const older = uigf("wishes-older.json");
  assert.deepEqual(warnings, []);
  assert.equal(pulls.length, older.length);
  assert.ok(pulls.every((p) => isPaimonId(p.id) && p.itemId !== ""));
  assert.equal(pulls.filter((p) => p.gachaType === "400").length, older.filter((p) => p.gachaType === "400").length);
  for (const [sheet, pool] of [["Character Event", "character"], ["Weapon Event", "weapon"], ["Standard", "standard"]] as const) {
    const fromSheet = sheets[sheet].slice(1).filter((r) => r[3] === "5").map((r) => Number(r[4]));
    assert.deepEqual(poolStats(pulls, pool).fiveStars.map((f) => f.pity), fromSheet, sheet);
  }
});

test("parsePaimon rejects other workbooks and skips bad rows", () => {
  const lookup = nameLookup(realItems());
  const error = (sheets: Record<string, string[][]>) => {
    const r = parsePaimon(sheets, lookup);
    return r.ok ? "" : r.error;
  };
  assert.match(error({ Sheet1: [["a", "b"]] }), /isn't a paimon.moe/);
  const info = [["Paimon.moe Wish History Export", ""]];
  const header = ["Type", "Name", "Time", "⭐", "Pity", "#Roll", "Group", "Banner", "Part"];
  assert.match(error({ Information: info, "Character Event": [header] }), /No wishes/);
  const r = parsePaimon(
    {
      Information: info,
      "Character Event": [
        header,
        ["Character", "Furina", "2024-01-01 12:00:00", "5", "80", "1", "1", "Banner", ""],
        ["Weapon", "Raven Bow", "not a time", "3", "1", "2", "2", "Banner", ""],
        ["Weapon", "Raven Bow", "2024-01-01 12:00:01", "7", "1", "3", "3", "Banner", ""],
      ],
      "Some New Banner": [header, ["Weapon", "Raven Bow", "2024-01-01 12:00:02", "3", "1", "1", "1", "x", ""]],
    },
    lookup
  );
  assert.ok(r.ok);
  assert.equal(r.accounts[0].pulls.length, 1);
  assert.equal(r.accounts[0].uid, "");
  assert.deepEqual(r.warnings, ['Skipped the "Some New Banner" sheet, which isn\'t a banner this site knows.', "Skipped 2 wishes with missing or unknown details."]);
});

test("a paimon.moe import and game exports merge without duplicates, in any order", async () => {
  const { pulls: paimon } = await paimonPulls();
  const older = uigf("wishes-older.json");
  const newer = uigf("wishes-newer.json");
  const expected = new Set([...older, ...newer].map((p) => p.id)).size;

  const a = mergePulls(mergePulls([], paimon).pulls, newer);
  assert.equal(a.pulls.length, expected);
  assert.equal(a.added, expected - older.length);
  const b = mergePulls(mergePulls([], newer).pulls, paimon);
  assert.equal(b.pulls.length, expected);
  // Same pity either way.
  assert.deepEqual(poolStats(a.pulls, "character"), poolStats(b.pulls, "character"));
  // The same paimon.moe file again adds nothing.
  assert.equal(mergePulls(a.pulls, paimon).added, 0);
  // The older game export over a paimon.moe import adds nothing and gives every pull its real id.
  const c = mergePulls(a.pulls, older);
  assert.equal(c.added, 0);
  assert.ok(c.pulls.every((p) => !isPaimonId(p.id)));
  assert.deepEqual(new Set(c.pulls.map((p) => p.id)), new Set([...older, ...newer].map((p) => p.id)));
});

test("monthlyCounts fills empty months and lists each month's 5★s", () => {
  const at = (time: string, rarity: 3 | 4 | 5, name = "Raven Bow", gachaType = "301", n = 0): Pull => ({
    id: String(BigInt("1700000000000000000") + BigInt(n)),
    gachaType,
    itemId: "",
    name,
    rarity,
    type: "Weapon",
    time,
  });
  const list = [
    at("2025-11-30 23:59:59", 3, "Raven Bow", "301", 1),
    at("2025-12-01 00:00:00", 5, "Furina", "400", 2),
    at("2026-02-10 12:00:00", 5, "Keqing", "301", 3),
    at("2026-02-10 12:00:00", 4, "Fischl", "301", 4),
    at("2026-03-01 00:00:00", 3, "Raven Bow", "200", 5),
  ];
  assert.deepEqual(monthlyCounts(list, "character"), [
    { month: "2025-11", wishes: 1, fiveStars: [] },
    { month: "2025-12", wishes: 1, fiveStars: ["Furina"] },
    { month: "2026-01", wishes: 0, fiveStars: [] },
    { month: "2026-02", wishes: 2, fiveStars: ["Keqing"] },
  ]);
  assert.deepEqual(monthlyCounts(list, "standard"), [{ month: "2026-03", wishes: 1, fiveStars: [] }]);
  assert.deepEqual(monthlyCounts(list, "weapon"), []);
});

test("monthlyCounts adds up to the pool's total", async () => {
  const { pulls } = await paimonPulls();
  for (const pool of ["character", "weapon", "standard", "chronicled", "beginner"] as const) {
    const months = monthlyCounts(pulls, pool);
    assert.equal(months.reduce((s, m) => s + m.wishes, 0), poolStats(pulls, pool).total, pool);
    assert.equal(months.flatMap((m) => m.fiveStars).length, poolStats(pulls, pool).fiveStars.length, pool);
  }
});

test("chunkPulls splits into pieces of at most the given size", () => {
  const list = pulls("3".repeat(5));
  assert.deepEqual(chunkPulls(list, 2).map((c) => c.length), [2, 2, 1]);
  assert.deepEqual(chunkPulls([]), []);
});

test("pityBand: 1–69 Early, 70–79 Soft pity, 80–90 Hard pity, and 10 sooner on Weapon Event", () => {
  const bands = (pool: Parameters<typeof pityBand>[0], pities: number[]) => pities.map((p) => pityBand(pool, p));
  assert.deepEqual(bands("character", [1, 69, 70, 79, 80, 90]), ["early", "early", "soft", "soft", "hard", "hard"]);
  assert.deepEqual(bands("standard", [69, 70, 80]), ["early", "soft", "hard"]);
  assert.deepEqual(bands("chronicled", [69, 70, 80]), ["early", "soft", "hard"]);
  assert.deepEqual(bands("weapon", [59, 60, 69, 70, 80]), ["early", "soft", "soft", "hard", "hard"]);
  assert.equal(pityBand("beginner", 20), "early");
});

test("wishSpending: 160 Primogems a wish, and a Beginners' Wish ten-pull costs 8 fates", () => {
  assert.deepEqual(wishSpending(pulls("3F34")), { fates: 4, primogems: 640 });
  const beginner = [...pulls("3333333334", "100", "2024-01-01 10:00:00"), ...pulls("44", "100", "2024-01-01 11:00:00")];
  assert.deepEqual(wishSpending(beginner, "beginner"), { fates: 10, primogems: 1600 });
  // All pools together, or just one.
  const mixed = [...pulls("333", "301"), ...pulls("33", "302", "2024-01-02 12:00:00")];
  assert.equal(wishSpending(mixed).fates, 5);
  assert.equal(wishSpending(mixed, "weapon").fates, 2);
  assert.deepEqual(wishSpending([]), { fates: 0, primogems: 0 });
});

test("fiftyFiftyRecord counts wins and losses, leaving guaranteed 5★s out of the rate", () => {
  assert.deepEqual(fiftyFiftyRecord(pulls("3F3K3F3F3K")), { won: 2, lost: 2, guaranteed: 1, winRate: 0.5 });
  assert.deepEqual(fiftyFiftyRecord(pulls("3F3F3F")), { won: 3, lost: 0, guaranteed: 0, winRate: 1 });
  assert.deepEqual(fiftyFiftyRecord(pulls("333")), { won: 0, lost: 0, guaranteed: 0, winRate: null });
  // Other banners don't count.
  assert.equal(fiftyFiftyRecord(pulls("3K", "200")).lost, 0);
});

test("uigfTimezone goes by the UID's server", () => {
  assert.equal(uigfTimezone("618033988"), -5);
  assert.equal(uigfTimezone("700000001"), 1);
  assert.equal(uigfTimezone("800000001"), 8);
  assert.equal(uigfTimezone("900000001"), 8);
  assert.equal(uigfTimezone("100000001"), 8);
  assert.equal(uigfTimezone("1800000001"), 8);
});

test("toUigf writes a UIGF v4 file that imports back with nothing new", async () => {
  const { pulls: paimon } = await paimonPulls();
  const history = mergePulls(mergePulls([], paimon).pulls, uigf("wishes-newer.json")).pulls;
  const file = toUigf("800000001", history, { name: "Gacha Savior", version: "1.1.0", exportedAt: new Date("2026-11-12T00:00:00Z") });
  assert.deepEqual(file.info, { export_timestamp: 1794441600, export_app: "Gacha Savior", export_app_version: "1.1.0", version: UIGF_VERSION });
  const [account] = file.hk4e;
  assert.equal(account.timezone, 8);
  assert.equal(account.list.length, history.length);
  // Every entry has UIGF's required fields in the right shape, and 400 is filed under 301.
  for (const item of account.list) {
    assert.match(item.id, /^[0-9]{1,19}$/);
    assert.match(item.time, /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/);
    assert.ok(["100", "200", "301", "302", "500"].includes(item.uigf_gacha_type), item.uigf_gacha_type);
    assert.equal(item.uigf_gacha_type, item.gacha_type === "400" ? "301" : item.gacha_type);
  }
  assert.ok(account.list.some((i) => i.gacha_type === "400"), "the test history has second-banner pulls");

  // Through JSON and the site's own reader, as a download and re-import would go.
  const items = JSON.parse(readFileSync(new URL("../../data/genshin/wishItems.json", import.meta.url), "utf8")).items;
  const back = parseUigfText(JSON.stringify(file), (id) => items[id]);
  assert.ok(back.ok, back.ok ? "" : back.error);
  assert.deepEqual(back.warnings, []);
  assert.equal(back.accounts[0].uid, "800000001");
  assert.deepEqual(back.accounts[0].pulls, history);
  assert.equal(mergePulls(history, back.accounts[0].pulls).added, 0);
});
