import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Known two-word character display names (normalized key -> "First Second") */
const CHARACTER_DISPLAY_NAMES: Record<string, string> = {
  hutao: "Hu Tao",
  kamisatoayaka: "Kamisato Ayaka",
  raidenshogun: "Raiden Shogun",
  yaemiko: "Yae Miko",
  yunjin: "Yun Jin",
  kukishinobu: "Kuki Shinobu",
  kujousara: "Kujou Sara",
  shikanoinheizou: "Shikanoin Heizou",
  kaedeharakazuha: "Kaedehara Kazuha",
  sangonomiyakokomi: "Sangonomiya Kokomi",
  kamisatoayato: "Kamisato Ayato",
  aratakiitto: "Arataki Itto",
  lanyan: "Lan Yan",
  yumemizukimizuki: "Yumemizuki Mizuki",
  wonderlandmanekin: "Wonderland Manekin",
}

/** Display name for character keys: two-word names get a space (e.g. "Hu_Tao" or "HuTao" → "Hu Tao") */
export function formatCharacterDisplayName(key: string): string {
  if (!key || typeof key !== "string") return key
  const normalized = key.toLowerCase().replace(/\s+/g, "").replace(/_/g, "")
  if (CHARACTER_DISPLAY_NAMES[normalized]) return CHARACTER_DISPLAY_NAMES[normalized]
  return formatKeyWithSpaces(key)
}

/** Words a title keeps in lowercase; export keys capitalize every word ("A Huge Bag Of Mora"). */
const MINOR_WORDS = new Set(["a", "an", "and", "at", "for", "from", "in", "of", "on", "or", "the", "to", "with"])

/** Replaces underscores with spaces and splits camelCase (e.g. "EmblemOfSeveredFate" → "Emblem Of Severed Fate") */
export function formatKeyWithSpaces(key: string): string {
  if (!key || typeof key !== "string") return key
  return key
    .replace(/_/g, " ")
    .replace(/([A-Z])/g, " $1")
    .trim()
    .replace(/\s+/g, " ")
}

/** Display name for weapon keys */
export function formatWeaponDisplayName(key: string): string {
  return formatKeyWithSpaces(key)
}

/** Display name for artifact set keys */
export function formatArtifactSetDisplayName(setKey: string): string {
  return formatKeyWithSpaces(setKey)
}

/** Display name for material keys */
export function formatMaterialDisplayName(key: string): string {
  return formatKeyWithSpaces(key)
    .split(" ")
    .map((word, index) => (index > 0 && MINOR_WORDS.has(word.toLowerCase()) ? word.toLowerCase() : word))
    .join(" ")
}

const CHARACTER_ICON_SPECIAL_NAMES: Record<string, string> = {
  kaedeharakazuha: "Kaedehara_Kazuha",
  hutao: "Hu_Tao",
  ayaka: "Kamisato_Ayaka",
  raidenshogun: "Raiden_Shogun",
  yaemiko: "Yae_Miko",
  yunjin: "Yun_Jin",
  kukishinobu: "Kuki_Shinobu",
  kujousara: "Kujou_Sara",
  shikanoinheizou: "Shikanoin_Heizou",
}

export function formatCharacterIconFilename(characterKey: string): string {
  const lowerCaseKey = characterKey.toLowerCase().replace(/\s+/g, "")
  if (lowerCaseKey.startsWith("traveler")) return "Aether_Icon.png"
  if (lowerCaseKey in CHARACTER_ICON_SPECIAL_NAMES) {
    return `${CHARACTER_ICON_SPECIAL_NAMES[lowerCaseKey]}_Icon.png`
  }
  return `${characterKey.replace(/\s+/g, "_")}_Icon.png`
}

/** An upload's date and time to the minute, such as "Nov 5, 2026, 3:42 PM". */
export function formatUploadTime(date: Date): string {
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

/** Compares game versions numerically, so "4.10" sorts after "4.6". */
export function compareVersions(a: string, b: string): number {
  const [aMajor, aMinor = 0] = a.split(".").map(Number);
  const [bMajor, bMinor = 0] = b.split(".").map(Number);
  return aMajor - bMajor || aMinor - bMinor;
}
