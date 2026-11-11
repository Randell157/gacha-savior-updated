"use client";

import React, { createContext, useCallback, useEffect, useState } from "react";
import { FirebaseError } from "firebase/app";
import { useAuth } from "@/contexts/AuthContext";
import { deleteWishes, loadWishes, saveWishes, type StoredWishes } from "@/lib/genshin/wishStore";
import { mergePulls, type Pull } from "@/lib/genshin/wishes";

// Loads the signed-in user's wish history once per login and shares it. Read it
// through useWishData(). It's kept apart from the GOOD upload (GenshinDataContext):
// deleting or replacing an upload leaves it alone.

export interface ImportResult {
  added: number;
  inFile: number;
  total: number;
}

export interface WishDataContextValue {
  wishes: StoredWishes | null;
  /** True until auth has settled and the history has been fetched */
  loading: boolean;
  /** Set when saved history exists but couldn't be loaded */
  loadError: string | null;
  /**
   * Merges an import into the saved history and saves it. `gameUid` is "" for a
   * paimon.moe file, which doesn't say. Rejects with a message for the player.
   */
  importPulls: (gameUid: string, pulls: Pull[]) => Promise<ImportResult>;
  /** Deletes the whole history; rejects with a message for the player */
  deleteHistory: () => Promise<void>;
}

export const WishDataContext = createContext<WishDataContextValue | null>(null);

interface LoadedState {
  uid: string;
  wishes: StoredWishes | null;
  error: string | null;
}

function describeError(error: unknown) {
  if (error instanceof FirebaseError && error.code === "permission-denied") {
    return "Log out, log back in, and try again.";
  }
  return "Check your connection and try again.";
}

export function WishDataProvider({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const uid = user?.uid;
  const [state, setState] = useState<LoadedState | null>(null);

  useEffect(() => {
    if (!uid) return;
    let cancelled = false;
    loadWishes(uid).then(
      (wishes) => {
        if (!cancelled) setState({ uid, wishes, error: null });
      },
      (error) => {
        console.error("Loading wish history failed:", error);
        if (!cancelled) setState({ uid, wishes: null, error: describeError(error) });
      }
    );
    return () => {
      cancelled = true;
    };
  }, [uid]);

  // Ignore state left over from a previous login.
  const current = uid && state?.uid === uid ? state : null;

  const importPulls = useCallback(
    async (gameUid: string, pulls: Pull[]): Promise<ImportResult> => {
      if (!uid) throw new Error("Not signed in");
      const saved = current?.wishes;
      if (saved?.gameUid && gameUid && saved.gameUid !== gameUid) {
        throw new Error(
          `This file is for UID ${gameUid}, but your saved wish history is for UID ${saved.gameUid}. Only one account's wishes can be kept for now. To switch, delete your wish history on your Profile first.`
        );
      }
      const merged = mergePulls(saved?.pulls ?? [], pulls);
      try {
        const stored = await saveWishes(uid, saved?.gameUid || gameUid, merged.pulls, saved?.chunks);
        setState({ uid, wishes: stored, error: null });
      } catch (error) {
        console.error("Saving wish history failed:", error);
        throw new Error(`Your file was read, but it couldn't be saved. ${describeError(error)}`);
      }
      return { added: merged.added, inFile: pulls.length, total: merged.pulls.length };
    },
    [uid, current?.wishes]
  );

  const deleteHistory = useCallback(async () => {
    const saved = current?.wishes;
    if (!uid) throw new Error("Not signed in");
    try {
      await deleteWishes(uid, saved?.chunks ?? {});
      setState({ uid, wishes: null, error: null });
    } catch (error) {
      console.error("Deleting wish history failed:", error);
      throw new Error(describeError(error));
    }
  }, [uid, current?.wishes]);

  const value: WishDataContextValue = {
    wishes: current?.wishes ?? null,
    loading: authLoading || (!!uid && !current),
    loadError: current?.error ?? null,
    importPulls,
    deleteHistory,
  };

  return <WishDataContext.Provider value={value}>{children}</WishDataContext.Provider>;
}
