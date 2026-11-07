"use client";

import { useState } from "react";
import NumberButtons from "@/components/NumberButtons";
import { canRefine, getWeaponDescription, getWeaponPassive } from "@/lib/genshin/weaponDetails";

/**
 * A weapon's passive with its changing numbers in bold, and its flavour text.
 * R1 to R5 buttons preview other refinements, with a star on each one the
 * player owns. It opens on the highest of those.
 */
export default function WeaponPassive({
  weaponKey,
  owned,
  showKey = false,
}: {
  weaponKey: string;
  /** The refinements the player has */
  owned: number[];
  /** Explain the star under the buttons */
  showKey?: boolean;
}) {
  const [shown, setShown] = useState<number | null>(null);
  const refinement = shown ?? Math.max(...owned);
  const passive = getWeaponPassive(weaponKey, refinement);
  const description = getWeaponDescription(weaponKey);
  if (!passive && !description) return null;
  return (
    <div className="space-y-3">
      {passive && canRefine(weaponKey) && (
        <div>
          <NumberButtons
            label="Refinement"
            prefix="R"
            count={5}
            selected={refinement}
            onSelect={setShown}
            isMarked={(r) => owned.includes(r)}
            markLabel="yours"
            markTitle="Your refinement"
          />
          {showKey && <p className="mt-1 text-xs text-gray-500 dark:text-slate-400">★ A refinement you own</p>}
        </div>
      )}
      {passive && (
        <div>
          <p className="text-sm font-semibold text-gray-900 dark:text-slate-100">
            {passive.name}{" "}
            <span className="ml-1 rounded bg-indigo-100 dark:bg-indigo-900/50 px-1.5 py-0.5 text-xs text-indigo-700 dark:text-indigo-300">
              R{refinement}
            </span>
          </p>
          <p className="mt-1 text-sm text-gray-600 dark:text-slate-400" aria-live="polite">
            {passive.parts.map((part, i) =>
              part.value ? (
                <strong key={i} className="font-semibold text-indigo-700 dark:text-indigo-300">
                  {part.text}
                </strong>
              ) : (
                <span key={i}>{part.text}</span>
              )
            )}
          </p>
        </div>
      )}
      {description && <p className="text-sm italic text-gray-500 dark:text-slate-400">{description}</p>}
    </div>
  );
}
