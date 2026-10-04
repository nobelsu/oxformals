"use client";

import { useMemo, useState } from "react";
import { useAuth } from "@/components/auth/useAuth";
import { useData } from "@/components/data/useData";
import { IncomingRequestRow } from "@/components/swap/IncomingRequestRow";
import { SwapConfirmedModal } from "@/components/swap/SwapConfirmedModal";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { EmptyState } from "@/components/ui/EmptyState";
import { partySuffix, requestSeatCount } from "@/lib/data/party";
import {
  incomingRequestsForListing,
  resolveRequestType,
} from "@/lib/data/requestFilters";
import { placeholderUser } from "@/lib/data/users";
import type { Listing, RequestType } from "@/lib/data/types";

/**
 * Requests to join one of your listings, with accept / decline. Shared by the
 * listing's requests page and the listing popup.
 */
export function IncomingRequests({ listing }: { listing: Listing }) {
  const { user } = useAuth();
  const { requests, getUser, getListing, acceptRequest, declineRequest } = useData();

  const incoming = useMemo(
    () =>
      user
        ? incomingRequestsForListing(requests, user.id, listing.id).sort(
            (a, b) => b.createdAt - a.createdAt,
          )
        : [],
    [requests, user, listing.id],
  );

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
  const [acceptError, setAcceptError] = useState<string | null>(null);

  return (
    <>
      {acceptError ? (
        <p className="mb-3 text-sm text-[var(--danger)]">{acceptError}</p>
      ) : null}
      {incoming.length === 0 ? (
        <EmptyState icon="inbox" title="No requests yet" />
      ) : (
        <div className="flex flex-col gap-3">
          {incoming.map((r) => {
            const fromUser = getUser(r.fromUserId) ?? placeholderUser(r.fromUserId);
            return (
              <IncomingRequestRow
                key={r.id}
                request={r}
                fromUser={fromUser}
                offeringListing={
                  r.offeringListingId ? getListing(r.offeringListingId) : undefined
                }
                targetListing={listing}
                onAccept={() => {
                  const kind = resolveRequestType(r);
                  const who =
                    requestSeatCount(r) > 1
                      ? `${fromUser.name} ${partySuffix(r, (id) => getUser(id)?.name)} (${requestSeatCount(r)} seats)`
                      : fromUser.name;
                  setAcceptError(null);
                  setConfirmDialog({
                    message:
                      kind === "swap"
                        ? `Accept this swap with ${who}?`
                        : `Accept ${who}?`,
                    confirmLabel: "Accept",
                    onConfirm: async () => {
                      setConfirmDialog(null);
                      try {
                        const updated = await acceptRequest(r.id);
                        if (!updated) return;
                        if (kind !== "swap") {
                          setConfirmed({
                            requestType: kind,
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
                      resolveRequestType(r) === "swap"
                        ? "Decline this swap request?"
                        : "Decline this request?",
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

      <ConfirmDialog
        open={!!confirmDialog}
        message={confirmDialog?.message ?? ""}
        variant={confirmDialog?.variant}
        confirmLabel={confirmDialog?.confirmLabel}
        onConfirm={() => confirmDialog?.onConfirm()}
        onCancel={() => setConfirmDialog(null)}
      />
    </>
  );
}
