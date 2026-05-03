"use client";

import { Modal } from "@/components/ui/Modal";
import type { User } from "@/lib/auth/types";
import { formatListingDate } from "@/lib/data/format";
import type { Listing } from "@/lib/data/types";

type Props = {
  open: boolean;
  onClose: () => void;
  myListing: Listing | null;
  theirListing: Listing | null;
  otherUser: User | null;
};

export function SwapConfirmedModal({
  open,
  onClose,
  myListing,
  theirListing,
  otherUser,
}: Props) {
  return (
    <Modal open={open} onClose={onClose}>
      <div className="text-center">
        <h2 className="font-display text-4xl uppercase tracking-wide">Swap confirmed</h2>
        {theirListing && (
          <p className="mt-4 text-[var(--ink-muted)]">
            You&apos;re going to{" "}
            <span className="text-[var(--ink)]">{theirListing.college}</span> ·{" "}
            {formatListingDate(theirListing.dateTime)}
          </p>
        )}
        {myListing && otherUser && (
          <p className="mt-1 text-[var(--ink-muted)]">
            {otherUser.name.split(" ")[0]} is coming to{" "}
            <span className="text-[var(--ink)]">{myListing.college}</span> ·{" "}
            {formatListingDate(myListing.dateTime)}
          </p>
        )}
        <button
          type="button"
          onClick={onClose}
          className="mt-6 rounded-full bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white px-6 py-2 text-sm"
        >
          Done
        </button>
      </div>
    </Modal>
  );
}
