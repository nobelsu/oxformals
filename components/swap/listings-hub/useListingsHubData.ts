"use client";

import { useMemo } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@/components/auth/useAuth";
import { useData } from "@/components/data/useData";
import { listingIsPast } from "@/lib/data/collegeReviewEligibility";
import { outgoingPayRequests } from "@/lib/data/requestFilters";
import { useNowMs } from "@/lib/hooks/useNowMs";
import type { Listing } from "@/lib/data/types";

export type ListingNeedingReview = {
  listing: Listing;
};

export type ListingNeedingRequests = {
  listing: Listing;
  pendingCount: number;
};

export function useListingsHubData() {
  const { user } = useAuth();
  const { requests, listings } = useData();
  const nowMs = useNowMs();

  const pendingReviewListingIds = useQuery(
    api.collegeReviews.getPendingReviewListingIds,
    user ? { nowMs } : "skip",
  );

  const pendingReviewSet = useMemo(
    () => new Set((pendingReviewListingIds ?? []).map(String)),
    [pendingReviewListingIds],
  );

  const myListings = useMemo(
    () => (user ? listings.filter((l) => l.ownerUserId === user.id) : []),
    [listings, user],
  );

  const myActiveListings = useMemo(
    () => myListings.filter((l) => l.status === "active"),
    [myListings],
  );

  const myBookedListings = useMemo(
    () =>
      myListings
        .filter(
          (l) =>
            l.status === "confirmed" ||
            l.status === "closed" ||
            l.status === "expired",
        )
        .sort((a, b) => +new Date(b.dateTime) - +new Date(a.dateTime)),
    [myListings],
  );

  const pendingCountByListing = useMemo(() => {
    const map = new Map<string, number>();
    for (const r of requests) {
      if (r.status !== "pending") continue;
      if (!user || r.toUserId !== user.id) continue;
      map.set(r.targetListingId, (map.get(r.targetListingId) ?? 0) + 1);
    }
    return map;
  }, [requests, user]);

  const totalPendingIncoming = useMemo(() => {
    let sum = 0;
    for (const count of pendingCountByListing.values()) sum += count;
    return sum;
  }, [pendingCountByListing]);

  const myPayRequests = useMemo(
    () =>
      user
        ? outgoingPayRequests(requests, user.id).sort(
            (a, b) => b.createdAt - a.createdAt,
          )
        : [],
    [requests, user],
  );

  const pendingPayRequestCount = useMemo(
    () => myPayRequests.filter((r) => r.status === "pending").length,
    [myPayRequests],
  );

  const attendedPastListings = useMemo(() => {
    if (!user) return [];
    return listings
      .filter(
        (l) =>
          l.members.includes(user.id) &&
          l.ownerUserId !== user.id &&
          listingIsPast(l.dateTime, nowMs),
      )
      .sort((a, b) => +new Date(b.dateTime) - +new Date(a.dateTime));
  }, [listings, user, nowMs]);

  const listingsNeedingReview = useMemo((): ListingNeedingReview[] => {
    if (pendingReviewSet.size === 0) return [];
    const byId = new Map(listings.map((l) => [l.id, l]));
    const rows: ListingNeedingReview[] = [];
    for (const id of pendingReviewSet) {
      const listing = byId.get(id);
      if (listing) rows.push({ listing });
    }
    return rows.sort(
      (a, b) => +new Date(b.listing.dateTime) - +new Date(a.listing.dateTime),
    );
  }, [listings, pendingReviewSet]);

  const listingsNeedingRequests = useMemo((): ListingNeedingRequests[] => {
    const rows: ListingNeedingRequests[] = [];
    for (const listing of myActiveListings) {
      const pendingCount = pendingCountByListing.get(listing.id) ?? 0;
      if (pendingCount > 0) rows.push({ listing, pendingCount });
    }
    return rows.sort((a, b) => b.pendingCount - a.pendingCount);
  }, [myActiveListings, pendingCountByListing]);

  const hasNeedsAttention =
    listingsNeedingReview.length > 0 || listingsNeedingRequests.length > 0;

  const overviewAttentionCount =
    listingsNeedingReview.length + totalPendingIncoming;

  const myListingsUnreadCount = useMemo(() => {
    const ownedReviews = myBookedListings.filter((l) =>
      pendingReviewSet.has(l.id),
    ).length;
    return totalPendingIncoming + ownedReviews;
  }, [myBookedListings, pendingReviewSet, totalPendingIncoming]);

  const attendedUnreadCount = useMemo(
    () =>
      attendedPastListings.filter((l) => pendingReviewSet.has(l.id)).length,
    [attendedPastListings, pendingReviewSet],
  );

  const myListingsCount = myActiveListings.length + myBookedListings.length;

  return {
    user,
    pendingReviewSet,
    myActiveListings,
    myBookedListings,
    myPayRequests,
    attendedPastListings,
    pendingCountByListing,
    totalPendingIncoming,
    pendingPayRequestCount,
    listingsNeedingReview,
    listingsNeedingRequests,
    hasNeedsAttention,
    overviewAttentionCount,
    myListingsUnreadCount,
    attendedUnreadCount,
    myListingsCount,
    formalsToReviewCount: pendingReviewSet.size,
  };
}
