"use client";

import Link from "next/link";
import { SketchCard, seedFrom } from "@/components/ui/SketchCard";
import { formatListingDate } from "@/lib/data/format";
import type {
  ListingNeedingAttendance,
  ListingNeedingRequests,
  ListingNeedingReview,
} from "./useListingsHubData";

type Props = {
  myActiveCount: number;
  totalPendingIncoming: number;
  payRequestCount: number;
  formalsToReviewCount: number;
  listingsNeedingAttendance: ListingNeedingAttendance[];
  listingsNeedingReview: ListingNeedingReview[];
  listingsNeedingRequests: ListingNeedingRequests[];
  hasNeedsAttention: boolean;
  onListFormal: () => void;
};

function StatTile({
  label,
  value,
  highlight,
}: {
  label: string;
  value: number;
  highlight?: boolean;
}) {
  return (
    <SketchCard
      seed={seedFrom(label)}
      className="flex min-h-[5.5rem] flex-col justify-between"
    >
      <span className="text-xs uppercase tracking-wide text-[var(--ink-muted)]">
        {label}
      </span>
      <span
        className={`font-display text-4xl tabular-nums ${
          highlight && value > 0 ? "text-[var(--accent-hover)]" : ""
        }`}
      >
        {value}
      </span>
    </SketchCard>
  );
}

function AttentionRow({
  href,
  title,
  subtitle,
  typeLabel,
  accent,
}: {
  href: string;
  title: string;
  subtitle?: string;
  typeLabel: string;
  accent?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`flex flex-col gap-1 rounded-lg border-[2px] px-4 py-3 transition-colors hover:bg-[var(--paper)] ${
        accent
          ? "border-[var(--accent)] bg-[color-mix(in_srgb,var(--accent)_12%,var(--bg))]"
          : "border-[var(--ink)]/20"
      }`}
    >
      <div className="flex flex-wrap items-center gap-2">
        <span
          className={`rounded-full border px-2 py-0.5 text-[0.65rem] font-medium uppercase tracking-wide ${
            accent
              ? "border-[var(--accent)] bg-[var(--accent)] text-white"
              : "border-[var(--ink)] text-[var(--ink-muted)]"
          }`}
        >
          {typeLabel}
        </span>
        <span className="min-w-0 flex-1 text-sm font-medium text-[var(--ink)]">
          {title}
        </span>
      </div>
      {subtitle ? (
        <span className="text-xs text-[var(--ink-muted)]">{subtitle}</span>
      ) : null}
    </Link>
  );
}

export function ListingsOverview({
  myActiveCount,
  totalPendingIncoming,
  payRequestCount,
  formalsToReviewCount,
  listingsNeedingAttendance,
  listingsNeedingReview,
  listingsNeedingRequests,
  hasNeedsAttention,
  onListFormal,
}: Props) {
  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-3xl uppercase tracking-wide">
          Activity
        </h2>
        <button
          type="button"
          onClick={onListFormal}
          className="cursor-pointer rounded-full border-[2px] border-[var(--ink)] px-4 py-1.5 text-sm text-[var(--ink)] transition-colors hover:bg-[var(--ink)] hover:text-[var(--bg)]"
        >
          List a formal
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile label="Active listings" value={myActiveCount} />
        <StatTile
          label="Pending requests"
          value={totalPendingIncoming}
          highlight
        />
        <StatTile label="Pay requests" value={payRequestCount} />
        <StatTile
          label="Formals to review"
          value={formalsToReviewCount}
          highlight
        />
      </div>

      <section>
        <h3 className="font-display text-xl uppercase tracking-wide">
          Notifications
        </h3>
        {hasNeedsAttention ? (
          <div className="mt-3 flex flex-col gap-2">
            {listingsNeedingAttendance.map(({ listing }) => (
              <AttentionRow
                key={`confirm-${listing.id}`}
                href={`/requests/${listing.id}`}
                typeLabel="Confirm"
                title={`Confirm you attended ${listing.college} · ${formatListingDate(listing.dateTime)}`}
                accent
              />
            ))}
            {listingsNeedingReview.map(({ listing }) => (
              <AttentionRow
                key={`review-${listing.id}`}
                href={`/requests/${listing.id}`}
                typeLabel="Review"
                title={`Review ${listing.college} formal · ${formatListingDate(listing.dateTime)}`}
                accent
              />
            ))}
            {listingsNeedingRequests.map(({ listing, pendingCount }) => (
              <AttentionRow
                key={`requests-${listing.id}`}
                href={`/requests/${listing.id}`}
                typeLabel="Requests"
                title={`${pendingCount} ${pendingCount === 1 ? "request" : "requests"} for ${listing.college} formal`}
              />
            ))}
          </div>
        ) : (
          <p className="mt-3 text-[var(--ink-muted)]">
            You&apos;re all caught up — no pending reviews or incoming requests.
          </p>
        )}
      </section>
    </div>
  );
}
