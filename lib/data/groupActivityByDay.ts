import type { Listing } from "./types";
import { formatDayLabel, isoToLocalDateKey } from "./format";

export type AttendedActivity = {
  kind: "attended";
  ts: number;
  college: string;
  dateTime: string;
  hosted: boolean;
  price?: number;
};

export type ReviewActivity = {
  kind: "review";
  ts: number;
  college: string;
  ratings: {
    food: number;
    atmosphere: number;
    value: number;
    overall: number;
  };
  comment: string | null;
};

export type ListingActivity = { kind: "listing"; ts: number; listing: Listing };

export type ProfileActivityItem =
  | ListingActivity
  | AttendedActivity
  | ReviewActivity;

export type ActivityDayGroup = {
  dateKey: string;
  day: string;
  weekday: string;
  items: ProfileActivityItem[];
};

function itemIso(item: ProfileActivityItem): string {
  return item.kind === "attended"
    ? item.dateTime
    : new Date(item.ts).toISOString();
}

/**
 * Group the (already newest-first sorted) stream into local-day buckets.
 * Insertion order of the Map preserves the caller's ordering.
 */
export function groupActivityByDay(
  items: ProfileActivityItem[],
): ActivityDayGroup[] {
  const groups = new Map<string, ProfileActivityItem[]>();
  for (const item of items) {
    const key = isoToLocalDateKey(itemIso(item));
    const bucket = groups.get(key);
    if (bucket) bucket.push(item);
    else groups.set(key, [item]);
  }
  return [...groups.entries()].map(([dateKey, groupItems]) => {
    const { day, weekday } = formatDayLabel(itemIso(groupItems[0]));
    return { dateKey, day, weekday, items: groupItems };
  });
}
