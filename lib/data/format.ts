import type { ListingStatus } from "@/lib/data/types";

export function formatListingStatusLabel(
  status: ListingStatus,
  seatsAvailable?: number,
): string {
  switch (status) {
    case "active":
      return "Active";
    case "confirmed":
      return "Listing full";
    case "closed":
      return seatsAvailable === 0 ? "Group full" : "Closed";
    case "expired":
      return "Past";
  }
}

/** Seat availability suffix for listing metadata; omitted once the formal is past. */
export function formatListingSeatsSuffix(
  seatsAvailable: number,
  isPast: boolean,
): string | null {
  if (isPast) return null;
  if (seatsAvailable === 0) return "Group full";
  const unit = seatsAvailable === 1 ? "seat" : "seats";
  return `${seatsAvailable} ${unit} left`;
}

/** `Group of 3 · 2 seats left · £28` — no date; the day rail carries it. */
export function formatListingRowMeta(args: {
  groupSize: number;
  seatsAvailable: number;
  isPast: boolean;
  price?: number;
}): string {
  const parts: string[] = [`Group of ${args.groupSize}`];
  const seats = formatListingSeatsSuffix(args.seatsAvailable, args.isPast);
  if (seats) parts.push(seats);
  if (args.price !== undefined) parts.push(formatPrice(args.price));
  return parts.join(" · ");
}

/** `Thu 8 May · 7:15pm · Group of 3 · …` — drops seat availability for past formals. */
export function formatListingMetaLine(args: {
  dateTime: string;
  groupSize: number;
  seatsAvailable: number;
  isPast: boolean;
  price?: number;
}): string {
  return `${formatListingDate(args.dateTime)} · ${formatListingRowMeta(args)}`;
}

/** `7:15pm`, or `7pm` on the hour. */
export function formatListingTime(iso: string): string {
  const d = new Date(iso);
  let hours = d.getHours();
  const minutes = d.getMinutes().toString().padStart(2, "0");
  const suffix = hours >= 12 ? "pm" : "am";
  hours = hours % 12 || 12;
  return minutes === "00" ? `${hours}${suffix}` : `${hours}:${minutes}${suffix}`;
}

/** `{ day: "8 May", weekday: "Friday" }` for the day rail. */
export function formatDayLabel(iso: string): { day: string; weekday: string } {
  const d = new Date(iso);
  return {
    day: new Intl.DateTimeFormat("en-GB", {
      day: "numeric",
      month: "short",
    }).format(d),
    weekday: new Intl.DateTimeFormat("en-GB", { weekday: "long" }).format(d),
  };
}

// "Thu 8 May · 7:15pm"
export function formatListingDate(iso: string): string {
  const day = new Intl.DateTimeFormat("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
  }).format(new Date(iso));
  return `${day} · ${formatListingTime(iso)}`;
}

export function formatShortDate(iso: string): string {
  const d = new Date(iso);
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
  }).format(d);
}

/** `YYYY-MM-DD` in the user's local timezone (for `<input type="date">` comparison). */
export function isoToLocalDateKey(iso: string): string {
  const d = new Date(iso);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function formatRelativeTime(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.round(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days}d`;
  const d = new Date(ts);
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
  }).format(d);
}

function ordinalSuffix(value: number): string {
  const mod100 = value % 100;
  if (mod100 >= 11 && mod100 <= 13) return "th";
  switch (value % 10) {
    case 1:
      return "st";
    case 2:
      return "nd";
    case 3:
      return "rd";
    default:
      return "th";
  }
}

export function formatPrice(gbp: number): string {
  return `£${gbp}`;
}

export function formatYearLabel(raw: string | number | null | undefined): string {
  if (raw == null) return "";
  const value = String(raw).trim();
  if (!value) return "";

  const numericLike = value.match(/^(\d+)(?:st|nd|rd|th)?(?:\s*year)?$/i);
  if (!numericLike) return value;

  const year = Number(numericLike[1]);
  if (!Number.isFinite(year) || year <= 0) return value;
  return `${year}${ordinalSuffix(year)} year`;
}
