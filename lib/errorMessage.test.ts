import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { ConvexError } from "convex/values";
import { errorMessage } from "./errorMessage";

describe("errorMessage", () => {
  it("shows the text the backend sent", () => {
    assert.equal(
      errorMessage(new ConvexError("Waiting for Priya to confirm they're coming")),
      "Waiting for Priya to confirm they're coming",
    );
  });

  it("unwraps a development error", () => {
    const dev = new Error(
      "[CONVEX M(listings:acceptRequest)] [Request ID: abc] Server Error\nUncaught Error: This formal has passed.\n    at handler (../convex/listings.ts:470:12)",
    );
    assert.equal(errorMessage(dev), "This formal has passed.");
  });

  it("falls back when production hid the reason", () => {
    const prod = new Error("[CONVEX M(listings:acceptRequest)] [Request ID: abc] Server Error");
    assert.equal(errorMessage(prod, "Could not accept request."), "Could not accept request.");
  });

  it("falls back for things that aren't errors", () => {
    assert.equal(errorMessage("nope"), "Something went wrong. Try again.");
  });
});
