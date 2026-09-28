import { v } from "convex/values";
import { internal } from "./_generated/api";
import type { Doc, Id } from "./_generated/dataModel";
import {
  mutation,
  query,
  type MutationCtx,
  type QueryCtx,
} from "./_generated/server";
import { optionalUserId, requireUser } from "./guards";
import {
  declinePendingRequestsForListing,
  deleteMenuPdfIfPresent,
  listingIsPast,
} from "./listingHelpers";
import { removeUserFromListingGroup } from "./listingMembership";
import { refundListingCredits } from "./credits";

/** Per-table bound; an account never comes close to this many rows. */
const MAX_ROWS = 1000;

type Notice = {
  kind: "hostLeft" | "guestLeft";
  toEmail: string;
  college: string;
  dateTime: string;
};

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/** Upcoming formals the user hosts, upcoming formals they joined, and their requests. */
async function upcomingFormals(
  ctx: QueryCtx | MutationCtx,
  userId: Id<"users">,
) {
  const nowMs = Date.now();
  const owned = await ctx.db
    .query("listings")
    .withIndex("by_ownerUserId", (q) => q.eq("ownerUserId", userId))
    .take(MAX_ROWS);
  const hosting = owned.filter((l) => !listingIsPast(l.dateTime, nowMs));

  // A guest joins a formal through an accepted request: as the requester for
  // the target listing, or as the host of a swap for the offering listing.
  const candidateIds = new Set<Id<"listings">>();
  const sent = await ctx.db
    .query("requests")
    .withIndex("by_fromUserId", (q) => q.eq("fromUserId", userId))
    .take(MAX_ROWS);
  for (const r of sent) {
    if (r.status === "accepted") candidateIds.add(r.targetListingId);
  }
  const received = await ctx.db
    .query("requests")
    .withIndex("by_toUserId", (q) => q.eq("toUserId", userId))
    .take(MAX_ROWS);
  for (const r of received) {
    if (r.status === "accepted" && r.offeringListingId) {
      candidateIds.add(r.offeringListingId);
    }
  }
  const joined: Doc<"listings">[] = [];
  for (const id of candidateIds) {
    const l = await ctx.db.get(id);
    if (
      l &&
      l.ownerUserId !== userId &&
      l.members.includes(userId) &&
      !listingIsPast(l.dateTime, nowMs)
    ) {
      joined.push(l);
    }
  }
  return { hosting, joined, sent, received };
}

/** What deleting the signed-in account would affect, for the confirmation screen. */
export const getDeletionImpact = query({
  args: {},
  returns: v.union(
    v.null(),
    v.object({
      email: v.string(),
      hosting: v.array(
        v.object({
          listingId: v.id("listings"),
          college: v.string(),
          dateTime: v.string(),
          guestCount: v.number(),
        }),
      ),
      joined: v.array(
        v.object({
          listingId: v.id("listings"),
          college: v.string(),
          dateTime: v.string(),
        }),
      ),
      pendingRequests: v.number(),
    }),
  ),
  handler: async (ctx) => {
    const userId = await optionalUserId(ctx);
    if (!userId) return null;
    const user = await ctx.db.get(userId);
    if (!user || user.deletedAt !== undefined || !user.email) return null;

    const { hosting, joined, sent, received } = await upcomingFormals(
      ctx,
      userId,
    );
    return {
      email: user.email,
      hosting: hosting.map((l) => ({
        listingId: l._id,
        college: l.college,
        dateTime: l.dateTime,
        guestCount: l.members.filter((m) => m !== userId).length,
      })),
      joined: joined.map((l) => ({
        listingId: l._id,
        college: l.college,
        dateTime: l.dateTime,
      })),
      pendingRequests: [...sent, ...received].filter(
        (r) => r.status === "pending",
      ).length,
    };
  },
});

async function emailOf(
  ctx: MutationCtx,
  userId: Id<"users">,
): Promise<string | null> {
  const user = await ctx.db.get(userId);
  return user && user.deletedAt === undefined && user.email
    ? user.email
    : null;
}

/**
 * Permanently delete the signed-in account. Personal data is removed and the
 * user row becomes a "Deleted user" placeholder, so messages, reviews and past
 * formals still resolve. Upcoming formals are tidied up and the people affected
 * are emailed.
 */
