import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildLeaderboardEntries,
  compareOverallLeaderboardEntries,
  compareRatingLeaderboardEntries,
  isOverallLeaderboardRanked,
  leaderboardRankForCollege,
  type LeaderboardCollegeInput,
} from "./collegeReviews";

function entry(
  college: string,
  average: number | null,
  attendanceCount: number,
) {
  return { college, average, attendanceCount };
}

describe("compareRatingLeaderboardEntries", () => {
  it("ranks higher average first regardless of attendance", () => {
    const highAvg = entry("Balliol", 4.5, 0);
    const lowAvg = entry("Christ Church", 3.0, 100);
    assert.ok(compareRatingLeaderboardEntries(highAvg, lowAvg) < 0);
    assert.ok(compareRatingLeaderboardEntries(lowAvg, highAvg) > 0);
  });

  it("uses guest attendance as tie-breaker when averages match", () => {
    const moreGuests = entry("Balliol", 4.0, 50);
    const fewerGuests = entry("Christ Church", 4.0, 10);
    assert.ok(compareRatingLeaderboardEntries(moreGuests, fewerGuests) < 0);
    assert.ok(compareRatingLeaderboardEntries(fewerGuests, moreGuests) > 0);
  });

  it("falls back to college name when average and attendance match", () => {
    const a = entry("Balliol", 4.0, 20);
    const b = entry("Christ Church", 4.0, 20);
    assert.ok(compareRatingLeaderboardEntries(a, b) < 0);
    assert.ok(compareRatingLeaderboardEntries(b, a) > 0);
    assert.equal(compareRatingLeaderboardEntries(a, a), 0);
  });
});

describe("isOverallLeaderboardRanked", () => {
  it("is ranked when there is an average", () => {
    assert.equal(isOverallLeaderboardRanked(entry("Balliol", 3.5, 0)), true);
  });

  it("is ranked when there is attendance but no average", () => {
    assert.equal(isOverallLeaderboardRanked(entry("Balliol", null, 5)), true);
  });

  it("is not ranked with no reviews and no attendance", () => {
    assert.equal(isOverallLeaderboardRanked(entry("Balliol", null, 0)), false);
  });
});

describe("compareOverallLeaderboardEntries", () => {
  it("ranks reviewed colleges above attendance-only colleges", () => {
    const rated = entry("Balliol", 3.0, 0);
    const guestsOnly = entry("Christ Church", null, 100);
    assert.ok(compareOverallLeaderboardEntries(rated, guestsOnly) < 0);
    assert.ok(compareOverallLeaderboardEntries(guestsOnly, rated) > 0);
  });

  it("ranks attendance-only colleges by guest count", () => {
    const moreGuests = entry("Balliol", null, 50);
    const fewerGuests = entry("Christ Church", null, 10);
    assert.ok(compareOverallLeaderboardEntries(moreGuests, fewerGuests) < 0);
    assert.ok(compareOverallLeaderboardEntries(fewerGuests, moreGuests) > 0);
  });

  it("uses rating sort when both colleges have reviews", () => {
    const higher = entry("Balliol", 4.5, 0);
    const lower = entry("Christ Church", 3.0, 100);
    assert.ok(compareOverallLeaderboardEntries(higher, lower) < 0);
  });
});

describe("buildLeaderboardEntries", () => {
  const ratings = {
    food: 4,
    atmosphere: 4,
    value: 4,
    overall: 5,
  };

  function data(
    averages: LeaderboardCollegeInput["averages"],
    attendanceCount = 0,
    reviewCount = averages ? 1 : 0,
  ): LeaderboardCollegeInput {
    return {
      reviewCount,
      averages,
      attendanceCount,
      completedFormalCount: 0,
    };
  }

  it("assigns ranks and looks up a college", () => {
    const map = new Map<string, LeaderboardCollegeInput>([
      ["Balliol", data(ratings)],
      ["Christ Church", data({ ...ratings, overall: 3 })],
      ["St Antony's", data(null, 2, 0)],
    ]);
    const entries = buildLeaderboardEntries(
      ["Balliol", "Christ Church", "St Antony's", "Magdalen"],
      map,
      "overall",
    );
    assert.equal(leaderboardRankForCollege(entries, "Balliol"), 1);
    assert.equal(leaderboardRankForCollege(entries, "Christ Church"), 2);
    assert.equal(leaderboardRankForCollege(entries, "St Antony's"), 3);
    assert.equal(leaderboardRankForCollege(entries, "Magdalen"), null);
  });
});
