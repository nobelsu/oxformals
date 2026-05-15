"use client";

import Link from "next/link";
import { Avatar } from "@/components/ui/Avatar";
import { SketchCard, seedFrom } from "@/components/ui/SketchCard";
import type { User } from "@/lib/auth/types";
import { formatListingDate, formatPrice, formatRelativeTime } from "@/lib/data/format";
import type { Listing, SwapRequest } from "@/lib/data/types";
import { resolveRequestType } from "@/lib/data/requestFilters";
import { RequestTypeTag } from "@/components/swap/RequestTypeTag";

type Props = {
  request: SwapRequest;
  fromUser: User;
  offeringListing: Listing | undefined;
  targetListing?: Listing;
  onAccept: () => void;
  onDecline: () => void;
};

export function IncomingRequestRow({
  request,
  fromUser,
  offeringListing,
  targetListing,
  onAccept,
  onDecline,
}: Props) {
  const requestType = resolveRequestType(request);
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
      <div className="absolute right-4 top-3 flex flex-wrap items-center justify-end gap-1.5">
        <RequestTypeTag requestType={requestType} />
        <span className="rounded-full border-[2px] border-[var(--ink)] px-3 py-0.5 text-xs">
          {statusLabel}
        </span>
      </div>
      <div className="flex items-start gap-4">
        <Link href={`/profile/${fromUser.id}`}>
          <Avatar name={fromUser.name} source={fromUser.avatar} />
        </Link>
        <div className="min-w-0 flex-1 space-y-1.5 pt-1">
          <Link href={`/profile/${fromUser.id}`} className="text-lg leading-tight hover:underline">
            {fromUser.name}
          </Link>
          {requestType === "pay" ? (
            <div className="text-sm leading-snug text-[var(--ink-muted)]">
              Pay request
              {targetListing?.price !== undefined
                ? ` · ${formatPrice(targetListing.price)}`
                : ""}
            </div>
          ) : offeringListing ? (
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
              &ldquo;{request.message}&rdquo;
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
