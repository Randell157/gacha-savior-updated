"use client";

import { getCharacterDetails, getCharacterRoles } from "@/lib/genshin/characterDetails";
import { cn } from "@/lib/utils";

export const ELEMENTS = ["Anemo", "Geo", "Electro", "Dendro", "Hydro", "Pyro", "Cryo"];
export const WEAPON_TYPES = ["Sword", "Claymore", "Polearm", "Bow", "Catalyst"];
export const RARITIES = ["5", "4"];
export const ROLES = ["Main DPS", "Sub-DPS", "Support", "Healer", "Shielder"];
/** Characters with no region in the game data are listed under "Other". */
export const REGIONS = ["Mondstadt", "Liyue", "Inazuma", "Sumeru", "Fontaine", "Natlan", "Nod-Krai", "Snezhnaya", "Other"];

/** Chip colours per element, the same pairs as the character page's element chip. */
const ELEMENT_CHIP: Record<string, string> = {
  Anemo: "bg-teal-100 text-teal-800 dark:bg-teal-900/40 dark:text-teal-200 ring-teal-500",
  Geo: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200 ring-amber-500",
  Electro: "bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-200 ring-purple-500",
  Dendro: "bg-lime-100 text-lime-800 dark:bg-lime-900/40 dark:text-lime-200 ring-lime-600",
  Hydro: "bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-200 ring-sky-500",
  Pyro: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200 ring-red-500",
  Cryo: "bg-cyan-100 text-cyan-800 dark:bg-cyan-900/40 dark:text-cyan-200 ring-cyan-500",
};

/** The chosen values in each group; an empty group means any. */
export interface CharacterFilterState {
  element: string[];
  weapon: string[];
  rarity: string[];
  role: string[];
  region: string[];
}

export const NO_FILTERS: CharacterFilterState = { element: [], weapon: [], rarity: [], role: [], region: [] };

export function activeFilterCount(filters: CharacterFilterState): number {
  return Object.values(filters).reduce((n, values) => n + values.length, 0);
}

/**
 * Whether a roster character matches: any chosen value within a group
 * (Pyro or Hydro), and every group with a choice (Pyro and Sword).
 */
export function matchesCharacterFilters(
  character: { key: string; rarity: number },
  filters: CharacterFilterState
): boolean {
  const details = getCharacterDetails(character.key);
  const checks: [string[], string[]][] = [
    [filters.element, details?.element ? [details.element] : []],
    [filters.weapon, details?.weaponType ? [details.weaponType] : []],
    [filters.rarity, [String(character.rarity)]],
    [filters.role, getCharacterRoles(character.key)],
    [filters.region, [details?.region ?? "Other"]],
  ];
  return checks.every(([chosen, values]) => chosen.length === 0 || chosen.some((v) => values.includes(v)));
}

/**
 * The filter chips above the roster: one row per group, the label in its own
 * column so chips that wrap stay lined up, and "Clear filters" once any is set.
 */
export default function CharacterFilters({
  filters,
  onChange,
}: {
  filters: CharacterFilterState;
  onChange: (filters: CharacterFilterState) => void;
}) {
  const toggle = (group: keyof CharacterFilterState, value: string) => {
    const chosen = filters[group];
    onChange({
      ...filters,
      [group]: chosen.includes(value) ? chosen.filter((v) => v !== value) : [...chosen, value],
    });
  };
  const count = activeFilterCount(filters);
  const rows: { group: keyof CharacterFilterState; label: string; values: string[]; text?: (v: string) => string }[] = [
    { group: "element", label: "Element", values: ELEMENTS },
    { group: "weapon", label: "Weapon", values: WEAPON_TYPES },
    { group: "rarity", label: "Rarity", values: RARITIES, text: (v) => `${v}★` },
    { group: "role", label: "Playstyle", values: ROLES },
    { group: "region", label: "Region", values: REGIONS },
  ];
  return (
    <div className="mb-6 rounded-lg border border-gray-200 dark:border-slate-700 p-4 sm:p-5">
      <div className="space-y-3">
        {rows.map(({ group, label, values, text }) => (
          <div
            key={group}
            role="group"
            aria-label={`Filter by ${label.toLowerCase()}`}
            className="grid grid-cols-1 items-start gap-x-3 gap-y-1.5 sm:grid-cols-[6.5rem_1fr]"
          >
            <span className="text-sm font-bold text-gray-800 dark:text-slate-200 sm:pt-1.5">{label}</span>
            <div className="flex flex-wrap gap-2">
              {values.map((value) => {
                const pressed = filters[group].includes(value);
                return (
                  <button
                    key={value}
                    type="button"
                    aria-pressed={pressed}
                    onClick={() => toggle(group, value)}
                    className={cn(
                      "rounded-full px-3 py-1 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500",
                      group === "element"
                        ? cn(ELEMENT_CHIP[value], pressed && "ring-2 ring-offset-1 dark:ring-offset-slate-900")
                        : pressed
                          ? "bg-indigo-600 text-white"
                          : "bg-gray-100 text-gray-700 hover:bg-indigo-50 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-indigo-900/40"
                    )}
                  >
                    {text ? text(value) : value}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
      {count > 0 && (
        <div className="mt-4 border-t border-gray-200 dark:border-slate-700 pt-3">
          <button
            type="button"
            onClick={() => onChange(NO_FILTERS)}
            className="text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:underline underline-offset-2"
          >
            Clear filters ({count})
          </button>
        </div>
      )}
    </div>
  );
}
