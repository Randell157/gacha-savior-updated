import Link from "next/link";
import { Button } from "@/components/ui/button";
import { CenteredPage } from "@/components/PageShell";

export default function NotFound() {
  return (
    <CenteredPage>
      <div className="w-full max-w-md bg-white shadow sm:rounded-lg px-6 py-8 text-center">
        <h1 className="text-2xl font-bold text-indigo-900">Page not found</h1>
        <p className="mt-2 text-sm text-gray-500">
          We couldn&apos;t find the page you were looking for.
        </p>
        <Button asChild className="mt-6">
          <Link href="/">Go home</Link>
        </Button>
      </div>
    </CenteredPage>
  );
}
