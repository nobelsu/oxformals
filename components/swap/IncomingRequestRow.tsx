"use client";

import { Avatar } from "@/components/ui/Avatar";
import { SketchCard, seedFrom } from "@/components/ui/SketchCard";
import type { User } from "@/lib/auth/types";
import { formatListingDate } from "@/lib/data/format";
import type { Listing, SwapRequest } from "@/lib/data/types";

type Props = {
  request: SwapRequest;
  fromUser: User;
  offeringListing: Listing | undefined;
  onAccept: () => void;
  onDecline: () => void;
  onMessage: () => void;
};

export function IncomingRequestRow({
  request,
  fromUser,
  offeringListing,
  onAccept,
  onDecline,
  onMessage,
}: Props) {
  const isPending = request.status === "pending";
  return (
    <SketchCard
      seed={seedFrom(request.id)}
      className="flex flex-col sm:flex-row sm:items-center gap-4 p-4"
    >
      <Avatar name={fromUser.name} />
      <div className="flex-1 min-w-0">
        <div className="text-lg leading-tight">
          {fromUser.name}{" "}
          <span className="text-[var(--ink-muted)]">· {fromUser.college}</span>
        </div>
        {offeringListing && (
          <div className="text-sm text-[var(--ink-muted)]">
            offering {offeringListing.college} —{" "}
            {formatListingDate(offeringListing.dateTime)}
          </div>
        )}
        {request.message && (
          <p className="mt-1 text-sm text-[var(--ink-soft)] italic truncate">
            “{request.message}”
          </p>
        )}
      </div>

      <div className="flex gap-2 shrink-0">
        {isPending ? (
          <>
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
            <button
              type="button"
              onClick={onMessage}
              className="rounded-full border-[2px] border-[var(--ink)] text-[var(--ink)] hover:bg-[var(--ink)] hover:text-[var(--bg)] px-4 py-1 text-sm transition-colors"
            >
              Message
            </button>
          </>
        ) : (
          <StatusPill status={request.status} />
        )}
      </div>
    </SketchCard>
  );
}

function StatusPill({ status }: { status: SwapRequest["status"] }) {
  const label =
    status === "pending"
      ? "Pending"
      : status === "accepted"
        ? "Accepted"
        : "Declined";
  return (
    <span className="rounded-full border-[2px] border-[var(--ink)] px-3 py-0.5 text-xs">
      {label}
    </span>
  );
}
