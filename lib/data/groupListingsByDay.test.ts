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

  // These two tests are inherently timezone-dependent: they assert the
  // local-day bucketing that only holds under the repo's test timezone,
  // Europe/London (see /etc/localtime on this machine, or set TZ
  // explicitly when running elsewhere). That dependency is the point —
  // they exist to prove grouping uses local time, not UTC.

  it("splits local days that share a UTC day", () => {
    // Both instants fall on the same UTC calendar day (10 Aug), but in
    // Europe/London (BST, UTC+1 in August) they land on different local
    // days: 20:00 UTC -> 21:00 local (10 Aug), 23:30 UTC -> 00:30 local
    // (11 Aug). A UTC-based grouping would wrongly merge these into one.
    const groups = groupListingsByDay([
      listing("a", "2026-08-10T20:00:00Z"),
      listing("b", "2026-08-10T23:30:00Z"),
    ]);
    assert.deepEqual(
      groups.map((g) => g.dateKey),
      ["2026-08-10", "2026-08-11"],
    );
  });

  it("keeps a DST-transition day intact despite the UTC-offset change", () => {
    // Europe/London springs forward at 01:00 UTC on 29 Mar 2026 (clocks
    // jump from 01:00 GMT to 02:00 BST), so 29 Mar is a 23-hour local day
    // split across two different UTC offsets. Two listings that both fall
    // on local 29 Mar — one before the transition (GMT, UTC+0) and one
    // after (BST, UTC+1) — must still bucket into a single group, and a
    // listing just after local midnight on the 30th must land in the next
    // group.
    const groups = groupListingsByDay([
      listing("morning", "2026-03-29T00:30:00Z"), // 00:30 GMT, pre-transition
      listing("evening", "2026-03-29T22:30:00Z"), // 23:30 BST, post-transition
      listing("nextDay", "2026-03-29T23:30:00Z"), // 00:30 BST on 30 Mar
    ]);
    assert.deepEqual(
      groups.map((g) => g.dateKey),
      ["2026-03-29", "2026-03-30"],
    );
    assert.deepEqual(
      groups[0].listings.map((l) => l.id),
      ["morning", "evening"],
    );
    assert.deepEqual(
      groups[1].listings.map((l) => l.id),
      ["nextDay"],
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
