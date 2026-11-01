"use client";

import { useCallback, useMemo, useSyncExternalStore } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { parseGoodText } from "@/lib/genshin/parseGood";
import type { GenshinData } from "@/lib/genshin/types";

// The signed-in user's uploaded Genshin data, kept in localStorage for now.
// Pages only go through this hook, so Phase 1 can move storage to Firestore
// without touching them.

const storageKey = (uid: string) => `genshinData_${uid}`;

const listeners = new Set<() => void>();
// Saved exports can be a few MB, so cache the raw string instead of
// re-reading localStorage on every render.
let cache: { uid: string; raw: string | null } | null = null;

function notify() {
  cache = null;
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  window.addEventListener("storage", notify);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", notify);
  };
}

function readRaw(uid: string | undefined): string | null {
  if (!uid) return null;
  if (cache?.uid !== uid) {
    let raw: string | null = null;
    try {
      raw = localStorage.getItem(storageKey(uid));
    } catch {
      /* storage unavailable */
    }
    cache = { uid, raw };
  }
  return cache.raw;
}

export function useGenshinData() {
  const { user, loading } = useAuth();
  const uid = user?.uid;

  const raw = useSyncExternalStore(
    subscribe,
    () => readRaw(uid),
    () => null
  );
  const parsed = useMemo(() => (raw ? parseGoodText(raw) : null), [raw]);

  const save = useCallback(
    (data: GenshinData) => {
      if (!uid) return;
      localStorage.setItem(storageKey(uid), JSON.stringify(data));
      notify();
    },
    [uid]
  );

  return {
    data: parsed?.ok ? parsed.data : null,
    /** Set when saved data exists but can no longer be read */
    loadError: parsed && !parsed.ok ? parsed.error : null,
    /** True until Firebase has reported whether someone is signed in */
    loading,
    save,
  };
}
