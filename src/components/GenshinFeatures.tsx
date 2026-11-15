"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import Genshin from "@/components/Genshin";
import { useAuth } from "@/contexts/AuthContext";
import { SAMPLE_GENSHIN_DATA, SAMPLE_SHOWCASE } from "@/lib/genshin/sampleData";
import { DEFAULT_SHOWCASE_OPTIONS } from "@/lib/genshin/firestoreStore";
import GameIcon from "@/components/GameIcon";
import { GAMES } from "@/lib/games";
import { ClipboardList, Flower2, LayoutGrid, Sparkles, Swords, Users } from "lucide-react";

const FEATURES = [
  {
    icon: Users,
    title: "Characters",
    text: "See every character in the game, with the ones you own in color. Sort and filter them, and open any character for their level, talents, constellations, weapon and artifacts.",
  },
  {
    icon: Swords,
    title: "Weapons",
    text: "Browse them as cards or a table, with search and filters for type and rarity. Each weapon has a page with every copy you own.",
  },
  {
    icon: Flower2,
    title: "Artifacts",
    text: "See who's wearing what and which set bonuses are active. Every piece gets a Crit Value score, and filters help you find your best and worst.",
  },
  {
    icon: LayoutGrid,
    title: "Team showcase",
    text: "Pin up to five characters to your Genshin overview, and keep up to five named showcases. Each card shows their gear, Crit Value, what's still missing and what changed since your last upload. Save any build as an image.",
  },
  {
    icon: ClipboardList,
    title: "Material planner",
    text: "Pick the levels and talents you're aiming for and see which materials, EXP and Mora you still need. Check one character or weapon, or all your plans added up.",
  },
  {
    icon: Sparkles,
    title: "Wish history",
    text: "Import paimon.moe or UIGF files to keep your wishes after the game's six-month limit. See your pity, your 50/50 record, Primogems spent and wishes per month, and download it all as UIGF.",
  },
];

const PLANNED_GAMES = GAMES.filter((game) => !game.href);

/**
 * The feature cards, shared by the home page and /features: six features in
 * two rows of three, then "More games soon" as a strip (option B from
 * .mockups/feature-cards.html).
 */
export function FeatureGrid() {
  return (
    <div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {FEATURES.map(({ icon: Icon, title, text }) => (
          <Card key={title}>
            <CardHeader className="pb-2">
              <Icon className="h-6 w-6 text-indigo-600 dark:text-indigo-300" aria-hidden />
              <CardTitle className="pt-2 text-base">{title}</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>{text}</CardDescription>
            </CardContent>
          </Card>
        ))}
      </div>
      {/* Not a feature yet, so it's dashed and grey like the hub's "Coming soon" list. */}
      <Card className="mt-4 flex items-center gap-4 border-dashed border-gray-300 bg-transparent px-5 py-4 shadow-none dark:border-slate-600">
        <div className="flex shrink-0 gap-2">
          {PLANNED_GAMES.map((game) => (
            <GameIcon key={game.id} game={game} size={28} className="grayscale" />
          ))}
        </div>
        <div>
          <CardTitle className="text-base text-gray-700 dark:text-slate-300">More games soon</CardTitle>
          <CardDescription className="mt-0.5 text-gray-600 dark:text-slate-400">
            Honkai: Star Rail and Zenless Zone Zero are next.
          </CardDescription>
        </div>
      </Card>
    </div>
  );
}

/**
 * The real Genshin overview with a made-up account. Its count cards open the
 * real Genshin pages: the user's own when signed in, and the signed-out
 * versions (with the log-in banner) otherwise.
 */
export function SampleDashboard() {
  const [showcases, setShowcases] = useState([{ title: "Showcase", picks: SAMPLE_SHOWCASE }]);
  // The settings work in the sample too, but like its showcase they aren't saved.
  const [showcaseOptions, setShowcaseOptions] = useState(DEFAULT_SHOWCASE_OPTIONS);

  return (
    <Genshin
      data={SAMPLE_GENSHIN_DATA}
      showcases={showcases}
      onShowcasesChange={setShowcases}
      showcaseOptions={showcaseOptions}
      onShowcaseOptionsChange={setShowcaseOptions}
      preview
    />
  );
}

export default function Features() {
  const { user } = useAuth();

  return (
    <div className="max-w-7xl mx-auto py-4 sm:py-12 sm:px-6 lg:px-8">
      <div className="bg-white dark:bg-slate-900 shadow overflow-hidden sm:rounded-lg mb-8">
        <div className="px-4 py-5 sm:px-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-slate-100 mb-4">
            What you can do
          </h2>
          <FeatureGrid />
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 shadow overflow-hidden sm:rounded-lg">
        <div className="px-4 py-5 sm:px-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-slate-100">
            Try it with a sample account
          </h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-slate-400 mb-6">
            This is the real Genshin overview with a made-up account. Try changing the
            showcase slots.{" "}
            {user
              ? "The count cards open your own pages."
              : "Create an account to see your own data."}
          </p>
          <SampleDashboard />
        </div>
      </div>
    </div>
  );
}
