"use client";

import { useMemo, type ReactNode } from "react";
import { SketchDot } from "@/components/ui/SketchDot";
import { seedFrom } from "@/components/ui/SketchCard";
import { formatDayLabel } from "@/lib/data/format";
import { groupListingsByDay } from "@/lib/data/groupListingsByDay";
import type { Listing } from "@/lib/data/types";
import { useNowMs } from "@/lib/hooks/useNowMs";

type Props = {
  listings: Listing[];
  renderRow: (listing: Listing) => ReactNode;
  className?: string;
  /** Sticky offset + background for the mobile day header. Override inside a modal. */
  stickyClassName?: string;
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
}: Props) {
  const nowMs = useNowMs();
  const groups = useMemo(() => groupListingsByDay(listings), [listings]);

  if (groups.length === 0) return null;

  return (
    <div className={className}>
      {groups.map((group) => {
        const { day, weekday } = formatDayLabel(group.dateTime);
        const isPastDay = Date.parse(group.dateTime) < nowMs;
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
                <div className="font-display text-[1.15rem] leading-tight">
                  {day}
                </div>
                <div className="text-[0.85rem] text-[var(--ink-soft)]">
                  {weekday}
                </div>
              </div>
            </div>

            <div className="relative sm:border-l-2 sm:border-dashed sm:border-[color-mix(in_srgb,var(--ink)_28%,transparent)] sm:pl-6">
              <span
                className={`pointer-events-none absolute left-[-8px] top-6 hidden sm:block ${dayInk}`}
              >
                <SketchDot seed={seedFrom(group.dateKey)} />
              </span>

              <ul>
                {group.listings.map((listing) => {
                  const content = renderRow(listing);
                  if (!content) return null;
                  return (
                    <li
                      key={listing.id}
                      className="border-t border-dashed border-[color-mix(in_srgb,var(--ink)_18%,transparent)] first:border-t-0"
                    >
                      {content}
                    </li>
                  );
                })}
              </ul>
            </div>
          </section>
        );
      })}
    </div>
  );
}
