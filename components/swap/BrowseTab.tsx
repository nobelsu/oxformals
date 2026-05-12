"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/components/auth/useAuth";
import { useData } from "@/components/data/useData";
import { Modal } from "@/components/ui/Modal";
import { SketchCard } from "@/components/ui/SketchCard";
import { CollegeFilter, MY_FORMALS_SENTINEL } from "./CollegeFilter";
import { Hero } from "./Hero";
import { ListingCard } from "./ListingCard";
import { ListingDetailModal } from "./ListingDetailModal";
import { RequestSwapModal } from "./RequestSwapModal";
import { StatsStrip } from "./StatsStrip";
import { SwapConfirmedModal } from "./SwapConfirmedModal";
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
.browse-tab-root > div.flex-col .flex-wrap button {
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
    wishlist,
    requestSwap,
    getUser,
    getListing,
  } = useData();

  const [collegeFilter, setCollegeFilter] = useState<string | null>(null);
  const [defaultApplied, setDefaultApplied] = useState(false);
  const [detailListing, setDetailListing] = useState<Listing | null>(null);
  const [requestTarget, setRequestTarget] = useState<Listing | null>(null);
  const [showNoListingPrompt, setShowNoListingPrompt] = useState(false);
  const [confirmed, setConfirmed] = useState<{
    mine: Listing | null;
    theirs: Listing | null;
    otherUserId: string | null;
  } | null>(null);

  useEffect(() => {
    if (defaultApplied) return;
    if (isAuthenticated && wishlist.length > 0) {
      setCollegeFilter(MY_FORMALS_SENTINEL);
      setDefaultApplied(true);
    }
  }, [isAuthenticated, wishlist, defaultApplied]);

  useEffect(() => {
    if (!isAuthenticated && collegeFilter === MY_FORMALS_SENTINEL) {
      setCollegeFilter(null);
    }
  }, [isAuthenticated, collegeFilter]);

  useEffect(() => {
    const styleId = "browse-tab-type-scale";
    if (!document.getElementById(styleId)) {
      const style = document.createElement("style");
      style.id = styleId;
      style.textContent = BROWSE_TAB_FONT_CSS;
      document.head.appendChild(style);
    }
  }, []);

  const wishlistSet = useMemo(() => new Set(wishlist), [wishlist]);

  const browseListings = useMemo(
    () =>
      listings
        .filter((l) => l.status === "active")
        .filter((l) => !user || l.ownerUserId !== user.id)
        .filter((l) => {
          if (!collegeFilter) return true;
          if (collegeFilter === MY_FORMALS_SENTINEL)
            return wishlistSet.has(l.college);
          return l.college === collegeFilter;
        })
        .sort((a, b) => +new Date(a.dateTime) - +new Date(b.dateTime)),
    [listings, user, collegeFilter, wishlistSet],
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
      setShowNoListingPrompt(true);
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
        <div className="mx-auto flex w-full max-w-6xl flex-col items-center gap-2">
          <CollegeFilter
            active={collegeFilter}
            onChange={setCollegeFilter}
            availableColleges={availableColleges}
            wishlist={wishlist}
            isAuthenticated={isAuthenticated}
            className="justify-center"
          />
          <StatsStrip openSwaps={openSwaps} />
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
              const members = (l.members ?? [])
                .filter((mid) => mid !== l.ownerUserId)
                .map(getUser)
                .filter((u): u is NonNullable<typeof u> => !!u);
              return (
                <ListingCard
                  key={l.id}
                  listing={l}
                  owner={owner}
                  memberUsers={members}
                  onPress={() => setDetailListing(l)}
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

      <ListingDetailModal
        open={!!detailListing}
        onClose={() => setDetailListing(null)}
        listing={detailListing}
        owner={detailListing ? getUser(detailListing.ownerUserId) ?? null : null}
        memberUsers={
          detailListing
            ? (detailListing.members ?? [])
                .filter((mid) => mid !== detailListing.ownerUserId)
                .map(getUser)
                .filter((u): u is NonNullable<typeof u> => !!u)
            : []
        }
        onRequest={() => {
          if (detailListing) handleRequestClick(detailListing);
        }}
        disabled={!isAuthenticated}
        disabledLabel={isAuthenticated ? undefined : "Sign in to request"}
        hideInterests
      />

      <RequestSwapModal
        open={!!requestTarget}
        onClose={() => setRequestTarget(null)}
        targetListing={requestTarget}
        myListings={myActiveListings}
        onSubmit={async ({ offeringListingId, message }) => {
          if (!requestTarget) return;
          const result = await requestSwap({
            targetListingId: requestTarget.id,
            offeringListingId,
            message,
          });
          setRequestTarget(null);
          if (result?.status === "accepted") {
            setConfirmed({
              mine: getListing(offeringListingId) ?? null,
              theirs: getListing(requestTarget.id) ?? null,
              otherUserId: requestTarget.ownerUserId,
            });
          }
        }}
      />

      <SwapConfirmedModal
        open={!!confirmed}
        onClose={() => setConfirmed(null)}
        myListing={confirmed?.mine ?? null}
        theirListing={confirmed?.theirs ?? null}
        otherUser={
          confirmed?.otherUserId ? (getUser(confirmed.otherUserId) ?? null) : null
        }
      />

      <Modal
        open={showNoListingPrompt}
        onClose={() => setShowNoListingPrompt(false)}
        title="List your formal first"
        panelClassName="max-w-sm"
      >
        <p className="mb-6 text-sm leading-relaxed text-[var(--ink-muted)]">
          You need to list your own formal before you can request a swap.
        </p>
        <button
          type="button"
          onClick={() => {
            setShowNoListingPrompt(false);
            onNavigateToRequests();
          }}
          className="w-full cursor-pointer rounded-full bg-[var(--accent)] px-8 py-3 text-sm text-white transition-colors hover:bg-[var(--accent-hover)]"
        >
          + List my formal
        </button>
      </Modal>
    </>
  );
}
