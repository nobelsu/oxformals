import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { groupListingsByDay } from "./groupListingsByDay";
import type { Listing } from "./types";

function listing(id: string, dateTime: string): Listing {
  return {
    id,
    ownerUserId: "u1",
    college: "Balliol",
    dateTime,
    groupSize: 4,
    seatsAvailable: 2,
    members: [],
    year: "2",
    role: "PPE",
    message: "",
    menu: "",
    listingType: "swap",
    status: "active",
    createdAt: 0,
  };
}

describe("groupListingsByDay", () => {
  it("returns an empty array for no listings", () => {
    assert.deepEqual(groupListingsByDay([]), []);
  });

  it("buckets same-day listings into one group", () => {
    const groups = groupListingsByDay([
      listing("a", "2026-05-08T19:00:00"),
      listing("b", "2026-05-08T21:30:00"),
    ]);
    assert.equal(groups.length, 1);
    assert.equal(groups[0].dateKey, "2026-05-08");
    assert.deepEqual(
      groups[0].listings.map((l) => l.id),
      ["a", "b"],
    );
  });

  it("sorts groups and listings ascending regardless of input order", () => {
    const groups = groupListingsByDay([
      listing("late", "2026-05-09T18:00:00"),
      listing("second", "2026-05-08T21:00:00"),
      listing("first", "2026-05-08T19:00:00"),
    ]);
    assert.deepEqual(
      groups.map((g) => g.dateKey),
      ["2026-05-08", "2026-05-09"],
    );
    assert.deepEqual(
      groups[0].listings.map((l) => l.id),
      ["first", "second"],
    );
  });

  it("uses the earliest listing of the day as the group dateTime", () => {
    const groups = groupListingsByDay([
      listing("b", "2026-05-08T21:30:00"),
      listing("a", "2026-05-08T19:00:00"),
    ]);
    assert.equal(groups[0].dateTime, "2026-05-08T19:00:00");
  });

  it("splits local days that share a UTC day", () => {
    // 23:30 on the 8th and 00:30 on the 9th, local time.
    const groups = groupListingsByDay([
      listing("a", "2026-05-08T23:30:00"),
      listing("b", "2026-05-09T00:30:00"),
    ]);
    assert.deepEqual(
      groups.map((g) => g.dateKey),
      ["2026-05-08", "2026-05-09"],
    );
  });

  it("does not mutate the input array", () => {
    const input = [
      listing("late", "2026-05-09T18:00:00"),
      listing("early", "2026-05-08T19:00:00"),
    ];
    groupListingsByDay(input);
    assert.deepEqual(
      input.map((l) => l.id),
      ["late", "early"],
    );
  });
});
