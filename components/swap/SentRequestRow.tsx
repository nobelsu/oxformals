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
      padded={false}
      className="relative p-6"
    >
      <span className="absolute right-4 top-3 rounded-full border-[2px] border-[var(--ink)] px-3 py-0.5 text-xs">
        {statusLabel}
      </span>
      <div className="flex items-start gap-4">
        <Avatar name={toUser.name} source={toUser.avatar} />
        <div className="min-w-0 flex-1 space-y-1.5 pt-1">
          <div className="text-lg leading-tight">{toUser.name}</div>
          <div className="text-sm leading-snug text-[var(--ink-muted)]">
            {targetListing ? targetListing.college : "Swap request"}
            {targetListing && (
              <span className="text-[var(--ink-muted)]">
                {" "}
                · {formatListingDate(targetListing.dateTime)}
              </span>
            )}
          </div>
          {request.message ? (
            <p className="truncate text-sm italic leading-relaxed text-[var(--ink-soft)]">
              “{request.message}”
            </p>
          ) : null}
          <p className="text-xs leading-relaxed text-[var(--ink-soft)]">
            Sent {formatRelativeTime(request.createdAt)}
          </p>
        </div>
      </div>
      {request.status === "pending" && onWithdraw ? (
        <div className="mt-3 flex justify-start">
          <button
            type="button"
            onClick={() => onWithdraw(request.id)}
            className="rounded-full border-[2px] border-[var(--accent)] bg-[var(--accent)] px-4 py-1 text-sm text-white transition-colors hover:border-[var(--accent-hover)] hover:bg-[var(--accent-hover)]"
          >
            Withdraw
          </button>
        </div>
      ) : null}
    </SketchCard>
  );
}
