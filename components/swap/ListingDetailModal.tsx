"use client";

import Link from "next/link";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Avatar } from "@/components/ui/Avatar";
import { Chip } from "@/components/ui/Chip";
import { Modal } from "@/components/ui/Modal";
import { ListingGroupChatButton } from "@/components/chat/ListingGroupChatButton";
import { MessageUserButton } from "@/components/chat/MessageUserButton";
import { ReviewFormalSection } from "@/components/colleges/ReviewFormalSection";
import { ListingFormalBadges } from "@/components/colleges/ListingFormalBadges";
import { ListingMenu } from "@/components/swap/ListingMenu";
import { ListingTypeTag } from "@/components/swap/ListingTypeTag";
import { useAuth } from "@/components/auth/useAuth";
import type { Id } from "@/convex/_generated/dataModel";
import { formatListingDate, formatPrice, formatYearLabel } from "@/lib/data/format";
import { listingRequestCta } from "@/lib/data/listingType";
import type { User } from "@/lib/auth/types";
import type { Listing } from "@/lib/data/types";
import {
  isGuestForCollegeListing,
  listingIsPast,
} from "@/lib/data/collegeReviewEligibility";
import { useNowMs } from "@/lib/hooks/useNowMs";

type Props = {
  open: boolean;
  onClose: () => void;
  listing: Listing | null;
  owner: User | null;
  memberUsers?: User[];
  onRequest?: () => void;
  disabled?: boolean;
  disabledLabel?: string;
  hideInterests?: boolean;
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
  hideInterests,
}: Props) {
  const { user, isAuthenticated } = useAuth();
  const nowMs = useNowMs();

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
    formatYearLabel(owner.year) || owner.year,
    owner.role || listing.role,
  ]
    .filter(Boolean)
    .join(" · ");

  const seatsLabel =
    listing.seatsAvailable === 0
      ? "Group full"
      : `${listing.seatsAvailable} ${listing.seatsAvailable === 1 ? "seat" : "seats"} left`;

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
          <div className="flex flex-wrap items-start justify-between gap-3">
            <h2 className="font-display text-3xl uppercase tracking-wide">
              {listing.college}
            </h2>
            <ListingTypeTag listingType={listing.listingType} />
            <ListingFormalBadges
              isPast={listingIsPast(listing.dateTime, nowMs)}
              canRate={!!(isGuestMember && reviewState?.canReview)}
            />
            {listing.status === "expired" ? (
              <span className="rounded-full border-[2px] border-[var(--ink)] px-3 py-0.5 text-xs">
                Past
              </span>
            ) : (listing.status === "confirmed" || listing.status === "closed") ? (
              <span className="rounded-full border-[2px] border-[var(--ink)] px-3 py-0.5 text-xs">
                {listing.seatsAvailable === 0 ? "Group full" : "Listing full"}
              </span>
            ) : null}
          </div>
          <p className="mt-1.5 text-sm text-[var(--ink-muted)]">
            {formatListingDate(listing.dateTime)} · Group of {listing.groupSize} · {seatsLabel}
            {listing.price !== undefined ? ` · ${formatPrice(listing.price)}` : ""}
          </p>
          <p className="mt-0.5 text-sm text-[var(--ink-soft)]">
            {[formatYearLabel(listing.year) || listing.year, listing.role]
              .filter(Boolean)
              .join(" · ")}
          </p>
        </header>

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
                    </div>
                  </div>
                );
              })}
            </div>
            {isListingMember ? (
              <ListingGroupChatButton
                listingId={listing.id as Id<"listings">}
                memberCount={listing.members.length}
                className="mt-3 w-full text-xs"
              />
            ) : null}
          </section>
        )}

        {!hideInterests && owner.interests.length > 0 && (
          <div className="flex min-w-0 flex-wrap gap-2">
            {owner.interests.map((tag) => (
              <Chip key={tag} size="md" as="span">
                {tag}
              </Chip>
            ))}
          </div>
        )}

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

        {isGuestMember || reviewState?.existingReview ? (
          <ReviewFormalSection listingId={listing.id} college={listing.college} />
        ) : null}

        <div className="flex shrink-0 flex-col items-center justify-center gap-2 pt-2 sm:flex-row">
          {showMessage ? (
            <MessageUserButton
              otherUserId={listing.ownerUserId as Id<"users">}
              onBeforeNavigate={onClose}
            />
          ) : null}
          {listing.status === "expired" ? (
            <span className="rounded-full border-[2px] border-[var(--ink)] bg-[var(--paper)] px-5 py-2 text-sm text-[var(--ink)]">
              Past
            </span>
          ) : listing.status === "confirmed" || listing.status === "closed" ? (
            <span className="rounded-full border-[2px] border-[var(--ink)] bg-[var(--paper)] px-5 py-2 text-sm text-[var(--ink)]">
              {listing.seatsAvailable === 0 ? "Group full" : "Listing full"}
            </span>
          ) : onRequest ? (
            disabled ? (
              <button
                type="button"
                disabled
                className="cursor-not-allowed rounded-full border-[2px] border-[var(--ink)] bg-[color-mix(in_srgb,var(--accent)_50%,var(--bg))] px-8 py-3 text-sm text-white opacity-70"
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
                className="rounded-full bg-[var(--accent)] px-8 py-3 text-sm text-white transition-colors hover:bg-[var(--accent-hover)]"
              >
                {ctaLabel}
              </button>
            )
          ) : null}
        </div>
      </div>
    </Modal>
  );
}
