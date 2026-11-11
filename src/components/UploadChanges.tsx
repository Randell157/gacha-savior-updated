"use client";

import { useState } from "react";
import Link from "next/link";
import { X } from "lucide-react";
import RarityIcon from "@/components/RarityIcon";
import { changeText } from "@/components/ShowcaseSlot";
import { Button } from "@/components/ui/button";
import type { BuildChange } from "@/lib/genshin/showcaseBuild";
import type { UploadChanges as Changes } from "@/lib/genshin/uploadChanges";
import { getWeapon, weaponHref, weaponIcon, weaponName } from "@/lib/genshin/weapons";
import { getCharacterPortrait, getCharacterRarity } from "@/lib/genshinCharacters";
import { formatCharacterDisplayName } from "@/lib/utils";

/** Changed characters shown before "Show all". */
const LIMIT = 8;

const n = (count: number) => count.toLocaleString();
const characterHref = (key: string) => `/genshin/characters/${encodeURIComponent(key)}`;

function Portrait({ characterKey, size }: { characterKey: string; size: number }) {
  return <RarityIcon src={getCharacterPortrait(characterKey)} rarity={getCharacterRarity(characterKey)} size={size} />;
}

function ChangeList({ changes }: { changes: BuildChange[] }) {
  return (
    <p className="text-sm text-gray-600 dark:text-slate-300">
      {changes.map((change, i) => (
        <span key={i}>
          {i > 0 && ", "}
          {change.kind === "totalCv" ? (
            <span
              className={
                change.by > 0
                  ? "font-semibold text-emerald-700 dark:text-emerald-300"
                  : "font-semibold text-red-700 dark:text-red-300"
              }
            >
              {changeText(change)}
            </span>
          ) : (
            changeText(change)
          )}
        </span>
      ))}
    </p>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h4 className="mb-2 mt-5 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-400">
      {children}
    </h4>
  );
}

/**
 * What changed since the previous upload, shown once under the Saved message
 * after an upload replaces an earlier one (option B of `.mockups/upload-changes.html`).
 */
