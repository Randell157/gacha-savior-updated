"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useGenshinData } from "@/hooks/useGenshinData";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import CharacterAvatar from "@/components/CharacterAvatar";
import { Stars } from "@/components/CharacterGameInfo";
import GenshinShell from "@/components/GenshinShell";
import RequireAuth from "@/components/RequireAuth";
import SignedOutBanner from "@/components/SignedOutBanner";
import WeaponIcon from "@/components/WeaponIcon";
import WeaponPlan from "@/components/WeaponPlan";
import WeaponPassive from "@/components/WeaponPassive";
import { SpareCopiesPanel, sparesOf } from "@/components/WeaponSpares";
import { formatCharacterDisplayName } from "@/lib/utils";
import { getWeaponStats } from "@/lib/genshin/weaponDetails";
import { getWeapon, weaponId, weaponName } from "@/lib/genshin/weapons";
import type { GoodWeapon } from "@/lib/genshin/types";

const PANEL = "bg-white dark:bg-slate-900 shadow sm:rounded-lg p-6 sm:p-8";

/** One row of the copies list: a copy, or several identical unequipped ones. */
interface CopyRow {
  id: string;
  weapon: GoodWeapon;
  copies: number;
  stats: ReturnType<typeof getWeaponStats>;
}

/** Merges copies identical in every shown value. Strongest first, and equipped before spare at the same strength. */
function copyRows(copies: GoodWeapon[]): CopyRow[] {
  const byId = new Map<string, CopyRow>();
  for (const weapon of copies) {
    const ascension = weapon.ascension ?? 0;
    const id = `${weapon.level}|${weapon.refinement}|${ascension}|${weapon.location ?? ""}`;
    const row = byId.get(id);
    if (row) row.copies += 1;
    else byId.set(id, { id, weapon, copies: 1, stats: getWeaponStats(weapon.key, weapon.level, ascension) });
  }
  return [...byId.values()].sort(
    (a, b) =>
      b.weapon.level - a.weapon.level ||
      b.weapon.refinement - a.weapon.refinement ||
      Number(Boolean(b.weapon.location)) - Number(Boolean(a.weapon.location))
  );
}

export default function WeaponDetailPage() {
  return (
    // Signed out, the page shows the weapon's game info under the log-in banner.
    <RequireAuth skeleton="detail" signedOut={<WeaponDetail signedOut />}>
      <WeaponDetail />
    </RequireAuth>
  );
}

function WeaponDetail({ signedOut = false }: { signedOut?: boolean }) {
  const params = useParams();
  const weaponKey = decodeURIComponent(typeof params.key === "string" ? params.key : "");
  const { data } = useGenshinData();
  const copies = useMemo(
    () => (data?.weapons ?? []).filter((w) => weaponId(w.key) === weaponId(weaponKey)),
    [data, weaponKey]
  );
  const rows = useMemo(() => copyRows(copies), [copies]);
  const spares = useMemo(() => sparesOf(copies, weaponKey), [copies, weaponKey]);
  const name = weaponName(weaponKey);

  const info = getWeapon(weaponKey);
  if (copies.length === 0 && info) {
    // A weapon in the game data you don't have (design "A" from `.mockups/unowned-pages.html`):
    // its game info under a banner or a note, with no copies or plan.
    return (
      <GenshinShell title={name} panel="none">
        <div className="max-w-7xl mx-auto space-y-6 py-4 sm:py-12 sm:px-6 lg:px-8">
          {signedOut ? (
            <SignedOutBanner>Log in to see your own copies and plan for {name} here.</SignedOutBanner>
          ) : (
            <p className="rounded-md bg-white px-3 py-2 text-sm text-gray-700 shadow dark:bg-slate-900 dark:text-slate-300">
              You don&apos;t have {name} in your latest upload, so this is the game&apos;s own information.
            </p>
          )}
          <WeaponAbout weaponKey={weaponKey} name={name} copies={[]} />
        </div>
      </GenshinShell>
    );
  }
  if (copies.length === 0) {
    return (
      <GenshinShell title={name}>
        <p className="text-gray-600 dark:text-slate-400">
          {signedOut ? "There's no weapon by that name." : "You don't have this weapon in your latest upload."}
        </p>
        <div className="mt-8">
          <Button asChild>
            <Link href="/genshin/weapons">Back to Weapons</Link>
          </Button>
        </div>
      </GenshinShell>
    );
  }

  return (
    <GenshinShell title={name} panel="none">
      {/* Same width and margins as PageShell's own panel, split into two. */}
      <div className="max-w-7xl mx-auto space-y-6 py-4 sm:py-12 sm:px-6 lg:px-8">
        <WeaponAbout weaponKey={weaponKey} name={name} copies={copies} />
        <section className={PANEL}>
          <h2 className="mb-3 text-lg font-semibold text-indigo-900 dark:text-indigo-200">
            {copies.length > 1 ? `Your ${copies.length} copies` : "Your copy"}
          </h2>
          <CopiesList rows={rows} />
          <CopiesTable rows={rows} />
        </section>
        {spares && <SpareCopiesPanel spares={spares} weaponKey={weaponKey} className={PANEL} />}
        <WeaponPlan key={weaponKey} copies={copies} rarity={info?.rarity ?? 5} />
      </div>
    </GenshinShell>
  );
}

