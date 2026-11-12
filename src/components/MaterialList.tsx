"use client";

import { useState } from "react";
import RarityIcon from "@/components/RarityIcon";
import Segmented from "@/components/Segmented";
import { useRememberedState } from "@/hooks/useRememberedState";
import type { ExpLine, PlanLine } from "@/lib/genshin/materialPlanner";
import { cn } from "@/lib/utils";

export type MaterialView = "table" | "bars";

/** Table or progress bars, the same choice everywhere, remembered on this device. */
export function useMaterialView() {
  return useRememberedState<MaterialView>("planner:view", "table", "device");
}

export function MaterialViewToggle({ value, onChange }: { value: MaterialView; onChange: (v: MaterialView) => void }) {
  return (
    <Segmented
      label="Show materials as"
      value={value}
      onChange={onChange}
      options={[
        { value: "table", label: "Table" },
        { value: "bars", label: "Bars" },
      ]}
    />
  );
}

/** An EXP row: Character EXP against books, or weapon EXP against ore. */
export interface ExpRow {
  label: string;
  line: ExpLine;
  /** "books" or "ore", for "covered by your books" */
  covers: string;
  /** The largest book or ore, whose icon stands for the row */
  icon: { key: string; rarity: number };
}

/**
 * A material's icon from `npm run icons:materials`, on its rarity color (the
 * 1★ grey when genshin-db doesn't say, as for local specialties). Decoration:
 * the name beside it is what screen readers read.
 */
function MaterialIcon({ materialKey, rarity }: { materialKey: string; rarity: number | null }) {
  return <RarityIcon src={`/material-icons/${materialKey}.webp`} rarity={rarity ?? 1} size={32} />;
}

const n = (value: number) => value.toLocaleString();

function expNote(row: ExpRow) {
  return row.line.missing
    ? `${n(row.line.missingItems.count)} more ${row.line.missingItems.name}`
    : `Covered by your ${row.covers}`;
}

const isCovered = (line: PlanLine) => line.have !== null && line.missing === 0;

/**
 * What a plan needs: each material with how many are needed, how many you
 * have and how many are missing, the ones still short first. Materials you
 * already have enough of fold away under "Show them".
 */
