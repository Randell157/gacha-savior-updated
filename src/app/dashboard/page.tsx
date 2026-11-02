"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Plus } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { GAMES } from "@/lib/games";
import { useGenshinData } from "@/hooks/useGenshinData";
import PageShell from "@/components/PageShell";
import GameIcon from "@/components/GameIcon";
import RequireAuth from "@/components/RequireAuth";
import {
  GENSHIN_CHARACTERS,
  getCharacterPortrait,
  getCharacterRarity,
  rarityBackground,
} from "@/lib/genshinCharacters";
import { cn, formatCharacterDisplayName } from "@/lib/utils";

/**
 * The games hub: where a signed-in user lands. Each game with a section gets
 * a card; the rest show as "Coming soon". Genshin Impact is the only game so
 * far, so it's the large featured card.
 */
export default function GamesHubPage() {
  return (
    <RequireAuth skeleton="cards">
      <GamesHub />
    </RequireAuth>
  );
}

const STRIP_SIZE = 24;

function GamesHub() {
  const { username } = useAuth();
  const comingSoon = GAMES.filter((game) => !game.href);

  return (
    <PageShell title="Your games">
      <p className="text-xl text-gray-700 dark:text-slate-300 sm:text-lg mb-6">
        Hello, {username || "User"}!
      </p>
      <GenshinCard />
      {comingSoon.length > 0 && (
        <div className="mt-8">
          <h2 className="mb-3 text-sm font-semibold text-gray-700 dark:text-slate-300">
            Coming soon
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {comingSoon.map((game) => (
              <div
                key={game.id}
                className="flex items-center gap-4 rounded-xl border border-dashed border-gray-300 dark:border-slate-600 bg-white/70 dark:bg-slate-900/60 p-5"
              >
                <GameIcon game={game} size={48} className="shadow" />
                <div>
                  <p className="font-semibold text-gray-700 dark:text-slate-300">{game.name}</p>
                  <p className="text-sm text-gray-500 dark:text-slate-400">{game.summary}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </PageShell>
  );
}

const GENSHIN = GAMES.find((game) => game.id === "genshin")!;

function GenshinCard() {
  const { data, showcase, lastUploadedAt } = useGenshinData();

  // The banner shows the user's own characters, or the roster before an upload.
  const strip = data
    ? data.characters.slice(0, STRIP_SIZE).map((c) => c.key)
    : GENSHIN_CHARACTERS.filter((c) => c.rarity).slice(0, STRIP_SIZE).map((c) => c.key);
  const showcaseKeys = data
    ? showcase.map((key) => (key && data.characters.some((c) => c.key === key) ? key : null))
    : [];

  return (
    <Link
      href="/genshin"
      className="group block overflow-hidden rounded-xl bg-white dark:bg-slate-900 shadow ring-1 ring-black/5 dark:ring-white/10 transition hover:ring-2 hover:ring-indigo-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
    >
      <div className="relative h-28 overflow-hidden bg-indigo-950">
        <div aria-hidden className="absolute inset-0 grid grid-cols-8 sm:grid-cols-12 gap-1 p-1 opacity-80">
          {strip.map((key) => (
            <Portrait key={key} characterKey={key} className="aspect-square rounded" sizes="8vw" />
          ))}
        </div>
        <div className="absolute inset-0 bg-gradient-to-r from-indigo-950 via-indigo-950/70 to-transparent" />
        <div className="relative flex h-full items-center gap-4 px-6">
          <GameIcon game={GENSHIN} size={56} className="shadow-lg ring-1 ring-white/20" />
          <div>
            <h2 className="text-2xl font-bold text-white">Genshin Impact</h2>
            <p className="text-sm text-indigo-200">
              {lastUploadedAt
                ? `Last uploaded ${lastUploadedAt.toLocaleString()}`
                : "No data uploaded yet"}
            </p>
          </div>
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-6 p-6">
        {data ? (
          <>
            <dl className="flex gap-6">
              <Count label="Characters" value={data.characters.length} />
              <Count label="Weapons" value={data.weapons.length} />
              <Count label="Artifacts" value={data.artifacts.length} />
            </dl>
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-indigo-700 dark:text-indigo-300">
                Showcase
              </p>
              <div className="flex gap-2">
                {showcaseKeys.map((key, i) =>
                  key ? (
                    <Portrait
                      key={i}
                      characterKey={key}
                      title={formatCharacterDisplayName(key)}
                      className="h-11 w-11 rounded-lg ring-1 ring-indigo-200 dark:ring-indigo-800"
                      sizes="44px"
                    />
                  ) : (
                    <div
                      key={i}
                      className="flex h-11 w-11 items-center justify-center rounded-lg border border-dashed border-gray-300 dark:border-slate-600 text-gray-400 dark:text-slate-500"
                    >
                      <Plus className="h-4 w-4" />
                    </div>
                  )
                )}
              </div>
            </div>
          </>
        ) : (
          <p className="text-gray-600 dark:text-slate-400">
            Upload your Genshin export to see your characters, weapons and artifacts.
          </p>
        )}
        <span className="inline-flex h-10 items-center gap-1.5 rounded-md bg-indigo-600 px-4 text-sm font-medium text-white transition-colors group-hover:bg-indigo-700">
          Open Genshin Impact
          <ArrowRight className="h-4 w-4" />
        </span>
      </div>
    </Link>
  );
}

function Count({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <dd className="text-3xl font-bold text-gray-900 dark:text-slate-100">{value.toLocaleString()}</dd>
      <dt className="text-sm text-gray-500 dark:text-slate-400">{label}</dt>
    </div>
  );
}

function Portrait({
  characterKey,
  className,
  sizes,
  title,
}: {
  characterKey: string;
  className: string;
  sizes: string;
  title?: string;
}) {
  const [failed, setFailed] = useState(false);
  return (
    <div
      title={title}
      className={cn(
        "relative overflow-hidden",
        rarityBackground(getCharacterRarity(characterKey)),
        className
      )}
    >
      <Image
        src={failed ? "/placeholder.svg" : getCharacterPortrait(characterKey)}
        alt={title ?? ""}
        fill
        sizes={sizes}
        className="object-cover"
        onError={() => setFailed(true)}
      />
    </div>
  );
}
