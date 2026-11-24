"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { formatCharacterDisplayName } from "@/lib/utils";
import type { GenshinData } from "@/lib/genshin/types";
import { getWeapon, weaponName } from "@/lib/genshin/weapons";
import { materialName } from "@/lib/genshin/materials";
import CharacterAvatar from "@/components/CharacterAvatar";
import WeaponIcon from "@/components/WeaponIcon";
import {
  DEFAULT_SHOWCASE_OPTIONS,
  type NamedShowcase,
  type ShowcaseOptions,
} from "@/lib/genshin/firestoreStore";
import type { BuildSnapshot } from "@/lib/genshin/showcaseBuild";
import Showcase from "@/components/Showcase";
import FarmingToday from "@/components/FarmingToday";

interface GenshinProps {
  data: GenshinData;
  /** The player's showcases (titles and slots), saved with the account */
  showcases: NamedShowcase[];
  onShowcasesChange: (showcases: NamedShowcase[]) => void;
  /** The previous upload's builds, for "Since your last upload" */
  previousBuilds?: BuildSnapshot | null;
  /** The showcase's display settings: element colors and CV on each piece */
  showcaseOptions?: ShowcaseOptions;
  onShowcaseOptionsChange: (options: ShowcaseOptions) => void;
  /** The Traveler's element, for their slot's element color */
  travelerElement?: string | null;
  /**
   * For the sample on the home page and /features: showcase portraits aren't
   * links, since the sample characters have no pages behind them, all five slots
   * show so visitors see the idea, and on phones only the first two show until
   * "Show all" is pressed.
   */
  preview?: boolean;
  /** Show the "Genshin Impact" heading; off on /genshin, where it's already the page title */
  heading?: boolean;
}

export default function Genshin({
  data,
  showcases,
  onShowcasesChange,
  previousBuilds = null,
  showcaseOptions = DEFAULT_SHOWCASE_OPTIONS,
  onShowcaseOptionsChange,
  travelerElement = null,
  preview = false,
  heading = true,
}: GenshinProps) {
  const characterCount = data.characters.length;
  const weaponCount = data.weapons.length;
  const artifactCount = data.artifacts.length;
  const summaryCards = [
    { title: "Characters", count: characterCount, href: "/genshin/characters" },
    { title: "Weapons", count: weaponCount, href: "/genshin/weapons" },
    { title: "Artifacts", count: artifactCount, href: "/genshin/artifacts" },
  ];

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

      {/* Today's farming list reads the signed-in account, so the sample leaves it out. */}
      {!preview && (
        <div className="mb-6">
          <FarmingToday compact />
        </div>
      )}

      <Showcase
        data={data}
        showcases={showcases}
        onShowcasesChange={onShowcasesChange}
        options={showcaseOptions}
        onOptionsChange={onShowcaseOptionsChange}
        travelerElement={travelerElement}
        previousBuilds={previousBuilds}
        preview={preview}
      />

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
                    <span className="min-w-0">{materialName(material)}</span>
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
