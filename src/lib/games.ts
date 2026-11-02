export type GameId = "genshin" | "hsr" | "zzz";

export interface Game {
  id: GameId;
  name: string;
  /** Short line under the name in the game picker */
  description: string;
  /** What the game's section covers, shown on the games hub */
  summary: string;
  /** The game's section; absent while the game is still "Coming soon" */
  href?: string;
  /** App icon in public/: 256×256, transparent rounded corners */
  icon?: string;
}

export const GAMES: Game[] = [
  {
    id: "genshin",
    name: "Genshin Impact",
    description: "Track characters, weapons & artifacts",
    summary: "Characters, weapons and artifacts.",
    href: "/genshin",
    icon: "/genshinappicon.png",
  },
  {
    id: "hsr",
    name: "Honkai: Star Rail",
    description: "Coming soon",
    summary: "Characters, light cones and relics. Planned.",
    icon: "/starrailappicon.png",
  },
  {
    id: "zzz",
    name: "Zenless Zone Zero",
    description: "Coming soon",
    summary: "Agents, W-Engines and Drive Discs. Planned.",
    icon: "/zzzappicon.png",
  },
];

/**
 * The game whose section a path is in ("/genshin/weapons" is Genshin), or
 * undefined outside every game's section, such as on the hub.
 */
export function gameForPath(pathname: string): Game | undefined {
  return GAMES.find(
    (game) => game.href && (pathname === game.href || pathname.startsWith(`${game.href}/`))
  );
}
