import Link from "next/link";
import { Button } from "@/components/ui/button";
import { CenteredPage } from "@/components/PageShell";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Page not found" };

export default function NotFound() {
  return (
    <CenteredPage>
      <div className="w-full max-w-md bg-white dark:bg-slate-900 shadow sm:rounded-lg px-6 py-8 text-center">
        <h1 className="text-2xl font-bold text-indigo-900 dark:text-indigo-200">Page not found</h1>
        <p className="mt-2 text-sm text-gray-500 dark:text-slate-400">
          We couldn&apos;t find the page you were looking for.
        </p>
        <Button asChild className="mt-6">
          <Link href="/">Go home</Link>
        </Button>
      </div>
    </CenteredPage>
  );
}
