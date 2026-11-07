"use client";

import { useLayoutEffect, useRef } from "react";
import { cn } from "@/lib/utils";

/**
 * A row of joined toggle buttons, such as All / Equipped / Unequipped. The
 * highlight sits inside the chosen button, so it's right before the JavaScript
 * loads, and slides over from the button chosen before.
 */
export default function Segmented<T extends string>({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: T;
  onChange: (value: T) => void;
  options: { value: T; label: React.ReactNode; icon?: React.ReactNode }[];
}) {
  const group = useRef<HTMLDivElement>(null);
  const previous = useRef(value);

  useLayoutEffect(() => {
    const from = previous.current;
    if (from === value) return;
    previous.current = value;
    const buttons = Array.from(group.current?.querySelectorAll<HTMLElement>("[data-value]") ?? []);
    const before = buttons.find((button) => button.dataset.value === from);
    const highlight = group.current?.querySelector("[data-highlight]");
    if (!before || !highlight || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const start = before.getBoundingClientRect();
    const end = highlight.getBoundingClientRect();
    if (!end.width || !end.height) return;
    highlight.animate(
      [
        {
          transform: `translate(${start.left - end.left}px, ${start.top - end.top}px) scale(${start.width / end.width}, ${start.height / end.height})`,
        },
        { transform: "none" },
      ],
      { duration: 180, easing: "cubic-bezier(0.23, 1, 0.32, 1)" }
    );
  }, [value]);

  return (
    <div ref={group} role="group" aria-label={label} className="inline-flex rounded-md border p-0.5">
      {options.map((option) => {
        const chosen = value === option.value;
        return (
          <button
            key={option.value}
            type="button"
            data-value={option.value}
            aria-pressed={chosen}
            onClick={() => onChange(option.value)}
            className={cn(
              // Unchosen buttons sit above, so the highlight passes behind their labels.
              "press relative flex items-center gap-1.5 rounded px-3 py-1.5 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              chosen
                ? "isolate z-0 text-white"
                : "z-10 text-gray-700 dark:text-slate-300 hover:bg-indigo-50 dark:hover:bg-indigo-900/40"
            )}
          >
            {chosen && (
              <span
                data-highlight=""
                aria-hidden="true"
                className="absolute inset-0 -z-10 origin-top-left rounded bg-indigo-600"
              />
            )}
            {option.icon}
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
