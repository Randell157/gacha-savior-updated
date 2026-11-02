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
import { Button } from "./ui/button";
import Link from "next/link";
import { UserPlus, X } from "lucide-react";
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
  formatCharacterIconFilename,
  formatWeaponDisplayName,
  formatMaterialDisplayName,
} from "@/lib/utils";
import type { GenshinData } from "@/lib/genshin/types";
import { buildEquipmentIndex } from "@/lib/genshin/equipment";
import { SHOWCASE_SIZE, type Showcase } from "@/lib/genshin/firestoreStore";

interface GenshinProps {
  data: GenshinData;
  /** Saved showcase slots (character keys), synced to the account */
  showcase: Showcase;
  onShowcaseChange: (showcase: Showcase) => void;
}

export default function Genshin({ data, showcase, onShowcaseChange }: GenshinProps) {
  const [activeTab, setActiveTab] = useState("characters");
  // Slots holding a character that isn't in the latest upload show as empty.
  const showcaseKeys = showcase.map((key) =>
    key && data.characters.some((c) => c.key === key) ? key : null
  );

  const characterCount = data.characters.length;
  const weaponCount = data.weapons.length;
  const artifactCount = data.artifacts.length;

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
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6">Genshin Impact </h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardHeader>
            <CardTitle>Characters</CardTitle>
            <CardDescription>Total owned</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold">{characterCount}</p>
            <div className="mt-4">
              <Button asChild>
                <Link href="/characters">View All Characters</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Weapons</CardTitle>
            <CardDescription>Total owned</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold">{weaponCount}</p>
            <div className="mt-4">
              <Button asChild>
                <Link href="/weapons">View All Weapons</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Artifacts</CardTitle>
            <CardDescription>Total owned</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold">{artifactCount}</p>
            <div className="mt-4">
              <Button asChild>
                <Link href="/artifacts">View All Artifacts</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
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
              <CardTitle>Character Showcase</CardTitle>
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
                  return (
                    <div
                      key={i}
                      className={cn(
                        "relative flex flex-col rounded-xl border p-3 min-h-[280px]",
                        char
                          ? "border-indigo-200 bg-indigo-50/40"
                          : "border-dashed border-gray-300 bg-gray-50/70"
                      )}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-semibold uppercase tracking-wide text-indigo-700">
                          Slot {i + 1}
                        </span>
                        {char && (
                          <button
                            type="button"
                            onClick={() => setShowcaseSlot(i, null)}
                            className="rounded-full p-1 text-gray-500 hover:bg-white hover:text-red-600"
                            aria-label={`Clear slot ${i + 1}`}
                            title="Clear slot"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        )}
                      </div>

                      {char ? (
                        <Link
                          href={`/characters/${encodeURIComponent(char.key)}`}
                          className="flex flex-col items-center text-center mb-3 group"
                          title={`View ${displayName} details`}
                        >
                          <div className="relative w-20 h-20 rounded-lg overflow-hidden ring-1 ring-indigo-200 bg-white mb-2 group-hover:ring-indigo-500">
                            <Image
                              src={`/character-portraits/${formatCharacterIconFilename(
                                char.key
                              )}`}
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
                          <p className="font-semibold text-sm text-gray-900 leading-tight">
                            {displayName}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            Lv. {char.level} · C{char.constellation}
                          </p>
                        </Link>
                      ) : (
                        <div className="flex flex-col items-center justify-center text-center mb-3 py-4">
                          <div className="flex h-20 w-20 items-center justify-center rounded-lg border border-dashed border-gray-300 bg-white text-gray-400 mb-2">
                            <UserPlus className="h-8 w-8" />
                          </div>
                          <p className="text-sm font-medium text-gray-500">
                            Empty slot
                          </p>
                          <p className="text-xs text-gray-400 mt-1">
                            Choose a character below
                          </p>
                        </div>
                      )}

                      {char && (
                        <div className="text-xs text-gray-600 space-y-1 mb-3 px-1 flex-1">
                          <p>
                            <span className="font-medium">Weapon:</span>{" "}
                            {char.weapon
                              ? `${formatWeaponDisplayName(char.weapon.key)} (Lv. ${char.weapon.level}, R${char.weapon.refinement})`
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
                        <SelectTrigger className="mt-auto h-9 text-xs">
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
                        <span className="font-bold">{formatWeaponDisplayName(weapon.key)}</span> - Level{" "}
                        {weapon.level}, Refinement {weapon.refinement}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p>No weapon data available. Please upload a JSON file.</p>
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
                  <p>No material data available. Please upload a JSON file.</p>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
