"use client";

import { useEffect, useState, type Dispatch, type SetStateAction } from "react";

const PREFIX = "gachasavior:";

type Scope = "tab" | "device";

function storageFor(scope: Scope): Storage {
  return scope === "tab" ? window.sessionStorage : window.localStorage;
}

function read<T>(key: string, initial: T, scope: Scope): T {
  if (typeof window === "undefined") return initial;
  try {
    const stored = storageFor(scope).getItem(PREFIX + key);
    if (stored === null) return initial;
    const value: unknown = JSON.parse(stored);
    // A plain object keeps any field added since it was saved.
    if (initial && typeof initial === "object" && !Array.isArray(initial)) {
      return value && typeof value === "object" ? { ...initial, ...value } : initial;
    }
    // `null` means "no choice", so a filter that starts as null can hold any value.
    return initial === null || value === null || typeof value === typeof initial ? (value as T) : initial;
  } catch {
    return initial;
  }
}

/**
 * `useState` that comes back after leaving the page: for this browser tab until
 * it's closed ("tab"), or on this device ("device").
 *
 * The saved value is read during the first render, so the component must not show
 * it in the markup the server prerenders: use this behind the loading state, as
 * `RequireAuth` and the roster's skeleton do.
 */
export function useRememberedState<T>(
  key: string,
  initial: T,
  scope: Scope = "tab"
): [T, Dispatch<SetStateAction<T>>] {
  const [value, setValue] = useState<T>(() => read(key, initial, scope));
  useEffect(() => {
    try {
      storageFor(scope).setItem(PREFIX + key, JSON.stringify(value));
    } catch {
      // Blocked or full storage only means the choice isn't remembered.
    }
  }, [key, scope, value]);
  return [value, setValue];
}

/** Forgets this tab's choices, so the next person to log in here starts clean. */
export function clearRememberedTabState() {
  try {
    const storage = window.sessionStorage;
    for (const key of Object.keys(storage)) {
      if (key.startsWith(PREFIX)) storage.removeItem(key);
    }
  } catch {
    // Nothing was saved if storage is blocked.
  }
}
