"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowRight, UserPlus, X } from "lucide-react";
import {
  cn,
  formatCharacterDisplayName,
  formatMaterialDisplayName,
} from "@/lib/utils";
import type { GenshinData } from "@/lib/genshin/types";
import { getWeapon, weaponName } from "@/lib/genshin/weapons";
import CharacterAvatar from "@/components/CharacterAvatar";
import ShowcasePicker from "@/components/ShowcasePicker";
import WeaponIcon from "@/components/WeaponIcon";
import { buildEquipmentIndex } from "@/lib/genshin/equipment";
import { getCharacterPortrait, getCharacterRarity, rarityBackground } from "@/lib/genshinCharacters";
import { SHOWCASE_SIZE, type Showcase } from "@/lib/genshin/firestoreStore";

interface GenshinProps {
  data: GenshinData;
  /** Saved showcase slots (character keys), synced to the account */
  showcase: Showcase;
  onShowcaseChange: (showcase: Showcase) => void;
  /**
   * For the sample on the home page and /features: showcase portraits aren't
   * links, since the sample characters have no pages behind them, and on phones
   * only the first two slots show until "Show all" is pressed.
   */
  preview?: boolean;
  /** Show the "Genshin Impact" heading; off on /genshin, where it's already the page title */
  heading?: boolean;
}

