"use client";

import { Avatar } from "@/components/ui/Avatar";
import { SketchCard, seedFrom } from "@/components/ui/SketchCard";
import type { User } from "@/lib/auth/types";
import { formatListingDate, formatRelativeTime } from "@/lib/data/format";
import type { Listing, SwapRequest } from "@/lib/data/types";

type Props = {
  request: SwapRequest;
  fromUser: User;
  offeringListing: Listing | undefined;
  onAccept: () => void;
  onDecline: () => void;
};

export function IncomingRequestRow({
  request,
  fromUser,
  offeringListing,
  onAccept,
  onDecline,
}: Props) {
  const isPending = request.status === "pending";
  const statusLabel =
    request.status === "pending"
      ? "Pending"
      : request.status === "accepted"
        ? "Accepted"
        : "Declined";
  return (
    <SketchCard
      seed={seedFrom(request.id)}
      padded={false}
      className="relative p-6"
    >
      <span className="absolute right-4 top-3 rounded-full border-[2px] border-[var(--ink)] px-3 py-0.5 text-xs">
        {statusLabel}
      </span>
      <div className="flex items-start gap-4">
        <Avatar name={fromUser.name} source={fromUser.avatar} />
        <div className="min-w-0 flex-1 space-y-1.5 pt-1">
          <div className="text-lg leading-tight">{fromUser.name}</div>
          {offeringListing ? (
            <div className="text-sm leading-snug text-[var(--ink-muted)]">
              {offeringListing.college} · {formatListingDate(offeringListing.dateTime)}
            </div>
          ) : (
            <div className="text-sm leading-snug text-[var(--ink-muted)]">
              Swap request
            </div>
          )}
          {request.message && (
            <p className="truncate text-sm italic leading-relaxed text-[var(--ink-soft)]">
              “{request.message}”
            </p>
          )}
          <p className="text-xs leading-relaxed text-[var(--ink-soft)]">
            Sent {formatRelativeTime(request.createdAt)}
          </p>
        </div>
      </div>

      {isPending ? (
        <div className="mt-3 flex gap-2 justify-start">
          <button
            type="button"
            onClick={onAccept}
            className="rounded-full bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white px-4 py-1 text-sm"
          >
            Accept
          </button>
          <button
            type="button"
            onClick={onDecline}
            className="rounded-full border-[2px] border-[var(--ink)] text-[var(--ink)] hover:bg-[var(--ink)] hover:text-[var(--bg)] px-4 py-1 text-sm transition-colors"
          >
            Decline
          </button>
        </div>
      ) : null}
    </SketchCard>
  );
}
