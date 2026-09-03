"use client";

import Link from "next/link";
import { formatShortDate } from "@/lib/data/format";
import type { useListingsHubData } from "@/components/swap/listings-hub/useListingsHubData";

type Hub = ReturnType<typeof useListingsHubData>;

const HUB = "/?tab=requests";

function BellIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-[18px] w-[18px]" aria-hidden>
      <path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.7 21a2 2 0 0 1-3.4 0" />
    </svg>
  );
}
function StarIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-[18px] w-[18px]" aria-hidden>
      <path d="m12 3 2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9 6.8 19.2l1-5.8L3.5 9.2l5.9-.9L12 3Z" />
    </svg>
  );
}
function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-[18px] w-[18px]" aria-hidden>
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

type AttnRow = {
  key: string;
  href: string;
  icon: "bell" | "star" | "check";
  title: string;
  sub: string;
  badge?: number;
};

function buildRows(hub: Hub): AttnRow[] {
  const rows: AttnRow[] = [];
  for (const r of hub.listingsNeedingRequests) {
    rows.push({
      key: `req-${r.listing.id}`,
      href: `${HUB}&section=overview`,
      icon: "bell",
      title: `${r.pendingCount} ${r.pendingCount === 1 ? "person wants" : "want"} your ${r.listing.college} seat`,
      sub: `${formatShortDate(r.listing.dateTime)} · swap requests`,
      badge: r.pendingCount,
    });
  }
  for (const r of hub.listingsNeedingReview) {
    rows.push({
      key: `rev-${r.listing.id}`,
      href: `${HUB}&section=attended`,
      icon: "star",
      title: `Rate your night at ${r.listing.college}`,
      sub: `You went ${formatShortDate(r.listing.dateTime)}`,
    });
  }
  for (const r of hub.listingsNeedingAttendance) {
    rows.push({
      key: `att-${r.listing.id}`,
      href: `${HUB}&section=attended`,
      icon: "check",
      title: `Did you make it to ${r.listing.college}?`,
      sub: formatShortDate(r.listing.dateTime),
    });
  }
  return rows;
}

/**
 * The feed's personal action panel — the actionable items from the listings
 * hub, surfaced above/beside the social stream. Renders nothing when there's
 * nothing to act on. Rows deep-link into the matching "Your formals" section.
 */
export function NeedsAttention({ hub }: { hub: Hub }) {
  const rows = buildRows(hub).slice(0, 5);
  if (rows.length === 0) return null;

  return (
    <div>
      <p className="mb-2 px-0.5 text-[0.68rem] font-bold uppercase tracking-[0.12em] text-[var(--ink-soft)]">
        Needs your attention
      </p>
      <ul className="overflow-hidden rounded-[16px] border-[1.5px] border-[color-mix(in_srgb,var(--ink)_14%,transparent)] bg-[var(--paper)] shadow-[0_2px_14px_-10px_rgba(0,0,0,0.35)]">
        {rows.map((r) => (
          <li key={r.key} className="border-t border-[color-mix(in_srgb,var(--ink)_8%,transparent)] first:border-t-0">
            <Link
              href={r.href}
              className="flex items-center gap-3 px-3.5 py-3 transition-colors hover:bg-[color-mix(in_srgb,var(--ink)_3%,transparent)]"
            >
              <span className="grid h-[34px] w-[34px] shrink-0 place-items-center rounded-full bg-[var(--accent-wash)] text-[var(--accent-wash-ink)]">
                {r.icon === "bell" ? <BellIcon /> : r.icon === "star" ? <StarIcon /> : <CheckIcon />}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[0.9rem] font-semibold leading-tight">{r.title}</span>
                <span className="block text-[0.78rem] text-[var(--ink-muted)]">{r.sub}</span>
              </span>
              {r.badge ? (
                <span className="grid h-5 min-w-5 shrink-0 place-items-center rounded-full bg-[var(--accent)] px-1.5 text-[0.72rem] font-bold text-[var(--accent-ink)]">
                  {r.badge}
                </span>
              ) : (
                <span aria-hidden className="shrink-0 text-[var(--ink-soft)]">›</span>
              )}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
