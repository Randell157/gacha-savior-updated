"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { rowsFor } from "@/components/plannerRows";
import RarityIcon from "@/components/RarityIcon";
import { useGenshinData } from "@/hooks/useGenshinData";
import { useMaterialCosts } from "@/hooks/useMaterialCosts";
import { useWishData } from "@/hooks/useWishData";
import {
  WEEKDAYS,
  currentTicks,
  farmingDay,
  farmingList,
  toggleTick,
  weekdayNames,
  type FarmingGroup,
  type FarmingPlan,
} from "@/lib/genshin/farming";
import { isPlanOn, type SavedPlan } from "@/lib/genshin/materialPlanner";
import { uigfTimezone } from "@/lib/genshin/wishes";
import { getWeapon, weaponIcon, weaponName } from "@/lib/genshin/weapons";
import { getCharacterPortrait, getCharacterRarity } from "@/lib/genshinCharacters";
import { cn, formatCharacterDisplayName } from "@/lib/utils";

/** How many domains the overview's short list shows before "and N more". */
const COMPACT_ROWS = 4;

/** The clock, moved on every minute so the list turns over at 4 AM without a reload. */
function useNow() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(timer);
  }, []);
  return now;
}

function planLabel(plan: SavedPlan) {
  if (plan.kind === "character") return formatCharacterDisplayName(plan.key);
  const holder = plan.location ? formatCharacterDisplayName(plan.location) : "unequipped";
  return `${weaponName(plan.key)} (${holder})`;
}

function planPicture(plan: SavedPlan) {
  return plan.kind === "character"
    ? { src: getCharacterPortrait(plan.key), rarity: getCharacterRarity(plan.key) }
    : { src: weaponIcon(plan.key), rarity: getWeapon(plan.key)?.rarity };
}

/** "Furina", "Furina and Kazuha", "Furina, Kazuha and Xianyun" */
function names(list: string[]) {
  return list.length <= 2 ? list.join(" and ") : `${list.slice(0, -1).join(", ")} and ${list[list.length - 1]}`;
}

/** "Wednesday and Saturday (and Sunday)" */
function openDays(group: FarmingGroup) {
  return `${weekdayNames(group.days).filter((d) => d !== "Sunday").join(" and ")} (and Sunday)`;
}

function untilText(endsAt: Date, now: Date) {
  const minutes = Math.max(1, Math.round((endsAt.getTime() - now.getTime()) / 60_000));
  return minutes >= 60 ? `in ${Math.floor(minutes / 60)} h` : `in ${minutes} min`;
}

/**
 * Today's farming list (design "C1" from `.mockups/farming.html`): the talent
 * books and weapon materials the saved plans are still short of, whose domain
 * is open today. The Planner tab shows it in full, a card per domain with the
 * other days folded below; the overview (`compact`) shows up to four rows and a
 * link to the planner. Ticks are saved with the account and clear at the 4 AM
 * reset, on the UID's server when a wish history says which, otherwise on the
 * browser's clock.
 */
