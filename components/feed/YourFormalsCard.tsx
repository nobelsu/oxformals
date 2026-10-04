"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { BROWSE_ROUTE } from "@/lib/ui/routes";
import { useData } from "@/components/data/useData";
import type { useListingsHubData } from "@/components/swap/listings-hub/useListingsHubData";
import { listingIsPast } from "@/lib/data/collegeReviewEligibility";
import { formatShortDate } from "@/lib/data/format";
import { useNowMs } from "@/lib/hooks/useNowMs";
import type { Listing } from "@/lib/data/types";

type Hub = ReturnType<typeof useListingsHubData>;

const CARD =
  "rounded-[16px] border-[1.5px] border-[color-mix(in_srgb,var(--ink)_14%,transparent)] bg-[var(--paper)] shadow-[0_2px_14px_-10px_rgba(0,0,0,0.35)]";

/** Rows shown per group before "Show more". */
const PER_GROUP = 3;

type Row = {
  key: string;
  listing: Listing;
  /** Right-hand note: a count badge, or a short status. */
  count?: number;
  note?: string;
  strong?: boolean;
};

function Group({
  label,
  rows,
  onOpen,
}: {
  label: string;
  rows: Row[];
  onOpen: (listing: Listing) => void;
}) {
  const [all, setAll] = useState(false);
  if (rows.length === 0) return null;
  const shown = all ? rows : rows.slice(0, PER_GROUP);
  return (
    <div className="mt-3 first:mt-0">
      <p className="px-4 text-[0.72rem] font-bold uppercase tracking-wide text-[var(--ink-soft)]">
        {label}
      </p>
      <ul className="mt-1">
        {shown.map((r) => (
          <li key={r.key}>
            <button
              type="button"
              onClick={() => onOpen(r.listing)}
              className="flex w-full cursor-pointer items-center gap-3 px-4 py-2 text-left transition-colors hover:bg-[color-mix(in_srgb,var(--ink)_4%,transparent)]"
            >
              <span className="min-w-0 flex-1 truncate text-sm">
                <span className="font-semibold">{r.listing.college}</span>
                <span className="text-[var(--ink-muted)]">
                  {" · "}
                  {formatShortDate(r.listing.dateTime)}
                </span>
              </span>
              {r.count ? (
                <span className="grid h-5 min-w-5 shrink-0 place-items-center rounded-full bg-[var(--accent)] px-1.5 text-[0.72rem] font-bold text-[var(--accent-ink)]">
                  {r.count}
                </span>
              ) : r.note ? (
                <span
                  className={`shrink-0 text-[0.78rem] ${
                    r.strong ? "font-bold text-[var(--accent)]" : "text-[var(--ink-muted)]"
                  }`}
                >
                  {r.note}
                </span>
              ) : null}
            </button>
          </li>
        ))}
      </ul>
      {rows.length > PER_GROUP ? (
        <button
          type="button"
          onClick={() => setAll((v) => !v)}
          className="cursor-pointer px-4 py-1 text-xs font-bold text-[var(--accent)] hover:underline"
        >
          {all ? "Show less" : `Show ${rows.length - PER_GROUP} more`}
        </button>
      ) : null}
    </div>
  );
}

/**
 * Your side of the feed: what you're hosting, what you've asked to join and
 * what's waiting on you. Rows open the listing popup, so nothing leaves the
 * feed. With nothing to show, the sidebar card explains itself and phones skip it.
 */
