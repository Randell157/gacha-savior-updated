"use client";

import { useState, type KeyboardEvent } from "react";
import { Plus } from "lucide-react";
import RarityIcon from "@/components/RarityIcon";
import SearchInput from "@/components/SearchInput";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { GoodWeapon } from "@/lib/genshin/types";
import { getWeapon, weaponIcon, weaponName } from "@/lib/genshin/weapons";
import { cn, formatCharacterDisplayName } from "@/lib/utils";

/** How many matches the list shows at once; typing narrows it. */
const LIMIT = 40;

/**
 * "Add a weapon" for the Planner tab: a searchable list of the weapons you
 * own, one entry per holder (and one for unequipped copies), best first.
 * Typing a name and pressing Enter picks the first match.
 */
export default function WeaponPicker({
  triggerRef,
  weapons,
  disabled,
  planned,
  onPick,
}: {
  /** The "Add a weapon" button, so focus can come back to it */
  triggerRef?: React.Ref<HTMLButtonElement>;
  weapons: GoodWeapon[];
  disabled?: boolean;
  /** True for a copy that already has a plan */
  planned: (weapon: GoodWeapon) => boolean;
  onPick: (weapon: GoodWeapon) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  // One entry per weapon and holder; for unequipped copies, the highest level.
  const entries = new Map<string, GoodWeapon>();
  for (const w of weapons) {
    const id = `${w.key}:${w.location ?? ""}`;
    const best = entries.get(id);
    if (!best || w.level > best.level) entries.set(id, w);
  }
  const search = query.trim().toLowerCase();
  // Every word has to match the name or the holder, so "favonius bennett" works.
  const words = search.split(/\s+/).filter(Boolean);
  const matches = [...entries.values()]
    .map((weapon) => ({ weapon, name: weaponName(weapon.key), rarity: getWeapon(weapon.key)?.rarity ?? 0 }))
    .filter(({ name, weapon }) => {
      const text = `${name} ${weapon.location ? formatCharacterDisplayName(weapon.location) : "unequipped"}`.toLowerCase();
      return words.every((word) => text.includes(word));
    })
    .sort((a, b) => b.rarity - a.rarity || a.name.localeCompare(b.name) || b.weapon.level - a.weapon.level);
  const shown = matches.slice(0, LIMIT);
  const first = search ? shown.find(({ weapon }) => !planned(weapon)) : undefined;

  const pick = (weapon: GoodWeapon) => {
    onPick(weapon);
    setOpen(false);
  };
  const pickFirstOnEnter = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter" && first) {
      event.preventDefault();
      pick(first.weapon);
    }
  };

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) setQuery("");
      }}
    >
      <PopoverTrigger asChild>
        <Button ref={triggerRef} type="button" variant="outline" disabled={disabled}>
          <Plus className="mr-1.5 h-4 w-4" aria-hidden="true" />
          Add a weapon
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" collisionPadding={12} className="w-[min(26rem,calc(100vw-1.5rem))] p-3">
        <SearchInput
          value={query}
          onChange={setQuery}
          label="Search weapons or holders"
          onKeyDown={pickFirstOnEnter}
          className="mb-2 sm:w-full"
        />
        <ul
          aria-label="Weapons"
          className="max-h-[min(19rem,calc(var(--radix-popover-content-available-height)-5rem))] overflow-y-auto"
        >
          {shown.length === 0 && (
            <li className="py-6 text-center text-sm text-gray-500 dark:text-slate-400">No weapons match.</li>
          )}
          {shown.map(({ weapon, name, rarity }) => {
            const taken = planned(weapon);
            const holder = weapon.location ? formatCharacterDisplayName(weapon.location) : "Unequipped";
            return (
              <li key={`${weapon.key}:${weapon.location ?? ""}`}>
                <button
                  type="button"
                  disabled={taken}
                  onClick={() => pick(weapon)}
                  className={cn(
                    "flex w-full items-center gap-2.5 rounded-md p-1.5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-indigo-500",
                    taken ? "cursor-not-allowed opacity-50" : "hover:bg-indigo-50 dark:hover:bg-indigo-900/40",
                    first?.weapon === weapon && "bg-indigo-50 ring-2 ring-inset ring-indigo-500 dark:bg-indigo-900/40"
                  )}
                >
                  <RarityIcon src={weaponIcon(weapon.key)} rarity={rarity || undefined} size={36} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-gray-900 dark:text-slate-100">{name}</span>
                    <span className="block truncate text-xs text-gray-600 dark:text-slate-400">
                      Lv {weapon.level} · {holder}
                      {taken && " · in your planner"}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
          {matches.length > LIMIT && (
            <li className="px-1.5 pt-2 text-xs text-gray-500 dark:text-slate-400">
              {matches.length - LIMIT} more. Type to narrow the list.
            </li>
          )}
        </ul>
      </PopoverContent>
    </Popover>
  );
}
