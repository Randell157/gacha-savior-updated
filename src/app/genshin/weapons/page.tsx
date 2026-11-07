"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ChevronDown, LayoutGrid, Rows3 } from "lucide-react";
import { useGenshinData } from "@/hooks/useGenshinData";
import { useRememberedState } from "@/hooks/useRememberedState";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import GenshinShell from "@/components/GenshinShell";
import RequireAuth from "@/components/RequireAuth";
import Segmented from "@/components/Segmented";
import SearchInput from "@/components/SearchInput";
import { ClearFilters, FilterChip, NoMatches, RARITY_CHIP, WEAPON_TYPES } from "@/components/FilterChip";
import CharacterAvatar from "@/components/CharacterAvatar";
import WeaponIcon from "@/components/WeaponIcon";
import SignedOutBanner, { EmptyList } from "@/components/SignedOutBanner";
import { cn, formatCharacterDisplayName } from "@/lib/utils";
import { getWeapon, weaponHref, weaponName } from "@/lib/genshin/weapons";
import type { GoodWeapon } from "@/lib/genshin/types";

type SortKey = "level-desc" | "level-asc" | "name-asc" | "rarity-desc" | "refinement-desc";
type ShowFilter = "all" | "equipped" | "unequipped";
type View = "cards" | "table";

/** One row on the page: a weapon, or several identical copies when grouped. */
interface WeaponRow {
  id: string;
  weapon: GoodWeapon;
  name: string;
  copies: number;
}

// Ignores punctuation so "The Catch" (with its quotation marks) sorts under T.
const byName = new Intl.Collator("en", { ignorePunctuation: true }).compare;

const SORTERS: Record<SortKey, (a: WeaponRow, b: WeaponRow) => number> = {
  "level-desc": (a, b) => b.weapon.level - a.weapon.level || byName(a.name, b.name),
  "level-asc": (a, b) => a.weapon.level - b.weapon.level || byName(a.name, b.name),
  "name-asc": (a, b) => byName(a.name, b.name) || b.weapon.level - a.weapon.level,
  "rarity-desc": (a, b) =>
    (getWeapon(b.weapon.key)?.rarity ?? 0) - (getWeapon(a.weapon.key)?.rarity ?? 0) ||
    b.weapon.level - a.weapon.level ||
    byName(a.name, b.name),
  "refinement-desc": (a, b) =>
    b.weapon.refinement - a.weapon.refinement || b.weapon.level - a.weapon.level,
};

/** Entries drawn at a time; "Show more" adds this many. */
const PAGE_SIZE = 60;

/**
 * "Showing 60 of 162 entries (336 weapons)" when copies are grouped, so the
 * number matches the account's total, and "Showing 60 of 336 weapons" when not.
 */
function countLine(rows: WeaponRow[], shown: number): string {
  const weapons = rows.reduce((total, row) => total + row.copies, 0);
  const weaponCount = `${weapons.toLocaleString()} ${weapons === 1 ? "weapon" : "weapons"}`;
  const of = shown < rows.length ? `${shown.toLocaleString()} of ` : "";
  if (weapons === rows.length) return `Showing ${of}${weaponCount}`;
  return `Showing ${of}${rows.length.toLocaleString()} ${rows.length === 1 ? "entry" : "entries"} (${weaponCount})`;
}

export default function WeaponsPage() {
  return (
    <RequireAuth signedOut={<Weapons signedOut />}>
      <Weapons />
    </RequireAuth>
  );
}

