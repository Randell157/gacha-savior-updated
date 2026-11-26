import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import CharacterAvatar from "@/components/CharacterAvatar";
import ArtifactIcon from "@/components/ArtifactIcon";
import { CvBlock } from "@/components/ArtifactScore";
import ArtifactSubstats from "@/components/ArtifactSubstats";
import { formatCharacterDisplayName } from "@/lib/utils";
import { formatSlotName, formatStatName } from "@/lib/genshin/stats";
import { artifactSetName } from "@/lib/genshin/artifactSets";
import type { GoodArtifact } from "@/lib/genshin/types";

/**
 * One piece on the All, Unequipped and Cleanup views: icon, set, wearer, slot,
 * rarity, level, main stat, substats and score. `children` go under the stats
 * (the cleanup view's reasons and Keep button).
 */
export default function ArtifactCard({ artifact, children }: { artifact: GoodArtifact; children?: React.ReactNode }) {
  const setName = artifactSetName(artifact.setKey);
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-3 text-lg">
          <ArtifactIcon artifact={artifact} />
          <span className="min-w-0 flex-1">{setName}</span>
          {artifact.location && (
            <CharacterAvatar
              characterKey={artifact.location}
              label={`Equipped by ${formatCharacterDisplayName(artifact.location)}`}
            />
          )}
        </CardTitle>
      </CardHeader>
      {/* Main stat and substats styled like the Equipped slot cards, with the score in the same place on every card. */}
      <CardContent className="text-sm">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-gray-500 dark:text-slate-400">
              {formatSlotName(artifact.slotKey)} · {artifact.rarity}★ · Lv. {artifact.level}
              {artifact.lock && " · Locked"}
            </p>
            {artifact.mainStatKey && (
              <p className="mt-2 font-semibold text-indigo-900 dark:text-indigo-200">
                {formatStatName(artifact.mainStatKey)}
              </p>
            )}
            <ArtifactSubstats substats={artifact.substats} />
          </div>
          <CvBlock artifact={artifact} />
        </div>
        {children}
      </CardContent>
    </Card>
  );
}
