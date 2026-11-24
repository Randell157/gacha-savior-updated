"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import CharacterPicker from "@/components/CharacterPicker";
import { characterNow, shortCount, targetFrom } from "@/components/CharacterPlan";
import FarmingToday from "@/components/FarmingToday";
import { planName, rowsFor, type PlanRow as Row } from "@/components/plannerRows";
import GenshinShell from "@/components/GenshinShell";
import MaterialList, { MaterialViewToggle, useMaterialView, type ExpRow } from "@/components/MaterialList";
import { CharacterTargets, LevelTarget } from "@/components/PlanTargets";
import RarityIcon from "@/components/RarityIcon";
import RequireAuth from "@/components/RequireAuth";
import SignedOutBanner, { EmptyList } from "@/components/SignedOutBanner";
import WeaponPicker from "@/components/WeaponPicker";
import { copyLabel } from "@/components/WeaponPlan";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogTitle } from "@/components/ui/dialog";
import { useGenshinData } from "@/hooks/useGenshinData";
import { useMaterialCosts } from "@/hooks/useMaterialCosts";
import {
  CHARACTER_EXP_ITEMS,
  WEAPON_EXP_ITEMS,
  combinePlans,
  findPlannedWeapon,
  maxLevel,
  planId,
  removePlan,
  upsertPlan,
  MAX_PLANS,
  type CharacterTarget,
  type Plan,
  type SavedPlan,
} from "@/lib/genshin/materialPlanner";
import type { GenshinData, GoodWeapon } from "@/lib/genshin/types";
import { getWeapon, weaponHref, weaponIcon } from "@/lib/genshin/weapons";
import { getCharacterPortrait, getCharacterRarity } from "@/lib/genshinCharacters";

export default function PlannerPage() {
  return (
    <RequireAuth skeleton="rows" signedOut={<SignedOutPlanner />}>
      <Planner />
    </RequireAuth>
  );
}

function SignedOutPlanner() {
  return (
    <GenshinShell title="Planner">
      <SignedOutBanner>Log in to plan what your characters and weapons still need from your own materials.</SignedOutBanner>
      <EmptyList>Your plans will show up here.</EmptyList>
    </GenshinShell>
  );
}

