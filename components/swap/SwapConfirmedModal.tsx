"use client";

import Link from "next/link";
import { useQuery } from "convex/react";
import { Modal } from "@/components/ui/Modal";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import type { User } from "@/lib/auth/types";
import { formatListingDate } from "@/lib/data/format";
import type { Listing, RequestType } from "@/lib/data/types";

type Props = {
  open: boolean;
  onClose: () => void;
  requestType?: RequestType;
  myListing: Listing | null;
  theirListing: Listing | null;
  otherUser: User | null;
  /** Used to load gated contact via the same query as the public profile. */
  otherUserId: string | null;
};

export function SwapConfirmedModal({
  open,
  onClose,
  requestType = "swap",
  myListing,
  theirListing,
  otherUser,
  otherUserId,
}: Props) {
  const isPay = requestType === "pay";
  const gatedProfile = useQuery(
    api.users.getPublicProfile,
    open && otherUserId ? { userId: otherUserId as Id<"users"> } : "skip",
  );

  const instagramHandle =
    gatedProfile?.user != null
      ? (gatedProfile.user.instagramHandle ?? "").trim()
      : "";
  const whatsappPhone =
    gatedProfile?.user != null
      ? (gatedProfile.user.whatsappPhone ?? "").trim()
      : "";
  const normalizedInstagram = instagramHandle.replace(/^@+/, "");
  const contactLoading =
    open && otherUserId !== null && gatedProfile === undefined;

  return (
    <Modal open={open} onClose={onClose}>
      <div className="text-center">
        <h2 className="font-display text-4xl uppercase tracking-wide">
          {isPay ? "Request accepted" : "Swap confirmed"}
        </h2>
        {isPay ? (
          theirListing && (
            <p className="mt-4 text-[var(--ink-muted)]">
              You&apos;re joining{" "}
              <span className="text-[var(--ink)]">{theirListing.college}</span> ·{" "}
              {formatListingDate(theirListing.dateTime)}
            </p>
          )
        ) : (
          <>
            {theirListing && (
              <p className="mt-4 text-[var(--ink-muted)]">
                You&apos;re going to{" "}
                <span className="text-[var(--ink)]">{theirListing.college}</span> ·{" "}
                {formatListingDate(theirListing.dateTime)}
              </p>
            )}
            {myListing && otherUser && (
              <p className="mt-1 text-[var(--ink-muted)]">
                <Link href={`/profile/${otherUser.id}`} className="text-[var(--ink)] hover:underline">
                  {otherUser.name.split(" ")[0]}
                </Link>{" "}
                has joined your group at{" "}
                <span className="text-[var(--ink)]">{myListing.college}</span> ·{" "}
                {formatListingDate(myListing.dateTime)}
              </p>
            )}
          </>
        )}
        {isPay && myListing && otherUser && (
          <p className="mt-1 text-[var(--ink-muted)]">
            <Link href={`/profile/${otherUser.id}`} className="text-[var(--ink)] hover:underline">
              {otherUser.name.split(" ")[0]}
            </Link>{" "}
            will join your group at{" "}
            <span className="text-[var(--ink)]">{myListing.college}</span> ·{" "}
            {formatListingDate(myListing.dateTime)}
          </p>
        )}
        {otherUser && (
          <div className="mt-5 rounded-2xl border-[2px] border-[var(--ink)] bg-[var(--paper)] p-4 text-left">
            <p className="text-sm text-[var(--ink)]">
              Please reach out to this person to process the rest of your formal.
            </p>
            <div className="mt-3 flex flex-col gap-2 text-sm">
              <p className="text-[var(--ink-muted)]">
                <span className="text-[var(--ink)]">Instagram:</span>{" "}
                {contactLoading ? (
                  <span className="text-[var(--ink-soft)]">Loading…</span>
                ) : normalizedInstagram ? (
                  <a
                    href={`https://instagram.com/${normalizedInstagram}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[var(--ink)] underline underline-offset-2"
                  >
                    @{normalizedInstagram}
                  </a>
                ) : (
                  "Not provided"
                )}
              </p>
              <p className="text-[var(--ink-muted)]">
                <span className="text-[var(--ink)]">WhatsApp:</span>{" "}
                {contactLoading ? (
                  <span className="text-[var(--ink-soft)]">Loading…</span>
                ) : whatsappPhone ? (
                  <a
                    href={`https://wa.me/${whatsappPhone.replace(/[^\d+]/g, "")}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[var(--ink)] underline underline-offset-2"
                  >
                    {whatsappPhone}
                  </a>
                ) : (
                  "Not provided"
                )}
              </p>
            </div>
            <Link
              href={`/profile/${otherUser.id}`}
              className="mt-3 inline-flex text-sm text-[var(--ink)] underline underline-offset-2"
            >
              View profile
            </Link>
          </div>
        )}
        <button
          type="button"
          onClick={onClose}
          className="mt-6 rounded-full bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white px-6 py-2 text-sm"
        >
          Done
        </button>
      </div>
    </Modal>
  );
}
