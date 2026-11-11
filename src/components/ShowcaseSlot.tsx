"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ChevronLeft, ChevronRight, GripVertical, X } from "lucide-react";
import ArtifactIcon from "@/components/ArtifactIcon";
import { CvMini } from "@/components/ArtifactScore";
import WeaponIcon from "@/components/WeaponIcon";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { activeSets, artifactSetName, type ActiveSet } from "@/lib/genshin/artifactSets";
import { getCharacterDetails } from "@/lib/genshin/characterDetails";
import type { ShowcaseOptions } from "@/lib/genshin/firestoreStore";
import {
  SLOT_ORDER,
  buildChanges,
  buildGaps,
  critFromArtifacts,
  mainStatShort,
  totalCritValue,
  type BuildChange,
  type BuildGap,
  type BuildSnapshot,
} from "@/lib/genshin/showcaseBuild";
import { formatSlotName } from "@/lib/genshin/stats";
import type { GoodArtifact, GoodCharacter, GoodWeapon } from "@/lib/genshin/types";
import { weaponHref, weaponName } from "@/lib/genshin/weapons";
import { getCharacterPortrait, getCharacterRarity, rarityBackground } from "@/lib/genshinCharacters";
import { cn, formatCharacterDisplayName } from "@/lib/utils";

/** The card's soft tint and border for each element, when element colors are on. */
const ELEMENT_CARD: Record<string, string> = {
  Anemo: "border-teal-200 bg-teal-50 dark:border-teal-800 dark:bg-teal-900/20",
  Geo: "border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-900/20",
  Electro: "border-purple-200 bg-purple-50 dark:border-purple-800 dark:bg-purple-900/20",
  Dendro: "border-lime-200 bg-lime-50 dark:border-lime-800 dark:bg-lime-900/20",
  Hydro: "border-sky-200 bg-sky-50 dark:border-sky-800 dark:bg-sky-900/20",
  Pyro: "border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20",
  Cryo: "border-cyan-200 bg-cyan-50 dark:border-cyan-800 dark:bg-cyan-900/20",
};
/** The dot beside the name, so the tint isn't the only sign of the element. */
const ELEMENT_DOT: Record<string, string> = {
  Anemo: "bg-teal-500",
  Geo: "bg-amber-500",
  Electro: "bg-purple-500",
  Dendro: "bg-lime-500",
  Hydro: "bg-sky-500",
  Pyro: "bg-red-500",
  Cryo: "bg-cyan-500",
};
const SLOT_CARD = "border-indigo-200 dark:border-indigo-800 bg-indigo-50/40 dark:bg-indigo-900/20";

function listSlots(slots: string[]): string {
  return slots.length > 1 ? `${slots.slice(0, -1).join(", ")} or ${slots[slots.length - 1]}` : (slots[0] ?? "");
}

function gapText(gap: BuildGap): string {
  switch (gap.kind) {
    case "level":
      return `Level ${gap.level}/90`;
    case "weaponLevel":
      return `Weapon Lv ${gap.level}/90`;
    case "noWeapon":
      return "No weapon";
    case "missingPieces":
      return gap.slots.length === 5 ? "No artifacts" : `No ${listSlots(gap.slots)}`;
    case "leveling":
      return `${gap.count} ${gap.count === 1 ? "piece" : "pieces"} below +20`;
  }
}

/** One change since the previous upload, as the showcase and the upload summary word it. */
export function changeText(change: BuildChange): string {
  switch (change.kind) {
    case "new":
      return "New since your last upload";
    case "level":
      return `Level ${change.from} → ${change.to}`;
    case "constellation":
      return `C${change.from} → C${change.to}`;
    case "talent":
      return `${change.talent} ${change.from} → ${change.to}`;
    case "newWeapon":
      return change.key ? `New weapon: ${weaponName(change.key)}` : "Weapon taken off";
    case "weaponLevel":
      return `Weapon Lv ${change.from} → ${change.to}`;
    case "refinement":
      return `Weapon R${change.from} → R${change.to}`;
    case "totalCv":
      return `Total CV ${change.by > 0 ? "+" : "−"}${Math.abs(change.by)}`;
  }
}

type Passive = { name: string; parts: { text: string; value: boolean }[] } | null;