function Planner() {
  const { data, plans, setPlans, travelerElement } = useGenshinData();
  const { costs, failed } = useMaterialCosts();
  const [view, setView] = useMaterialView();
  const [editing, setEditing] = useState<SavedPlan | null>(null);
  const [status, setStatus] = useState("");
  // Where focus goes back to when the dialog closes, or after a card is removed.
  const addCharacterButton = useRef<HTMLButtonElement>(null);
  const addWeaponButton = useRef<HTMLButtonElement>(null);
  const returnFocus = useRef<HTMLElement | null>(null);
  const restoreFocus = () => {
    const target = returnFocus.current?.isConnected ? returnFocus.current : addCharacterButton.current;
    target?.focus();
  };

  if (!data) {
    return (
      <GenshinShell title="Planner">
        <EmptyList>
          Upload your export on the <Link href="/genshin" className="font-medium text-indigo-700 underline dark:text-indigo-300">Overview</Link> to
          plan what your characters and weapons still need.
        </EmptyList>
      </GenshinShell>
    );
  }

  const rows = rowsFor(plans, data, costs, travelerElement);
  const live = rows.filter((r): r is Row & { plan: Plan } => r.plan !== null);
  const total = combinePlans(
    live.map((r) => r.plan),
    live.map((r) => r.saved.kind),
    data.materials
  );
  const exp: ExpRow[] = [
    ...(total.characterExp ? [{ label: "Character EXP", line: total.characterExp, covers: "books", icon: CHARACTER_EXP_ITEMS[0] }] : []),
    ...(total.weaponExp ? [{ label: "Weapon EXP", line: total.weaponExp, covers: "ore", icon: WEAPON_EXP_ITEMS[0] }] : []),
  ];
  const full = plans.length >= MAX_PLANS;

  const save = async (next: SavedPlan[], message: string) => {
    const ok = await setPlans(next);
    setStatus(ok ? message : "Couldn't save your plans. Try again.");
    return ok;
  };

  const addCharacter = (key: string | null) => {
    const character = key && data.characters.find((c) => c.key === key);
    if (!character) return;
    // Start at level 90 with the talents as they are; the dialog sets the rest.
    returnFocus.current = addCharacterButton.current;
    setEditing({ kind: "character", key: character.key, ...targetFrom(undefined, characterNow(character)) });
  };
  const addWeapon = (weapon: GoodWeapon) => {
    returnFocus.current = addWeaponButton.current;
    setEditing({
      kind: "weapon",
      key: weapon.key,
      location: weapon.location ?? null,
      level: maxLevel("weapon", getWeapon(weapon.key)?.rarity ?? 5),
    });
  };

  return (
    <GenshinShell title="Planner">
      <div className="space-y-6">
        <div className="flex flex-wrap items-center gap-2">
          <CharacterPicker
            trigger={
              <Button ref={addCharacterButton} type="button" disabled={full}>
                <Plus className="mr-1.5 h-4 w-4" aria-hidden="true" />
                Add a character
              </Button>
            }
            value={null}
            characterKeys={data.characters.map((c) => c.key)}
            onChange={addCharacter}
            unavailable={(key) => (plans.some((p) => p.kind === "character" && p.key === key) ? "in your planner" : null)}
          />
          <WeaponPicker
            triggerRef={addWeaponButton}
            weapons={data.weapons}
            disabled={full}
            planned={(w) => plans.some((p) => p.kind === "weapon" && p.key === w.key && p.location === (w.location ?? null))}
            onPick={addWeapon}
          />
          <p role="status" className="text-sm text-gray-600 dark:text-slate-400">
            {status || (full ? `The planner holds up to ${MAX_PLANS} plans.` : "")}
          </p>
        </div>

        <FarmingToday />

        {plans.length === 0 ? (
          <EmptyList>
            No plans yet. Add a character or weapon here, or use &ldquo;Add to planner&rdquo; on a character&apos;s or
            weapon&apos;s page.
          </EmptyList>
        ) : (
          <>
            <ul className="grid gap-3 lg:grid-cols-2">
              {rows.map((row) => (
                <PlanCard
                  key={planId(row.saved)}
                  row={row}
                  onEdit={(event) => {
                    returnFocus.current = event.currentTarget;
                    setEditing(row.saved);
                  }}
                  onRemove={async () => {
                    await save(removePlan(plans, row.saved), `Removed ${planName(row.saved)} from your planner.`);
                    addCharacterButton.current?.focus();
                  }}
                />
              ))}
            </ul>

            <section aria-labelledby="total-heading" className="rounded-lg border border-gray-200 bg-white p-4 sm:p-6 dark:border-slate-700 dark:bg-slate-900">
              <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 id="total-heading" className="text-lg font-semibold text-indigo-900 dark:text-indigo-200">
                    Everything still needed
                  </h2>
                  <p className="text-sm text-gray-600 dark:text-slate-400">
                    All {live.length} {live.length === 1 ? "plan" : "plans"} added up, against your last upload
                  </p>
                </div>
                <MaterialViewToggle value={view} onChange={setView} />
              </div>
              {failed ? (
                <p className="text-sm text-red-700 dark:text-red-300">The material costs couldn&apos;t be loaded. Reload the page to try again.</p>
              ) : !costs ? (
                <p className="text-sm text-gray-500 dark:text-slate-400">Loading material costs…</p>
              ) : (
                <MaterialList materials={total.materials} exp={exp} view={view} />
              )}
              <p className="mt-4 text-xs text-gray-500 dark:text-slate-400">
                Counts ascension, talent and EXP materials from the game&apos;s costs. It doesn&apos;t count resin or days, or
                materials you could craft from lower tiers. Your plans are saved with your account.
              </p>
            </section>
          </>
        )}
      </div>

      {editing && (
        <EditPlanDialog
          key={planId(editing)}
          saved={editing}
          data={data}
          isNew={!plans.some((p) => planId(p) === planId(editing))}
          onClose={() => setEditing(null)}
          onCloseFocus={restoreFocus}
          onSave={async (plan) => {
            const isNew = !plans.some((p) => planId(p) === planId(plan));
            const ok = await save(
              upsertPlan(plans, plan),
              isNew ? `Added ${planName(plan)} to your planner.` : `Updated ${planName(plan)}'s plan.`
            );
            if (ok) setEditing(null);
          }}
        />
      )}
    </GenshinShell>
  );
}

const talents = (t: CharacterTarget["talent"]) => `${t.auto} / ${t.skill} / ${t.burst}`;

/** "Lv 80 → 90 · Talents 1 / 8 / 1 → 1 / 9 / 9", only the parts that go up. */
function describe(row: Row): string {
  if (row.saved.kind === "character") {
    if (!row.character) return "Not in your latest upload";
    const now = characterNow(row.character);
    const target = targetFrom(row.saved, now);
    const parts = [];
    if (target.level > now.level) parts.push(`Lv ${now.level} → ${target.level}`);
    if (talents(target.talent) !== talents(now.talent)) parts.push(`Talents ${talents(now.talent)} → ${talents(target.talent)}`);
    return parts.join(" · ") || "Already there";
  }
  if (!row.weapon) return `${copyLabel(row.saved.location)}: not in your latest upload`;
  const target = Math.max(row.saved.level, row.weapon.level);
  const holder = copyLabel(row.saved.location).replace("Held by", "held by").replace("Unequipped", "unequipped");
  return target > row.weapon.level ? `Lv ${row.weapon.level} → ${target} · ${holder}` : `Already there · ${holder}`;
}

