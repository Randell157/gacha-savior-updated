"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { activeFilterCount, NO_FILTERS, type CharacterFilterState } from "@/lib/genshin/roster";
import { ClearFilters, FilterChip, RARITY_CHIP, WEAPON_TYPES } from "@/components/FilterChip";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

export const ELEMENTS = ["Anemo", "Geo", "Electro", "Dendro", "Hydro", "Pyro", "Cryo"];
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

/** Groups where choosing a chip replaces the current one, since a character only has one of each. */
const SINGLE_CHOICE: (keyof CharacterFilterState)[] = ["element", "weapon", "rarity"];

type Group = keyof CharacterFilterState;

const GROUPS: { group: Group; label: string; values: string[]; text?: (v: string) => string; colors?: Record<string, string> }[] = [
  { group: "element", label: "Element", values: ELEMENTS, colors: ELEMENT_CHIP },
  { group: "weapon", label: "Weapon", values: WEAPON_TYPES },
  { group: "rarity", label: "Rarity", values: RARITIES, text: (v) => `${v}★`, colors: RARITY_CHIP },
  { group: "role", label: "Playstyle", values: ROLES },
  { group: "region", label: "Region", values: REGIONS },
];
const groupInfo = (group: Group) => GROUPS.find((g) => g.group === group)!;

/** A tick-box menu for the groups that allow several choices (Playstyle, Region, Tags). */
function FilterMenu({
  label,
  values,
  counts,
  chosen,
  onToggle,
}: {
  label: string;
  values: string[];
  /** How many characters have each value, shown beside it */
  counts?: Map<string, number>;
  chosen: string[];
  onToggle: (value: string) => void;
}) {
  const summary = chosen.length > 2 ? `${chosen.length} selected` : chosen.join(", ");
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          className={cn(chosen.length > 0 && "border-indigo-500 text-indigo-700 dark:text-indigo-300")}
        >
          {label}
          {summary && `: ${summary}`}
          <ChevronDown className="ml-2 h-4 w-4" aria-hidden />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        {values.map((value) => (
          <DropdownMenuCheckboxItem
            key={value}
            checked={chosen.includes(value)}
            onCheckedChange={() => onToggle(value)}
            // Stay open, so several can be ticked in a row.
            onSelect={(event) => event.preventDefault()}
          >
            <span className="flex-1">{value}</span>
            {counts?.has(value) && (
              <span className="ml-4 text-xs tabular-nums text-gray-500 dark:text-slate-400">
                {counts.get(value)}
                <span className="sr-only">{counts.get(value) === 1 ? " character" : " characters"}</span>
              </span>
            )}
          </DropdownMenuCheckboxItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/**
 * The filters above the roster. From the `sm` breakpoint up: Element, Weapon and
 * Rarity as chips, Playstyle and Region as tick-box menus. On phones, where all
 * that would push the portraits far down, a Filters button opens the same
 * filters as labeled chip rows.
 */
export default function CharacterFilters({
  filters,
  onChange,
  tags = [],
}: {
  filters: CharacterFilterState;
  onChange: (filters: CharacterFilterState) => void;
  /** The player's tags on owned characters, with counts; the Tags filter shows only when there are some */
  tags?: { tag: string; count: number }[];
}) {
  const tagValues = tags.map(({ tag }) => tag);
  const tagCounts = new Map(tags.map(({ tag, count }) => [tag, count]));
  const [phoneOpen, setPhoneOpen] = useState(false);
  const toggle = (group: Group, value: string) => {
    const chosen = filters[group];
    const others = SINGLE_CHOICE.includes(group) ? [] : chosen;
    onChange({
      ...filters,
      [group]: chosen.includes(value) ? chosen.filter((v) => v !== value) : [...others, value],
    });
  };
  const count = activeFilterCount(filters);
  const clear = () => onChange(NO_FILTERS);
  const chips = (group: Group) => {
    const { label, values, text, colors } = groupInfo(group);
    return (
      <div role="group" aria-label={`Filter by ${label.toLowerCase()}`} className="flex flex-wrap gap-2">
        {values.map((value) => (
          <FilterChip
            key={value}
            pressed={filters[group].includes(value)}
            onClick={() => toggle(group, value)}
            colors={colors?.[value]}
          >
            {text ? text(value) : value}
          </FilterChip>
        ))}
      </div>
    );
  };

  return (
    <div className="mb-6">
      <div className="hidden space-y-3 sm:block">
        {chips("element")}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          {chips("weapon")}
          <span className="h-5 w-px bg-gray-200 dark:bg-slate-700" aria-hidden />
          {chips("rarity")}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <FilterMenu label="Playstyle" values={ROLES} chosen={filters.role} onToggle={(v) => toggle("role", v)} />
          <FilterMenu label="Region" values={REGIONS} chosen={filters.region} onToggle={(v) => toggle("region", v)} />
          {tagValues.length > 0 && (
            <FilterMenu
              label="Tags"
              values={tagValues}
              counts={tagCounts}
              chosen={filters.tags}
              onToggle={(v) => toggle("tags", v)}
            />
          )}
          <ClearFilters count={count} onClick={clear} />
        </div>
      </div>

      <div className="sm:hidden">
        <div className="flex flex-wrap items-center gap-3">
          <Button
            variant="outline"
            aria-expanded={phoneOpen}
            onClick={() => setPhoneOpen((open) => !open)}
            className={cn(count > 0 && "border-indigo-500 text-indigo-700 dark:text-indigo-300")}
          >
            Filters{count > 0 && ` (${count})`}
            <ChevronDown className={cn("ml-2 h-4 w-4 transition-transform duration-150 ease-out-strong motion-reduce:transition-none", phoneOpen && "rotate-180")} aria-hidden />
          </Button>
          <ClearFilters count={count} onClick={clear} />
        </div>
        {phoneOpen && (
          <div className="mt-3 space-y-3 rounded-lg border border-gray-200 p-4 dark:border-slate-700">
            {GROUPS.map(({ group, label }) => (
              <div key={group} className="space-y-1.5">
                <span className="text-sm font-bold text-gray-800 dark:text-slate-200">{label}</span>
                {chips(group)}
              </div>
            ))}
            {tagValues.length > 0 && (
              <div className="space-y-1.5">
                <span className="text-sm font-bold text-gray-800 dark:text-slate-200">Tags</span>
                <div role="group" aria-label="Filter by tag" className="flex flex-wrap gap-2">
                  {tagValues.map((tag) => (
                    <FilterChip key={tag} pressed={filters.tags.includes(tag)} onClick={() => toggle("tags", tag)}>
                      {tag}
                    </FilterChip>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
