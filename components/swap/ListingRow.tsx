"use client";

import Link from "next/link";
import { Avatar } from "@/components/ui/Avatar";
import { Chip } from "@/components/ui/Chip";
import type { User } from "@/lib/auth/types";
import {
  formatListingRowMeta,
  formatListingTime,
  formatYearLabel,
} from "@/lib/data/format";
import type { Listing } from "@/lib/data/types";
import { listingIsPast } from "@/lib/data/collegeReviewEligibility";
import { listingRequestCta } from "@/lib/data/listingType";
import { useNowMs } from "@/lib/hooks/useNowMs";
import { ListingMenu } from "@/components/swap/ListingMenu";
import { ListingStatusTag } from "@/components/swap/ListingStatusTag";
import { ListingTypeTag } from "@/components/swap/ListingTypeTag";

type Props = {
  listing: Listing;
  owner: User;
  memberUsers?: User[];
  onRequest?: () => void;
  onPress?: () => void;
  disabled?: boolean;
  disabledLabel?: string;
  hideInterests?: boolean;
  /** Headline override — the college page uses the host's name instead. */
  title?: string;
  requestLabel?: string;
};

export function ListingRow({
  listing,
  owner,
  memberUsers = [],
  onRequest,
  onPress,
  disabled,
  disabledLabel,
  hideInterests,
  title,
  requestLabel,
}: Props) {
  const nowMs = useNowMs();
  const isPast = listingIsPast(listing.dateTime, nowMs);
  const ctaLabel = requestLabel ?? listingRequestCta(listing.listingType);

  const yearRoleLine = [
    formatYearLabel(owner.year) || formatYearLabel(listing.year),
    owner.role || listing.role,
  ]
    .filter(Boolean)
    .join(" · ");
  // A host with neither a year nor a role still gets an identifying line.
  const profileLine =
    yearRoleLine ||
    [owner.college, formatYearLabel(owner.year)].filter(Boolean).join(" · ");

  const showStatusInsteadOfCta =
    listing.status === "expired" ||
    listing.status === "confirmed" ||
    listing.status === "closed";

  return (
    <div
      role={onPress ? "button" : undefined}
      tabIndex={onPress ? 0 : undefined}
      aria-label={
        onPress
          ? `${title ?? listing.college} · ${formatListingTime(listing.dateTime)}`
          : undefined
      }
      onClick={onPress}
      onKeyDown={
        onPress
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onPress();
              }
            }
          : undefined
      }
      className={`flex flex-col gap-3 py-4 sm:flex-row sm:items-start sm:gap-4${
        onPress
          ? " cursor-pointer transition-colors hover:bg-[color-mix(in_srgb,var(--paper)_70%,transparent)]"
          : ""
      }`}
    >
      <div className="shrink-0 pt-0.5 text-[0.95rem] text-[var(--ink-muted)] sm:w-[4.5rem]">
        {formatListingTime(listing.dateTime)}
      </div>

      <div className="min-w-0 flex-1">
        <h3 className="break-words font-display text-[1.4rem] uppercase leading-tight tracking-wide sm:text-[1.65rem]">
          {title ?? listing.college}
        </h3>

        <div className="mt-1 text-[0.9rem] text-[var(--ink-muted)]">
          {formatListingRowMeta({
            groupSize: listing.groupSize,
            seatsAvailable: listing.seatsAvailable,
            isPast,
            price: listing.price,
          })}
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-2">
          <Link
            href={`/profile/${owner.id}`}
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
            className="flex items-center gap-2 hover:underline"
          >
            <Avatar name={owner.name} size="sm" source={owner.avatar} />
            <span className="text-[0.95rem]">{owner.name.split(" ")[0]}</span>
          </Link>
          {profileLine ? (
            <span className="text-[0.85rem] text-[var(--ink-soft)]">
              {profileLine}
            </span>
          ) : null}
          {memberUsers.length > 0 ? (
            <span className="flex items-center gap-1.5">
              <span className="text-[0.8rem] text-[var(--ink-soft)]">with</span>
              <span className="flex flex-wrap -space-x-1.5">
                {memberUsers.map((m) => (
                  <Link
                    key={m.id}
                    href={`/profile/${m.id}`}
                    title={m.name}
                    onClick={(e) => e.stopPropagation()}
                    onKeyDown={(e) => e.stopPropagation()}
                  >
                    <Avatar name={m.name} size="sm" source={m.avatar} />
                  </Link>
                ))}
              </span>
            </span>
          ) : null}
        </div>

        <span
          className="mt-2 block"
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => e.stopPropagation()}
        >
          <ListingMenu
            menu={listing.menu}
            menuPdfUrl={listing.menuPdfUrl}
            menuFileContentType={listing.menuFileContentType}
            className="break-words text-pretty text-[0.9rem] text-[var(--ink-muted)]"
            textClassName="line-clamp-2"
            imageClassName="mt-1 max-h-24 max-w-full rounded-[12px] border-[2px] border-[var(--ink)] object-contain"
          />
        </span>

        {listing.message ? (
          <p className="mt-2 line-clamp-2 break-words text-pretty text-[0.9rem] italic text-[var(--ink-muted)]">
            &ldquo;{listing.message}&rdquo;
          </p>
        ) : null}

        {!hideInterests && owner.interests.length > 0 ? (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {owner.interests.map((tag) => (
              <Chip key={tag} size="sm" as="span" className="!text-[0.65rem]">
                {tag}
              </Chip>
            ))}
          </div>
        ) : null}
      </div>

      <div
        className="flex shrink-0 flex-row items-center gap-2 sm:flex-col sm:items-end"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
      >
        <ListingTypeTag listingType={listing.listingType} />
        {showStatusInsteadOfCta ? (
          <ListingStatusTag
            status={listing.status}
            seatsAvailable={listing.seatsAvailable}
            size="sm"
          />
        ) : disabled ? (
          <button
            type="button"
            disabled
            className="cursor-not-allowed whitespace-nowrap rounded-full border-[2px] border-[var(--ink)] bg-[color-mix(in_srgb,var(--accent)_50%,var(--bg))] px-5 py-2 text-[0.75rem] text-white opacity-70"
          >
            {disabledLabel ?? ctaLabel}
          </button>
        ) : onRequest ? (
          <button
            type="button"
            onClick={onRequest}
            className="whitespace-nowrap rounded-full bg-[var(--accent)] px-5 py-2 text-[0.75rem] text-white transition-colors hover:bg-[var(--accent-hover)]"
          >
            {ctaLabel}
          </button>
        ) : null}
      </div>
    </div>
  );
}
