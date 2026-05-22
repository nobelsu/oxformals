"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useMemo, useState } from "react";
import { useAuth } from "@/components/auth/useAuth";
import { useData } from "@/components/data/useData";
import { Avatar } from "@/components/ui/Avatar";
import { IncomingRequestRow } from "@/components/swap/IncomingRequestRow";
import { ListingMenu } from "@/components/swap/ListingMenu";
import { ListFormalForm } from "@/components/swap/ListFormalForm";
import { NewRequestPicker } from "@/components/swap/NewRequestPicker";
import { ListingTypeTag } from "@/components/swap/ListingTypeTag";
import { BlockingRequestModal } from "@/components/swap/BlockingRequestModal";
import { EditListingBlockedModal } from "@/components/swap/EditListingBlockedModal";
import { RequestPayModal } from "@/components/swap/RequestPayModal";
import { RequestSwapModal } from "@/components/swap/RequestSwapModal";
import { RequestTypeChooserModal } from "@/components/swap/RequestTypeChooserModal";
import { SentRequestRow } from "@/components/swap/SentRequestRow";
import { SignInGate } from "@/components/swap/SignInGate";
import { SwapConfirmedModal } from "@/components/swap/SwapConfirmedModal";
import { ListingGroupChatButton } from "@/components/chat/ListingGroupChatButton";
import { ReviewFormalSection } from "@/components/colleges/ReviewFormalSection";
import { ListingFormalBadges } from "@/components/colleges/ListingFormalBadges";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Modal } from "@/components/ui/Modal";
import { SketchCard } from "@/components/ui/SketchCard";
import type { Id } from "@/convex/_generated/dataModel";
import {
  formatListingDate,
  formatListingMetaLine,
  formatYearLabel,
} from "@/lib/data/format";
import { ListingStatusTag } from "@/components/swap/ListingStatusTag";
import { listingSupportsSwap } from "@/lib/data/listingType";
import {
  findBlockingOutgoingRequestForTarget,
  incomingRequestsForListing,
  pendingIncomingRequestsForListing,
  resolveRequestType,
  sentRequestsForListing,
} from "@/lib/data/requestFilters";
import { placeholderUser } from "@/lib/data/users";
import type { Listing, RequestType } from "@/lib/data/types";
import { listingIsPast } from "@/lib/data/collegeReviewEligibility";
import { useNowMs } from "@/lib/hooks/useNowMs";

