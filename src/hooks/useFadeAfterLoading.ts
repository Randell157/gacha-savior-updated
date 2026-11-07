"use client";

import { useLayoutEffect, useRef } from "react";

/**
 * Fades the page's content in when it replaces a loading skeleton. A page whose
 * data was already loaded shows at once, so moving between pages stays instant.
 */
export function useFadeAfterLoading(loading: boolean) {
  const waited = useRef(loading);
  useLayoutEffect(() => {
    if (loading) {
      waited.current = true;
    } else if (waited.current) {
      waited.current = false;
      document
        .querySelector("[data-page-content]")
        ?.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 150, easing: "ease-out" });
    }
  }, [loading]);
}
