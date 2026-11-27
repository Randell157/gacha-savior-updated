import Link from "next/link";
import { Lock } from "lucide-react";
import CharacterAvatar from "@/components/CharacterAvatar";
import WeaponIcon from "@/components/WeaponIcon";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCharacterDisplayName } from "@/lib/utils";
import { getWeapon, weaponHref, weaponId, weaponName } from "@/lib/genshin/weapons";
import { spareWords, weaponSpares, type RefineLine, type WeaponSpares } from "@/lib/genshin/weaponSpares";
import type { GoodWeapon } from "@/lib/genshin/types";

/** A weapon's spare copies, or null when there are none to show (one copy, 1–3★, or none spare). */
export function sparesOf(copies: GoodWeapon[], weaponKey: string): WeaponSpares | null {
  const spares = weaponSpares(copies, getWeapon(weaponKey)?.rarity ?? 0);
  return spares && spares.spare.length > 0 ? spares : null;
}

/** Every weapon on the account with spare copies, keyed by weapon id. */
export function allSpares(weapons: GoodWeapon[]): Map<string, { key: string; spares: WeaponSpares }> {
  const byId = new Map<string, GoodWeapon[]>();
  for (const weapon of weapons) {
    const id = weaponId(weapon.key);
    const copies = byId.get(id);
    if (copies) copies.push(weapon);
    else byId.set(id, [weapon]);
  }
  const result = new Map<string, { key: string; spares: WeaponSpares }>();
  for (const [id, copies] of byId) {
    const spares = sparesOf(copies, copies[0].key);
    if (spares) result.set(id, { key: copies[0].key, spares });
  }
  return result;
}

const words = (spares: WeaponSpares) => spareWords(spares, formatCharacterDisplayName);

/** "R4 → R5", read out as "R4 to R5"; just "R1" when the spares ran out before this copy. */
function Refinement({ step }: { step: RefineLine }) {
  if (step.from === step.to) return <>R{step.from}</>;
  return (
    <>
      R{step.from} <span aria-hidden="true">→</span>
      <span className="sr-only">to</span> R{step.to}
    </>
  );
}

/** "· 2 more copies needed for R5", when the spares don't reach R5. */
function Short({ text }: { text: string }) {
  if (!text) return null;
  return <span className="text-amber-700 dark:text-amber-400"> · {text}</span>;
}

function LockLine({ note }: { note: string }) {
  if (!note) return null;
  return (
    <span className="text-gray-500 dark:text-slate-400">
      <Lock className="mr-1 inline h-3.5 w-3.5 -translate-y-px" aria-hidden />
      {note}
    </span>
  );
}

/** The "Spare copies" panel on a weapon's page (design "A" from `.mockups/spare-copies.html`). */
export function SpareCopiesPanel({ spares, weaponKey, className }: { spares: WeaponSpares; weaponKey: string; className: string }) {
  const text = words(spares);
  return (
    <section className={className}>
      <h2 className="mb-1 text-lg font-semibold text-indigo-900 dark:text-indigo-200">Spare copies</h2>
      <p className="text-sm text-gray-700 dark:text-slate-300">
        {text.head}. <LockLine note={text.lockNote} />
      </p>
      {text.steps.length > 0 && (
        <ul className="mt-3 space-y-2 text-sm">
          {text.steps.map((step, index) => (
            <li key={index} className="flex items-center gap-3">
              {step.holder ? (
                <CharacterAvatar characterKey={step.holder} size={30} className="ring-0" />
              ) : (
                <WeaponIcon weaponKey={weaponKey} size="sm" />
              )}
              <span className="text-gray-900 dark:text-slate-100">
                <span className="font-medium">
                  {step.holder ? (
                    <Link
                      href={`/genshin/characters/${encodeURIComponent(step.holder)}`}
                      className="text-indigo-700 hover:underline dark:text-indigo-300"
                    >
                      {step.who}
                    </Link>
                  ) : (
                    step.who
                  )}{" "}
                  <Refinement step={step} />
                </span>
                <span className="text-gray-500 dark:text-slate-400"> · {step.needs}</span>
                <Short text={step.short} />
              </span>
            </li>
          ))}
        </ul>
      )}
      {text.leftover && <p className="mt-3 text-sm text-gray-500 dark:text-slate-400">{text.leftover}</p>}
    </section>
  );
}

/** One weapon's card in the Weapons page's "Spare" view. The whole card opens the weapon's page. */
export function SpareCard({ weaponKey, spares }: { weaponKey: string; spares: WeaponSpares }) {
  const text = words(spares);
  const name = weaponName(weaponKey);
  return (
    <Card className="relative hover:bg-indigo-50 dark:hover:bg-indigo-900/20">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-3 text-lg">
          <WeaponIcon weaponKey={weaponKey} />
          <span className="min-w-0 flex-1">
            <Link href={weaponHref(weaponKey)} className="after:absolute after:inset-0">
              {name}
            </Link>
          </span>
          <span className="shrink-0 rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-semibold text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300">
            {spares.spare.length} spare
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        <p className="text-gray-700 dark:text-slate-300">
          {text.head}
          {spares.lockedSpare > 0 && <Lock className="ml-1 inline h-3.5 w-3.5 -translate-y-px text-gray-500 dark:text-slate-400" aria-hidden />}
        </p>
        {text.steps.length > 0 && (
          <ul className="space-y-1.5">
            {text.steps.map((step, index) => (
              <li key={index} className="flex items-center gap-2 text-gray-900 dark:text-slate-100">
                {step.holder && <CharacterAvatar characterKey={step.holder} size={22} className="ring-0" />}
                <span>
                  {step.who} <Refinement step={step} />
                  <span className="text-gray-500 dark:text-slate-400"> · {step.needs}</span>
                <Short text={step.short} />
                </span>
              </li>
            ))}
          </ul>
        )}
        {text.leftover && <p className="text-gray-500 dark:text-slate-400">{text.leftover}</p>}
      </CardContent>
    </Card>
  );
}
