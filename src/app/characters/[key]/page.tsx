"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useGenshinData } from "@/hooks/useGenshinData";
import { Button } from "@/components/ui/button";
import PageShell from "@/components/PageShell";
import {
  formatArtifactSetDisplayName,
  formatCharacterDisplayName,
  formatCharacterIconFilename,
  formatWeaponDisplayName,
} from "@/lib/utils";
import { buildEquipmentIndex } from "@/lib/genshin/equipment";
import { formatSlotName } from "@/lib/genshin/stats";
import RequireAuth from "@/components/RequireAuth";

export default function CharacterDetailPage() {
  return (
    <RequireAuth>
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
  const artifacts = equipment?.artifacts ?? [];

  const displayName = formatCharacterDisplayName(characterKey);

  return (
    <PageShell title={displayName}>
      {!character ? (
        <p className="text-gray-600">
          Character not found in your uploaded data.
        </p>
      ) : (
        <div className="flex flex-col sm:flex-row gap-8">
          <div className="relative w-36 h-36 sm:w-44 sm:h-44 shrink-0 rounded-xl overflow-hidden bg-indigo-50 ring-1 ring-indigo-100">
            <Image
              src={
                imageError
                  ? "/placeholder.svg"
                  : `/character-portraits/${formatCharacterIconFilename(
                      character.key
                    )}`
              }
              alt={displayName}
              fill
              sizes="(min-width: 640px) 176px, 144px"
              className="object-cover"
              onError={() => setImageError(true)}
            />
          </div>
          <div className="space-y-6 flex-1 text-gray-800">
            <section>
              <h2 className="text-lg font-semibold text-indigo-900 mb-2">
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
              <h2 className="text-lg font-semibold text-indigo-900 mb-2">
                Weapon
              </h2>
              {weapon ? (
                <>
                  <p>Name: {formatWeaponDisplayName(weapon.key)}</p>
                  <p>Level: {weapon.level}</p>
                  <p>Refinement: {weapon.refinement}</p>
                </>
              ) : (
                <p>No weapon in your uploaded data.</p>
              )}
            </section>
            <section>
              <h2 className="text-lg font-semibold text-indigo-900 mb-2">
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
          <Link href="/characters">Back to Characters</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/dashboard">Back to Dashboard</Link>
        </Button>
      </div>
    </PageShell>
  );
}
