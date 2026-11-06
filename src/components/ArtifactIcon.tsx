import RarityIcon from "@/components/RarityIcon";
import { artifactIcon } from "@/lib/genshin/artifactSets";
import type { GoodArtifact } from "@/lib/genshin/types";

const SIZES = { xs: 28, sm: 44, md: 56 };

/**
 * An artifact piece's icon (its set's icon for its slot) on the piece's rarity
 * colour: `xs` in a folded Equipped row, `sm` in the Equipped slot cards and on
 * the character page, `md` on the All / Unequipped cards.
 */
export default function ArtifactIcon({
  artifact,
  size = "md",
}: {
  artifact: Pick<GoodArtifact, "setKey" | "slotKey" | "rarity">;
  size?: keyof typeof SIZES;
}) {
  return (
    <RarityIcon
      src={artifactIcon(artifact.setKey, artifact.slotKey)}
      rarity={artifact.rarity}
      size={SIZES[size]}
    />
  );
}
