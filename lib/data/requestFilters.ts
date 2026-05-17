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

/** Pending incoming requests on a listing owned by the user. */
export function pendingIncomingRequestsForListing(
  requests: SwapRequest[],
  userId: string,
  listingId: string,
): SwapRequest[] {
  return incomingRequestsForListing(requests, userId, listingId).filter(
    (r) => r.status === "pending",
  );
}

/**
 * Outgoing swap requests offered via this listing.
 * Pay requests have no offering listing; see outgoingPayRequests on the Requests tab.
 */
export function sentRequestsForListing(
  requests: SwapRequest[],
  userId: string,
  listingId: string,
): SwapRequest[] {
  return requests.filter(
    (r) => r.fromUserId === userId && r.offeringListingId === listingId,
  );
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

/** True when the user already has a pending or accepted outgoing request. */
export function hasBlockingOutgoingRequest(
  requests: SwapRequest[],
  userId: string,
): boolean {
  return requests.some(
    (r) =>
      r.fromUserId === userId &&
      (r.status === "pending" || r.status === "accepted"),
  );
}

/** First blocking outgoing request, if any. */
export function findBlockingOutgoingRequest(
  requests: SwapRequest[],
  userId: string,
): SwapRequest | undefined {
  return requests.find(
    (r) =>
      r.fromUserId === userId &&
      (r.status === "pending" || r.status === "accepted"),
  );
}
