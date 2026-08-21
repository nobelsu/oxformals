import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { query } from "./_generated/server";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { normalizeCollegeName } from "../lib/data/colleges";
import { rowCountsAsAttended } from "../lib/data/formalAttendance";
import {
  COLLEGE_BADGES,
  MILESTONE_BADGES,
} from "../lib/data/badges";

export type BadgeInputs = {
  attendedCount: number;
  /** `confirmedAt` of every attended confirmation, ascending. */
  attendedConfirmedAtsAsc: number[];
  /** Normalized college → earliest attended confirmation time. */
  collegeFirstAttendedAt: Map<string, number>;
  publicReviewCount: number;
  /** `updatedAt` of every public review, ascending. */
  publicReviewUpdatedAtsAsc: number[];
};

/**
 * Single reader over the evidence tables. Bounded to 200 rows per table —
 * the same cap convention used across this codebase (users.ts, etc.).
 */
export async function collectBadgeInputs(
  ctx: QueryCtx | MutationCtx,
  userId: Id<"users">,
): Promise<BadgeInputs> {
  const attendanceRows = await ctx.db
    .query("formalAttendanceConfirmations")
    .withIndex("by_userId", (q) => q.eq("userId", userId))
    .take(200);
  const attendedRows = attendanceRows.filter(rowCountsAsAttended);

  const collegeFirstAttendedAt = new Map<string, number>();
  for (const row of attendedRows) {
    const listing = await ctx.db.get(row.listingId);
    if (!listing) continue;
    const college = normalizeCollegeName(listing.college);
    if (!college) continue;
    const prev = collegeFirstAttendedAt.get(college);
    if (prev === undefined || row.confirmedAt < prev) {
      collegeFirstAttendedAt.set(college, row.confirmedAt);
    }
  }

  const reviewRows = await ctx.db
    .query("collegeReviews")
    .withIndex("by_userId", (q) => q.eq("userId", userId))
    .take(200);
  const publicReviewRows = reviewRows.filter((r) => !r.isAnonymous);

  return {
    attendedCount: attendedRows.length,
    attendedConfirmedAtsAsc: attendedRows
      .map((r) => r.confirmedAt)
      .sort((a, b) => a - b),
    collegeFirstAttendedAt,
    publicReviewCount: publicReviewRows.length,
    publicReviewUpdatedAtsAsc: publicReviewRows
      .map((r) => r.updatedAt)
      .sort((a, b) => a - b),
  };
}

/**
 * Idempotently insert every badge the user now qualifies for but doesn't
 * hold. Live awards are stamped with `nowMs` (not backdated — backfill
 * derives historical dates instead). Returns the number of rows inserted.
 */
export async function awardNewBadges(
  ctx: MutationCtx,
  userId: Id<"users">,
  nowMs: number,
): Promise<number> {
  const inputs = await collectBadgeInputs(ctx, userId);
  const existing = await ctx.db
    .query("userBadges")
    .withIndex("by_userId", (q) => q.eq("userId", userId))
    .take(100);
  const owned = new Set(existing.map((b) => b.badgeId));

  let inserted = 0;
  for (const badge of MILESTONE_BADGES) {
    const count =
      badge.metric === "formals"
        ? inputs.attendedCount
        : inputs.publicReviewCount;
    if (count >= badge.threshold && !owned.has(badge.id)) {
      await ctx.db.insert("userBadges", {
        userId,
        badgeId: badge.id,
        earnedAt: nowMs,
      });
      inserted += 1;
    }
  }
  for (const badge of COLLEGE_BADGES) {
    if (inputs.collegeFirstAttendedAt.has(badge.college) && !owned.has(badge.id)) {
      await ctx.db.insert("userBadges", {
        userId,
        badgeId: badge.id,
        earnedAt: nowMs,
      });
      inserted += 1;
    }
  }
  return inserted;
}

/** Earned badge rows for a profile's badge row + badge case modal. */
export const getUserBadges = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("userBadges")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .take(100);
  },
});