/** Signed out, the page shows the log-in banner, the toolbar faded and disabled, and an empty list. */
function Weapons({ signedOut = false }: { signedOut?: boolean }) {
  const { data: genshinData } = useGenshinData();
  const [search, setSearch] = useRememberedState("weapons:search", "");
  const [sort, setSort] = useRememberedState<SortKey>("weapons:sort", "level-desc");
  const [show, setShow] = useRememberedState<ShowFilter>("weapons:show", "all");
  const [groupCopies, setGroupCopies] = useRememberedState("weapons:group", true);
  const [view, setView] = useRememberedState<View>("weapons:view", "cards", "device");
  const [typeFilter, setTypeFilter] = useRememberedState<string | null>("weapons:type", null);
  const [rarityFilter, setRarityFilter] = useRememberedState<number | null>("weapons:rarity", null);
  const weapons = useMemo(() => genshinData?.weapons ?? [], [genshinData]);
  // Remembered too, so coming back from a weapon's page finds the same entries drawn.
  const [limit, setLimit] = useRememberedState("weapons:limit", PAGE_SIZE);
  // On phones, the filters wait behind a button so the weapons start higher up.
  const [filtersOpen, setFiltersOpen] = useState(false);

  // A new search, filter or sort starts from the top of the list again.
  const choices = [search, sort, show, groupCopies, typeFilter, rarityFilter].join("|");
  const [limitChoices, setLimitChoices] = useState(choices);
  if (choices !== limitChoices) {
    setLimitChoices(choices);
    setLimit(PAGE_SIZE);
  }

  // Only the rarities this account has, highest first.
  const rarities = useMemo(
    () => [...new Set(weapons.map((w) => getWeapon(w.key)?.rarity ?? 0))].filter(Boolean).sort((a, b) => b - a),
    [weapons]
  );

  const rows = useMemo(() => {
    const query = search.trim().toLowerCase();
    const matching = weapons.filter((w) => {
      if (show === "equipped" && !w.location) return false;
      if (show === "unequipped" && w.location) return false;
      const info = getWeapon(w.key);
      if (typeFilter && info?.type !== typeFilter) return false;
      if (rarityFilter && info?.rarity !== rarityFilter) return false;
      return !query || weaponName(w.key).toLowerCase().includes(query);
    });

    // Grouping merges copies that are identical in every shown column:
    // same weapon, level, refinement and holder (equipped copies stay separate).
    const byId = new Map<string, WeaponRow>();
    matching.forEach((weapon, index) => {
      const id = groupCopies
        ? `${weapon.key}|${weapon.level}|${weapon.refinement}|${weapon.location ?? ""}`
        : String(index);
      const existing = byId.get(id);
      if (existing) existing.copies += 1;
      else byId.set(id, { id, weapon, name: weaponName(weapon.key), copies: 1 });
    });
    return [...byId.values()].sort(SORTERS[sort]);
  }, [weapons, search, show, groupCopies, sort, typeFilter, rarityFilter]);

  const filterCount = Number(typeFilter !== null) + Number(rarityFilter !== null) + Number(show !== "all");
  const clearFilters = () => {
    setTypeFilter(null);
    setRarityFilter(null);
    setShow("all");
  };

  const toolbar = (
        <div className="mb-6 space-y-3">
          <div className="flex flex-wrap items-center gap-3">
            <SearchInput value={search} onChange={setSearch} label="Search weapons" />
            <div className="flex items-center gap-2">
              <label htmlFor="weapon-sort" className="text-sm font-medium">
                Sort by:
              </label>
              <Select value={sort} onValueChange={(v) => setSort(v as SortKey)}>
                <SelectTrigger id="weapon-sort" className="w-[11.5rem]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="level-desc">Level (High to Low)</SelectItem>
                  <SelectItem value="level-asc">Level (Low to High)</SelectItem>
                  <SelectItem value="name-asc">Name (A-Z)</SelectItem>
                  <SelectItem value="rarity-desc">Rarity (High to Low)</SelectItem>
                  <SelectItem value="refinement-desc">Refinement (High to Low)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button
              variant="outline"
              aria-expanded={filtersOpen}
              onClick={() => setFiltersOpen((open) => !open)}
              className={cn("sm:hidden", filterCount > 0 && "border-indigo-500 text-indigo-700 dark:text-indigo-300")}
            >
              Filters{filterCount > 0 && ` (${filterCount})`}
              <ChevronDown className={cn("ml-2 h-4 w-4 transition-transform duration-150 ease-out-strong motion-reduce:transition-none", filtersOpen && "rotate-180")} aria-hidden />
            </Button>
            {/* Below the button on phones, and part of this row from sm up. */}
            <div className={cn(!filtersOpen && "hidden", "order-last w-full space-y-1 sm:contents")}>
            <Segmented
              label="Show"
              value={show}
              onChange={setShow}
              options={[
                { value: "all", label: "All" },
                { value: "equipped", label: "Equipped" },
                { value: "unequipped", label: "Unequipped" },
              ]}
            />
            <label className="-mx-2 flex min-h-11 cursor-pointer items-center gap-2 rounded-md px-2 text-sm hover:bg-gray-100 dark:hover:bg-slate-800">
              <input
                type="checkbox"
                checked={groupCopies}
                onChange={(e) => setGroupCopies(e.target.checked)}
                className="h-4 w-4 accent-indigo-600"
              />
              Group copies
            </label>
            </div>
            <div className="ml-auto">
              <Segmented
                label="View"
                value={view}
                onChange={setView}
                options={[
                  { value: "cards", label: "Cards", icon: <LayoutGrid className="h-4 w-4" /> },
                  { value: "table", label: "Table", icon: <Rows3 className="h-4 w-4" /> },
                ]}
              />
            </div>
          </div>
          <div className={cn(filtersOpen ? "flex" : "hidden", "flex-wrap items-center gap-x-3 gap-y-2 sm:flex")}>
            <div role="group" aria-label="Filter by weapon type" className="flex flex-wrap gap-2">
              {WEAPON_TYPES.map((type) => (
                <FilterChip
                  key={type}
                  pressed={typeFilter === type}
                  onClick={() => setTypeFilter(typeFilter === type ? null : type)}
                >
                  {type}
                </FilterChip>
              ))}
            </div>
            {rarities.length > 0 && (
              <>
                <span className="h-5 w-px bg-gray-200 dark:bg-slate-700" aria-hidden />
                <div role="group" aria-label="Filter by rarity" className="flex flex-wrap gap-2">
                  {rarities.map((rarity) => (
                    <FilterChip
                      key={rarity}
                      pressed={rarityFilter === rarity}
                      onClick={() => setRarityFilter(rarityFilter === rarity ? null : rarity)}
                      colors={RARITY_CHIP[rarity]}
                    >
                      {rarity}★
                    </FilterChip>
                  ))}
                </div>
              </>
            )}
            <ClearFilters count={filterCount} onClick={clearFilters} />
          </div>
        </div>
  );

  if (signedOut) {
    return (
      <GenshinShell title="Weapons">
        <SignedOutBanner>Log in and upload your account to see your weapons here.</SignedOutBanner>
        <fieldset disabled className="opacity-50">
          <legend className="sr-only">Weapon filters (log in to use them)</legend>
          {toolbar}
        </fieldset>
        <EmptyList>No weapons to show yet.</EmptyList>
      </GenshinShell>
    );
  }

  return (
    <GenshinShell title="Weapons">
      {weapons.length === 0 ? (
        <p className="text-gray-600 dark:text-slate-400">
          No weapons yet. Upload your data on the Genshin overview to see them here.
        </p>
      ) : (
        <>
          {toolbar}

          <p className="mb-4 text-sm text-gray-500 dark:text-slate-400">
            {rows.length === 0 ? (
              <NoMatches
                message="No weapons match these filters."
                filters={typeFilter !== null || rarityFilter !== null || show !== "all"}
                search={search.trim() !== ""}
                onClear={() => {
                  setTypeFilter(null);
                  setRarityFilter(null);
                  setShow("all");
                  setSearch("");
                }}
              />
            ) : (
              countLine(rows, Math.min(limit, rows.length))
            )}
          </p>

          {view === "cards" ? (
            <WeaponCards rows={rows.slice(0, limit)} />
          ) : (
            <WeaponTable rows={rows.slice(0, limit)} sort={sort} onSort={setSort} />
          )}

          {limit < rows.length && (
            <div className="mt-6 flex justify-center">
              <Button variant="outline" onClick={() => setLimit((n) => n + PAGE_SIZE)}>
                Show {Math.min(PAGE_SIZE, rows.length - limit)} more
              </Button>
            </div>
          )}
        </>
      )}
    </GenshinShell>
  );
}

