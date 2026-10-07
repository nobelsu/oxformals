"use client";

import { formatYearRole } from "@/lib/data/roles";
import Link from "next/link";
import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { BioText } from "@/components/profile/BioText";
import { ShareButton } from "@/components/share/ShareButton";
import { CreditDisputeLink } from "@/components/credits/CreditDisputeLink";
import {
  GuestCountLabel,
  ReleaseGuestSeatButton,
  guestCountFor,
} from "@/components/swap/GuestSeatsNote";
import { Avatar } from "@/components/ui/Avatar";
import { Modal } from "@/components/ui/Modal";
import { ListingGroupChatButton } from "@/components/chat/ListingGroupChatButton";
import { MessageUserButton } from "@/components/chat/MessageUserButton";
import { ReviewFormalSection } from "@/components/colleges/ReviewFormalSection";
import { ListingFormalBadges } from "@/components/colleges/ListingFormalBadges";
import { ConfirmAttendanceIndicator } from "@/components/colleges/ConfirmAttendanceIndicator";
import { RateFormalIndicator } from "@/components/colleges/RateFormalIndicator";
import { ListingMenu } from "@/components/swap/ListingMenu";
import { ListingStatusTag } from "@/components/swap/ListingStatusTag";
import { ListingTypeTag } from "@/components/swap/ListingTypeTag";
import { FormalTypeTag } from "@/components/swap/FormalTypeTag";
import { useAuth } from "@/components/auth/useAuth";
import { useData } from "@/components/data/useData";
import { HostListingControls, RemoveMemberButton } from "@/components/swap/HostListingControls";
import { IncomingRequests } from "@/components/swap/IncomingRequests";
import { pendingIncomingRequestsForListing } from "@/lib/data/requestFilters";
import type { Id } from "@/convex/_generated/dataModel";
import {
  formatListingMetaLine,
} from "@/lib/data/format";
import { listingRequestCta } from "@/lib/data/listingType";
import type { User } from "@/lib/auth/types";
import type { Listing } from "@/lib/data/types";
import {
  isGuestForCollegeListing,
  listingIsPast,
} from "@/lib/data/collegeReviewEligibility";
import { useNowMs } from "@/lib/hooks/useNowMs";
import { listingShareText } from "@/lib/share/format";

type Props = {
  open: boolean;
  onClose: () => void;
  listing: Listing | null;
  owner: User | null;
  memberUsers?: User[];
  onRequest?: () => void;
  disabled?: boolean;
  disabledLabel?: string;
};

