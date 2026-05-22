"use client";

import Link from "next/link";
import { Avatar } from "@/components/ui/Avatar";
import { Chip } from "@/components/ui/Chip";
import { SketchCard, seedFrom } from "@/components/ui/SketchCard";
import type { User } from "@/lib/auth/types";
import { formatListingDate, formatPrice, formatYearLabel } from "@/lib/data/format";
import type { Listing } from "@/lib/data/types";
import { ListingMenu } from "@/components/swap/ListingMenu";
import { ListingStatusTag } from "@/components/swap/ListingStatusTag";
import { ListingTypeTag } from "@/components/swap/ListingTypeTag";
import { listingRequestCta } from "@/lib/data/listingType";

type Props = {
  listing: Listing;
  owner: User;
  memberUsers?: User[];
  onRequest?: () => void;
  onPress?: () => void;
  disabled?: boolean;
  disabledLabel?: string;
  hideInterests?: boolean;
  /** On a college page — use date as the headline instead of repeating the college name. */
  hideCollege?: boolean;
  requestLabel?: string;
};

export function ListingCard({
  listing,
  owner,
  memberUsers = [],
  onRequest,
  onPress,
  disabled,
  disabledLabel,
  hideInterests,
  hideCollege,
  requestLabel,
}: Props) {
  const ctaLabel = requestLabel ?? listingRequestCta(listing.listingType);
  const profileLine = [
    formatYearLabel(owner.year) || owner.year || formatYearLabel(listing.year) || listing.year,
    owner.role || listing.role,
  ]
    .filter(Boolean)
    .join(" · ");

  const seatsLabel =
    listing.seatsAvailable === 0
      ? "Group full"
      : `${listing.seatsAvailable} ${listing.seatsAvailable === 1 ? "seat" : "seats"} left`;

  return (
    <SketchCard
      seed={seedFrom(listing.id)}
      className={`flex h-full min-h-[16.8rem] flex-col gap-4 overflow-hidden p-6 sm:min-h-[20.4rem]${onPress ? " cursor-pointer transition-transform hover:scale-[1.01]" : ""}`}
      onClick={onPress}
    >
      <header className="shrink-0 min-w-0">
        <div className="flex flex-wrap items-start gap-2">
          <h3 className="line-clamp-3 min-w-0 flex-1 break-words font-display text-[2.31rem] uppercase leading-tight tracking-wide">
            {hideCollege ? formatListingDate(listing.dateTime) : listing.college}
          </h3>
          <ListingTypeTag listingType={listing.listingType} />
        </div>
        <div className="mt-2 truncate text-[0.924rem] text-[var(--ink-muted)]">
          {hideCollege ? (
            <>
              Group of {listing.groupSize} · {seatsLabel}
              {listing.price !== undefined ? ` · ${formatPrice(listing.price)}` : ""}
            </>
          ) : (
            <>
              {formatListingDate(listing.dateTime)} · Group of {listing.groupSize} ·{" "}
              {seatsLabel}
              {listing.price !== undefined ? ` · ${formatPrice(listing.price)}` : ""}
            </>
          )}
        </div>
      </header>

      <div className="flex shrink-0 items-center gap-4 pt-2">
        <Link href={`/profile/${owner.id}`} onClick={(e) => e.stopPropagation()}>
          <Avatar name={owner.name} size="xl" source={owner.avatar} />
        </Link>
        <div className="min-w-0">
          <Link href={`/profile/${owner.id}`} onClick={(e) => e.stopPropagation()} className="block truncate text-[1.386rem] leading-tight hover:underline">
            {owner.name.split(" ")[0]}
          </Link>
          <div className="truncate text-[0.924rem] text-[var(--ink-soft)]">
            {profileLine ||
              [owner.college, formatYearLabel(owner.year) || owner.year]
                .filter(Boolean)
                .join(" · ")}
          </div>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 w-full min-w-0 flex-col gap-4 overflow-x-hidden overflow-y-auto overscroll-contain py-3">
        {!hideInterests && owner.interests.length > 0 && (
          <div className="flex w-full min-w-0 flex-wrap gap-2">
            {owner.interests.map((tag) => (
              <Chip
                key={tag}
                size="md"
                as="span"
                className="!text-[0.539rem]"
              >
                {tag}
              </Chip>
            ))}
          </div>
        )}

        <ListingMenu
          menu={listing.menu}
          menuPdfUrl={listing.menuPdfUrl}
          menuFileContentType={listing.menuFileContentType}
          className="line-clamp-4 break-words text-pretty text-[0.924rem] text-[var(--ink-muted)]"
          textClassName="line-clamp-4"
        />

        {listing.message ? (
          <p className="line-clamp-6 break-words text-pretty text-[0.924rem] italic text-[var(--ink-muted)]">
            &ldquo;{listing.message}&rdquo;
          </p>
        ) : null}
      </div>

      {memberUsers.length > 0 && (
        <div className="flex shrink-0 items-center gap-1.5">
          <span className="text-[0.77rem] text-[var(--ink-soft)]">Dining with:</span>
          <div className="flex flex-wrap -space-x-1.5">
            {memberUsers.map((m) => (
              <Link key={m.id} href={`/profile/${m.id}`} title={m.name} onClick={(e) => e.stopPropagation()}>
                <Avatar name={m.name} size="sm" source={m.avatar} />
              </Link>
            ))}
          </div>
        </div>
      )}

      <div className="flex shrink-0 justify-center pt-4" onClick={(e) => e.stopPropagation()}>
        {listing.status === "expired" ||
        listing.status === "confirmed" ||
        listing.status === "closed" ? (
          <ListingStatusTag
            status={listing.status}
            seatsAvailable={listing.seatsAvailable}
            size="md"
          />
        ) : disabled ? (
          <button
            type="button"
            disabled
            className="cursor-not-allowed rounded-full border-[2px] border-[var(--ink)] bg-[color-mix(in_srgb,var(--accent)_50%,var(--bg))] px-8 py-3 text-[0.77rem] text-white opacity-70"
          >
            {disabledLabel ?? ctaLabel}
          </button>
        ) : (
          <button
            type="button"
            onClick={onRequest}
            className="rounded-full bg-[var(--accent)] px-8 py-3 text-[0.77rem] text-white transition-colors hover:bg-[var(--accent-hover)]"
          >
            {ctaLabel}
          </button>
        )}
      </div>
    </SketchCard>
  );
}
