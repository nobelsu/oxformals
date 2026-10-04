import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { listingShareText } from "./format";

describe("listingShareText", () => {
  it("names the college and the Oxford-time day", () => {
    assert.equal(listingShareText({ college: "Keble", dateTime: "2026-10-09T18:15:00.000Z" }), "Formal at Keble on Fri 9 Oct. Want to come?");
  });

  it("uses the Oxford date when UTC is still the day before", () => {
    // 23:30 UTC on 8 Oct is 00:30 on 9 Oct in Oxford (BST).
    assert.equal(listingShareText({ college: "Oriel", dateTime: "2026-10-08T23:30:00.000Z" }), "Formal at Oriel on Fri 9 Oct. Want to come?");
  });
});
