"use client";

import { useEffect, useState, type Dispatch, type SetStateAction } from "react";

const PREFIX = "gachasavior:";

/** Sent when a remembered choice is changed from outside its page (quick search setting a filter). */
const CHANGED = "gachasavior:remembered";

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
    // A list stays a list (`typeof` alone would let an edited object through).
    if (Array.isArray(initial)) return Array.isArray(value) ? (value as T) : initial;
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
  // Follow changes made elsewhere in this tab, so a page that's already open shows them.
  useEffect(() => {
    const onChange = (event: Event) => {
      if ((event as CustomEvent<string>).detail === key) setValue(read(key, initial, scope));
    };
    window.addEventListener(CHANGED, onChange);
    return () => window.removeEventListener(CHANGED, onChange);
    // `initial` is only the fallback for a missing value; a new object each render mustn't resubscribe.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, scope]);
  useEffect(() => {
    try {
      storageFor(scope).setItem(PREFIX + key, JSON.stringify(value));
    } catch {
      // Blocked or full storage only means the choice isn't remembered.
    }
  }, [key, scope, value]);
  return [value, setValue];
}

/**
 * Sets another page's choices for this browser tab, as if picked there: read
 * when that page opens, and passed to it at once if it's already open.
 */
export function setRememberedTabState(values: Record<string, unknown>) {
  for (const [key, value] of Object.entries(values)) {
    try {
      window.sessionStorage.setItem(PREFIX + key, JSON.stringify(value));
    } catch {
      // Blocked storage only means the choice isn't remembered.
    }
    window.dispatchEvent(new CustomEvent(CHANGED, { detail: key }));
  }
}

/** One saved choice for this browser tab, for a page that only reads another page's choices. */
export function readRememberedTabState<T>(key: string, initial: T): T {
  return read(key, initial, "tab");
}

/** Saved on the device but belonging to whoever was logged in, so logging out forgets them too. */
const ACCOUNT_DEVICE_KEYS = ["search:recent"];

/**
 * Forgets this tab's choices and the account's recent searches, so the next
 * person to log in here starts clean.
 */
export function clearRememberedTabState() {
  try {
    const storage = window.sessionStorage;
    for (const key of Object.keys(storage)) {
      if (key.startsWith(PREFIX)) storage.removeItem(key);
    }
    for (const key of ACCOUNT_DEVICE_KEYS) window.localStorage.removeItem(PREFIX + key);
  } catch {
    // Nothing was saved if storage is blocked.
  }
  // The header's search dialog stays mounted after its first use: tell it the list is gone.
  for (const key of ACCOUNT_DEVICE_KEYS) window.dispatchEvent(new CustomEvent(CHANGED, { detail: key }));
}