/**
 * The weapon's name as a link whose pressable area stretches over the nearest
 * `relative` parent, so the whole card or row opens the weapon's page. It covers
 * the holder's face, so the tooltip that names the holder goes here.
 */
function WeaponLink({ weapon, name }: { weapon: GoodWeapon; name: string }) {
  return (
    <Link
      href={weaponHref(weapon.key)}
      title={weapon.location ? `Equipped by ${formatCharacterDisplayName(weapon.location)}` : undefined}
      className="after:absolute after:inset-0"
    >
      {name}
    </Link>
  );
}

const ROW_HOVER = "relative hover:bg-indigo-50 dark:hover:bg-indigo-900/20";

function CopiesBadge({ copies }: { copies: number }) {
  if (copies < 2) return null;
  return (
    <span className="shrink-0 rounded-full bg-indigo-100 dark:bg-indigo-900/50 px-2 py-0.5 text-xs font-semibold text-indigo-700 dark:text-indigo-300">
      ×{copies}
    </span>
  );
}

/** Cards from the `sm` breakpoint up, and slim two-line rows on phones, so about ten weapons fit on a screen. */
function WeaponCards({ rows }: { rows: WeaponRow[] }) {
  return (
    <>
    {/* The card titles are h3s; this keeps the heading levels in order for screen readers. */}
    <h2 className="sr-only">Weapons</h2>
    <ul className="divide-y divide-gray-200 dark:divide-slate-700 sm:hidden">
      {rows.map(({ id, weapon, name, copies }) => {
        const info = getWeapon(weapon.key);
        return (
          <li key={id} className={cn("flex items-center gap-3 py-2", ROW_HOVER)}>
            <WeaponIcon weaponKey={weapon.key} size="sm" />
            <div className="min-w-0 flex-1">
              <p className="font-semibold leading-tight text-gray-900 dark:text-slate-100">
                <WeaponLink weapon={weapon} name={name} />
              </p>
              <p className="text-xs text-gray-500 dark:text-slate-400">
                {info && `${info.type} · ${info.rarity}★ · `}Lv. {weapon.level} · R{weapon.refinement}
              </p>
              {/* A phone has no hover to show whose face it is, so the name is written out. */}
              {weapon.location && (
                <p className="mt-0.5 flex items-center gap-1.5 text-xs text-gray-500 dark:text-slate-400">
                  <CharacterAvatar characterKey={weapon.location} size={18} className="ring-0" />
                  <span>
                    <span className="sr-only">Equipped by </span>
                    {formatCharacterDisplayName(weapon.location)}
                  </span>
                </p>
              )}
            </div>
            <CopiesBadge copies={copies} />
          </li>
        );
      })}
    </ul>
    <div className="hidden grid-cols-1 gap-4 sm:grid md:grid-cols-2 lg:grid-cols-3">
      {rows.map(({ id, weapon, name, copies }) => (
        <Card key={id} className={ROW_HOVER}>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-3 text-lg">
              <WeaponIcon weaponKey={weapon.key} />
              <span className="min-w-0 flex-1">
                <WeaponLink weapon={weapon} name={name} />
              </span>
              {weapon.location && (
                <CharacterAvatar
                  characterKey={weapon.location}
                  label={`Equipped by ${formatCharacterDisplayName(weapon.location)}`}
                />
              )}
              <CopiesBadge copies={copies} />
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm">
            <div className="flex flex-wrap gap-1.5">
              {getWeapon(weapon.key) && (
                <span className="rounded bg-gray-100 dark:bg-slate-800 px-2 py-0.5">
                  {getWeapon(weapon.key)?.type} · {getWeapon(weapon.key)?.rarity}★
                </span>
              )}
              <span className="rounded bg-gray-100 dark:bg-slate-800 px-2 py-0.5">Lv. {weapon.level}</span>
              <span className="rounded bg-gray-100 dark:bg-slate-800 px-2 py-0.5">R{weapon.refinement}</span>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
    </>
  );
}

function WeaponTable({
  rows,
  sort,
  onSort,
}: {
  rows: WeaponRow[];
  sort: SortKey;
  onSort: (sort: SortKey) => void;
}) {
  // Clicking a sortable header switches to that column's sort.
  const header = (label: string, key: SortKey, alt?: SortKey) => {
    const active = sort === key || sort === alt;
    return (
      <button
        type="button"
        onClick={() => onSort(sort === key && alt ? alt : key)}
        className={cn("font-medium hover:text-indigo-700 dark:hover:text-indigo-300", active && "text-indigo-700 dark:text-indigo-300")}
      >
        {label}
        {active && (sort === "level-asc" ? " ▴" : " ▾")}
      </button>
    );
  };

  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{header("Weapon", "name-asc")}</TableHead>
            <TableHead>{header("Level", "level-desc", "level-asc")}</TableHead>
            <TableHead>{header("Refinement", "refinement-desc")}</TableHead>
            <TableHead>Equipped by</TableHead>
            <TableHead className="text-right">Copies</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map(({ id, weapon, name, copies }) => (
            <TableRow key={id} className={ROW_HOVER}>
              <TableCell className="font-medium">
                <div className="flex items-center gap-3">
                  <WeaponIcon weaponKey={weapon.key} size="sm" />
                  <WeaponLink weapon={weapon} name={name} />
                </div>
              </TableCell>
              <TableCell>{weapon.level}</TableCell>
              <TableCell>R{weapon.refinement}</TableCell>
              <TableCell className={weapon.location ? "" : "text-gray-400 dark:text-slate-500"}>
                {weapon.location ? formatCharacterDisplayName(weapon.location) : "—"}
              </TableCell>
              <TableCell className="text-right">{copies}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
