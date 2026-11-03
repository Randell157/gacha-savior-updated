"use client";

import { useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { PageFrame } from "@/components/PageShell";
import { FeatureGrid, SampleDashboard } from "@/components/GenshinFeatures";
import { GENSHIN_CHARACTERS, rarityBackground } from "@/lib/genshinCharacters";
import { cn } from "@/lib/utils";

const WALL_SIZE = 60;

// The portrait wall: characters with a known rarity, in a fixed scrambled
// order so neighbours aren't alphabetical. Every fifth one is greyed out,
// like an unowned character on the Characters page.
const WALL = GENSHIN_CHARACTERS.filter((c) => c.rarity)
  .map((c, i) => ({ ...c, order: (i * 37) % 101 }))
  .sort((a, b) => a.order - b.order)
  .slice(0, WALL_SIZE)
  .map((c, i) => ({ ...c, owned: i % 5 !== 3 }));

const STEPS = [
  {
    title: "Scan your account",
    text: "Run Inventory Kamera or Irminsul with Genshin open. It saves a .json file.",
  },
  {
    title: "Upload it here",
    text: "Your data is saved to your account, so it's there on any device you log in on.",
  },
  {
    title: "Look around",
    text: "Browse the roster, open any character, and pin your favourite team to the dashboard.",
  },
];

export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();

  // Signed-in visitors go straight to their dashboard.
  useEffect(() => {
    if (!loading && user) router.replace("/dashboard");
  }, [loading, user, router]);

  return (
    <PageFrame>
      <section className="relative overflow-hidden bg-indigo-950 min-h-[30rem]">
        <div
          aria-hidden
          className="absolute inset-x-0 top-0 grid grid-cols-6 sm:grid-cols-8 md:grid-cols-10 lg:grid-cols-12 gap-2 p-3"
        >
          {WALL.map((c) => (
            <div
              key={c.key}
              className={cn(
                "relative aspect-square overflow-hidden rounded-lg",
                rarityBackground(c.rarity),
                !c.owned && "grayscale opacity-40"
              )}
            >
              <Image
                src={`/character-portraits/${c.iconFile}`}
                alt=""
                fill
                sizes="(min-width: 1024px) 8vw, (min-width: 640px) 12vw, 16vw"
                className="object-cover"
              />
            </div>
          ))}
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-indigo-950 via-indigo-950/85 to-indigo-950/20" />
        <div className="relative flex min-h-[30rem] items-end">
          <div className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pb-10">
            <h1 className="max-w-2xl text-3xl sm:text-4xl font-bold leading-tight text-white">
              Which of your characters did you actually build?
            </h1>
            <p className="mt-3 max-w-xl text-indigo-100">
              Upload your Genshin export and see your whole roster, levels,
              talents, weapons and artifacts, all in one place.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Button asChild className="bg-white text-indigo-900 hover:bg-indigo-50">
                <Link href="/create-account">Create an account</Link>
              </Button>
              <Button
                asChild
                variant="outline"
                className="border-white/40 bg-transparent text-white hover:bg-white/10 hover:text-white"
              >
                <Link href="#sample">Try the sample account</Link>
              </Button>
            </div>
            <p className="mt-4 text-sm text-indigo-200">
              Already have an account?{" "}
              <Link href="/login" className="font-medium text-white underline underline-offset-2">
                Log in
              </Link>
            </p>
          </div>
        </div>
      </section>
      <section className="bg-gradient-to-b from-indigo-100 to-purple-100 dark:from-indigo-950 dark:to-purple-950">
        <ol className="max-w-7xl mx-auto grid gap-8 px-4 py-12 sm:px-6 md:grid-cols-3 lg:px-8">
          {STEPS.map((step, i) => (
            <li key={step.title}>
              <p className="text-xs font-semibold uppercase tracking-wide text-indigo-700 dark:text-indigo-300">
                Step {i + 1}
              </p>
              <p className="mt-1 font-semibold text-gray-900 dark:text-slate-100">{step.title}</p>
              <p className="mt-1 text-sm text-gray-600 dark:text-slate-400">{step.text}</p>
            </li>
          ))}
        </ol>
      </section>
      <section id="features" className="bg-indigo-50 dark:bg-slate-950">
        <div className="max-w-7xl mx-auto px-4 py-12 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-indigo-900 dark:text-indigo-200">What you can do</h2>
          <p className="mt-1 mb-6 text-sm text-gray-600 dark:text-slate-400">
            Everything the site does with your Genshin export today.
          </p>
          <FeatureGrid />
        </div>
      </section>
      <section id="sample" className="bg-gradient-to-b from-indigo-100 to-purple-100 dark:from-indigo-950 dark:to-purple-950">
        <div className="max-w-7xl mx-auto px-4 py-12 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-indigo-900 dark:text-indigo-200">Try it with a sample account</h2>
          <p className="mt-1 mb-6 text-sm text-gray-600 dark:text-slate-400">
            This is the real dashboard with a made-up account. Try changing the showcase slots.
          </p>
          <div className="rounded-lg bg-white dark:bg-slate-900 p-4 sm:p-6 shadow">
            <SampleDashboard />
          </div>
        </div>
      </section>
      <section className="bg-indigo-950">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center gap-4 px-4 py-10 sm:px-6 lg:px-8">
          <div className="flex-1 min-w-[16rem]">
            <h2 className="text-xl font-bold text-white">Ready to see your own account?</h2>
            <p className="mt-1 text-sm text-indigo-200">It takes one export file and about a minute.</p>
          </div>
          <Button asChild className="bg-white text-indigo-900 hover:bg-indigo-50">
            <Link href="/create-account">Create an account</Link>
          </Button>
        </div>
      </section>
    </PageFrame>
  );
}
