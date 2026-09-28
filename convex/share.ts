import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { query, type QueryCtx } from "./_generated/server";
import { COLLEGE_BADGES } from "../lib/data/badges";

/**
 * Data for the Instagram story share cards (app/api/share/*). Public: returns
 * only what the card shows, with first names only and no name at all for
 * anonymous reviews.
 */

async function firstNameOf(
  ctx: QueryCtx,
  userId: Id<"users">,
): Promise<string> {
  const user = await ctx.db.get(userId);
  if (!user || user.deletedAt !== undefined) return "Deleted user";
  return (user.name ?? "").trim().split(/\s+/)[0] || "A member";
}

export const getListingShareCard = query({
  args: { listingId: v.id("listings") },
  returns: v.union(
    v.null(),
    v.object({
      college: v.string(),
      dateTime: v.string(),
      seatsAvailable: v.number(),
      formalType: v.string(),
      hostFirstName: v.string(),
    }),
  ),
  handler: async (ctx, { listingId }) => {
    const listing = await ctx.db.get(listingId);
    if (!listing) return null;
    return {
      college: listing.college,
      dateTime: listing.dateTime,
      seatsAvailable: listing.seatsAvailable,
      formalType: listing.formalType ?? "social",
      hostFirstName: await firstNameOf(ctx, listing.ownerUserId),
    };
  },
});

export const getReviewShareCard = query({
  args: { reviewId: v.id("collegeReviews") },
  returns: v.union(
    v.null(),
    v.object({
      college: v.string(),
      overall: v.number(),
      comment: v.union(v.string(), v.null()),
      authorFirstName: v.union(v.string(), v.null()),
      photoUrl: v.union(v.string(), v.null()),
    }),
  ),
  handler: async (ctx, { reviewId }) => {
    const review = await ctx.db.get(reviewId);
    if (!review) return null;
    const firstImage = review.imageIds?.[0];
    return {
      college: review.college,
      overall: review.ratings.overall,
      comment: review.comment?.trim() || null,
      authorFirstName: review.isAnonymous
        ? null
        : await firstNameOf(ctx, review.userId),
      photoUrl: firstImage ? await ctx.storage.getUrl(firstImage) : null,
    };
  },
});

export const getBadgeShareCard = query({
  args: { userId: v.id("users"), badgeId: v.string() },
  returns: v.union(
    v.null(),
    v.object({
      firstName: v.string(),
      badgeId: v.string(),
      collegesVisited: v.number(),
      totalColleges: v.number(),
    }),
  ),
  handler: async (ctx, { userId, badgeId }) => {
    const rows = await ctx.db
      .query("userBadges")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .take(100);
    if (!rows.some((r) => r.badgeId === badgeId)) return null;
    return {
      firstName: await firstNameOf(ctx, userId),
      badgeId,
      collegesVisited: rows.filter((r) => r.badgeId.startsWith("college-"))
        .length,
      totalColleges: COLLEGE_BADGES.length,
    };
  },
});
