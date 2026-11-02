import type { GenshinData, GoodArtifact } from "@/lib/genshin/types";
import type { Showcase } from "@/lib/genshin/firestoreStore";

/**
 * A small made-up account for the dashboard preview on /features. It goes
 * through the same `Genshin` component as a real upload, so the preview
 * always matches the real dashboard.
 */

const SLOTS = [
  { slotKey: "flower", mainStatKey: "hp" },
  { slotKey: "plume", mainStatKey: "atk" },
  { slotKey: "sands", mainStatKey: "atk_" },
  { slotKey: "goblet", mainStatKey: "atk_" },
  { slotKey: "circlet", mainStatKey: "critDMG_" },
];

/** Five level-20 pieces of one set, worn by `location`. */
function artifactSet(setKey: string, location: string): GoodArtifact[] {
  return SLOTS.map(({ slotKey, mainStatKey }) => ({
    setKey,
    slotKey,
    mainStatKey,
    level: 20,
    rarity: 5,
    location,
    lock: true,
    substats: [
      { key: "critRate_", value: 7.0 },
      { key: "critDMG_", value: 14.8 },
      { key: "atk_", value: 5.8 },
      { key: "enerRech_", value: 6.5 },
    ],
  }));
}

export const SAMPLE_GENSHIN_DATA: GenshinData = {
  format: "GOOD",
  version: 2,
  source: "Sample",
  characters: [
    { key: "Ganyu", level: 90, constellation: 2, ascension: 6, talent: { auto: 10, skill: 8, burst: 9 } },
    { key: "Diluc", level: 90, constellation: 1, ascension: 6, talent: { auto: 9, skill: 8, burst: 8 } },
    { key: "Venti", level: 80, constellation: 0, ascension: 5, talent: { auto: 6, skill: 8, burst: 9 } },
    { key: "Keqing", level: 80, constellation: 3, ascension: 5, talent: { auto: 8, skill: 8, burst: 8 } },
    { key: "KaedeharaKazuha", level: 90, constellation: 0, ascension: 6, talent: { auto: 1, skill: 9, burst: 9 } },
    { key: "Bennett", level: 80, constellation: 6, ascension: 5, talent: { auto: 1, skill: 8, burst: 10 } },
    { key: "Xingqiu", level: 80, constellation: 6, ascension: 5, talent: { auto: 1, skill: 9, burst: 9 } },
    { key: "Xiangling", level: 80, constellation: 6, ascension: 5, talent: { auto: 1, skill: 8, burst: 10 } },
  ],
  weapons: [
    { key: "AmosBow", level: 90, refinement: 1, location: "Ganyu" },
    { key: "WolfsGravestone", level: 90, refinement: 1, location: "Diluc" },
    { key: "SkywardHarp", level: 80, refinement: 2, location: "Venti" },
    { key: "PrimordialJadeCutter", level: 80, refinement: 1, location: "Keqing" },
    { key: "FreedomSworn", level: 90, refinement: 1, location: "KaedeharaKazuha" },
    { key: "AquilaFavonia", level: 70, refinement: 1, location: "Bennett" },
    { key: "SacrificialSword", level: 80, refinement: 5, location: "Xingqiu" },
    { key: "TheCatch", level: 80, refinement: 5, location: "Xiangling" },
    { key: "LostPrayerToTheSacredWinds", level: 60, refinement: 1 },
    { key: "FavoniusWarbow", level: 40, refinement: 3 },
    { key: "SacrificialGreatsword", level: 20, refinement: 2 },
    { key: "DullBlade", level: 1, refinement: 1 },
  ],
  artifacts: [
    ...artifactSet("BlizzardStrayer", "Ganyu"),
    ...artifactSet("CrimsonWitchOfFlames", "Diluc"),
    ...artifactSet("ViridescentVenerer", "Venti"),
    ...artifactSet("ThunderingFury", "Keqing"),
  ],
  materials: {
    Mora: 5_000_000,
    HerosWit: 500,
    MysticEnhancementOre: 1_000,
    PhilosophiesOfFreedom: 12,
    CrownOfInsight: 3,
  },
};

export const SAMPLE_SHOWCASE: Showcase = ["Ganyu", "Diluc", "Venti", "Keqing", null];
