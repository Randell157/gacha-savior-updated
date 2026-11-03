"use client";

import { useState } from "react";
import Image from "next/image";
import { rarityBackground } from "@/lib/genshinCharacters";
import { cn } from "@/lib/utils";

/**
 * A game item's icon on its rarity colour, `size` pixels square. It's always
 * shown next to the item's name, so the image itself has no alt text. With no
 * `src` (an item newer than the game data), or if the image fails to load, it
 * shows the placeholder.
 */
export default function RarityIcon({
  src,
  rarity,
  size,
}: {
  src: string | null;
  rarity: number | undefined;
  size: number;
}) {
  const [failed, setFailed] = useState(false);
  return (
    <div
      className={cn(
        "relative shrink-0 overflow-hidden",
        size >= 72 ? "rounded-xl" : size >= 44 ? "rounded-lg" : "rounded-md",
        rarityBackground(rarity)
      )}
      style={{ width: size, height: size }}
    >
      <Image
        src={!src || failed ? "/placeholder.svg" : src}
        alt=""
        fill
        sizes={`${size}px`}
        className="object-contain"
        onError={() => setFailed(true)}
      />
    </div>
  );
}
