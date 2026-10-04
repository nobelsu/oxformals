import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  COLLEGE_BADGES,
  FOUNDING_BADGE_ID,
  MILESTONE_BADGES,
  TOTAL_BADGE_COUNT,
  badgeById,
  badgeTally,
  medalTone,
} from "./badges";

describe("special badges", () => {
  it("are known badges but sit outside the earnable total", () => {
    assert.equal(badgeById(FOUNDING_BADGE_ID)?.family, "special");
    assert.equal(TOTAL_BADGE_COUNT, MILESTONE_BADGES.length + COLLEGE_BADGES.length);
  });

  it("join the total only for the people who hold them", () => {
    assert.deepEqual(badgeTally([{ badgeId: FOUNDING_BADGE_ID }]), {
      earned: 1,
      total: TOTAL_BADGE_COUNT + 1,
    });
    assert.deepEqual(badgeTally([{ badgeId: "formals-1" }]), {
      earned: 1,
      total: TOTAL_BADGE_COUNT,
    });
    assert.deepEqual(badgeTally([]), { earned: 0, total: TOTAL_BADGE_COUNT });
  });

  it("medals climb bronze, silver, gold, ruby along each ladder", () => {
    const tone = (id: string) => medalTone(badgeById(id)!);
    assert.deepEqual(
      ["formals-1", "formals-5", "formals-10", "formals-25"].map(tone),
      ["bronze", "silver", "gold", "ruby"],
    );
    assert.deepEqual(["reviews-1", "reviews-5", "reviews-10"].map(tone), ["bronze", "silver", "gold"]);
    assert.equal(tone(FOUNDING_BADGE_ID), "ink");
  });
});
