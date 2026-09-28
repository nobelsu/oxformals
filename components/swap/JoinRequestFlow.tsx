"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@/components/auth/useAuth";
import { useData } from "@/components/data/useData";
import { Modal } from "@/components/ui/Modal";
import { OutlineCombobox } from "@/components/ui/OutlineCombobox";
import { BlockingRequestModal } from "@/components/swap/BlockingRequestModal";
import { SwapConfirmedModal } from "@/components/swap/SwapConfirmedModal";
import { formatListingDate, formatPrice } from "@/lib/data/format";
import { listingSupportsSwap } from "@/lib/data/listingType";
import { findBlockingOutgoingRequestForTarget } from "@/lib/data/requestFilters";
import type { Listing, RequestType } from "@/lib/data/types";

type Props = {
  /** The listing being requested; null when the flow is closed. */
  target: Listing | null;
  onClose: () => void;
  /** Where "List your formal" and "View requests" go. */
  onNavigateToRequests?: () => void;
};

type Confirmed = {
  requestType: RequestType;
  mine: Listing | null;
  theirs: Listing | null;
  otherUserId: string;
};

/**
 * The one way to ask for a seat: pick how to pay (swap a seat at your formal,
 * spend a credit, or pay the host), add a message, send. Used everywhere a
 * listing has a Request button.
 */
export function JoinRequestFlow({ target, onClose, onNavigateToRequests }: Props) {
  const router = useRouter();
  const { user } = useAuth();
  const { listings, requests, getListing, getUser } = useData();
  const [confirmed, setConfirmed] = useState<Confirmed | null>(null);

  // Snapshot the "already requested" check when the flow opens, so the request
  // we just sent doesn't flip the open modal into the blocking message.
  const [opened, setOpened] = useState<{ id: string; blockingAccepted: boolean | null } | null>(
    null,
  );
  if (target && opened?.id !== target.id) {
    const blocking = user
      ? findBlockingOutgoingRequestForTarget(requests, user.id, target.id)
      : undefined;
    setOpened({
      id: target.id,
      blockingAccepted: blocking ? blocking.status === "accepted" : null,
    });
  } else if (!target && opened) {
    setOpened(null);
  }

  const goToRequests =
    onNavigateToRequests ?? (() => router.push("/?tab=requests&openList=1"));

  const myActiveListings = useMemo(
    () =>
      user
        ? listings.filter(
            (l) =>
              l.ownerUserId === user.id &&
              l.status === "active" &&
              listingSupportsSwap(l.listingType) &&
              l.id !== target?.id,
          )
        : [],
    [listings, user, target?.id],
  );

  const blocked = !!target && opened?.id === target.id && opened.blockingAccepted !== null;

  return (
    <>
      <BlockingRequestModal
        open={blocked}
        onClose={onClose}
        hasAccepted={opened?.blockingAccepted === true}
        onViewRequests={() => {
          onClose();
          goToRequests();
        }}
      />

      {target && !blocked ? (
        <JoinRequestModal
          key={target.id}
          target={target}
          myListings={myActiveListings}
          onClose={onClose}
          onListFormal={() => {
            onClose();
            goToRequests();
          }}
          onSent={(requestType, result, offeringListingId) => {
            onClose();
            if (result === "accepted") {
              setConfirmed({
                requestType,
                mine: offeringListingId ? (getListing(offeringListingId) ?? null) : null,
                theirs: getListing(target.id) ?? target,
                otherUserId: target.ownerUserId,
              });
            }
          }}
        />
      ) : null}

      <SwapConfirmedModal
        open={!!confirmed}
        onClose={() => setConfirmed(null)}
        requestType={confirmed?.requestType ?? "swap"}
        myListing={confirmed?.mine ?? null}
        theirListing={confirmed?.theirs ?? null}
        otherUser={confirmed ? (getUser(confirmed.otherUserId) ?? null) : null}
        otherUserId={confirmed?.otherUserId ?? null}
      />
    </>
  );
}

