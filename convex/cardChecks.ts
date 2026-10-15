import { ConvexError, v } from "convex/values";
import { internal } from "./_generated/api";
import type { Doc, Id } from "./_generated/dataModel";
import {
  internalMutation,
  internalQuery,
  mutation,
  query,
  type MutationCtx,
} from "./_generated/server";
import { decideCard, matchCollege, REJECT_REASONS, type CardRead } from "./cardRules";
import { assertAdmin, optionalUserId, requireUser, requireVerifiedUser } from "./guards";
import { isMember, latestCardCheck, needsCard } from "./membership";
import { notify } from "./notify";
import { claimStorageOwnership, deleteStorageAndOwnership } from "./uploadOwnership";

/**
 * University Card checks for people who signed up without an allowed email.
 * The photo is read by OpenAI (convex/cardReader.ts); a clear, current card in
 * their name is approved straight away, an obvious failure is rejected, and
 * anything else waits for an admin at /admin/cards. The photo is deleted the
 * moment a decision is made.
 */

/** Sends allowed per person in any 24 hours. */
export const MAX_SUBMISSIONS_PER_DAY = 3;
const DAY_MS = 24 * 60 * 60 * 1000;
/** A check nobody decided within this long is closed and its photo deleted. */
export const STALE_AFTER_MS = 30 * DAY_MS;

export const cardReadValidator = v.object({
  isOxfordUniversityCard: v.boolean(),
  name: v.union(v.string(), v.null()),
  college: v.union(v.string(), v.null()),
  expiry: v.union(v.string(), v.null()),
  confidence: v.union(v.literal("high"), v.literal("medium"), v.literal("low")),
});

const statusValidator = v.union(
  v.literal("pending"),
  v.literal("needs_review"),
  v.literal("approved"),
  v.literal("rejected"),
);

/** Today's date in Oxford, as YYYY-MM-DD. */
function oxfordToday(nowMs: number): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/London",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(nowMs));
}

async function recentSubmissions(ctx: MutationCtx, userId: Id<"users">, nowMs: number) {
  return await ctx.db
    .query("cardChecks")
    .withIndex("by_userId_and_createdAt", (q) =>
      q.eq("userId", userId).gt("createdAt", nowMs - DAY_MS),
    )
    .take(MAX_SUBMISSIONS_PER_DAY + 1);
}

/** Close a check: delete the photo, record the outcome, tell the person. */
async function finish(
  ctx: MutationCtx,
  check: Doc<"cardChecks">,
  outcome:
    | { status: "approved"; college: string; decidedBy: "auto" | Id<"users"> }
    | { status: "rejected"; reason: string; decidedBy: "auto" | Id<"users"> },
): Promise<void> {
  if (check.imageId) await deleteStorageAndOwnership(ctx, check.imageId);
  const decidedAt = Date.now();
  if (outcome.status === "approved") {
    await ctx.db.patch(check._id, {
      status: "approved",
      imageId: undefined,
      college: outcome.college,
      reason: undefined,
      decidedBy: outcome.decidedBy,
      decidedAt,
    });
    await ctx.db.patch(check.userId, { college: outcome.college });
    await notify(ctx, { userId: check.userId, kind: "card_approved" });
  } else {
    await ctx.db.patch(check._id, {
      status: "rejected",
      imageId: undefined,
      reason: outcome.reason,
      decidedBy: outcome.decidedBy,
      decidedAt,
    });
    await notify(ctx, { userId: check.userId, kind: "card_rejected" });
  }
}

/** Upload URL for a card photo. Open before onboarding is finished. */
export const generateUploadUrl = mutation({
  args: {},
  returns: v.string(),
  handler: async (ctx) => {
    const { user } = await requireVerifiedUser(ctx);
    if (!needsCard(user)) throw new ConvexError("Your email already confirms you're a student.");
    return await ctx.storage.generateUploadUrl();
  },
});

/** Where the signed-in person stands: no card needed, waiting, or done. */
export const myCardStatus = query({
  args: {},
  returns: v.union(
    v.null(),
    v.object({
      needsCard: v.boolean(),
      member: v.boolean(),
      latest: v.union(
        v.null(),
        v.object({ status: statusValidator, reason: v.optional(v.string()), createdAt: v.number() }),
      ),
    }),
  ),
  handler: async (ctx) => {
    const userId = await optionalUserId(ctx);
    if (!userId) return null;
    const user = await ctx.db.get(userId);
    if (!user) return null;
    if (!needsCard(user)) return { needsCard: false, member: true, latest: null };
    const latest = await latestCardCheck(ctx, userId);
    return {
      needsCard: true,
      member: await isMember(ctx, user),
      latest: latest
        ? {
            status: latest.status,
            ...(latest.reason ? { reason: latest.reason } : {}),
            createdAt: latest.createdAt,
          }
        : null,
    };
  },
});

