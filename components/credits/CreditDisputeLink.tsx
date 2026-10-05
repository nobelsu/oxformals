"use client";

import { errorMessage } from "@/lib/errorMessage";
import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";

/**
 * For a guest who paid with credits, after the formal: "Didn't happen?" stops
 * the host's payout and sends it to the team. Renders nothing otherwise.
 */
export function CreditDisputeLink({ listingId }: { listingId: string }) {
  const holds = useQuery(api.credits.getMyHoldsForListing, {
    listingId: listingId as Id<"listings">,
  });
  const report = useMutation(api.credits.reportFormalDidntHappen);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!holds) return null;
  if (holds.disputed > 0) {
    return (
      <p className="text-xs text-[var(--ink-muted)]">
        Reported. We&apos;ll sort out your credit.
      </p>
    );
  }
  if (holds.held === 0) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="cursor-pointer self-start text-xs text-[var(--ink-muted)] underline underline-offset-2 hover:text-[var(--ink)]"
      >
        Formal didn&apos;t happen?
      </button>
      {error ? <p className="text-xs text-[var(--danger)]">{error}</p> : null}
      <ConfirmDialog
        open={confirming}
        message="Report that this formal didn't happen?"
        confirmLabel="It didn't happen"
        variant="destructive"
        onCancel={() => setConfirming(false)}
        onConfirm={async () => {
          setConfirming(false);
          try {
            await report({ listingId: listingId as Id<"listings"> });
          } catch (err) {
            setError(errorMessage(err, "Couldn't send that."));
          }
        }}
      />
    </>
  );
}