/** The weapon's icon, chips, passive (R1–R5) and description; for one you don't have, `copies` is empty. */
function WeaponAbout({ weaponKey, name, copies }: { weaponKey: string; name: string; copies: GoodWeapon[] }) {
  const info = getWeapon(weaponKey);
  return (
    <section aria-label={`About ${name}`} className={PANEL}>
      <div className="grid gap-6 md:grid-cols-[minmax(0,20rem)_1fr]">
        <div className="flex items-center gap-4 self-start">
          <WeaponIcon weaponKey={weaponKey} size="lg" />
          <div>
            <p className="font-semibold text-gray-900 dark:text-slate-100">{name}</p>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {info && <Chip>{info.type}</Chip>}
              {info && (
                <Chip>
                  <Stars rarity={info.rarity} />
                </Chip>
              )}
              {info?.version && <Chip>Version {info.version}</Chip>}
              {copies.length > 1 && <Chip>{copies.length} copies</Chip>}
            </div>
          </div>
        </div>
        <WeaponPassive weaponKey={weaponKey} owned={copies.map((w) => w.refinement)} showKey={copies.length > 0} />
      </div>
    </section>
  );
}

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded bg-gray-100 dark:bg-slate-800 px-2 py-0.5 text-sm text-gray-700 dark:text-slate-300">
      {children}
    </span>
  );
}

/** The holder's face, or how many spare copies the row stands for. */
function CopyFace({ row }: { row: CopyRow }) {
  if (row.weapon.location) return <CharacterAvatar characterKey={row.weapon.location} size={30} className="ring-0" />;
  return (
    <span className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-full bg-gray-100 text-xs font-semibold text-gray-700 dark:bg-slate-800 dark:text-slate-300">
      <span className="sr-only">Copies: {row.copies}</span>
      <span aria-hidden="true">×{row.copies}</span>
    </span>
  );
}

function CopyHolder({ weapon }: { weapon: GoodWeapon }) {
  if (!weapon.location) return <>Not equipped</>;
  return (
    <Link
      href={`/genshin/characters/${encodeURIComponent(weapon.location)}`}
      className="font-medium text-indigo-700 hover:underline dark:text-indigo-300"
    >
      {formatCharacterDisplayName(weapon.location)}
    </Link>
  );
}

/** Phones: a row per copy, with its numbers on one line under the holder. */
function CopiesList({ rows }: { rows: CopyRow[] }) {
  return (
    <ul className="divide-y divide-gray-200 dark:divide-slate-700 sm:hidden">
      {rows.map((row) => (
        <li key={row.id} className="flex items-center gap-3 py-2.5">
          <CopyFace row={row} />
          <div className="min-w-0 flex-1 text-sm">
            <p className="text-gray-900 dark:text-slate-100">
              <CopyHolder weapon={row.weapon} />
            </p>
            <p className="text-xs text-gray-500 dark:text-slate-400">
              Lv. {row.weapon.level} · R{row.weapon.refinement}
              {row.stats && ` · Base ATK ${row.stats.baseAtk}`}
              {row.stats?.substat && ` · ${row.stats.substat.name} ${row.stats.substat.value}`}
            </p>
          </div>
        </li>
      ))}
    </ul>
  );
}

function CopiesTable({ rows }: { rows: CopyRow[] }) {
  const substat = rows[0].stats?.substat?.name;
  return (
    <div className="hidden sm:block">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Equipped by</TableHead>
            <TableHead>Level</TableHead>
            <TableHead>Refinement</TableHead>
            <TableHead>Base ATK</TableHead>
            {substat && <TableHead>{substat}</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.id}>
              <TableCell>
                <div className="flex items-center gap-3">
                  <CopyFace row={row} />
                  <CopyHolder weapon={row.weapon} />
                </div>
              </TableCell>
              <TableCell>{row.weapon.level}</TableCell>
              <TableCell>R{row.weapon.refinement}</TableCell>
              <TableCell>{row.stats?.baseAtk ?? "—"}</TableCell>
              {substat && <TableCell>{row.stats?.substat?.value ?? "—"}</TableCell>}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
