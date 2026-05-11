"use client";

import Link from "next/link";
import { Modal } from "@/components/ui/Modal";
import type { User } from "@/lib/auth/types";
import { formatListingDate } from "@/lib/data/format";
import type { Listing } from "@/lib/data/types";

type Props = {
  open: boolean;
  onClose: () => void;
  myListing: Listing | null;
  theirListing: Listing | null;
  otherUser: User | null;
};

export function SwapConfirmedModal({
  open,
  onClose,
  myListing,
  theirListing,
  otherUser,
}: Props) {
  const instagramHandle = otherUser?.instagramHandle?.trim() ?? "";
  const whatsappPhone = otherUser?.whatsappPhone?.trim() ?? "";
  const normalizedInstagram = instagramHandle.replace(/^@+/, "");

  return (
    <Modal open={open} onClose={onClose}>
      <div className="text-center">
        <h2 className="font-display text-4xl uppercase tracking-wide">Swap confirmed</h2>
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
        {otherUser && (
          <div className="mt-5 rounded-2xl border-[2px] border-[var(--ink)] bg-[var(--paper)] p-4 text-left">
            <p className="text-sm text-[var(--ink)]">
              Please reach out to this person to process the rest of your formal.
            </p>
            <div className="mt-3 flex flex-col gap-2 text-sm">
              <p className="text-[var(--ink-muted)]">
                <span className="text-[var(--ink)]">Instagram:</span>{" "}
                {normalizedInstagram ? (
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
                {whatsappPhone ? (
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