function PlanCard({
  row,
  onEdit,
  onRemove,
}: {
  row: Row;
  onEdit: (event: React.MouseEvent<HTMLButtonElement>) => void;
  onRemove: () => void;
}) {
  const name = planName(row.saved);
  const isCharacter = row.saved.kind === "character";
  const href = isCharacter ? `/genshin/characters/${encodeURIComponent(row.saved.key)}` : weaponHref(row.saved.key);
  const short = row.plan ? shortCount(row.plan) : null;
  const missingFromUpload = isCharacter ? !row.character : !row.weapon;
  return (
    // The status and buttons wrap under the name when the card is narrow.
    <li className="flex min-w-0 flex-wrap items-center gap-3 rounded-lg border border-gray-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900">
      {isCharacter ? (
        <RarityIcon src={getCharacterPortrait(row.saved.key)} rarity={getCharacterRarity(row.saved.key)} size={44} />
      ) : (
        <RarityIcon src={weaponIcon(row.saved.key)} rarity={getWeapon(row.saved.key)?.rarity} size={44} />
      )}
      <div className="min-w-[9rem] flex-1">
        <Link href={href} className="block truncate font-semibold text-gray-900 hover:text-indigo-700 dark:text-slate-100 dark:hover:text-indigo-300">
          {name}
        </Link>
        <p className="truncate text-xs text-gray-600 dark:text-slate-400">{describe(row)}</p>
      </div>
      <div className="ml-auto flex items-center gap-2">
        {short !== null && !missingFromUpload && (
          <span
            className={
              short
                ? "whitespace-nowrap text-xs font-semibold text-red-700 dark:text-red-300"
                : "whitespace-nowrap text-xs font-semibold text-emerald-700 dark:text-emerald-300"
            }
          >
            {short ? `${short} short` : "Ready"}
          </span>
        )}
        <div className="flex shrink-0 gap-1">
          {!missingFromUpload && (
            <Button type="button" variant="outline" size="sm" onClick={onEdit} aria-label={`Edit ${name}'s plan`}>
              Edit
            </Button>
          )}
          <Button type="button" variant="ghost" size="sm" onClick={onRemove} aria-label={`Remove ${name} from your planner`}>
            Remove
          </Button>
        </div>
      </div>
    </li>
  );
}

/** Setting a plan's targets, for a new plan or an existing one. */
function EditPlanDialog({
  saved,
  data,
  isNew,
  onClose,
  onCloseFocus,
  onSave,
}: {
  saved: SavedPlan;
  data: GenshinData;
  isNew: boolean;
  onClose: () => void;
  /** Puts focus back where it was before the dialog opened */
  onCloseFocus: () => void;
  onSave: (plan: SavedPlan) => Promise<void>;
}) {
  const character = saved.kind === "character" ? data.characters.find((c) => c.key === saved.key) : undefined;
  const weapon = saved.kind === "weapon" ? findPlannedWeapon(data.weapons, saved.key, saved.location) : undefined;
  const now = character ? characterNow(character) : null;
  const [target, setTarget] = useState<CharacterTarget | null>(() => (now ? targetFrom(saved, now) : null));
  const max = maxLevel("weapon", getWeapon(saved.key)?.rarity ?? 5);
  const [level, setLevel] = useState(() => Math.max(saved.level, weapon?.level ?? 1));
  const [saving, setSaving] = useState(false);
  const name = planName(saved);

  const submit = async () => {
    setSaving(true);
    await onSave(
      saved.kind === "character" && target
        ? { kind: "character", key: saved.key, ...target }
        : { ...saved, level }
    );
    setSaving(false);
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className="max-w-2xl"
        onCloseAutoFocus={(event) => {
          event.preventDefault();
          onCloseFocus();
        }}
      >
        <DialogTitle>{isNew ? `Plan for ${name}` : `Edit ${name}'s plan`}</DialogTitle>
        <DialogDescription>
          {saved.kind === "character"
            ? "Pick the level and talent levels to aim for."
            : `Pick the level to aim for (${copyLabel(saved.location).toLowerCase()}).`}
        </DialogDescription>
        {now && target ? (
          <CharacterTargets idPrefix="edit" now={now} value={target} onChange={setTarget} />
        ) : weapon ? (
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-slate-700 dark:bg-slate-800/50">
            <LevelTarget id="edit-level" current={weapon.level} value={level} max={max} onChange={setLevel} />
          </div>
        ) : null}
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" onClick={submit} disabled={saving}>
            {saving ? "Saving..." : isNew ? "Add to planner" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
