import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import type { MutationCtx } from "./_generated/server";
import {
  categoryOf,
  type NotificationData,
  type NotificationKind,
} from "./notificationKinds";

export const DEDUPE_WINDOW_MS = 24 * 60 * 60 * 1000;

export type NotifyArgs = {
  userId: Id<"users">;
  kind: NotificationKind;
  actorId?: Id<"users">;
  listingId?: Id<"listings">;
  requestId?: Id<"requests">;
  data?: NotificationData;
};

/**
 * Kinds where a new one folds into the last one with the same key while that
 * is still unread, so a burst is one bell row (and one push) instead of many.
 */
const GROUPED_KINDS: ReadonlySet<NotificationKind> = new Set<NotificationKind>(["wishlist_listing"]);

/**
 * kind + the ids involved (+ a party answer, so "in" then "out" both show).
 * "Want to go" alerts group by college instead.
 */
export function dedupeKeyFor(args: NotifyArgs): string {
  if (args.kind === "wishlist_listing") {
    return ["wishlist_listing", args.data?.college ?? args.listingId ?? ""].join(":");
  }
  return [
    args.kind,
    args.actorId ?? "",
    args.listingId ?? "",
    args.requestId ?? "",
    args.data?.response ?? "",
  ].join(":");
}

/**
 * Record that something happened to `userId` and schedule its push/email.
 * Call it inside the mutation where the event happens, so it commits (or rolls
 * back) with it. Returns null when skipped: yourself, a deleted user, the
 * same thing within the last 24h, or a grouped kind folded into its unread row.
 */
export async function notify(
  ctx: MutationCtx,
  args: NotifyArgs,
): Promise<Id<"notifications"> | null> {
  if (args.actorId !== undefined && args.actorId === args.userId) return null;
  const user = await ctx.db.get(args.userId);
  if (!user || user.deletedAt !== undefined) return null;

  const now = Date.now();
  const dedupeKey = dedupeKeyFor(args);
  const last = await ctx.db
    .query("notifications")
    .withIndex("by_userId_and_dedupeKey", (q) =>
      q.eq("userId", args.userId).eq("dedupeKey", dedupeKey),
    )
    .order("desc")
    .first();
  if (last && GROUPED_KINDS.has(args.kind)) {
    // Still unread: count it in and move it to the top, without another push.
    if (last.readAt === undefined) {
      await ctx.db.patch(last._id, {
        actorId: last.actorId === args.actorId ? args.actorId : undefined,
        listingId: args.listingId,
        data: { ...args.data, count: (last.data?.count ?? 1) + 1 },
        createdAt: now,
      });
      return null;
    }
  } else if (last && now - last.createdAt < DEDUPE_WINDOW_MS) {
    return null;
  }

  const notificationId = await ctx.db.insert("notifications", {
    userId: args.userId,
    category: categoryOf(args.kind),
    kind: args.kind,
    ...(args.actorId !== undefined ? { actorId: args.actorId } : {}),
    ...(args.listingId !== undefined ? { listingId: args.listingId } : {}),
    ...(args.requestId !== undefined ? { requestId: args.requestId } : {}),
    ...(args.data !== undefined ? { data: args.data } : {}),
    dedupeKey,
    createdAt: now,
  });
  await ctx.scheduler.runAfter(0, internal.notificationDelivery.deliver, {
    notificationId,
  });
  return notificationId;
}
