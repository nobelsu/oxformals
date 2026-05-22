"use client";

import { useRouter } from "next/navigation";
import { MyListingCard } from "@/components/swap/MyListingCard";
import type { User } from "@/lib/auth/types";
import type { Listing } from "@/lib/data/types";
import {
  ATTENDED_FORMAL_PREVIEW_LISTING_ID,
  attendedFormalPreviewListing,
  attendedFormalPreviewOwner,
  isAttendedFormalPreviewListingId,
} from "@/lib/preview/attendedFormalPreview";

type Props = {
  attendedPastListings: Listing[];
  pendingReviewSet: Set<string>;
  pendingAttendanceSet: Set<string>;
  getUser: (id: string) => User | undefined;
};

export function AttendedFormalsSection({
  attendedPastListings,
  pendingReviewSet,
  pendingAttendanceSet,
  getUser,
}: Props) {
  const router = useRouter();

  const displayListings = [attendedFormalPreviewListing, ...attendedPastListings];

  function resolveOwner(listing: Listing): User | undefined {
    if (isAttendedFormalPreviewListingId(listing.id)) {
      return attendedFormalPreviewOwner;
    }
    return getUser(listing.ownerUserId);
  }

  function canConfirmListing(listing: Listing): boolean {
    if (isAttendedFormalPreviewListingId(listing.id)) return true;
    return pendingAttendanceSet.has(listing.id);
  }

  function canRateListing(listing: Listing): boolean {
    if (isAttendedFormalPreviewListingId(listing.id)) return false;
    return pendingReviewSet.has(listing.id);
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="font-display text-3xl uppercase tracking-wide">
          Formals I attended
        </h2>
        <p className="mt-1 text-xs text-[var(--ink-soft)]">
          Preview card at top — click through to try the review flow (nothing is
          saved).
        </p>
      </div>
      {displayListings.length === 0 ? (
        <p className="text-[var(--ink-muted)]">
          When you join someone else&apos;s formal, past formals will show up
          here.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {displayListings.map((listing) => {
            const owner = resolveOwner(listing);
            if (!owner) return null;
            const isPreview = isAttendedFormalPreviewListingId(listing.id);
            return (
              <MyListingCard
                key={listing.id}
                listing={listing}
                pendingRequestCount={0}
                memberUsers={[owner]}
                canConfirmAttendance={canConfirmListing(listing)}
                canRate={canRateListing(listing)}
                showCompletedBadge={false}
                hideGroupChat={isPreview}
                onViewRequests={() =>
                  router.push(
                    isPreview
                      ? `/requests/${ATTENDED_FORMAL_PREVIEW_LISTING_ID}`
                      : `/requests/${listing.id}`,
                  )
                }
                compact
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