export function ListingDetailModal({
  open,
  onClose,
  listing,
  owner,
  memberUsers = [],
  onRequest,
  disabled,
  disabledLabel,
}: Props) {
  const { user, isAuthenticated } = useAuth();
  const nowMs = useNowMs();
  const { requests } = useData();
  // Which tab the host picked, remembered per listing.
  const [picked, setPicked] = useState<{
    listingId: string;
    tab: "details" | "requests";
  } | null>(null);

  const reviewState = useQuery(
    api.collegeReviews.getListingReviewState,
    listing && isAuthenticated
      ? {
          listingId: listing.id as Id<"listings">,
          nowMs,
        }
      : "skip",
  );

  if (!listing || !owner) return null;

  const showMessage =
    isAuthenticated && user && user.id !== listing.ownerUserId;

  const isListingMember =
    isAuthenticated && user && listing.members.includes(user.id);

  const isGuestMember =
    isListingMember && isGuestForCollegeListing(user, listing.college);

  const profileLine = [
    owner.college,
    formatYearRole(owner.year, owner.role || listing.role),
  ]
    .filter(Boolean)
    .join(" · ");

  const isPast = listingIsPast(listing.dateTime, nowMs);

  // Hosts get their requests in the popup; it opens there when some are waiting.
  const isHost = !!(isAuthenticated && user && user.id === listing.ownerUserId);
  const pendingCount = isHost
    ? pendingIncomingRequestsForListing(requests, user.id, listing.id).length
    : 0;
  // Hosts always get the bar (edit, delete); requests only matter before the night.
  const showTabs = isHost;
  const tab = !showTabs || isPast
    ? "details"
    : picked?.listingId === listing.id
      ? picked.tab
      : pendingCount > 0
        ? "requests"
        : "details";
  const tabCls = (on: boolean) =>
    `-mb-[1.5px] cursor-pointer border-b-[2.5px] py-2 text-sm transition-colors ${
      on
        ? "border-[var(--ink)] font-bold text-[var(--ink)]"
        : "border-transparent text-[var(--ink-muted)] hover:text-[var(--ink)]"
    }`;
  const canConfirmAttendance = !!(
    isListingMember &&
    reviewState?.canConfirmAttendance &&
    !reviewState.hasConfirmedAttendance
  );
  const canRate = !!(isGuestMember && reviewState?.canReview);

  const allMembers = [owner, ...memberUsers.filter((m) => m.id !== owner.id)];
  const ctaLabel = listingRequestCta(listing.listingType);

  return (
    <Modal
      open={open}
      onClose={onClose}
      panelClassName="max-w-lg max-h-[85vh]"
    >
      <div className="flex flex-col gap-5">
        <header className="shrink-0">
          <div className="flex items-start gap-3">
          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-3 gap-y-2">
            <h2 className="font-display text-3xl uppercase leading-none tracking-wide">
              {listing.college}
            </h2>
            <ListingTypeTag listingType={listing.listingType} />
            <ListingFormalBadges
              isPast={isPast}
              showCompleted={!isGuestMember}
            />
            {!isPast &&
            (listing.status === "expired" ||
              listing.status === "confirmed" ||
              listing.status === "closed") ? (
              <ListingStatusTag
                status={listing.status}
                seatsAvailable={listing.seatsAvailable}
              />
            ) : null}
          </div>
          {!isPast ? (
            <ShareButton
              kind="listing"
              id={listing.id}
              text={listingShareText(listing)}
              className="flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-full border-[2px] border-[var(--ink)] hover:bg-[color-mix(in_srgb,var(--ink)_6%,transparent)]"
            />
          ) : null}
          </div>
          <p className="mt-2 text-sm text-[var(--ink-muted)]">
            {formatListingMetaLine({
              dateTime: listing.dateTime,
              groupSize: listing.groupSize,
              seatsAvailable: listing.seatsAvailable,
              isPast,
              price: listing.price,
            })}
            {" · "}
            <FormalTypeTag formalType={listing.formalType} className="align-[-2px]" />
          </p>
          {canConfirmAttendance && isPast ? (
            <div className="mt-2 flex justify-end">
              <ConfirmAttendanceIndicator />
            </div>
          ) : canRate && isPast ? (
            <div className="mt-2 flex justify-end">
              <RateFormalIndicator />
            </div>
          ) : null}
          {isListingMember && isPast ? (
            <div className="mt-2 flex flex-col">
              <CreditDisputeLink listingId={listing.id} />
            </div>
          ) : null}
        </header>

        {showTabs ? (
          <div className="flex shrink-0 items-center gap-5 border-b-[1.5px] border-[color-mix(in_srgb,var(--ink)_12%,transparent)]">
            <button
              type="button"
              className={tabCls(tab === "details")}
              onClick={() => setPicked({ listingId: listing.id, tab: "details" })}
            >
              Details
            </button>
            {!isPast ? (
              <button
                type="button"
                className={tabCls(tab === "requests")}
                onClick={() => setPicked({ listingId: listing.id, tab: "requests" })}
              >
                Requests{pendingCount > 0 ? ` · ${pendingCount}` : ""}
              </button>
            ) : null}
            <span className="ml-auto pb-1.5">
              <HostListingControls
                listing={listing}
                onViewRequests={() => setPicked({ listingId: listing.id, tab: "requests" })}
                onDeleted={onClose}
              />
            </span>
          </div>
        ) : null}

        {tab === "requests" ? (
          <IncomingRequests listing={listing} />
        ) : (
          <>
        <div className="flex shrink-0 items-center gap-4">
          <Link href={`/profile/${owner.id}`} onClick={onClose}>
            <Avatar name={owner.name} size="xl" source={owner.avatar} />
          </Link>
          <div className="min-w-0">
            <Link
              href={`/profile/${owner.id}`}
              onClick={onClose}
              className="block truncate text-lg leading-tight hover:underline"
            >
              {owner.name}
            </Link>
            {profileLine && (
              <div className="truncate text-sm text-[var(--ink-soft)]">
                {profileLine}
              </div>
            )}
          </div>
        </div>

        {allMembers.length > 0 && (
          <section className="shrink-0">
            <h3 className="font-display text-lg uppercase tracking-wide">
              Group members
            </h3>
            <div className="mt-2.5 flex flex-col gap-2">
              {allMembers.map((m) => {
                const isOwner = m.id === listing.ownerUserId;
                return (
                  <div key={m.id} className="flex items-center gap-2.5">
                    <Link href={`/profile/${m.id}`} onClick={onClose}>
                      <Avatar name={m.name} size="sm" source={m.avatar} />
                    </Link>
                    <div className="min-w-0 flex-1">
                      <Link
                        href={`/profile/${m.id}`}
                        onClick={onClose}
                        className="text-sm leading-tight hover:underline"
                      >
                        {m.name}
                      </Link>
                      {isOwner && (
                        <span className="ml-1 text-[0.65rem] text-[var(--ink-soft)]">
                          (host)
                        </span>
                      )}
                      <GuestCountLabel count={guestCountFor(listing.guestSeats, m.id)} />
                    </div>
                    {isHost && !isOwner ? (
                      <RemoveMemberButton listing={listing} member={m} />
                    ) : null}
                  </div>
                );
              })}
            </div>
            {user && !isPast ? (
              <div className="mt-2">
                <ReleaseGuestSeatButton
                  listingId={listing.id}
                  count={guestCountFor(listing.guestSeats, user.id)}
                />
              </div>
            ) : null}
            {isListingMember ? (
              <ListingGroupChatButton
                listingId={listing.id as Id<"listings">}
                memberCount={listing.members.length}
                className="mt-3 w-full text-xs"
              />
            ) : null}
          </section>
        )}

        <BioText bio={owner.bio ?? ""} userId={owner.id} canReport={false} />

        {listing.message && (
          <p className="min-h-0 overflow-y-auto text-sm italic text-[var(--ink-muted)]">
            &ldquo;{listing.message}&rdquo;
          </p>
        )}

        <ListingMenu
          menu={listing.menu}
          menuPdfUrl={listing.menuPdfUrl}
          menuFileContentType={listing.menuFileContentType}
        />

        {isListingMember || reviewState?.existingReview ? (
          <ReviewFormalSection listingId={listing.id} college={listing.college} />
        ) : null}

        <div className="flex shrink-0 flex-col items-center justify-center gap-2 pt-2 sm:flex-row">
          {showMessage ? (
            <MessageUserButton
              otherUserId={listing.ownerUserId as Id<"users">}
              onBeforeNavigate={onClose}
            />
          ) : null}
          {!isPast &&
          (listing.status === "expired" ||
            listing.status === "confirmed" ||
            listing.status === "closed") ? (
            <ListingStatusTag
              status={listing.status}
              seatsAvailable={listing.seatsAvailable}
              size="md"
            />
          ) : onRequest ? (
            disabled ? (
              <button
                type="button"
                disabled
                className="cursor-not-allowed rounded-full border-[2px] border-[var(--ink)] bg-[color-mix(in_srgb,var(--accent)_50%,var(--bg))] px-8 py-3 text-sm text-[var(--accent-ink)] opacity-70"
              >
                {disabledLabel ?? ctaLabel}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  onRequest();
                  onClose();
                }}
                className="rounded-full bg-[var(--accent)] px-8 py-3 text-sm text-[var(--accent-ink)] transition-colors hover:bg-[var(--accent-hover)]"
              >
                {ctaLabel}
              </button>
            )
          ) : null}
        </div>
          </>
        )}
      </div>
    </Modal>
  );
}
