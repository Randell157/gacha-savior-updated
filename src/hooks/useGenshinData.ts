"use client";

import { useContext } from "react";
import { GenshinDataContext } from "@/contexts/GenshinDataContext";

/** The signed-in user's uploaded Genshin data, stored in Firestore. */
export function useGenshinData() {
  const value = useContext(GenshinDataContext);
  if (!value) {
    throw new Error("useGenshinData must be used within a GenshinDataProvider");
  }
  return value;
}
