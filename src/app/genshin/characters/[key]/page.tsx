"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useCharacterExtras } from "@/hooks/useCharacterExtras";
import { useGenshinData } from "@/hooks/useGenshinData";
import { Button } from "@/components/ui/button";
import GenshinShell from "@/components/GenshinShell";
import WeaponIcon from "@/components/WeaponIcon";
import ArtifactSetBonuses from "@/components/ArtifactSetBonuses";
import ArtifactSlotCard from "@/components/ArtifactSlotCard";
import { BaseStats, ChooseElementHint, ConstellationPicker, TalentKindLabel, TalentText } from "@/components/CharacterExtras";
import CharacterGameInfo, { Stars } from "@/components/CharacterGameInfo";
import NumberButtons from "@/components/NumberButtons";
import RequireAuth from "@/components/RequireAuth";
import { cn, formatCharacterDisplayName } from "@/lib/utils";
import { buildEquipmentIndex } from "@/lib/genshin/equipment";
import { weaponName } from "@/lib/genshin/weapons";
import {
  canRefine,
  getWeaponDescription,
  getWeaponPassive,
  getWeaponRarity,
  getWeaponStats,
} from "@/lib/genshin/weaponDetails";
import { getCharacterDetails, isTraveler } from "@/lib/genshin/characterDetails";
import { TALENT_KINDS, type GameText } from "@/lib/genshin/characterExtras";
import { getCharacterPortrait, getCharacterRarity, rarityBackground } from "@/lib/genshinCharacters";
import type { GoodArtifact, GoodCharacter, GoodWeapon } from "@/lib/genshin/types";

const SLOT_ORDER = ["flower", "plume", "sands", "goblet", "circlet"];

const PANEL = "bg-white dark:bg-slate-900 shadow sm:rounded-lg p-6 sm:p-8";

export default function CharacterDetailPage() {
  return (
    <RequireAuth skeleton="detail">
      <CharacterDetail />
    </RequireAuth>
  );
}

function CharacterDetail() {
  const params = useParams();
  const rawKey = typeof params.key === "string" ? params.key : "";
  const characterKey = decodeURIComponent(rawKey);
  const { data: genshinData } = useGenshinData();

  const character = useMemo(() => {
    return genshinData?.characters.find((c) => c.key === characterKey) ?? null;
  }, [genshinData, characterKey]);

  const equipment = useMemo(
    () => (genshinData ? buildEquipmentIndex(genshinData).get(characterKey) : undefined),
    [genshinData, characterKey]
  );
  const weapon = equipment?.weapon ?? null;
  const artifacts = equipment?.artifacts ?? [];

  const displayName = formatCharacterDisplayName(characterKey);
  const back = (
    <div className="mt-8 flex flex-wrap gap-3">
      <Button asChild>
        <Link href="/genshin/characters">Back to Characters</Link>
      </Button>
    </div>
  );

  if (!character) {
    return (
      <GenshinShell title={displayName}>
        <p className="text-gray-600 dark:text-slate-400">
          You don&apos;t have this character in your latest upload.
        </p>
        {back}
      </GenshinShell>
    );
  }

  return (
    <GenshinShell title={displayName} panel="none">
      {/* Same width and margins as PageShell's own panel, split into several panels. */}
      <div className="max-w-7xl mx-auto py-12 sm:px-6 lg:px-8">
        <div className="space-y-6">
          <ProfileCard character={character} name={displayName} />
          <WeaponPanel weapon={weapon} />
          <ArtifactsPanel artifacts={artifacts} />
        </div>
        <div className="px-4 sm:px-0">{back}</div>
      </div>
    </GenshinShell>
  );
}

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded bg-gray-100 dark:bg-slate-800 px-2 py-0.5 text-sm text-gray-700 dark:text-slate-300">
      {children}
    </span>
  );
}

function PanelHeading({ children }: { children: React.ReactNode }) {
  return <h2 className="mb-3 text-lg font-semibold text-indigo-900 dark:text-indigo-200">{children}</h2>;
}

/**
 * Portrait with base stats, the character's game info, then their build:
 * the strip of big numbers, and the constellations.
 */
