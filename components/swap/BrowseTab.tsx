"use client";

import { useEffect, useMemo, useState } from "react";
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
  onNavigateToRequests: () => void;
  onSignInRequired: () => void;
};

const BROWSE_TAB_FONT_CSS = `
.browse-tab-root > section:first-of-type h1 {
  font-size: clamp(3.375rem, 9vw, 5.625rem);
  line-height: 1;
}
.browse-tab-root > section:first-of-type > p {
  font-size: 1.03125rem;
  line-height: 1.45;
}
@media (min-width: 640px) {
  .browse-tab-root > section:first-of-type > p {
    font-size: 1.21875rem;
  }
}
.browse-tab-root > section:first-of-type button {
  font-size: 0.84375rem;
}
.browse-tab-root > section:nth-of-type(2) .text-4xl {
  font-size: 2.4375rem;
}
.browse-tab-root > section:nth-of-type(2) .text-sm {
  font-size: 0.796875rem;
}
.browse-tab-root > div.flex-wrap button {
  font-size: 0.796875rem;
}
`;

export function BrowseTab({
  onNavigateToMine,
  onNavigateToRequests,
  onSignInRequired,
}: Props) {
  const { user, isAuthenticated } = useAuth();
  const {
    listings,
    requestSwap,
    getUser,
  } = useData();

  const [collegeFilter, setCollegeFilter] = useState<string | null>(null);
  const [requestTarget, setRequestTarget] = useState<Listing | null>(null);

  useEffect(() => {
    const styleId = "browse-tab-type-scale";
    if (!document.getElementById(styleId)) {
      const style = document.createElement("style");
      style.id = styleId;
      style.textContent = BROWSE_TAB_FONT_CSS;
      document.head.appendChild(style);
    }
  }, []);

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

  const openSwaps = useMemo(
    () => listings.filter((l) => l.status === "active").length,
    [listings],
  );

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
    <>
      <div className="browse-tab-root flex flex-col gap-10">
        <Hero />
        <div className="flex justify-center">
          <button
            type="button"
            onClick={onNavigateToRequests}
            className="shrink-0 cursor-pointer rounded-full bg-[var(--accent)] px-8 py-3 text-base text-white transition-colors hover:bg-[var(--accent-hover)]"
          >
            + List my formal
          </button>
        </div>
        <div className="relative mx-auto flex w-full max-w-6xl flex-col items-center gap-3">
          <CollegeFilter
            active={collegeFilter}
            onChange={setCollegeFilter}
            availableColleges={availableColleges}
            className="justify-center"
          />
          <div className="lg:absolute lg:right-0 lg:top-1/2 lg:-translate-y-1/2">
            <StatsStrip openSwaps={openSwaps} />
          </div>
        </div>

        {browseListings.length === 0 ? (
          <SketchCard className="p-10 text-center text-[var(--ink-muted)] text-[0.9375rem] sm:text-[1.125rem] leading-snug">
            No open swaps here yet. Try another college or list your own formal.
          </SketchCard>
        ) : (
          <div
            data-browse-listings
            className="relative left-1/2 right-1/2 -ml-[50vw] -mr-[50vw] w-screen px-4 sm:px-6"
          >
            <div className="grid grid-cols-1 items-stretch gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
      </div>

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
    </>
  );
}
