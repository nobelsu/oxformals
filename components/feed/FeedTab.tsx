"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { ListingDetailModal } from "@/components/swap/ListingDetailModal";
import { useAuth } from "@/components/auth/useAuth";
import { useData } from "@/components/data/useData";
import { useListingsHubData } from "@/components/swap/listings-hub/useListingsHubData";
import { mapListing, mapUser } from "@/lib/data/mapConvex";
import { BROWSE_ROUTE } from "@/lib/ui/routes";
import { useNowMs } from "@/lib/hooks/useNowMs";
import type { Id } from "@/convex/_generated/dataModel";
import type { FeedItem } from "@/lib/data/feed";
import type { Listing } from "@/lib/data/types";
import type { User } from "@/lib/auth/types";
import { FeedRow } from "./FeedRow";
import { FeedHeader } from "./FeedHeader";
import { FeedSidebar, whenLabel, type NextFormal } from "./FeedSidebar";

export function FeedTab() {
  const raw = useQuery(api.feed.getCampusFeed, {});
  const { user } = useAuth();
  const { listings, getUser } = useData();
  const hub = useListingsHubData();
  const nowMs = useNowMs();
  const reviewCount =
    useQuery(
      api.collegeReviews.listPublicReviewsForUser,
      user ? { userId: user.id as Id<"users"> } : "skip",
    )?.length ?? 0;
  const [open, setOpen] = useState<{
    listing: Listing;
    owner: User | null;
  } | null>(null);

  const nextFormal: NextFormal | null = useMemo(() => {
    if (!user) return null;
    const soonest = listings
      .filter(
        (l) =>
          l.members.includes(user.id) && Date.parse(l.dateTime) > nowMs,
      )
      .sort((a, b) => Date.parse(a.dateTime) - Date.parse(b.dateTime))[0];
    if (!soonest) return null;
    const owner = getUser(soonest.ownerUserId) ?? null;
    return {
      listing: soonest,
      hosting: soonest.ownerUserId === user.id,
      whenLabel: whenLabel(soonest.dateTime, nowMs),
      onView: () => setOpen({ listing: soonest, owner }),
    };
  }, [user, listings, nowMs, getUser]);

  const attentionCount =
    hub.listingsNeedingRequests.length +
    hub.listingsNeedingReview.length +
    hub.listingsNeedingAttendance.length;

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

  const sidebar = user ? (
    <FeedSidebar hub={hub} nextFormal={nextFormal} reviewCount={reviewCount} />
  ) : null;

  return (
    <div className="mx-auto w-full max-w-[1000px]">
      <div className="lg:grid lg:grid-cols-[minmax(0,600px)_320px] lg:items-start lg:justify-center lg:gap-10">
        <main className="mx-auto flex w-full max-w-[600px] flex-col gap-4 lg:mx-0 lg:max-w-none">
          {user ? (
            <FeedHeader
              firstName={user.name.split(" ")[0] || user.name}
              nextFormalCollege={nextFormal?.listing.college}
              nextFormalWhen={nextFormal?.whenLabel}
              attentionCount={attentionCount}
            />
          ) : null}

          {/* Mobile: personal sidebar sits above the stream */}
          <div className="lg:hidden">{sidebar}</div>

          <div>
            <div className="mb-1 flex items-center gap-3 text-[0.66rem] uppercase tracking-[0.11em] text-[var(--ink-soft)]">
              From around Oxford
              <span className="h-[1.5px] flex-1 bg-[color-mix(in_srgb,var(--ink)_12%,transparent)]" />
            </div>
            {stream}
          </div>
        </main>

        <aside className="hidden lg:sticky lg:top-4 lg:block">{sidebar}</aside>
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
