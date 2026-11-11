"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import PageShell, { type PageShellProps } from "@/components/PageShell";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "/genshin", label: "Overview" },
  { href: "/genshin/characters", label: "Characters" },
  { href: "/genshin/weapons", label: "Weapons" },
  { href: "/genshin/artifacts", label: "Artifacts" },
  { href: "/genshin/wishes", label: "Wishes" },
];

/**
 * PageShell for every page under /genshin: a breadcrumb back to the games hub
 * and the section tabs. The Overview page is the section's top, so it only
 * links back to "Your games".
 */
export default function GenshinShell(props: Omit<PageShellProps, "breadcrumbs" | "tabs">) {
  const pathname = usePathname();
  const isOverview = pathname === "/genshin";
  return (
    <PageShell
      {...props}
      breadcrumbs={[
        { label: "Your games", href: "/dashboard" },
        ...(isOverview ? [] : [{ label: "Genshin Impact", href: "/genshin" }]),
      ]}
      tabs={<GenshinTabs pathname={pathname} />}
    />
  );
}

function GenshinTabs({ pathname }: { pathname: string }) {
  return (
    <nav aria-label="Genshin Impact" className="-mb-px flex gap-6 overflow-x-auto text-sm font-medium">
      {TABS.map((tab) => {
        // A tab stays active on its sub-pages (a character page under Characters).
        const active =
          tab.href === "/genshin" ? pathname === "/genshin" : pathname.startsWith(tab.href);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              // Inset, because the scrolling nav would clip a ring drawn outside the tab.
              "whitespace-nowrap border-b-2 pb-3 transition-colors focus-visible:ring-inset focus-visible:ring-offset-0",
              active
                ? "border-indigo-600 text-indigo-700 dark:border-indigo-400 dark:text-indigo-300"
                : "border-transparent text-gray-600 dark:text-slate-400 hover:text-indigo-700 dark:hover:text-indigo-300"
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
