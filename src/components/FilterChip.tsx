import { cn } from "@/lib/utils";

export const WEAPON_TYPES = ["Sword", "Claymore", "Polearm", "Bow", "Catalyst"];

/** Chip colours per rarity, the same pairs as the character page's rarity chip. */
export const RARITY_CHIP: Record<string, string> = {
  "5": "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200 ring-amber-500",
  "4": "bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-200 ring-purple-500",
  "3": "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200 ring-blue-500",
  "2": "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200 ring-green-600",
  "1": "bg-gray-200 text-gray-800 dark:bg-slate-700 dark:text-slate-200 ring-gray-500",
};

/**
 * A toggle chip for filters. Plain chips turn indigo when pressed; `colors`
 * (an element or rarity pair) keeps its colour and gains a ring instead.
 */
export function FilterChip({
  pressed,
  onClick,
  colors,
  children,
}: {
  pressed: boolean;
  onClick: () => void;
  colors?: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={onClick}
      className={cn(
        "press rounded-full px-3 py-1 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500",
        colors
          ? cn(colors, pressed && "ring-2 ring-offset-1 dark:ring-offset-slate-900")
          : pressed
            ? "bg-indigo-600 text-white"
            : "bg-gray-100 text-gray-700 hover:bg-indigo-50 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-indigo-900/40"
      )}
    >
      {children}
    </button>
  );
}

/** "Clear filters (N)"; shows nothing until a filter is on. */
export function ClearFilters({ count, onClick }: { count: number; onClick: () => void }) {
  if (count === 0) return null;
  return (
    <button
      type="button"
      onClick={onClick}
      className="text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:underline underline-offset-2"
    >
      Clear filters ({count})
    </button>
  );
}

/**
 * The message for an empty list, with a link that clears whatever is narrowing
 * it. A remembered filter or search is easy to forget, so the way out sits right
 * beside the message. Goes inside the page's own text, and shows no link when
 * nothing can be cleared.
 */
export function NoMatches({
  message,
  filters,
  search,
  onClear,
}: {
  message: string;
  filters: boolean;
  search: boolean;
  onClear: () => void;
}) {
  const action = filters && search ? "Clear filters and search" : filters ? "Clear filters" : search ? "Clear search" : null;
  return (
    <>
      {message}
      {action && (
        <>
          {" "}
          <button
            type="button"
            onClick={onClear}
            className="font-medium text-indigo-600 dark:text-indigo-400 hover:underline underline-offset-2"
          >
            {action}
          </button>
        </>
      )}
    </>
  );
}
