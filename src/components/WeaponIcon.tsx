"use client";

import { useState } from "react";
import Image from "next/image";
import { rarityBackground } from "@/lib/genshinCharacters";
import { getWeapon, weaponIcon } from "@/lib/genshin/weapons";
import { cn } from "@/lib/utils";

const SIZES = {
  sm: { box: "h-9 w-9 rounded-md", px: 36 },
  md: { box: "h-14 w-14 rounded-lg", px: 56 },
  lg: { box: "h-[72px] w-[72px] rounded-xl", px: 72 },
};

/**
 * A weapon's icon on its rarity colour. It's always shown next to the weapon's
 * name, so the image itself has no alt text. A weapon newer than the game
 * data, or an icon that fails to load, shows the placeholder.
 */
export default function WeaponIcon({
  weaponKey,
  size = "md",
}: {
  weaponKey: string;
  size?: keyof typeof SIZES;
}) {
  const [failed, setFailed] = useState(false);
  const src = weaponIcon(weaponKey);
  const { box, px } = SIZES[size];
  return (
    <div className={cn("relative shrink-0 overflow-hidden", box, rarityBackground(getWeapon(weaponKey)?.rarity))}>
      <Image
        src={!src || failed ? "/placeholder.svg" : src}
        alt=""
        fill
        sizes={`${px}px`}
        className="object-contain"
        onError={() => setFailed(true)}
      />
    </div>
  );
}
