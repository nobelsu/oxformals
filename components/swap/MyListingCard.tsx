"use client";

import { SketchCard, seedFrom } from "@/components/ui/SketchCard";
import { formatListingDate, formatYearLabel } from "@/lib/data/format";
import type { Listing } from "@/lib/data/types";

type Props = {
  listing: Listing;
  pendingRequestCount: number;
  onViewRequests?: () => void;
};

export function MyListingCard({
  listing,
  pendingRequestCount,
  onViewRequests,
}: Props) {
  const statusMap: Record<Listing["status"], string> = {
    active: "Active",
    confirmed: "Swap confirmed",
    closed: "Closed",
  };

  const cardContent = (
    <>
      <header className="flex min-w-0 shrink-0 items-start justify-between gap-3">
        <h3 className="line-clamp-3 min-w-0 flex-1 break-words font-display text-3xl uppercase tracking-wide">
          {listing.college}
        </h3>
        <span className="shrink-0 rounded-full border-[2px] border-[var(--ink)] px-3 py-0.5 text-xs">
          {statusMap[listing.status]}
        </span>
      </header>

      <div className="shrink-0 truncate text-[var(--ink-muted)]">
        {formatListingDate(listing.dateTime)} · {listing.seats}{" "}
        {listing.seats === 1 ? "seat" : "seats"}
      </div>

      <div className="shrink-0 truncate text-sm text-[var(--ink-soft)]">
        {[formatYearLabel(listing.year) || listing.year, listing.role]
          .filter(Boolean)
          .join(" · ")}
      </div>

      <div className="mt-auto min-h-0 w-full shrink-0 text-left text-sm leading-snug text-[var(--ink)] underline underline-offset-4">
        {pendingRequestCount > 0
          ? `${pendingRequestCount} ${
              pendingRequestCount === 1 ? "request" : "requests"
            } — view listing requests`
          : "View listing requests"}
      </div>
    </>
  );

  if (onViewRequests) {
    return (
      <button
        type="button"
        onClick={onViewRequests}
        className="group w-full cursor-pointer text-left"
        aria-label={`View requests for ${listing.college}`}
      >
        <SketchCard
          seed={seedFrom(listing.id)}
          className="flex h-full min-h-[13.2rem] flex-col gap-3 overflow-hidden p-5 transition-none group-hover:translate-x-3 group-hover:-translate-y-3 group-hover:shadow-[16px_-16px_0px_var(--bg)] group-focus-visible:translate-x-3 group-focus-visible:-translate-y-3 group-focus-visible:shadow-[16px_-16px_0px_var(--bg)] sm:min-h-[15.6rem]"
        >
          {cardContent}
        </SketchCard>
      </button>
    );
  }

  return (
    <SketchCard
      seed={seedFrom(listing.id)}
      className="flex h-full min-h-[13.2rem] flex-col gap-3 overflow-hidden p-5 sm:min-h-[15.6rem]"
    >
      {cardContent}
    </SketchCard>
  );
}
