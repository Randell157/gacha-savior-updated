import Image from "next/image";
import { Gamepad2 } from "lucide-react";
import type { Game } from "@/lib/games";
import { cn } from "@/lib/utils";

/**
 * A game's app icon (`Game.icon`), or a gamepad when it has none.
 * `size` is the displayed size in pixels; the corners are rounded to match
 * the icons' own curve.
 */
export default function GameIcon({
  game,
  size,
  className,
}: {
  game: Game;
  size: number;
  className?: string;
}) {
  const box = { width: size, height: size };
  if (!game.icon) {
    return (
      <span
        style={box}
        className={cn(
          "flex shrink-0 items-center justify-center rounded-[22%] bg-gray-100 dark:bg-slate-800 text-gray-400 dark:text-slate-500",
          className
        )}
        aria-hidden
      >
        <Gamepad2 style={{ width: size / 2, height: size / 2 }} />
      </span>
    );
  }
  return (
    <Image
      src={game.icon}
      alt=""
      width={size}
      height={size}
      style={box}
      className={cn("shrink-0 rounded-[22%]", className)}
    />
  );
}