/** Send a card photo (already uploaded) to be checked. */
export const submit = mutation({
  args: { imageId: v.id("_storage") },
  returns: v.id("cardChecks"),
  handler: async (ctx, { imageId }) => {
    const { userId, user } = await requireVerifiedUser(ctx);
    if (!needsCard(user)) throw new ConvexError("Your email already confirms you're a student.");
    if (await isMember(ctx, user)) throw new ConvexError("Your card has already been approved.");
    const latest = await latestCardCheck(ctx, userId);
    if (latest && (latest.status === "pending" || latest.status === "needs_review")) {
      throw new ConvexError("We're still checking the card you sent.");
    }
    const now = Date.now();
    if ((await recentSubmissions(ctx, userId, now)).length >= MAX_SUBMISSIONS_PER_DAY) {
      throw new ConvexError("That's three tries today. Try again tomorrow.");
    }
    await claimStorageOwnership(ctx, imageId, userId);
    const checkId = await ctx.db.insert("cardChecks", {
      userId,
      status: "pending",
      imageId,
      createdAt: now,
    });
    await ctx.scheduler.runAfter(0, internal.cardReader.readCard, { checkId });
    return checkId;
  },
});

/** For the reader: the photo to read, if the check is still waiting. */
export const getForReading = internalQuery({
  args: { checkId: v.id("cardChecks") },
  returns: v.union(v.null(), v.object({ imageId: v.id("_storage") })),
  handler: async (ctx, { checkId }) => {
    const check = await ctx.db.get(checkId);
    if (!check || check.status !== "pending" || !check.imageId) return null;
    return { imageId: check.imageId };
  },
});

/** The reader's result (or null if it couldn't read it): decide or queue for review. */
export const applyRead = internalMutation({
  args: { checkId: v.id("cardChecks"), read: v.union(cardReadValidator, v.null()) },
  returns: v.null(),
  handler: async (ctx, { checkId, read }) => {
    const check = await ctx.db.get(checkId);
    if (!check || check.status !== "pending") return null;
    const user = await ctx.db.get(check.userId);
    if (!user || user.deletedAt !== undefined) {
      if (check.imageId) await deleteStorageAndOwnership(ctx, check.imageId);
      await ctx.db.delete(checkId);
      return null;
    }
    const decision = read
      ? decideCard(read as CardRead, user.name, oxfordToday(Date.now()))
      : ({ kind: "review" } as const);
    if (read) {
      await ctx.db.patch(checkId, {
        read,
        ...(read.expiry ? { expiry: read.expiry } : {}),
      });
    }
    if (decision.kind === "approve") {
      await finish(ctx, check, { status: "approved", college: decision.college, decidedBy: "auto" });
    } else if (decision.kind === "reject") {
      await finish(ctx, check, { status: "rejected", reason: decision.reason, decidedBy: "auto" });
    } else {
      await ctx.db.patch(checkId, { status: "needs_review" });
      await ctx.scheduler.runAfter(0, internal.emails.sendCardReviewEmail, {});
    }
    return null;
  },
});

/** Admin: cards waiting for a person to look at them, oldest first. */
export const listForReview = query({
  args: {},
  returns: v.array(
    v.object({
      checkId: v.id("cardChecks"),
      createdAt: v.number(),
      imageUrl: v.union(v.string(), v.null()),
      profileName: v.union(v.string(), v.null()),
      profileCollege: v.union(v.string(), v.null()),
      email: v.union(v.string(), v.null()),
      read: v.union(cardReadValidator, v.null()),
      suggestedCollege: v.union(v.string(), v.null()),
    }),
  ),
  handler: async (ctx) => {
    const { user: me } = await requireUser(ctx);
    assertAdmin(me);
    const checks = await ctx.db
      .query("cardChecks")
      .withIndex("by_status_and_createdAt", (q) => q.eq("status", "needs_review"))
      .order("asc")
      .take(50);
    return await Promise.all(
      checks.map(async (c) => {
        const user = await ctx.db.get(c.userId);
        return {
          checkId: c._id,
          createdAt: c.createdAt,
          imageUrl: c.imageId ? await ctx.storage.getUrl(c.imageId) : null,
          profileName: user?.name ?? null,
          profileCollege: user?.college ?? null,
          email: user?.email ?? null,
          read: c.read ?? null,
          suggestedCollege: matchCollege(c.read?.college) ?? user?.college ?? null,
        };
      }),
    );
  },
});

/** Admin: approve (with the college) or reject (with a reason). */
export const decide = mutation({
  args: {
    checkId: v.id("cardChecks"),
    approve: v.boolean(),
    college: v.optional(v.string()),
    reason: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { userId: adminId, user: me } = await requireUser(ctx);
    assertAdmin(me);
    const check = await ctx.db.get(args.checkId);
    if (!check) throw new ConvexError("That card check doesn't exist.");
    if (check.status !== "needs_review" && check.status !== "pending") {
      throw new ConvexError("That card has already been decided.");
    }
    if (args.approve) {
      const college = matchCollege(args.college);
      if (!college) throw new ConvexError("Pick the college from the list.");
      await finish(ctx, check, { status: "approved", college, decidedBy: adminId });
    } else {
      const reason = args.reason?.trim() || REJECT_REASONS[4];
      await finish(ctx, check, { status: "rejected", reason, decidedBy: adminId });
    }
    return null;
  },
});

/** Daily: close checks nobody decided within 30 days and delete their photos. */
export const closeStale = internalMutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const cutoff = Date.now() - STALE_AFTER_MS;
    for (const status of ["pending", "needs_review"] as const) {
      const stale = await ctx.db
        .query("cardChecks")
        .withIndex("by_status_and_createdAt", (q) => q.eq("status", status).lt("createdAt", cutoff))
        .take(100);
      for (const check of stale) {
        await finish(ctx, check, {
          status: "rejected",
          reason: "Your card waited too long to be checked. Send it again.",
          decidedBy: "auto",
        });
      }
    }
    return null;
  },
});
