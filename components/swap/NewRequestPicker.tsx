"use client";

import { Modal } from "@/components/ui/Modal";
import type { User } from "@/lib/auth/types";
import type { Listing } from "@/lib/data/types";
import { ListingCard } from "./ListingCard";

type Props = {
  open: boolean;
  onClose: () => void;
  listings: Listing[];
  getUser: (userId: string) => User | undefined;
  onSelect: (listing: Listing) => void;
};

export function NewRequestPicker({
  open,
  onClose,
  listings,
  getUser,
  onSelect,
}: Props) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Pick a formal to swap for"
      panelClassName="max-w-5xl max-h-[85vh]"
    >
      {listings.length === 0 ? (
        <p className="text-[var(--ink-muted)]">
          No open swaps right now. Check back soon, or list one of your own.
        </p>
      ) : (
        <div className="grid grid-cols-1 items-stretch gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {listings.map((l) => {
            const owner = getUser(l.ownerUserId);
            if (!owner) return null;
            return (
              <ListingCard
                key={l.id}
                listing={l}
                owner={owner}
                onRequest={() => onSelect(l)}
              />
            );
          })}
        </div>
      )}
    </Modal>
  );
}
