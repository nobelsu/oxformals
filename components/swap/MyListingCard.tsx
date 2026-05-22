"use client";

import Link from "next/link";
import { useCallback, useState } from "react";
import { ListingGroupChatButton } from "@/components/chat/ListingGroupChatButton";
import { Avatar } from "@/components/ui/Avatar";
import {
  SketchCard,
  seedFrom,
  sketchCardBlockyHover,
} from "@/components/ui/SketchCard";
import type { User } from "@/lib/auth/types";
import { ListingFormalBadges } from "@/components/colleges/ListingFormalBadges";
import { ConfirmAttendanceIndicator } from "@/components/colleges/ConfirmAttendanceIndicator";
import { RateFormalIndicator } from "@/components/colleges/RateFormalIndicator";
import { ListingTypeTag } from "@/components/swap/ListingTypeTag";
import { formatListingMetaLine, formatYearLabel } from "@/lib/data/format";
import { ListingStatusTag } from "@/components/swap/ListingStatusTag";
import type { Id } from "@/convex/_generated/dataModel";
import type { Listing } from "@/lib/data/types";
import { listingIsPast } from "@/lib/data/collegeReviewEligibility";
import { useNowMs } from "@/lib/hooks/useNowMs";

type Props = {
  listing: Listing;
  pendingRequestCount: number;
  profile?: {
    year?: string;
    role?: string;
  };
  memberUsers?: User[];
  onViewRequests?: () => void;
  compact?: boolean;
  canRate?: boolean;
  canConfirmAttendance?: boolean;
  /** Skip group chat (e.g. UI preview listing with no Convex id). */
  hideGroupChat?: boolean;
  /** Omit completed badge (e.g. formals attended section). */
  showCompletedBadge?: boolean;
};

export function MyListingCard({
  listing,
  pendingRequestCount,
  profile,
  memberUsers = [],
  onViewRequests,
  compact = false,
  canRate = false,
  canConfirmAttendance = false,
  hideGroupChat = false,
  showCompletedBadge = true,
}: Props) {
  const [opening, setOpening] = useState(false);
  const nowMs = useNowMs();
  const isPast = listingIsPast(listing.dateTime, nowMs);

  const handleViewRequests = useCallback(() => {
    if (!onViewRequests || opening) return;
    setOpening(true);
    onViewRequests();
  }, [onViewRequests, opening]);

  const profileLine = [
    formatYearLabel(profile?.year || "") || profile?.year || formatYearLabel(listing.year) || listing.year,
    profile?.role || listing.role,
  ]
    .filter(Boolean)
    .join(" · ");

  const cardContent = (
    <>
      <header className="flex min-w-0 shrink-0 items-start justify-between gap-3">
        <h3 className="line-clamp-3 min-w-0 flex-1 break-words font-display text-3xl uppercase tracking-wide">
          {listing.college}
        </h3>
        <div className="flex shrink-0 flex-wrap items-center justify-end gap-1.5">
          <ListingTypeTag listingType={listing.listingType} />
          <ListingFormalBadges
            isPast={isPast}
            showCompleted={showCompletedBadge}
          />
          {!isPast ? (
            <ListingStatusTag
              status={listing.status}
              seatsAvailable={listing.seatsAvailable}
            />
          ) : null}
        </div>
      </header>

      <div className="shrink-0 truncate text-[var(--ink-muted)]">
        {formatListingMetaLine({
          dateTime: listing.dateTime,
          groupSize: listing.groupSize,
          seatsAvailable: listing.seatsAvailable,
          isPast,
          price: listing.price,
        })}
      </div>

      <div className="shrink-0 truncate text-sm text-[var(--ink-soft)]">
        {profileLine}
      </div>

      <div className={`${compact ? "mt-3" : "mt-auto"} flex shrink-0 flex-col gap-3`}>
        {(memberUsers.length > 0 ||
          (canConfirmAttendance && isPast) ||
          (canRate && isPast)) && (
          <div className="flex items-end justify-between gap-3">
            {memberUsers.length > 0 ? (
              <div className="flex min-w-0 flex-1 flex-col gap-2">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-[var(--ink-soft)]">Dining with:</span>
                  <div className="flex flex-wrap -space-x-1.5">
                    {memberUsers.map((m) => (
                      <Link
                        key={m.id}
                        href={`/profile/${m.id}`}
                        title={m.name}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Avatar name={m.name} size="sm" source={m.avatar} />
                      </Link>
                    ))}
                  </div>
                </div>
                {!hideGroupChat ? (
                  <ListingGroupChatButton
                    listingId={listing.id as Id<"listings">}
                    memberCount={listing.members.length}
                    className="w-fit text-xs"
                  />
                ) : null}
              </div>
            ) : (
              <span className="min-w-0 flex-1" />
            )}
            {canConfirmAttendance && isPast ? (
              <ConfirmAttendanceIndicator className="shrink-0 self-end" />
            ) : canRate && isPast ? (
              <RateFormalIndicator className="shrink-0 self-end" />
            ) : null}
          </div>
        )}

        {pendingRequestCount > 0 && (
          <div className="min-h-0 w-full shrink-0">
            <div className="inline-flex items-center gap-2 text-left text-sm leading-snug text-[var(--ink)]">
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                className="h-4 w-4 shrink-0"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M10.268 21a2 2 0 0 0 3.464 0" />
                <path d="M3.262 15.326A1 1 0 0 0 4 17h16a1 1 0 0 0 .738-1.674C19.41 13.855 18 12.148 18 8a6 6 0 1 0-12 0c0 4.148-1.41 5.855-2.738 7.326" />
              </svg>
              <span>
                {pendingRequestCount}{" "}
                {pendingRequestCount === 1 ? "update" : "updates"}
              </span>
            </div>
          </div>
        )}
      </div>
    </>
  );

  const openingOverlay = opening ? (
    <div className="fixed inset-0 z-[999] flex items-center justify-center bg-[color-mix(in_srgb,var(--bg)_86%,transparent)] backdrop-blur-[1px]">
      <span className="inline-flex items-center gap-3 rounded-full border-[2px] border-[var(--ink)] bg-[var(--bg)] px-6 py-3 text-base text-[var(--ink)] shadow-sm">
        <span
          aria-hidden="true"
          className="h-5 w-5 animate-spin rounded-full border-2 border-[var(--ink-soft)] border-t-[var(--ink)]"
        />
        Opening...
      </span>
    </div>
  ) : null;

  if (onViewRequests) {
    return (
      <>
        <div
          role="button"
          tabIndex={opening ? -1 : 0}
          onClick={opening ? undefined : handleViewRequests}
          onKeyDown={(e) => {
            if (opening) return;
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              handleViewRequests();
            }
          }}
          aria-disabled={opening}
          className={`group w-full text-left ${opening ? "cursor-progress" : "cursor-pointer"}`}
          aria-label={`View requests for ${listing.college}`}
        >
          <SketchCard
            seed={seedFrom(listing.id)}
            className={`flex flex-col gap-3 overflow-hidden p-5 ${sketchCardBlockyHover} ${compact ? "" : "h-full min-h-[13.2rem] sm:min-h-[15.6rem]"}`}
          >
            {cardContent}
          </SketchCard>
        </div>
        {openingOverlay}
      </>
    );
  }

  return (
    <>
      <SketchCard
        seed={seedFrom(listing.id)}
        className={`flex flex-col gap-3 overflow-hidden p-5 ${compact ? "" : "h-full min-h-[13.2rem] sm:min-h-[15.6rem]"}`}
      >
        {cardContent}
      </SketchCard>
      {openingOverlay}
    </>
  );
}
