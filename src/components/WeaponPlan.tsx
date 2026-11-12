"use client";

import { useState } from "react";
import Link from "next/link";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import MaterialList, { MaterialViewToggle, useMaterialView, type ExpRow } from "@/components/MaterialList";
import { shortCount } from "@/components/CharacterPlan";
import { LevelTarget } from "@/components/PlanTargets";
import { useGenshinData } from "@/hooks/useGenshinData";
import { useMaterialCosts } from "@/hooks/useMaterialCosts";
import {
  WEAPON_EXP_ITEMS,
  findPlannedWeapon,
  maxLevel,
  planWeapon,
  upsertPlan,
  MAX_PLANS,
  type SavedPlan,
} from "@/lib/genshin/materialPlanner";
import type { GoodWeapon } from "@/lib/genshin/types";
import { formatCharacterDisplayName } from "@/lib/utils";

/** The Select's value for unequipped copies (Radix doesn't allow an empty one). */
const UNEQUIPPED = "unequipped";

/** "Held by Furina" or "Unequipped", for picking which copy a plan is for. */
export function copyLabel(location: string | null): string {
  return location ? `Held by ${formatCharacterDisplayName(location)}` : "Unequipped";
}

/** Each holder once, then unequipped copies as one choice (the highest-level one is planned). */
function copyChoices(copies: GoodWeapon[]): (string | null)[] {
  const locations = [...new Set(copies.map((w) => w.location ?? null))];
  return [...locations.filter((l): l is string => l !== null).sort(), ...(locations.includes(null) ? [null] : [])];
}

/**
 * The weapon page's Plan section: a target level for one copy, what it still
 * needs against the last upload, and adding it to the Planner tab.
 */
export default function WeaponPlan({ copies, rarity }: { copies: GoodWeapon[]; rarity: number }) {
  const { data, plans, setPlans } = useGenshinData();
  const { costs, failed } = useMaterialCosts();
  const [view, setView] = useMaterialView();
  const choices = copyChoices(copies);
  const max = maxLevel("weapon", rarity);
  const key = copies[0].key;
  // Start on a copy that's in the planner, else one that isn't at its cap.
  const [location, setLocation] = useState<string | null>(() => {
    const planned = plans.find((p) => p.kind === "weapon" && p.key === key && choices.includes(p.location));
    if (planned?.kind === "weapon") return planned.location;
    // findIndex, since the unequipped choice is null and `find` couldn't tell it from no match.
    const i = choices.findIndex((l) => (findPlannedWeapon(copies, key, l)?.level ?? max) < max);
    return choices[Math.max(i, 0)];
  });
  const weapon = findPlannedWeapon(copies, key, location)!;
  const saved = plans.find((p): p is Extract<SavedPlan, { kind: "weapon" }> => p.kind === "weapon" && p.key === key && p.location === location);
  const [targets, setTargets] = useState<Record<string, number>>({});
  const target = Math.max(targets[location ?? ""] ?? saved?.level ?? max, weapon.level);
  const [status, setStatus] = useState("");

  const plan = costs ? planWeapon(costs, rarity, weapon, target, data?.materials ?? {}) : null;
  const inPlanner = !!saved && Math.max(saved.level, weapon.level) === target;
  const full = !saved && plans.length >= MAX_PLANS;

  const addToPlanner = async () => {
    const ok = await setPlans(upsertPlan(plans, { kind: "weapon", key, location, level: target }));
    setStatus(ok ? (saved ? "Plan updated in the Planner tab." : "Added to the Planner tab.") : "Couldn't save the plan. Try again.");
  };

  const exp: ExpRow[] = plan?.exp ? [{ label: "Weapon EXP", line: plan.exp, covers: "ore", icon: WEAPON_EXP_ITEMS[0] }] : [];
  const short = plan ? shortCount(plan) : 0;

  return (
    <section aria-labelledby="plan-heading" className="bg-white dark:bg-slate-900 shadow sm:rounded-lg p-6 sm:p-8">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id="plan-heading" className="text-lg font-semibold text-indigo-900 dark:text-indigo-200">
            Plan
          </h2>
          <p className="text-sm text-gray-600 dark:text-slate-400">What this weapon still needs, against your last upload</p>
        </div>
        {inPlanner ? (
          <Button asChild variant="outline" size="sm">
            <Link href="/genshin/planner">
              <Check className="mr-1.5 h-4 w-4" aria-hidden="true" />
              In your planner
            </Link>
          </Button>
        ) : (
          <Button type="button" size="sm" onClick={addToPlanner} disabled={full} title={full ? `The planner holds up to ${MAX_PLANS} plans` : undefined}>
            {saved ? "Update plan" : "Add to planner"}
          </Button>
        )}
      </div>

      <div className="flex flex-wrap items-end gap-x-5 gap-y-3 rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-slate-700 dark:bg-slate-800/50">
        {choices.length > 1 && (
          <div>
            <label htmlFor="plan-copy" className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-600 dark:text-slate-400">
              Copy
            </label>
            <Select value={location ?? UNEQUIPPED} onValueChange={(v) => setLocation(v === UNEQUIPPED ? null : v)}>
              <SelectTrigger id="plan-copy" className="h-8 w-auto min-w-[10rem]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {choices.map((l) => (
                  <SelectItem key={l ?? UNEQUIPPED} value={l ?? UNEQUIPPED}>
                    {copyLabel(l)} · Lv {findPlannedWeapon(copies, key, l)?.level}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
        <LevelTarget
          id="plan-level"
          current={weapon.level}
          value={target}
          max={max}
          onChange={(level) => setTargets((t) => ({ ...t, [location ?? ""]: level }))}
        />
      </div>

      <p role="status" className="mt-2 min-h-[1.25rem] text-sm text-gray-600 dark:text-slate-400">
        {status}
      </p>

      {failed ? (
        <p className="text-sm text-red-700 dark:text-red-300">The material costs couldn&apos;t be loaded. Reload the page to try again.</p>
      ) : !plan ? (
        <p className="text-sm text-gray-500 dark:text-slate-400">{costs ? "There's no cost data for this weapon yet." : "Loading material costs…"}</p>
      ) : (
        <>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm text-gray-700 dark:text-slate-300">
              {plan.materials.length === 0 && !plan.exp ? null : short ? (
                <>
                  <span className="font-semibold text-gray-900 dark:text-slate-100">
                    {short} {short === 1 ? "material" : "materials"}
                  </span>{" "}
                  still short.
                </>
              ) : (
                <span className="font-semibold text-emerald-700 dark:text-emerald-300">You have everything this needs.</span>
              )}
            </p>
            <MaterialViewToggle value={view} onChange={setView} />
          </div>
          <MaterialList materials={plan.materials} exp={exp} view={view} />
          <p className="mt-4 text-xs text-gray-500 dark:text-slate-400">
            Counts ascension materials and ore from the game&apos;s costs. It doesn&apos;t count resin or days, or
            materials you could craft from lower tiers.
          </p>
        </>
      )}
    </section>
  );
}
