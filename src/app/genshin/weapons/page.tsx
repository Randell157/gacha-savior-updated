"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { LayoutGrid, Rows3, Search } from "lucide-react";
import { useGenshinData } from "@/hooks/useGenshinData";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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
import CharacterAvatar from "@/components/CharacterAvatar";
import {
  cn,
  formatCharacterDisplayName,
  formatWeaponDisplayName,
} from "@/lib/utils";
import type { GoodWeapon } from "@/lib/genshin/types";

type SortKey = "level-desc" | "level-asc" | "name-asc" | "refinement-desc";
type ShowFilter = "all" | "equipped" | "unequipped";
type View = "cards" | "table";

/** One row on the page: a weapon, or several identical copies when grouped. */
interface WeaponRow {
  id: string;
  weapon: GoodWeapon;
  name: string;
  copies: number;
}

const SORTERS: Record<SortKey, (a: WeaponRow, b: WeaponRow) => number> = {
  "level-desc": (a, b) => b.weapon.level - a.weapon.level || a.name.localeCompare(b.name),
  "level-asc": (a, b) => a.weapon.level - b.weapon.level || a.name.localeCompare(b.name),
  "name-asc": (a, b) => a.name.localeCompare(b.name) || b.weapon.level - a.weapon.level,
  "refinement-desc": (a, b) =>
    b.weapon.refinement - a.weapon.refinement || b.weapon.level - a.weapon.level,
};

export default function WeaponsPage() {
  return (
    <RequireAuth>
      <Weapons />
    </RequireAuth>
  );
}

function Weapons() {
  const { data: genshinData } = useGenshinData();
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortKey>("level-desc");
  const [show, setShow] = useState<ShowFilter>("all");
  const [groupCopies, setGroupCopies] = useState(true);
  const [view, setView] = useState<View>("cards");
  const weapons = useMemo(() => genshinData?.weapons ?? [], [genshinData]);

  const rows = useMemo(() => {
    const query = search.trim().toLowerCase();
    const matching = weapons.filter((w) => {
      if (show === "equipped" && !w.location) return false;
      if (show === "unequipped" && w.location) return false;
      return !query || formatWeaponDisplayName(w.key).toLowerCase().includes(query);
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
      else byId.set(id, { id, weapon, name: formatWeaponDisplayName(weapon.key), copies: 1 });
    });
    return [...byId.values()].sort(SORTERS[sort]);
  }, [weapons, search, show, groupCopies, sort]);

  return (
    <GenshinShell title="Weapons">
      {weapons.length === 0 ? (
        <p className="text-gray-600 dark:text-slate-400">
          No weapons yet. Upload your data on the Genshin overview to see them here.
        </p>
      ) : (
        <>
          <div className="mb-6 flex flex-wrap items-center gap-3">
            <div className="relative w-full sm:w-56">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 dark:text-slate-500" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search weapons"
                aria-label="Search weapons"
                className="pl-9"
              />
            </div>
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

function WeaponIcon({ weaponKey, name }: { weaponKey: string; name: string }) {
  const [failed, setFailed] = useState(false);
  return (
    <div className="relative h-12 w-12 shrink-0">
      <Image
        src={failed ? "/placeholder.svg" : `/weapon-icons/${weaponKey.replace(/\s+/g, "_")}.png`}
        alt={name}
        fill
        sizes="48px"
        className="rounded-md object-contain"
        onError={() => setFailed(true)}
      />
    </div>
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
              <WeaponIcon weaponKey={weapon.key} name={name} />
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
            <div className="flex gap-1.5">
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
              <TableCell className="font-medium">{name}</TableCell>
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
