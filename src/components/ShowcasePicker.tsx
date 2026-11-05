"use client";

import { useState, type KeyboardEvent } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import SearchInput from "@/components/SearchInput";
import { getCharacterPortrait, getCharacterRarity, rarityBackground } from "@/lib/genshinCharacters";
import { cn, formatCharacterDisplayName } from "@/lib/utils";

/**
 * A showcase slot's character picker: a small grid of portraits under the slot's
 * button. The search box has focus as soon as it opens, so typing a name and
 * pressing Enter picks the first match. Characters in other slots stay in the
 * grid, greyed out, so nobody wonders where they went.
 */
export default function ShowcasePicker({
  slot,
  value,
  characterKeys,
  showcaseKeys,
  onChange,
}: {
  /** 0-based position of this slot */
  slot: number;
  value: string | null;
  /** Every owned character's GOOD key */
  characterKeys: string[];
  showcaseKeys: (string | null)[];
  onChange: (characterKey: string | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const search = query.trim().toLowerCase();
  const matches = characterKeys
    .map((key) => ({ key, name: formatCharacterDisplayName(key) }))
    .filter(({ name }) => name.toLowerCase().includes(search))
    .sort((a, b) => a.name.localeCompare(b.name));
  const slotHolding = (key: string) => showcaseKeys.findIndex((k, i) => k === key && i !== slot);
  const firstPick = search ? matches.find(({ key }) => slotHolding(key) < 0) : undefined;

  const choose = (key: string | null) => {
    onChange(key);
    setOpen(false);
  };
  const pickFirstOnEnter = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter" && firstPick) {
      event.preventDefault();
      choose(firstPick.key);
    }
  };

  const action = value ? "Change" : "Choose";
  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) setQuery("");
      }}
    >
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          aria-label={`${action} character for slot ${slot + 1}`}
          className="mt-auto h-9 w-full text-xs"
        >
          {action} character
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        collisionPadding={12}
        className="w-[min(26rem,calc(100vw-1.5rem))] p-3"
      >
        <div className="mb-2 flex items-center gap-3">
          <SearchInput
            value={query}
            onChange={setQuery}
            label="Search characters"
            onKeyDown={pickFirstOnEnter}
            className="min-w-0 flex-1 sm:w-auto"
          />
          {value && (
            <button
              type="button"
              onClick={() => choose(null)}
              className="shrink-0 rounded text-sm font-medium text-indigo-600 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:text-indigo-300"
            >
              Clear slot
            </button>
          )}
        </div>
        <div
          role="group"
          aria-label="Characters"
          className="max-h-[min(19rem,calc(var(--radix-popover-content-available-height)-5rem))] overflow-y-auto"
        >
          {matches.length === 0 ? (
            <p className="py-6 text-center text-sm text-gray-500 dark:text-slate-400">No characters match.</p>
          ) : (
            <div className="grid grid-cols-4 gap-1 sm:grid-cols-5">
              {matches.map(({ key, name }) => {
                const heldBy = slotHolding(key);
                const taken = heldBy >= 0;
                return (
                  <button
                    key={key}
                    type="button"
                    disabled={taken}
                    aria-pressed={key === value}
                    title={taken ? `${name} is in slot ${heldBy + 1}` : name}
                    onClick={() => choose(key)}
                    className={cn(
                      "flex min-w-0 flex-col items-center rounded-lg p-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-indigo-500",
                      taken ? "cursor-not-allowed" : "hover:bg-indigo-50 dark:hover:bg-indigo-900/40",
                      (key === value || key === firstPick?.key) &&
                        "bg-indigo-50 ring-2 ring-inset ring-indigo-500 dark:bg-indigo-900/40"
                    )}
                  >
                    <span
                      className={cn(
                        "relative h-14 w-14 overflow-hidden rounded-lg",
                        rarityBackground(getCharacterRarity(key)),
                        taken && "opacity-40 grayscale"
                      )}
                    >
                      <Image
                        src={getCharacterPortrait(key)}
                        alt=""
                        fill
                        sizes="56px"
                        className="object-cover"
                        onError={(e) => {
                          e.currentTarget.onerror = null;
                          e.currentTarget.src = "/placeholder.svg";
                        }}
                      />
                    </span>
                    <span
                      className={cn(
                        "mt-1 line-clamp-2 w-full text-center text-[0.7rem] font-medium leading-tight [overflow-wrap:anywhere]",
                        taken ? "text-gray-500 dark:text-slate-400" : "text-gray-800 dark:text-slate-200"
                      )}
                    >
                      {name}
                    </span>
                    {taken && <span className="sr-only">, in slot {heldBy + 1}</span>}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
