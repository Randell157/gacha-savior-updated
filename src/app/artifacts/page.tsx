"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useGenshinData } from "@/hooks/useGenshinData";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import PageShell from "@/components/PageShell";
import RequireAuth from "@/components/RequireAuth";
import { formatArtifactSetDisplayName, formatCharacterDisplayName } from "@/lib/utils";
import { formatSlotName, formatStat, formatStatName } from "@/lib/genshin/stats";

export default function ArtifactsPage() {
  return (
    <RequireAuth>
      <Artifacts />
    </RequireAuth>
  );
}

function Artifacts() {
  const { data: genshinData } = useGenshinData();
  const [imageErrors, setImageErrors] = useState<Set<number>>(new Set());
  const artifacts = genshinData?.artifacts ?? [];

  const handleImageError = (index: number) => {
    setImageErrors((prev) => new Set(prev).add(index));
  };

  return (
    <PageShell title="All Artifacts">
      {artifacts.length === 0 && (
        <p className="text-gray-600 dark:text-slate-400">
          No artifacts yet. Upload your data on the dashboard to see them here.
        </p>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {artifacts.map((artifact, index) => (
          <Card key={index}>
            <CardHeader>
              <CardTitle className="flex items-center space-x-4">
                <div className="relative w-12 h-12 shrink-0">
                  <Image
                    src={
                      imageErrors.has(index)
                        ? "/placeholder.svg"
                        : `/artifact-icons/${artifact.setKey.replace(/\s+/g, "_")}.png`
                    }
                    alt={formatArtifactSetDisplayName(artifact.setKey)}
                    fill
                    sizes="48px"
                    className="rounded-md object-contain"
                    onError={() => handleImageError(index)}
                  />
                </div>
                <span>{formatArtifactSetDisplayName(artifact.setKey)}</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[200px]">
                <p>Level: {artifact.level}</p>
                <p>Rarity: {artifact.rarity}★</p>
                <p>Slot: {formatSlotName(artifact.slotKey)}</p>
                {artifact.mainStatKey && (
                  <p>Main stat: {formatStatName(artifact.mainStatKey)}</p>
                )}
                {artifact.location && (
                  <p>Equipped by: {formatCharacterDisplayName(artifact.location)}</p>
                )}
                {artifact.lock !== undefined && (
                  <p>Locked: {artifact.lock ? "Yes" : "No"}</p>
                )}
                {artifact.substats.length > 0 && (
                  <>
                    <p className="font-semibold mt-2">Substats:</p>
                    <ul className="list-disc pl-5">
                      {artifact.substats.map((substat, subIndex) => (
                        <li key={subIndex}>{formatStat(substat.key, substat.value)}</li>
                      ))}
                    </ul>
                  </>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="mt-8">
        <Button asChild>
          <Link href="/dashboard">Back to Dashboard</Link>
        </Button>
      </div>
    </PageShell>
  );
}
