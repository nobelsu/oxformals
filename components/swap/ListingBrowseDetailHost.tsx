"use client";

import { useRouter } from "next/navigation";
import { useCallback, useMemo, useState } from "react";
import { useAuth } from "@/components/auth/useAuth";
import { useData } from "@/components/data/useData";
import { Modal } from "@/components/ui/Modal";
import { BlockingRequestModal } from "@/components/swap/BlockingRequestModal";
import { ListingDetailModal } from "@/components/swap/ListingDetailModal";
import { RequestPayModal } from "@/components/swap/RequestPayModal";
import { RequestSwapModal } from "@/components/swap/RequestSwapModal";
import { RequestTypeChooserModal } from "@/components/swap/RequestTypeChooserModal";
import { SwapConfirmedModal } from "@/components/swap/SwapConfirmedModal";
import { listingSupportsSwap } from "@/lib/data/listingType";
import { findBlockingOutgoingRequestForTarget } from "@/lib/data/requestFilters";
import type { Listing, RequestType } from "@/lib/data/types";

type Props = {
  listingId: string | null;
  open: boolean;
  onClose: () => void;
};

export function ListingBrowseDetailHost({ listingId, open, onClose }: Props) {
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();
  const { listings, requests, getUser, getListing, sendRequest } = useData();

  const [requestTarget, setRequestTarget] = useState<Listing | null>(null);
  const [pendingRequestType, setPendingRequestType] = useState<RequestType | null>(
    null,
  );
  const [typeChooserTarget, setTypeChooserTarget] = useState<Listing | null>(null);
  const [showNoListingPrompt, setShowNoListingPrompt] = useState(false);
  const [blockingRequestOpen, setBlockingRequestOpen] = useState(false);
  const [blockingHasAccepted, setBlockingHasAccepted] = useState(false);
  const [confirmed, setConfirmed] = useState<{
    requestType: RequestType;
    mine: Listing | null;
    theirs: Listing | null;
    otherUserId: string | null;
  } | null>(null);

  const listing = listingId ? (getListing(listingId) ?? null) : null;
  const isOwnListing = !!(user && listing && listing.ownerUserId === user.id);

  const myActiveListings = useMemo(
    () =>
      user
        ? listings.filter(
            (l) =>
              l.ownerUserId === user.id &&
              l.status === "active" &&
              listingSupportsSwap(l.listingType),
          )
        : [],
    [listings, user],
  );

  const openRequestFlow = useCallback(
    (target: Listing, requestType: RequestType) => {
      if (user) {
        const blocking = findBlockingOutgoingRequestForTarget(
          requests,
          user.id,
          target.id,
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
      setRequestTarget(target);
    },
    [user, requests, myActiveListings.length],
  );

  const handleRequestClick = useCallback(
    (target: Listing) => {
      if (!isAuthenticated) {
        router.push("/login?next=/");
        return;
      }
      if (target.listingType === "both") {
        setTypeChooserTarget(target);
        return;
      }
      if (target.listingType === "pay") {
        openRequestFlow(target, "pay");
        return;
      }
      openRequestFlow(target, "swap");
    },
    [isAuthenticated, openRequestFlow, router],
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

  const memberUsers = useMemo(
    () =>
      listing
        ? listing.members
            .filter((mid) => mid !== listing.ownerUserId)
            .map(getUser)
            .filter((u): u is NonNullable<typeof u> => !!u)
        : [],
    [listing, getUser],
  );

  return (
    <>
      <ListingDetailModal
        open={open && !!listing}
        onClose={onClose}
        listing={listing}
        owner={listing ? (getUser(listing.ownerUserId) ?? null) : null}
        memberUsers={memberUsers}
        onRequest={
          listing && !isOwnListing ? () => handleRequestClick(listing) : undefined
        }
        disabled={!isAuthenticated}
        disabledLabel={isAuthenticated ? undefined : "Sign in to request"}
        hideInterests
      />

      <RequestTypeChooserModal
        open={!!typeChooserTarget}
        onClose={() => setTypeChooserTarget(null)}
        college={typeChooserTarget?.college ?? ""}
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
        requests={requests}
        userId={user?.id}
        onSubmit={async ({ offeringListingId, message }) => {
          if (!requestTarget) return;
          const result = await sendRequest({
            requestType: "swap",
            targetListingId: requestTarget.id,
            offeringListingId,
            message,
          });
          if (!result) throw new Error("Could not send request.");
          setRequestTarget(null);
          setPendingRequestType(null);
          if (result.status === "accepted") {
            setConfirmed({
              requestType: "swap",
              mine: getListing(offeringListingId) ?? null,
              theirs: getListing(requestTarget.id) ?? null,
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
          });
          if (!result) throw new Error("Could not send request.");
          setRequestTarget(null);
          setPendingRequestType(null);
          if (result.status === "accepted") {
            setConfirmed({
              requestType: "pay",
              mine: null,
              theirs: getListing(requestTarget.id) ?? null,
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
        <button
          type="button"
          onClick={() => {
            setShowNoListingPrompt(false);
            router.push("/?tab=requests&openList=1");
          }}
          className="w-full cursor-pointer rounded-full bg-[var(--accent)] px-8 py-3 text-sm text-white transition-colors hover:bg-[var(--accent-hover)]"
        >
          + List my formal
        </button>
      </Modal>
    </>
  );
}
