import { characterNow, targetFrom } from "@/components/CharacterPlan";
import {
  findPlannedWeapon,
  planCharacter,
  planWeapon,
  type MaterialCosts,
  type Plan,
  type SavedPlan,
} from "@/lib/genshin/materialPlanner";
import type { GenshinData, GoodCharacter, GoodWeapon } from "@/lib/genshin/types";
import { getWeapon, weaponName } from "@/lib/genshin/weapons";
import { formatCharacterDisplayName } from "@/lib/utils";

// Saved plans matched to the upload, shared by the Planner tab and today's farming list.

/** A saved plan matched to the upload: who or what it's for, and what it still needs. */
export interface PlanRow {
  saved: SavedPlan;
  character?: GoodCharacter;
  weapon?: GoodWeapon;
  plan: Plan | null;
}

export function rowsFor(
  saved: SavedPlan[],
  data: GenshinData,
  costs: MaterialCosts | null,
  travelerElement: string | null
): PlanRow[] {
  return saved.map((s) => {
    if (s.kind === "character") {
      const character = data.characters.find((c) => c.key === s.key);
      const plan =
        character && costs
          ? planCharacter(costs, character, targetFrom(s, characterNow(character)), data.materials, travelerElement)
          : null;
      return { saved: s, character, plan };
    }
    const weapon = findPlannedWeapon(data.weapons, s.key, s.location);
    const plan = weapon && costs ? planWeapon(costs, getWeapon(s.key)?.rarity ?? 5, weapon, s.level, data.materials) : null;
    return { saved: s, weapon, plan };
  });
}

export function planName(plan: SavedPlan) {
  return plan.kind === "character" ? formatCharacterDisplayName(plan.key) : weaponName(plan.key);
}
