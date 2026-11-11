import { cn } from "@/lib/utils";

/**
 * Joined buttons for picking a numbered thing to read about: R1 to R5 on a
 * weapon, C0 to C6 for an owned character's constellations (C1 to C6 in the
 * quick view). The ones the player has get a star.
 */
export default function NumberButtons({
  label,
  prefix,
  count,
  start = 1,
  selected,
  onSelect,
  isMarked,
  markLabel,
  markTitle,
  dimUnmarked = false,
}: {
  /** What the group is called for screen readers */
  label: string;
  prefix: string;
  /** How many buttons, from `start` up */
  count: number;
  /** The first number: 1 for R1–R5, 0 for C0–C6 on an owned character */
  start?: number;
  selected: number;
  onSelect: (n: number) => void;
  /** Which buttons get a star; none if left out */
  isMarked?: (n: number) => boolean;
  /** Read out after a starred button's name, e.g. "yours" */
  markLabel?: string;
  markTitle?: string;
  /** Show the buttons without a star in a quieter color */
  dimUnmarked?: boolean;
}) {
  return (
    <div
      role="group"
      aria-label={label}
      className="inline-flex rounded-md border border-gray-200 dark:border-slate-700 p-0.5"
    >
      {Array.from({ length: count }, (_, i) => i + start).map((n) => {
        const marked = isMarked?.(n) ?? false;
        const pressed = n === selected;
        return (
          <button
            key={n}
            type="button"
            aria-pressed={pressed}
            title={marked ? markTitle : undefined}
            onClick={() => onSelect(n)}
            className={cn(
              "press inline-flex items-center gap-1 rounded px-2.5 py-1 text-xs font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500",
              pressed
                ? "bg-indigo-600 text-white"
                : cn(
                    "hover:bg-indigo-50 dark:hover:bg-indigo-900/40",
                    dimUnmarked && !marked
                      ? "text-gray-500 dark:text-slate-400"
                      : "text-gray-700 dark:text-slate-300"
                  )
            )}
          >
            {prefix}
            {n}
            {marked && (
              <>
                <svg
                  aria-hidden="true"
                  viewBox="0 0 24 24"
                  className={cn("h-3.5 w-3.5", pressed ? "fill-white" : "fill-amber-400")}
                >
                  <path d="M12 2.5l2.9 6.1 6.6.8-4.9 4.6 1.3 6.6L12 17.3l-5.9 3.3 1.3-6.6-4.9-4.6 6.6-.8z" />
                </svg>
                {markLabel && <span className="sr-only">({markLabel})</span>}
              </>
            )}
          </button>
        );
      })}
    </div>
  );
}
