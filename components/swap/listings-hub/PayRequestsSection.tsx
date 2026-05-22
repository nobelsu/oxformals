"use client";

import { SentRequestRow } from "@/components/swap/SentRequestRow";
import { placeholderUser } from "@/lib/data/users";
import type { User } from "@/lib/auth/types";
import type { Listing, SwapRequest } from "@/lib/data/types";

type Props = {
  myPayRequests: SwapRequest[];
  getUser: (id: string) => User | undefined;
  getListing: (id: string) => Listing | undefined;
  onWithdraw: (requestId: string) => void;
};

export function PayRequestsSection({
  myPayRequests,
  getUser,
  getListing,
  onWithdraw,
}: Props) {
  return (
    <div className="flex flex-col gap-4">
      <h2 className="font-display text-3xl uppercase tracking-wide">
        Pay requests sent
      </h2>
      {myPayRequests.length === 0 ? (
        <p className="text-[var(--ink-muted)]">
          You haven&apos;t sent any pay requests yet.
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {myPayRequests.map((r) => {
            const toUser = getUser(r.toUserId) ?? placeholderUser(r.toUserId);
            return (
              <SentRequestRow
                key={r.id}
                request={r}
                toUser={toUser}
                targetListing={getListing(r.targetListingId)}
                onWithdraw={onWithdraw}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
