import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { creditBalance } from "./credits";
import { optionalUserId, requireActiveUser, sanitizePublicUser } from "./guards";
import { sendFormalNotices } from "./swapLinks";

/**
 * A friend named in someone's group request answers it: "I'm in" (needed
 * before the host can accept when they pay for their own seat) or "Not me",
 * which drops their seat from the request.
 */
export const respondToPartyInvite = mutation({
  args: {
    requestId: v.id("requests"),
    response: v.union(v.literal("in"), v.literal("out")),
  },
  returns: v.null(),
  handler: async (ctx, { requestId, response }) => {
    const { userId } = await requireActiveUser(ctx);
    const req = await ctx.db.get(requestId);
    if (!req) throw new Error("That request was withdrawn.");
    const party = req.party ?? [];
    const index = party.findIndex((p) => p.kind === "friend" && p.userId === userId);
    if (index === -1) throw new Error("You're not in this request.");
    if (req.status !== "pending") {
      throw new Error(
        req.status === "accepted"
          ? "The host already said yes. To drop out, leave the group from the formal."
          : "This request is closed.",
      );
    }
    const seat = party[index];
    if (response === "in" && seat.payerId === userId && seat.method === "credit") {
      if ((await creditBalance(ctx, userId)) < 1) {
        throw new Error(
          "You don't have a credit for this. Host a guest to earn one, or ask them to cover you.",
        );
      }
    }
    const next = [...party];
    next[index] = { ...seat, response };
    await ctx.db.patch(requestId, { party: next });

    if (response === "out") {
      const me = await ctx.db.get(userId);
      await sendFormalNotices(ctx, [
        {
          userId: req.fromUserId,
          subject: `${me?.name?.split(" ")[0] ?? "A friend"} can't make it`,
          body: `${me?.name?.split(" ")[0] ?? "A friend"} said "Not me" to your group request, so it's one seat smaller now. The rest of the request still stands.`,
          cta: "formals",
        },
      ]);
    }
    return null;
  },
});

/** Pending group requests I've been named in, newest first. */
export const listMyPartyInvites = query({
  args: {},
  handler: async (ctx) => {
    const userId = await optionalUserId(ctx);
    if (!userId) return [];
    const invites = await ctx.db
      .query("partyInvites")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .order("desc")
      .take(20);
    const out = [];
    for (const invite of invites) {
      const req = await ctx.db.get(invite.requestId);
      if (!req || req.status !== "pending") continue;
      const seat = (req.party ?? []).find(
        (p) => p.kind === "friend" && p.userId === userId,
      );
      if (!seat || seat.response === "out") continue;
      const listing = await ctx.db.get(req.targetListingId);
      const from = await ctx.db.get(req.fromUserId);
      if (!listing || !from) continue;
      const seats = 1 + (req.party ?? []).filter((p) => p.response !== "out").length;
      out.push({
        requestId: req._id,
        listingId: listing._id,
        college: listing.college,
        dateTime: listing.dateTime,
        price: listing.price ?? null,
        from: sanitizePublicUser(from),
        seats,
        response: seat.response ?? "pending",
        paysOwn: seat.payerId === userId,
        method: seat.method,
      });
    }
    return out;
  },
});
