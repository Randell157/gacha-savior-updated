"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import Image from "next/image";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowRight, UserPlus, X } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  cn,
  formatCharacterDisplayName,
  formatMaterialDisplayName,
} from "@/lib/utils";
import type { GenshinData } from "@/lib/genshin/types";
import { weaponName } from "@/lib/genshin/weapons";
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
   * links, since the sample characters have no pages behind them. Card titles
   * are a step smaller so the page's own headings lead, and on phones the
   * counts sit in one compact row and only the first two slots show until
   * "Show all" is pressed.
   */
  preview?: boolean;
  /**
   * Send the count cards to sign-up instead of the Genshin pages. The
   * /features sample sets this for signed-out visitors only.
   */
  viewAllToSignUp?: boolean;
  /** Show the "Genshin Impact" heading; off on /genshin, where it's already the page title */
  heading?: boolean;
}

export default function Genshin({
  data,
  showcase,
  onShowcaseChange,
  preview = false,
  viewAllToSignUp = false,
  heading = true,
}: GenshinProps) {
  const viewAllHref = (path: string) => (viewAllToSignUp ? "/create-account" : path);
  const [activeTab, setActiveTab] = useState("characters");
  const [showAllSlots, setShowAllSlots] = useState(!preview);
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

  const allCharacters = [...data.characters].sort((a, b) =>
    a.key.localeCompare(b.key)
  );
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

  const getOptionsForSlot = (slotIndex: number) =>
    allCharacters.filter(
      (c) =>
        !showcaseKeys.some((k, i) => i !== slotIndex && k === c.key)
    );

  const topWeapons = [...data.weapons].sort((a, b) => b.level - a.level).slice(0, 5);



  return (
    <section>
      {/* Kept for screen readers when hidden, so the card titles (h3) don't skip a level. */}
      <h2 className={heading ? "text-lg font-semibold text-indigo-900 dark:text-indigo-200 mb-4" : "sr-only"}>
        Genshin Impact
      </h2>
      <div className={cn("grid mb-6", preview ? "grid-cols-3 gap-2 sm:gap-4" : "grid-cols-1 md:grid-cols-3 gap-4")}>
        {summaryCards.map(({ title, count, href }) => (
          <Link
            key={title}
            href={viewAllHref(href)}
            className="group rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
          >
            <Card className="h-full transition-colors group-hover:border-indigo-500 dark:group-hover:border-indigo-400">
              <CardHeader className={cn("pb-2", preview && "p-3 pb-2 sm:p-6 sm:pb-2")}>
                <CardTitle className={cn(preview && "text-sm sm:text-lg")}>{title}</CardTitle>
                <CardDescription className={cn(preview && "hidden sm:block")}>Total owned</CardDescription>
              </CardHeader>
              <CardContent className={cn(preview && "p-3 pt-0 sm:p-6 sm:pt-0")}>
                <p className={cn("font-bold", preview ? "text-2xl sm:text-4xl" : "text-4xl")}>{count.toLocaleString()}</p>
                <p
                  className={cn(
                    "flex items-center gap-1 font-medium text-indigo-600 dark:text-indigo-300",
                    preview ? "mt-1 text-xs sm:mt-3 sm:text-sm" : "mt-3 text-sm"
                  )}
                >
                  {viewAllToSignUp ? "Sign up to see yours" : "Open"}
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="characters">Characters</TabsTrigger>
          <TabsTrigger value="weapons">Weapons</TabsTrigger>
          <TabsTrigger value="materials">Materials</TabsTrigger>
        </TabsList>
        <TabsContent value="characters">
          <Card>
            <CardHeader>
              <CardTitle className={cn(preview && "text-lg")}>Character Showcase</CardTitle>
              <CardDescription>
                Build a team of up to 5 characters. Each slot has its own
                portrait, stats, and dropdown.
              </CardDescription>
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
                        !showAllSlots && i >= 2 && "hidden sm:flex",
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

                      <Select
                        value={showcaseKeys[i] ?? "__none__"}
                        onValueChange={(v) =>
                          setShowcaseSlot(i, v === "__none__" ? null : v)
                        }
                      >
                        <SelectTrigger className="mt-auto h-9 text-xs" aria-label={`Showcase slot ${i + 1}`}>
                          <SelectValue
                            placeholder={
                              char ? "Change character" : "Choose character"
                            }
                          />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none__">
                            {char ? "Clear slot" : "Choose character"}
                          </SelectItem>
                          {getOptionsForSlot(i).map((c) => (
                            <SelectItem key={c.key} value={c.key}>
                              {formatCharacterDisplayName(c.key)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  );
                })}
              </div>
              {!showAllSlots && (
                <Button
                  type="button"
                  variant="outline"
                  className="mt-3 w-full sm:hidden"
                  onClick={() => setShowAllSlots(true)}
                >
                  Show all {SHOWCASE_SIZE} slots
                </Button>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="weapons">
          <Card>
            <CardHeader>
              <CardTitle>Top Weapons</CardTitle>
              <CardDescription>Highest level weapons</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[300px]">
                {topWeapons.length > 0 ? (
                  <ul>
                    {topWeapons.map((weapon, index) => (
                      <li key={index} className="mb-2">
                        <span className="font-bold">{weaponName(weapon.key)}</span> - Level{" "}
                        {weapon.level}, Refinement {weapon.refinement}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p>No weapons yet. Upload your export above to see them here.</p>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="materials">
          <Card>
            <CardHeader>
              <CardTitle>Material Inventory</CardTitle>
              <CardDescription>Top materials owned</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[300px]">
                {Object.keys(data.materials).length > 0 ? (
                  <ul>
                    {Object.entries(data.materials)
                      .sort(([, a], [, b]) => b - a)
                      .slice(0, 20)
                      .map(([material, count], index) => (
                        <li key={index} className="mb-2">
                          <span className="font-bold">{formatMaterialDisplayName(material)}</span>: {count}
                        </li>
                      ))}
                  </ul>
                ) : (
                  <p>No materials yet. Upload your export above to see them here.</p>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </section>
  );
}
