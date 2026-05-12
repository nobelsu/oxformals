"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useMemo, useState } from "react";
import { useAuth } from "@/components/auth/useAuth";
import { useData } from "@/components/data/useData";
import { Avatar } from "@/components/ui/Avatar";
import { IncomingRequestRow } from "@/components/swap/IncomingRequestRow";
import { ListFormalForm } from "@/components/swap/ListFormalForm";
import { NewRequestPicker } from "@/components/swap/NewRequestPicker";
import { RequestSwapModal } from "@/components/swap/RequestSwapModal";
import { SentRequestRow } from "@/components/swap/SentRequestRow";
import { SignInGate } from "@/components/swap/SignInGate";
import { SwapConfirmedModal } from "@/components/swap/SwapConfirmedModal";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Modal } from "@/components/ui/Modal";
import { SketchCard } from "@/components/ui/SketchCard";
import { formatListingDate, formatYearLabel } from "@/lib/data/format";
import type { Listing } from "@/lib/data/types";

export function ListingRequestsView({ listingId }: { listingId: string }) {
  const router = useRouter();
  const { isAuthenticated, user } = useAuth();
  const {
    listings,
    requests,
    getUser,
    getListing,
    acceptRequest,
    declineRequest,
    withdrawRequest,
    leaveGroup,
    removeMember,
    requestSwap,
    updateListing,
    deleteListing,
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

  const memberUsers = useMemo(
    () =>
      listing
        ? listing.members
            .map(getUser)
            .filter((u): u is NonNullable<typeof u> => !!u)
        : [],
    [listing, getUser],
  );

  const [editModalOpen, setEditModalOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [requestTarget, setRequestTarget] = useState<Listing | null>(null);
  const [confirmed, setConfirmed] = useState<{
    mine: Listing | null;
    theirs: Listing | null;
    otherUserId: string | null;
  } | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{
    message: string;
    variant?: "default" | "destructive";
    confirmLabel?: string;
    onConfirm: () => void;
  } | null>(null);

  const handleWithdraw = useCallback(
    (requestId: string) => {
      setConfirmDialog({
        message:
          "Withdraw this request? It will be removed for you and the other person.",
        variant: "destructive",
        confirmLabel: "Withdraw",
        onConfirm: () => {
          setConfirmDialog(null);
          withdrawRequest(requestId);
        },
      });
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

  const seatsLabel =
    listing.seatsAvailable === 0
      ? "Group full"
      : `${listing.seatsAvailable} ${listing.seatsAvailable === 1 ? "seat" : "seats"} left`;

  const statusMap: Record<Listing["status"], string> = {
    active: "Active",
    confirmed: "Swap confirmed",
    closed: listing.seatsAvailable === 0 ? "Group full" : "Closed",
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
        <div className="flex flex-col gap-6 md:flex-row md:gap-10">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <h1 className="font-display text-3xl uppercase tracking-wide">
                {listing.college}
              </h1>
              <div className="flex items-center gap-2">
                <span className="rounded-full border-[2px] border-[var(--ink)] px-3 py-0.5 text-xs">
                  {statusMap[listing.status]}
                </span>
                {listing.status === "active" && (
                  <>
                    {listing.members.length <= 1 && (
                      <button
                        type="button"
                        onClick={() => setEditModalOpen(true)}
                        className="flex h-8 w-8 items-center justify-center rounded-full border-[2px] border-[var(--ink)] text-[var(--ink)] transition-colors hover:bg-[var(--ink)] hover:text-[var(--bg)]"
                        aria-label="Edit listing"
                      >
                        <svg aria-hidden="true" viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
                          <path d="m15 5 4 4" />
                        </svg>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setDeleteDialogOpen(true)}
                      className="flex h-8 w-8 items-center justify-center rounded-full border-[2px] border-red-600 text-red-600 transition-colors hover:bg-red-600 hover:text-white"
                      aria-label="Delete listing"
                    >
                      <svg aria-hidden="true" viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M3 6h18" />
                        <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                        <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                      </svg>
                    </button>
                  </>
                )}
              </div>
            </div>
            <p className="mt-2 text-[var(--ink-muted)]">
              {formatListingDate(listing.dateTime)} · Group of {listing.groupSize} · {seatsLabel}
            </p>
            <p className="mt-1 text-sm text-[var(--ink-soft)]">
              {[formatYearLabel(listing.year) || listing.year, listing.role]
                .filter(Boolean)
                .join(" · ")}
            </p>
            {listing.message ? (
              <p className="mt-4 text-sm italic text-[var(--ink-soft)]">&ldquo;{listing.message}&rdquo;</p>
            ) : null}
            {listing.menu ? (
              <p className="mt-2 text-sm text-[var(--ink-soft)]">
                <span className="font-semibold">Menu:</span> {listing.menu}
              </p>
            ) : null}
          </div>

          {memberUsers.length > 0 && (
            <div className="shrink-0 md:w-56 md:border-l-[2px] md:border-[var(--ink)]/10 md:pl-8">
              <h2 className="font-display text-lg uppercase tracking-wide">
                Group members
              </h2>
              <div className="mt-3 flex flex-col gap-2.5">
                {memberUsers.map((m) => {
                  const isOwner = m.id === listing.ownerUserId;
                  return (
                    <div key={m.id} className="flex items-center gap-2.5">
                      <Link href={`/profile/${m.id}`}>
                        <Avatar name={m.name} size="sm" source={m.avatar} />
                      </Link>
                      <div className="min-w-0 flex-1">
                        <Link href={`/profile/${m.id}`} className="text-sm leading-tight hover:underline">
                          {m.name}
                        </Link>
                        {isOwner && (
                          <span className="ml-1 text-[0.65rem] text-[var(--ink-soft)]">(host)</span>
                        )}
                      </div>
                      {!isOwner && user && listing.ownerUserId === user.id && (
                        <button
                          type="button"
                          onClick={() => {
                            setConfirmDialog({
                              message: `Remove ${m.name} from the group?`,
                              variant: "destructive",
                              confirmLabel: "Remove",
                              onConfirm: () => {
                                setConfirmDialog(null);
                                removeMember(listing.id, m.id);
                              },
                            });
                          }}
                          className="rounded-full border-[2px] border-[var(--ink)] px-2.5 py-0.5 text-[0.65rem] text-[var(--ink)] transition-colors hover:bg-[var(--ink)] hover:text-[var(--bg)]"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
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
                      setConfirmDialog({
                        message: `Accept this swap? ${fromUser.name} will join your group.`,
                        confirmLabel: "Accept",
                        onConfirm: () => {
                          setConfirmDialog(null);
                          const updated = acceptRequest(r.id);
                          if (!updated) return;
                          setConfirmed({
                            mine: getListing(r.targetListingId) ?? null,
                            theirs: getListing(r.offeringListingId) ?? null,
                            otherUserId: r.fromUserId,
                          });
                        },
                      });
                    }}
                    onDecline={() => {
                      setConfirmDialog({
                        message: "Decline this swap request?",
                        variant: "destructive",
                        confirmLabel: "Decline",
                        onConfirm: () => {
                          setConfirmDialog(null);
                          declineRequest(r.id);
                        },
                      });
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

      <ConfirmDialog
        open={!!confirmDialog}
        message={confirmDialog?.message ?? ""}
        variant={confirmDialog?.variant}
        confirmLabel={confirmDialog?.confirmLabel}
        onConfirm={() => confirmDialog?.onConfirm()}
        onCancel={() => setConfirmDialog(null)}
      />

      <Modal
        open={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        panelClassName="!max-w-3xl"
      >
        {listing && user && (
          <ListFormalForm
            embedded
            profile={{
              college: user.college,
              year: user.year,
              role: user.role,
            }}
            initialValues={{
              dateTime: listing.dateTime,
              groupSize: listing.groupSize,
              message: listing.message,
              menu: listing.menu,
            }}
            onSubmit={(input) => {
              updateListing(listing.id, {
                dateTime: input.dateTime,
                groupSize: input.groupSize,
                message: input.message,
                menu: input.menu,
              });
              setEditModalOpen(false);
            }}
          />
        )}
      </Modal>

      <ConfirmDialog
        open={deleteDialogOpen}
        message="Delete this listing? All pending requests will be declined."
        variant="destructive"
        confirmLabel="Delete"
        onConfirm={() => {
          if (listing) {
            deleteListing(listing.id);
            router.push("/?tab=requests");
          }
          setDeleteDialogOpen(false);
        }}
        onCancel={() => setDeleteDialogOpen(false)}
      />
    </main>
  );
}
