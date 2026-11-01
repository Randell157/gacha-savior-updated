"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useSyncExternalStore,
} from "react";

export type GameId = "genshin" | "hsr" | "zzz";

export const GAMES: {
  id: GameId;
  name: string;
  description: string;
}[] = [
  {
    id: "genshin",
    name: "Genshin Impact",
    description: "Track characters, weapons & artifacts",
  },
  { id: "hsr", name: "Honkai: Star Rail", description: "Coming soon" },
  { id: "zzz", name: "Zenless Zone Zero", description: "Coming soon" },
];

const STORAGE_KEY = "gachasavior-selected-game";

interface GameContextType {
  selectedGameId: GameId;
  setSelectedGameId: (id: GameId) => void;
  selectedGame: (typeof GAMES)[number];
}

const GameContext = createContext<GameContextType | null>(null);

const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  window.addEventListener("storage", listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", listener);
  };
}

function readStoredGameId(): GameId {
  try {
    const stored = localStorage.getItem(STORAGE_KEY) as GameId | null;
    if (stored && GAMES.some((g) => g.id === stored)) return stored;
  } catch {
    /* ignore */
  }
  return "genshin";
}

export function GameProvider({ children }: { children: React.ReactNode }) {
  const selectedGameId = useSyncExternalStore(
    subscribe,
    readStoredGameId,
    () => "genshin" as GameId
  );

  const setSelectedGameId = useCallback((id: GameId) => {
    try {
      localStorage.setItem(STORAGE_KEY, id);
    } catch {
      /* ignore */
    }
    listeners.forEach((listener) => listener());
  }, []);

  const selectedGame =
    GAMES.find((g) => g.id === selectedGameId) ?? GAMES[0];

  return (
    <GameContext.Provider
      value={{ selectedGameId, setSelectedGameId, selectedGame }}
    >
      {children}
    </GameContext.Provider>
  );
}

export function useGame() {
  const ctx = useContext(GameContext);
  if (!ctx) {
    throw new Error("useGame must be used within a GameProvider");
  }
  return ctx;
}
