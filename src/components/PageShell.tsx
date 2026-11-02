import Header from "@/components/header";
import Footer from "@/components/footer";
import { cn } from "@/lib/utils";

interface PageShellProps {
  /** Page heading, shown in the white title bar */
  title: React.ReactNode;
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
  actions,
  panel = "padded",
  children,
}: PageShellProps) {
  return (
    <ShellFrame>
      <div className="bg-white dark:bg-slate-900 shadow">
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8 flex flex-wrap justify-between items-center gap-4">
          <h1 className="text-3xl font-bold text-indigo-900 dark:text-indigo-200">{title}</h1>
          {actions && <div className="flex flex-wrap items-center gap-4">{actions}</div>}
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
      <Header />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}
