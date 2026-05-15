// "Thu 8 May · 7:15pm"
export function formatListingDate(iso: string): string {
  const d = new Date(iso);
  const day = new Intl.DateTimeFormat("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
  }).format(d);
  let hours = d.getHours();
  const minutes = d.getMinutes().toString().padStart(2, "0");
  const suffix = hours >= 12 ? "pm" : "am";
  hours = hours % 12 || 12;
  const time =
    minutes === "00" ? `${hours}${suffix}` : `${hours}:${minutes}${suffix}`;
  return `${day} · ${time}`;
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
