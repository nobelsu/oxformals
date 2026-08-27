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
import { FormalTypeTag } from "@/components/swap/FormalTypeTag";
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
  /**
   * Vertical alignment of the action column against the content. "start"
   * (default) suits dense flat lists; "center" balances the taller card
   * blocks used by the browse feed so the CTA doesn't float at the top.
   */
  align?: "start" | "center";
  /**
   * "Header band" card layout (browse + feed): a washed college/date band over
   * a padded body of seats, menu, host and CTA. Renders the inner content only
   * — the caller supplies the rounded, overflow-clipped card chrome.
   */
  card?: boolean;
};

export function ListingRow({
  listing,
  owner,
  memberUsers = [],
  onRequest,
  onPress,
  disabled,
  hideInterests,
  title,
  compact = false,
  align = "start",
  card = false,
}: Props) {
  const nowMs = useNowMs();
  const isPast = listingIsPast(listing.dateTime, nowMs);
  const ctaLabel = listingRequestCta(listing.listingType);
  // Card rows (align="center") are taller, so spread the inner blocks more to
  // fill the space instead of clustering at the top.
  const spacious = align === "center";

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
    owner.subject,
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

  // "Split rail" card layout — Variant B: content on the left, a tags + CTA
  // rail on the right. Renders inner content only; the caller (browse day-list
  // / feed row) provides the rounded, clipped card chrome.
  if (card) {
    const rail = (
      <span
        className="flex shrink-0 flex-col items-end justify-between gap-3 self-stretch"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
      >
        <span className="flex flex-col items-end gap-1.5">
          <ListingTypeTag listingType={listing.listingType} />
          <FormalTypeTag formalType={listing.formalType} />
        </span>
        {showStatusInsteadOfCta ? (
          <ListingStatusTag
            status={listing.status}
            seatsAvailable={safeSeatsAvailable}
            size="sm"
          />
        ) : disabled ? null : onRequest ? (
          <button
            type="button"
            onClick={onRequest}
            className="whitespace-nowrap rounded-full bg-[var(--accent)] px-6 py-2.5 text-[0.95rem] font-semibold text-[var(--accent-ink)] transition-colors hover:bg-[var(--accent-hover)]"
          >
            {ctaLabel}
          </button>
        ) : null}
      </span>
    );

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
        className={`flex gap-4 px-5 py-4 sm:px-6 sm:py-5 ${
          onPress
            ? "cursor-pointer transition-colors hover:bg-[color-mix(in_srgb,var(--ink)_3%,transparent)]"
            : ""
        }`}
      >
        {/* Left content */}
        <div className="flex min-w-0 flex-1 flex-col gap-3">
          <div className="flex flex-wrap items-baseline gap-x-2.5">
            <h3 className="break-words font-display text-[1.6rem] uppercase leading-none tracking-wide sm:text-[1.9rem]">
              {title ?? listing.college}
            </h3>
            <span className="text-[0.95rem] font-medium text-[var(--ink-muted)]">
              {formatListingTime(listing.dateTime)}
            </span>
          </div>

          {!isPast ? (
            <span className="inline-flex items-center gap-2">
              <SeatPips
                total={listing.groupSize}
                taken={listing.groupSize - safeSeatsAvailable}
              />
              {rowTail ? (
                <span className="text-[0.95rem] text-[var(--ink-muted)]">
                  {rowTail}
                </span>
              ) : null}
            </span>
          ) : rowTail ? (
            <span className="text-[0.95rem] text-[var(--ink-muted)]">
              {rowTail}
            </span>
          ) : null}

          {listing.menu ? (
            <p className="line-clamp-1 break-words text-[0.9rem] text-[var(--ink-muted)]">
              <span className="text-[0.68rem] font-semibold uppercase tracking-[0.08em] text-[var(--ink-soft)]">
                On the menu{" "}
              </span>
              {listing.menu}
            </p>
          ) : null}

          <Link
            href={`/profile/${owner.id}`}
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
            className="mt-auto flex min-w-0 items-center gap-2.5 pt-1 hover:underline"
          >
            <Avatar name={owner.name} size="md" source={owner.avatar} />
            <span className="flex min-w-0 flex-col">
              <span className="truncate font-semibold">
                {owner.name.split(" ")[0]}
              </span>
              {profileLine ? (
                <span className="truncate text-[0.85rem] text-[var(--ink-soft)]">
                  {profileLine}
                </span>
              ) : null}
            </span>
          </Link>
        </div>

        {rail}
      </div>
    );
  }

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
      className={`flex gap-3 ${spacious ? "py-0" : "py-4"} ${
        compactTagOnly ? "flex-row items-start" : "flex-col"
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
        {compact ? (
          <h3 className="flex flex-wrap items-baseline gap-x-2 break-words font-display text-[1.4rem] uppercase leading-tight tracking-wide sm:text-[1.9rem]">
            {title ?? listing.college}
          </h3>
        ) : (
          <div className="flex items-start justify-between gap-3">
            <h3 className="flex flex-wrap items-baseline gap-x-2 break-words font-display text-[1.4rem] uppercase leading-tight tracking-wide sm:text-[1.9rem]">
              {title ?? listing.college}
              {/* Visually-hidden separator: the gap-x-2 flex gap keeps the
                  visual spacing, but adjacent text nodes otherwise run
                  together ("Worcester7:15pm") when copied or read by a
                  screen reader. */}
              <span className="sr-only"> </span>
              <span className="text-[1rem] normal-case tracking-normal text-[var(--ink-muted)]">
                {formatListingTime(listing.dateTime)}
              </span>
            </h3>
            <span
              className="mt-1 shrink-0"
              onClick={(e) => e.stopPropagation()}
              onKeyDown={(e) => e.stopPropagation()}
            >
              <ListingTypeTag listingType={listing.listingType} />
            </span>
          </div>
        )}

        <div
          className={`${
            spacious ? "mt-2" : "mt-1.5"
          } flex flex-wrap items-center gap-x-2 gap-y-1`}
        >
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
          <FormalTypeTag formalType={listing.formalType} />
        </div>

        <div
          className={`${
            spacious ? "mt-2.5" : "mt-2"
          } flex flex-wrap items-center gap-2`}
        >
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
            className={spacious ? "mt-2.5" : "mt-2"}
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
          <p
            className={`${
              spacious ? "mt-2.5" : "mt-2"
            } line-clamp-2 break-words text-pretty text-[1rem] italic text-[var(--ink-muted)]`}
          >
            &ldquo;{listing.message}&rdquo;
          </p>
        ) : null}

        {!hideInterests && owner.interests.length > 0 ? (
          <div className={`${spacious ? "mt-2.5" : "mt-2"} flex flex-wrap gap-1.5`}>
            {owner.interests.map((tag) => (
              <Chip key={tag} size="sm" as="span" className="!text-[0.75rem]">
                {tag}
              </Chip>
            ))}
          </div>
        ) : null}
      </div>

      {compact ? (
        <div
          className={
            compactTagOnly
              ? "flex shrink-0 flex-row items-center gap-2"
              : "flex w-full shrink-0 flex-row items-center gap-2"
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
          ) : disabled ? null : onRequest ? (
            <button
              type="button"
              onClick={onRequest}
              className="flex-1 whitespace-nowrap rounded-full bg-[var(--accent)] px-5 py-2 text-[0.875rem] text-[var(--accent-ink)] transition-colors hover:bg-[var(--accent-hover)]"
            >
              {ctaLabel}
            </button>
          ) : null}
        </div>
      ) : showStatusInsteadOfCta || (!disabled && onRequest) ? (
        <div
          className={`flex justify-end ${spacious ? "mt-2" : ""}`}
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => e.stopPropagation()}
        >
          {showStatusInsteadOfCta ? (
            <ListingStatusTag
              status={listing.status}
              seatsAvailable={safeSeatsAvailable}
              size="sm"
            />
          ) : (
            <button
              type="button"
              onClick={onRequest}
              className="whitespace-nowrap rounded-full bg-[var(--accent)] px-5 py-2 text-[0.875rem] text-[var(--accent-ink)] transition-colors hover:bg-[var(--accent-hover)]"
            >
              {ctaLabel}
            </button>
          )}
        </div>
      ) : null}
    </div>
  );
}
