import type { SwapRequest } from "./types";

/** Resolve request type; pay requests have no offering listing. */
export function resolveRequestType(request: SwapRequest): SwapRequest["requestType"] {
  if (request.requestType) return request.requestType;
  return request.offeringListingId ? "swap" : "pay";
}

/** Requests from others to join this listing (swap or pay). */
export function incomingRequestsForListing(
  requests: SwapRequest[],
  userId: string,
  listingId: string,
): SwapRequest[] {
  return requests.filter(
    (r) => r.toUserId === userId && r.targetListingId === listingId,
  );
}

/**
 * Outgoing requests from this listing page:
 * - swap: offered via this listing
 * - pay: not tied to a listing (shown on every owned listing page)
 */
export function sentRequestsForListing(
  requests: SwapRequest[],
  userId: string,
  listingId: string,
): SwapRequest[] {
  return requests.filter((r) => {
    if (r.fromUserId !== userId) return false;
    if (r.offeringListingId) return r.offeringListingId === listingId;
    return resolveRequestType(r) === "pay";
  });
}

/** All pay requests sent by the user (no offering listing). */
export function outgoingPayRequests(
  requests: SwapRequest[],
  userId: string,
): SwapRequest[] {
  return requests.filter(
    (r) => r.fromUserId === userId && resolveRequestType(r) === "pay",
  );
}
