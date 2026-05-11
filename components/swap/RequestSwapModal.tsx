"use client";

import { useMemo, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { formatListingDate } from "@/lib/data/format";
import type { Listing } from "@/lib/data/types";

type Props = {
  open: boolean;
  onClose: () => void;
  targetListing: Listing | null;
  myListings: Listing[];
  onSubmit: (args: { offeringListingId: string; message: string }) => void;
};

export function RequestSwapModal({
  open,
  onClose,
  targetListing,
  myListings,
  onSubmit,
}: Props) {
  const activeMine = useMemo(
    () => myListings.filter((l) => l.status === "active"),
    [myListings],
  );
  const [offeringId, setOfferingId] = useState<string>("");
  const [message, setMessage] = useState("");

  const effectiveOfferingId = offeringId || (activeMine[0]?.id ?? "");

  function handleSubmit() {
    if (!effectiveOfferingId) return;
    onSubmit({ offeringListingId: effectiveOfferingId, message });
    setMessage("");
    setOfferingId("");
  }

  const fieldCls =
    "w-full rounded-full border-[2px] border-[var(--ink)] bg-[var(--bg)] text-[var(--ink)] placeholder:text-[var(--ink-soft)] px-4 py-2 text-base focus:outline-none";

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
          You don&apos;t have an active listing to offer yet. Head to the
          <span className="font-medium text-[var(--ink)]"> Mine </span>
          tab to post one first.
        </div>
      ) : (
        <>
          <label className="flex flex-col gap-2 mb-4">
            <span className="text-sm text-[var(--ink-muted)]">
              Your formal to offer
            </span>
            <select
              value={effectiveOfferingId}
              onChange={(e) => setOfferingId(e.target.value)}
              className={fieldCls}
            >
              {activeMine.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.college} — {formatListingDate(l.dateTime)}
                </option>
              ))}
            </select>
          </label>

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

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-full border-[2px] border-[var(--ink)] text-[var(--ink)] hover:bg-[var(--ink)] hover:text-[var(--bg)] px-4 py-1.5 text-sm transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              className="rounded-full bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white px-5 py-1.5 text-sm"
            >
              Send request!
            </button>
          </div>
        </>
      )}
    </Modal>
  );
}
