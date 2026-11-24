"use client";

import React, { createContext, useCallback, useEffect, useState } from "react";
import { FirebaseError } from "firebase/app";
import { useAuth } from "@/contexts/AuthContext";
import {
  deleteGenshin,
  emptyShowcase,
  loadGenshin,
  saveGenshin,
  saveShowcases,
  saveShowcaseOptions,
  savePlans,
  saveFarmingTicks,
  saveTravelerElement,
  type Showcase,
  type NamedShowcase,
  DEFAULT_SHOWCASE_TITLE,
  defaultShowcases,
  type ShowcaseOptions,
  DEFAULT_SHOWCASE_OPTIONS,
  type StoredGenshin,
} from "@/lib/genshin/firestoreStore";
import { parseGoodText } from "@/lib/genshin/parseGood";
import type { GenshinData } from "@/lib/genshin/types";
import { snapshotBuilds, type BuildSnapshot } from "@/lib/genshin/showcaseBuild";
import type { SavedPlan } from "@/lib/genshin/materialPlanner";
import type { FarmingTicks } from "@/lib/genshin/farming";

// Loads the signed-in user's Genshin upload from Firestore once per login and
// shares it with every page. Read it through useGenshinData().

export interface GenshinDataContextValue {
  data: GenshinData | null;
  /** The first showcase's slots, for the Your games card */
  showcase: Showcase;
  showcases: NamedShowcase[];
  /** The previous upload's builds, for "Since your last upload" */
  previousBuilds: BuildSnapshot | null;
  travelerElement: string | null;
  /** The showcase's display settings (element colors, CV on each piece) */
  showcaseOptions: ShowcaseOptions;
  /** The Planner tab's saved plans */
  plans: SavedPlan[];
  /** Today's farming list's ticks as saved; `currentTicks` clears ones from an earlier game day */
  farmingTicks: FarmingTicks | null;
  /** True until auth has settled and the user's data has been fetched */
  loading: boolean;
  /** Set when saved data exists but couldn't be loaded */
  loadError: string | null;
  lastUploadedAt: Date | null;
  /** True right after data saved in this browser's localStorage was moved to the account */
  migratedFromLocal: boolean;
  /** Replaces the saved upload (keeps the showcases, settings, Traveler element and plans) */
  save: (data: GenshinData) => Promise<void>;
  /** Deletes the saved upload; rejects with a message for the player if it can't */
  deleteUpload: () => Promise<void>;
  setShowcases: (showcases: NamedShowcase[]) => Promise<void>;
  setTravelerElement: (element: string) => Promise<void>;
  setShowcaseOptions: (options: ShowcaseOptions) => Promise<void>;
  /** Saves the plans; resolves false (and puts the old ones back) if the write fails */
  setPlans: (plans: SavedPlan[]) => Promise<boolean>;
  /** Saves the farming list's ticks; puts the old ones back if the write fails */
  setFarmingTicks: (ticks: FarmingTicks) => Promise<void>;
}

