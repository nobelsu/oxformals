"use client";

import { formatListingTime } from "@/lib/data/format";
import type { useListingsHubData } from "@/components/swap/listings-hub/useListingsHubData";
import type { Listing } from "@/lib/data/types";
import { PeopleYouMayKnow } from "@/components/invites/PeopleYouMayKnow";
import { YourFormalsCard } from "./YourFormalsCard";

type Hub = ReturnType<typeof useListingsHubData>;

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

const ClockIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className="h-3 w-3" aria-hidden>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3 2" />
  </svg>
);

/** "Tomorrow · WORCESTER": your next formal; opens its popup. */
export function NextFormalCard({ nextFormal }: { nextFormal: NextFormal }) {
  return (
    <button
      type="button"
      onClick={nextFormal.onView}
      className={`${CARD} block w-full cursor-pointer p-4 text-left`}
    >
      <span className="inline-flex items-center gap-1.5 text-[0.75rem] font-bold text-[var(--accent)]">
        <ClockIcon />
        {nextFormal.whenLabel} · {formatListingTime(nextFormal.listing.dateTime)}
      </span>
      <span className="mt-1 block truncate font-display text-[1.7rem] uppercase leading-none tracking-wide">
        {nextFormal.listing.college}
      </span>
    </button>
  );
}

/**
 * The feed's desktop sidebar: your next formal, your formals and people to follow.
 */
export function FeedSidebar({
  hub,
  nextFormal,
  onOpenListing,
}: {
  hub: Hub;
  nextFormal: NextFormal | null;
  onOpenListing: (listing: Listing) => void;
}) {
  return (
    <div className="flex flex-col gap-3">
      {nextFormal ? <NextFormalCard nextFormal={nextFormal} /> : null}
      <YourFormalsCard hub={hub} onOpen={onOpenListing} />
      <PeopleYouMayKnow />
    </div>
  );
}
