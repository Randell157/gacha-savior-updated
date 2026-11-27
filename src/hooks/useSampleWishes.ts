"use client";

import { useEffect, useState } from "react";
import wishItems from "@/data/genshin/wishItems.json";
import { mergePulls, parseUigfText, type Pull, type WishItem } from "@/lib/genshin/wishes";

const ITEMS = wishItems.items as Record<string, WishItem>;

/**
 * The made-up wish history shown signed out: the two test UIGF exports in
 * `public/sample-data/test-account/`, merged. Null while loading, [] if they
 * couldn't be read.
 */
export function useSampleWishes(): Pull[] | null {
  const [pulls, setPulls] = useState<Pull[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = (file: string) =>
      fetch(`/sample-data/test-account/${file}`)
        .then((r) => r.text())
        .then((text) => {
          const result = parseUigfText(text, (id) => ITEMS[id]);
          return result.ok ? result.accounts[0].pulls : [];
        });
    Promise.all([load("wishes-older.json"), load("wishes-newer.json")]).then(
      ([older, newer]) => {
        if (!cancelled) setPulls(mergePulls(older, newer).pulls);
      },
      (error) => {
        console.error("Loading the sample wishes failed:", error);
        if (!cancelled) setPulls([]);
      }
    );
    return () => {
      cancelled = true;
    };
  }, []);

  return pulls;
}
