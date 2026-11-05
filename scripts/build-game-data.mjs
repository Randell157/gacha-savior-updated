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
import path from "node:path";

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

// What the character page shows beyond the list above: each weapon's flavour
// text, its passive (the text around the numbers, and the numbers at R1 to R5)
// and what's needed to work out its stats at any level, the way genshin-db's
// own stats() does: base value x growth curve at the level + ascension bonus.
// genshin-db doesn't export the raw stats, so they're read from its data file.
const raw = require(path.join(path.dirname(require.resolve("genshin-db")), "min/data.min.json"));
const weaponDetails = {};
const curveNames = new Set();
for (const name of db.weapons("names", { matchCategories: true })) {
  const weapon = db.weapons(name);
  const id = weapon && normalize(weapon.name);
  if (!weapon || weaponDetails[id]) continue;
  const stats = raw.stats.weapons[id];
  if (stats) {
    curveNames.add(stats.curve.attack);
    curveNames.add(stats.curve.specialized);
  }
  weaponDetails[id] = {
    description: weapon.description ?? null,
    passive: weapon.effectName
      ? {
          name: weapon.effectName,
          // Odd entries are the index of the number that goes there.
          parts: weapon.effectTemplateRaw.split(/<color=#[0-9A-F]+>\{(\d+)\}<\/color>/),
          // A few weapons can't be refined, so they only have R1.
          values: [1, 2, 3, 4, 5].map((r) => (weapon[`r${r}`] ?? weapon.r1).values),
        }
      : null,
    // The second stat's name, e.g. "CRIT Rate"; null for 1★ and 2★ weapons.
    substat: weapon.mainStatText ?? null,
    stats: stats
      ? {
          base: stats.base,
          curve: stats.curve,
          // ATK added at each ascension, with the level it applies above.
          promotion: stats.promotion.map((p) => [p.maxlevel, p.attack]),
        }
      : null,
  };
}
const curves = {};
for (const curve of curveNames) {
  curves[curve] = Array.from({ length: 90 }, (_, i) => raw.curve.weapons[i + 1][curve]);
}
writeFileSync(
  "src/data/genshin/weaponDetails.json",
  JSON.stringify({ source: `genshin-db ${version}`, curves, weapons: weaponDetails }) + "\n"
);
const noStats = Object.entries(weaponDetails).filter(([, w]) => !w.stats).map(([id]) => id);
console.log(`Wrote details for ${Object.keys(weaponDetails).length} weapons.${noStats.length ? ` No stats for: ${noStats.join(", ")}` : ""}`);

// The character page's profile: title, description, element, weapon type,
// region and the talent names. Keyed like the roster (normalizeCharacterKey).
// Aether and Lumine stand in for the Traveler, whose talents depend on the element.
const characters = {};
// Regions the game data leaves empty, picked by the site owner.
const REGION_OVERRIDES = {
  alyosha: "Snezhnaya",
  odette: "Snezhnaya",
  sandrone: "Snezhnaya",
  vesna: "Snezhnaya",
  vodyanitsa: "Snezhnaya",
  zibai: "Liyue",
};
for (const name of db.characters("names", { matchCategories: true })) {
  const c = db.characters(name);
  if (!c) continue;
  const key = c.name === "Aether" ? "traveler" : normalize(c.name);
  if (c.name === "Lumine" || c.name === "Manekina") continue;
  const talents = c.name === "Aether" ? undefined : db.talents(c.name);
  characters[key === "manekin" ? "wonderlandmanekin" : key] = {
    name: c.name === "Aether" ? "Traveler" : c.name,
    title: c.title || null,
    description: c.description || null,
    element: c.name === "Aether" ? null : c.elementText || null,
    weaponType: c.weaponText || null,
    region: c.region || REGION_OVERRIDES[key] || null,
    affiliation: c.affiliation || null,
    constellation: c.constellation || null,
    version: c.version || null,
    birthday: c.birthday || null,
    talents: talents
      ? { auto: talents.combat1?.name ?? null, skill: talents.combat2?.name ?? null, burst: talents.combat3?.name ?? null }
      : null,
  };
}
writeFileSync(
  "src/data/genshin/characters.json",
  JSON.stringify({ source: `genshin-db ${version}`, characters }, null, 2) + "\n"
);
console.log(`Wrote ${Object.keys(characters).length} characters.`);

// What the character page and quick view show beyond the profile: talent and
// constellation text, and what's needed to work out base stats at any level
// (base value x growth curve at the level + ascension bonus, as in genshin-db's
// stats(); like weapons, read from its data file). It's large, so the site loads
// it only when one of those opens. Each Traveler element has its own text.
const gameText = (name) => {
  const talents = db.talents(name);
  const constellations = db.constellations(name);
  return {
    talents: talents
      ? ["combat1", "combat2", "combat3"].map((t) => ({ name: talents[t].name, text: talents[t].description }))
      : null,
    constellations: constellations
      ? [1, 2, 3, 4, 5, 6].map((n) => ({ name: constellations[`c${n}`].name, text: constellations[`c${n}`].description }))
      : null,
  };
};
const characterExtras = {};
const noExtras = [];
for (const name of db.characters("names", { matchCategories: true })) {
  const c = db.characters(name);
  if (!c || c.name === "Lumine" || c.name === "Manekina") continue;
  const rawKey = normalize(c.name);
  const key = c.name === "Aether" ? "traveler" : rawKey === "manekin" ? "wonderlandmanekin" : rawKey;
  const stats = raw.stats.characters[rawKey];
  if (!stats) noExtras.push(c.name);
  characterExtras[key] = {
    // The stat this character gains from ascending, e.g. "CRIT Rate".
    substat: c.substatText || null,
    stats: stats
      ? {
          base: { hp: stats.base.hp, attack: stats.base.attack, defense: stats.base.defense },
          curve: stats.curve,
          // Every character's starting CRIT, included in the shown value when CRIT is the ascension stat.
          specializedBase:
            stats.specialized === "FIGHT_PROP_CRITICAL"
              ? stats.base.critrate
              : stats.specialized === "FIGHT_PROP_CRITICAL_HURT"
                ? stats.base.critdmg
                : 0,
          // [level cap, HP, ATK, DEF, ascension stat] added in each ascension phase.
          promotion: stats.promotion.map((p) => [p.maxlevel, p.hp, p.attack, p.defense, p.specialized]),
        }
      : null,
    ...(c.name === "Aether" ? { talents: null, constellations: null } : gameText(c.name)),
  };
}
const travelerElements = {};
for (const element of Object.keys(JSON.parse(readFileSync("src/data/genshin/reactions.json", "utf8")).travelerReactions)) {
  travelerElements[element] = gameText(`Traveler (${element})`);
}
const characterCurveNames = Object.keys(raw.curve.characters[1]);
const characterCurves = {};
for (const curve of characterCurveNames) {
  characterCurves[curve] = Array.from({ length: 100 }, (_, i) => raw.curve.characters[i + 1][curve]);
}
writeFileSync(
  "src/data/genshin/characterExtras.json",
  JSON.stringify({ source: `genshin-db ${version}`, curves: characterCurves, characters: characterExtras, travelerElements }) + "\n"
);
console.log(`Wrote extras for ${Object.keys(characterExtras).length} characters.${noExtras.length ? ` No stats for: ${noExtras.join(", ")}` : ""}`);

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
