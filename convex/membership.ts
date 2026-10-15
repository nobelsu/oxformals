import { ConvexError } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { isAllowedEmail } from "./allowedEmails";
import { requireActiveUser } from "./guards";

type Ctx = QueryCtx | MutationCtx;

/** The newest card check for someone, if they've sent one. */
export async function latestCardCheck(
  ctx: Ctx,
  userId: Id<"users">,
): Promise<Doc<"cardChecks"> | null> {
  return await ctx.db
    .query("cardChecks")
    .withIndex("by_userId_and_createdAt", (q) => q.eq("userId", userId))
    .order("desc")
    .first();
}

/** Signed up with an address that doesn't prove they're a student. */
export function needsCard(user: Doc<"users">): boolean {
  return !isAllowedEmail(user.email);
}

/** A full member: an allowed email, or a University Card that was approved. */
export async function isMember(ctx: Ctx, user: Doc<"users">): Promise<boolean> {
  if (!needsCard(user)) return true;
  const approved = await ctx.db
    .query("cardChecks")
    .withIndex("by_userId_and_createdAt", (q) => q.eq("userId", user._id))
    .order("desc")
    .take(20);
  return approved.some((c) => c.status === "approved");
}

/**
 * For anything that touches other people: requesting, hosting, messaging,
 * following, posting. Browsing stays open while a card is being checked.
 */
export async function requireMember(
  ctx: Ctx,
): Promise<{ userId: Id<"users">; user: Doc<"users"> }> {
  const result = await requireActiveUser(ctx);
  if (!(await isMember(ctx, result.user))) {
    throw new ConvexError("Your University Card is still being checked.");
  }
  return result;
}

/** Throws unless `user` (already loaded) is a full member. */
export async function assertMember(ctx: Ctx, user: Doc<"users">): Promise<void> {
  if (!(await isMember(ctx, user))) {
    throw new ConvexError("Your University Card is still being checked.");
  }
}

/** assertMember for code that only has the caller's id. */
export async function assertMemberId(ctx: Ctx, userId: Id<"users">): Promise<void> {
  const user = await ctx.db.get(userId);
  if (!user) throw new ConvexError("User profile not found");
  await assertMember(ctx, user);
}