export default function Genshin({
  data,
  showcase,
  onShowcaseChange,
  preview = false,
  heading = true,
}: GenshinProps) {
  // On phones, slots stack, so the ones that wouldn't say anything wait for a press.
  const [showAllSlots, setShowAllSlots] = useState(false);
  // Slots holding a character that isn't in the latest upload show as empty.
  const showcaseKeys = showcase.map((key) =>
    key && data.characters.some((c) => c.key === key) ? key : null
  );

  const characterCount = data.characters.length;
  const weaponCount = data.weapons.length;
  const artifactCount = data.artifacts.length;
  const summaryCards = [
    { title: "Characters", count: characterCount, href: "/genshin/characters" },
    { title: "Weapons", count: weaponCount, href: "/genshin/weapons" },
    { title: "Artifacts", count: artifactCount, href: "/genshin/artifacts" },
  ];

  const characterEquipment = buildEquipmentIndex(data);

  const characterKeys = data.characters.map((c) => c.key);
  const showcaseSlots = showcaseKeys.map((key) => {
    if (!key) return null;
    const char = data.characters.find((c) => c.key === key);
    if (!char) return null;
    return {
      ...char,
      weapon: characterEquipment.get(char.key)?.weapon,
      artifacts: characterEquipment.get(char.key)?.artifacts,
    };
  });

  const setShowcaseSlot = (index: number, characterKey: string | null) => {
    const next = [...showcaseKeys];
    next[index] = characterKey;
    onShowcaseChange(next);
  };

  const topWeapons = [...data.weapons]
    .sort(
      (a, b) =>
        (getWeapon(b.key)?.rarity ?? 0) - (getWeapon(a.key)?.rarity ?? 0) ||
        b.level - a.level ||
        b.refinement - a.refinement ||
        weaponName(a.key).localeCompare(weaponName(b.key))
    )
    .slice(0, 5);
  const topMaterials = Object.entries(data.materials)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5);
  const emptySlots = showcaseSlots.filter((slot) => !slot).length;

  return (
    <section>
      {/* Kept for screen readers when hidden, so the card titles (h3) don't skip a level. */}
      <h2 className={heading ? "text-lg font-semibold text-indigo-900 dark:text-indigo-200 mb-4" : "sr-only"}>
        Genshin Impact
      </h2>
      <div className="mb-6 grid grid-cols-3 gap-2 sm:gap-4">
        {summaryCards.map(({ title, count, href }) => (
          <Link
            key={title}
            href={href}
            className="group rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
          >
            <Card className="h-full p-2.5 transition-colors group-hover:border-indigo-500 dark:group-hover:border-indigo-400 sm:p-4">
              <p className="text-xs font-medium sm:text-sm">{title}</p>
              {/* The arrow sits beside the number, since beside the name it ran off the card on phones, and the narrowest phones drop it. */}
              <p className="mt-1 flex items-center justify-between gap-1">
                <span className="text-xl font-bold tabular-nums sm:text-2xl">{count.toLocaleString()}</span>
                <ArrowRight className="hidden h-4 w-4 shrink-0 text-indigo-600 transition-transform group-hover:translate-x-0.5 dark:text-indigo-300 min-[360px]:block" />
              </p>
            </Card>
          </Link>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Showcase</CardTitle>
          <CardDescription>Keep up to 5 favorite characters here.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
            {Array.from({ length: SHOWCASE_SIZE }, (_, i) => {
              const char = showcaseSlots[i];
              const displayName = char
                ? formatCharacterDisplayName(char.key)
                : null;
              const portrait = char && (
                <>
                  <div
                    className={cn(
                      "relative w-20 h-20 rounded-lg overflow-hidden ring-1 ring-indigo-200 dark:ring-indigo-800 mb-2 group-hover:ring-indigo-500",
                      rarityBackground(getCharacterRarity(char.key))
                    )}
                  >
                    <Image
                      src={getCharacterPortrait(char.key)}
                      alt={displayName ?? char.key}
                      fill
                      sizes="80px"
                      className="object-cover"
                      onError={(e) => {
                        e.currentTarget.onerror = null;
                        e.currentTarget.src = "/placeholder.svg";
                      }}
                    />
                  </div>
                  <p className="font-semibold text-sm text-gray-900 dark:text-slate-100 leading-tight">
                    {displayName}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">
                    Lv. {char.level} · C{char.constellation}
                  </p>
                </>
              );
              return (
                <div
                  key={i}
                  className={cn(
                    "relative flex flex-col rounded-xl border p-3 min-h-[280px]",
                    !showAllSlots && (preview ? i >= 2 : !char) && "hidden sm:flex",
                    char
                      ? "border-indigo-200 dark:border-indigo-800 bg-indigo-50/40 dark:bg-indigo-900/20"
                      : "border-dashed border-gray-300 dark:border-slate-600 bg-gray-50/70 dark:bg-slate-800/40"
                  )}
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-semibold uppercase tracking-wide text-indigo-700 dark:text-indigo-300">
                      Slot {i + 1}
                    </span>
                    {char && (
                      <button
                        type="button"
                        onClick={() => setShowcaseSlot(i, null)}
                        className="rounded-full p-1 text-gray-500 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-800 hover:text-red-600"
                        aria-label={`Clear slot ${i + 1}`}
                        title="Clear slot"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>

                  {char ? (
                    preview ? (
                      <div className="flex flex-col items-center text-center mb-3">
                        {portrait}
                      </div>
                    ) : (
                      <Link
                        href={`/genshin/characters/${encodeURIComponent(char.key)}`}
                        className="flex flex-col items-center text-center mb-3 group"
                        title={`View ${displayName} details`}
                      >
                        {portrait}
                      </Link>
                    )
                  ) : (
                    <div className="flex flex-col items-center justify-center text-center mb-3 py-4">
                      <div className="flex h-20 w-20 items-center justify-center rounded-lg border border-dashed border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-gray-400 dark:text-slate-500 mb-2">
                        <UserPlus className="h-8 w-8" />
                      </div>
                      <p className="text-sm font-medium text-gray-500 dark:text-slate-400">
                        Empty slot
                      </p>
                      <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">
                        Choose a character below
                      </p>
                    </div>
                  )}

                  {char && (
                    <div className="text-xs text-gray-600 dark:text-slate-400 space-y-1 mb-3 px-1 flex-1">
                      <p>
                        <span className="font-medium">Weapon:</span>{" "}
                        {char.weapon
                          ? `${weaponName(char.weapon.key)} (Lv. ${char.weapon.level}, R${char.weapon.refinement})`
                          : "None"}
                      </p>
                      <p>
                        <span className="font-medium">Artifacts:</span>{" "}
                        {char.artifacts && char.artifacts.length > 0
                          ? `${char.artifacts.length} equipped`
                          : "None"}
                      </p>
                    </div>
                  )}

                  <ShowcasePicker
                    slot={i}
                    value={showcaseKeys[i]}
                    characterKeys={characterKeys}
                    showcaseKeys={showcaseKeys}
                    onChange={(key) => setShowcaseSlot(i, key)}
                  />
                </div>
              );
            })}
          </div>
          {!showAllSlots && (preview || emptySlots > 0) && (
            <Button
              type="button"
              variant="outline"
              className="mt-3 w-full sm:hidden"
              onClick={() => setShowAllSlots(true)}
            >
              {preview
                ? `Show all ${SHOWCASE_SIZE} slots`
                : `${emptySlots} empty ${emptySlots === 1 ? "slot" : "slots"}: add a character`}
            </Button>
          )}
        </CardContent>
      </Card>

      <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Top weapons</CardTitle>
            <CardDescription>Highest rarity, then level</CardDescription>
          </CardHeader>
          <CardContent>
            {topWeapons.length > 0 ? (
              <>
                <ul className="divide-y divide-gray-100 dark:divide-slate-800">
                  {topWeapons.map((weapon, index) => (
                    <li key={index} className="flex items-center gap-3 py-2">
                      <WeaponIcon weaponKey={weapon.key} size="sm" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{weaponName(weapon.key)}</p>
                        <p className="text-xs tabular-nums text-gray-500 dark:text-slate-400">
                          Lv {weapon.level} · R{weapon.refinement}
                        </p>
                      </div>
                      {weapon.location && (
                        <CharacterAvatar
                          characterKey={weapon.location}
                          label={`Equipped by ${formatCharacterDisplayName(weapon.location)}`}
                        />
                      )}
                    </li>
                  ))}
                </ul>
                <Link
                  href="/genshin/weapons"
                  className="group mt-2 inline-flex items-center gap-1 rounded text-sm font-medium text-indigo-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:text-indigo-300"
                >
                  All weapons
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </Link>
              </>
            ) : (
              <p className="text-sm text-gray-500 dark:text-slate-400">
                No weapons yet. Upload your export above to see them here.
              </p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Materials</CardTitle>
            <CardDescription>What you have the most of</CardDescription>
          </CardHeader>
          <CardContent>
            {topMaterials.length > 0 ? (
              <ul className="divide-y divide-gray-100 dark:divide-slate-800">
                {topMaterials.map(([material, count]) => (
                  <li key={material} className="flex items-baseline justify-between gap-3 py-3 text-sm">
                    <span className="min-w-0">{formatMaterialDisplayName(material)}</span>
                    <span className="font-semibold tabular-nums">{count.toLocaleString()}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-gray-500 dark:text-slate-400">
                No materials yet. Upload your export above to see them here.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
