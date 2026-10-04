"use client";

import { useMemo } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@/components/auth/useAuth";
import { useData } from "@/components/data/useData";
import { useNowMs } from "@/lib/hooks/useNowMs";
import type { Listing } from "@/lib/data/types";

export type ListingNeedingReview = {
  listing: Listing;
};

export type ListingNeedingAttendance = {
  listing: Listing;
};

/** What the feed's "Your formals" card needs: your listings and what's waiting on you. */
export function useListingsHubData() {
  const { user } = useAuth();
  const { requests, listings } = useData();
  const nowMs = useNowMs();

  const pendingReviewListingIds = useQuery(
    api.collegeReviews.getPendingReviewListingIds,
    user ? { nowMs } : "skip",
  );

  const pendingAttendanceListingIds = useQuery(
    api.formalAttendance.getPendingAttendanceListingIds,
    user ? { nowMs } : "skip",
  );

  const pendingReviewSet = useMemo(
    () => new Set((pendingReviewListingIds ?? []).map(String)),
    [pendingReviewListingIds],
  );

  const pendingAttendanceSet = useMemo(
    () => new Set((pendingAttendanceListingIds ?? []).map(String)),
    [pendingAttendanceListingIds],
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

  const listingsNeedingAttendance = useMemo((): ListingNeedingAttendance[] => {
    if (pendingAttendanceSet.size === 0) return [];
    const byId = new Map(listings.map((l) => [l.id, l]));
    const rows: ListingNeedingAttendance[] = [];
    for (const id of pendingAttendanceSet) {
      const listing = byId.get(id);
      if (listing) rows.push({ listing });
    }
    return rows.sort(
      (a, b) => +new Date(b.listing.dateTime) - +new Date(a.listing.dateTime),
    );
  }, [listings, pendingAttendanceSet]);

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

  return {
    user,
    myActiveListings,
    myBookedListings,
    pendingCountByListing,
    totalPendingIncoming,
    listingsNeedingAttendance,
    listingsNeedingReview,
  };
}
