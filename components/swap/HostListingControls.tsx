"use client";

import { useState } from "react";
import { useAuth } from "@/components/auth/useAuth";
import { useData } from "@/components/data/useData";
import { EditListingBlockedModal } from "@/components/swap/EditListingBlockedModal";
import { ListFormalForm } from "@/components/swap/ListFormalForm";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Modal } from "@/components/ui/Modal";
import { listingIsPast } from "@/lib/data/collegeReviewEligibility";
import {
  pendingIncomingRequestsForListing,
  resolveRequestType,
} from "@/lib/data/requestFilters";
import { useNowMs } from "@/lib/hooks/useNowMs";
import type { User } from "@/lib/auth/types";
import type { Listing } from "@/lib/data/types";

const ROUND =
  "flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border-[2px] transition-colors";

/**
 * Edit and delete for the host of a listing. Editing is blocked while requests
 * are pending (the host answers them first), and the date locks once someone
 * has joined.
 */
export function HostListingControls({
  listing,
  onViewRequests,
  onDeleted,
}: {
  listing: Listing;
  /** Shows the pending requests (when an edit is blocked by them). */
  onViewRequests: () => void;
  onDeleted: () => void;
}) {
  const { user } = useAuth();
  const { requests, updateListing, deleteListing } = useData();
  const nowMs = useNowMs();
  const [editOpen, setEditOpen] = useState(false);
  const [blockedOpen, setBlockedOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  if (!user) return null;

  const isPast = listingIsPast(listing.dateTime, nowMs);
  const pending = pendingIncomingRequestsForListing(requests, user.id, listing.id).length;
  const hasGuests = listing.members.length > 1;

  return (
    <span className="flex items-center gap-2">
      {!isPast ? (
        <button
          type="button"
          aria-label="Edit listing"
          onClick={() => (pending > 0 ? setBlockedOpen(true) : setEditOpen(true))}
          className={`${ROUND} border-[var(--ink)] text-[var(--ink)] hover:bg-[var(--ink)] hover:text-[var(--bg)]`}
        >
          <svg aria-hidden viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
            <path d="m15 5 4 4" />
          </svg>
        </button>
      ) : null}
      <button
        type="button"
        aria-label="Delete listing"
        onClick={() => setDeleteOpen(true)}
        className={`${ROUND} border-[var(--danger)] text-[var(--danger)] hover:bg-[var(--danger)] hover:text-[var(--danger-ink)]`}
      >
        <svg aria-hidden viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 6h18" />
          <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
          <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
        </svg>
      </button>

      <EditListingBlockedModal
        open={blockedOpen}
        onClose={() => setBlockedOpen(false)}
        pendingCount={pending}
        onViewRequests={onViewRequests}
      />

      <Modal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        panelClassName="!max-w-3xl"
        bodyScrollable={false}
      >
        <ListFormalForm
          embedded
          profile={{ college: user.college, year: user.year, role: user.role }}
          initialValues={{
            dateTime: listing.dateTime,
            groupSize: listing.groupSize,
            message: listing.message,
            menu: listing.menu,
            menuPdfUrl: listing.menuPdfUrl,
            menuFileContentType: listing.menuFileContentType,
            listingType: listing.listingType,
            formalType: listing.formalType,
            price: listing.price,
          }}
          minGroupSize={listing.members.length}
          dateLocked={hasGuests}
          onSubmit={(input) => {
            setEditOpen(false);
            if (listingIsPast(listing.dateTime, nowMs)) return;
            if (pending > 0) {
              setBlockedOpen(true);
              return;
            }
            updateListing(listing.id, {
              ...(hasGuests ? {} : { dateTime: input.dateTime }),
              groupSize: input.groupSize,
              message: input.message,
              menu: input.menu,
              ...(input.menuPdfId !== undefined ? { menuPdfId: input.menuPdfId } : {}),
              ...(input.clearMenuPdf ? { clearMenuPdf: true } : {}),
              listingType: input.listingType,
              formalType: input.formalType,
              ...(input.price !== undefined ? { price: input.price } : {}),
            });
          }}
        />
      </Modal>

      <ConfirmDialog
        open={deleteOpen}
        message={
          isPast
            ? "Delete this past listing?"
            : hasGuests
              ? "Cancel this formal? Your guests will be notified."
              : "Delete this listing? All pending requests will be declined."
        }
        variant="destructive"
        confirmLabel={!isPast && hasGuests ? "Cancel formal" : "Delete"}
        onConfirm={() => {
          setDeleteOpen(false);
          deleteListing(listing.id);
          onDeleted();
        }}
        onCancel={() => setDeleteOpen(false)}
      />
    </span>
  );
}

/** Host only: take a guest out of the group (undoing their swap, if it was one). */
export function RemoveMemberButton({ listing, member }: { listing: Listing; member: User }) {
  const { requests, removeMember } = useData();
  const [open, setOpen] = useState(false);
  const swapPartner = requests.some(
    (r) =>
      r.status === "accepted" &&
      resolveRequestType(r) === "swap" &&
      ((r.targetListingId === listing.id && r.fromUserId === member.id) ||
        (r.offeringListingId === listing.id && r.toUserId === member.id)),
  );
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="cursor-pointer rounded-full border-[2px] border-[var(--ink)] px-2.5 py-0.5 text-[0.65rem] text-[var(--ink)] transition-colors hover:bg-[var(--ink)] hover:text-[var(--bg)]"
      >
        Remove
      </button>
      <ConfirmDialog
        open={open}
        message={
          swapPartner
            ? `Remove ${member.name}? This also undoes your swap.`
            : `Remove ${member.name} from the group?`
        }
        variant="destructive"
        confirmLabel="Remove"
        onConfirm={() => {
          setOpen(false);
          removeMember(listing.id, member.id);
        }}
        onCancel={() => setOpen(false)}
      />
    </>
  );
}
