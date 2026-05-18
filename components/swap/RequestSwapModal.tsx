"use client";

import { useEffect, useMemo, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { OutlineCombobox } from "@/components/ui/OutlineCombobox";
import { formatListingDate } from "@/lib/data/format";
import { listingSupportsSwap } from "@/lib/data/listingType";
import {
  canSendSwapWithOffering,
  OFFERING_NO_SWAP_CAPACITY_MESSAGE,
} from "@/lib/data/requestFilters";
import type { Listing, SwapRequest } from "@/lib/data/types";

type Props = {
  open: boolean;
  onClose: () => void;
  targetListing: Listing | null;
  myListings: Listing[];
  requests: SwapRequest[];
  userId: string | undefined;
  onSubmit: (args: {
    offeringListingId: string;
    message: string;
  }) => void | Promise<void>;
};

export function RequestSwapModal({
  open,
  onClose,
  targetListing,
  myListings,
  requests,
  userId,
  onSubmit,
}: Props) {
  const activeMine = useMemo(
    () =>
      myListings.filter(
        (l) => l.status === "active" && listingSupportsSwap(l.listingType),
      ),
    [myListings],
  );
  const listingsWithCapacity = useMemo(() => {
    if (!userId) return activeMine;
    return activeMine.filter((l) =>
      canSendSwapWithOffering(requests, userId, l.id, l.seatsAvailable),
    );
  }, [activeMine, requests, userId]);
  const offeringOptions = useMemo(
    () =>
      listingsWithCapacity.map((l) => ({
        value: l.id,
        label: `${l.college} — ${formatListingDate(l.dateTime)}`,
      })),
    [listingsWithCapacity],
  );
  const [offeringId, setOfferingId] = useState<string>("");
  const [offeringPickerOpen, setOfferingPickerOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const effectiveOfferingId = useMemo(() => {
    if (
      offeringId &&
      listingsWithCapacity.some((l) => l.id === offeringId)
    ) {
      return offeringId;
    }
    return listingsWithCapacity[0]?.id ?? "";
  }, [offeringId, listingsWithCapacity]);
  const selectedOffering = listingsWithCapacity.find(
    (l) => l.id === effectiveOfferingId,
  );

  useEffect(() => {
    if (!open) {
      setError(null);
      setSubmitting(false);
    }
  }, [open]);

  async function handleSubmit() {
    if (!effectiveOfferingId || submitting) return;
    if (!userId) return;

    const offering = activeMine.find((l) => l.id === effectiveOfferingId);
    if (
      !offering ||
      !canSendSwapWithOffering(
        requests,
        userId,
        effectiveOfferingId,
        offering.seatsAvailable,
      )
    ) {
      setError(OFFERING_NO_SWAP_CAPACITY_MESSAGE);
      return;
    }

    setError(null);
    setSubmitting(true);
    try {
      await onSubmit({ offeringListingId: effectiveOfferingId, message });
      setMessage("");
      setOfferingId("");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not send request.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={
        targetListing
          ? `Request swap for ${targetListing.college}`
          : "Request swap"
      }
    >
      {targetListing && (
        <p className="mb-4 text-[var(--ink-muted)]">
          {formatListingDate(targetListing.dateTime)} · Group of {targetListing.groupSize} · {targetListing.seatsAvailable}{" "}
          {targetListing.seatsAvailable === 1 ? "seat" : "seats"} left
        </p>
      )}

      {activeMine.length === 0 ? (
        <div className="text-[var(--ink-muted)]">
          You need an active swap or both-type listing to offer. Pay-only
          listings can&apos;t be used in swaps. Head to the
          <span className="font-medium text-[var(--ink)]"> Mine </span>
          tab to list one.
        </div>
      ) : listingsWithCapacity.length === 0 ? (
        <p className="text-[var(--ink-muted)]">
          {OFFERING_NO_SWAP_CAPACITY_MESSAGE}
        </p>
      ) : (
        <>
          <label className="flex flex-col gap-2 mb-4">
            <span className="text-sm text-[var(--ink-muted)]">
              Your formal to offer
            </span>
            <OutlineCombobox
              open={offeringPickerOpen}
              onOpenChange={setOfferingPickerOpen}
              value={effectiveOfferingId}
              options={offeringOptions}
              onChange={(v) => {
                setOfferingId(v);
                setOfferingPickerOpen(false);
                setError(null);
              }}
              placeholder="Choose a listing"
            />
          </label>

          {selectedOffering && (
            <p className="mb-4 text-xs text-[var(--ink-muted)]">
              {selectedOffering.seatsAvailable}{" "}
              {selectedOffering.seatsAvailable === 1 ? "seat" : "seats"} left
              to offer on this listing
            </p>
          )}

          <label className="flex flex-col gap-2 mb-6">
            <span className="text-sm text-[var(--ink-muted)]">
              Message (optional)
            </span>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={3}
              placeholder="Say hi!"
              className="w-full rounded-[20px] border-[2px] border-[var(--ink)] bg-[var(--bg)] text-[var(--ink)] placeholder:text-[var(--ink-soft)] px-4 py-2 text-base focus:outline-none"
            />
          </label>

          {error ? (
            <p className="mb-4 text-sm text-[var(--danger)]">{error}</p>
          ) : null}

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="rounded-full border-[2px] border-[var(--ink)] text-[var(--ink)] hover:bg-[var(--ink)] hover:text-[var(--bg)] px-4 py-1.5 text-sm transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => void handleSubmit()}
              disabled={submitting || !effectiveOfferingId}
              className="rounded-full bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white px-5 py-1.5 text-sm disabled:opacity-50"
            >
              Send request!
            </button>
          </div>
        </>
      )}
    </Modal>
  );
}
