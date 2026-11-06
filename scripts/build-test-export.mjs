// Writes a made-up GOOD export with every character in the roster, for testing
// uploads: most are fully built, and some have no weapon, no artifacts, neither,
// or only some pieces. It also holds a spare copy of every weapon and spare
// artifacts from every set. Random choices are seeded, so the output only changes
// when the game data does. Run with `npm run data:test-export`.

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const OUTPUT = "public/sample-data/test-account/all-characters.json";

const readJson = (file) => JSON.parse(readFileSync(file, "utf8"));
const weapons = readJson("src/data/genshin/weapons.json").weapons;
const sets = readJson("src/data/genshin/artifactSets.json").sets;
const details = readJson("src/data/genshin/characters.json").characters;
const roster = [...readFileSync("src/lib/genshinCharacters.ts", "utf8").matchAll(/\{ key: "(\w+)", iconFile/g)].map(
  (match) => match[1]
);

// Mulberry32: small, and the same on every run.
let seed = 72;
function random() {
  seed = (seed + 0x6d2b79f5) | 0;
  let t = seed;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
const pick = (list) => list[Math.floor(random() * list.length)];
const between = (low, high) => low + Math.floor(random() * (high - low + 1));

/** "Amos' Bow" -> "AmosBow", as exports write it. */
const goodKey = (name) =>
  name
    .normalize("NFD")
    .replace(/[^A-Za-z0-9 ]/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word[0].toUpperCase() + word.slice(1))
    .join("");

const SLOTS = ["flower", "plume", "sands", "goblet", "circlet"];
const SUBSTATS = {
  hp: [209, 299],
  atk: [14, 19],
  def: [16, 23],
  hp_: [4.1, 5.8],
  atk_: [4.1, 5.8],
  def_: [5.1, 7.3],
  eleMas: [16, 23],
  enerRech_: [4.5, 6.5],
  critRate_: [2.7, 3.9],
  critDMG_: [5.4, 7.8],
};
const LEVELS = [
  [90, 6],
  [90, 6],
  [90, 6],
  [80, 6],
  [80, 5],
  [70, 5],
  [70, 4],
  [60, 4],
  [50, 3],
  [40, 2],
  [40, 1],
  [20, 1],
  [20, 0],
  [1, 0],
];

function mainStat(slot, element) {
  if (slot === "flower") return "hp";
  if (slot === "plume") return "atk";
  if (slot === "sands") return pick(["atk_", "hp_", "def_", "eleMas", "enerRech_"]);
  if (slot === "circlet") return pick(["critRate_", "critDMG_", "atk_", "hp_", "eleMas", "heal_"]);
  const elemental = element ? `${element.toLowerCase()}_dmg_` : "physical_dmg_";
  return pick([elemental, elemental, elemental, "atk_", "hp_", "def_", "eleMas", "physical_dmg_"]);
}

function artifact(setKey, slot, location, element) {
  const main = mainStat(slot, element);
  const fourStar = random() < 0.15;
  const level = fourStar ? between(0, 16) : pick([20, 20, 20, 16, 12, 8, 4, 0]);
  const keys = Object.keys(SUBSTATS).filter((key) => key !== main);
  const chosen = [];
  while (chosen.length < 4) {
    const key = pick(keys);
    if (!chosen.includes(key)) chosen.push(key);
  }
  // Each stat starts with one roll, and every 4 levels adds one to a random stat.
  const rolls = Object.fromEntries(chosen.map((key) => [key, 1]));
  for (let i = 0; i < Math.floor(level / 4); i++) rolls[pick(chosen)] += 1;
  const substats = chosen.map((key) => {
    const [low, high] = SUBSTATS[key];
    const scale = fourStar ? 0.8 : 1;
    let total = 0;
    for (let i = 0; i < rolls[key]; i++) total += (low + random() * (high - low)) * scale;
    return { key, value: key.endsWith("_") ? Math.round(total * 10) / 10 : Math.round(total) };
  });
  return {
    setKey,
    slotKey: slot,
    level,
    rarity: fourStar ? 4 : 5,
    mainStatKey: main,
    location,
    lock: random() < 0.5,
    substats,
  };
}

function weapon(id, location) {
  const { name, rarity } = weapons[id];
  const maxLevel = rarity <= 2 ? 70 : 90;
  const [level, ascension] = pick(LEVELS.filter(([l]) => l <= maxLevel));
  return {
    key: goodKey(name),
    level,
    ascension,
    refinement: rarity <= 2 ? 1 : between(1, 5),
    location,
    lock: random() < 0.5,
  };
}

/** Slots a set really has: a few sets, like the Prayers, only come as circlets. */
const setSlots = (setId) => SLOTS.filter((slot) => existsSync(`public/artifact-icons/${setId}-${slot}.webp`));
const allSetIds = Object.keys(sets);
const fullSetIds = allSetIds.filter((id) => setSlots(id).length === 5);

// Characters with a known build, so there's always something to look at.
const FULL = ["Mitya", "Valeriy", "Vesna", "Furina", "Traveler"];
const SIGNATURE = { Mitya: "starsealededict" };
const kinds = { full: [], weaponOnly: [], artifactsOnly: [], partial: [], neither: [] };

const characters = [];
const equippedWeapons = [];
const equippedArtifacts = [];

roster.forEach((key, index) => {
  const info = details[key.toLowerCase()] ?? {};
  const [level, ascension] = pick(LEVELS);
  const talentCap = ascension >= 6 ? 10 : Math.max(1, ascension + 1);
  characters.push({
    key,
    level,
    constellation: pick([0, 0, 0, 0, 1, 1, 2, 3, 4, 5, 6, 6]),
    ascension,
    talent: { auto: between(1, talentCap), skill: between(1, talentCap), burst: between(1, talentCap) },
  });

  const kind = FULL.includes(key)
    ? "full"
    : ({ 0: "neither", 1: "weaponOnly", 2: "artifactsOnly", 3: "partial" }[index % 8] ?? "full");
  kinds[kind].push(key);

  if (kind === "full" || kind === "weaponOnly" || kind === "partial") {
    const type = info.weaponType ?? "Sword";
    const fits = Object.keys(weapons).filter((id) => weapons[id].type === type && weapons[id].rarity >= 3);
    equippedWeapons.push(weapon(SIGNATURE[key] ?? pick(fits), key));
  }
  if (kind === "full" || kind === "artifactsOnly" || kind === "partial") {
    const main = pick(fullSetIds);
    const other = pick(fullSetIds);
    // Four and one, or two and two now and then.
    const twoAndTwo = random() < 0.25;
    const slots = kind === "partial" ? SLOTS.slice(0, between(1, 4)) : SLOTS;
    slots.forEach((slot, i) => {
      const fromMain = twoAndTwo ? i < 2 : i < 4;
      const setId = fromMain ? main : other;
      equippedArtifacts.push(artifact(goodKey(sets[setId].name), slot, key, info.element));
    });
  }
});

// A spare of every weapon, and of each piece of every set.
const spareWeapons = Object.keys(weapons).map((id) => weapon(id, ""));
const spareArtifacts = allSetIds.flatMap((id) =>
  setSlots(id).map((slot) => artifact(goodKey(sets[id].name), slot, "", pick(["Pyro", "Hydro", "Cryo", "Electro"])))
);

const data = {
  format: "GOOD",
  version: 3,
  source: "Gacha Savior test data",
  characters,
  artifacts: [...equippedArtifacts, ...spareArtifacts],
  weapons: [...equippedWeapons, ...spareWeapons],
  materials: {
    Mora: 12500000,
    ChildeAndTeucersMoraPouch: 19000,
    HerosWit: 842,
    MysticEnhancementOre: 1500,
    WanderersAdvice: 320,
    AdventurersExperience: 96,
    CrownOfInsight: 12,
    DeliciousFishermansToast: 7,
  },
};

mkdirSync(path.dirname(OUTPUT), { recursive: true });
writeFileSync(OUTPUT, JSON.stringify(data, null, 1) + "\n");
console.log(`Wrote ${OUTPUT}`);
console.log(
  `${characters.length} characters, ${data.weapons.length} weapons (${equippedWeapons.length} equipped), ` +
    `${data.artifacts.length} artifacts (${equippedArtifacts.length} equipped)`
);
for (const [kind, keys] of Object.entries(kinds)) {
  console.log(`${kind} (${keys.length}): ${keys.slice(0, 8).join(", ")}${keys.length > 8 ? ", ..." : ""}`);
}
