"use client";

import { useRouter } from "next/navigation";
import { useCallback, useMemo, useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@/components/auth/useAuth";
import { useData } from "@/components/data/useData";
import { ListingDayList } from "@/components/swap/ListingDayList";
import { ListingRow } from "@/components/swap/ListingRow";
import { ListingDetailModal } from "@/components/swap/ListingDetailModal";
import { JoinRequestFlow } from "@/components/swap/JoinRequestFlow";
import { collegeToSlug } from "@/lib/data/collegeSlug";
import { mapListing, mapUser } from "@/lib/data/mapConvex";
import type { Listing } from "@/lib/data/types";
import { EmptyState } from "@/components/ui/EmptyState";
import { SkeletonRows } from "@/components/ui/Loading";

type Props = {
  college: string;
};

export function CollegeListingsSection({ college }: Props) {
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();
  const { getUser: getKnownUser } = useData();

  const rawListings = useQuery(api.listings.listActiveListingsForCollege, {
    college,
  });
  // Signed out, the app knows nobody: fetch just this page's hosts.
  const signedOutHosts = useQuery(
    api.listings.listActiveHostsForCollege,
    isAuthenticated ? "skip" : { college },
  );
  const getUser = useCallback(
    (userId: string) => {
      const known = getKnownUser(userId);
      if (known) return known;
      const host = signedOutHosts?.find((h) => h._id === userId);
      return host ? mapUser(host) : undefined;
    },
    [getKnownUser, signedOutHosts],
  );

  const [detailListing, setDetailListing] = useState<Listing | null>(null);
  const [joinTarget, setJoinTarget] = useState<Listing | null>(null);

  const collegeSlug = collegeToSlug(college);
  const loginNext = `/college/${collegeSlug}?section=listings`;

  const openListings = useMemo(() => {
    if (rawListings === undefined) return undefined;
    const now = Date.now();
    return rawListings
      .map(mapListing)
      .filter((l) => Date.parse(l.dateTime) > now)
      .filter((l) => !user || l.ownerUserId !== user.id);
  }, [rawListings, user]);

  const handleRequestClick = useCallback(
    (listing: Listing) => {
      if (!isAuthenticated) {
        router.push(`/login?next=${encodeURIComponent(loginNext)}`);
        return;
      }
      setJoinTarget(listing);
    },
    [isAuthenticated, router, loginNext],
  );

  const listingDisabled = !isAuthenticated;

  if (openListings === undefined) {
    return <SkeletonRows count={3} />;
  }

  if (openListings.length === 0) {
    return (
      <EmptyState icon="ticket" title="No open formals" />
    );
  }

  return (
    <>
      <ListingDayList
        listings={openListings}
        renderRow={(l) => {
          const owner = getUser(l.ownerUserId);
          if (!owner) return null;
          const members = l.members
            .filter((mid) => mid !== l.ownerUserId)
            .map(getUser)
            .filter((u): u is NonNullable<typeof u> => !!u);
          return (
            <ListingRow
              listing={l}
              owner={owner}
              memberUsers={members}
              title={`${owner.name.split(" ")[0]}’s table`}
              onPress={() => setDetailListing(l)}
              onRequest={() => handleRequestClick(l)}
              disabled={listingDisabled}
              disabledLabel={!isAuthenticated ? "Sign in to request" : undefined}
            />
          );
        }}
      />

      <ListingDetailModal
        open={!!detailListing}
        onClose={() => setDetailListing(null)}
        listing={detailListing}
        owner={detailListing ? getUser(detailListing.ownerUserId) ?? null : null}
        memberUsers={
          detailListing
            ? detailListing.members
                .filter((mid) => mid !== detailListing.ownerUserId)
                .map(getUser)
                .filter((u): u is NonNullable<typeof u> => !!u)
            : []
        }
        onRequest={() => {
          if (detailListing) handleRequestClick(detailListing);
        }}
        disabled={listingDisabled}
        disabledLabel={!isAuthenticated ? "Sign in to request" : undefined}
      />

      <JoinRequestFlow target={joinTarget} onClose={() => setJoinTarget(null)} />
    </>
  );
}
