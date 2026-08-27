import { v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import { query } from "./_generated/server";
import { optionalUserId, sanitizePublicUser } from "./guards";
import { enrichListing } from "./listingHelpers";
import { rowCountsAsAttended } from "../lib/data/formalAttendance";
import { collegeToSlug } from "../lib/data/collegeSlug";

/** How many rows to scan per source before merging. Bounded like getProfileActivity. */
const SOURCE_SCAN = 120;
const DEFAULT_LIMIT = 40;
const MAX_LIMIT = 50;

type PublicActor = ReturnType<typeof sanitizePublicUser>;

/**
 * The campus feed (follows-free v1). Merges recent non-anonymous reviews, newly
 * listed upcoming formals, and attended formals from across Oxford, newest
 * first, each tagged with its actor. Lightly personalised: items at a college
 * on the viewer's wishlist are flagged `onWishlist` for a badge (no re-ranking
 * yet).
 *
 * Bounded reads (SOURCE_SCAN per source) and a MAX_LIMIT cap — no pagination.
 * Revisit both when a follow graph narrows the source set and real volume
 * demands paging; this is deliberately the same tradeoff as getProfileActivity.
 */
export const getCampusFeed = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const limit = Math.min(Math.max(args.limit ?? DEFAULT_LIMIT, 1), MAX_LIMIT);
    const viewerId = await optionalUserId(ctx);

    // Viewer's wishlist colleges (denormalised on the user doc).
    let wishlist = new Set<string>();
    if (viewerId) {
      const viewer = await ctx.db.get(viewerId);
      wishlist = new Set(viewer?.wishlistColleges ?? []);
    }

    // Cache actor lookups: many items share an author/owner.
    const actorCache = new Map<string, PublicActor | null>();
    const getActor = async (
      userId: Id<"users">,
    ): Promise<PublicActor | null> => {
      const cached = actorCache.get(userId);
      if (cached !== undefined) return cached;
      const user = await ctx.db.get(userId);
      const actor = user ? sanitizePublicUser(user) : null;
      actorCache.set(userId, actor);
      return actor;
    };

    const nowIso = new Date().toISOString();

    type FeedItem =
      | {
          kind: "listing";
          key: string;
          ts: number;
          onWishlist: boolean;
          actor: PublicActor;
          listing: Awaited<ReturnType<typeof enrichListing>>;
        }
      | {
          kind: "review";
          key: string;
          ts: number;
          onWishlist: boolean;
          actor: PublicActor;
          college: string;
          ratings: Doc<"collegeReviews">["ratings"];
          comment: string | null;
          imageUrls: string[];
        }
      | {
          kind: "attended";
          key: string;
          ts: number;
          onWishlist: boolean;
          actors: PublicActor[];
          attendeeCount: number;
          college: string;
          dateTime: string;
        };

    const items: FeedItem[] = [];

    // Newly listed, still-upcoming formals.
    const listingDocs = await ctx.db
      .query("listings")
      .withIndex("by_status", (q) => q.eq("status", "active"))
      .order("desc")
      .take(SOURCE_SCAN);
    for (const listing of listingDocs) {
      if (listing.dateTime <= nowIso) continue;
      const actor = await getActor(listing.ownerUserId);
      if (!actor) continue;
      items.push({
        kind: "listing",
        key: `listing:${listing._id}`,
        ts: listing._creationTime,
        onWishlist: wishlist.has(listing.college),
        actor,
        listing: await enrichListing(ctx, listing),
      });
    }

    // Recent public reviews.
    const reviewDocs = await ctx.db
      .query("collegeReviews")
      .order("desc")
      .take(SOURCE_SCAN);
    for (const review of reviewDocs) {
      if (review.isAnonymous) continue;
      const actor = await getActor(review.userId);
      if (!actor) continue;
      const imageUrls: string[] = [];
      for (const imageId of review.imageIds ?? []) {
        const url = await ctx.storage.getUrl(imageId);
        if (url) imageUrls.push(url);
      }
      items.push({
        kind: "review",
        key: `review:${review._id}`,
        ts: review.updatedAt,
        onWishlist: wishlist.has(review.college),
        actor,
        college: review.college,
        ratings: review.ratings,
        comment: review.comment ?? null,
        imageUrls,
      });
    }

    // Attended formals — bundled by (college, night): everyone who went to the
    // same college's formal on the same date collapses into one item.
    const attendanceDocs = await ctx.db
      .query("formalAttendanceConfirmations")
      .order("desc")
      .take(SOURCE_SCAN);
    type AttendedBundle = {
      key: string;
      college: string;
      dateTime: string;
      ts: number;
      actors: Map<string, PublicActor>;
    };
    const bundles = new Map<string, AttendedBundle>();
    for (const row of attendanceDocs) {
      if (!rowCountsAsAttended(row)) continue;
      const listing = await ctx.db.get(row.listingId);
      if (!listing) continue;
      const actor = await getActor(row.userId);
      if (!actor) continue;
      // dateTime is stored as a UTC ISO string; its date portion is a stable,
      // TZ-free night key.
      const dateKey = listing.dateTime.slice(0, 10);
      const key = `attended:${collegeToSlug(listing.college)}:${dateKey}`;
      const bundle =
        bundles.get(key) ??
        {
          key,
          college: listing.college,
          dateTime: listing.dateTime,
          ts: 0,
          actors: new Map<string, PublicActor>(),
        };
      if (!bundle.actors.has(actor._id)) bundle.actors.set(actor._id, actor);
      bundle.ts = Math.max(bundle.ts, row.confirmedAt);
      bundles.set(key, bundle);
    }
    for (const bundle of bundles.values()) {
      items.push({
        kind: "attended",
        key: bundle.key,
        ts: bundle.ts,
        onWishlist: wishlist.has(bundle.college),
        actors: [...bundle.actors.values()],
        attendeeCount: bundle.actors.size,
        college: bundle.college,
        dateTime: bundle.dateTime,
      });
    }

    items.sort((a, b) => b.ts - a.ts);
    const sliced = items.slice(0, limit);

    // Attach comment + like counts only for the items we return.
    const withCounts = await Promise.all(
      sliced.map(async (item) => {
        const comments = await ctx.db
          .query("feedComments")
          .withIndex("by_targetKey", (q) => q.eq("targetKey", item.key))
          .collect();
        const likes = await ctx.db
          .query("feedLikes")
          .withIndex("by_targetKey", (q) => q.eq("targetKey", item.key))
          .collect();
        const bookmark = viewerId
          ? await ctx.db
              .query("feedBookmarks")
              .withIndex("by_targetKey_and_userId", (q) =>
                q.eq("targetKey", item.key).eq("userId", viewerId),
              )
              .unique()
          : null;
        // The 3 most recent comments (oldest-of-the-three first) as an inline
        // preview; the full thread loads on demand.
        const ordered = [...comments].sort(
          (a, b) => a._creationTime - b._creationTime,
        );
        const commentPreview = await Promise.all(
          ordered.slice(-3).map(async (c) => {
            const author = await getActor(c.userId);
            return { name: author?.name ?? "Someone", text: c.text };
          }),
        );
        return {
          ...item,
          commentCount: comments.length,
          commentPreview,
          likeCount: likes.length,
          viewerLiked:
            viewerId !== null && likes.some((l) => l.userId === viewerId),
          viewerBookmarked: bookmark !== null,
        };
      }),
    );

    return { items: withCounts };
  },
});
