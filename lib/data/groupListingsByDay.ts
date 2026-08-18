import { isoToLocalDateKey } from "./format";
import type { Listing } from "./types";

export type ListingDayGroup = {
  /** `YYYY-MM-DD` in the viewer's local timezone. */
  dateKey: string;
  /** ISO of the earliest listing that day — the rail's label source. */
  dateTime: string;
  listings: Listing[];
};

/**
 * Buckets listings into ascending local-day groups. Sorts internally rather
 * than trusting callers: not every consumer hands us an ordered list.
 */
export function groupListingsByDay(listings: Listing[]): ListingDayGroup[] {
  const sorted = [...listings].sort(
    (a, b) => Date.parse(a.dateTime) - Date.parse(b.dateTime),
  );

  const groups: ListingDayGroup[] = [];
  const byKey = new Map<string, ListingDayGroup>();

  for (const listing of sorted) {
    const dateKey = isoToLocalDateKey(listing.dateTime);
    const existing = byKey.get(dateKey);
    if (existing) {
      existing.listings.push(listing);
      continue;
    }
    const group: ListingDayGroup = {
      dateKey,
      dateTime: listing.dateTime,
      listings: [listing],
    };
    byKey.set(dateKey, group);
    groups.push(group);
  }

  return groups;
}

/**
 * A day group is "past" only once every listing in it has started — not as
 * soon as the earliest one has. `group.dateTime` is just the first listing's
 * start time, so using it alone would dim a whole day (e.g. a 9pm formal
 * still open) as soon as an earlier one on the same day had begun.
 */
export function isDayGroupPast(group: ListingDayGroup, nowMs: number): boolean {
  return group.listings.every((listing) => Date.parse(listing.dateTime) < nowMs);
}
