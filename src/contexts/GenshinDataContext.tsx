"use client";

import React, { createContext, useCallback, useEffect, useState } from "react";
import { FirebaseError } from "firebase/app";
import { useAuth } from "@/contexts/AuthContext";
import {
  emptyShowcase,
  loadGenshin,
  saveGenshin,
  saveShowcase,
  type Showcase,
  type StoredGenshin,
} from "@/lib/genshin/firestoreStore";
import { parseGoodText } from "@/lib/genshin/parseGood";
import type { GenshinData } from "@/lib/genshin/types";

// Loads the signed-in user's Genshin upload from Firestore once per login and
// shares it with every page. Read it through useGenshinData().

export interface GenshinDataContextValue {
  data: GenshinData | null;
  showcase: Showcase;
  /** True until auth has settled and the user's data has been fetched */
  loading: boolean;
  /** Set when saved data exists but couldn't be loaded */
  loadError: string | null;
  lastUploadedAt: Date | null;
  /** True right after data saved in this browser's localStorage was moved to the account */
  migratedFromLocal: boolean;
  /** Replaces the saved upload (keeps the current showcase) */
  save: (data: GenshinData) => Promise<void>;
  setShowcase: (showcase: Showcase) => Promise<void>;
}

export const GenshinDataContext = createContext<GenshinDataContextValue | null>(null);

interface LoadedState {
  uid: string;
  stored: StoredGenshin | null;
  error: string | null;
  migratedFromLocal: boolean;
}

// Before Firestore storage, uploads lived only in this browser's localStorage.
const legacyDataKey = (uid: string) => `genshinData_${uid}`;
const legacyShowcaseKey = (uid: string) => `genshinShowcase_${uid}`;

function readLegacyUpload(uid: string): { data: GenshinData; showcase: Showcase } | null {
  try {
    const raw = localStorage.getItem(legacyDataKey(uid));
    if (!raw) return null;
    const parsed = parseGoodText(raw);
    if (!parsed.ok) return null;
    const storedShowcase = JSON.parse(localStorage.getItem(legacyShowcaseKey(uid)) ?? "null");
    const showcase =
      Array.isArray(storedShowcase) && storedShowcase.length === emptyShowcase().length
        ? storedShowcase.map((k: unknown) => (typeof k === "string" ? k : null))
        : emptyShowcase();
    return { data: parsed.data, showcase };
  } catch {
    return null;
  }
}

function clearLegacyUpload(uid: string) {
  try {
    localStorage.removeItem(legacyDataKey(uid));
    localStorage.removeItem(legacyShowcaseKey(uid));
  } catch {
    /* storage unavailable */
  }
}

/** What the player can do about a Firestore failure; the details go to the console. */
function describeError(error: unknown) {
  if (error instanceof FirebaseError && error.code === "permission-denied") {
    return "Log out, log back in, and try again.";
  }
  return "Check your connection and try again.";
}

export function GenshinDataProvider({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const uid = user?.uid;
  const [state, setState] = useState<LoadedState | null>(null);

  useEffect(() => {
    if (!uid) return;
    let cancelled = false;
    (async () => {
      try {
        let stored = await loadGenshin(uid);
        let migratedFromLocal = false;
        if (!stored) {
          const legacy = readLegacyUpload(uid);
          if (legacy) {
            stored = await saveGenshin(uid, legacy.data, legacy.showcase, 0);
            clearLegacyUpload(uid);
            migratedFromLocal = true;
          }
        }
        if (!cancelled) setState({ uid, stored, error: null, migratedFromLocal });
      } catch (error) {
        console.error("Loading Genshin data failed:", error);
        if (!cancelled) {
          setState({ uid, stored: null, error: describeError(error), migratedFromLocal: false });
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [uid]);

  // Ignore state left over from a previous login.
  const current = uid && state?.uid === uid ? state : null;

  const save = useCallback(
    async (data: GenshinData) => {
      if (!uid) throw new Error("Not signed in");
      const previous = current?.stored;
      try {
        const stored = await saveGenshin(
          uid,
          data,
          previous?.showcase ?? emptyShowcase(),
          previous?.artifactChunkCount ?? 0
        );
        setState({ uid, stored, error: null, migratedFromLocal: false });
      } catch (error) {
        console.error("Saving Genshin data failed:", error);
        throw new Error(describeError(error));
      }
    },
    [uid, current?.stored]
  );

  const setShowcase = useCallback(
    async (showcase: Showcase) => {
      const stored = current?.stored;
      if (!uid || !stored) return;
      // Update the screen right away, and undo it if the write fails.
      setState((s) => (s && s.stored ? { ...s, stored: { ...s.stored, showcase } } : s));
      try {
        await saveShowcase(uid, showcase);
      } catch (error) {
        console.error("Saving showcase failed:", error);
        setState((s) =>
          s && s.stored ? { ...s, stored: { ...s.stored, showcase: stored.showcase } } : s
        );
      }
    },
    [uid, current?.stored]
  );

  const value: GenshinDataContextValue = {
    data: current?.stored?.data ?? null,
    showcase: current?.stored?.showcase ?? emptyShowcase(),
    loading: authLoading || (!!uid && !current),
    loadError: current?.error ?? null,
    lastUploadedAt: current?.stored?.uploadedAt ?? null,
    migratedFromLocal: current?.migratedFromLocal ?? false,
    save,
    setShowcase,
  };

  return <GenshinDataContext.Provider value={value}>{children}</GenshinDataContext.Provider>;
}
