"use client";

import { useMemo, useState } from "react";
import { useAuth } from "@/components/auth/useAuth";
import { useData } from "@/components/data/useData";
import { IncomingRequestRow } from "./IncomingRequestRow";
import { SentRequestRow } from "./SentRequestRow";
import { SwapConfirmedModal } from "./SwapConfirmedModal";
import type { Listing } from "@/lib/data/types";

type Props = {
  onOpenChatWith: (otherUserId: string) => void;
};

export function RequestsTab({ onOpenChatWith }: Props) {
  const { user } = useAuth();
  const {
    requests,
    getUser,
    getListing,
    acceptRequest,
    declineRequest,
    openConversationWith,
  } = useData();

  const [confirmed, setConfirmed] = useState<{
    mine: Listing | null;
    theirs: Listing | null;
    otherUserId: string | null;
  } | null>(null);

  const incoming = useMemo(
    () => (user ? requests.filter((r) => r.toUserId === user.id) : []),
    [requests, user],
  );
  const sent = useMemo(
    () => (user ? requests.filter((r) => r.fromUserId === user.id) : []),
    [requests, user],
  );

  if (!user) return null;

  const myListings = user
    ? undefined
    : null;
  void myListings;

  return (
    <div className="flex flex-col gap-10">
      <section>
        <h2 className="font-display text-3xl uppercase tracking-wide">Incoming requests</h2>
        {incoming.length === 0 ? (
          <p className="mt-2 text-[var(--ink-muted)]">
            No one&apos;s asked to swap yet. List a formal to get started.
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
                    const updated = acceptRequest(r.id);
                    if (!updated) return;
                    setConfirmed({
                      mine: getListing(r.targetListingId) ?? null,
                      theirs: getListing(r.offeringListingId) ?? null,
                      otherUserId: r.fromUserId,
                    });
                  }}
                  onDecline={() => declineRequest(r.id)}
                  onMessage={() => {
                    openConversationWith(r.fromUserId, r.targetListingId);
                    onOpenChatWith(r.fromUserId);
                  }}
                />
              );
            })}
          </div>
        )}
      </section>

      <section>
        <h2 className="font-display text-3xl uppercase tracking-wide">
          Requests I&apos;ve sent
        </h2>
        {sent.length === 0 ? (
          <p className="mt-2 text-[var(--ink-muted)]">
            You haven&apos;t requested any swaps yet. Browse open listings to
            get started.
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
                  onMessage={() => {
                    openConversationWith(r.toUserId, r.targetListingId);
                    onOpenChatWith(r.toUserId);
                  }}
                />
              );
            })}
          </div>
        )}
      </section>

      <SwapConfirmedModal
        open={!!confirmed}
        onClose={() => setConfirmed(null)}
        myListing={confirmed?.mine ?? null}
        theirListing={confirmed?.theirs ?? null}
        otherUser={
          confirmed?.otherUserId ? (getUser(confirmed.otherUserId) ?? null) : null
        }
      />
    </div>
  );
}
