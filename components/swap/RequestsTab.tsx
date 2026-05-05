"use client";

import { useCallback, useMemo, useState } from "react";
import { useAuth } from "@/components/auth/useAuth";
import { useData } from "@/components/data/useData";
import { Modal } from "@/components/ui/Modal";
import { IncomingRequestRow } from "./IncomingRequestRow";
import { ListFormalForm } from "./ListFormalForm";
import { NewRequestPicker } from "./NewRequestPicker";
import { RequestSwapModal } from "./RequestSwapModal";
import { SentRequestRow } from "./SentRequestRow";
import { SwapConfirmedModal } from "./SwapConfirmedModal";
import type { Listing } from "@/lib/data/types";

export function RequestsTab() {
  const { user } = useAuth();
  const {
    requests,
    listings,
    getUser,
    getListing,
    acceptRequest,
    declineRequest,
    withdrawRequest,
    createListing,
    requestSwap,
  } = useData();

  const myListings = useMemo(
    () => (user ? listings.filter((l) => l.ownerUserId === user.id) : []),
    [listings, user],
  );

  const myActiveListings = useMemo(
    () => myListings.filter((l) => l.status === "active"),
    [myListings],
  );

  const browseable = useMemo(
    () =>
      user
        ? listings
            .filter((l) => l.status === "active" && l.ownerUserId !== user.id)
            .sort((a, b) => +new Date(a.dateTime) - +new Date(b.dateTime))
        : [],
    [listings, user],
  );

  const [listFormalOpen, setListFormalOpen] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [requestTarget, setRequestTarget] = useState<Listing | null>(null);
  const [confirmed, setConfirmed] = useState<{
    mine: Listing | null;
    theirs: Listing | null;
    otherUserId: string | null;
  } | null>(null);

  const incoming = useMemo(
    () =>
      user
        ? [...requests.filter((r) => r.toUserId === user.id)].sort(
            (a, b) => b.createdAt - a.createdAt,
          )
        : [],
    [requests, user],
  );
  const sent = useMemo(
    () =>
      user
        ? [...requests.filter((r) => r.fromUserId === user.id)].sort(
            (a, b) => b.createdAt - a.createdAt,
          )
        : [],
    [requests, user],
  );

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

  const canStartRequest = myActiveListings.length > 0;

  const openNewRequest = () => {
    if (!canStartRequest) return;
    setPickerOpen(true);
  };

  if (!user) return null;

  return (
    <>
      <div className="grid grid-cols-1 items-start gap-10 md:grid-cols-2 md:gap-8 lg:gap-12">
        <section className="min-w-0">
          <h2 className="font-display text-3xl uppercase tracking-wide">
            Incoming requests
          </h2>
          {incoming.length === 0 ? (
            <p className="mt-2 text-[var(--ink-muted)]">
              {myListings.length === 0 ? (
                <>
                  No one&apos;s asked to swap yet. List a formal to get
                  started.
                </>
              ) : (
                <>No incoming requests yet.</>
              )}
            </p>
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
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-display text-3xl uppercase tracking-wide">
              Requests I&apos;ve sent
            </h2>
            <button
              type="button"
              onClick={() => setListFormalOpen(true)}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-[2px] border-[var(--ink)] text-2xl leading-none text-[var(--ink)] transition-colors hover:bg-[var(--ink)] hover:text-[var(--bg)]"
              aria-label="List a formal"
            >
              +
            </button>
          </div>
          {sent.length === 0 ? (
            <div className="mt-2 flex flex-col items-start gap-3">
              <p className="text-[var(--ink-muted)]">
                {canStartRequest
                  ? "You haven't requested any swaps yet. Pick a formal to swap for to get started."
                  : "You haven't requested any swaps yet. List a formal first so you have something to offer."}
              </p>
              {canStartRequest ? (
                <button
                  type="button"
                  onClick={openNewRequest}
                  className="rounded-full bg-[var(--accent)] px-5 py-2 text-sm text-white transition-colors hover:bg-[var(--accent-hover)]"
                >
                  Pick a formal to swap for
                </button>
              ) : null}
            </div>
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
        onSelect={(l) => {
          setPickerOpen(false);
          setRequestTarget(l);
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

      <Modal
        open={listFormalOpen}
        onClose={() => setListFormalOpen(false)}
        panelClassName="!max-w-3xl"
      >
        <ListFormalForm
          embedded
          profile={{
            college: user.college,
            year: user.year,
            role: user.role,
          }}
          onSubmit={(input) => {
            const created = createListing(input);
            if (created) setListFormalOpen(false);
          }}
        />
      </Modal>

      <SwapConfirmedModal
        open={!!confirmed}
        onClose={() => setConfirmed(null)}
        myListing={confirmed?.mine ?? null}
        theirListing={confirmed?.theirs ?? null}
        otherUser={
          confirmed?.otherUserId ? (getUser(confirmed.otherUserId) ?? null) : null
        }
      />
    </>
  );
}
