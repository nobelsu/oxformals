"use client";

import Link from "next/link";
import { Avatar } from "@/components/ui/Avatar";
import { SketchCard, seedFrom } from "@/components/ui/SketchCard";
import type { User } from "@/lib/auth/types";
import { formatListingDate, formatPrice, formatRelativeTime } from "@/lib/data/format";
import { ListingTag } from "@/components/swap/ListingTag";
import type { Listing, SwapRequest } from "@/lib/data/types";
import { resolveRequestType } from "@/lib/data/requestFilters";
import { MessageUserButton } from "@/components/chat/MessageUserButton";
import { RequestMessage } from "@/components/swap/RequestMessage";
import { RequestTypeTag } from "@/components/swap/RequestTypeTag";
import type { Id } from "@/convex/_generated/dataModel";

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
      className="p-4 sm:p-6"
    >
      <div className="flex items-start gap-3 sm:gap-4">
        <Link href={`/profile/${fromUser.id}`} className="shrink-0">
          <Avatar name={fromUser.name} source={fromUser.avatar} />
        </Link>
        <div className="min-w-0 flex-1 space-y-1.5">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
            <Link
              href={`/profile/${fromUser.id}`}
              className="min-w-0 text-lg leading-tight hover:underline break-words"
            >
              {fromUser.name}
            </Link>
            <div className="flex shrink-0 flex-wrap items-center gap-1.5">
              <RequestTypeTag requestType={requestType} />
              <ListingTag className="whitespace-nowrap">{statusLabel}</ListingTag>
            </div>
          </div>
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
          {request.message ? <RequestMessage message={request.message} /> : null}
          <p className="text-xs leading-relaxed text-[var(--ink-soft)]">
            Sent {formatRelativeTime(request.createdAt)}
          </p>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-2 justify-start">
        <MessageUserButton
          otherUserId={fromUser.id as Id<"users">}
          label="Message"
          className="rounded-full border-[2px] border-[var(--ink)] px-4 py-1 text-sm transition-colors hover:bg-[var(--ink)] hover:text-[var(--bg)]"
        />
        {isPending ? (
          <>
            <button
              type="button"
              onClick={onAccept}
              className="rounded-full bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--accent-ink)] px-4 py-1 text-sm"
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
          </>
        ) : null}
      </div>
    </SketchCard>
  );
}
