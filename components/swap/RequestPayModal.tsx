"use client";

import { useEffect, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { formatListingDate, formatPrice } from "@/lib/data/format";
import type { Listing } from "@/lib/data/types";

type Props = {
  open: boolean;
  onClose: () => void;
  targetListing: Listing | null;
  onSubmit: (args: { message: string }) => void | Promise<void>;
};

export function RequestPayModal({
  open,
  onClose,
  targetListing,
  onSubmit,
}: Props) {
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) {
      setError(null);
      setSubmitting(false);
    }
  }, [open]);

  async function handleSubmit() {
    if (submitting) return;
    setError(null);
    setSubmitting(true);
    try {
      await onSubmit({ message });
      setMessage("");
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
          ? `Request to join ${targetListing.college}`
          : "Request to join"
      }
    >
      {targetListing && (
        <p className="mb-4 text-[var(--ink-muted)]">
          {formatListingDate(targetListing.dateTime)} · Group of{" "}
          {targetListing.groupSize} · {targetListing.seatsAvailable}{" "}
          {targetListing.seatsAvailable === 1 ? "seat" : "seats"} left
          {targetListing.price !== undefined
            ? ` · ${formatPrice(targetListing.price)}`
            : ""}
        </p>
      )}

      {targetListing?.price !== undefined && (
        <p className="mb-4 text-sm text-[var(--ink-muted)]">
          Payment is arranged offline after the host accepts your request.
        </p>
      )}

      <label className="flex flex-col gap-2 mb-6">
        <span className="text-sm text-[var(--ink-muted)]">Message (optional)</span>
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
          disabled={submitting}
          className="rounded-full bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white px-5 py-1.5 text-sm disabled:opacity-50"
        >
          Send request!
        </button>
      </div>
    </Modal>
  );
}
