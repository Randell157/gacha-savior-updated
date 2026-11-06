import materialNames from "@/data/genshin/materialNames.json";
import { formatMaterialDisplayName } from "@/lib/utils";

const NAMES: Record<string, string> = materialNames.names;

const id = (key: string) => key.toLowerCase().replace(/[^a-z0-9]/g, "");

/**
 * A material's in-game name, e.g. "Hero's Wit" for the key "HerosWit". The food
 * variants aren't listed, so "DeliciousFishermansToast" looks up the plain dish.
 * Names that have no punctuation aren't listed either, and space out correctly.
 */
export function materialName(key: string): string {
  const exact = NAMES[id(key)];
  if (exact) return exact;
  const variant = key.match(/^(Delicious|Suspicious)(.+)$/);
  const dish = variant && NAMES[id(variant[2])];
  return dish ? `${variant[1]} ${dish}` : formatMaterialDisplayName(key);
}
