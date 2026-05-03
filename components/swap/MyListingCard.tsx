"use client";

import { SketchCard, seedFrom } from "@/components/ui/SketchCard";
import { formatListingDate } from "@/lib/data/format";
import type { Listing } from "@/lib/data/types";

type Props = {
  listing: Listing;
  pendingRequestCount: number;
  onViewRequests: () => void;
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

  return (
    <SketchCard
      seed={seedFrom(listing.id)}
      className="flex flex-col gap-3 p-5"
    >
      <header className="flex items-start justify-between gap-3">
        <h3 className="font-display text-3xl uppercase tracking-wide">
          {listing.college}
        </h3>
        <span className="rounded-full border-[2px] border-[var(--ink)] px-3 py-0.5 text-xs">
          {statusMap[listing.status]}
        </span>
      </header>

      <div className="text-[var(--ink-muted)]">
        {formatListingDate(listing.dateTime)} · {listing.seats}{" "}
        {listing.seats === 1 ? "seat" : "seats"}
      </div>

      {pendingRequestCount > 0 && (
        <button
          type="button"
          onClick={onViewRequests}
          className="text-left text-sm text-[var(--ink)] underline underline-offset-4"
        >
          {pendingRequestCount}{" "}
          {pendingRequestCount === 1 ? "request" : "requests"} — check Requests
          tab
        </button>
      )}
    </SketchCard>
  );
}
