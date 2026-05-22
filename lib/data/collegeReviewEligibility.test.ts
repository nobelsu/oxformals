import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  canConfirmAttendanceCollegeListing,
  canReviewCollegeListing,
  isGuestForCollegeListing,
  listingIsPast,
} from "./collegeReviewEligibility";

const user = { id: "u1", college: "Merton" };
const pastIso = "2020-01-01T19:00:00.000Z";
const futureIso = "2099-01-01T19:00:00.000Z";
const nowMs = Date.parse("2021-06-01T00:00:00.000Z");

const guestListing = {
  college: "Magdalen",
  dateTime: pastIso,
  members: ["u1"],
  ownerUserId: "owner",
};

describe("listingIsPast", () => {
  it("is true when date is before now", () => {
    assert.equal(listingIsPast(pastIso, nowMs), true);
  });

  it("is false when date is after now", () => {
    assert.equal(listingIsPast(futureIso, nowMs), false);
  });
});

describe("canReviewCollegeListing", () => {
  it("allows member at non-home college after formal when confirmed", () => {
    const r = canReviewCollegeListing(user, guestListing, nowMs, {
      hasConfirmedAttendance: true,
    });
    assert.equal(r.canReview, true);
    assert.equal(r.isPast, true);
  });

  it("blocks review without attendance confirmation", () => {
    const r = canReviewCollegeListing(user, guestListing, nowMs);
    assert.equal(r.canReview, false);
    assert.match(r.reason ?? "", /confirm/i);
  });

  it("blocks home college formal", () => {
    const r = canReviewCollegeListing(
      user,
      { ...guestListing, college: "Merton" },
      nowMs,
      { hasConfirmedAttendance: true },
    );
    assert.equal(r.canReview, false);
    assert.match(r.reason ?? "", /own college/i);
  });

  it("blocks when not a member", () => {
    const r = canReviewCollegeListing(
      user,
      { ...guestListing, members: ["u2"] },
      nowMs,
      { hasConfirmedAttendance: true },
    );
    assert.equal(r.canReview, false);
  });

  it("blocks before formal date", () => {
    const r = canReviewCollegeListing(
      user,
      { ...guestListing, dateTime: futureIso },
      nowMs,
      { hasConfirmedAttendance: true },
    );
    assert.equal(r.canReview, false);
    assert.equal(r.isPast, false);
  });

  it("blocks when review already exists", () => {
    const r = canReviewCollegeListing(user, guestListing, nowMs, {
      hasExistingReview: true,
      hasConfirmedAttendance: true,
    });
    assert.equal(r.canReview, false);
  });
});

describe("canConfirmAttendanceCollegeListing", () => {
  it("allows guest on past formal", () => {
    const r = canConfirmAttendanceCollegeListing(user, guestListing, nowMs);
    assert.equal(r.canConfirm, true);
  });

  it("blocks when already responded", () => {
    const r = canConfirmAttendanceCollegeListing(user, guestListing, nowMs, {
      hasRespondedToAttendance: true,
    });
    assert.equal(r.canConfirm, false);
  });

  it("blocks host", () => {
    const r = canConfirmAttendanceCollegeListing(
      { id: "owner", college: "Magdalen" },
      guestListing,
      nowMs,
    );
    assert.equal(r.canConfirm, false);
  });
});

describe("isGuestForCollegeListing", () => {
  it("is false for the host college", () => {
    assert.equal(isGuestForCollegeListing(user, "Merton"), false);
  });

  it("is true for another college", () => {
    assert.equal(isGuestForCollegeListing(user, "Magdalen"), true);
  });
});