export function YourFormalsCard({
  hub,
  onOpen,
  collapsible = false,
}: {
  hub: Hub;
  onOpen: (listing: Listing) => void;
  /** Phones: a one-line strip that opens on tap. */
  collapsible?: boolean;
}) {
  const { requests, getListing } = useData();
  const nowMs = useNowMs();
  const [expanded, setExpanded] = useState(false);
  const userId = hub.user?.id;

  // Every listing of yours, whatever its status: a full ("confirmed") formal is
  // still one you're hosting until the night has passed.
  const mine = useMemo(
    () => [...hub.myActiveListings, ...hub.myBookedListings],
    [hub.myActiveListings, hub.myBookedListings],
  );

  const hosting: Row[] = useMemo(
    () =>
      mine
        .filter((l) => !listingIsPast(l.dateTime, nowMs))
        .sort((a, b) => Date.parse(a.dateTime) - Date.parse(b.dateTime))
        .map((listing) => ({
          key: `host-${listing.id}`,
          listing,
          count: hub.pendingCountByListing.get(listing.id) ?? 0,
        })),
    [mine, hub.pendingCountByListing, nowMs],
  );

  // Formals you hosted that have been and gone, latest first.
  const hosted: Row[] = useMemo(
    () =>
      mine
        .filter((l) => listingIsPast(l.dateTime, nowMs))
        .sort((a, b) => Date.parse(b.dateTime) - Date.parse(a.dateTime))
        .map((listing) => ({ key: `past-${listing.id}`, listing })),
    [mine, nowMs],
  );

  const requested: Row[] = useMemo(() => {
    if (!userId) return [];
    const rows: Row[] = [];
    for (const r of requests) {
      if (r.fromUserId !== userId) continue;
      if (r.status !== "pending" && r.status !== "accepted") continue;
      const listing = getListing(r.targetListingId);
      if (!listing || listingIsPast(listing.dateTime, nowMs)) continue;
      rows.push({
        key: `req-${r.id}`,
        listing,
        note: r.status === "pending" ? "Pending" : "Accepted",
        strong: r.status === "accepted",
      });
    }
    return rows.sort(
      (a, b) => Date.parse(a.listing.dateTime) - Date.parse(b.listing.dateTime),
    );
  }, [requests, userId, getListing, nowMs]);

  const followUp: Row[] = useMemo(
    () => [
      ...hub.listingsNeedingAttendance.map(({ listing }) => ({
        key: `att-${listing.id}`,
        listing,
        note: "Did you go?",
        strong: true,
      })),
      ...hub.listingsNeedingReview.map(({ listing }) => ({
        key: `rev-${listing.id}`,
        listing,
        note: "Review",
        strong: true,
      })),
    ],
    [hub.listingsNeedingAttendance, hub.listingsNeedingReview],
  );

  if (hosting.length + requested.length + followUp.length + hosted.length === 0) {
    // Phones keep the space for the stream; the sidebar says what will show up here.
    if (collapsible) return null;
    return (
      <section aria-label="Your formals" className={`${CARD} p-4`}>
        <p className="text-sm font-bold">Your formals</p>
        <p className="mt-1 text-sm text-[var(--ink-muted)]">
          Formals you host or ask to join show up here.
        </p>
        <Link
          href={BROWSE_ROUTE}
          className="mt-3 inline-block text-xs font-bold text-[var(--accent)] hover:underline"
        >
          Browse formals
        </Link>
      </section>
    );
  }

  const needYou = hub.totalPendingIncoming + followUp.length;
  const open = !collapsible || expanded;

  return (
    <section aria-label="Your formals" className={`${CARD} overflow-hidden`}>
      <div className="flex items-center gap-3 px-4 py-3">
        {collapsible ? (
          <button
            type="button"
            aria-expanded={expanded}
            onClick={() => setExpanded((v) => !v)}
            className="flex min-w-0 flex-1 cursor-pointer items-center gap-2 text-left"
          >
            <span className="text-sm font-bold">Your formals</span>
            {needYou > 0 ? (
              <span className="rounded-full bg-[var(--accent-wash)] px-2 py-0.5 text-[0.72rem] font-bold text-[var(--accent-wash-ink)]">
                {needYou} need{needYou === 1 ? "s" : ""} you
              </span>
            ) : null}
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
              className={`ml-auto h-4 w-4 shrink-0 text-[var(--ink-muted)] transition-transform ${expanded ? "rotate-180" : ""}`}
            >
              <path d="m6 9 6 6 6-6" />
            </svg>
          </button>
        ) : (
          <p className="flex-1 text-sm font-bold">Your formals</p>
        )}
      </div>
      {open ? (
        <div className="pb-2">
          <Group label="Hosting" rows={hosting} onOpen={onOpen} />
          <Group label="Requested" rows={requested} onOpen={onOpen} />
          <Group label="Follow up" rows={followUp} onOpen={onOpen} />
          <Group label="Hosted" rows={hosted} onOpen={onOpen} />
        </div>
      ) : null}
    </section>
  );
}
