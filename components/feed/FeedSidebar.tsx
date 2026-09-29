"use client";

import Link from "next/link";
import { CreditsChip } from "@/components/credits/CreditsChip";
import { formatListingTime } from "@/lib/data/format";
import type { useListingsHubData } from "@/components/swap/listings-hub/useListingsHubData";
import type { Listing } from "@/lib/data/types";
import { NeedsAttention } from "./NeedsAttention";

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

/**
 * "Tomorrow · WORCESTER". On phones it also carries a dot with how many
 * things need you, linking to Your formals.
 */
export function NextFormalCard({
  nextFormal,
  attentionCount = 0,
}: {
  nextFormal: NextFormal;
  attentionCount?: number;
}) {
  return (
    <div className={`${CARD} flex items-center gap-3 p-4`}>
      <button type="button" onClick={nextFormal.onView} className="min-w-0 flex-1 cursor-pointer text-left">
        <span className="inline-flex items-center gap-1.5 text-[0.75rem] font-bold text-[var(--accent)]">
          <ClockIcon />
          {nextFormal.whenLabel} · {formatListingTime(nextFormal.listing.dateTime)}
        </span>
        <span className="mt-1 block truncate font-display text-[1.7rem] uppercase leading-none tracking-wide">
          {nextFormal.listing.college}
        </span>
      </button>
      {attentionCount > 0 ? (
        <Link
          href="/?tab=requests&section=overview"
          aria-label={`${attentionCount} thing${attentionCount === 1 ? "" : "s"} need you`}
          className="flex shrink-0 items-center gap-1.5 rounded-full px-2 py-1 text-sm font-bold hover:bg-[color-mix(in_srgb,var(--ink)_6%,transparent)]"
        >
          <span className="h-2 w-2 rounded-full bg-[var(--accent)]" />
          {attentionCount}
        </Link>
      ) : null}
    </div>
  );
}

/**
 * The feed's desktop sidebar: your next formal, what needs you, and credits.
 */
export function FeedSidebar({
  hub,
  nextFormal,
}: {
  hub: Hub;
  nextFormal: NextFormal | null;
}) {
  return (
    <div className="flex flex-col gap-3">
      {nextFormal ? <NextFormalCard nextFormal={nextFormal} /> : null}
      {hub.hasNeedsAttention ? <NeedsAttention hub={hub} /> : null}
      <div>
        <CreditsChip />
      </div>
    </div>
  );
}
