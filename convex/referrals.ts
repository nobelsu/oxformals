import type { Id } from "./_generated/dataModel";
import type { MutationCtx } from "./_generated/server";

/**
 * Who brought whom onto Oxformals. Recorded when a new account claims an
 * invite or seat link; pays the inviter a credit after the invitee's first
 * completed formal (see maybeEarnReferral).
 */

/** Records the referral unless the invitee already has one. */
export async function recordReferral(
  ctx: MutationCtx,
  args: { inviterId: Id<"users">; inviteeId: Id<"users">; source: "link" | "seat" },
): Promise<boolean> {
  if (args.inviterId === args.inviteeId) return false;
  const existing = await ctx.db
    .query("referrals")
    .withIndex("by_inviteeId", (q) => q.eq("inviteeId", args.inviteeId))
    .first();
  if (existing) return false;
  await ctx.db.insert("referrals", { ...args, status: "pending", createdAt: Date.now() });
  return true;
}
