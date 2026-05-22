import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  computeAttendanceByCollege,
  computeAttendanceByCollegeFromConfirmations,
  guestCountForListing,
} from "./collegeAttendance";

const nowMs = Date.parse("2021-06-01T00:00:00.000Z");
const pastIso = "2020-01-01T19:00:00.000Z";
const futureIso = "2099-01-01T19:00:00.000Z";

describe("guestCountForListing", () => {
  it("counts only non-owner members", () => {
    assert.equal(
      guestCountForListing({
        college: "Magdalen",
        dateTime: pastIso,
        ownerUserId: "owner",
        members: ["owner", "g1", "g2"],
      }),
      2,
    );
  });

  it("returns 0 when only owner is listed", () => {
    assert.equal(
      guestCountForListing({
        college: "Magdalen",
        dateTime: pastIso,
        ownerUserId: "owner",
        members: ["owner"],
      }),
      0,
    );
  });
});

describe("computeAttendanceByCollege", () => {
  it("sums guests for past formals per college", () => {
    const map = computeAttendanceByCollege(
      [
        {
          college: "Magdalen",
          dateTime: pastIso,
          ownerUserId: "o1",
          members: ["o1", "g1", "g2"],
        },
        {
          college: "Magdalen",
          dateTime: pastIso,
          ownerUserId: "o2",
          members: ["o2", "g3"],
        },
      ],
      nowMs,
    );
    const stats = map.get("Magdalen");
    assert.equal(stats?.attendanceCount, 3);
    assert.equal(stats?.completedFormalCount, 2);
  });

  it("ignores future formals", () => {
    const map = computeAttendanceByCollege(
      [
        {
          college: "Exeter",
          dateTime: futureIso,
          ownerUserId: "o1",
          members: ["o1", "g1"],
        },
      ],
      nowMs,
    );
    assert.equal(map.get("Exeter"), undefined);
  });
});

describe("computeAttendanceByCollegeFromConfirmations", () => {
  it("counts one attendance per confirmation and one formal per listing", () => {
    const map = computeAttendanceByCollegeFromConfirmations(
      [
        {
          listingId: "l1",
          college: "Magdalen",
          dateTime: pastIso,
        },
        {
          listingId: "l1",
          college: "Magdalen",
          dateTime: pastIso,
        },
        {
          listingId: "l2",
          college: "Magdalen",
          dateTime: pastIso,
        },
      ],
      nowMs,
    );
    const stats = map.get("Magdalen");
    assert.equal(stats?.attendanceCount, 3);
    assert.equal(stats?.completedFormalCount, 2);
  });

  it("ignores declined attendance rows", () => {
    const map = computeAttendanceByCollegeFromConfirmations(
      [
        {
          listingId: "l1",
          college: "Magdalen",
          dateTime: pastIso,
          attended: true,
        },
        {
          listingId: "l1",
          college: "Magdalen",
          dateTime: pastIso,
          attended: false,
        },
      ],
      nowMs,
    );
    const stats = map.get("Magdalen");
    assert.equal(stats?.attendanceCount, 1);
    assert.equal(stats?.completedFormalCount, 1);
  });
});
