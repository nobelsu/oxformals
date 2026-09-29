"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { ListingDetailModal } from "@/components/swap/ListingDetailModal";
import { useAuth } from "@/components/auth/useAuth";
import { useData } from "@/components/data/useData";
import { useListingsHubData } from "@/components/swap/listings-hub/useListingsHubData";
import { mapListing, mapUser } from "@/lib/data/mapConvex";
import { BROWSE_ROUTE } from "@/lib/ui/routes";
import { collegeToSlug } from "@/lib/data/collegeSlug";
import { useNowMs } from "@/lib/hooks/useNowMs";
import type { FeedItem } from "@/lib/data/feed";
import type { Listing } from "@/lib/data/types";
import type { User } from "@/lib/auth/types";
import { FeedRow } from "./FeedRow";
import { FeedHeader } from "./FeedHeader";
import { PartyInvites } from "./PartyInvites";
import { FeedSidebar, NextFormalCard, whenLabel, type NextFormal } from "./FeedSidebar";
import { NeedsAttention } from "./NeedsAttention";
import { WeekFormals } from "./WeekFormals";
import { BackToTop } from "@/components/ui/BackToTop";
import { EmptyState } from "@/components/ui/EmptyState";
import { InviteFriendsButton } from "@/components/invites/InviteFriendsButton";
import { PeopleYouMayKnow } from "@/components/invites/PeopleYouMayKnow";
import { FeedSkeleton } from "@/components/ui/Loading";
import { ShallowLink } from "@/components/ui/ShallowLink";

export function FeedTab() {
  const searchParams = useSearchParams();
  const scope: "forYou" | "following" =
    searchParams.get("feed") === "following" ? "following" : "forYou";
  const raw = useQuery(api.feed.getCampusFeed, { scope });
  const { user } = useAuth();
  const { listings, getUser, getListing } = useData();
  const router = useRouter();
  const hub = useListingsHubData();
  const nowMs = useNowMs();
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
      <FeedSkeleton />
    ) : items.length === 0 && scope === "following" ? (
      <div className="mt-3 flex flex-col gap-3">
        <EmptyState icon="users" title="Nothing from people you follow yet" />
        <div className="flex justify-center">
          <InviteFriendsButton variant="ink" />
        </div>
        <PeopleYouMayKnow limit={10} />
      </div>
    ) : items.length === 0 ? (
      <EmptyState
        className="mt-3"
        icon="calendar"
        title="Nothing here yet"
        action={{ label: "Browse formals", href: BROWSE_ROUTE }}
      />
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

  const openBubble = (bubble: { college: string; listingIds: string[] }) => {
    if (bubble.listingIds.length > 1) {
      router.push(`/college/${collegeToSlug(bubble.college)}?section=listings`);
      return;
    }
    const listing = getListing(bubble.listingIds[0]);
    if (listing) {
      setOpen({ listing, owner: getUser(listing.ownerUserId) ?? null });
    } else {
      router.push(`/?tab=browse&listing=${bubble.listingIds[0]}`);
    }
  };

  const tabCls = (on: boolean) =>
    `-mb-[1.5px] cursor-pointer border-b-[2.5px] py-2 text-sm transition-colors ${
      on
        ? "border-[var(--ink)] font-bold text-[var(--ink)]"
        : "border-transparent text-[var(--ink-muted)] hover:text-[var(--ink)]"
    }`;

  return (
    <div className="mx-auto w-full max-w-[1000px]">
      <div className="lg:grid lg:grid-cols-[minmax(0,600px)_300px] lg:items-start lg:justify-center lg:gap-10">
        <main className="mx-auto flex w-full max-w-[600px] flex-col gap-4 lg:mx-0 lg:max-w-none">
          {user ? (
            <FeedHeader firstName={user.name.split(" ")[0] || user.name} />
          ) : null}

          <WeekFormals onOpen={openBubble} />

          {user ? <PartyInvites /> : null}

          {/* Phones: next formal (with what needs you) above the stream */}
          {nextFormal ? (
            <div className="lg:hidden">
              <NextFormalCard nextFormal={nextFormal} attentionCount={attentionCount} />
            </div>
          ) : attentionCount > 0 ? (
            <div className="lg:hidden">
              <NeedsAttention hub={hub} />
            </div>
          ) : null}

          <div>
            {user ? (
              <div data-feed-tabs className="mb-2 flex gap-5 border-b-[1.5px] border-[color-mix(in_srgb,var(--ink)_12%,transparent)]">
                <ShallowLink href="/" scroll={false} className={tabCls(scope === "forYou")}>
                  For you
                </ShallowLink>
                <ShallowLink href="/?feed=following" scroll={false} className={tabCls(scope === "following")}>
                  Following
                </ShallowLink>
              </div>
            ) : null}
            {scope === "forYou" && raw?.wishlistEmpty ? (
              <Link
                href="/?tab=mine&edit=1"
                className="mb-2 mt-3 flex items-center justify-between gap-3 rounded-2xl border-[1.5px] border-[color-mix(in_srgb,var(--ink)_14%,transparent)] bg-[var(--paper)] px-4 py-3 text-sm transition-colors hover:border-[var(--ink)]"
              >
                <span>Pick the colleges you want to go to</span>
                <span className="font-bold text-[var(--accent)]">Choose</span>
              </Link>
            ) : null}
            {stream}
          </div>
        </main>

        {user ? (
          <aside className="hidden lg:sticky lg:top-[calc(var(--app-nav-height)+1rem)] lg:block">
            <FeedSidebar hub={hub} nextFormal={nextFormal} />
          </aside>
        ) : null}
      </div>

      <BackToTop />

      <ListingDetailModal
        open={open !== null}
        onClose={() => setOpen(null)}
        listing={open?.listing ?? null}
        owner={open?.owner ?? null}
      />
    </div>
  );
}
