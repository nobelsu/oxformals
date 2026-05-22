import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  applyAttendanceGuestDelta,
  applyFormalCompleted,
  applyReviewInsert,
  applyReviewUpdate,
  averagesFromSums,
} from "./collegeStats";

const ratings = { food: 4, atmosphere: 3, value: 5, overall: 4 };

describe("applyReviewInsert", () => {
  it("increments count and sums", () => {
    const next = applyReviewInsert(
      {
        reviewCount: 1,
        ratingSums: ratings,
        attendanceCount: 0,
        completedFormalCount: 0,
      },
      { food: 2, atmosphere: 2, value: 2, overall: 2 },
    );
    assert.equal(next.reviewCount, 2);
    assert.equal(next.ratingSums.overall, 6);
  });
});

describe("applyReviewUpdate", () => {
  it("replaces rating contribution", () => {
    const next = applyReviewUpdate(
      {
        reviewCount: 1,
        ratingSums: ratings,
        attendanceCount: 0,
        completedFormalCount: 0,
      },
      ratings,
      { food: 1, atmosphere: 1, value: 1, overall: 5 },
    );
    assert.equal(next.reviewCount, 1);
    assert.equal(next.ratingSums.overall, 5);
  });
});

describe("applyFormalCompleted", () => {
  it("increments attendance and formal count", () => {
    const next = applyFormalCompleted(
      {
        reviewCount: 0,
        ratingSums: { food: 0, atmosphere: 0, value: 0, overall: 0 },
        attendanceCount: 10,
        completedFormalCount: 2,
      },
      3,
    );
    assert.equal(next.attendanceCount, 13);
    assert.equal(next.completedFormalCount, 3);
  });
});

describe("applyAttendanceGuestDelta", () => {
  it("adjusts guest count only", () => {
    const next = applyAttendanceGuestDelta(
      {
        reviewCount: 0,
        ratingSums: { food: 0, atmosphere: 0, value: 0, overall: 0 },
        attendanceCount: 5,
        completedFormalCount: 1,
      },
      -2,
    );
    assert.equal(next.attendanceCount, 3);
    assert.equal(next.completedFormalCount, 1);
  });
});

describe("averagesFromSums", () => {
  it("returns null when no reviews", () => {
    assert.equal(averagesFromSums(ratings, 0), null);
  });

  it("computes averages", () => {
    const avg = averagesFromSums({ food: 8, atmosphere: 6, value: 10, overall: 8 }, 2);
    assert.deepEqual(avg, { food: 4, atmosphere: 3, value: 5, overall: 4 });
  });
});
