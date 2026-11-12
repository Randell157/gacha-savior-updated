"use client";

import { useState } from "react";
import Link from "next/link";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import MaterialList, { MaterialViewToggle, useMaterialView, type ExpRow } from "@/components/MaterialList";
import { CharacterTargets } from "@/components/PlanTargets";
import { useGenshinData } from "@/hooks/useGenshinData";
import { useMaterialCosts } from "@/hooks/useMaterialCosts";
import { isTraveler } from "@/lib/genshin/characterDetails";
import {
  CHARACTER_EXP_ITEMS,
  planCharacter,
  upsertPlan,
  MAX_PLANS,
  type CharacterTarget,
  type Plan,
  type SavedPlan,
} from "@/lib/genshin/materialPlanner";
import type { GoodCharacter } from "@/lib/genshin/types";

const ONE = { auto: 1, skill: 1, burst: 1 };

/** Where a character is now, as a target the planner can start from. */
export function characterNow(character: GoodCharacter): CharacterTarget {
  return { level: character.level, talent: character.talent ?? ONE };
}

/** A saved target, raised to where the character is now if an upload passed it. */
export function targetFrom(saved: SavedPlan | undefined, now: CharacterTarget): CharacterTarget {
  if (!saved || saved.kind !== "character") return { level: 90, talent: { ...now.talent } };
  return {
    level: Math.max(saved.level, now.level),
    talent: {
      auto: Math.max(saved.talent.auto, now.talent.auto),
      skill: Math.max(saved.talent.skill, now.talent.skill),
      burst: Math.max(saved.talent.burst, now.talent.burst),
    },
  };
}

/** How many materials (and EXP) a plan is still short of, leaving out any the export doesn't list (Irminsul's Mora). */
export function shortCount(plan: Plan): number {
  return plan.materials.filter((line) => line.have !== null && line.missing > 0).length + (plan.exp?.missing ? 1 : 0);
}

const sameTarget = (a: CharacterTarget, b: CharacterTarget) =>
  a.level === b.level && a.talent.auto === b.talent.auto && a.talent.skill === b.talent.skill && a.talent.burst === b.talent.burst;

/**
 * The character page's Plan section: pick a target level and talent levels,
 * see what's still needed against the last upload, and add it to the Planner tab.
 */
export default function CharacterPlan({ character, name }: { character: GoodCharacter; name: string }) {
  const { data, travelerElement, plans, setPlans } = useGenshinData();
  const { costs, failed } = useMaterialCosts();
  const [view, setView] = useMaterialView();
  const now = characterNow(character);
  const saved = plans.find((p) => p.kind === "character" && p.key === character.key);
  const [target, setTarget] = useState(() => targetFrom(saved, now));
  const [status, setStatus] = useState("");

  const plan = costs ? planCharacter(costs, { ...character }, target, data?.materials ?? {}, travelerElement) : null;
  const savedTarget = saved?.kind === "character" ? targetFrom(saved, now) : null;
  const inPlanner = !!savedTarget && sameTarget(savedTarget, target);
  const full = !saved && plans.length >= MAX_PLANS;

  const addToPlanner = async () => {
    const ok = await setPlans(upsertPlan(plans, { kind: "character", key: character.key, ...target }));
    setStatus(ok ? (saved ? "Plan updated in the Planner tab." : "Added to the Planner tab.") : "Couldn't save the plan. Try again.");
  };

  const exp: ExpRow[] = plan?.exp ? [{ label: "Character EXP", line: plan.exp, covers: "books", icon: CHARACTER_EXP_ITEMS[0] }] : [];
  const short = plan ? shortCount(plan) : 0;

  return (
    <section aria-labelledby="plan-heading" className="bg-white dark:bg-slate-900 shadow sm:rounded-lg p-6 sm:p-8">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id="plan-heading" className="text-lg font-semibold text-indigo-900 dark:text-indigo-200">
            Plan
          </h2>
          <p className="text-sm text-gray-600 dark:text-slate-400">What {name} still needs, against your last upload</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
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
      </div>

      <CharacterTargets idPrefix="plan" now={now} value={target} onChange={setTarget} />

      <p role="status" className="mt-2 min-h-[1.25rem] text-sm text-gray-600 dark:text-slate-400">
        {status}
      </p>

      {isTraveler(character.key) && !travelerElement && (
        <p className="mb-3 text-sm text-gray-600 dark:text-slate-400">
          Choose the Traveler&apos;s element above to count talent materials.
        </p>
      )}

      {failed ? (
        <p className="text-sm text-red-700 dark:text-red-300">The material costs couldn&apos;t be loaded. Reload the page to try again.</p>
      ) : !plan ? (
        <p className="text-sm text-gray-500 dark:text-slate-400">{costs ? "There's no cost data for this character yet." : "Loading material costs…"}</p>
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
            Counts ascension, talent and EXP materials from the game&apos;s costs. It doesn&apos;t count resin or days, or
            materials you could craft from lower tiers.
          </p>
        </>
      )}
    </section>
  );
}
