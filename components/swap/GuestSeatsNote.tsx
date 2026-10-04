"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";

/** "+2 guests" after a member's name. */
export function guestCountFor(
  guestSeats: { userId: string; count: number }[] | undefined,
  userId: string,
): number {
  return guestSeats?.find((g) => g.userId === userId)?.count ?? 0;
}

export function GuestCountLabel({ count }: { count: number }) {
  if (count === 0) return null;
  return (
    <span className="ml-1 text-[0.72rem] font-bold text-[var(--ink-muted)]">
      + {count} guest{count === 1 ? "" : "s"}
    </span>
  );
}

/**
 * For the viewer's own unnamed guest seats: give one back (e.g. after a group
 * swap left them more seats than they need).
 */
export function ReleaseGuestSeatButton({
  listingId,
  count,
}: {
  listingId: string;
  count: number;
}) {
  const release = useMutation(api.listings.releaseGuestSeat);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  if (count === 0) return null;
  return (
    <div className="flex flex-col gap-1">
      <p className="text-xs text-[var(--ink-muted)]">
        You&apos;re holding {count} guest seat{count === 1 ? "" : "s"}.{" "}
        <button
          type="button"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            setError(null);
            try {
              await release({ listingId: listingId as Id<"listings"> });
            } catch (err) {
              setError(err instanceof Error ? err.message : "Couldn't do that.");
            } finally {
              setBusy(false);
            }
          }}
          className="cursor-pointer font-bold text-[var(--accent)] underline-offset-2 hover:underline disabled:opacity-50"
        >
          Give one back
        </button>
      </p>
      {error ? <p className="text-xs text-[var(--danger)]">{error}</p> : null}
    </div>
  );
}