/** The weapon's passive at its refinement, loaded when first opened so the large weapon data stays off this page. */
function WeaponPassiveButton({ weapon, preview }: { weapon: GoodWeapon; preview: boolean }) {
  const [passive, setPassive] = useState<Passive | undefined>(undefined);
  const name = weaponName(weapon.key);
  return (
    <Popover
      onOpenChange={(open) => {
        if (open && passive === undefined) {
          import("@/lib/genshin/weaponDetails").then((mod) =>
            setPassive(mod.getWeaponPassive(weapon.key, weapon.refinement))
          );
        }
      }}
    >
      <PopoverTrigger asChild>
        <button
          type="button"
          className="block max-w-full truncate rounded text-left text-xs font-medium text-gray-900 underline decoration-dotted underline-offset-[3px] hover:decoration-solid focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:text-slate-100"
          aria-label={`${name}: show its passive`}
        >
          {name}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-72 text-xs leading-relaxed">
        {passive === undefined ? (
          <p className="text-gray-500 dark:text-slate-400">Loading…</p>
        ) : passive ? (
          <>
            <p className="text-sm font-semibold text-gray-900 dark:text-slate-100">{passive.name}</p>
            <p className="mt-1 text-gray-600 dark:text-slate-400">
              {passive.parts.map((part, i) =>
                part.value ? (
                  <span key={i} className="font-semibold text-indigo-700 dark:text-indigo-300">
                    {part.text}
                  </span>
                ) : (
                  <span key={i}>{part.text}</span>
                )
              )}
            </p>
            <p className="mt-1 text-gray-500 dark:text-slate-400">At R{weapon.refinement}</p>
          </>
        ) : (
          <p className="text-gray-500 dark:text-slate-400">This weapon has no passive.</p>
        )}
        {!preview && (
          <Link
            href={weaponHref(weapon.key)}
            className="mt-2 inline-block font-medium text-indigo-700 hover:underline dark:text-indigo-300"
          >
            Open the weapon&apos;s page
          </Link>
        )}
      </PopoverContent>
    </Popover>
  );
}

/** A set bonus badge that opens the set's bonus text, like the weapon's passive. */
function SetBonusButton({ set }: { set: ActiveSet }) {
  const full = set.count >= 4;
  const name = artifactSetName(set.setKey);
  const label = `${full ? 4 : 2}-piece · ${name}`;
  const bonuses = [
    { pieces: 2, text: set.info?.twoPiece },
    ...(full ? [{ pieces: 4, text: set.info?.fourPiece }] : []),
  ];
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={`${label}: show the set bonus`}
          className={cn(
            "block max-w-full truncate rounded-full px-2 py-px text-left text-[11px] font-semibold underline decoration-dotted underline-offset-2 hover:decoration-solid focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500",
            full
              ? "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200"
              : "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300"
          )}
        >
          {label}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-72 text-xs leading-relaxed">
        <p className="text-sm font-semibold text-gray-900 dark:text-slate-100">{name}</p>
        {bonuses.map(({ pieces, text }) => (
          <p key={pieces} className="mt-1 text-gray-600 dark:text-slate-400">
            <span className="font-semibold text-gray-900 dark:text-slate-100">{pieces}-piece:</span>{" "}
            {text ?? "This set is newer than the site's game data."}
          </p>
        ))}
      </PopoverContent>
    </Popover>
  );
}

export interface SlotMoveProps {
  canMoveLeft: boolean;
  canMoveRight: boolean;
  onMove: (direction: -1 | 1) => void;
  /** Something is dragged over this card, so it shows where the drop goes */
  dropTarget: boolean;
  dragging: boolean;
  dragHandlers: {
    onDragStart: (e: React.DragEvent) => void;
    onDragEnd: () => void;
    onDragOver: (e: React.DragEvent) => void;
    onDragLeave: () => void;
    onDrop: (e: React.DragEvent) => void;
  };
}

interface ShowcaseSlotProps {
  index: number;
  character: GoodCharacter & { weapon?: GoodWeapon; artifacts?: GoodArtifact[] };
  options: ShowcaseOptions;
  /** The Traveler's element, picked on their page, since the export doesn't say */
  travelerElement?: string | null;
  /** The previous upload's builds, for "Since your last upload" */
  previousBuilds: BuildSnapshot | null;
  /** The home page sample: no links, since its characters have no pages */
  preview: boolean;
  hidden?: boolean;
  onClear: () => void;
  move: SlotMoveProps;
  /** The slot's character picker */
  children: React.ReactNode;
}

/**
 * One filled showcase slot (option B from `.mockups/showcase-slots.html`, with
 * the additions from `.mockups/showcase-ideas.html`): the portrait beside the
 * name, level, constellation pips and talents, then the weapon, the five
 * pieces and their main stats, Total CV and CRIT from artifacts, the set
 * bonuses, what's still missing and what changed since the previous upload.
 */
