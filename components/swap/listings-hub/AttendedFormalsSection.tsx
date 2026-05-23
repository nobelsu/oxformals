"use client";

import { useRouter } from "next/navigation";
import { MyListingCard } from "@/components/swap/MyListingCard";
import type { User } from "@/lib/auth/types";
import type { Listing } from "@/lib/data/types";

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

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="font-display text-3xl uppercase tracking-wide">
          Formals I attended
        </h2>
      </div>
      {attendedPastListings.length === 0 ? (
        <p className="text-[var(--ink-muted)]">
          When you join someone else&apos;s formal, past formals will show up
          here.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {attendedPastListings.map((listing) => {
            const owner = getUser(listing.ownerUserId);
            if (!owner) return null;
            return (
              <MyListingCard
                key={listing.id}
                listing={listing}
                pendingRequestCount={0}
                memberUsers={[owner]}
                canConfirmAttendance={pendingAttendanceSet.has(listing.id)}
                canRate={pendingReviewSet.has(listing.id)}
                showCompletedBadge={false}
                onViewRequests={() => router.push(`/requests/${listing.id}`)}
                compact
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
