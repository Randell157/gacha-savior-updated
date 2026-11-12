"use client";

import { useEffect, useState } from "react";
import type { MaterialCosts } from "@/lib/genshin/materialPlanner";

let cached: MaterialCosts | null = null;

async function loadCosts(): Promise<MaterialCosts> {
  const data = await import("@/data/genshin/materialCosts.json");
  cached = data.default as unknown as MaterialCosts;
  return cached;
}

/**
 * The planner's material costs (`materialCosts.json`, about 157 KB), fetched the
 * first time a plan is shown rather than with the site's main code. `failed`
 * is set if it couldn't be loaded.
 */
export function useMaterialCosts(): { costs: MaterialCosts | null; failed: boolean } {
  const [costs, setCosts] = useState(cached);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (costs) return;
    let current = true;
    loadCosts()
      .then((loaded) => {
        if (current) setCosts(loaded);
      })
      .catch((error) => {
        console.error("Couldn't load material costs:", error);
        if (current) setFailed(true);
      });
    return () => {
      current = false;
    };
  }, [costs]);

  return { costs, failed };
}