function JoinRequestModal({
  target,
  myListings,
  onClose,
  onListFormal,
  onSent,
}: {
  target: Listing;
  myListings: Listing[];
  onClose: () => void;
  onListFormal: () => void;
  onSent: (
    requestType: RequestType,
    status: "pending" | "accepted",
    offeringListingId?: string,
  ) => void;
}) {
  const { sendRequest } = useData();
  const credits = useQuery(api.credits.getMyCredits, {});
  const balance = credits?.balance ?? 0;

  const allowsSwap = listingSupportsSwap(target.listingType);
  const allowsPay = target.listingType === "pay" || target.listingType === "both";
  const canSwap = allowsSwap && myListings.length > 0;
  const canCredit = balance >= 1;

  const defaultMethod: RequestType = canSwap
    ? "swap"
    : canCredit || !allowsPay
      ? "credit"
      : "pay";
  const [picked, setPicked] = useState<RequestType | null>(null);
  const method = picked ?? defaultMethod;

  const [offeringId, setOfferingId] = useState("");
  const [offeringPickerOpen, setOfferingPickerOpen] = useState(false);
  const effectiveOfferingId =
    offeringId && myListings.some((l) => l.id === offeringId)
      ? offeringId
      : (myListings[0]?.id ?? "");

  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const ready =
    method === "swap" ? canSwap && !!effectiveOfferingId : method === "credit" ? canCredit : allowsPay;

  async function handleSubmit() {
    if (!ready || submitting) return;
    setError(null);
    setSubmitting(true);
    try {
      const result = await sendRequest({
        requestType: method,
        targetListingId: target.id,
        ...(method === "swap" ? { offeringListingId: effectiveOfferingId } : {}),
        message,
        targetOwnerUserId: target.ownerUserId,
      });
      if (!result) throw new Error("Could not send request.");
      onSent(
        method,
        result.status === "accepted" ? "accepted" : "pending",
        method === "swap" ? effectiveOfferingId : undefined,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send request.");
    } finally {
      setSubmitting(false);
    }
  }

  const seatsLine = `${formatListingDate(target.dateTime)} · ${target.seatsAvailable} ${
    target.seatsAvailable === 1 ? "seat" : "seats"
  } left`;

  return (
    <Modal open onClose={onClose} title={`Request a seat at ${target.college}`}>
      <p className="-mt-1 mb-4 text-sm text-[var(--ink-muted)]">{seatsLine}</p>

      <fieldset className="mb-4 flex flex-col gap-2">
        <legend className="mb-2 text-sm text-[var(--ink-muted)]">How do you want to pay?</legend>
        {allowsSwap ? (
          <MethodOption
            selected={method === "swap"}
            disabled={!canSwap}
            onSelect={() => setPicked("swap")}
            title="Swap"
            detail={
              canSwap
                ? "Trade them a seat at your formal"
                : "You need an upcoming swap listing of your own"
            }
            action={
              canSwap ? null : (
                <button
                  type="button"
                  onClick={onListFormal}
                  className="shrink-0 cursor-pointer text-xs font-bold text-[var(--accent)] underline-offset-2 hover:underline"
                >
                  List your formal
                </button>
              )
            }
          />
        ) : null}
        <MethodOption
          selected={method === "credit"}
          disabled={!canCredit}
          onSelect={() => setPicked("credit")}
          title="Credit"
          detail={
            credits === undefined
              ? "Checking your credits…"
              : canCredit
                ? `Spend 1 credit · you have ${balance}`
                : "No credits yet. Host a guest to earn one"
          }
        />
        {allowsPay ? (
          <MethodOption
            selected={method === "pay"}
            onSelect={() => setPicked("pay")}
            title={target.price !== undefined ? `Pay ${formatPrice(target.price)}` : "Pay"}
            detail="Arranged with the host after they accept"
          />
        ) : null}
      </fieldset>

      {method === "swap" && canSwap ? (
        <label className="mb-4 flex flex-col gap-2">
          <span className="text-sm text-[var(--ink-muted)]">Your formal to offer</span>
          <OutlineCombobox
            open={offeringPickerOpen}
            onOpenChange={setOfferingPickerOpen}
            value={effectiveOfferingId}
            options={myListings.map((l) => ({
              value: l.id,
              label: `${l.college} — ${formatListingDate(l.dateTime)}`,
            }))}
            onChange={(v) => {
              setOfferingId(v);
              setOfferingPickerOpen(false);
              setError(null);
            }}
            placeholder="Choose a listing"
          />
        </label>
      ) : null}

      <label className="mb-6 flex flex-col gap-2">
        <span className="text-sm text-[var(--ink-muted)]">Message (optional)</span>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={3}
          placeholder="Say hi!"
          className="w-full rounded-[20px] border-[2px] border-[var(--ink)] bg-[var(--bg)] px-4 py-2 text-base text-[var(--ink)] placeholder:text-[var(--ink-soft)] focus:outline-none"
        />
      </label>

      {error ? <p className="mb-4 text-sm text-[var(--danger)]">{error}</p> : null}

      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onClose}
          disabled={submitting}
          className="rounded-full border-[2px] border-[var(--ink)] px-4 py-1.5 text-sm text-[var(--ink)] transition-colors hover:bg-[var(--ink)] hover:text-[var(--bg)] disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={() => void handleSubmit()}
          disabled={submitting || !ready}
          className="rounded-full bg-[var(--accent)] px-5 py-1.5 text-sm text-[var(--accent-ink)] hover:bg-[var(--accent-hover)] disabled:opacity-50"
        >
          Send request!
        </button>
      </div>
    </Modal>
  );
}

function MethodOption({
  selected,
  disabled = false,
  onSelect,
  title,
  detail,
  action,
}: {
  selected: boolean;
  disabled?: boolean;
  onSelect: () => void;
  title: string;
  detail: string;
  action?: React.ReactNode;
}) {
  return (
    <div
      className={`flex items-center gap-3 rounded-2xl border-2 px-4 py-3 transition-colors ${
        selected && !disabled
          ? "border-[var(--ink)] bg-[var(--accent-wash)] text-[var(--accent-wash-ink)] shadow-[3px_3px_0_var(--ink)]"
          : "border-[color-mix(in_srgb,var(--ink)_22%,transparent)] bg-[var(--paper)] text-[var(--ink)]"
      }`}
    >
      <button
        type="button"
        role="radio"
        aria-checked={selected && !disabled}
        disabled={disabled}
        onClick={onSelect}
        className="flex min-w-0 flex-1 cursor-pointer items-center gap-3 text-left disabled:cursor-not-allowed"
      >
        <span
          aria-hidden
          className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 ${
            disabled ? "border-[color-mix(in_srgb,var(--ink)_30%,transparent)]" : "border-[var(--ink)]"
          }`}
        >
          {selected && !disabled ? <span className="h-2 w-2 rounded-full bg-[var(--ink)]" /> : null}
        </span>
        <span className="min-w-0">
          <span className={`block text-sm font-bold ${disabled ? "opacity-50" : ""}`}>{title}</span>
          <span className={`block text-xs ${selected && !disabled ? "" : "text-[var(--ink-muted)]"}`}>
            {detail}
          </span>
        </span>
      </button>
      {action}
    </div>
  );
}
