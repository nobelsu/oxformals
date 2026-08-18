"use client";

import Link from "next/link";
import { Avatar } from "@/components/ui/Avatar";
import { Chip } from "@/components/ui/Chip";
import type { User } from "@/lib/auth/types";
import {
  clampSeatsAvailable,
  formatRowTail,
  formatListingTime,
  formatShortDate,
  formatYearLabel,
} from "@/lib/data/format";
import type { Listing } from "@/lib/data/types";
import { listingIsPast } from "@/lib/data/collegeReviewEligibility";
import { listingRequestCta } from "@/lib/data/listingType";
import { useNowMs } from "@/lib/hooks/useNowMs";
import { ListingMenu, hasListingMenu } from "@/components/swap/ListingMenu";
import { ListingStatusTag } from "@/components/swap/ListingStatusTag";
import { ListingTypeTag } from "@/components/swap/ListingTypeTag";
import { SeatPips } from "@/components/swap/SeatPips";

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
  /** Narrow contexts (the landing hero): no day rail, so the row states its own date. */
  compact?: boolean;
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
  compact = false,
}: Props) {
  const nowMs = useNowMs();
  const isPast = listingIsPast(listing.dateTime, nowMs);
  const ctaLabel = listingRequestCta(listing.listingType);

  // One clamped seat count feeds both the pips and the tail text so they
  // can never disagree, even on invalid data (negative seats, or seats
  // exceeding the group size from a stale cache or a race).
  const safeSeatsAvailable = clampSeatsAvailable(
    listing.seatsAvailable,
    listing.groupSize,
  );
  const rowTail = formatRowTail({
    seatsAvailable: safeSeatsAvailable,
    isPast,
    price: listing.price,
  });

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

  // A compact row with no button is just body + tag, so the tag sits beside the
  // body rather than in a full-width block beneath it.
  const hasAction = showStatusInsteadOfCta || !!disabled || !!onRequest;
  const compactTagOnly = compact && !hasAction;

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
      className={`flex gap-3 py-4 ${
        compactTagOnly
          ? "flex-row items-start"
          : compact
            ? "flex-col"
            : "flex-col sm:flex-row sm:items-start sm:gap-4"
      }${
        onPress
          ? " cursor-pointer transition-colors hover:bg-[color-mix(in_srgb,var(--paper)_70%,transparent)]"
          : ""
      }`}
    >
      <div className="min-w-0 flex-1">
        {compact ? (
          <div className="mb-0.5 flex items-baseline gap-2 text-[0.85rem] text-[var(--ink-muted)]">
            <span className="font-display text-[1.1rem] text-[var(--ink)]">
              {formatShortDate(listing.dateTime)}
            </span>
            <span>{formatListingTime(listing.dateTime)}</span>
          </div>
        ) : null}
        <h3 className="flex flex-wrap items-baseline gap-x-2 break-words font-display text-[1.4rem] uppercase leading-tight tracking-wide sm:text-[1.9rem]">
          {title ?? listing.college}
          {!compact ? (
            <>
              {/* Visually-hidden separator: the gap-x-2 flex gap keeps the
                  visual spacing, but adjacent text nodes otherwise run
                  together ("Worcester7:15pm") when copied or read by a
                  screen reader. */}
              <span className="sr-only"> </span>
              <span className="text-[1rem] normal-case tracking-normal text-[var(--ink-muted)]">
                {formatListingTime(listing.dateTime)}
              </span>
            </>
          ) : null}
        </h3>

        {!isPast || rowTail ? (
          <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1">
            {!isPast ? (
              <SeatPips
                total={listing.groupSize}
                taken={listing.groupSize - safeSeatsAvailable}
              />
            ) : null}
            {rowTail ? (
              <span className="text-[1rem] text-[var(--ink-muted)]">
                {rowTail}
              </span>
            ) : null}
          </div>
        ) : null}

        <div className="mt-2 flex flex-wrap items-center gap-2">
          <Link
            href={`/profile/${owner.id}`}
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
            className="flex items-center gap-2 hover:underline"
          >
            <Avatar name={owner.name} size="sm" source={owner.avatar} />
            <span className="text-[1.05rem]">{owner.name.split(" ")[0]}</span>
          </Link>
          {profileLine ? (
            <span className="text-[0.95rem] text-[var(--ink-soft)]">
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

        {hasListingMenu(listing.menu, listing.menuPdfUrl) ? (
          <div
            className="mt-2"
            // Only the file link needs to swallow the click/keydown before it
            // reaches the row's onPress (otherwise opening the menu file also
            // "selects" the row behind it). Scoped to the link itself rather
            // than the whole region so clicking plain menu text still presses
            // the row.
            onClick={(e) => {
              if ((e.target as HTMLElement).closest("a")) e.stopPropagation();
            }}
            onKeyDown={(e) => {
              if ((e.target as HTMLElement).closest("a")) e.stopPropagation();
            }}
          >
            <ListingMenu
              menu={listing.menu}
              menuPdfUrl={listing.menuPdfUrl}
              menuFileContentType={listing.menuFileContentType}
              className="break-words text-pretty text-[1rem] text-[var(--ink-muted)]"
              textClassName="line-clamp-2"
              imageClassName="mt-1 max-h-24 max-w-full rounded-[12px] border-[2px] border-[var(--ink)] object-contain"
            />
          </div>
        ) : null}

        {listing.message ? (
          <p className="mt-2 line-clamp-2 break-words text-pretty text-[1rem] italic text-[var(--ink-muted)]">
            &ldquo;{listing.message}&rdquo;
          </p>
        ) : null}

        {!hideInterests && owner.interests.length > 0 ? (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {owner.interests.map((tag) => (
              <Chip key={tag} size="sm" as="span" className="!text-[0.75rem]">
                {tag}
              </Chip>
            ))}
          </div>
        ) : null}
      </div>

      <div
        className={
          compactTagOnly
            ? "flex shrink-0 flex-row items-center gap-2"
            : compact
              ? "flex w-full shrink-0 flex-row items-center gap-2"
              : "flex shrink-0 flex-row items-center gap-2 sm:flex-col sm:items-end"
        }
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
      >
        <ListingTypeTag listingType={listing.listingType} />
        {showStatusInsteadOfCta ? (
          <ListingStatusTag
            status={listing.status}
            seatsAvailable={safeSeatsAvailable}
            size="sm"
          />
        ) : disabled ? (
          <button
            type="button"
            disabled
            className={`cursor-not-allowed whitespace-nowrap rounded-full border-[2px] border-[var(--ink)] bg-[color-mix(in_srgb,var(--accent)_50%,var(--bg))] px-5 py-2 text-[0.875rem] text-[var(--accent-ink)] opacity-70${
              compact ? " flex-1" : ""
            }`}
          >
            {disabledLabel ?? ctaLabel}
          </button>
        ) : onRequest ? (
          <button
            type="button"
            onClick={onRequest}
            className={`whitespace-nowrap rounded-full bg-[var(--accent)] px-5 py-2 text-[0.875rem] text-[var(--accent-ink)] transition-colors hover:bg-[var(--accent-hover)]${
              compact ? " flex-1" : ""
            }`}
          >
            {ctaLabel}
          </button>
        ) : null}
      </div>
    </div>
  );
}
