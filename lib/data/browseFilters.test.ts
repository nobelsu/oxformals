import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  EMPTY_BROWSE_FILTERS,
  activeFilterSections,
  browseFilterPredicate,
  guestsLabel,
  parseBrowseFilters,
  whenDateKeys,
  writeBrowseFilters,
  type BrowseFilters,
} from "./browseFilters";
import type { Listing } from "./types";

function listing(over: Partial<Listing> = {}): Listing {
  return {
    id: "l1",
    ownerUserId: "u1",
    college: "Keble",
    dateTime: "2026-10-01T18:15:00.000Z",
    groupSize: 4,
    seatsAvailable: 2,
    members: ["u1"],
    year: "2",
    role: "Undergrad",
    message: "",
    menu: "",
    listingType: "swap",
    formalType: "social",
    status: "active",
    createdAt: 0,
    ...over,
  };
}

function filters(over: Partial<BrowseFilters>): BrowseFilters {
  return { ...EMPTY_BROWSE_FILTERS, ...over };
}

const ctx = {
  // Thursday.
  todayKey: "2026-10-01",
  dateKeyOf: (l: Listing) => l.dateTime.slice(0, 10),
  wishlist: new Set(["Worcester"]),
};

function passes(f: BrowseFilters, l: Listing): boolean {
  return browseFilterPredicate(f, ctx)(l);
}

describe("whenDateKeys", () => {
  it("is null with nothing picked", () => {
    assert.equal(whenDateKeys(null, [], "2026-10-01"), null);
    assert.equal(whenDateKeys("dates", [], "2026-10-01"), null);
  });

  it("tonight is just today", () => {
    assert.deepEqual([...whenDateKeys("tonight", [], "2026-10-01")!], ["2026-10-01"]);
  });

  it("this week runs to Sunday", () => {
    assert.deepEqual(
      [...whenDateKeys("week", [], "2026-10-01")!],
      ["2026-10-01", "2026-10-02", "2026-10-03", "2026-10-04"],
    );
    assert.deepEqual([...whenDateKeys("week", [], "2026-10-04")!], ["2026-10-04"]);
  });

  it("weekend is the coming Saturday and Sunday", () => {
    assert.deepEqual(
      [...whenDateKeys("weekend", [], "2026-10-01")!],
      ["2026-10-03", "2026-10-04"],
    );
    assert.deepEqual(
      [...whenDateKeys("weekend", [], "2026-10-03")!],
      ["2026-10-03", "2026-10-04"],
    );
    assert.deepEqual([...whenDateKeys("weekend", [], "2026-10-04")!], ["2026-10-04"]);
  });

  it("crosses month ends", () => {
    assert.deepEqual(
      [...whenDateKeys("week", [], "2026-09-30")!],
      ["2026-09-30", "2026-10-01", "2026-10-02", "2026-10-03", "2026-10-04"],
    );
  });

  it("picked dates pass through", () => {
    assert.deepEqual(
      [...whenDateKeys("dates", ["2026-10-09"], "2026-10-01")!],
      ["2026-10-09"],
    );
  });
});

describe("browseFilterPredicate", () => {
  it("passes everything with no filters", () => {
    assert.equal(passes(EMPTY_BROWSE_FILTERS, listing()), true);
  });

  it("filters by when", () => {
    assert.equal(passes(filters({ when: "tonight" }), listing()), true);
    assert.equal(
      passes(filters({ when: "tonight" }), listing({ dateTime: "2026-10-02T18:00:00.000Z" })),
      false,
    );
  });

  it("where matches picked colleges or Want to go", () => {
    const f = filters({ colleges: ["Balliol"], wantToGo: true });
    assert.equal(passes(f, listing({ college: "Balliol" })), true);
    assert.equal(passes(f, listing({ college: "Worcester" })), true);
    assert.equal(passes(f, listing({ college: "Keble" })), false);
  });

  it("ignores Want to go with an empty list", () => {
    const pred = browseFilterPredicate(filters({ wantToGo: true }), {
      ...ctx,
      wishlist: new Set(),
    });
    assert.equal(pred(listing()), true);
  });

  it("how: both matches swap and pay", () => {
    assert.equal(passes(filters({ how: ["pay"] }), listing({ listingType: "both" })), true);
    assert.equal(passes(filters({ how: ["swap"] }), listing({ listingType: "both" })), true);
    assert.equal(passes(filters({ how: ["pay"] }), listing({ listingType: "swap" })), false);
    assert.equal(
      passes(filters({ how: ["swap", "pay"] }), listing({ listingType: "pay" })),
      true,
    );
  });

  it("seats needs room for you and your guests", () => {
    assert.equal(passes(filters({ guests: 1 }), listing({ seatsAvailable: 2 })), true);
    assert.equal(passes(filters({ guests: 2 }), listing({ seatsAvailable: 2 })), false);
  });

  it("filters by type", () => {
    assert.equal(passes(filters({ types: ["networking"] }), listing()), false);
    assert.equal(passes(filters({ types: ["social", "networking"] }), listing()), true);
  });
});

describe("URL round trip", () => {
  it("writes and reads back the same filters", () => {
    const f = filters({
      when: "dates",
      dates: ["2026-10-02", "2026-10-09"],
      colleges: ["St John's", "Keble"],
      wantToGo: true,
      how: ["swap"],
      guests: 2,
      types: ["social"],
    });
    const params = writeBrowseFilters(new URLSearchParams("tab=browse&q=x"), f);
    assert.equal(params.get("tab"), "browse");
    assert.equal(params.get("q"), "x");
    assert.deepEqual(parseBrowseFilters(params, 4), f);
  });

  it("drops unset filters and junk", () => {
    const params = writeBrowseFilters(
      new URLSearchParams("when=week&how=credit,pay&seats=99&type=disco"),
      EMPTY_BROWSE_FILTERS,
    );
    assert.equal(params.toString(), "");
    const parsed = parseBrowseFilters(
      new URLSearchParams("when=soon&how=credit,pay&seats=99&type=disco"),
      4,
    );
    assert.deepEqual(parsed, filters({ how: ["pay"], guests: 4 }));
  });
});

describe("activeFilterSections", () => {
  it("counts sections, not picks", () => {
    assert.equal(activeFilterSections(EMPTY_BROWSE_FILTERS), 0);
    assert.equal(
      activeFilterSections(
        filters({ colleges: ["Keble", "Worcester"], wantToGo: true, how: ["swap", "pay"] }),
      ),
      2,
    );
    assert.equal(activeFilterSections(filters({ when: "dates" })), 0);
  });
});

describe("guestsLabel", () => {
  it("reads naturally", () => {
    assert.equal(guestsLabel(0), "Just me");
    assert.equal(guestsLabel(3), "Me + 3");
  });
});
