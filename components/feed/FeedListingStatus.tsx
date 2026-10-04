"use client";

import { useState } from "react";
import { useAuth } from "@/components/auth/useAuth";
import { useData } from "@/components/data/useData";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import {
  findBlockingOutgoingRequestForTarget,
  pendingIncomingRequestsForListing,
} from "@/lib/data/requestFilters";
import type { Listing } from "@/lib/data/types";

const PILL =
  "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[0.78rem] font-semibold";

/**
 * Where you stand with a listing in the feed: requests waiting on your own
 * listing, or the state of a request you sent. Renders nothing otherwise.
 */
export function FeedListingStatus({
  listing,
  onReview,
}: {
  listing: Listing;
  onReview: () => void;
}) {
  const { user } = useAuth();
  const { requests, withdrawRequest } = useData();
  const [confirmWithdraw, setConfirmWithdraw] = useState(false);
  if (!user) return null;

  const strip =
    "flex items-center justify-between gap-3 border-t border-[color-mix(in_srgb,var(--ink)_10%,transparent)] px-4 py-2.5";

  if (listing.ownerUserId === user.id) {
    const waiting = pendingIncomingRequestsForListing(requests, user.id, listing.id).length;
    if (waiting === 0) return null;
    return (
      <div className={strip}>
        <span className={`${PILL} bg-[var(--accent-wash)] text-[var(--accent-wash-ink)]`}>
          {waiting} request{waiting === 1 ? "" : "s"} waiting
        </span>
        <button
          type="button"
          onClick={onReview}
          className="cursor-pointer rounded-full border-[1.5px] border-[var(--ink)] px-3.5 py-1 text-[0.8rem] font-semibold transition-colors hover:bg-[var(--ink)] hover:text-[var(--bg)]"
        >
          Review
        </button>
      </div>
    );
  }

  const sent = findBlockingOutgoingRequestForTarget(requests, user.id, listing.id);
  if (!sent) return null;
  const pending = sent.status === "pending";
  return (
    <div className={strip}>
      <span
        className={`${PILL} ${
          pending
            ? "bg-[color-mix(in_srgb,var(--ink)_7%,transparent)] text-[var(--ink-muted)]"
            : "bg-[var(--accent-wash)] text-[var(--accent-wash-ink)]"
        }`}
      >
        {pending ? "Requested · pending" : "You're going"}
      </span>
      {pending ? (
        <button
          type="button"
          onClick={() => setConfirmWithdraw(true)}
          className="cursor-pointer text-[0.8rem] font-semibold text-[var(--ink-muted)] transition-colors hover:text-[var(--ink)]"
        >
          Withdraw
        </button>
      ) : null}
      <ConfirmDialog
        open={confirmWithdraw}
        message="Withdraw this request?"
        variant="destructive"
        confirmLabel="Withdraw"
        onConfirm={() => {
          setConfirmWithdraw(false);
          withdrawRequest(sent.id);
        }}
        onCancel={() => setConfirmWithdraw(false)}
      />
    </div>
  );
}