export default function FarmingToday({ compact = false }: { compact?: boolean }) {
  const { data, plans, travelerElement, farmingTicks, setFarmingTicks } = useGenshinData();
  const { costs } = useMaterialCosts(plans.length > 0);
  const { wishes } = useWishData();
  const now = useNow();
  if (!data || (plans.length > 0 && !costs)) return null;

  const gameUid = wishes?.gameUid || null;
  const offset = gameUid ? uigfTimezone(gameUid) : null;
  const day = farmingDay(now, offset);
  const pictures = new Map<string, { src: string | null; rarity: number | undefined }>();
  const farmingPlans: FarmingPlan[] = [];
  // Plans switched off on the Planner tab don't count here either.
  const onPlans = plans.filter(isPlanOn);
  for (const row of costs ? rowsFor(onPlans, data, costs, travelerElement) : []) {
    if (!row.plan) continue;
    const label = planLabel(row.saved);
    pictures.set(label, planPicture(row.saved));
    farmingPlans.push({ label, plan: row.plan });
  }
  const list = costs ? farmingList(costs, farmingPlans, data.materials, day) : { today: [], later: [], next: null };
  const done = currentTicks(farmingTicks, day);
  const left = list.today.filter((g) => !done.includes(g.id)).length;
  const toggle = (id: string) => setFarmingTicks(toggleTick(farmingTicks, day, id));

  const resets =
    offset === null
      ? `Resets at 4 AM your time, ${untilText(day.endsAt, now)}`
      : `Resets at 4 AM server time (UTC${offset >= 0 ? "+" : "−"}${Math.abs(offset)}), ${untilText(day.endsAt, now)}`;
  const today = WEEKDAYS[day.weekday];

  let body: React.ReactNode;
  let subtitle = resets;
  if (plans.length === 0) {
    body = (
      <p className="rounded-md border border-dashed border-gray-300 p-4 text-sm text-gray-600 dark:border-slate-600 dark:text-slate-400">
        Add a character or weapon to your planner, and the talent books and weapon materials it still needs show here on
        the days their domains are open.
      </p>
    );
  } else if (list.today.length === 0) {
    const next = list.later[0];
    body = (
      <p className="rounded-md bg-gray-50 p-4 text-sm text-gray-700 dark:bg-slate-800/60 dark:text-slate-300">
        {list.next && next ? (
          <>
            Nothing on your plans drops today. Next: <strong>{WEEKDAYS[list.next.weekday]}</strong>, {next.domain} for{" "}
            {names(next.for)}.
          </>
        ) : onPlans.length === 0 ? (
          "Every plan in your planner is switched off."
        ) : (
          "Your plans have every talent book and weapon material they need."
        )}
      </p>
    );
  } else if (compact) {
    subtitle = `${left} of ${list.today.length} ${list.today.length === 1 ? "domain" : "domains"} left · ${resets}`;
    body = (
      <>
        <ul>
          {list.today.slice(0, COMPACT_ROWS).map((group) => (
            <FarmingRow key={group.id} group={group} done={done.includes(group.id)} onToggle={() => toggle(group.id)} />
          ))}
        </ul>
        {list.today.length > COMPACT_ROWS && (
          <p className="mt-2 text-sm text-gray-600 dark:text-slate-400">
            and {list.today.length - COMPACT_ROWS} more in the planner
          </p>
        )}
      </>
    );
  } else {
    subtitle = `${left} of ${list.today.length} ${list.today.length === 1 ? "domain" : "domains"} left · ${resets}${
      day.weekday === 0 ? " · Every domain is open on Sunday" : ""
    }`;
    body = (
      <ul className="grid gap-3 lg:grid-cols-2">
        {list.today.map((group) => (
          <FarmingCard
            key={group.id}
            group={group}
            pictures={pictures}
            done={done.includes(group.id)}
            onToggle={() => toggle(group.id)}
          />
        ))}
      </ul>
    );
  }

  // The overview's cards are h3 under its h2; the Planner tab's sections are h2.
  const Heading = compact ? "h3" : "h2";
  const showLater = !compact && plans.length > 0 && list.later.length > 0;
  return (
    <section
      aria-labelledby={compact ? "farming-compact-heading" : "farming-heading"}
      className="rounded-lg border border-gray-200 bg-white p-4 sm:p-6 dark:border-slate-700 dark:bg-slate-900"
    >
      <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
        <div>
          <Heading
            id={compact ? "farming-compact-heading" : "farming-heading"}
            className="text-lg font-semibold text-indigo-900 dark:text-indigo-200"
          >
            Today&apos;s farming: {today}
          </Heading>
          <p className="text-sm text-gray-600 dark:text-slate-400">{subtitle}</p>
        </div>
        {compact && (
          <Link
            href="/genshin/planner"
            className="text-sm font-medium text-indigo-700 hover:underline dark:text-indigo-300"
          >
            Open the planner
          </Link>
        )}
      </div>
      {body}
      {showLater && (
        <details className="mt-3 text-sm">
          <summary className="cursor-pointer text-indigo-700 dark:text-indigo-300">
            Other days ({list.later.length})
          </summary>
          <ul className="mt-1">
            {list.later.map((group) => (
              <li key={group.id} className="flex items-center gap-2 py-1.5">
                <span className="flex shrink-0 gap-1">
                  {group.materials.map((m) => (
                    <RarityIcon key={m.key} src={`/material-icons/${m.key}.webp`} rarity={m.rarity ?? 1} size={24} />
                  ))}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate">
                    {group.domain} · <span className="text-gray-600 dark:text-slate-400">for {names(group.for)}</span>
                  </span>
                  <span className="block text-xs text-gray-600 dark:text-slate-400">{openDays(group)}</span>
                </span>
              </li>
            ))}
          </ul>
        </details>
      )}
      {!compact && plans.length > 0 && (
        <p className="mt-4 text-xs text-gray-500 dark:text-slate-400">
          Only materials your plans are still short of, after adding every plan up. Ticks are saved with your account and
          clear at the reset.
        </p>
      )}
    </section>
  );
}

