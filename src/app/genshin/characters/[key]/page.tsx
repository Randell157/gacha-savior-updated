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
import CharacterStepper from "@/components/CharacterStepper";
import CharacterPlan from "@/components/CharacterPlan";
import CharacterNotes from "@/components/CharacterNotes";
import BuildCard from "@/components/BuildCard";
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { IdCard } from "lucide-react";
import RequireAuth from "@/components/RequireAuth";
import { QuickViewBody } from "@/components/CharacterQuickView";
import SignedOutBanner from "@/components/SignedOutBanner";
import WeaponPassive from "@/components/WeaponPassive";
import { cn, formatCharacterDisplayName } from "@/lib/utils";
import { buildEquipmentIndex } from "@/lib/genshin/equipment";
import { weaponHref, weaponName } from "@/lib/genshin/weapons";
import { getWeaponRarity, getWeaponStats } from "@/lib/genshin/weaponDetails";
import { getCharacterDetails, isTraveler } from "@/lib/genshin/characterDetails";
import { getSplashArt } from "@/lib/genshin/splashArt";
import { TALENT_KINDS, type GameText } from "@/lib/genshin/characterExtras";
import { getCharacterPortrait, getCharacterRarity, rarityBackground } from "@/lib/genshinCharacters";
import type { GoodArtifact, GoodCharacter, GoodWeapon } from "@/lib/genshin/types";

const SLOT_ORDER = ["flower", "plume", "sands", "goblet", "circlet"];

const PANEL = "bg-white dark:bg-slate-900 shadow sm:rounded-lg p-6 sm:p-8";

export default function CharacterDetailPage() {
  return (
    // Signed out, the page shows the character's game info under the log-in banner.
    <RequireAuth skeleton="detail" signedOut={<CharacterDetail signedOut />}>
      <CharacterDetail />
    </RequireAuth>
  );
}