function ProfileCard({ character, name }: { character: GoodCharacter; name: string }) {
  const [imageError, setImageError] = useState(false);
  const rarity = getCharacterRarity(character.key);
  const { travelerElement, setTravelerElement } = useGenshinData();
  const extras = useCharacterExtras(character.key, travelerElement, character.level, character.ascension ?? 0);
  return (
    <section aria-label={`About ${name}`} className={PANEL}>
      <div className="flex flex-col gap-6 sm:flex-row">
        <div className="w-full shrink-0 space-y-3 sm:w-44">
          <div
            className={cn(
              "relative h-36 w-36 overflow-hidden rounded-xl ring-1 ring-indigo-100 dark:ring-indigo-900 sm:h-44 sm:w-44",
              rarityBackground(rarity)
            )}
          >
            <Image
              src={imageError ? "/placeholder.svg" : getCharacterPortrait(character.key)}
              alt=""
              fill
              sizes="(min-width: 640px) 176px, 144px"
              className="object-cover"
              priority
              onError={() => setImageError(true)}
            />
          </div>
          <BaseStats stats={extras.stats} level={character.level} loading={extras.loading} variant="list" />
        </div>
        <div className="min-w-0 flex-1 space-y-3">
          <CharacterGameInfo
            characterKey={character.key}
            travelerElement={travelerElement}
            onTravelerElement={setTravelerElement}
          />
        </div>
      </div>
      <div className="mt-5">
        <BuildStrip character={character} talents={extras.talents} />
      </div>
      {isTraveler(character.key) && !travelerElement && (
        <div className="mt-3">
          <ChooseElementHint />
        </div>
      )}
      {(extras.loading || extras.constellations) && (
        <div className="mt-5">
          <ConstellationPicker
            constellations={extras.constellations}
            loading={extras.loading}
            owned={character.constellation}
          />
        </div>
      )}
    </section>
  );
}

const BIG_NUMBER = "text-3xl font-bold tabular-nums text-indigo-900 dark:text-indigo-200";
const STRIP_BORDER = "border-indigo-100 dark:border-indigo-900";

/** Level, constellation, ascension and the three talents in one strip. Pressing a talent opens its description. */
function BuildStrip({ character, talents }: { character: GoodCharacter; talents: GameText[] | null }) {
  const [open, setOpen] = useState<number | null>(null);
  const names = getCharacterDetails(character.key)?.talents;
  const levels = character.talent;
  const row = levels
    ? [
        { level: levels.auto, name: talents?.[0].name ?? names?.auto },
        { level: levels.skill, name: talents?.[1].name ?? names?.skill },
        { level: levels.burst, name: talents?.[2].name ?? names?.burst },
      ]
    : [];
  const stats = [
    { label: "Level", value: character.level },
    { label: "Const.", spoken: "Constellation", value: `C${character.constellation}` },
    { label: "Ascension", value: character.ascension ?? "—" },
  ];
  const openTalent = open !== null ? talents?.[open] : null;
  return (
    <>
      <div
        className={cn(
          "grid grid-cols-3 overflow-hidden rounded-lg bg-indigo-50/60 dark:bg-indigo-900/20 ring-1 ring-indigo-100 dark:ring-indigo-900",
          "lg:grid-cols-[repeat(3,minmax(0,0.7fr))_repeat(3,minmax(0,1.2fr))]"
        )}
      >
        {stats.map((stat, i) => (
          <div
            key={stat.label}
            className={cn(
              "flex flex-col items-center justify-between gap-1 px-2 py-3 text-center",
              i > 0 && "border-l",
              STRIP_BORDER
            )}
          >
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-600 dark:text-slate-400">
              {stat.spoken ? (
                <>
                  <span aria-hidden="true">{stat.label}</span>
                  <span className="sr-only">{stat.spoken}</span>
                </>
              ) : (
                stat.label
              )}
            </p>
            <p className={BIG_NUMBER}>{stat.value}</p>
          </div>
        ))}
        {row.map((talent, i) => {
          const cell = cn(
            "col-span-3 flex items-center justify-between gap-3 border-t px-3 py-3 text-left",
            "lg:col-span-1 lg:flex-col lg:border-l lg:border-t-0 lg:text-center",
            STRIP_BORDER
          );
          const label = (
            <span className="block min-w-0">
              <TalentKindLabel kind={TALENT_KINDS[i]} arrow={!!talents} open={open === i} className="lg:justify-center" />
              {talent.name && (
                <span className="mt-0.5 block text-xs text-gray-600 dark:text-slate-400">{talent.name}</span>
              )}
            </span>
          );
          const value = (
            <span className={BIG_NUMBER}>
              <span className="sr-only">Level </span>
              {talent.level ?? "—"}
            </span>
          );
          // No description to open while it loads, or for a Traveler with no element.
          return talents ? (
            <button
              key={TALENT_KINDS[i]}
              type="button"
              aria-expanded={open === i}
              aria-controls="character-talent"
              onClick={() => setOpen(open === i ? null : i)}
              className={cn(
                cell,
                "hover:bg-indigo-100/70 dark:hover:bg-indigo-900/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-indigo-500",
                open === i && "bg-indigo-100 dark:bg-indigo-900/50"
              )}
            >
              {label}
              {value}
            </button>
          ) : (
            <div key={TALENT_KINDS[i]} className={cell}>
              {label}
              {value}
            </div>
          );
        })}
      </div>
      {openTalent ? (
        <TalentText talent={openTalent} id="character-talent" />
      ) : (
        talents && (
          <p className="mt-2 text-xs text-gray-500 dark:text-slate-400">Press a talent to read what it does.</p>
        )
      )}
    </>
  );
}

