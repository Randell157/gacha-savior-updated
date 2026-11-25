"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import costs from "@/data/genshin/materialCosts.json";
import { rowsFor } from "@/components/plannerRows";
import RarityIcon from "@/components/RarityIcon";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { useGenshinData } from "@/hooks/useGenshinData";
import { useRememberedState } from "@/hooks/useRememberedState";
import { showArtifactSet } from "@/lib/genshin/artifactFilters";
import { artifactSetId } from "@/lib/genshin/artifactSets";
import { normalizeMaterialKey, type MaterialCosts } from "@/lib/genshin/materialPlanner";
import { addRecent, searchItemKey, searchItems, type SearchItem } from "@/lib/genshin/search";
import { searchIndex } from "@/lib/genshin/searchIndex";
import type { GenshinData } from "@/lib/genshin/types";
import { weaponId } from "@/lib/genshin/weapons";
import { rosterKey } from "@/lib/genshinCharacters";
import { formatCharacterDisplayName } from "@/lib/utils";

const SEARCH_COSTS = costs as unknown as MaterialCosts;

/** What the account has of each item, for the right-hand side of a result ("C2 · Lv 90"). */
function ownedDetails(data: GenshinData | null) {
  const characters = new Map<string, { key: string; text: string }>();
  const weapons = new Map<string, { level: number; refinement: number }[]>();
  const sets = new Map<string, number>();
  const materials = new Map<string, number>();
  if (data) {
    for (const c of data.characters) {
      characters.set(rosterKey(c.key), { key: c.key, text: `C${c.constellation ?? 0} · Lv ${c.level}` });
    }
    for (const w of data.weapons) {
      const list = weapons.get(weaponId(w.key)) ?? [];
      list.push({ level: w.level, refinement: w.refinement });
      weapons.set(weaponId(w.key), list);
    }
    for (const a of data.artifacts) sets.set(artifactSetId(a.setKey), (sets.get(artifactSetId(a.setKey)) ?? 0) + 1);
    for (const [key, count] of Object.entries(data.materials)) materials.set(normalizeMaterialKey(key), count);
  }
  return {
    character: (id: string) => characters.get(rosterKey(id)),
    text(item: SearchItem): string | null {
      if (!data) return null;
      if (item.kind === "character") return characters.get(rosterKey(item.id))?.text ?? null;
      if (item.kind === "weapon") {
        const copies = weapons.get(item.id);
        if (!copies) return null;
        return copies.length > 1 ? `${copies.length} copies` : `R${copies[0].refinement} · Lv ${copies[0].level}`;
      }
      if (item.kind === "set") {
        const count = sets.get(item.id);
        return count ? `${count.toLocaleString()} ${count === 1 ? "piece" : "pieces"}` : null;
      }
      const count = materials.get(item.id);
      return count ? `${count.toLocaleString()} owned` : null;
    },
    materialCount: (id: string) => materials.get(id) ?? 0,
  };
}

/**
 * The quick search dialog (design "A" for all five choices in
 * `.mockups/quick-search.html`): one box for every character, weapon, artifact
 * set and material, grouped by kind, up to five each. Characters and weapons
 * open their pages; a set opens Artifacts filtered to it; a material shows a
 * panel here (how many you have, where it drops, which plans need it). With
 * nothing typed it lists the last four things opened, kept on this device.
 */
