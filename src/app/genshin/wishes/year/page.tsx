"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import GenshinShell from "@/components/GenshinShell";
import PageSkeleton from "@/components/PageSkeleton";
import RequireAuth from "@/components/RequireAuth";
import SignedOutBanner from "@/components/SignedOutBanner";
import { FilterChip } from "@/components/FilterChip";
import YearInReviewCard from "@/components/YearInReviewCard";
import { Button } from "@/components/ui/button";
import { useSampleWishes } from "@/hooks/useSampleWishes";
import { useWishData } from "@/hooks/useWishData";
import type { Pull } from "@/lib/genshin/wishes";
import { wishYears, yearInReview } from "@/lib/genshin/yearInReview";

// /genshin/wishes/year: the year in review (Phase 7 step 6; picks 1A and 2A
// from .mockups/year-review.html): a chip for every year the wish history
// covers, newest first, and the card for the chosen one. Reached from the
// "Year in review" button on the Wishes page.

export default function YearInReviewPage() {
  return (
    <RequireAuth skeleton="cards" signedOut={<SampleYear />}>
      <SignedInYear />
    </RequireAuth>
  );
}

const backLink = (
  <Link
    href="/genshin/wishes"
    className="mb-4 inline-flex items-center gap-1 text-sm font-medium text-indigo-700 hover:underline dark:text-indigo-300"
  >
    <ArrowLeft className="h-4 w-4" aria-hidden="true" />
    Wishes
  </Link>
);

function SignedInYear() {
  const { wishes, loading } = useWishData();
  if (loading) return <PageSkeleton kind="cards" />;
  const pulls = wishes?.pulls ?? [];
  return (
    <GenshinShell title="Year in review">
      {backLink}
      {pulls.length > 0 ? (
        <YearPicker pulls={pulls} />
      ) : (
        <div className="rounded-xl border bg-white p-6 dark:border-slate-700 dark:bg-slate-900">
          <p className="font-semibold text-gray-900 dark:text-slate-100">Your year in review needs your wish history.</p>
          <p className="mt-1 text-sm text-gray-600 dark:text-slate-300">
            Import it on the Wishes page: export it from paimon.moe to Excel, or from a tool that saves UIGF, such as Snap
            Hutao. Then come back here for each year it covers.
          </p>
          <Button asChild size="sm" className="mt-4">
            <Link href="/genshin/wishes">Go to Wishes</Link>
          </Button>
        </div>
      )}
    </GenshinShell>
  );
}

function SampleYear() {
  const pulls = useSampleWishes();
  return (
    <GenshinShell title="Year in review">
      <SignedOutBanner>
        This is a made-up wish history. Log in and import your own to see your year.
      </SignedOutBanner>
      {backLink}
      {pulls === null ? (
        <p className="text-sm text-gray-500 dark:text-slate-400" aria-busy="true">
          Loading the sample...
        </p>
      ) : (
        pulls.length > 0 && <YearPicker pulls={pulls} />
      )}
    </GenshinShell>
  );
}

function YearPicker({ pulls }: { pulls: Pull[] }) {
  const years = useMemo(() => wishYears(pulls), [pulls]);
  const [picked, setPicked] = useState<number | null>(null);
  const year = picked !== null && years.includes(picked) ? picked : years[0];
  const review = useMemo(() => yearInReview(pulls, year), [pulls, year]);
  // Wish times are server time; the browser's year is close enough to say "so far".
  const soFar = year === new Date().getFullYear();

  return (
    <div>
      {years.length > 1 && (
        <div className="mb-4 flex gap-2 overflow-x-auto pb-1" role="group" aria-label="Year">
          {years.map((y) => (
            <FilterChip key={y} pressed={y === year} onClick={() => setPicked(y)}>
              <span className="whitespace-nowrap">
                {y}
                {y === new Date().getFullYear() && " (so far)"}
              </span>
            </FilterChip>
          ))}
        </div>
      )}
      <YearInReviewCard review={review} soFar={soFar} />
    </div>
  );
}
