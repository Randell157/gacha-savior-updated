"use client";

import { useEffect, useRef, useState } from "react";
import { activeSets, artifactSetName } from "@/lib/genshin/artifactSets";
import type { GoodArtifact } from "@/lib/genshin/types";
import { cn } from "@/lib/utils";

/**
 * Every set bonus a character's pieces give: an indigo "2-piece · <set>" badge
 * and text for each set with two or more pieces, plus a gold "4-piece" one for
 * a set with four or more. Used on the Artifacts page's Equipped rows and on
 * the character page.
 */
export default function ArtifactSetBonuses({
  pieces,
  className,
}: {
  pieces: GoodArtifact[];
  className?: string;
}) {
  return (
    <>
      {activeSets(pieces).map((set) => {
        const name = artifactSetName(set.setKey);
        // A set newer than the game data shows a placeholder (fix: update genshin-db, run npm run data:genshin).
        const missing = "Set bonus not available yet.";
        return (
          <div key={set.setKey} className={cn("space-y-1.5", className)}>
            <SetBonus pieces={2} name={name} text={set.info?.twoPiece ?? missing} />
            {set.count >= 4 && (
              <SetBonus pieces={4} name={name} text={set.info?.fourPiece ?? missing} />
            )}
          </div>
        );
      })}
    </>
  );
}

/** One set bonus: a badge (gold for 4-piece, indigo for 2-piece) and its text. */
function SetBonus({ pieces, name, text }: { pieces: 2 | 4; name: string; text: string }) {
  return (
    <div>
      <span
        className={cn(
          "inline-block rounded-full px-2 py-0.5 font-semibold",
          pieces === 4
            ? "bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-200"
            : "bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300"
        )}
      >
        {pieces}-piece · {name}
      </span>
      <SetBonusText text={text} />
    </div>
  );
}

/**
 * Set bonus text cut to four lines, with More / Less when it's actually cut.
 * That depends on the column's width, so it's measured rather than guessed from
 * the text's length, and measured again when the width changes.
 */
function SetBonusText({ text }: { text: string }) {
  const [expanded, setExpanded] = useState(false);
  const [isCut, setIsCut] = useState(false);
  const textRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    const element = textRef.current;
    // Expanded text is never cut, so measuring it would hide the Less button.
    if (!element || expanded) return;
    const observer = new ResizeObserver(() => setIsCut(element.scrollHeight > element.clientHeight));
    observer.observe(element);
    return () => observer.disconnect();
  }, [expanded, text]);

  return (
    <div className="mt-1 leading-snug text-gray-600 dark:text-slate-400">
      <p ref={textRef} className={cn(!expanded && "line-clamp-4")}>
        {text}
      </p>
      {(isCut || expanded) && (
        <button
          type="button"
          aria-expanded={expanded}
          onClick={() => setExpanded((v) => !v)}
          className="mt-0.5 font-medium text-indigo-600 dark:text-indigo-400 hover:underline underline-offset-2"
        >
          {expanded ? "Less" : "More"}
        </button>
      )}
    </div>
  );
}