export const deleteMyAccount = mutation({
  args: { confirmEmail: v.string() },
  returns: v.null(),
  handler: async (ctx, { confirmEmail }) => {
    const { userId, user } = await requireUser(ctx);
    if (
      !user.email ||
      normalizeEmail(confirmEmail) !== normalizeEmail(user.email)
    ) {
      throw new Error("That email doesn't match your account.");
    }

    const notices: Notice[] = [];
    const { hosting, joined, sent, received } = await upcomingFormals(
      ctx,
      userId,
    );

    // 1. Upcoming formals they host are cancelled; each guest is told.
    for (const listing of hosting) {
      for (const guestId of listing.members) {
        if (guestId === userId) continue;
        const toEmail = await emailOf(ctx, guestId);
        if (toEmail) {
          notices.push({
            kind: "hostLeft",
            toEmail,
            college: listing.college,
            dateTime: listing.dateTime,
          });
        }
      }
      await declinePendingRequestsForListing(ctx, listing._id);
      await refundListingCredits(ctx, listing._id);
      await deleteMenuPdfIfPresent(ctx, listing.menuPdfId);
      await ctx.db.delete(listing._id);
    }

    // 2. Upcoming formals they joined get the seat back; the host is told.
    for (const listing of joined) {
      await removeUserFromListingGroup(ctx, listing._id, userId);
      const toEmail = await emailOf(ctx, listing.ownerUserId);
      if (toEmail) {
        notices.push({
          kind: "guestLeft",
          toEmail,
          college: listing.college,
          dateTime: listing.dateTime,
        });
      }
    }

    // 3. Requests still pending, sent or received, are declined.
    for (const r of [...sent, ...received]) {
      const fresh = await ctx.db.get(r._id);
      if (fresh?.status === "pending") {
        await ctx.db.patch(r._id, { status: "declined" });
      }
    }

    // 4. Personal rows.
    const deleteByUserId = async (
      table:
        | "collegeWishlists"
        | "feedLikes"
        | "feedBookmarks"
        | "pushTokens"
        | "userBadges",
    ) => {
      const rows = await ctx.db
        .query(table)
        .withIndex("by_userId", (q) => q.eq("userId", userId))
        .take(MAX_ROWS);
      for (const row of rows) await ctx.db.delete(row._id);
    };
    await deleteByUserId("collegeWishlists");
    await deleteByUserId("feedLikes");
    await deleteByUserId("feedBookmarks");
    await deleteByUserId("pushTokens");
    await deleteByUserId("userBadges");
    for (const status of ["active", "pending"] as const) {
      for (const row of await ctx.db
        .query("follows")
        .withIndex("by_followerId_and_status", (q) =>
          q.eq("followerId", userId).eq("status", status),
        )
        .take(MAX_ROWS)) {
        await ctx.db.delete(row._id);
      }
      for (const row of await ctx.db
        .query("follows")
        .withIndex("by_followeeId_and_status", (q) =>
          q.eq("followeeId", userId).eq("status", status),
        )
        .take(MAX_ROWS)) {
        await ctx.db.delete(row._id);
      }
    }
    // Upload bookkeeping only: review photos stay because the reviews stay.
    const files = await ctx.db
      .query("uploadedFiles")
      .withIndex("by_ownerUserId", (q) => q.eq("ownerUserId", userId))
      .take(MAX_ROWS);
    for (const f of files) await ctx.db.delete(f._id);

    // 5. Sign-in records: accounts (+ codes) and sessions (+ refresh tokens).
    const accounts = await ctx.db
      .query("authAccounts")
      .withIndex("userIdAndProvider", (q) => q.eq("userId", userId))
      .take(MAX_ROWS);
    for (const account of accounts) {
      const codes = await ctx.db
        .query("authVerificationCodes")
        .withIndex("accountId", (q) => q.eq("accountId", account._id))
        .take(MAX_ROWS);
      for (const c of codes) await ctx.db.delete(c._id);
      await ctx.db.delete(account._id);
    }
    const sessions = await ctx.db
      .query("authSessions")
      .withIndex("userId", (q) => q.eq("userId", userId))
      .take(MAX_ROWS);
    for (const session of sessions) {
      const tokens = await ctx.db
        .query("authRefreshTokens")
        .withIndex("sessionId", (q) => q.eq("sessionId", session._id))
        .take(MAX_ROWS);
      for (const token of tokens) await ctx.db.delete(token._id);
      await ctx.db.delete(session._id);
    }

    // 6. Scrub the profile to a placeholder messages and reviews still point at.
    await ctx.db.replace(userId, {
      name: "Deleted user",
      deletedAt: Date.now(),
    });

    if (notices.length > 0) {
      await ctx.scheduler.runAfter(
        0,
        internal.emails.sendAccountDeletionNotices,
        { notices },
      );
    }
    return null;
  },
});
