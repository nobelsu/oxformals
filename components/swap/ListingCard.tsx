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
    <SketchCard seed={seedFrom(listing.id)} className="flex flex-col gap-4 p-6">
      <header>
        <h3 className="font-display text-3xl uppercase tracking-wide leading-tight">
          {listing.college}
        </h3>
        <div className="mt-1 text-[var(--ink-muted)]">
          {formatListingDate(listing.dateTime)} · {listing.seats}{" "}
          {listing.seats === 1 ? "seat" : "seats"}
        </div>
      </header>

      <div className="flex items-center gap-3">
        <Avatar name={owner.name} />
        <div className="min-w-0">
          <div className="text-lg leading-tight truncate">
            {owner.name.split(" ")[0]}
          </div>
          <div className="text-xs text-[var(--ink-soft)]">
            {owner.college} · {owner.year}
          </div>
        </div>
      </div>

      {owner.interests.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {owner.interests.map((tag) => (
            <Chip key={tag} size="sm" as="span">
              {tag}
            </Chip>
          ))}
        </div>
      )}

      {listing.message && (
        <p className="text-[var(--ink-muted)] italic text-sm">
          “{listing.message}”
        </p>
      )}

      <div className="pt-1 flex justify-center">
        {listing.status === "confirmed" ? (
          <span className="rounded-full bg-[var(--paper)] border-[2px] border-[var(--ink)] text-[var(--ink)] px-4 py-1.5 text-sm">
            Swap confirmed
          </span>
        ) : disabled ? (
          <button
            type="button"
            disabled
            className="rounded-full bg-[color-mix(in_srgb,var(--accent)_50%,var(--bg))] border-[2px] border-[var(--ink)] text-white px-6 py-2 text-sm opacity-70 cursor-not-allowed"
          >
            {disabledLabel ?? "Send request!"}
          </button>
        ) : (
          <button
            type="button"
            onClick={onRequest}
            className="rounded-full bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white px-6 py-2 text-sm transition-colors"
          >
            Send request!
          </button>
        )}
      </div>
    </SketchCard>
  );
}
