import Link from "next/link";
import Header from "@/components/header";
import Footer from "@/components/footer";
import { cn } from "@/lib/utils";

export interface Crumb {
  label: string;
  href: string;
}

export interface PageShellProps {
  /** Page heading, shown in the white title bar */
  title: React.ReactNode;
  /** Links shown above the title, leading back up (e.g. "Your games / Genshin Impact") */
  breadcrumbs?: Crumb[];
  /** Navigation along the bottom of the title bar, such as a game's section tabs */
  tabs?: React.ReactNode;
  /** Controls shown next to the title, such as sort and filter dropdowns */
  actions?: React.ReactNode;
  /**
   * "padded" (default) wraps the content in the white panel with padding,
   * "flush" in the panel without padding (for row layouts like About), and
   * "none" renders the content as is, for pages that lay out their own panels.
   */
  panel?: "padded" | "flush" | "none";
  children: React.ReactNode;
}

/**
 * The layout every page shares: header, gradient background, white title bar,
 * a content panel, and footer.
 */
export default function PageShell({
  title,
  breadcrumbs,
  tabs,
  actions,
  panel = "padded",
  children,
}: PageShellProps) {
  return (
    <ShellFrame>
      <div className="bg-white dark:bg-slate-900 shadow">
        <div className={cn("max-w-7xl mx-auto px-4 sm:px-6 lg:px-8", tabs ? "pt-5" : "py-6")}>
          {breadcrumbs && breadcrumbs.length > 0 && (
            <nav aria-label="Breadcrumb" className="mb-1 text-sm text-gray-500 dark:text-slate-400">
              {breadcrumbs.map((crumb, i) => (
                <span key={crumb.href}>
                  {i > 0 && <span className="mx-1.5">/</span>}
                  <Link
                    href={crumb.href}
                    className="font-medium text-indigo-600 dark:text-indigo-400 hover:underline underline-offset-2"
                  >
                    {crumb.label}
                  </Link>
                </span>
              ))}
            </nav>
          )}
          <div className="flex flex-wrap justify-between items-center gap-4">
            <h1 className="text-3xl font-bold text-indigo-900 dark:text-indigo-200">{title}</h1>
            {actions && <div className="flex flex-wrap items-center gap-4">{actions}</div>}
          </div>
          {tabs && <div className="mt-4">{tabs}</div>}
        </div>
      </div>
      {panel === "none" ? (
        children
      ) : (
        <div className="max-w-7xl mx-auto py-12 sm:px-6 lg:px-8">
          <div
            className={cn(
              "bg-white dark:bg-slate-900 shadow overflow-hidden sm:rounded-lg",
              panel === "padded" && "p-6 sm:p-8"
            )}
          >
            {children}
          </div>
        </div>
      )}
    </ShellFrame>
  );
}

/** Header, gradient and footer with the content centred, for forms and status messages. */
export function CenteredPage({ children }: { children: React.ReactNode }) {
  return (
    <ShellFrame>
      <div className="flex min-h-[calc(100vh-3.5rem)] items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
        {children}
      </div>
    </ShellFrame>
  );
}

function ShellFrame({ children }: { children: React.ReactNode }) {
  return (
    <PageFrame>
      <div className="min-h-screen bg-gradient-to-b from-indigo-100 dark:from-indigo-950 to-purple-100 dark:to-purple-950">
        {children}
      </div>
    </PageFrame>
  );
}

/**
 * Just the header and footer, for pages that draw their own full-width
 * layout (the home page). Everything else should use PageShell or CenteredPage.
 */
export function PageFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col min-h-screen">
      {/* Only visible on keyboard focus: lets keyboard users jump past the header. */}
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[100] focus:rounded-md focus:bg-white dark:focus:bg-slate-900 focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-indigo-700 dark:focus:text-indigo-200 focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
      >
        Skip to content
      </a>
      <Header />
      <main id="main" tabIndex={-1} className="flex-1 focus:outline-none">
        {children}
      </main>
      <Footer />
    </div>
  );
}