export default function ShowcaseSlot({
  index,
  character: char,
  options,
  travelerElement,
  previousBuilds,
  preview,
  hidden,
  onClear,
  move,
  children,
}: ShowcaseSlotProps) {
  const name = formatCharacterDisplayName(char.key);
  const element = getCharacterDetails(char.key)?.element ?? travelerElement ?? null;
  const tinted = options.elementColors && element && ELEMENT_CARD[element];
  const pieces = char.artifacts ?? [];
  const totalCv = totalCritValue(pieces);
  const crit = critFromArtifacts(pieces);
  const sets = activeSets(pieces);
  const gaps = buildGaps(char, char.weapon, pieces);
  const changes = buildChanges(previousBuilds, char, char.weapon, pieces);
  const piece = (slot: string) => pieces.find((p) => p.slotKey === slot);

  const identity = (
    <>
      <div
        className={cn(
          "relative h-16 w-16 flex-none overflow-hidden rounded-lg ring-1 ring-indigo-200 dark:ring-indigo-800 group-hover:ring-indigo-500",
          rarityBackground(getCharacterRarity(char.key))
        )}
      >
        <Image
          src={getCharacterPortrait(char.key)}
          alt=""
          fill
          sizes="64px"
          className="object-cover"
          draggable={false}
          onError={(e) => {
            e.currentTarget.onerror = null;
            e.currentTarget.src = "/placeholder.svg";
          }}
        />
      </div>
      <div className="min-w-0">
        <p className="flex items-center gap-1.5 text-sm font-semibold leading-tight text-gray-900 group-hover:underline dark:text-slate-100">
          {tinted && (
            <span className={cn("h-2 w-2 flex-none rounded-full", ELEMENT_DOT[element])} aria-hidden="true" />
          )}
          <span className="truncate">{name}</span>
        </p>
        <p className="mt-0.5 flex items-center gap-1 text-xs text-gray-500 dark:text-slate-400">
          Lv. {char.level} ·
          <span className="inline-flex gap-[3px]" aria-hidden="true" title={`C${char.constellation}`}>
            {[1, 2, 3, 4, 5, 6].map((n) => (
              <span
                key={n}
                className={cn(
                  "h-[7px] w-[7px] rounded-full border",
                  n <= char.constellation
                    ? "border-indigo-600 bg-indigo-600 dark:border-indigo-400 dark:bg-indigo-400"
                    : "border-gray-500 dark:border-slate-400"
                )}
              />
            ))}
          </span>
          <span className="sr-only">C{char.constellation}</span>
        </p>
        {char.talent && (
          <p className="mt-0.5 text-xs text-gray-500 dark:text-slate-400" title="Normal Attack / Skill / Burst">
            Talents{" "}
            <span className="font-semibold text-gray-900 dark:text-slate-100">
              {char.talent.auto} / {char.talent.skill} / {char.talent.burst}
            </span>
            <span className="sr-only"> (Normal Attack / Skill / Burst)</span>
          </p>
        )}
      </div>
    </>
  );

  const iconButton =
    "rounded-full p-1 text-gray-500 hover:bg-white hover:text-gray-900 disabled:pointer-events-none disabled:opacity-30 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100";

  return (
    <div
      className={cn(
        "relative flex flex-col rounded-xl border p-3",
        hidden && "hidden sm:flex",
        tinted || SLOT_CARD,
        move.dragging && "opacity-50",
        move.dropTarget && "outline-dashed outline-2 outline-offset-2 outline-indigo-500"
      )}
      draggable
      {...move.dragHandlers}
    >
      <div className="mb-3 flex min-h-6 items-center justify-between gap-1">
        <span className="flex items-center gap-0.5 text-xs font-semibold uppercase tracking-wide text-indigo-700 dark:text-indigo-300">
          <GripVertical className="h-4 w-4 cursor-grab text-gray-500 dark:text-slate-400" aria-hidden="true" />
          Slot {index + 1}
        </span>
        <span className="flex items-center">
          <button
            type="button"
            onClick={() => move.onMove(-1)}
            disabled={!move.canMoveLeft}
            className={iconButton}
            aria-label={`Move ${name} left`}
            title="Move left"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => move.onMove(1)}
            disabled={!move.canMoveRight}
            className={iconButton}
            aria-label={`Move ${name} right`}
            title="Move right"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={onClear}
            className={cn(iconButton, "hover:text-red-600 dark:hover:text-red-300")}
            aria-label={`Clear slot ${index + 1}`}
            title="Clear slot"
          >
            <X className="h-4 w-4" />
          </button>
        </span>
      </div>

      {preview ? (
        <div className="flex items-start gap-3">{identity}</div>
      ) : (
        <Link
          href={`/genshin/characters/${encodeURIComponent(char.key)}`}
          className="group flex items-start gap-3 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
          title={`View ${name} details`}
          draggable={false}
        >
          {identity}
        </Link>
      )}

      {char.weapon ? (
        <div className="mt-3 flex min-w-0 items-center gap-2">
          <WeaponIcon weaponKey={char.weapon.key} size="sm" />
          <div className="min-w-0">
            <WeaponPassiveButton weapon={char.weapon} preview={preview} />
            <p className="mt-0.5 flex gap-1 text-[11px] font-semibold text-gray-600 dark:text-slate-400">
              <span className="rounded-full bg-gray-100 px-1.5 dark:bg-slate-800">Lv {char.weapon.level}</span>
              <span className="rounded-full bg-gray-100 px-1.5 dark:bg-slate-800">R{char.weapon.refinement}</span>
            </p>
          </div>
        </div>
      ) : (
        <div className="mt-3 flex items-center gap-2 text-xs text-gray-500 dark:text-slate-400">
          <span className="h-9 w-9 rounded-md border border-dashed border-gray-300 dark:border-slate-600" aria-hidden="true" />
          No weapon
        </div>
      )}

      <ul className="mt-3 grid grid-cols-5 gap-1" aria-label="Artifacts">
        {SLOT_ORDER.map((slot) => {
          const p = piece(slot);
          return (
            <li key={slot} className="flex flex-col items-center gap-0.5" title={formatSlotName(slot)}>
              {p ? (
                <ArtifactIcon artifact={p} size="xs" />
              ) : (
                <span className="h-7 w-7 rounded-md border border-dashed border-gray-300 dark:border-slate-600" aria-hidden="true" />
              )}
              <span className="sr-only">
                {formatSlotName(slot)}: {p ? artifactSetName(p.setKey) : "empty"}
              </span>
              {options.pieceCv &&
                (p ? (
                  <CvMini artifact={p} />
                ) : (
                  <span className="text-[11px] leading-4 text-gray-500 dark:text-slate-400" aria-hidden="true">
                    –
                  </span>
                ))}
            </li>
          );
        })}
      </ul>

      <p className="mt-1.5 text-[11px] leading-snug text-gray-600 dark:text-slate-400" title="Sands · Goblet · Circlet">
        <span className="sr-only">Main stats, sands, goblet and circlet: </span>
        {(["sands", "goblet", "circlet"] as const).map((slot, i) => {
          const p = piece(slot);
          return (
            <span key={slot}>
              {i > 0 && " · "}
              {p ? (
                <span className="font-semibold text-gray-900 dark:text-slate-100">{p.mainStatKey ? mainStatShort(p.mainStatKey) : "–"}</span>
              ) : (
                <span>no {slot}</span>
              )}
            </span>
          );
        })}
      </p>

      <p className="mt-3 flex items-baseline justify-between gap-2">
        <span className="text-xs text-gray-500 dark:text-slate-400">Total CV</span>
        <span className="text-lg font-bold tabular-nums text-indigo-900 dark:text-indigo-200">{totalCv}</span>
      </p>
      <p
        className="text-[11px] text-gray-500 dark:text-slate-400"
        title={crit.partial ? "A CRIT main stat below 5★ +20 isn't counted" : undefined}
      >
        From artifacts: CRIT Rate{" "}
        <span className="font-semibold text-gray-900 dark:text-slate-100">{crit.critRate}%</span> · CRIT DMG{" "}
        <span className="font-semibold text-gray-900 dark:text-slate-100">{crit.critDMG}%</span>
        {crit.partial && <span aria-hidden="true">*</span>}
        {crit.partial && <span className="sr-only"> (a CRIT main stat below 5★ +20 isn&apos;t counted)</span>}
      </p>

      {sets.length > 0 ? (
        <ul className="mt-2 flex flex-col items-start gap-1" aria-label="Set bonuses">
          {sets.map((set) => (
            <li key={set.setKey} className="max-w-full">
              <SetBonusButton set={set} />
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 text-xs text-gray-500 dark:text-slate-400">No set bonus</p>
      )}

      <ul className="mt-2 space-y-0.5 text-[11px] text-gray-600 dark:text-slate-400" aria-label="Still missing">
        {gaps.length > 0 ? (
          gaps.map((gap) => (
            <li key={gap.kind} className="flex items-baseline gap-1.5">
              <span className="h-1.5 w-1.5 flex-none -translate-y-px rounded-full bg-amber-600 dark:bg-amber-400" aria-hidden="true" />
              {gapText(gap)}
            </li>
          ))
        ) : (
          <li className="flex items-baseline gap-1.5">
            <span className="h-1.5 w-1.5 flex-none -translate-y-px rounded-full bg-emerald-600 dark:bg-emerald-400" aria-hidden="true" />
            Nothing missing
          </li>
        )}
      </ul>

      {changes.length > 0 && (
        <div className="mt-2">
          <p className="text-[11px] text-gray-500 dark:text-slate-400">Since your last upload</p>
          <ul className="mt-0.5 flex flex-wrap gap-1">
            {changes.map((change, i) => (
              <li
                key={i}
                className="max-w-full truncate rounded-full bg-indigo-100 px-2 text-[11px] font-semibold text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300"
              >
                {changeText(change)}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-auto pt-3">{children}</div>
    </div>
  );
}
