"use client";

import { useMemo, useState } from "react";
import { useAuth } from "@/components/auth/useAuth";
import { useData } from "@/components/data/useData";
import { SketchCard } from "@/components/ui/SketchCard";
import { CollegeFilter } from "./CollegeFilter";
import { Hero } from "./Hero";
import { ListingCard } from "./ListingCard";
import { RequestSwapModal } from "./RequestSwapModal";
import { StatsStrip } from "./StatsStrip";
import type { Listing } from "@/lib/data/types";

type Props = {
  onNavigateToMine: () => void;
  onSignInRequired: () => void;
};

export function BrowseTab({ onNavigateToMine, onSignInRequired }: Props) {
  const { user, isAuthenticated } = useAuth();
  const {
    users,
    listings,
    requestSwap,
    getUser,
  } = useData();

  const [collegeFilter, setCollegeFilter] = useState<string | null>(null);
  const [requestTarget, setRequestTarget] = useState<Listing | null>(null);

  const browseListings = useMemo(
    () =>
      listings
        .filter((l) => l.status === "active")
        .filter((l) => !user || l.ownerUserId !== user.id)
        .filter((l) => !collegeFilter || l.college === collegeFilter)
        .sort((a, b) => +new Date(a.dateTime) - +new Date(b.dateTime)),
    [listings, user, collegeFilter],
  );

  const myActiveListings = useMemo(
    () =>
      user
        ? listings.filter(
            (l) => l.ownerUserId === user.id && l.status === "active",
          )
        : [],
    [listings, user],
  );

  const stats = useMemo(() => {
    const active = listings.filter((l) => l.status === "active");
    return {
      people: users.length,
      openSwaps: active.length,
      colleges: new Set(active.map((l) => l.college)).size,
    };
  }, [users, listings]);

  const availableColleges = useMemo(
    () =>
      Array.from(
        new Set(
          listings
            .filter((l) => l.status === "active")
            .map((l) => l.college),
        ),
      ),
    [listings],
  );

  function handleRequestClick(listing: Listing) {
    if (!isAuthenticated) {
      onSignInRequired();
      return;
    }
    if (myActiveListings.length === 0) {
      onNavigateToMine();
      return;
    }
    setRequestTarget(listing);
  }

  return (
    <div className="flex flex-col gap-8">
      <Hero onList={onNavigateToMine} />
      <StatsStrip
        people={stats.people}
        openSwaps={stats.openSwaps}
        colleges={stats.colleges}
      />
      <CollegeFilter
        active={collegeFilter}
        onChange={setCollegeFilter}
        availableColleges={availableColleges}
      />

      {browseListings.length === 0 ? (
        <SketchCard className="p-8 text-center text-[var(--ink-muted)]">
          No open swaps here yet. Try another college or list your own formal.
        </SketchCard>
      ) : (
        <div className="relative left-1/2 right-1/2 -ml-[50vw] -mr-[50vw] w-screen px-4 sm:px-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {browseListings.map((l) => {
              const owner = getUser(l.ownerUserId);
              if (!owner) return null;
              return (
                <ListingCard
                  key={l.id}
                  listing={l}
                  owner={owner}
                  onRequest={() => handleRequestClick(l)}
                  disabled={!isAuthenticated}
                  disabledLabel={isAuthenticated ? undefined : "Sign in to request"}
                />
              );
            })}
          </div>
        </div>
      )}

      <RequestSwapModal
        open={!!requestTarget}
        onClose={() => setRequestTarget(null)}
        targetListing={requestTarget}
        myListings={myActiveListings}
        onSubmit={({ offeringListingId, message }) => {
          if (!requestTarget) return;
          requestSwap({
            targetListingId: requestTarget.id,
            offeringListingId,
            message,
          });
          setRequestTarget(null);
        }}
      />
    </div>
  );
}
