"use client";

import { Avatar } from "@/components/ui/Avatar";
import { Chip } from "@/components/ui/Chip";
import { SketchCard, seedFrom } from "@/components/ui/SketchCard";
import type { User } from "@/lib/auth/types";
import { formatListingDate } from "@/lib/data/format";
import type { Listing } from "@/lib/data/types";

type Props = {
  listing: Listing;
  owner: User;
  onRequest?: () => void;
  disabled?: boolean;
  disabledLabel?: string;
};

export function ListingCard({
  listing,
  owner,
  onRequest,
  disabled,
  disabledLabel,
}: Props) {
  return (
    <SketchCard
      seed={seedFrom(listing.id)}
      className="flex h-full min-h-[16.8rem] flex-col gap-4 overflow-hidden p-6 sm:min-h-[20.4rem]"
    >
      <header className="shrink-0 min-w-0">
        <h3 className="line-clamp-3 break-words font-display text-[2.8875rem] uppercase leading-tight tracking-wide">
          {listing.college}
        </h3>
        <div className="mt-2 truncate text-[1.155rem] text-[var(--ink-muted)]">
          {formatListingDate(listing.dateTime)} · {listing.seats}{" "}
          {listing.seats === 1 ? "seat" : "seats"}
        </div>
      </header>

      <div className="flex shrink-0 items-center gap-4">
        <Avatar name={owner.name} size="xl" source={owner.avatar} />
        <div className="min-w-0">
          <div className="truncate text-[1.7325rem] leading-tight">
            {owner.name.split(" ")[0]}
          </div>
          <div className="truncate text-[1.155rem] text-[var(--ink-soft)]">
            {[listing.year, listing.role].filter(Boolean).join(" · ") ||
              [owner.college, owner.year].filter(Boolean).join(" · ")}
          </div>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 w-full min-w-0 flex-col gap-4 overflow-x-hidden overflow-y-auto overscroll-contain py-3">
        {owner.interests.length > 0 && (
          <div className="flex w-full min-w-0 flex-wrap gap-2">
            {owner.interests.map((tag) => (
              <Chip
                key={tag}
                size="md"
                as="span"
                className="!text-[0.67375rem] min-w-0 flex-1 basis-0 justify-center"
              >
                {tag}
              </Chip>
            ))}
          </div>
        )}

        {listing.message ? (
          <p className="line-clamp-6 break-words text-pretty text-[1.155rem] italic text-[var(--ink-muted)]">
            “{listing.message}”
          </p>
        ) : null}
      </div>

      <div className="flex shrink-0 justify-center pt-2">
        {listing.status === "confirmed" ? (
          <span className="rounded-full bg-[var(--paper)] border-[2px] border-[var(--ink)] px-5 py-2 text-[0.9625rem] text-[var(--ink)]">
            Swap confirmed
          </span>
        ) : disabled ? (
          <button
            type="button"
            disabled
            className="cursor-not-allowed rounded-full border-[2px] border-[var(--ink)] bg-[color-mix(in_srgb,var(--accent)_50%,var(--bg))] px-8 py-3 text-[0.9625rem] text-white opacity-70"
          >
            {disabledLabel ?? "Send request!"}
          </button>
        ) : (
          <button
            type="button"
            onClick={onRequest}
            className="rounded-full bg-[var(--accent)] px-8 py-3 text-[0.9625rem] text-white transition-colors hover:bg-[var(--accent-hover)]"
          >
            Send request!
          </button>
        )}
      </div>
    </SketchCard>
  );
}
