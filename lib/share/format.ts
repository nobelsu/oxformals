/** "Sat 12 Oct · 7pm" in Oxford time, whatever the server's timezone. */
export function formatShareDate(iso: string): string {
  const d = new Date(iso);
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: "Europe/London",
      weekday: "short",
      day: "numeric",
      month: "short",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    })
      .formatToParts(d)
      .map((p) => [p.type, p.value]),
  ) as Record<string, string>;
  const minutes = parts.minute === "00" ? "" : `:${parts.minute}`;
  const suffix = (parts.dayPeriod ?? "").toLowerCase().replace(/\./g, "");
  return `${parts.weekday} ${parts.day} ${parts.month} · ${parts.hour}${minutes}${suffix}`;
}

/** Cut text to `max` characters on a word boundary, adding "…". */
export function excerpt(text: string, max: number): string {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max - 1);
  const lastSpace = cut.lastIndexOf(" ");
  return `${(lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut).trimEnd()}…`;
}
