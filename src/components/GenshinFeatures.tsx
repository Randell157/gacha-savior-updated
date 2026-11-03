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
import { Flower2, Gamepad2, IdCard, LayoutGrid, Swords, Users } from "lucide-react";

const FEATURES = [
  {
    icon: Users,
    title: "Character roster",
    text: "Every character in the game, with the ones you own in color. Sort and filter.",
  },
  {
    icon: IdCard,
    title: "Character pages",
    text: "Level, talents, constellations, and the weapon and artifacts they have on.",
  },
  {
    icon: Swords,
    title: "Weapons",
    text: "Cards or a table, search and sort, and duplicate copies grouped together.",
  },
  {
    icon: Flower2,
    title: "Artifacts",
    text: "Who's wearing what, their active set bonuses, and a filter for every set.",
  },
  {
    icon: LayoutGrid,
    title: "Team showcase",
    text: "Pin five characters to the top of your Genshin overview.",
  },
  {
    icon: Gamepad2,
    title: "More games soon",
    text: "Honkai: Star Rail and Zenless Zone Zero are planned.",
  },
];

/** The feature cards, shared by the home page and /features. */
export function FeatureGrid() {
  return (
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
  );
}

/**
 * The real Genshin overview with a made-up account. Signed out, its count
 * cards lead to sign-up; signed in, they open the user's own pages.
 */
export function SampleDashboard() {
  const [showcase, setShowcase] = useState(SAMPLE_SHOWCASE);
  const { user } = useAuth();

  return (
    <Genshin
      data={SAMPLE_GENSHIN_DATA}
      showcase={showcase}
      onShowcaseChange={setShowcase}
      preview
      viewAllToSignUp={!user}
    />
  );
}

export default function Features() {
  const { user } = useAuth();

  return (
    <div className="max-w-7xl mx-auto py-12 sm:px-6 lg:px-8">
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