export default function MaterialList({
  materials,
  exp = [],
  view,
}: {
  materials: PlanLine[];
  exp?: ExpRow[];
  view: MaterialView;
}) {
  const [showCovered, setShowCovered] = useState(false);
  const covered = materials.filter(isCovered);
  const shown = showCovered ? materials : materials.filter((line) => !isCovered(line));

  if (materials.length === 0 && exp.length === 0) {
    return <p className="text-sm text-gray-600 dark:text-slate-400">Nothing to gain: these targets are where you are now.</p>;
  }

  return (
    <div>
      {view === "table" ? (
        // relative: the table's screen-reader-only labels are absolutely
        // positioned, and would otherwise widen the page on phones.
        <div className="relative overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:border-slate-700 dark:text-slate-400">
                <th scope="col" className="py-1.5 pr-2 text-left">Material</th>
                <th scope="col" className="px-2 py-1.5 text-right">Need</th>
                {/* Have is left out on phones, where it would push Missing out of view. */}
                <th scope="col" className="hidden px-2 py-1.5 text-right sm:table-cell">Have</th>
                <th scope="col" className="py-1.5 pl-2 text-right">Missing</th>
              </tr>
            </thead>
            <tbody className="tabular-nums">
              {exp.map((row) => (
                <tr key={row.label} className="border-b border-gray-200 bg-gray-50 dark:border-slate-700 dark:bg-slate-800/50">
                  <th scope="row" className="py-2 pr-2 text-left font-normal">
                    <span className="flex items-center gap-2.5">
                      <MaterialIcon materialKey={row.icon.key} rarity={row.icon.rarity} />
                      <span>
                        {row.label}
                        <span className="block text-xs text-gray-500 dark:text-slate-400">{expNote(row)}</span>
                      </span>
                    </span>
                  </th>
                  <td className="px-2 py-2 text-right">{n(row.line.need)}</td>
                  <td className="hidden px-2 py-2 text-right sm:table-cell">{n(row.line.have)}</td>
                  <MissingCell missing={row.line.missing} have={row.line.have} />
                </tr>
              ))}
              {shown.map((line) => (
                <tr key={line.key} className="border-b border-gray-200 dark:border-slate-700">
                  <th scope="row" className="py-2 pr-2 text-left font-normal">
                    <span className="flex items-center gap-2.5">
                      <MaterialIcon materialKey={line.key} rarity={line.rarity} />
                      <span>
                        {line.name}
                        {line.have === null && (
                          <span className="block text-xs text-gray-500 dark:text-slate-400 sm:hidden">Not in your export</span>
                        )}
                      </span>
                    </span>
                  </th>
                  <td className="px-2 py-2 text-right">{n(line.need)}</td>
                  {line.have === null ? (
                    <td className="hidden px-2 py-2 text-right text-xs text-gray-500 dark:text-slate-400 sm:table-cell">Not in your export</td>
                  ) : (
                    <td className="hidden px-2 py-2 text-right sm:table-cell">{n(line.have)}</td>
                  )}
                  <MissingCell missing={line.missing} have={line.have} />
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <ul className="grid gap-x-6 gap-y-2.5 md:grid-cols-2">
          {exp.map((row) => (
            <BarRow
              key={row.label}
              icon={row.icon.key}
              rarity={row.icon.rarity}
              name={row.label}
              note={expNote(row)}
              need={row.line.need}
              have={row.line.have}
              missing={row.line.missing}
            />
          ))}
          {shown.map((line) => (
            <BarRow
              key={line.key}
              icon={line.key}
              rarity={line.rarity}
              name={line.name}
              need={line.need}
              have={line.have}
              missing={line.missing}
            />
          ))}
        </ul>
      )}
      {covered.length > 0 && (
        <p className="mt-3 text-sm text-gray-600 dark:text-slate-400">
          {!showCovered && `${covered.length} more you already have enough of. `}
          <button
            type="button"
            onClick={() => setShowCovered((v) => !v)}
            aria-expanded={showCovered}
            className="font-semibold text-indigo-700 underline underline-offset-2 hover:text-indigo-900 dark:text-indigo-300 dark:hover:text-indigo-200"
          >
            {showCovered ? "Hide the ones you have" : "Show them"}
          </button>
        </p>
      )}
    </div>
  );
}

function MissingCell({ missing, have }: { missing: number; have: number | null }) {
  if (have === null) {
    return (
      <td className="py-2 pl-2 text-right text-gray-500 dark:text-slate-400">
        <span aria-hidden="true">–</span>
        <span className="sr-only">Unknown</span>
      </td>
    );
  }
  return missing ? (
    <td className="py-2 pl-2 text-right font-semibold text-red-700 dark:text-red-300">{n(missing)}</td>
  ) : (
    <td className="py-2 pl-2 text-right font-semibold text-emerald-700 dark:text-emerald-300">
      <span aria-hidden="true">✓</span>
      <span className="sr-only">None</span>
    </td>
  );
}

function BarRow({
  icon,
  rarity,
  name,
  note,
  need,
  have,
  missing,
}: {
  icon: string;
  rarity: number | null;
  name: string;
  note?: string;
  need: number;
  have: number | null;
  missing: number;
}) {
  const percent = have === null ? 0 : Math.min(100, Math.round((have / need) * 100));
  return (
    <li className="flex min-w-0 items-center gap-2.5">
      <MaterialIcon materialKey={icon} rarity={rarity} />
      <div className="min-w-0 flex-1">
        {/* The numbers drop under the name when the row is too narrow for both. */}
        <div className="flex flex-wrap items-end justify-between gap-x-2 text-sm">
          <span className="min-w-0">
            {name}
            {note && <span className="block text-xs text-gray-500 dark:text-slate-400">{note}</span>}
          </span>
          <span className="ml-auto shrink-0 tabular-nums text-gray-600 dark:text-slate-400">
            {have === null ? (
              <>{n(need)} · not in your export</>
            ) : missing ? (
              <>
                {n(have)} / {n(need)} ·{" "}
                <span className="font-semibold text-red-700 dark:text-red-300">{n(missing)} missing</span>
              </>
            ) : (
              <>
                {n(need)} ·{" "}
                <span className="font-semibold text-emerald-700 dark:text-emerald-300">
                  <span aria-hidden="true">✓ </span>have {n(have)}
                </span>
              </>
            )}
          </span>
        </div>
        <div
          className="mt-1 h-1.5 overflow-hidden rounded-full bg-gray-200 dark:bg-slate-700"
          role="presentation"
        >
          <div
            className={cn("h-full rounded-full", percent >= 100 ? "bg-emerald-500" : "bg-indigo-500 dark:bg-indigo-400")}
            style={{ width: `${percent}%` }}
          />
        </div>
      </div>
    </li>
  );
}
