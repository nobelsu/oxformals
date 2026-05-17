"use client";

import Link from "next/link";
import { Avatar } from "@/components/ui/Avatar";
import { SketchCard, seedFrom } from "@/components/ui/SketchCard";
import type { User } from "@/lib/auth/types";
import { formatListingDate, formatPrice, formatRelativeTime } from "@/lib/data/format";
import type { Listing, SwapRequest } from "@/lib/data/types";
import { resolveRequestType } from "@/lib/data/requestFilters";
import { RequestMessage } from "@/components/swap/RequestMessage";
import { RequestTypeTag } from "@/components/swap/RequestTypeTag";

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
  const requestType = resolveRequestType(request);
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
      <div className="absolute right-4 top-3 flex flex-wrap items-center justify-end gap-1.5">
        <RequestTypeTag requestType={requestType} />
        <span className="rounded-full border-[2px] border-[var(--ink)] px-3 py-0.5 text-xs">
          {statusLabel}
        </span>
      </div>
      <div className="flex items-start gap-4">
        <Link href={`/profile/${toUser.id}`}>
          <Avatar name={toUser.name} source={toUser.avatar} />
        </Link>
        <div className="min-w-0 flex-1 space-y-1.5 pt-1">
          <Link href={`/profile/${toUser.id}`} className="text-lg leading-tight hover:underline">
            {toUser.name}
          </Link>
          <div className="text-sm leading-snug text-[var(--ink-muted)]">
            {requestType === "pay" ? (
              <>
                Pay request
                {targetListing?.price !== undefined
                  ? ` · ${formatPrice(targetListing.price)}`
                  : ""}
              </>
            ) : targetListing ? (
              <>
                {targetListing.college}
                <span className="text-[var(--ink-muted)]">
                  {" "}
                  · {formatListingDate(targetListing.dateTime)}
                </span>
              </>
            ) : (
              "Swap request"
            )}
          </div>
          {request.message ? <RequestMessage message={request.message} /> : null}
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