export default function QuickSearchDialog({
  open,
  onOpenChange,
  onCloseFocus,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Puts focus back where it was when the search opened (the dialog has no trigger of its own) */
  onCloseFocus: () => void;
}) {
  const router = useRouter();
  const { data, plans, travelerElement } = useGenshinData();
  const [query, setQuery] = useState("");
  const input = useRef<HTMLInputElement>(null);
  const [material, setMaterial] = useState<SearchItem | null>(null);
  const [recent, setRecent] = useRememberedState<string[]>("search:recent", [], "device");
  const items = searchIndex();
  const owned = useMemo(() => ownedDetails(data), [data]);
  const groups = useMemo(() => searchItems(items, query), [items, query]);
  const recentItems = useMemo(
    () =>
      recent
        .map((key) => items.find((item) => searchItemKey(item) === key))
        .filter((item): item is SearchItem => item !== undefined),
    [items, recent]
  );

  const close = () => {
    onOpenChange(false);
    setQuery("");
    setMaterial(null);
  };

  const choose = (item: SearchItem) => {
    setRecent((list) => addRecent(list, searchItemKey(item)));
    if (item.kind === "material") {
      setMaterial(item);
      return;
    }
    close();
    if (item.kind === "character") {
      // A character you have opens by the export's own key, which the page matches exactly.
      const key = owned.character(item.id)?.key ?? item.id;
      router.push(`/genshin/characters/${encodeURIComponent(key)}`);
    } else if (item.kind === "weapon") {
      router.push(`/genshin/weapons/${encodeURIComponent(item.id)}`);
    } else {
      showArtifactSet(item.id);
      router.push("/genshin/artifacts");
    }
  };

  const result = (item: SearchItem) => {
    const have = owned.text(item);
    return (
      <CommandItem key={searchItemKey(item)} value={searchItemKey(item)} onSelect={() => choose(item)}>
        <RarityIcon src={item.icon} rarity={item.rarity ?? 1} size={32} />
        <span className="min-w-0 flex-1">
          <span className="block truncate font-medium text-gray-900 dark:text-slate-100">{item.name}</span>
          {item.sub && <span className="block truncate text-xs text-gray-600 dark:text-slate-400">{item.sub}</span>}
        </span>
        {have && <span className="ml-auto shrink-0 whitespace-nowrap text-xs text-gray-600 dark:text-slate-400">{have}</span>}
      </CommandItem>
    );
  };

  return (
    <Dialog open={open} onOpenChange={(next) => (next ? onOpenChange(true) : close())}>
      <DialogContent
        onCloseAutoFocus={(event) => {
          event.preventDefault();
          onCloseFocus();
        }}
        className="top-2 max-w-[calc(100%-1rem)] translate-y-0 gap-0 overflow-hidden p-0 data-[state=closed]:slide-out-to-top-2 data-[state=open]:slide-in-from-top-2 sm:top-[4.5rem] sm:max-w-[640px] sm:rounded-xl">
        <DialogTitle className="sr-only">Search</DialogTitle>
        <DialogDescription className="sr-only">
          Find a character, weapon, artifact set or material. Use the arrow keys to move and Enter to open.
        </DialogDescription>
        {material ? (
          <MaterialPanel item={material} count={owned.materialCount(material.id)} signedIn={!!data} onBack={() => setMaterial(null)} onClose={close} plans={plans} data={data} travelerElement={travelerElement} />
        ) : (
          <Command shouldFilter={false} loop label="Search">
            <CommandInput
              ref={input}
              value={query}
              onValueChange={setQuery}
              placeholder="Search characters, weapons, sets, materials"
              className="pr-8"
            />
            <CommandList>
              {query.trim() ? (
                <>
                  <CommandEmpty>No results for &ldquo;{query.trim()}&rdquo;.</CommandEmpty>
                  {groups.map((group) => (
                    <CommandGroup key={group.kind} heading={group.label}>
                      {group.items.map(result)}
                      {group.more > 0 && (
                        <p className="px-2 pb-1 text-xs text-gray-600 dark:text-slate-400">
                          {group.more} more; keep typing to narrow it down
                        </p>
                      )}
                    </CommandGroup>
                  ))}
                </>
              ) : recentItems.length > 0 ? (
                <CommandGroup heading="Recently opened">{recentItems.map(result)}</CommandGroup>
              ) : (
                <p className="px-4 py-6 text-center text-sm text-gray-600 dark:text-slate-400">
                  Type a character, weapon, artifact set or material.
                </p>
              )}
            </CommandList>
            {/* Below the list of results (a listbox holds only options), so Tab from the box reaches it and the arrows skip it. */}
            {!query.trim() && recentItems.length > 0 && (
              <div className="flex justify-end px-3 pb-2">
                <button
                  type="button"
                  // The search's own Enter would also open the highlighted result.
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") event.stopPropagation();
                  }}
                  onClick={() => {
                    setRecent([]);
                    input.current?.focus();
                  }}
                  className="relative rounded-md px-1 text-xs font-medium text-indigo-700 after:absolute after:-inset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:text-indigo-300"
                >
                  Clear recent history
                </button>
              </div>
            )}
            <div className="hidden gap-4 border-t px-4 py-2 text-xs text-gray-600 dark:text-slate-400 sm:flex">
              <span>↑ ↓ to move</span>
              <span>Enter to open</span>
              <span>Esc to close</span>
            </div>
          </Command>
        )}
      </DialogContent>
    </Dialog>
  );
}

