"use client";

import Link from "next/link";
import Image from "next/image";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { UserPlus } from "lucide-react";
import { formatCharacterIconFilename } from "@/lib/utils";

const features = [
  {
    title: "Character Overview",
    description: "View your Genshin Impact characters",
    details: [
      "Display total number of owned characters",
      "List top 5 characters by level",
      "Show character equipped weapons and artifacts",
    ],
  },
  {
    title: "Weapons Overview",
    description: "Keep track of your weapons obtained",
    details: [
      "Display total number of weapons in inventory",
      "List top 5 weapons by level",
      "Display weapon refinement levels",
    ],
  },
  {
    title: "Artifacts",
    description: "Organize and analyze your artifacts",
    details: ["Show total number of owned artifacts"],
  },
  {
    title: "Materials",
    description: "Display your materials and resources collected",
    details: [
      "Display total count of materials",
      "List top materials by quantity",
    ],
  },
];

export default function Features() {
  return (
    <>
      <div className="max-w-7xl mx-auto py-12 sm:px-6 lg:px-8">
        <div className="bg-white shadow overflow-hidden sm:rounded-lg mb-8">
          <div className="px-4 py-5 sm:px-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Genshin Impact Dashboard Features
            </h2>
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-2">
              {features.map((feature, index) => (
                <Card key={index}>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      {feature.title}
                    </CardTitle>
                    <CardDescription>{feature.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ul className="list-disc pl-5 space-y-1">
                      {feature.details.map((detail, detailIndex) => (
                        <li key={detailIndex}>{detail}</li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>

        {/* Dashboard preview — matches logged-in dashboard layout */}
        <div className="py-4">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h3 className="text-lg font-medium text-gray-900 mb-8">
              Dashboard Preview Sample
            </h3>
            <div className="bg-white shadow overflow-hidden sm:rounded-lg p-6 sm:p-8 lg:p-10">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Genshin Impact</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Characters</CardTitle>
                      <CardDescription>Total owned</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <p className="text-4xl font-bold">42</p>
                      <div className="mt-4">
                        <Button asChild variant="outline" size="sm">
                          <Link href="/login">View All Characters</Link>
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
                      <p className="text-4xl font-bold">156</p>
                      <div className="mt-4">
                        <Button asChild variant="outline" size="sm">
                          <Link href="/login">View All Weapons</Link>
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
                      <p className="text-4xl font-bold">284</p>
                      <div className="mt-4">
                        <Button asChild variant="outline" size="sm">
                          <Link href="/login">View All Artifacts</Link>
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <Tabs defaultValue="characters" className="w-full">
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
                          Build a team of up to 5 characters
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
                          {[
                            { name: "Ganyu", level: 90, constellation: 2, weapon: "Amos' Bow (Lv. 90, R1)", artifacts: 5 },
                            { name: "Diluc", level: 88, constellation: 1, weapon: "Wolf's Gravestone (Lv. 90, R1)", artifacts: 5 },
                            { name: "Venti", level: 85, constellation: 0, weapon: "Skyward Harp (Lv. 85, R2)", artifacts: 4 },
                            { name: "Keqing", level: 82, constellation: 3, weapon: "Primordial Jade Cutter (Lv. 80, R1)", artifacts: 5 },
                            null,
                          ].map((char, index) => (
                            <div
                              key={index}
                              className={
                                char
                                  ? "relative flex flex-col rounded-xl border border-indigo-200 bg-indigo-50/40 p-3 min-h-[260px]"
                                  : "relative flex flex-col rounded-xl border border-dashed border-gray-300 bg-gray-50/70 p-3 min-h-[260px]"
                              }
                            >
                              <span className="text-xs font-semibold uppercase tracking-wide text-indigo-700 mb-3">
                                Slot {index + 1}
                              </span>
                              {char ? (
                                <div className="flex flex-col items-center text-center">
                                  <Image
                                    src={`/character-portraits/${formatCharacterIconFilename(char.name)}`}
                                    alt={char.name}
                                    width={80}
                                    height={80}
                                    className="rounded-lg mb-2"
                                    onError={(e) => {
                                      e.currentTarget.onerror = null;
                                      e.currentTarget.src = "/placeholder.svg";
                                    }}
                                  />
                                  <p className="font-semibold text-sm">{char.name}</p>
                                  <p className="text-xs text-gray-500 mt-1">
                                    Lv. {char.level} · C{char.constellation}
                                  </p>
                                  <p className="text-xs text-gray-600 mt-3">
                                    <span className="font-medium">Weapon:</span> {char.weapon}
                                  </p>
                                  <p className="text-xs text-gray-600">
                                    <span className="font-medium">Artifacts:</span> {char.artifacts} equipped
                                  </p>
                                </div>
                              ) : (
                                <div className="flex flex-col items-center justify-center text-center py-6">
                                  <div className="flex h-20 w-20 items-center justify-center rounded-lg border border-dashed border-gray-300 bg-white text-gray-400 mb-2">
                                    <UserPlus className="h-8 w-8" />
                                  </div>
                                  <p className="text-sm font-medium text-gray-500">Empty slot</p>
                                  <p className="text-xs text-gray-400 mt-1">Choose a character below</p>
                                </div>
                              )}
                            </div>
                          ))}
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
                        <ScrollArea className="h-[200px]">
                          <ul className="space-y-2">
                            <li><span className="font-bold">Wolf's Gravestone</span> - Level 90, Refinement 1</li>
                            <li><span className="font-bold">Skyward Harp</span> - Level 90, Refinement 2</li>
                            <li><span className="font-bold">Primordial Jade Winged-Spear</span> - Level 85, Refinement 1</li>
                            <li><span className="font-bold">Aquila Favonia</span> - Level 80, Refinement 1</li>
                            <li><span className="font-bold">Lost Prayer to the Sacred Winds</span> - Level 80, Refinement 1</li>
                          </ul>
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
                        <ScrollArea className="h-[200px]">
                          <ul className="space-y-2">
                            <li><span className="font-bold">Mora</span>: 5,000,000</li>
                            <li><span className="font-bold">Hero's Wit</span>: 500</li>
                            <li><span className="font-bold">Mystic Enhancement Ore</span>: 1000</li>
                            <li><span className="font-bold">Primogem</span>: 10,000</li>
                            <li><span className="font-bold">Fragile Resin</span>: 50</li>
                          </ul>
                        </ScrollArea>
                      </CardContent>
                    </Card>
                  </TabsContent>
                </Tabs>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
