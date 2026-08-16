"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useMemo, useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@/components/auth/useAuth";
import { useData } from "@/components/data/useData";
import { Modal } from "@/components/ui/Modal";
import { ListingDayList } from "@/components/swap/ListingDayList";
import { ListingRow } from "@/components/swap/ListingRow";
import { ListingDetailModal } from "@/components/swap/ListingDetailModal";
import { BlockingRequestModal } from "@/components/swap/BlockingRequestModal";
import { RequestPayModal } from "@/components/swap/RequestPayModal";
import { RequestSwapModal } from "@/components/swap/RequestSwapModal";
import { RequestTypeChooserModal } from "@/components/swap/RequestTypeChooserModal";
import { SwapConfirmedModal } from "@/components/swap/SwapConfirmedModal";
import { collegeToSlug } from "@/lib/data/collegeSlug";
import { findBlockingOutgoingRequestForTarget } from "@/lib/data/requestFilters";
import { listingSupportsSwap } from "@/lib/data/listingType";
import { mapConvexListing } from "@/lib/data/mapConvexListing";
import type { Listing, RequestType } from "@/lib/data/types";

type Props = {
  college: string;
};

export function CollegeListingsSection({ college }: Props) {
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();
  const { listings: allListings, requests, getUser, getListing, sendRequest } =
    useData();

  const rawListings = useQuery(api.listings.listActiveListingsForCollege, {
    college,
  });

  const [detailListing, setDetailListing] = useState<Listing | null>(null);
  const [typeChooserTarget, setTypeChooserTarget] = useState<Listing | null>(
    null,
  );
  const [requestTarget, setRequestTarget] = useState<Listing | null>(null);
  const [pendingRequestType, setPendingRequestType] =
    useState<RequestType | null>(null);
  const [blockingRequestOpen, setBlockingRequestOpen] = useState(false);
  const [blockingHasAccepted, setBlockingHasAccepted] = useState(false);
  const [showNoListingPrompt, setShowNoListingPrompt] = useState(false);
  const [confirmed, setConfirmed] = useState<{
    requestType: RequestType;
    mine: Listing | null;
    theirs: Listing | null;
    otherUserId: string | null;
  } | null>(null);

  const collegeSlug = collegeToSlug(college);
  const loginNext = `/college/${collegeSlug}?section=listings`;

  const openListings = useMemo(() => {
    if (rawListings === undefined) return undefined;
    const now = Date.now();
    return rawListings
      .map(mapConvexListing)
      .filter((l) => Date.parse(l.dateTime) > now)
      .filter((l) => !user || l.ownerUserId !== user.id);
  }, [rawListings, user]);

  const myActiveListings = useMemo(
    () =>
      user
        ? allListings.filter(
            (l) =>
              l.ownerUserId === user.id &&
              l.status === "active" &&
              listingSupportsSwap(l.listingType),
          )
        : [],
    [allListings, user],
  );

  const openRequestFlow = useCallback(
    (listing: Listing, requestType: RequestType) => {
      if (user) {
        const blocking = findBlockingOutgoingRequestForTarget(
          requests,
          user.id,
          listing.id,
        );
        if (blocking) {
          setBlockingHasAccepted(blocking.status === "accepted");
          setBlockingRequestOpen(true);
          return;
        }
      }
      if (requestType === "swap" && myActiveListings.length === 0) {
        setShowNoListingPrompt(true);
        return;
      }
      setPendingRequestType(requestType);
      setRequestTarget(listing);
    },
    [user, requests, myActiveListings.length],
  );

  const handleRequestClick = useCallback(
    (listing: Listing) => {
      if (!isAuthenticated) {
        router.push(`/login?next=${encodeURIComponent(loginNext)}`);
        return;
      }
      if (listing.listingType === "both") {
        setTypeChooserTarget(listing);
        return;
      }
      if (listing.listingType === "pay") {
        openRequestFlow(listing, "pay");
        return;
      }
      openRequestFlow(listing, "swap");
    },
    [isAuthenticated, router, loginNext, openRequestFlow],
  );

  const handleRequestTypeChosen = useCallback(
    (requestType: RequestType) => {
      if (!typeChooserTarget) return;
      const target = typeChooserTarget;
      setTypeChooserTarget(null);
      openRequestFlow(target, requestType);
    },
    [typeChooserTarget, openRequestFlow],
  );

  const listingDisabled = !isAuthenticated;

  if (openListings === undefined) {
    return <p className="text-[var(--ink-muted)]">Loading listings…</p>;
  }

  if (openListings.length === 0) {
    return (
      <p className="text-[var(--ink-muted)]">
        No open listings for {college} right now.
      </p>
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
              hideInterests
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
        hideInterests
        disabledLabel={!isAuthenticated ? "Sign in to request" : undefined}
      />

      <RequestTypeChooserModal
        open={!!typeChooserTarget}
        onClose={() => setTypeChooserTarget(null)}
        college={typeChooserTarget?.college ?? college}
        onChoose={handleRequestTypeChosen}
      />

      <RequestSwapModal
        open={!!requestTarget && pendingRequestType === "swap"}
        onClose={() => {
          setRequestTarget(null);
          setPendingRequestType(null);
        }}
        targetListing={requestTarget}
        myListings={myActiveListings}
        onSubmit={async ({ offeringListingId, message }) => {
          if (!requestTarget) return;
          const result = await sendRequest({
            requestType: "swap",
            targetListingId: requestTarget.id,
            offeringListingId,
            message,
            targetOwnerUserId: requestTarget.ownerUserId,
          });
          if (!result) throw new Error("Could not send request.");
          setRequestTarget(null);
          setPendingRequestType(null);
          if (result.status === "accepted") {
            setConfirmed({
              requestType: "swap",
              mine: getListing(offeringListingId) ?? null,
              theirs: getListing(requestTarget.id) ?? requestTarget,
              otherUserId: requestTarget.ownerUserId,
            });
          }
        }}
      />

      <RequestPayModal
        open={!!requestTarget && pendingRequestType === "pay"}
        onClose={() => {
          setRequestTarget(null);
          setPendingRequestType(null);
        }}
        targetListing={requestTarget}
        onSubmit={async ({ message }) => {
          if (!requestTarget) return;
          const result = await sendRequest({
            requestType: "pay",
            targetListingId: requestTarget.id,
            message,
            targetOwnerUserId: requestTarget.ownerUserId,
          });
          if (!result) throw new Error("Could not send request.");
          setRequestTarget(null);
          setPendingRequestType(null);
          if (result.status === "accepted") {
            setConfirmed({
              requestType: "pay",
              mine: null,
              theirs: getListing(requestTarget.id) ?? requestTarget,
              otherUserId: requestTarget.ownerUserId,
            });
          }
        }}
      />

      <SwapConfirmedModal
        open={!!confirmed}
        onClose={() => setConfirmed(null)}
        requestType={confirmed?.requestType ?? "swap"}
        myListing={confirmed?.mine ?? null}
        theirListing={confirmed?.theirs ?? null}
        otherUser={
          confirmed?.otherUserId ? (getUser(confirmed.otherUserId) ?? null) : null
        }
        otherUserId={confirmed?.otherUserId ?? null}
      />

      <BlockingRequestModal
        open={blockingRequestOpen}
        onClose={() => setBlockingRequestOpen(false)}
        hasAccepted={blockingHasAccepted}
        onViewRequests={() => router.push("/?tab=requests")}
      />

      <Modal
        open={showNoListingPrompt}
        onClose={() => setShowNoListingPrompt(false)}
        title="List your formal first"
        panelClassName="max-w-sm"
      >
        <p className="mb-6 text-sm leading-relaxed text-[var(--ink-muted)]">
          You need an active swap listing before you can request a swap. Pay-only
          listings cannot be used in swaps.
        </p>
        <Link
          href="/?tab=requests&openList=1"
          className="flex w-full cursor-pointer items-center justify-center rounded-full bg-[var(--accent)] px-8 py-3 text-sm text-white transition-colors hover:bg-[var(--accent-hover)]"
          onClick={() => setShowNoListingPrompt(false)}
        >
          + List my formal
        </Link>
      </Modal>
    </>
  );
}
