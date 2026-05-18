"use client";

import { useQuery } from "convex/react";
import { Modal } from "@/components/ui/Modal";
import { ListingReferenceCard } from "@/components/chat/ListingReferenceCard";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import type { ListingSummary } from "@/lib/chat/types";

type Props = {
  open: boolean;
  onClose: () => void;
  conversationId: Id<"conversations">;
  onSelect: (listing: ListingSummary) => void;
};

export function ListingReferencePicker({
  open,
  onClose,
  conversationId,
  onSelect,
}: Props) {
  const listings = useQuery(
    api.chat.listReferableListings,
    open ? { conversationId } : "skip",
  );

  return (
    <Modal open={open} onClose={onClose} panelClassName="max-w-md">
      <h2 className="font-display text-2xl uppercase tracking-wide">
        Refer to a listing
      </h2>
      <p className="mt-2 text-sm text-[var(--ink-muted)]">
        Attach a formal listing to your message.
      </p>
      <div className="mt-5 flex max-h-[50vh] flex-col gap-2 overflow-y-auto">
        {listings === undefined ? (
          <p className="text-sm text-[var(--ink-soft)]">Loading…</p>
        ) : listings.length === 0 ? (
          <p className="text-sm text-[var(--ink-soft)]">No listings available.</p>
        ) : (
          listings.map((listing) => (
            <ListingReferenceCard
              key={listing.id}
              listing={listing}
              compact
              onPress={() => {
                onSelect(listing);
                onClose();
              }}
            />
          ))
        )}
      </div>
    </Modal>
  );
}
