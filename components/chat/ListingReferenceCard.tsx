"use client";

import Link from "next/link";
import { ListingStatusTag } from "@/components/swap/ListingStatusTag";
import { ListingTypeTag } from "@/components/swap/ListingTypeTag";
import { formatListingDate, formatPrice } from "@/lib/data/format";
import type { ListingSummary } from "@/lib/chat/types";

type Props = {
  listing: ListingSummary;
  /** Navigate to the formal listing page. */
  href?: string;
  onPress?: () => void;
  compact?: boolean;
};

export function ListingReferenceCard({ listing, href, onPress, compact }: Props) {
  const interactive = Boolean(href ?? onPress);
  const className = `block rounded-xl border-[2px] border-[var(--ink)]/20 bg-[var(--paper)] text-left w-full ${
    compact ? "p-2.5" : "p-3"
  } ${interactive ? "cursor-pointer transition-colors hover:border-[var(--ink)]/50" : ""}`;

  const inner = (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <span
          className={`font-display uppercase tracking-wide text-[var(--ink)] ${
            compact ? "text-sm" : "text-base"
          }`}
        >
          {listing.college}
        </span>
        {listing.listingType ? (
          <ListingTypeTag listingType={listing.listingType} />
        ) : null}
        <ListingStatusTag
          status={listing.status}
          seatsAvailable={listing.seatsAvailable}
          compact={compact}
        />
      </div>
      <p className={`mt-1 text-[var(--ink-muted)] ${compact ? "text-xs" : "text-sm"}`}>
        {listing.ownerName}
        {" · "}
        {formatListingDate(listing.dateTime)}
        {listing.price !== undefined ? ` · ${formatPrice(listing.price)}` : ""}
      </p>
    </>
  );

  if (href) {
    return (
      <Link href={href} className={className}>
        {inner}
      </Link>
    );
  }

  if (onPress) {
    return (
      <button type="button" onClick={onPress} className={className}>
        {inner}
      </button>
    );
  }

  return <div className={className}>{inner}</div>;
}
