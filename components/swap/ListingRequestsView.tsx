"use client";

import Link from "next/link";
import { useCallback, useMemo, useState } from "react";
import { useAuth } from "@/components/auth/useAuth";
import { useData } from "@/components/data/useData";
import { IncomingRequestRow } from "@/components/swap/IncomingRequestRow";
import { NewRequestPicker } from "@/components/swap/NewRequestPicker";
import { RequestSwapModal } from "@/components/swap/RequestSwapModal";
import { SentRequestRow } from "@/components/swap/SentRequestRow";
import { SignInGate } from "@/components/swap/SignInGate";
import { SwapConfirmedModal } from "@/components/swap/SwapConfirmedModal";
import { SketchCard } from "@/components/ui/SketchCard";
import { formatListingDate, formatYearLabel } from "@/lib/data/format";
import type { Listing } from "@/lib/data/types";

export function ListingRequestsView({ listingId }: { listingId: string }) {
  const { isAuthenticated, user } = useAuth();
  const {
    listings,
    requests,
    getUser,
    getListing,
    acceptRequest,
    declineRequest,
    withdrawRequest,
    requestSwap,
  } = useData();

  const listing = useMemo(
    () => listings.find((item) => item.id === listingId),
    [listings, listingId],
  );

  const canViewListing = !!(user && listing && listing.ownerUserId === user.id);

  const myActiveListings = useMemo(
    () =>
      user
        ? listings.filter(
            (item) => item.ownerUserId === user.id && item.status === "active",
          )
        : [],
    [listings, user],
  );

  const browseable = useMemo(
    () =>
      user
        ? listings
            .filter((item) => item.status === "active" && item.ownerUserId !== user.id)
            .sort((a, b) => +new Date(a.dateTime) - +new Date(b.dateTime))
        : [],
    [listings, user],
  );

  const incoming = useMemo(
    () =>
      user && listing
        ? [...requests]
            .filter(
              (r) => r.toUserId === user.id && r.targetListingId === listing.id,
            )
            .sort((a, b) => b.createdAt - a.createdAt)
        : [],
    [requests, user, listing],
  );

  const sent = useMemo(
    () =>
      user && listing
        ? [...requests]
            .filter(
              (r) => r.fromUserId === user.id && r.offeringListingId === listing.id,
            )
            .sort((a, b) => b.createdAt - a.createdAt)
        : [],
    [requests, user, listing],
  );

  const [pickerOpen, setPickerOpen] = useState(false);
  const [requestTarget, setRequestTarget] = useState<Listing | null>(null);
  const [confirmed, setConfirmed] = useState<{
    mine: Listing | null;
    theirs: Listing | null;
    otherUserId: string | null;
  } | null>(null);

  const handleWithdraw = useCallback(
    (requestId: string) => {
      if (
        !window.confirm(
          "Withdraw this request? It will be removed for you and the other person.",
        )
      ) {
        return;
      }
      withdrawRequest(requestId);
    },
    [withdrawRequest],
  );

  if (!isAuthenticated) {
    return (
      <main className="mx-auto flex min-h-dvh w-full max-w-5xl items-center justify-center px-4 py-8 sm:px-6">
        <SignInGate />
      </main>
    );
  }

  if (!canViewListing || !listing) {
    return (
      <main className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6">
        <SketchCard seed={7} className="p-8">
          <h2 className="font-display text-3xl uppercase tracking-wide">
            Listing not found
          </h2>
          <p className="mt-2 text-[var(--ink-muted)]">
            That listing does not exist or is not yours.
          </p>
          <Link
            href="/?tab=requests"
            className="mt-5 inline-flex rounded-full border-[2px] border-[var(--ink)] px-4 py-1.5 text-sm text-[var(--ink)] transition-colors hover:bg-[var(--ink)] hover:text-[var(--bg)]"
          >
            Back to Requests
          </Link>
        </SketchCard>
      </main>
    );
  }

  const statusMap: Record<Listing["status"], string> = {
    active: "Active",
    confirmed: "Swap confirmed",
    closed: "Closed",
  };

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-4 py-8 sm:px-6">
      <div className="flex items-center gap-3">
        <Link
          href="/?tab=requests"
          className="rounded-full border-[2px] border-[var(--ink)] px-4 py-1.5 text-sm text-[var(--ink)] transition-colors hover:bg-[var(--ink)] hover:text-[var(--bg)]"
        >
          Back to active listings
        </Link>
      </div>

      <SketchCard seed={listing.id.length} className="p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <h1 className="font-display text-3xl uppercase tracking-wide">
            {listing.college}
          </h1>
          <span className="rounded-full border-[2px] border-[var(--ink)] px-3 py-0.5 text-xs">
            {statusMap[listing.status]}
          </span>
        </div>
        <p className="mt-2 text-[var(--ink-muted)]">
          {formatListingDate(listing.dateTime)} · {listing.seats}{" "}
          {listing.seats === 1 ? "seat" : "seats"}
        </p>
        <p className="mt-1 text-sm text-[var(--ink-soft)]">
          {[formatYearLabel(listing.year) || listing.year, listing.role]
            .filter(Boolean)
            .join(" · ")}
        </p>
        {listing.message ? (
          <p className="mt-4 text-sm italic text-[var(--ink-soft)]">“{listing.message}”</p>
        ) : null}
      </SketchCard>

      <div className="grid grid-cols-1 items-start gap-10 md:grid-cols-2 md:gap-8 lg:gap-12">
        <section className="min-w-0">
          <h2 className="font-display text-3xl uppercase tracking-wide">
            Incoming requests
          </h2>
          {incoming.length === 0 ? (
            <p className="mt-2 text-[var(--ink-muted)]">No requests for this listing yet.</p>
          ) : (
            <div className="mt-4 flex flex-col gap-3">
              {incoming.map((r) => {
                const fromUser = getUser(r.fromUserId);
                if (!fromUser) return null;
                return (
                  <IncomingRequestRow
                    key={r.id}
                    request={r}
                    fromUser={fromUser}
                    offeringListing={getListing(r.offeringListingId)}
                    onAccept={() => {
                      if (
                        !window.confirm(
                          "Accept this swap? Both formals will show as confirmed and other overlapping requests will be declined.",
                        )
                      ) {
                        return;
                      }
                      const updated = acceptRequest(r.id);
                      if (!updated) return;
                      setConfirmed({
                        mine: getListing(r.targetListingId) ?? null,
                        theirs: getListing(r.offeringListingId) ?? null,
                        otherUserId: r.fromUserId,
                      });
                    }}
                    onDecline={() => {
                      if (!window.confirm("Decline this swap request?")) return;
                      declineRequest(r.id);
                    }}
                  />
                );
              })}
            </div>
          )}
        </section>

        <section className="min-w-0">
          <h2 className="font-display text-3xl uppercase tracking-wide">
            Requests I&apos;ve sent
          </h2>
          {sent.length === 0 ? (
            <p className="mt-2 text-[var(--ink-muted)]">
              No outgoing requests from this listing yet.
            </p>
          ) : (
            <div className="mt-4 flex flex-col gap-3">
              {sent.map((r) => {
                const toUser = getUser(r.toUserId);
                if (!toUser) return null;
                return (
                  <SentRequestRow
                    key={r.id}
                    request={r}
                    toUser={toUser}
                    targetListing={getListing(r.targetListingId)}
                    onWithdraw={handleWithdraw}
                  />
                );
              })}
            </div>
          )}
        </section>
      </div>

      <NewRequestPicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        listings={browseable}
        getUser={getUser}
        onSelect={(item) => {
          setPickerOpen(false);
          setRequestTarget(item);
        }}
      />

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

      <SwapConfirmedModal
        open={!!confirmed}
        onClose={() => setConfirmed(null)}
        myListing={confirmed?.mine ?? null}
        theirListing={confirmed?.theirs ?? null}
        otherUser={
          confirmed?.otherUserId ? (getUser(confirmed.otherUserId) ?? null) : null
        }
      />
    </main>
  );
}
