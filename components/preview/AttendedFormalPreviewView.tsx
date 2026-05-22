"use client";

import Link from "next/link";
import { ConfirmAttendanceIndicator } from "@/components/colleges/ConfirmAttendanceIndicator";
import { ReviewFormalSectionPreview } from "@/components/preview/ReviewFormalSectionPreview";
import { SketchCard } from "@/components/ui/SketchCard";
import { formatListingDate } from "@/lib/data/format";
import { listingIsPast } from "@/lib/data/collegeReviewEligibility";
import { attendedFormalPreviewListing } from "@/lib/preview/attendedFormalPreview";
import { useNowMs } from "@/lib/hooks/useNowMs";

/** Member view for an attended formal — preview only, no Convex listing. */
export function AttendedFormalPreviewView() {
  const nowMs = useNowMs();
  const listing = attendedFormalPreviewListing;
  const isPast = listingIsPast(listing.dateTime, nowMs);

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-4 py-8 sm:px-6">
      <div className="flex flex-wrap items-center gap-3">
        <Link
          href="/?tab=requests&section=attended"
          className="rounded-full border-[2px] border-[var(--ink)] px-4 py-1.5 text-sm text-[var(--ink)] transition-colors hover:bg-[var(--ink)] hover:text-[var(--bg)]"
        >
          Back to formals attended
        </Link>
        <span className="text-xs text-[var(--ink-soft)]">UI preview only</span>
      </div>

      <SketchCard seed={42} className="p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <h1 className="font-display text-3xl uppercase tracking-wide">
            {listing.college}
          </h1>
        </div>
        <p className="mt-2 text-[var(--ink-muted)]">
          {formatListingDate(listing.dateTime)} · Group of {listing.groupSize}
        </p>
        {listing.message ? (
          <p className="mt-4 text-sm italic text-[var(--ink-soft)]">
            &ldquo;{listing.message}&rdquo;
          </p>
        ) : null}
        {isPast ? (
          <div className="mt-4 flex justify-end">
            <ConfirmAttendanceIndicator />
          </div>
        ) : null}
      </SketchCard>

      <ReviewFormalSectionPreview college={listing.college} />
    </main>
  );
}
