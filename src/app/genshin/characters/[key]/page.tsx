"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useGenshinData } from "@/hooks/useGenshinData";
import { Button } from "@/components/ui/button";
import GenshinShell from "@/components/GenshinShell";
import {
  cn,
  formatArtifactSetDisplayName,
  formatCharacterDisplayName,
} from "@/lib/utils";
import { buildEquipmentIndex } from "@/lib/genshin/equipment";
import { getWeapon, weaponName } from "@/lib/genshin/weapons";
import WeaponIcon from "@/components/WeaponIcon";
import { formatSlotName } from "@/lib/genshin/stats";
import { getCharacterPortrait, getCharacterRarity, rarityBackground } from "@/lib/genshinCharacters";
import RequireAuth from "@/components/RequireAuth";

export default function CharacterDetailPage() {
  return (
    <RequireAuth skeleton="detail">
      <CharacterDetail />
    </RequireAuth>
  );
}

function CharacterDetail() {
  const params = useParams();
  const rawKey = typeof params.key === "string" ? params.key : "";
  const characterKey = decodeURIComponent(rawKey);
  const { data: genshinData } = useGenshinData();
  const [imageError, setImageError] = useState(false);

  const character = useMemo(() => {
    return genshinData?.characters.find((c) => c.key === characterKey) ?? null;
  }, [genshinData, characterKey]);

  const equipment = useMemo(
    () => (genshinData ? buildEquipmentIndex(genshinData).get(characterKey) : undefined),
    [genshinData, characterKey]
  );
  const weapon = equipment?.weapon ?? null;
  const weaponInfo = weapon ? getWeapon(weapon.key) : undefined;
  const artifacts = equipment?.artifacts ?? [];

  const displayName = formatCharacterDisplayName(characterKey);

  return (
    <GenshinShell title={displayName}>
      {!character ? (
        <p className="text-gray-600 dark:text-slate-400">
          You don&apos;t have this character in your latest upload.
        </p>
      ) : (
        <div className="flex flex-col sm:flex-row gap-8">
          <div
            className={cn(
              "relative w-36 h-36 sm:w-44 sm:h-44 shrink-0 rounded-xl overflow-hidden ring-1 ring-indigo-100 dark:ring-indigo-900",
              rarityBackground(getCharacterRarity(character.key))
            )}
          >
            <Image
              src={
                imageError
                  ? "/placeholder.svg"
                  : getCharacterPortrait(character.key)
              }
              alt={displayName}
              fill
              sizes="(min-width: 640px) 176px, 144px"
              className="object-cover"
              onError={() => setImageError(true)}
            />
          </div>
          <div className="space-y-6 flex-1 text-gray-800 dark:text-slate-200">
            <section>
              <h2 className="text-lg font-semibold text-indigo-900 dark:text-indigo-200 mb-2">
                Character
              </h2>
              <p>Level: {character.level}</p>
              <p>Constellation: {character.constellation}</p>
              {character.ascension != null && (
                <p>Ascension: {character.ascension}</p>
              )}
              {character.talent && (
                <div className="mt-2">
                  <p className="font-medium">Talents</p>
                  <p>Normal Attack: {character.talent.auto ?? "—"}</p>
                  <p>Elemental Skill: {character.talent.skill ?? "—"}</p>
                  <p>Elemental Burst: {character.talent.burst ?? "—"}</p>
                </div>
              )}
            </section>
            <section>
              <h2 className="text-lg font-semibold text-indigo-900 dark:text-indigo-200 mb-2">
                Weapon
              </h2>
              {weapon ? (
                <div className="flex items-center gap-4">
                  <WeaponIcon weaponKey={weapon.key} size="lg" />
                  <div>
                    <p className="font-semibold text-gray-900 dark:text-slate-100">
                      {weaponName(weapon.key)}
                    </p>
                    <div className="mt-1.5 flex flex-wrap gap-1.5 text-sm">
                      <span className="rounded bg-gray-100 dark:bg-slate-800 px-2 py-0.5">Lv. {weapon.level}</span>
                      <span className="rounded bg-gray-100 dark:bg-slate-800 px-2 py-0.5">R{weapon.refinement}</span>
                      {weaponInfo && (
                        <span className="rounded bg-gray-100 dark:bg-slate-800 px-2 py-0.5">
                          <span aria-hidden="true">{"★".repeat(weaponInfo.rarity)}</span>
                          <span className="sr-only">{weaponInfo.rarity}-star</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <p>No weapon in your uploaded data.</p>
              )}
            </section>
            <section>
              <h2 className="text-lg font-semibold text-indigo-900 dark:text-indigo-200 mb-2">
                Artifacts
              </h2>
              {artifacts.length > 0 ? (
                <ul className="space-y-2">
                  {artifacts.map((artifact, index) => (
                    <li key={`${artifact.setKey}-${artifact.slotKey}-${index}`}>
                      {formatArtifactSetDisplayName(artifact.setKey)}{" "}
                      ({formatSlotName(artifact.slotKey)}) — Level {artifact.level}
                      {artifact.rarity != null ? `, ${artifact.rarity}★` : ""}
                    </li>
                  ))}
                </ul>
              ) : (
                <p>No artifacts equipped.</p>
              )}
            </section>
          </div>
        </div>
      )}
      <div className="mt-8 flex flex-wrap gap-3">
        <Button asChild>
          <Link href="/genshin/characters">Back to Characters</Link>
        </Button>
      </div>
    </GenshinShell>
  );
}