export function ListingRequestsView({ listingId }: { listingId: string }) {
  const router = useRouter();
  const nowMs = useNowMs();
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
    sendRequest,
    updateListing,
    deleteListing,
  } = useData();

  const listing = useMemo(
    () => listings.find((item) => item.id === listingId),
    [listings, listingId],
  );

  const isOwner = !!(user && listing && listing.ownerUserId === user.id);
  const isMember = !!(user && listing && listing.members.includes(user.id));
  const canViewListing = isOwner || isMember;

  const myActiveListings = useMemo(
    () =>
      user
        ? listings.filter(
            (item) =>
              item.ownerUserId === user.id &&
              item.status === "active" &&
              listingSupportsSwap(item.listingType),
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
        ? incomingRequestsForListing(requests, user.id, listing.id).sort(
            (a, b) => b.createdAt - a.createdAt,
          )
        : [],
    [requests, user, listing],
  );

  const pendingIncoming = useMemo(
    () =>
      user && listing
        ? pendingIncomingRequestsForListing(requests, user.id, listing.id)
        : [],
    [requests, user, listing],
  );

  const sent = useMemo(
    () =>
      user && listing
        ? sentRequestsForListing(requests, user.id, listing.id).sort(
            (a, b) => b.createdAt - a.createdAt,
          )
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
  const [editBlockedOpen, setEditBlockedOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [requestTarget, setRequestTarget] = useState<Listing | null>(null);
  const [pendingRequestType, setPendingRequestType] = useState<RequestType | null>(
    null,
  );
  const [typeChooserTarget, setTypeChooserTarget] = useState<Listing | null>(null);
  const [confirmed, setConfirmed] = useState<{
    requestType: RequestType;
    mine: Listing | null;
    theirs: Listing | null;
    otherUserId: string | null;
  } | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{
    message: string;
    variant?: "default" | "destructive";
    confirmLabel?: string;
    onConfirm: () => void | Promise<void>;
  } | null>(null);
  const [blockingRequestOpen, setBlockingRequestOpen] = useState(false);
  const [blockingHasAccepted, setBlockingHasAccepted] = useState(false);
  const [acceptError, setAcceptError] = useState<string | null>(null);

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
            That listing does not exist or you are not in the group.
          </p>
          <Link
            href="/?tab=requests"
            className="mt-5 inline-flex w-fit self-start rounded-full border-[2px] border-[var(--ink)] px-4 py-1.5 text-sm text-[var(--ink)] transition-colors hover:bg-[var(--ink)] hover:text-[var(--bg)]"
          >
            Back to Activity
          </Link>
        </SketchCard>
      </main>
    );
  }

  if (!isOwner && isMember && listing) {
    return (
      <main className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-4 py-8 sm:px-6">
        <div className="flex items-center gap-3">
          <Link
            href="/?tab=requests"
            className="rounded-full border-[2px] border-[var(--ink)] px-4 py-1.5 text-sm text-[var(--ink)] transition-colors hover:bg-[var(--ink)] hover:text-[var(--bg)]"
          >
            Back to listings
          </Link>
        </div>
        <SketchCard seed={listing.id.length} className="p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <h1 className="font-display text-3xl uppercase tracking-wide">
              {listing.college}
            </h1>
            <ListingFormalBadges isPast={listingIsPast(listing.dateTime, nowMs)} />
          </div>
          <p className="mt-2 text-[var(--ink-muted)]">
            {formatListingDate(listing.dateTime)} · Group of {listing.groupSize}
          </p>
          {listing.message ? (
            <p className="mt-4 text-sm italic text-[var(--ink-soft)]">
              &ldquo;{listing.message}&rdquo;
            </p>
          ) : null}
        </SketchCard>
        <ReviewFormalSection listingId={listing.id} college={listing.college} />
      </main>
    );
  }

  const isPast = listingIsPast(listing.dateTime, nowMs);

  function openOutboundRequest(target: Listing, requestType: RequestType) {
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
    if (requestType === "swap" && myActiveListings.length === 0) return;
    setPendingRequestType(requestType);
    setRequestTarget(target);
  }

  function handleOutboundPick(target: Listing) {
    if (target.listingType === "both") {
      setTypeChooserTarget(target);
      return;
    }
    if (target.listingType === "pay") {
      openOutboundRequest(target, "pay");
      return;
    }
    openOutboundRequest(target, "swap");
  }

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
              <div className="flex flex-wrap items-center gap-2">
                <ListingTypeTag listingType={listing.listingType} />
                <ListingFormalBadges isPast={isPast} />
                {!isPast ? (
                  <ListingStatusTag
                    status={listing.status}
                    seatsAvailable={listing.seatsAvailable}
                  />
                ) : null}
                {!isPast ? (
                  <button
                    type="button"
                    onClick={() => {
                      if (pendingIncoming.length > 0) {
                        setEditBlockedOpen(true);
                        return;
                      }
                      setEditModalOpen(true);
                    }}
                    className="flex h-8 w-8 items-center justify-center rounded-full border-[2px] border-[var(--ink)] text-[var(--ink)] transition-colors hover:bg-[var(--ink)] hover:text-[var(--bg)]"
                    aria-label="Edit listing"
                  >
                    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
                      <path d="m15 5 4 4" />
                    </svg>
                  </button>
                ) : null}
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
              </div>
            </div>
            <p className="mt-2 text-[var(--ink-muted)]">
              {formatListingMetaLine({
                dateTime: listing.dateTime,
                groupSize: listing.groupSize,
                seatsAvailable: listing.seatsAvailable,
                isPast,
                price: listing.price,
              })}
            </p>
            <p className="mt-1 text-sm text-[var(--ink-soft)]">
              {[formatYearLabel(listing.year) || listing.year, listing.role]
                .filter(Boolean)
                .join(" · ")}
            </p>
            {listing.message ? (
              <p className="mt-4 text-sm italic text-[var(--ink-soft)]">&ldquo;{listing.message}&rdquo;</p>
            ) : null}
            <ListingMenu
              menu={listing.menu}
              menuPdfUrl={listing.menuPdfUrl}
              menuFileContentType={listing.menuFileContentType}
              className="mt-2 text-sm text-[var(--ink-soft)]"
            />
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
              <ListingGroupChatButton
                listingId={listing.id as Id<"listings">}
                memberCount={listing.members.length}
                className="mt-4 w-full text-xs"
              />
            </div>
          )}
        </div>
      </SketchCard>

      <div className="grid grid-cols-1 items-start gap-10 md:grid-cols-2 md:gap-8 lg:gap-12">
        <section id="incoming-requests" className="min-w-0 scroll-mt-8">
          <h2 className="font-display text-3xl uppercase tracking-wide">
            Incoming requests
          </h2>
          {acceptError ? (
            <p className="mt-2 text-sm text-[var(--danger)]">{acceptError}</p>
          ) : null}
          {incoming.length === 0 ? (
            <p className="mt-2 text-[var(--ink-muted)]">No requests for this listing yet.</p>
          ) : (
            <div className="mt-4 flex flex-col gap-3">
              {incoming.map((r) => {
                const fromUser =
                  getUser(r.fromUserId) ?? placeholderUser(r.fromUserId);
                return (
                  <IncomingRequestRow
                    key={r.id}
                    request={r}
                    fromUser={fromUser}
                    offeringListing={
                      r.offeringListingId
                        ? getListing(r.offeringListingId)
                        : undefined
                    }
                    targetListing={listing}
                    onAccept={() => {
                      const isPay = resolveRequestType(r) === "pay";
                      setAcceptError(null);
                      setConfirmDialog({
                        message: isPay
                          ? `Accept this pay request? ${fromUser.name} will join your group.`
                          : `Accept this swap? ${fromUser.name} will join your group.`,
                        confirmLabel: "Accept",
                        onConfirm: async () => {
                          setConfirmDialog(null);
                          try {
                            const updated = await acceptRequest(r.id);
                            if (!updated) return;
                            if (isPay) {
                              setConfirmed({
                                requestType: "pay",
                                mine: listing,
                                theirs: null,
                                otherUserId: r.fromUserId,
                              });
                            } else {
                              setConfirmed({
                                requestType: "swap",
                                mine: getListing(r.targetListingId) ?? null,
                                theirs: r.offeringListingId
                                  ? (getListing(r.offeringListingId) ?? null)
                                  : null,
                                otherUserId: r.fromUserId,
                              });
                            }
                          } catch (err) {
                            setAcceptError(
                              err instanceof Error
                                ? err.message
                                : "Could not accept request.",
                            );
                          }
                        },
                      });
                    }}
                    onDecline={() => {
                      setConfirmDialog({
                        message:
                          resolveRequestType(r) === "pay"
                            ? "Decline this pay request?"
                            : "Decline this swap request?",
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
                const toUser = getUser(r.toUserId) ?? placeholderUser(r.toUserId);
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
          handleOutboundPick(item);
        }}
      />

      <RequestTypeChooserModal
        open={!!typeChooserTarget}
        onClose={() => setTypeChooserTarget(null)}
        college={typeChooserTarget?.college ?? ""}
        onChoose={(requestType) => {
          if (!typeChooserTarget) return;
          const target = typeChooserTarget;
          setTypeChooserTarget(null);
          openOutboundRequest(target, requestType);
        }}
      />

      <RequestSwapModal
        open={!!requestTarget && pendingRequestType === "swap"}
        onClose={() => {
          setRequestTarget(null);
          setPendingRequestType(null);
        }}
        targetListing={requestTarget}
        myListings={myActiveListings.filter((l) => l.id !== listing.id)}
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
              mine: listing,
              theirs: requestTarget,
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

      <EditListingBlockedModal
        open={editBlockedOpen}
        onClose={() => setEditBlockedOpen(false)}
        pendingCount={pendingIncoming.length}
        onViewRequests={() => {
          document
            .getElementById("incoming-requests")
            ?.scrollIntoView({ behavior: "smooth", block: "start" });
        }}
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
        bodyScrollable={false}
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
              menuPdfUrl: listing.menuPdfUrl,
              menuFileContentType: listing.menuFileContentType,
              listingType: listing.listingType,
              price: listing.price,
            }}
            minGroupSize={listing.members.length}
            onSubmit={(input) => {
              if (listingIsPast(listing.dateTime, nowMs)) {
                setEditModalOpen(false);
                return;
              }
              if (pendingIncoming.length > 0) {
                setEditModalOpen(false);
                setEditBlockedOpen(true);
                return;
              }
              updateListing(listing.id, {
                dateTime: input.dateTime,
                groupSize: input.groupSize,
                message: input.message,
                menu: input.menu,
                ...(input.menuPdfId !== undefined
                  ? { menuPdfId: input.menuPdfId }
                  : {}),
                ...(input.clearMenuPdf ? { clearMenuPdf: true } : {}),
                listingType: input.listingType,
                ...(input.price !== undefined ? { price: input.price } : {}),
              });
              setEditModalOpen(false);
            }}
          />
        )}
      </Modal>

      <ConfirmDialog
        open={deleteDialogOpen}
        message={
          listing?.status === "active"
            ? "Delete this listing? All pending requests will be declined."
            : "Delete this past listing?"
        }
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
