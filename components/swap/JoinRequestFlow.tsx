"use client";

import { errorMessage } from "@/lib/errorMessage";
import { useMemo, useState } from "react";
import { MinusIcon, PlusIcon } from "@/components/ui/icons";
import { useRouter } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { MAX_GUESTS } from "@/convex/seats";
import { useAuth } from "@/components/auth/useAuth";
import { useData } from "@/components/data/useData";
import { Avatar } from "@/components/ui/Avatar";
import { Modal } from "@/components/ui/Modal";
import { OutlineCombobox } from "@/components/ui/OutlineCombobox";
import { BlockingRequestModal } from "@/components/swap/BlockingRequestModal";
import { SwapConfirmedModal } from "@/components/swap/SwapConfirmedModal";
import { InviteFriendsButton } from "@/components/invites/InviteFriendsButton";
import { SeatLinksModal } from "@/components/invites/SeatLinksModal";
import { formatListingDate, formatPrice } from "@/lib/data/format";
import { listingSupportsSwap } from "@/lib/data/listingType";
import { findBlockingOutgoingRequestForTarget } from "@/lib/data/requestFilters";
import type { AvatarSource } from "@/lib/auth/types";
import type { Listing, RequestType } from "@/lib/data/types";
import { LoadingDots } from "@/components/ui/Loading";

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
  const [seatLinks, setSeatLinks] = useState<string[]>([]);

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
    onNavigateToRequests ?? (() => router.push("/?openList=1"));

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
          onSent={(requestType, result, offeringListingId, links) => {
            onClose();
            if (links && links.length > 0) setSeatLinks(links);
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

      <SeatLinksModal tokens={seatLinks} onClose={() => setSeatLinks([])} />
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

type Payer = "you" | "them";
type PlanSeat = {
  key: string;
  kind: "you" | "friend" | "guest" | "link";
  label: string;
  userId?: string;
  payer: Payer;
  method: RequestType;
};

type FriendOption = { _id: string; name?: string; avatar?: AvatarSource };

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
    links?: string[],
  ) => void;
}) {
  const { sendRequest } = useData();
  const credits = useQuery(api.credits.getMyCredits, {});
  const friendsList = useQuery(api.follows.listMyFriends, {});
  const balance = credits?.balance ?? 0;

  const [friendIds, setFriendIds] = useState<string[]>([]);
  const [guests, setGuests] = useState(0);
  const [newPeople, setNewPeople] = useState(0);
  const maxExtra = Math.max(0, Math.min(MAX_GUESTS, target.seatsAvailable - 1));
  const extra = friendIds.length + guests + newPeople;
  const seats = 1 + extra;

  const allowsSwap = listingSupportsSwap(target.listingType);
  const allowsPay = target.listingType === "pay" || target.listingType === "both";

  // The method for your seat and every seat you cover (unless edited per seat).
  const [picked, setPicked] = useState<RequestType | null>(null);
  const [customPlan, setCustomPlan] = useState<PlanSeat[] | null>(null);
  const [editingPlan, setEditingPlan] = useState(false);

  const friendName = (id: string) =>
    (friendsList ?? []).find((f) => f._id === id)?.name?.split(" ")[0] ?? "Friend";

  // Default plan: you cover yourself and your guests; each named friend pays
  // their own seat with a credit.
  const coveredSeats = 1 + guests;
  const swapListingsFor = (n: number) => myListings.filter((l) => l.seatsAvailable >= n);
  const canSwapBase = allowsSwap && swapListingsFor(coveredSeats).length > 0;
  const canCreditBase = balance >= coveredSeats;
  const defaultMethod: RequestType = canSwapBase
    ? "swap"
    : canCreditBase || !allowsPay
      ? "credit"
      : "pay";
  const baseMethod = picked ?? defaultMethod;

  const defaultPlan: PlanSeat[] = [
    { key: "you", kind: "you", label: "You", payer: "you", method: baseMethod },
    ...friendIds.map((id) => ({
      key: `friend:${id}`,
      kind: "friend" as const,
      label: friendName(id),
      userId: id,
      payer: "them" as const,
      method: "credit" as const,
    })),
    ...Array.from({ length: newPeople }, (_, i) => ({
      key: `link:${i}`,
      kind: "link" as const,
      label: `New person ${i + 1}`,
      payer: "them" as const,
      method: "credit" as const,
    })),
    ...Array.from({ length: guests }, (_, i) => ({
      key: `guest:${i}`,
      kind: "guest" as const,
      label: `Guest ${i + 1}`,
      payer: "you" as const,
      method: baseMethod,
    })),
  ];
  const plan = customPlan ?? defaultPlan;

  // Changing who's coming resets any per-seat edits.
  const changePeople = (fn: () => void) => {
    fn();
    setCustomPlan(null);
    setEditingPlan(false);
  };

  const yourCredits = plan.filter((p) => p.payer === "you" && p.method === "credit").length;
  const swapSeats = plan.filter((p) => p.method === "swap").length;
  const cashSeats = plan.filter((p) => p.method === "pay").length;
  const swapListings = swapListingsFor(Math.max(1, swapSeats));

  const [offeringId, setOfferingId] = useState("");
  const [offeringPickerOpen, setOfferingPickerOpen] = useState(false);
  const effectiveOfferingId =
    offeringId && swapListings.some((l) => l.id === offeringId)
      ? offeringId
      : (swapListings[0]?.id ?? "");

  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const problem =
    swapSeats > 0 && !allowsSwap
      ? "This listing doesn't take swaps."
      : swapSeats > 0 && swapListings.length === 0
        ? myListings.length === 0
          ? "You need an upcoming formal to swap."
          : "Not enough free seats at your formal."
        : cashSeats > 0 && !allowsPay
          ? "This listing doesn't take cash."
          : yourCredits > balance
            ? `Needs ${yourCredits} spoons. You have ${balance}.`
            : null;
  const ready = credits !== undefined && problem === null;

  async function handleSubmit() {
    if (!ready || submitting) return;
    setError(null);
    setSubmitting(true);
    const you = plan[0];
    try {
      const result = await sendRequest({
        requestType: you.method,
        targetListingId: target.id,
        ...(swapSeats > 0 ? { offeringListingId: effectiveOfferingId } : {}),
        message,
        targetOwnerUserId: target.ownerUserId,
        ...(guests > 0
          ? {
              guests,
              guestMethods: plan.filter((p) => p.kind === "guest").map((p) => p.method),
            }
          : {}),
        ...(friendIds.length > 0
          ? {
              friends: plan
                .filter((p) => p.kind === "friend")
                .map((p) => ({
                  userId: p.userId!,
                  paysOwn: p.payer === "them",
                  method: p.method,
                })),
            }
          : {}),
        ...(newPeople > 0
          ? {
              links: plan
                .filter((p) => p.kind === "link")
                .map((p) => ({ paysOwn: p.payer === "them", method: p.method })),
            }
          : {}),
      });
      if (!result) throw new Error("Could not send request.");
      onSent(
        you.method,
        result.status === "accepted" ? "accepted" : "pending",
        swapSeats > 0 ? effectiveOfferingId : undefined,
        result.links,
      );
    } catch (err) {
      setError(errorMessage(err, "Could not send request."));
    } finally {
      setSubmitting(false);
    }
  }

  const summary = [
    `${seats} seat${seats === 1 ? "" : "s"}`,
    swapSeats > 0 ? `${swapSeats} swap seat${swapSeats === 1 ? "" : "s"}` : null,
    plan.some((p) => p.method === "credit")
      ? `${plan.filter((p) => p.method === "credit").length} spoon${plan.filter((p) => p.method === "credit").length === 1 ? "" : "s"}`
      : null,
    cashSeats > 0 && target.price !== undefined ? formatPrice(target.price * cashSeats) : null,
  ]
    .filter(Boolean)
    .join(" · ");

  const seatsLine = `${formatListingDate(target.dateTime)} · ${target.seatsAvailable} ${
    target.seatsAvailable === 1 ? "seat" : "seats"
  } left`;

  return (
    <Modal open onClose={onClose} title={`Request a seat at ${target.college}`}>
      <p className="-mt-1 mb-4 text-sm text-[var(--ink-muted)]">{seatsLine}</p>

      {maxExtra > 0 ? (
        <section className="mb-4 rounded-2xl border-2 border-[color-mix(in_srgb,var(--ink)_22%,transparent)] bg-[var(--paper)] px-4 py-3">
          <p className="text-sm font-bold">Who&apos;s coming?</p>
          <p className="text-xs text-[var(--ink-muted)]">
            {extra === 0
              ? "Just you"
              : `You + ${extra} · ${seats} seats${extra >= maxExtra ? " (max)" : ""}`}
          </p>

          {friendsList && friendsList.length > 0 ? (
            <div className="mt-3 flex flex-wrap gap-2">
              {(friendsList as FriendOption[]).map((f) => {
                const on = friendIds.includes(f._id);
                const disabled = !on && extra >= maxExtra;
                return (
                  <button
                    key={f._id}
                    type="button"
                    aria-pressed={on}
                    disabled={disabled}
                    onClick={() =>
                      changePeople(() =>
                        setFriendIds((ids) =>
                          on ? ids.filter((x) => x !== f._id) : [...ids, f._id],
                        ),
                      )
                    }
                    className={`inline-flex cursor-pointer items-center gap-1.5 rounded-full border-[1.5px] py-1 pl-1 pr-3 text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
                      on
                        ? "border-[var(--ink)] bg-[var(--accent-wash)] text-[var(--accent-wash-ink)]"
                        : "border-[color-mix(in_srgb,var(--ink)_30%,transparent)] text-[var(--ink)] hover:border-[var(--ink)]"
                    }`}
                  >
                    <Avatar name={f.name ?? "Friend"} size="sm" source={f.avatar} />
                    {f.name?.split(" ")[0] ?? "Friend"}
                  </button>
                );
              })}
            </div>
          ) : friendsList ? (
            <p className="mt-2 flex flex-wrap items-baseline gap-x-2 text-xs text-[var(--ink-muted)]">
              Mutual follows show up here.
              <InviteFriendsButton variant="link" />
            </p>
          ) : null}

          <div className="mt-3 flex items-center justify-between gap-3">
            <span className="text-xs text-[var(--ink-muted)]">
              Unnamed guests
            </span>
            <span className="flex items-center gap-2">
              <StepButton
                label="One fewer guest"
                disabled={guests === 0}
                onClick={() => changePeople(() => setGuests((g) => Math.max(0, g - 1)))}
              >
                <MinusIcon />
              </StepButton>
              <span className="w-5 text-center font-bold tabular-nums">{guests}</span>
              <StepButton
                label="One more guest"
                disabled={extra >= maxExtra}
                onClick={() => changePeople(() => setGuests((g) => g + 1))}
              >
                <PlusIcon />
              </StepButton>
            </span>
          </div>
          <div className="mt-2 flex items-center justify-between gap-3">
            <span className="text-xs text-[var(--ink-muted)]">Someone not on here yet</span>
            <span className="flex items-center gap-2">
              <StepButton
                label="One fewer new person"
                disabled={newPeople === 0}
                onClick={() => changePeople(() => setNewPeople((n) => Math.max(0, n - 1)))}
              >
                <MinusIcon />
              </StepButton>
              <span className="w-5 text-center font-bold tabular-nums">{newPeople}</span>
              <StepButton
                label="One more new person"
                disabled={extra >= maxExtra}
                onClick={() => changePeople(() => setNewPeople((n) => n + 1))}
              >
                <PlusIcon />
              </StepButton>
            </span>
          </div>
        </section>
      ) : null}

      {!editingPlan ? (
        <fieldset className="mb-4 flex flex-col gap-2">
          <legend className="mb-2 text-sm text-[var(--ink-muted)]">
            {coveredSeats > 1 || friendIds.length > 0
              ? `How do you want to pay for ${coveredSeats === 1 ? "your seat" : `your ${coveredSeats} seats`}?`
              : "How do you want to pay?"}
          </legend>
          {allowsSwap ? (
            <MethodOption
              selected={baseMethod === "swap"}
              disabled={!canSwapBase}
              onSelect={() => setPicked("swap")}
              title="Swap"
              detail={
                canSwapBase
                  ? coveredSeats === 1
                    ? "Trade them a seat at your formal"
                    : `Trade them ${coveredSeats} seats at your formal`
                  : myListings.length > 0
                    ? `Needs ${coveredSeats} free seats at your formal`
                    : "Needs a listing of your own"
              }
              action={
                canSwapBase || myListings.length > 0 ? null : (
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
            selected={baseMethod === "credit"}
            disabled={!canCreditBase}
            onSelect={() => setPicked("credit")}
            title="Spoon"
            detail={
              credits === undefined
                ? "Checking your spoons…"
                : canCreditBase
                  ? `Use ${coveredSeats} spoon${coveredSeats === 1 ? "" : "s"} · you have ${balance}`
                  : balance === 0
                    ? "Host a guest to earn one"
                    : `Needs ${coveredSeats} spoons · you have ${balance}`
            }
          />
          {allowsPay ? (
            <MethodOption
              selected={baseMethod === "pay"}
              onSelect={() => setPicked("pay")}
              title={
                target.price !== undefined
                  ? `Pay ${formatPrice(target.price * coveredSeats)}`
                  : "Pay"
              }
              detail={
                coveredSeats > 1 && target.price !== undefined
                  ? `${formatPrice(target.price)} × ${coveredSeats}, paid to the host`
                  : "Paid to the host"
              }
            />
          ) : null}
          {friendIds.length > 0 ? (
            <p className="text-xs text-[var(--ink-muted)]">
              {friendIds.length === 1
                ? `${friendName(friendIds[0])} uses their own spoon.`
                : "Friends use their own spoons."}
            </p>
          ) : null}
          {newPeople > 0 ? (
            <p className="text-xs text-[var(--ink-muted)]">
              You&apos;ll get a link to send them.
            </p>
          ) : null}
        </fieldset>
      ) : (
        <SeatPlanTable
          plan={plan}
          allowsSwap={allowsSwap}
          allowsPay={allowsPay}
          price={target.price}
          onChange={(next) => setCustomPlan(next)}
        />
      )}

      {seats > 1 ? (
        <div className="-mt-1 mb-4 flex items-center justify-between gap-3 text-xs">
          <span className="font-bold">{summary}</span>
          <button
            type="button"
            onClick={() => {
              if (editingPlan) {
                setEditingPlan(false);
                setCustomPlan(null);
              } else {
                setCustomPlan(plan);
                setEditingPlan(true);
              }
            }}
            className="cursor-pointer font-bold text-[var(--accent)] underline-offset-2 hover:underline"
          >
            {editingPlan ? "Reset payment" : "Edit payment"}
          </button>
        </div>
      ) : null}

      {swapSeats > 0 && swapListings.length > 0 ? (
        <div className="mb-4 flex flex-col gap-2">
          <span className="text-sm text-[var(--ink-muted)]">Your formal to offer</span>
          <OutlineCombobox
            open={offeringPickerOpen}
            onOpenChange={setOfferingPickerOpen}
            value={effectiveOfferingId}
            options={swapListings.map((l) => ({
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
        </div>
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

      {problem && editingPlan ? (
        <p className="mb-4 text-sm text-[var(--danger)]">{problem}</p>
      ) : null}
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
          className="inline-flex min-w-[8.5rem] items-center justify-center rounded-full bg-[var(--accent)] px-5 py-1.5 text-sm text-[var(--accent-ink)] hover:bg-[var(--accent-hover)] disabled:opacity-50"
        >
          {submitting ? <LoadingDots /> : "Send request!"}
        </button>
      </div>
    </Modal>
  );
}

/** Per-seat payment: who pays for each seat, and how. */
function SeatPlanTable({
  plan,
  allowsSwap,
  allowsPay,
  price,
  onChange,
}: {
  plan: PlanSeat[];
  allowsSwap: boolean;
  allowsPay: boolean;
  price?: number;
  onChange: (next: PlanSeat[]) => void;
}) {
  const cash = price !== undefined ? formatPrice(price) : "cash";
  const optionsFor = (seat: PlanSeat) => {
    const opts: { value: string; label: string }[] = [];
    const friend = seat.kind === "friend" || seat.kind === "link";
    if (allowsSwap) {
      opts.push({ value: "you:swap", label: friend ? "You cover: swap a seat" : "Swap a seat" });
    }
    opts.push({ value: "you:credit", label: friend ? "You cover: 1 spoon" : "1 of your spoons" });
    if (allowsPay) opts.push({ value: "you:pay", label: friend ? `You cover: ${cash}` : cash });
    if (seat.kind === "friend") {
      opts.push({ value: "them:credit", label: "They pay: 1 spoon" });
      if (allowsPay) opts.push({ value: "them:pay", label: `They pay: ${cash}` });
    }
    if (seat.kind === "link") {
      opts.push({ value: "them:credit", label: "They pay: their own spoon" });
    }
    return opts;
  };
  return (
    <div className="mb-4 flex flex-col gap-2">
      <p className="text-sm text-[var(--ink-muted)]">Who pays for each seat?</p>
      {plan.map((seat, i) => (
        <div
          key={seat.key}
          className="flex items-center justify-between gap-3 rounded-2xl border-2 border-[color-mix(in_srgb,var(--ink)_22%,transparent)] bg-[var(--paper)] px-4 py-2"
        >
          <span className="min-w-0 truncate text-sm font-bold">{seat.label}</span>
          <select
            aria-label={seat.kind === "you" ? "How your seat is paid" : `How ${seat.label}'s seat is paid`}
            value={`${seat.payer}:${seat.method}`}
            onChange={(e) => {
              const [payer, method] = e.target.value.split(":") as [Payer, RequestType];
              const next = [...plan];
              next[i] = { ...seat, payer, method };
              onChange(next);
            }}
            className="max-w-[60%] cursor-pointer rounded-full border-[1.5px] border-[var(--ink)] bg-[var(--bg)] px-3 py-1 text-sm text-[var(--ink)] focus:outline-none"
          >
            {optionsFor(seat).map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
      ))}
    </div>
  );
}

function StepButton({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string;
  disabled: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border-2 border-[var(--ink)] text-lg leading-none text-[var(--ink)] transition-colors hover:bg-[var(--ink)] hover:text-[var(--bg)] disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-[var(--ink)]"
    >
      {children}
    </button>
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
