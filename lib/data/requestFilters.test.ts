import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { SwapRequest } from "./types";
import { findBlockingOutgoingRequestForTarget } from "./requestFilters";

const userId = "user-a";
const targetA = "listing-target-a";
const targetB = "listing-target-b";

function req(overrides: Partial<SwapRequest> & Pick<SwapRequest, "id">): SwapRequest {
  return {
    fromUserId: userId,
    toUserId: "user-b",
    targetListingId: targetA,
    requestType: "swap",
    message: "",
    status: "pending",
    createdAt: 0,
    ...overrides,
  };
}

describe("findBlockingOutgoingRequestForTarget", () => {
  it("returns undefined when blocking request is for a different target", () => {
    const requests = [
      req({
        id: "1",
        targetListingId: targetA,
        status: "accepted",
      }),
    ];
    assert.equal(
      findBlockingOutgoingRequestForTarget(requests, userId, targetB),
      undefined,
    );
  });

  it("blocks pending and accepted requests to the same target", () => {
    const pending = req({ id: "1", targetListingId: targetA, status: "pending" });
    const accepted = req({ id: "2", targetListingId: targetA, status: "accepted" });
    assert.equal(
      findBlockingOutgoingRequestForTarget([pending], userId, targetA)?.id,
      "1",
    );
    assert.equal(
      findBlockingOutgoingRequestForTarget([accepted], userId, targetA)?.id,
      "2",
    );
  });

  it("ignores declined requests", () => {
    const requests = [
      req({ id: "1", targetListingId: targetA, status: "declined" }),
    ];
    assert.equal(
      findBlockingOutgoingRequestForTarget(requests, userId, targetA),
      undefined,
    );
  });
});
