"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { ListingDetailModal } from "@/components/swap/ListingDetailModal";
import { useAuth } from "@/components/auth/useAuth";
import { useListingsHubData } from "@/components/swap/listings-hub/useListingsHubData";
import { mapListing, mapUser } from "@/lib/data/mapConvex";
import { BROWSE_ROUTE } from "@/lib/ui/routes";
import type { FeedItem } from "@/lib/data/feed";
import type { Listing } from "@/lib/data/types";
import type { User } from "@/lib/auth/types";
import { FeedRow } from "./FeedRow";
import { FeedHeader } from "./FeedHeader";
import { NeedsAttention } from "./NeedsAttention";

export function FeedTab() {
  const raw = useQuery(api.feed.getCampusFeed, {});
  const { user } = useAuth();
  const hub = useListingsHubData();
  const [open, setOpen] = useState<{ listing: Listing; owner: User } | null>(
    null,
  );

  const items: FeedItem[] | undefined = useMemo(() => {
    if (!raw) return undefined;
    return raw.items.map((it): FeedItem => {
      const base = {
        key: it.key,
        ts: it.ts,
        onWishlist: it.onWishlist,
        commentCount: it.commentCount,
        commentPreview: it.commentPreview,
        likeCount: it.likeCount,
        viewerLiked: it.viewerLiked,
        viewerBookmarked: it.viewerBookmarked,
      };
      if (it.kind === "listing") {
        return {
          ...base,
          kind: "listing",
          actor: mapUser(it.actor),
          listing: mapListing(it.listing),
        };
      }
      if (it.kind === "review") {
        return {
          ...base,
          kind: "review",
          actor: mapUser(it.actor),
          college: it.college,
          ratings: it.ratings,
          comment: it.comment,
          imageUrls: it.imageUrls,
        };
      }
      return {
        ...base,
        kind: "attended",
        actors: it.actors.map(mapUser),
        attendeeCount: it.attendeeCount,
        college: it.college,
        dateTime: it.dateTime,
      };
    });
  }, [raw]);

  const stream =
    items === undefined ? (
      <p className="text-[var(--ink-muted)]">Loading your feed…</p>
    ) : items.length === 0 ? (
      <div className="rounded-[18px] border-[1.5px] border-[color-mix(in_srgb,var(--ink)_14%,transparent)] bg-[var(--paper)] px-5 py-8 text-center">
        <p className="text-[var(--ink-muted)]">
          Nothing here yet. As people list formals and review their nights out,
          it&rsquo;ll show up here.
        </p>
        <Link
          href={BROWSE_ROUTE}
          className="mt-4 inline-flex items-center justify-center rounded-full border-[2px] border-[var(--ink)] px-5 py-2 text-sm font-semibold text-[var(--ink)] transition-colors hover:bg-[var(--ink)] hover:text-[var(--bg)]"
        >
          Browse formals
        </Link>
      </div>
    ) : (
      <ul className="flex flex-col">
        {items.map((item) => (
          <FeedRow
            key={item.key}
            item={item}
            onOpenListing={(listing, owner) => setOpen({ listing, owner })}
          />
        ))}
      </ul>
    );

  const withRail = hub.hasNeedsAttention;

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-5">
      {user ? (
        <FeedHeader
          firstName={user.name.split(" ")[0] || user.name}
          requestCount={hub.totalPendingIncoming}
          rateCount={hub.formalsToReviewCount}
        />
      ) : null}

      {/* Mobile: attention band above the stream */}
      {withRail ? (
        <div className="lg:hidden">
          <NeedsAttention hub={hub} />
        </div>
      ) : null}

      <div
        className={
          withRail
            ? "lg:grid lg:grid-cols-[minmax(0,1fr)_300px] lg:items-start lg:gap-10"
            : ""
        }
      >
        <div className={withRail ? "w-full max-w-xl" : "mx-auto w-full max-w-xl"}>
          {stream}
        </div>
        {withRail ? (
          <aside className="hidden lg:sticky lg:top-4 lg:block">
            <NeedsAttention hub={hub} />
          </aside>
        ) : null}
      </div>

      <ListingDetailModal
        open={open !== null}
        onClose={() => setOpen(null)}
        listing={open?.listing ?? null}
        owner={open?.owner ?? null}
        hideInterests
      />
    </div>
  );
}
