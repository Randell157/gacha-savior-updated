"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";

// The dialog and its data (every name, plus the material cost file) load the
// first time the search opens, so they stay out of every page's first load.
const QuickSearchDialog = dynamic(() => import("@/components/QuickSearchDialog"), { ssr: false });

/**
 * The header's search button (design "A" from `.mockups/quick-search.html`),
 * and Ctrl+K / ⌘K from anywhere on the site, which opens it too (or closes it).
 */
export default function QuickSearch() {
  const [open, setOpen] = useState(false);
  // Mounted after the first open and kept, so reopening is instant.
  const [used, setUsed] = useState(false);
  // Where focus goes back to on closing: what had it when the search opened.
  const returnFocus = useRef<HTMLElement | null>(null);
  const button = useRef<HTMLButtonElement>(null);
  const remember = () => {
    returnFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  };

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && !event.altKey && !event.shiftKey && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setUsed(true);
        setOpen((current) => {
          if (!current) remember();
          return !current;
        });
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <>
      <Button
        ref={button}
        type="button"
        variant="ghost"
        size="icon"
        className="relative h-8 w-8 text-indigo-900 after:absolute after:-inset-1.5 hover:bg-indigo-50 dark:text-indigo-200 dark:hover:bg-indigo-900/40"
        aria-label="Search (Ctrl+K)"
        title="Search (Ctrl+K)"
        aria-keyshortcuts="Control+K Meta+K"
        onClick={() => {
          remember();
          setUsed(true);
          setOpen(true);
        }}
      >
        <Search className="h-4 w-4" aria-hidden="true" />
      </Button>
      {used && (
        <QuickSearchDialog
          open={open}
          onOpenChange={setOpen}
          onCloseFocus={() => {
            const target = returnFocus.current;
            (target && target.isConnected && target !== document.body ? target : button.current)?.focus();
          }}
        />
      )}
    </>
  );
}
