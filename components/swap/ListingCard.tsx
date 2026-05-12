"use client";

import Link from "next/link";
import { Avatar } from "@/components/ui/Avatar";
import { Chip } from "@/components/ui/Chip";
import { SketchCard, seedFrom } from "@/components/ui/SketchCard";
import type { User } from "@/lib/auth/types";
import { formatListingDate, formatYearLabel } from "@/lib/data/format";
import type { Listing } from "@/lib/data/types";

type Props = {
  listing: Listing;
  owner: User;
  memberUsers?: User[];
  onRequest?: () => void;
  onPress?: () => void;
  disabled?: boolean;
  disabledLabel?: string;
};

export function ListingCard({
  listing,
  owner,
  memberUsers = [],
  onRequest,
  onPress,
  disabled,
  disabledLabel,
}: Props) {
  const profileLine = [
    formatYearLabel(owner.year) || owner.year || formatYearLabel(listing.year) || listing.year,
    owner.role || listing.role,
  ]
    .filter(Boolean)
    .join(" · ");

  const seatsLabel =
    listing.seatsAvailable === 0
      ? "Group full"
      : `${listing.seatsAvailable} ${listing.seatsAvailable === 1 ? "seat" : "seats"} left`;

  return (
    <SketchCard
      seed={seedFrom(listing.id)}
      className={`flex h-full min-h-[16.8rem] flex-col gap-4 overflow-hidden p-6 sm:min-h-[20.4rem]${onPress ? " cursor-pointer transition-transform hover:scale-[1.01]" : ""}`}
      onClick={onPress}
    >
      <header className="shrink-0 min-w-0">
        <h3 className="line-clamp-3 break-words font-display text-[2.31rem] uppercase leading-tight tracking-wide">
          {listing.college}
        </h3>
        <div className="mt-2 truncate text-[0.924rem] text-[var(--ink-muted)]">
          {formatListingDate(listing.dateTime)} · Group of {listing.groupSize} · {seatsLabel}
        </div>
      </header>

      <div className="flex shrink-0 items-center gap-4">
        <Link href={`/profile/${owner.id}`} onClick={(e) => e.stopPropagation()}>
          <Avatar name={owner.name} size="xl" source={owner.avatar} />
        </Link>
        <div className="min-w-0">
          <Link href={`/profile/${owner.id}`} onClick={(e) => e.stopPropagation()} className="block truncate text-[1.386rem] leading-tight hover:underline">
            {owner.name.split(" ")[0]}
          </Link>
          <div className="truncate text-[0.924rem] text-[var(--ink-soft)]">
            {profileLine ||
              [owner.college, formatYearLabel(owner.year) || owner.year]
                .filter(Boolean)
                .join(" · ")}
          </div>
        </div>
      </div>

      {memberUsers.length > 0 && (
        <div className="flex shrink-0 items-center gap-1.5">
          <span className="text-[0.77rem] text-[var(--ink-soft)]">Group:</span>
          <div className="flex -space-x-1.5">
            {memberUsers.map((m) => (
              <Link key={m.id} href={`/profile/${m.id}`} title={m.name} onClick={(e) => e.stopPropagation()}>
                <Avatar name={m.name} size="sm" source={m.avatar} />
              </Link>
            ))}
          </div>
        </div>
      )}

      <div className="flex min-h-0 flex-1 w-full min-w-0 flex-col gap-4 overflow-x-hidden overflow-y-auto overscroll-contain py-3">
        {owner.interests.length > 0 && (
          <div className="flex w-full min-w-0 flex-wrap gap-2">
            {owner.interests.map((tag) => (
              <Chip
                key={tag}
                size="md"
                as="span"
                className="!text-[0.539rem]"
              >
                {tag}
              </Chip>
            ))}
          </div>
        )}

        {listing.message ? (
          <p className="line-clamp-6 break-words text-pretty text-[0.924rem] italic text-[var(--ink-muted)]">
            &ldquo;{listing.message}&rdquo;
          </p>
        ) : null}
      </div>

      <div className="flex shrink-0 justify-center pt-2" onClick={(e) => e.stopPropagation()}>
        {listing.status === "confirmed" || listing.status === "closed" ? (
          <span className="rounded-full bg-[var(--paper)] border-[2px] border-[var(--ink)] px-5 py-2 text-[0.77rem] text-[var(--ink)]">
            {listing.seatsAvailable === 0 ? "Group full" : "Swap confirmed"}
          </span>
        ) : disabled ? (
          <button
            type="button"
            disabled
            className="cursor-not-allowed rounded-full border-[2px] border-[var(--ink)] bg-[color-mix(in_srgb,var(--accent)_50%,var(--bg))] px-8 py-3 text-[0.77rem] text-white opacity-70"
          >
            {disabledLabel ?? "Send request!"}
          </button>
        ) : (
          <button
            type="button"
            onClick={onRequest}
            className="rounded-full bg-[var(--accent)] px-8 py-3 text-[0.77rem] text-white transition-colors hover:bg-[var(--accent-hover)]"
          >
            Send request!
          </button>
        )}
      </div>
    </SketchCard>
  );
}