export default function UploadChanges({
  changes,
  comparedWith,
  onClose,
}: {
  changes: Changes;
  /** When the replaced upload was made */
  comparedWith: Date | null;
  onClose: () => void;
}) {
  const [showAll, setShowAll] = useState(false);
  const { newCharacters, characters, newWeapons, removedWeapons, artifacts } = changes;
  const newWeaponCount = newWeapons.reduce((sum, w) => sum + w.count, 0);
  const goneWeaponCount = removedWeapons.reduce((sum, w) => sum + w.count, 0);
  const shown = showAll ? characters : characters.slice(0, LIMIT);
  const date = comparedWith?.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });

  const tally = [
    { count: newCharacters.length, label: newCharacters.length === 1 ? "new character" : "new characters" },
    { count: characters.length, label: characters.length === 1 ? "character changed" : "characters changed" },
    { count: newWeaponCount, label: newWeaponCount === 1 ? "new weapon" : "new weapons" },
    { count: artifacts.added, label: artifacts.added === 1 ? "new artifact" : "new artifacts" },
  ];

  return (
    <section
      aria-labelledby="upload-changes-title"
      className="fade-up rounded-lg border border-gray-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900"
    >
      <div className="mb-3 flex items-start justify-between gap-2">
        <div>
          <h3 id="upload-changes-title" className="text-lg font-semibold text-gray-900 dark:text-slate-100">
            Since your last upload
          </h3>
          {date && <p className="text-sm text-gray-500 dark:text-slate-400">Compared with {date}</p>}
        </div>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClose} aria-label="Close what changed">
          <X className="h-4 w-4" />
        </Button>
      </div>

      <dl className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        {tally.map(({ count, label }) => (
          <div
            key={label}
            className="flex flex-col-reverse rounded-md border border-gray-200 bg-gray-50 px-3 py-2 dark:border-slate-700 dark:bg-slate-800/60"
          >
            <dt className="text-xs text-gray-600 dark:text-slate-400">{label}</dt>
            <dd className="text-xl font-semibold tabular-nums text-gray-900 dark:text-slate-100">{n(count)}</dd>
          </div>
        ))}
      </dl>

      {newCharacters.length > 0 && (
        <>
          <SectionTitle>New characters ({n(newCharacters.length)})</SectionTitle>
          <ul className="flex flex-wrap gap-2">
            {newCharacters.map((key) => (
              <li key={key} className="w-16">
                <Link
                  href={characterHref(key)}
                  className="flex flex-col items-center gap-1 rounded-md text-center text-[11px] leading-tight text-gray-600 hover:text-indigo-700 dark:text-slate-300 dark:hover:text-indigo-300"
                >
                  <Portrait characterKey={key} size={52} />
                  {formatCharacterDisplayName(key)}
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}

      {characters.length > 0 && (
        <>
          <SectionTitle>Changed ({n(characters.length)})</SectionTitle>
          <ul className="grid gap-x-6 md:grid-cols-2">
            {shown.map(({ key, changes: list }) => (
              <li key={key} className="flex min-w-0 gap-2.5 border-t border-gray-200 py-2 dark:border-slate-700">
                <Portrait characterKey={key} size={32} />
                <div className="min-w-0">
                  <Link
                    href={characterHref(key)}
                    className="text-sm font-semibold text-gray-900 hover:text-indigo-700 dark:text-slate-100 dark:hover:text-indigo-300"
                  >
                    {formatCharacterDisplayName(key)}
                  </Link>
                  <ChangeList changes={list} />
                </div>
              </li>
            ))}
          </ul>
          {characters.length > LIMIT && (
            <Button variant="outline" size="sm" className="mt-2" onClick={() => setShowAll((v) => !v)}>
              {showAll ? "Show fewer" : `Show all ${n(characters.length)}`}
            </Button>
          )}
        </>
      )}

      {newWeapons.length > 0 && (
        <>
          <SectionTitle>New weapons ({n(newWeaponCount)})</SectionTitle>
          <ul className="flex flex-wrap gap-1.5">
            {newWeapons.map(({ key, count }) => (
              <li key={key}>
                <Link
                  href={weaponHref(key)}
                  className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 py-0.5 pl-0.5 pr-2.5 text-xs text-gray-600 hover:bg-indigo-50 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-indigo-900/40"
                >
                  <RarityIcon src={weaponIcon(key)} rarity={getWeapon(key)?.rarity} size={22} />
                  <span className="font-semibold text-gray-900 dark:text-slate-100">{weaponName(key)}</span>
                  {count > 1 && <span>×{count}</span>}
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}

      {removedWeapons.length > 0 && (
        <>
          <SectionTitle>Weapons no longer there ({n(goneWeaponCount)})</SectionTitle>
          <p className="text-sm text-gray-600 dark:text-slate-300">
            {removedWeapons.map(({ key, count }) => `${weaponName(key)}${count > 1 ? ` ×${count}` : ""}`).join(", ")}.
            Usually used to refine or level another weapon.
          </p>
        </>
      )}

      <SectionTitle>Artifacts</SectionTitle>
      <p className="text-sm text-gray-600 dark:text-slate-300">
        {n(artifacts.after)} in all, {artifacts.after >= artifacts.before ? "up" : "down"} from {n(artifacts.before)}:{" "}
        <span className="font-semibold text-gray-900 dark:text-slate-100">{n(artifacts.added)} new</span>,{" "}
        {n(artifacts.removed)} no longer there
        {artifacts.leveled > 0 && `, ${n(artifacts.leveled)} leveled up`}.
      </p>

      {changes.missingCharacters.length > 0 && (
        <>
          <SectionTitle>Not in this export ({n(changes.missingCharacters.length)})</SectionTitle>
          <p className="text-sm text-gray-600 dark:text-slate-300">
            {changes.missingCharacters.map(formatCharacterDisplayName).join(", ")}. The scanner may have skipped them.
          </p>
        </>
      )}

      <p className="mt-4 text-xs text-gray-500 dark:text-slate-400">
        This list shows once. Each showcase card keeps its own changes until your next upload.
      </p>
    </section>
  );
}
