"use client";

import { useMemo, type ReactNode } from "react";
import { SketchDot } from "@/components/ui/SketchDot";
import { seedFrom } from "@/components/ui/SketchCard";
import { formatDayLabel } from "@/lib/data/format";
import {
  groupListingsByDay,
  isDayGroupPast,
} from "@/lib/data/groupListingsByDay";
import type { Listing } from "@/lib/data/types";
import { useNowMs } from "@/lib/hooks/useNowMs";

type Props = {
  listings: Listing[];
  renderRow: (listing: Listing) => ReactNode;
  className?: string;
  /** Sticky offset + background for the mobile day header. Override inside a modal. */
  stickyClassName?: string;
  /**
   * "flat" (default): rows separated by dashed hairlines — used inside profiles,
   * pickers and college pages. "card": each listing is a distinct raised block
   * with its own border and spacing — the Luma-style browse feed.
   */
  variant?: "flat" | "card";
};

/**
 * Luma-style day rail: the date is stated once per day in the left gutter,
 * rows carry only the time. Below `sm` the gutter collapses into a sticky
 * full-width day header.
 *
 * Ordering is owned by this container: it always re-sorts `listings`
 * ascending by `dateTime` (via `groupListingsByDay`), so a caller-side sort
 * control would be silently overridden.
 */
export function ListingDayList({
  listings,
  renderRow,
  className = "",
  stickyClassName = "top-[var(--app-nav-height)] bg-[var(--bg)]",
  variant = "flat",
}: Props) {
  const isCard = variant === "card";
  const nowMs = useNowMs();
  const groups = useMemo(() => groupListingsByDay(listings), [listings]);

  // Render rows before deciding which groups to show: a group whose rows all
  // filter out to null (e.g. an owner lookup miss in CollegeListingsSection)
  // must not leave a dated header floating over an empty gutter. Listings and
  // owner data resolve from independent sources, so this window is real, not
  // hypothetical.
  const renderedGroups = groups
    .map((group) => {
      const rows = group.listings
        .map((listing) => {
          const content = renderRow(listing);
          return content ? { listing, content } : null;
        })
        .filter((row): row is NonNullable<typeof row> => row !== null);
      return { group, rows };
    })
    .filter((entry) => entry.rows.length > 0);

  if (renderedGroups.length === 0) return null;

  return (
    <div className={className}>
      {renderedGroups.map(({ group, rows }, groupIndex) => {
        const isLastGroup = groupIndex === renderedGroups.length - 1;
        const { day, weekday } = formatDayLabel(group.dateTime);
        const isPastDay = isDayGroupPast(group, nowMs);
        const dayInk = isPastDay ? "text-[var(--ink-soft)]" : "text-[var(--ink)]";

        return (
          <section
            key={group.dateKey}
            aria-label={`${weekday} ${day}`}
            className="sm:grid sm:grid-cols-[6rem_1fr]"
          >
            <div
              className={`sticky z-[2] py-3 sm:static sm:bg-transparent sm:pr-3 sm:pt-5 ${stickyClassName} ${dayInk}`}
            >
              <div className="flex items-baseline gap-2 sm:block">
                <div className="font-display text-[1.25rem] leading-tight">
                  {day}
                </div>
                <div className="text-[0.85rem] text-[var(--ink-soft)]">
                  {weekday}
                </div>
              </div>
            </div>

            <div
              className={`relative sm:border-l-2 sm:border-dashed sm:border-[color-mix(in_srgb,var(--ink)_28%,transparent)] sm:pl-6 ${
                isCard && !isLastGroup ? "pb-4 sm:pb-6" : ""
              }`}
            >
              <span
                className={`pointer-events-none absolute left-[-8px] top-6 hidden sm:block ${dayInk}`}
              >
                <SketchDot seed={seedFrom(group.dateKey)} />
              </span>

              <ul className={isCard ? "flex flex-col gap-3 sm:gap-4" : ""}>
                {rows.map(({ listing, content }) =>
                  isCard ? (
                    <li
                      key={listing.id}
                      className="overflow-hidden rounded-[22px] border-[1.5px] border-[color-mix(in_srgb,var(--ink)_14%,transparent)] bg-[var(--paper)] shadow-[0_2px_18px_-10px_rgba(0,0,0,0.18)] transition-[transform,box-shadow] duration-200 ease-out hover:-translate-y-0.5 hover:border-[color-mix(in_srgb,var(--ink)_22%,transparent)] hover:shadow-[0_18px_40px_-18px_rgba(0,0,0,0.28)]"
                    >
                      {content}
                    </li>
                  ) : (
                    <li
                      key={listing.id}
                      className="border-t border-dashed border-[color-mix(in_srgb,var(--ink)_18%,transparent)] first:border-t-0"
                    >
                      {content}
                    </li>
                  ),
                )}
              </ul>
            </div>
          </section>
        );
      })}
    </div>
  );
}
