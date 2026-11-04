"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useGenshinData } from "@/hooks/useGenshinData";
import { Button } from "@/components/ui/button";
import GenshinShell from "@/components/GenshinShell";
import WeaponIcon from "@/components/WeaponIcon";
import ArtifactSetBonuses from "@/components/ArtifactSetBonuses";
import ArtifactSlotCard from "@/components/ArtifactSlotCard";
import CharacterGameInfo, { Stars } from "@/components/CharacterGameInfo";
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
import { getCharacterDetails } from "@/lib/genshin/characterDetails";
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
          <TalentsPanel character={character} />
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

/** Portrait, the character's game info, and level chips. */
function ProfileCard({ character, name }: { character: GoodCharacter; name: string }) {
  const [imageError, setImageError] = useState(false);
  const rarity = getCharacterRarity(character.key);
  const { travelerElement, setTravelerElement } = useGenshinData();
  return (
    <section aria-label={`About ${name}`} className={PANEL}>
      <div className="flex flex-col gap-6 sm:flex-row">
        <div
          className={cn(
            "relative h-36 w-36 shrink-0 overflow-hidden rounded-xl ring-1 ring-indigo-100 dark:ring-indigo-900 sm:h-44 sm:w-44",
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
        <div className="flex-1 space-y-3">
          <CharacterGameInfo
            characterKey={character.key}
            travelerElement={travelerElement}
            onTravelerElement={setTravelerElement}
          />
          <div className="flex flex-wrap gap-1.5">
            <Chip>Lv. {character.level}</Chip>
            <Chip>C{character.constellation}</Chip>
            {character.ascension != null && <Chip>Ascension {character.ascension}</Chip>}
          </div>
        </div>
      </div>
    </section>
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
              <div
                role="group"
                aria-label="Refinement"
                className="inline-flex rounded-md border border-gray-200 dark:border-slate-700 p-0.5"
              >
                {[1, 2, 3, 4, 5].map((r) => {
                  const own = r === weapon.refinement;
                  const pressed = r === refinement;
                  return (
                    <button
                      key={r}
                      type="button"
                      aria-pressed={pressed}
                      title={own ? "Your refinement" : undefined}
                      onClick={() => setShown(r)}
                      className={cn(
                        "inline-flex items-center gap-1 rounded px-2.5 py-1 text-xs font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500",
                        pressed
                          ? "bg-indigo-600 text-white"
                          : "text-gray-700 dark:text-slate-300 hover:bg-indigo-50 dark:hover:bg-indigo-900/40"
                      )}
                    >
                      R{r}
                      {own && (
                        <>
                          <svg
                            aria-hidden="true"
                            viewBox="0 0 24 24"
                            className={cn("h-3.5 w-3.5", pressed ? "fill-white" : "fill-amber-400")}
                          >
                            <path d="M12 2.5l2.9 6.1 6.6.8-4.9 4.6 1.3 6.6L12 17.3l-5.9 3.3 1.3-6.6-4.9-4.6 6.6-.8z" />
                          </svg>
                          <span className="sr-only">(yours)</span>
                        </>
                      )}
                    </button>
                  );
                })}
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
            {description && (
              <p className="text-sm italic text-gray-500 dark:text-slate-400">{description}</p>
            )}
          </div>
        )}
      </div>
    </section>
  );
}

/** The three talents as small cards, with their in-game names when known. */
function TalentsPanel({ character }: { character: GoodCharacter }) {
  if (!character.talent) return null;
  const names = getCharacterDetails(character.key)?.talents;
  const talents = [
    { kind: "Normal Attack", level: character.talent.auto, name: names?.auto },
    { kind: "Elemental Skill", level: character.talent.skill, name: names?.skill },
    { kind: "Elemental Burst", level: character.talent.burst, name: names?.burst },
  ];
  return (
    <section className={PANEL}>
      <PanelHeading>Talents</PanelHeading>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        {talents.map((talent) => (
          <div
            key={talent.kind}
            className="rounded-lg bg-indigo-50/60 dark:bg-indigo-900/20 ring-1 ring-indigo-100 dark:ring-indigo-900 p-3"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-indigo-700 dark:text-indigo-300">
                {talent.kind}
              </span>
              <span className="rounded bg-white dark:bg-slate-900 px-1.5 text-sm font-semibold text-gray-900 dark:text-slate-100">
                <span className="sr-only">Level </span>
                {talent.level ?? "—"}
              </span>
            </div>
            {talent.name && (
              <p className="mt-1 text-sm text-gray-700 dark:text-slate-300">{talent.name}</p>
            )}
          </div>
        ))}
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
