import Link from "next/link";
import { Button } from "@/components/ui/button";
import PageShell from "@/components/PageShell";

export default function Home() {
  return (
    <PageShell title="Welcome to Gacha Savior">
      <div className="py-2 text-center">
        <p className="mx-auto max-w-[700px] text-gray-600 md:text-lg">
          This is a website where you can organize your gacha account data in an
          organized way.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-4">
          <Button asChild>
            <Link href="/login">Log In</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/create-account">Create Account</Link>
          </Button>
        </div>
      </div>
    </PageShell>
  );
}
