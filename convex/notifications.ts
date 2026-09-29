import { v } from "convex/values";
import type { Doc } from "./_generated/dataModel";
import {
  internalMutation,
  internalQuery,
  type MutationCtx,
  type QueryCtx,
} from "./_generated/server";
import {
  EMAIL_NOTICE_KINDS,
  renderNotification,
  type NotificationView,
} from "./notificationCopy";
import { emailAllowed, pushAllowed } from "./notificationPrefs";

type Ctx = QueryCtx | MutationCtx;

/** Most browsers / devices we push to per person. */
const MAX_PUSH_TARGETS = 20;

/** What renderNotification needs: the row plus the actor's first name. */
export async function loadView(ctx: Ctx, n: Doc<"notifications">): Promise<NotificationView> {
  const actor = n.actorId ? await ctx.db.get(n.actorId) : null;
  // A deleted account reads as "Someone".
  const name = actor && actor.deletedAt === undefined ? actor.name : undefined;
  return {
    kind: n.kind,
    actorName: name?.trim().split(/\s+/)[0] || null,
    ...(n.actorId ? { actorId: n.actorId } : {}),
    ...(n.listingId ? { listingId: n.listingId } : {}),
    ...(n.requestId ? { requestId: n.requestId } : {}),
    data: n.data ?? {},
  };
}

const subscriptionValidator = v.object({
  endpoint: v.string(),
  p256dh: v.string(),
  auth: v.string(),
});

/**
 * Everything `deliver` needs, after the recipient's prefs: the push (web
 * subscriptions + Expo tokens) and which email to send, if any.
 */
export const getDeliveryPlan = internalQuery({
  args: { notificationId: v.id("notifications") },
  returns: v.union(
    v.null(),
    v.object({
      push: v.union(
        v.null(),
        v.object({
          title: v.string(),
          body: v.string(),
          url: v.string(),
          tag: v.string(),
          /** For the phone app: which listing a "Want to go" alert is about. */
          listingId: v.optional(v.id("listings")),
          webSubscriptions: v.array(subscriptionValidator),
          expoTokens: v.array(v.string()),
        }),
      ),
      email: v.union(
        v.null(),
        v.object({ type: v.literal("request"), requestId: v.id("requests") }),
        v.object({
          type: v.literal("wishlist"),
          listingId: v.id("listings"),
          userId: v.id("users"),
        }),
        v.object({ type: v.literal("notice") }),
      ),
    }),
  ),
  handler: async (ctx, { notificationId }) => {
    const n = await ctx.db.get(notificationId);
    if (!n) return null;
    const user = await ctx.db.get(n.userId);
    if (!user || user.deletedAt !== undefined) return null;

    let push = null;
    if (pushAllowed(user, n.category)) {
      const rendered = renderNotification(await loadView(ctx, n));
      const subs = await ctx.db
        .query("webPushSubscriptions")
        .withIndex("by_userId", (q) => q.eq("userId", n.userId))
        .take(MAX_PUSH_TARGETS);
      const tokens = await ctx.db
        .query("pushTokens")
        .withIndex("by_userId", (q) => q.eq("userId", n.userId))
        .take(MAX_PUSH_TARGETS);
      push = {
        title: rendered.title,
        body: rendered.body,
        url: rendered.url,
        tag: n.dedupeKey,
        ...(n.listingId ? { listingId: n.listingId } : {}),
        webSubscriptions: subs.map((s) => ({ endpoint: s.endpoint, p256dh: s.p256dh, auth: s.auth })),
        expoTokens: tokens.map((t) => t.token),
      };
    }

    let email = null;
    if (emailAllowed(user, n.category)) {
      if (n.kind === "request_received" && n.requestId) {
        email = { type: "request" as const, requestId: n.requestId };
      } else if (n.kind === "wishlist_listing" && n.listingId) {
        email = { type: "wishlist" as const, listingId: n.listingId, userId: n.userId };
      } else if (EMAIL_NOTICE_KINDS.has(n.kind)) {
        email = { type: "notice" as const };
      }
    }

    return { push, email };
  },
});

/** The push service said these browsers are gone (404/410). */
export const removeWebPushSubscriptions = internalMutation({
  args: { endpoints: v.array(v.string()) },
  returns: v.null(),
  handler: async (ctx, { endpoints }) => {
    for (const endpoint of endpoints) {
      const rows = await ctx.db
        .query("webPushSubscriptions")
        .withIndex("by_endpoint", (q) => q.eq("endpoint", endpoint))
        .take(10);
      for (const row of rows) await ctx.db.delete(row._id);
    }
    return null;
  },
});
