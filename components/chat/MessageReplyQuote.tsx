"use client";

import { formatListingDate, formatListingStatusLabel } from "@/lib/data/format";
import type { Id } from "@/convex/_generated/dataModel";
import type { MessageReplySnapshot } from "@/lib/chat/types";

type Props = {
  reply: MessageReplySnapshot;
  senderLabel: string;
  isMine?: boolean;
  variant?: "bubble" | "composer";
  onListingPress?: (listingId: Id<"listings">) => void;
  onCancel?: () => void;
};

export function MessageReplyQuote({
  reply,
  senderLabel,
  isMine = false,
  variant = "bubble",
  onListingPress,
  onCancel,
}: Props) {
  const isComposer = variant === "composer";

  const borderClass = isMine
    ? "border-[var(--accent-ink)]/50"
    : "border-[var(--accent)]/60";
  const labelClass = isMine
    ? "text-[var(--accent-ink)]/90"
    : "text-[var(--accent)]";
  const bodyClass = isMine
    ? "text-[var(--accent-ink)]/75"
    : "text-[var(--ink-muted)]";
  const listingClass = isMine
    ? "text-[var(--accent-ink)]/80"
    : "text-[var(--ink-muted)]";

  const previewBody =
    reply.body.length > 120 ? `${reply.body.slice(0, 120)}…` : reply.body;

  const listingPreview = reply.referencedListing
    ? [
        reply.referencedListing.ownerName,
        reply.referencedListing.college,
        formatListingDate(reply.referencedListing.dateTime),
        formatListingStatusLabel(
          reply.referencedListing.status,
          reply.referencedListing.seatsAvailable,
        ),
      ].join(" · ")
    : null;

  return (
    <div
      className={`border-l-2 pl-2.5 ${
        isComposer
          ? `mb-2 flex items-start gap-2 rounded-xl border border-[var(--ink)]/15 bg-[var(--paper)] p-2.5 ${borderClass}`
          : `mb-2 ${borderClass}`
      }`}
    >
      <div className="min-w-0 flex-1">
        <p
          className={`text-[0.7rem] font-medium ${isComposer ? "text-[var(--ink)]" : labelClass}`}
        >
          {isComposer ? `Replying to ${senderLabel}` : senderLabel}
        </p>
        {reply.unavailable ? (
          <p
            className={`mt-0.5 text-xs italic ${isComposer ? "text-[var(--ink-soft)]" : bodyClass}`}
          >
            Original message unavailable
          </p>
        ) : (
          <>
            {previewBody ? (
              <p
                className={`mt-0.5 truncate text-xs ${
                  isComposer ? "text-[var(--ink-muted)]" : bodyClass
                }`}
              >
                {previewBody}
              </p>
            ) : null}
            {listingPreview ? (
              reply.referencedListing && onListingPress ? (
                <button
                  type="button"
                  onClick={() => onListingPress(reply.referencedListing!.id)}
                  className={`mt-0.5 block w-full truncate text-left text-xs underline-offset-2 hover:underline ${
                    isComposer ? "text-[var(--ink-muted)]" : listingClass
                  }`}
                >
                  {listingPreview}
                </button>
              ) : (
                <p
                  className={`mt-0.5 truncate text-xs ${
                    isComposer ? "text-[var(--ink-muted)]" : listingClass
                  }`}
                >
                  {listingPreview}
                </p>
              )
            ) : null}
          </>
        )}
      </div>
      {onCancel ? (
        <button
          type="button"
          onClick={onCancel}
          className="shrink-0 text-xs text-[var(--ink-muted)] underline"
          aria-label="Cancel reply"
        >
          Cancel
        </button>
      ) : null}
    </div>
  );
}