function MaterialPanel({
  item,
  count,
  signedIn,
  plans,
  data,
  travelerElement,
  onBack,
  onClose,
}: {
  item: SearchItem;
  count: number;
  signedIn: boolean;
  plans: ReturnType<typeof useGenshinData>["plans"];
  data: GenshinData | null;
  travelerElement: string | null;
  onBack: () => void;
  onClose: () => void;
}) {
  // Which saved plans need this material, and how many of it.
  const needs = data
    ? rowsFor(plans, data, SEARCH_COSTS, travelerElement).flatMap((row) => {
        const line = row.plan?.materials.find((m) => m.key === item.id);
        if (!line || line.need <= 0) return [];
        const who =
          row.saved.kind === "character"
            ? formatCharacterDisplayName(row.saved.key)
            : weaponLabel(row.saved.key, row.saved.location);
        return [{ who, need: line.need }];
      })
    : [];
  return (
    <div className="p-4">
      <button
        type="button"
        onClick={onBack}
        className="mb-3 inline-flex items-center gap-1 rounded-md text-sm font-medium text-indigo-700 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:text-indigo-300"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Back to results
      </button>
      <div className="flex items-center gap-3">
        <RarityIcon src={item.icon} rarity={item.rarity ?? 1} size={48} />
        <div>
          <p className="font-semibold text-gray-900 dark:text-slate-100">{item.name}</p>
          <p className="text-xs text-gray-600 dark:text-slate-400">
            {signedIn ? (count ? `${count.toLocaleString()} owned` : "None in your last upload") : "Log in to see how many you have"}
          </p>
        </div>
      </div>
      <dl className="mt-3 grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-1 text-sm">
        {item.sub && (
          <>
            <dt className="text-gray-600 dark:text-slate-400">Farm at</dt>
            <dd>{item.sub}</dd>
          </>
        )}
        {signedIn && (
          <>
            <dt className="text-gray-600 dark:text-slate-400">Your plans</dt>
            <dd>
              {needs.length
                ? needs.map((n) => `${n.who} needs ${n.need.toLocaleString()}`).join(" · ")
                : "None of your plans need it"}
            </dd>
          </>
        )}
      </dl>
      {signedIn && (
        <Link
          href="/genshin/planner"
          onClick={onClose}
          className="mt-4 inline-flex h-9 items-center rounded-md border border-gray-300 px-3 text-sm font-medium hover:bg-gray-50 dark:border-slate-600 dark:hover:bg-slate-800"
        >
          Open the planner
        </Link>
      )}
    </div>
  );
}

function weaponLabel(key: string, location: string | null) {
  const name = searchIndex().find((i) => i.kind === "weapon" && i.id === weaponId(key))?.name ?? key;
  return `${name} (${location ? formatCharacterDisplayName(location) : "unequipped"})`;
}