const NO_PLANS: SavedPlan[] = [];

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
            stored = await saveGenshin(uid, legacy.data, [{ title: DEFAULT_SHOWCASE_TITLE, picks: legacy.showcase }], 0);
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
          previous?.showcases ?? defaultShowcases(),
          previous?.artifactChunkCount ?? 0,
          previous?.travelerElement ?? null,
          previous?.showcaseOptions ?? DEFAULT_SHOWCASE_OPTIONS,
          // Kept so the showcase can say what changed since this upload.
          previous ? snapshotBuilds(previous.data) : null,
          previous?.plans ?? [],
          previous?.farmingTicks ?? null
        );
        setState({ uid, stored, error: null, migratedFromLocal: false });
      } catch (error) {
        console.error("Saving Genshin data failed:", error);
        throw new Error(describeError(error));
      }
    },
    [uid, current?.stored]
  );

  const deleteUpload = useCallback(async () => {
    const stored = current?.stored;
    if (!uid) throw new Error("Not signed in");
    try {
      await deleteGenshin(uid, stored?.artifactChunkCount ?? 0);
      setState({ uid, stored: null, error: null, migratedFromLocal: false });
    } catch (error) {
      console.error("Deleting Genshin data failed:", error);
      throw new Error(describeError(error));
    }
  }, [uid, current?.stored]);

  const setShowcases = useCallback(
    async (showcases: NamedShowcase[]) => {
      const stored = current?.stored;
      if (!uid || !stored) return;
      // Update the screen right away, and undo it if the write fails.
      setState((s) => (s && s.stored ? { ...s, stored: { ...s.stored, showcases } } : s));
      try {
        await saveShowcases(uid, showcases);
      } catch (error) {
        console.error("Saving showcases failed:", error);
        setState((s) =>
          s && s.stored ? { ...s, stored: { ...s.stored, showcases: stored.showcases } } : s
        );
      }
    },
    [uid, current?.stored]
  );

  const setTravelerElement = useCallback(
    async (travelerElement: string) => {
      const stored = current?.stored;
      if (!uid || !stored) return;
      // Update the screen right away, and undo it if the write fails.
      setState((s) => (s && s.stored ? { ...s, stored: { ...s.stored, travelerElement } } : s));
      try {
        await saveTravelerElement(uid, travelerElement);
      } catch (error) {
        console.error("Saving Traveler element failed:", error);
        setState((s) =>
          s && s.stored ? { ...s, stored: { ...s.stored, travelerElement: stored.travelerElement } } : s
        );
      }
    },
    [uid, current?.stored]
  );

  const setShowcaseOptions = useCallback(
    async (showcaseOptions: ShowcaseOptions) => {
      const stored = current?.stored;
      if (!uid || !stored) return;
      // Update the screen right away, and undo it if the write fails.
      setState((s) => (s && s.stored ? { ...s, stored: { ...s.stored, showcaseOptions } } : s));
      try {
        await saveShowcaseOptions(uid, showcaseOptions);
      } catch (error) {
        console.error("Saving showcase settings failed:", error);
        setState((s) =>
          s && s.stored ? { ...s, stored: { ...s.stored, showcaseOptions: stored.showcaseOptions } } : s
        );
      }
    },
    [uid, current?.stored]
  );

  const setPlans = useCallback(
    async (plans: SavedPlan[]) => {
      const stored = current?.stored;
      if (!uid || !stored) return false;
      // Update the screen right away, and undo it if the write fails.
      setState((s) => (s && s.stored ? { ...s, stored: { ...s.stored, plans } } : s));
      try {
        await savePlans(uid, plans);
        return true;
      } catch (error) {
        console.error("Saving plans failed:", error);
        setState((s) => (s && s.stored ? { ...s, stored: { ...s.stored, plans: stored.plans } } : s));
        return false;
      }
    },
    [uid, current?.stored]
  );

  const setFarmingTicks = useCallback(
    async (farmingTicks: FarmingTicks) => {
      const stored = current?.stored;
      if (!uid || !stored) return;
      // Update the screen right away, and undo it if the write fails.
      setState((s) => (s && s.stored ? { ...s, stored: { ...s.stored, farmingTicks } } : s));
      try {
        await saveFarmingTicks(uid, farmingTicks);
      } catch (error) {
        console.error("Saving farming ticks failed:", error);
        setState((s) => (s && s.stored ? { ...s, stored: { ...s.stored, farmingTicks: stored.farmingTicks } } : s));
      }
    },
    [uid, current?.stored]
  );

  const value: GenshinDataContextValue = {
    data: current?.stored?.data ?? null,
    showcase: current?.stored?.showcases[0]?.picks ?? emptyShowcase(),
    showcases: current?.stored?.showcases ?? defaultShowcases(),
    previousBuilds: current?.stored?.previousBuilds ?? null,
    travelerElement: current?.stored?.travelerElement ?? null,
    showcaseOptions: current?.stored?.showcaseOptions ?? DEFAULT_SHOWCASE_OPTIONS,
    plans: current?.stored?.plans ?? NO_PLANS,
    farmingTicks: current?.stored?.farmingTicks ?? null,
    loading: authLoading || (!!uid && !current),
    loadError: current?.error ?? null,
    lastUploadedAt: current?.stored?.uploadedAt ?? null,
    migratedFromLocal: current?.migratedFromLocal ?? false,
    save,
    deleteUpload,
    setShowcases,
    setTravelerElement,
    setShowcaseOptions,
    setPlans,
    setFarmingTicks,
  };

  return <GenshinDataContext.Provider value={value}>{children}</GenshinDataContext.Provider>;
}
