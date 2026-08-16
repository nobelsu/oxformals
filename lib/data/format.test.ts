import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  formatDayLabel,
  formatListingDate,
  formatListingMetaLine,
  formatListingRowMeta,
  formatListingTime,
} from "./format";

describe("formatListingTime", () => {
  it("drops :00 on the hour", () => {
    assert.equal(formatListingTime("2026-05-08T19:00:00"), "7pm");
  });

  it("keeps minutes otherwise", () => {
    assert.equal(formatListingTime("2026-05-08T19:15:00"), "7:15pm");
  });

  it("renders midnight and noon", () => {
    assert.equal(formatListingTime("2026-05-08T00:30:00"), "12:30am");
    assert.equal(formatListingTime("2026-05-08T12:00:00"), "12pm");
  });
});

describe("formatDayLabel", () => {
  it("splits day and weekday", () => {
    assert.deepEqual(formatDayLabel("2026-05-08T19:00:00"), {
      day: "8 May",
      weekday: "Friday",
    });
  });
});

describe("formatListingRowMeta", () => {
  it("omits the date and keeps group, seats, price", () => {
    assert.equal(
      formatListingRowMeta({
        groupSize: 4,
        seatsAvailable: 2,
        isPast: false,
        price: 28,
      }),
      "Group of 4 · 2 seats left · £28",
    );
  });

  it("drops seats when past and price when absent", () => {
    assert.equal(
      formatListingRowMeta({ groupSize: 3, seatsAvailable: 1, isPast: true }),
      "Group of 3",
    );
  });

  it("says group full at zero seats", () => {
    assert.equal(
      formatListingRowMeta({ groupSize: 2, seatsAvailable: 0, isPast: false }),
      "Group of 2 · Group full",
    );
  });
});

describe("existing formatters still behave", () => {
  it("formatListingDate keeps day and time", () => {
    assert.equal(formatListingDate("2026-05-08T19:15:00"), "Fri 8 May · 7:15pm");
  });

  it("formatListingMetaLine still leads with the date", () => {
    assert.equal(
      formatListingMetaLine({
        dateTime: "2026-05-08T19:15:00",
        groupSize: 4,
        seatsAvailable: 2,
        isPast: false,
        price: 28,
      }),
      "Fri 8 May · 7:15pm · Group of 4 · 2 seats left · £28",
    );
  });
});
