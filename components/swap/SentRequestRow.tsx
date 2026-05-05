"use client";

import { Avatar } from "@/components/ui/Avatar";
import { SketchCard, seedFrom } from "@/components/ui/SketchCard";
import type { User } from "@/lib/auth/types";
import { formatListingDate, formatRelativeTime } from "@/lib/data/format";
import type { Listing, SwapRequest } from "@/lib/data/types";

type Props = {
  request: SwapRequest;
  toUser: User;
  targetListing: Listing | undefined;
  onWithdraw?: (requestId: string) => void;
};

export function SentRequestRow({
  request,
  toUser,
  targetListing,
  onWithdraw,
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
      className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center"
    >
      <Avatar name={toUser.name} source={toUser.avatar} />
      <div className="min-w-0 flex-1">
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
        {request.message ? (
          <p className="mt-1 truncate text-sm italic text-[var(--ink-soft)]">
            “{request.message}”
          </p>
        ) : null}
        <p className="mt-1 text-xs text-[var(--ink-soft)]">
          Sent {formatRelativeTime(request.createdAt)}
        </p>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-2 sm:flex-row sm:items-center">
        <span className="rounded-full border-[2px] border-[var(--ink)] px-3 py-0.5 text-xs">
          {statusLabel}
        </span>
        {request.status === "pending" && onWithdraw ? (
          <button
            type="button"
            onClick={() => onWithdraw(request.id)}
            className="rounded-full border-[2px] border-[var(--ink)] px-3 py-0.5 text-xs text-[var(--ink)] transition-colors hover:bg-[var(--ink)] hover:text-[var(--bg)]"
          >
            Withdraw
          </button>
        ) : null}
      </div>
    </SketchCard>
  );
}
