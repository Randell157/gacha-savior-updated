import splashArt from "@/data/genshin/splashArt.json";
import { rosterKey } from "@/lib/genshinCharacters";

const FILES: Record<string, string> = splashArt;

/**
 * The address of a character's splash art (from HoYoWiki, via
 * `npm run images:splash`), or null when it has none. Takes any roster or
 * GOOD key; every Traveler shares one picture of Aether and Lumine.
 */
export function getSplashArt(key: string): string | null {
  const file = FILES[rosterKey(key)];
  return file ? `/character-splash/${file}` : null;
}
