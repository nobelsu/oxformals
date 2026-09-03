"use client";

import { formatDayLabel, formatListingTime } from "@/lib/data/format";
import type { useListingsHubData } from "@/components/swap/listings-hub/useListingsHubData";
import type { Listing } from "@/lib/data/types";
import { NeedsAttention } from "./NeedsAttention";

type Hub = ReturnType<typeof useListingsHubData>;

const LABEL =
  "mb-2 px-0.5 text-[0.68rem] font-bold uppercase tracking-[0.12em] text-[var(--ink-soft)]";
const CARD =
  "rounded-[16px] border-[1.5px] border-[color-mix(in_srgb,var(--ink)_14%,transparent)] bg-[var(--paper)] shadow-[0_2px_14px_-10px_rgba(0,0,0,0.35)]";

/** "Tonight" / "Tomorrow" / "In 3 days" / "Next week" for an upcoming formal. */
export function whenLabel(iso: string, nowMs: number): string {
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return "";
  const startOfDay = (ms: number) => {
    const d = new Date(ms);
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  };
  const diff = Math.round((startOfDay(t) - startOfDay(nowMs)) / 86_400_000);
  if (diff <= 0) return "Tonight";
  if (diff === 1) return "Tomorrow";
  if (diff < 7) return `In ${diff} days`;
  const weeks = Math.round(diff / 7);
  return weeks <= 1 ? "Next week" : `In ${weeks} weeks`;
}

export type NextFormal = {
  listing: Listing;
  hosting: boolean;
  whenLabel: string;
  onView: () => void;
};

function NextFormalWidget({ nextFormal }: { nextFormal: NextFormal }) {
  const { listing, hosting } = nextFormal;
  const { day, weekday } = formatDayLabel(listing.dateTime);
  return (
    <div>
      <p className={LABEL}>Your next formal</p>
      <div className={`${CARD} p-4`}>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-[color-mix(in_srgb,var(--accent-wash)_45%,var(--paper))] px-2.5 py-0.5 text-[0.72rem] font-bold text-[var(--accent)]">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-3 w-3" aria-hidden>
            <circle cx="12" cy="12" r="9" />
            <path d="M12 7v5l3 2" />
          </svg>
          {nextFormal.whenLabel}
        </span>
        <div className="mt-2 font-display text-[1.9rem] uppercase leading-none tracking-wide">
          {listing.college}
        </div>
        <p className="mt-1.5 text-[0.88rem] text-[var(--ink-muted)]">
          {weekday} {day} · {formatListingTime(listing.dateTime)} ·{" "}
          {hosting ? "you’re hosting" : "guest"}
        </p>
        <button
          type="button"
          onClick={nextFormal.onView}
          className="mt-3 w-full rounded-full border-[1.5px] border-[var(--ink)] py-2 text-[0.82rem] font-semibold text-[var(--ink)] transition-colors hover:bg-[var(--ink)] hover:text-[var(--bg)]"
        >
          View details
        </button>
      </div>
    </div>
  );
}

function YearSoFarWidget({
  attended,
  reviews,
  hosted,
}: {
  attended: number;
  reviews: number;
  hosted: number;
}) {
  const stats = [
    { n: attended, k: "attended" },
    { n: reviews, k: "reviews" },
    { n: hosted, k: "hosted" },
  ];
  return (
    <div>
      <p className={LABEL}>Your year so far</p>
      <div className={`${CARD} grid grid-cols-3`}>
        {stats.map((s, i) => (
          <div
            key={s.k}
            className={`px-2 py-3 text-center ${i > 0 ? "border-l-[1.5px] border-[color-mix(in_srgb,var(--ink)_8%,transparent)]" : ""}`}
          >
            <div className="font-display text-[1.6rem] leading-none text-[var(--accent)]">
              {s.n}
            </div>
            <div className="mt-1 text-[0.66rem] uppercase tracking-[0.08em] text-[var(--ink-soft)]">
              {s.k}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * The feed's personal sidebar — always shows something for a signed-in user:
 * their next formal (when upcoming), what needs attention, and a small
 * year-so-far stat strip.
 */
export function FeedSidebar({
  hub,
  nextFormal,
  reviewCount,
}: {
  hub: Hub;
  nextFormal: NextFormal | null;
  reviewCount: number;
}) {
  const hosted = hub.myActiveListings.length + hub.myBookedListings.length;
  return (
    <div className="flex flex-col gap-4">
      {nextFormal ? <NextFormalWidget nextFormal={nextFormal} /> : null}
      {hub.hasNeedsAttention ? <NeedsAttention hub={hub} /> : null}
      <YearSoFarWidget
        attended={hub.attendedPastListings.length}
        reviews={reviewCount}
        hosted={hosted}
      />
    </div>
  );
}
