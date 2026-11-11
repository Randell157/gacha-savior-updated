import { cn } from "@/lib/utils";

/**
 * An on/off switch with its label (option A from `.mockups/showcase-settings.html`),
 * a button with `role="switch"` so screen readers say "on" or "off".
 */
export default function ToggleSwitch({
  checked,
  onChange,
  children,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="group inline-flex min-h-11 items-center gap-2 rounded-md text-sm text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:text-slate-100 sm:min-h-0 sm:py-1"
    >
      <span
        aria-hidden="true"
        className={cn(
          "relative h-5 w-9 flex-none rounded-full transition-colors motion-reduce:transition-none",
          checked ? "bg-indigo-600 dark:bg-indigo-500" : "bg-gray-500 dark:bg-slate-500"
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-[left] motion-reduce:transition-none",
            checked ? "left-[18px]" : "left-0.5"
          )}
        />
      </span>
      {children}
    </button>
  );
}