function CharacterDetail({ signedOut = false }: { signedOut?: boolean }) {
  const params = useParams();
  const rawKey = typeof params.key === "string" ? params.key : "";
  const characterKey = decodeURIComponent(rawKey);
  const { data: genshinData, travelerElement } = useGenshinData();

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
  if (!character) {
    // A character in the game data (design "A" from `.mockups/unowned-pages.html`):
    // its game info, as the roster's quick view shows it, under a banner or a note.
    if (getCharacterDetails(characterKey)) {
      return (
        <GenshinShell title={displayName}>
          {signedOut ? (
            <SignedOutBanner>Log in to see your own build and plan for {displayName} here.</SignedOutBanner>
          ) : (
            <p className="mb-6 rounded-md bg-gray-50 px-3 py-2 text-sm text-gray-700 dark:bg-slate-800/60 dark:text-slate-300">
              You don&apos;t have {displayName} in your latest upload, so this is the game&apos;s own information.
            </p>
          )}
          <div className="space-y-5">
            <QuickViewBody characterKey={characterKey} name={displayName} footer={false} stats={false} />
          </div>
        </GenshinShell>
      );
    }
    return (
      <GenshinShell title={displayName}>
        <p className="text-gray-600 dark:text-slate-400">
          {signedOut ? "There's no character by that name." : "You don't have this character in your latest upload."}
        </p>
        <div className="mt-8">
          <Button asChild>
            <Link href="/genshin/characters">Back to Characters</Link>
          </Button>
        </div>
      </GenshinShell>
    );
  }

  return (
    <GenshinShell
      title={displayName}
      panel="none"
      actions={
        <>
          <Dialog>
            <DialogTrigger asChild>
              <Button type="button" variant="outline">
                <IdCard className="mr-1.5 h-4 w-4" aria-hidden="true" />
                Build card
              </Button>
            </DialogTrigger>
            {/* Wide enough for the card's three columns; scrolls on short screens. */}
            <DialogContent aria-describedby={undefined} className="max-h-[90vh] max-w-6xl overflow-y-auto p-4 sm:p-6">
              <DialogTitle>{displayName}&apos;s build</DialogTitle>
              <BuildCard
                character={{ ...character, weapon: weapon ?? undefined, artifacts }}
                label="Build card"
                travelerElement={travelerElement}
              />
            </DialogContent>
          </Dialog>
          <CharacterStepper data={genshinData} characterKey={characterKey} />
        </>
      }
    >
      {/* Same width and margins as PageShell's own panel, split into several panels. */}
      <div className="max-w-7xl mx-auto py-4 sm:py-12 sm:px-6 lg:px-8">
        <div className="space-y-6">
          <ProfileCard character={character} name={displayName} />
          <CharacterNotes key={`notes-${characterKey}`} characterKey={character.key} name={displayName} />
          <WeaponPanel weapon={weapon} />
          <ArtifactsPanel artifacts={artifacts} />
          <CharacterPlan key={characterKey} character={character} name={displayName} />
        </div>
        {/* Where you finish reading, so the next character is one press away. */}
        <div className="mt-8 px-4 empty:hidden sm:px-0">
          <CharacterStepper data={genshinData} characterKey={characterKey} label="Previous and next character" />
        </div>
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
  const splash = getSplashArt(character.key);
  return (
    <section aria-label={`About ${name}`} className={PANEL}>
      {/*
        Splash art (design "A" from `.mockups/splash-size.html`, the user's sizes): from `lg` up it
        takes the right 51% and runs beside the info and the numbers, 540 px tall, with the numbers
        in two rows; below `lg` it sits between the info and the numbers, 440 px tall on tablets and 270 px on phones.
      */}
      <div
        className={cn(
          "grid grid-cols-1 gap-x-6 gap-y-5",
          splash && "lg:grid-cols-[minmax(0,1fr)_51%] lg:grid-rows-[auto_1fr]"
        )}
      >
      <div className="flex min-w-0 flex-col gap-6 sm:flex-row lg:col-start-1 lg:row-start-1">
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
      {splash && (
        // A fixed height, so the page doesn't jump when it loads; any shape fits inside.
        <div className="relative h-[270px] w-full overflow-hidden sm:h-[440px] lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:h-[540px]">
          <Image
            src={splash}
            alt=""
            fill
            sizes="(min-width: 1024px) 640px, 100vw"
            className="object-contain"
          />
        </div>
      )}
      <div className="min-w-0 lg:col-start-1 lg:row-start-2">
        <BuildStrip character={character} talents={extras.talents} twoRows={!!splash} />
      </div>
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

/**
 * Level, constellation, ascension and the three talents in one strip. Pressing a talent opens its description.
 * `twoRows` keeps the talents in a row of their own under the first three on wide screens, where the
 * strip shares the width with the splash art.
 */
function BuildStrip({
  character,
  talents,
  twoRows = false,
}: {
  character: GoodCharacter;
  talents: GameText[] | null;
  twoRows?: boolean;
}) {
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
          !twoRows && "lg:grid-cols-[repeat(3,minmax(0,0.7fr))_repeat(3,minmax(0,1.2fr))]"
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
            twoRows
              ? cn("lg:col-span-1 lg:flex-col lg:text-center", i > 0 && "lg:border-l")
              : "lg:col-span-1 lg:flex-col lg:border-l lg:border-t-0 lg:text-center",
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
  return (
    <section className={PANEL}>
      <PanelHeading>Weapon</PanelHeading>
      <div className="grid gap-6 md:grid-cols-[minmax(0,20rem)_1fr]">
        <div>
          <div className="flex items-center gap-4">
            <WeaponIcon weaponKey={weapon.key} size="lg" />
            <div>
              <Link
                href={weaponHref(weapon.key)}
                className="font-semibold text-indigo-700 hover:underline dark:text-indigo-300"
              >
                {weaponName(weapon.key)}
              </Link>
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
        <WeaponPassive weaponKey={weapon.key} owned={[weapon.refinement]} />
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
