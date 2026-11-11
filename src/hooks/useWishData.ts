"use client";

import { useContext } from "react";
import { WishDataContext } from "@/contexts/WishDataContext";

/** The signed-in user's saved wish history, stored in Firestore. */
export function useWishData() {
  const value = useContext(WishDataContext);
  if (!value) {
    throw new Error("useWishData must be used within a WishDataProvider");
  }
  return value;
}
