import { internal } from "./_generated/api";
import { internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { collectBadgeInputs } from "./badges";
import { COLLEGE_BADGES, MILESTONE_BADGES } from "../lib/data/badges";

/**
 * One-off backfill: stamp every existing listing that predates the
 * `formalType` field as a "social" formal. Safe to re-run — it only patches
 * rows that are still missing the field.
 *
 * Run with: `npx convex run migrations:backfillFormalTypeSocial`
 */
export const backfillFormalTypeSocial = internalMutation({
  args: {},
  handler: async (ctx) => {
    const listings = await ctx.db.query("listings").collect();
    let updated = 0;
    for (const listing of listings) {
      if (listing.formalType === undefined) {
        await ctx.db.patch(listing._id, { formalType: "social" });
        updated += 1;
      }
    }
    return { total: listings.length, updated };
  },
});

function milestoneEarnedAt(
  metricDatesAsc: number[],
  threshold: number,
): number | null {
  return metricDatesAsc.length >= threshold
    ? metricDatesAsc[threshold - 1]
    : null;
}

/**
 * All badges this user qualifies for, with historically derived earnedAt:
 * milestone dates come from the threshold-th piece of evidence; college
 * dates from the first attended confirmation at that college.
 */
function earnedBadgesWithDerivedDates(
  inputs: Awaited<ReturnType<typeof collectBadgeInputs>>,
): Array<{ badgeId: string; earnedAt: number }> {
  const earned: Array<{ badgeId: string; earnedAt: number }> = [];
  for (const badge of MILESTONE_BADGES) {
    const dates =
      badge.metric === "formals"
        ? inputs.attendedConfirmedAtsAsc
        : inputs.publicReviewUpdatedAtsAsc;
    const ts = milestoneEarnedAt(dates, badge.threshold);
    if (ts !== null) earned.push({ badgeId: badge.id, earnedAt: ts });
  }
  for (const badge of COLLEGE_BADGES) {
    const ts = inputs.collegeFirstAttendedAt.get(badge.college);
    if (ts !== undefined) earned.push({ badgeId: badge.id, earnedAt: ts });
  }
  return earned;
}

/**
 * One-off backfill: award every badge existing users already qualify for,
 * with derived earnedAt dates. Idempotent — held badges are never
 * re-inserted, so re-running awards nothing new. Batched 100 users per
 * transaction with scheduler continuation (same pattern as
 * users.backfillCollegeWishlists).
 *
 * Run with: `npx convex run migrations:backfillUserBadges`
 */
export const backfillUserBadges = internalMutation({
  args: {},
  returns: v.object({
    awarded: v.number(),
    scanned: v.number(),
    done: v.boolean(),
  }),
  handler: async (ctx) => {
    const users = await ctx.db.query("users").take(100);
    let awarded = 0;
    for (const user of users) {
      const inputs = await collectBadgeInputs(ctx, user._id);
      const existing = await ctx.db
        .query("userBadges")
        .withIndex("by_userId", (q) => q.eq("userId", user._id))
        .take(100);
      const owned = new Set(existing.map((b) => b.badgeId));
      for (const earned of earnedBadgesWithDerivedDates(inputs)) {
        if (owned.has(earned.badgeId)) continue;
        await ctx.db.insert("userBadges", {
          userId: user._id,
          badgeId: earned.badgeId,
          earnedAt: earned.earnedAt,
        });
        awarded += 1;
      }
    }
    const done = users.length < 100;
    if (!done) {
      await ctx.scheduler.runAfter(0, internal.migrations.backfillUserBadges, {});
    }
    return { awarded, scanned: users.length, done };
  },
});
