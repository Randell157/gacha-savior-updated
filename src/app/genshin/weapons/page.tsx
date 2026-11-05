"use client";

import { useMemo } from "react";
import { LayoutGrid, Rows3 } from "lucide-react";
import { useGenshinData } from "@/hooks/useGenshinData";
import { useRememberedState } from "@/hooks/useRememberedState";
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
import { ClearFilters, FilterChip, RARITY_CHIP, WEAPON_TYPES } from "@/components/FilterChip";
import CharacterAvatar from "@/components/CharacterAvatar";
import WeaponIcon from "@/components/WeaponIcon";
import SignedOutBanner, { EmptyList } from "@/components/SignedOutBanner";
import { cn, formatCharacterDisplayName } from "@/lib/utils";
import { getWeapon, weaponName } from "@/lib/genshin/weapons";
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
            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={groupCopies}
                onChange={(e) => setGroupCopies(e.target.checked)}
                className="h-4 w-4 accent-indigo-600"
              />
              Group copies
            </label>
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
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
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
            <ClearFilters
              count={Number(typeFilter !== null) + Number(rarityFilter !== null)}
              onClick={() => {
                setTypeFilter(null);
                setRarityFilter(null);
              }}
            />
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
            {rows.length === 0
              ? "No weapons match these filters."
              : `Showing ${rows.length.toLocaleString()} ${rows.length === 1 ? "entry" : "entries"}`}
          </p>

          {view === "cards" ? (
            <WeaponCards rows={rows} />
          ) : (
            <WeaponTable rows={rows} sort={sort} onSort={setSort} />
          )}
        </>
      )}
    </GenshinShell>
  );
}

function CopiesBadge({ copies }: { copies: number }) {
  if (copies < 2) return null;
  return (
    <span className="shrink-0 rounded-full bg-indigo-100 dark:bg-indigo-900/50 px-2 py-0.5 text-xs font-semibold text-indigo-700 dark:text-indigo-300">
      ×{copies}
    </span>
  );
}

function WeaponCards({ rows }: { rows: WeaponRow[] }) {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
      {/* The card titles are h3s; this keeps the heading levels in order for screen readers. */}
      <h2 className="sr-only">Weapons</h2>
      {rows.map(({ id, weapon, name, copies }) => (
        <Card key={id}>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-3 text-lg">
              <WeaponIcon weaponKey={weapon.key} />
              <span className="flex min-w-0 flex-1 items-center gap-2">
                <span className="min-w-0">{name}</span>
                {weapon.location && (
                  <CharacterAvatar
                    characterKey={weapon.location}
                    label={`Equipped by ${formatCharacterDisplayName(weapon.location)}`}
                  />
                )}
              </span>
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
            <TableRow key={id}>
              <TableCell className="font-medium">
                <div className="flex items-center gap-3">
                  <WeaponIcon weaponKey={weapon.key} size="sm" />
                  {name}
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
