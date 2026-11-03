import Link from "next/link";
import { Info } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * The strip across the top of a Genshin page for signed-out visitors: why the
 * page is empty or greyed out, with Log in and Create account buttons.
 */
export default function SignedOutBanner({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-3 rounded-lg border border-indigo-200 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-900/30 p-4 text-indigo-900 dark:text-indigo-100 sm:flex-row sm:items-center">
      <div className="flex flex-1 items-start gap-3">
        <Info className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
        <p className="text-sm">
          <span className="font-semibold">You&apos;re not logged in.</span> {children}
        </p>
      </div>
      <div className="flex gap-2">
        <Button asChild>
          <Link href="/login">Log in</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/create-account">Create account</Link>
        </Button>
      </div>
    </div>
  );
}

/** The dashed empty box below the faded toolbar on signed-out pages. */
export function EmptyList({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-dashed border-gray-300 dark:border-slate-600 p-10 text-center text-sm text-gray-500 dark:text-slate-400">
      {children}
    </div>
  );
}
