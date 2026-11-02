"use client";

import { useState } from "react";
import Image from "next/image";
import { getCharacterPortrait, getCharacterRarity, rarityBackground } from "@/lib/genshinCharacters";
import { cn } from "@/lib/utils";

/**
 * A round character portrait on its rarity colour, used to show who holds a
 * weapon or artifact and to head each character's group on /genshin/artifacts.
 */
export default function CharacterAvatar({
  characterKey,
  size = 28,
  label,
  className,
}: {
  characterKey: string;
  size?: number;
  /** Tooltip and alt text, e.g. "Equipped by Ganyu"; decorative when omitted */
  label?: string;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  return (
    <span
      title={label}
      style={{ width: size, height: size }}
      className={cn(
        "relative shrink-0 overflow-hidden rounded-full ring-2 ring-white dark:ring-slate-900",
        rarityBackground(getCharacterRarity(characterKey)),
        className
      )}
    >
      <Image
        src={failed ? "/placeholder.svg" : getCharacterPortrait(characterKey)}
        alt={label ?? ""}
        fill
        sizes={`${size}px`}
        className="object-cover"
        onError={() => setFailed(true)}
      />
    </span>
  );
}
