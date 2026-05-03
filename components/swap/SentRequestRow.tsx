"use client";

import { Avatar } from "@/components/ui/Avatar";
import { SketchCard, seedFrom } from "@/components/ui/SketchCard";
import type { User } from "@/lib/auth/types";
import { formatListingDate } from "@/lib/data/format";
import type { Listing, SwapRequest } from "@/lib/data/types";

type Props = {
  request: SwapRequest;
  toUser: User;
  targetListing: Listing | undefined;
  onMessage: () => void;
};

export function SentRequestRow({
  request,
  toUser,
  targetListing,
  onMessage,
}: Props) {
  const statusLabel =
    request.status === "pending"
      ? "Pending"
      : request.status === "accepted"
        ? "Accepted"
        : "Declined";

  return (
    <SketchCard
      seed={seedFrom(request.id)}
      className="flex items-center gap-4 p-4"
    >
      <Avatar name={toUser.name} />
      <div className="flex-1 min-w-0">
        <div className="text-lg leading-tight">
          {targetListing ? `${targetListing.college} formal` : "Swap request"}
          {targetListing && (
            <span className="text-[var(--ink-muted)]">
              {" "}
              · {formatListingDate(targetListing.dateTime)}
            </span>
          )}
        </div>
        <div className="text-sm text-[var(--ink-muted)]">
          requested from {toUser.name}
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <span className="rounded-full border-[2px] border-[var(--ink)] px-3 py-0.5 text-xs">
          {statusLabel}
        </span>
        <button
          type="button"
          onClick={onMessage}
          className="rounded-full border-[2px] border-[var(--ink)] text-[var(--ink)] hover:bg-[var(--ink)] hover:text-[var(--bg)] px-3 py-0.5 text-xs transition-colors"
        >
          Message
        </button>
      </div>
    </SketchCard>
  );
}
