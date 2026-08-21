"use client";

import { ListingRow } from "./ListingRow";
import {
  formatListingTime,
  formatPrice,
  formatRelativeTime,
} from "@/lib/data/format";
import type { Listing } from "@/lib/data/types";
import type { User } from "@/lib/auth/types";
import type { ProfileActivityItem } from "@/lib/data/groupActivityByDay";

type Props = {
  item: ProfileActivityItem;
  owner: User;
  memberUsers: User[];
  onPress: (listing: Listing) => void;
  onRequest?: (listing: Listing) => void;
  disabled?: boolean;
  disabledLabel?: string;
};

const KIND_PILL_CLS: Record<ProfileActivityItem["kind"], string> = {
  listing: "border-[var(--ink)] bg-[var(--bg)] text-[var(--ink)]",
  attended:
    "border-[var(--ink)] bg-[color-mix(in_srgb,var(--paper)_82%,var(--ink)_6%)] text-[var(--ink)]",
  review: "border-[var(--accent)] bg-[var(--accent)] text-[var(--accent-ink)]",
};

function Stars({ overall }: { overall: number }) {
  const filled = Math.max(0, Math.min(5, Math.round(overall)));
  return (
    <span className="text-[var(--accent)]" aria-label={`${overall} out of 5`}>
      {"★".repeat(filled)}
      <span className="text-[var(--ink-soft)]">{"★".repeat(5 - filled)}</span>
    </span>
  );
}

/**
 * One card of the profile activity stream: kind pill + relative timestamp
 * header, then the body for that kind. Listings delegate their body to
 * ListingRow (browse-feed card content) so the two surfaces stay in sync.
 */
export function ProfileStreamRow({
  item,
  owner,
  memberUsers,
  onPress,
  onRequest,
  disabled,
  disabledLabel,
}: Props) {
  return (
    <li className="rounded-[18px] border-[1.5px] border-[color-mix(in_srgb,var(--ink)_14%,transparent)] bg-[var(--paper)] px-4 py-3 shadow-[0_2px_14px_-10px_rgba(0,0,0,0.25)] sm:px-5 sm:py-4">
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <span
          className={`rounded-full border-[1.5px] px-2 py-[3px] text-[0.65rem] font-bold uppercase tracking-[0.07em] ${KIND_PILL_CLS[item.kind]}`}
        >
          {item.kind === "attended" ? "Attended" : item.kind}
        </span>
        <span className="text-[0.7rem] text-[var(--ink-muted)]">
          {formatRelativeTime(item.ts)}
        </span>
      </div>

      {item.kind === "listing" ? (
        <ListingRow
          listing={item.listing}
          owner={owner}
          memberUsers={memberUsers}
          align="center"
          hideInterests
          onPress={() => onPress(item.listing)}
          onRequest={onRequest ? () => onRequest(item.listing) : undefined}
          disabled={disabled}
          disabledLabel={disabledLabel}
        />
      ) : item.kind === "attended" ? (
        <div>
          <h3 className="flex flex-wrap items-baseline gap-x-2 font-display text-[1.3rem] leading-tight sm:text-[1.5rem]">
            {item.college}
            <span className="text-[0.95rem] normal-case tracking-normal text-[var(--ink-muted)]">
              {formatListingTime(item.dateTime)}
            </span>
          </h3>
          <p className="mt-1 text-[0.9rem] text-[var(--ink-muted)]">
            {item.hosted ? "Hosted" : "Guest"}
            {!item.hosted && item.price !== undefined
              ? ` · paid ${formatPrice(item.price)}`
              : ""}
          </p>
        </div>
      ) : (
        <div>
          <h3 className="flex flex-wrap items-baseline gap-x-2 font-display text-[1.3rem] leading-tight sm:text-[1.5rem]">
            {item.college}
            <Stars overall={item.ratings.overall} />
          </h3>
          {item.comment ? (
            <p className="mt-1 line-clamp-2 break-words text-pretty text-[0.95rem] italic text-[var(--ink-muted)]">
              &ldquo;{item.comment}&rdquo;
            </p>
          ) : null}
        </div>
      )}
    </li>
  );
}
