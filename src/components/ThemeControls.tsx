"use client";

import { useSyncExternalStore } from "react";
import { ThemeProvider as NextThemesProvider, useTheme } from "next-themes";
import { Monitor, Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Light / dark / system theme, stored by next-themes in localStorage
 * ("theme") and applied as the `dark` class on <html> before the page paints.
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      {children}
    </NextThemesProvider>
  );
}

const THEMES = [
  { value: "light", label: "Light", Icon: Sun },
  { value: "dark", label: "Dark", Icon: Moon },
  { value: "system", label: "System", Icon: Monitor },
] as const;

const noopSubscribe = () => () => {};

/** False during server rendering and hydration, when the stored theme isn't known yet. */
function useMounted() {
  return useSyncExternalStore(noopSubscribe, () => true, () => false);
}

/** Three buttons for the account menu: Light, Dark, System. */
export function ThemeChoice() {
  const { theme, setTheme } = useTheme();
  const mounted = useMounted();
  return (
    <div role="group" aria-label="Theme" className="flex gap-1">
      {THEMES.map(({ value, label, Icon }) => {
        const active = mounted && theme === value;
        return (
          <button
            key={value}
            type="button"
            aria-pressed={active}
            onClick={() => setTheme(value)}
            className={cn(
              "flex flex-1 items-center justify-center gap-1 rounded-md border px-2 py-1 text-xs",
              active
                ? "border-indigo-300 bg-indigo-50 font-medium text-indigo-700 dark:border-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-200"
                : "hover:bg-accent"
            )}
          >
            <Icon className="h-3 w-3" />
            {label}
          </button>
        );
      })}
    </div>
  );
}

/** Icon button for signed-out visitors; each click moves Light → Dark → System. */
export function ThemeCycleButton() {
  const { theme, setTheme } = useTheme();
  const mounted = useMounted();
  const index = Math.max(0, THEMES.findIndex((t) => t.value === theme));
  const current = mounted ? THEMES[index] : THEMES[2];
  const next = THEMES[(index + 1) % THEMES.length];
  return (
    <Button
      variant="ghost"
      size="icon"
      className="h-8 w-8 text-indigo-900 hover:bg-indigo-50 dark:text-indigo-200 dark:hover:bg-indigo-900/40"
      onClick={() => setTheme(next.value)}
      aria-label={`Theme: ${current.label}. Switch to ${next.label}`}
      title={`Theme: ${current.label}`}
    >
      <current.Icon className="h-4 w-4" />
    </Button>
  );
}