function TickBox({ group, done, onToggle }: { group: FarmingGroup; done: boolean; onToggle: () => void }) {
  return (
    <input
      type="checkbox"
      checked={done}
      onChange={onToggle}
      aria-label={`${group.domain} done today`}
      className="h-5 w-5 shrink-0 cursor-pointer accent-indigo-600"
    />
  );
}

function FarmingCard({
  group,
  pictures,
  done,
  onToggle,
}: {
  group: FarmingGroup;
  pictures: Map<string, { src: string | null; rarity: number | undefined }>;
  done: boolean;
  onToggle: () => void;
}) {
  return (
    <li
      className={cn(
        "rounded-lg border p-3",
        done
          ? "border-emerald-200 bg-emerald-50/60 dark:border-emerald-900 dark:bg-emerald-950/30"
          : "border-gray-200 bg-white dark:border-slate-700 dark:bg-slate-900"
      )}
    >
      <div className="flex items-start gap-3">
        <span className="pt-0.5">
          <TickBox group={group} done={done} onToggle={onToggle} />
        </span>
        <div className={cn("min-w-0 flex-1", done && "opacity-60")}>
          <h3 className={cn("font-semibold text-gray-900 dark:text-slate-100", done && "line-through")}>{group.domain}</h3>
          <p className="text-xs text-gray-600 dark:text-slate-400">
            {group.kind === "weapon" ? "Weapon materials" : "Talent books"} · {group.region}
          </p>
          <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-2">
            {group.materials.map((m) => (
              <li key={m.key} className="flex items-center gap-2 text-sm">
                <RarityIcon src={`/material-icons/${m.key}.webp`} rarity={m.rarity ?? 1} size={32} />
                <span>
                  <span className="block leading-tight text-gray-900 dark:text-slate-100">{m.name}</span>
                  <span className="text-xs font-semibold text-red-700 dark:text-red-300">{m.missing.toLocaleString()} short</span>
                </span>
              </li>
            ))}
          </ul>
          <div className="mt-2 flex items-center gap-2 text-xs text-gray-600 dark:text-slate-400">
            <span className="flex -space-x-1.5">
              {group.for.map((label) => {
                const picture = pictures.get(label);
                return (
                  <span key={label} className="rounded-md ring-2 ring-white dark:ring-slate-900">
                    <RarityIcon src={picture?.src ?? null} rarity={picture?.rarity} size={24} />
                  </span>
                );
              })}
            </span>
            <span className="min-w-0">For {names(group.for)}</span>
          </div>
        </div>
      </div>
    </li>
  );
}

function FarmingRow({ group, done, onToggle }: { group: FarmingGroup; done: boolean; onToggle: () => void }) {
  return (
    <li className="flex items-center gap-3 border-b border-gray-100 py-2 last:border-0 dark:border-slate-800">
      <TickBox group={group} done={done} onToggle={onToggle} />
      <div className={cn("flex shrink-0 gap-1", done && "opacity-50")}>
        {group.materials.map((m) => (
          <RarityIcon key={m.key} src={`/material-icons/${m.key}.webp`} rarity={m.rarity ?? 1} size={28} />
        ))}
      </div>
      <div className={cn("min-w-0 flex-1", done && "opacity-60")}>
        <p className={cn("truncate text-sm font-medium text-gray-900 dark:text-slate-100", done && "line-through")}>
          {group.materials.map((m) => `${m.name} ×${m.missing.toLocaleString()}`).join(", ")}
        </p>
        <p className="truncate text-xs text-gray-600 dark:text-slate-400">
          {group.domain}, {group.region} · for {names(group.for)}
        </p>
      </div>
    </li>
  );
}