/**
 * The weapon, its stats at its level, and its passive. R1 to R5 buttons
 * preview other refinements; the weapon's own refinement has a star.
 */
function WeaponPanel({ weapon }: { weapon: GoodWeapon | null }) {
  const [shown, setShown] = useState<number | null>(null);
  if (!weapon) {
    return (
      <section className={PANEL}>
        <PanelHeading>Weapon</PanelHeading>
        <p className="text-gray-600 dark:text-slate-400">No weapon in your uploaded data.</p>
      </section>
    );
  }
  const rarity = getWeaponRarity(weapon.key);
  const stats = getWeaponStats(weapon.key, weapon.level, weapon.ascension ?? 0);
  const refinement = shown ?? weapon.refinement;
  const passive = getWeaponPassive(weapon.key, refinement);
  const description = getWeaponDescription(weapon.key);
  return (
    <section className={PANEL}>
      <PanelHeading>Weapon</PanelHeading>
      <div className="grid gap-6 md:grid-cols-[minmax(0,20rem)_1fr]">
        <div>
          <div className="flex items-center gap-4">
            <WeaponIcon weaponKey={weapon.key} size="lg" />
            <div>
              <p className="font-semibold text-gray-900 dark:text-slate-100">{weaponName(weapon.key)}</p>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                <Chip>Lv. {weapon.level}</Chip>
                <Chip>R{weapon.refinement}</Chip>
                {rarity && (
                  <Chip>
                    <Stars rarity={rarity} />
                  </Chip>
                )}
              </div>
            </div>
          </div>
          {stats && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              <Chip>Base ATK {stats.baseAtk}</Chip>
              {stats.substat && (
                <Chip>
                  {stats.substat.name} {stats.substat.value}
                </Chip>
              )}
            </div>
          )}
        </div>
        {(passive || description) && (
          <div className="space-y-3">
            {passive && canRefine(weapon.key) && (
              <NumberButtons
                label="Refinement"
                prefix="R"
                count={5}
                selected={refinement}
                onSelect={setShown}
                isMarked={(r) => r === weapon.refinement}
                markLabel="yours"
                markTitle="Your refinement"
              />
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
            {description && (
              <p className="text-sm italic text-gray-500 dark:text-slate-400">{description}</p>
            )}
          </div>
        )}
      </div>
    </section>
  );
}

/** Active set bonuses beside the five pieces, each with its main stat and substats. */
function ArtifactsPanel({ artifacts }: { artifacts: GoodArtifact[] }) {
  const pieces = [...artifacts].sort(
    (a, b) => SLOT_ORDER.indexOf(a.slotKey) - SLOT_ORDER.indexOf(b.slotKey)
  );
  return (
    <section className={PANEL}>
      <PanelHeading>Artifacts</PanelHeading>
      {pieces.length === 0 ? (
        <p className="text-gray-600 dark:text-slate-400">No artifacts equipped.</p>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[16rem_1fr]">
          <div className="space-y-2 text-sm">
            <ArtifactSetBonuses pieces={pieces} />
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5">
            {pieces.map((piece, i) => (
              <ArtifactSlotCard key={`${piece.slotKey}-${i}`} artifact={piece} />
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
