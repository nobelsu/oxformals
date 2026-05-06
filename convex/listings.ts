import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import { mutation, query } from "./_generated/server";
import type { MutationCtx, QueryCtx } from "./_generated/server";

type Ctx = QueryCtx | MutationCtx;

async function requireUserId(ctx: Ctx): Promise<Id<"users">> {
  const userId = await getAuthUserId(ctx);
  if (!userId) throw new Error("Not authenticated");
  return userId;
}

async function getListingOrThrow(
  ctx: Ctx,
  listingId: Id<"listings">,
): Promise<Doc<"listings">> {
  const listing = await ctx.db.get(listingId);
  if (!listing) throw new Error("Listing not found");
  return listing;
}

export const listListings = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("listings").order("desc").take(200);
  },
});

export const listMyListings = query({
  args: {},
  handler: async (ctx) => {
    const userId = await requireUserId(ctx);
    return await ctx.db
      .query("listings")
      .withIndex("by_ownerUserId", (q) => q.eq("ownerUserId", userId))
      .order("desc")
      .take(200);
  },
});

export const listRequestsForMe = query({
  args: {},
  handler: async (ctx) => {
    const userId = await requireUserId(ctx);
    return await ctx.db
      .query("requests")
      .withIndex("by_toUserId", (q) => q.eq("toUserId", userId))
      .order("desc")
      .take(200);
  },
});

export const listRequestsFromMe = query({
  args: {},
  handler: async (ctx) => {
    const userId = await requireUserId(ctx);
    return await ctx.db
      .query("requests")
      .withIndex("by_fromUserId", (q) => q.eq("fromUserId", userId))
      .order("desc")
      .take(200);
  },
});

export const createListing = mutation({
  args: {
    dateTime: v.string(),
    seats: v.union(v.literal(1), v.literal(2), v.literal(3)),
    message: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const user = await ctx.db.get(userId);
    if (!user) throw new Error("User profile not found");

    const college = user.college?.trim() ?? "";
    const year = user.year?.trim() ?? "";
    const role = user.role?.trim() ?? "";
    if (!college || !year || !role) {
      throw new Error("Set college, year, and role in your profile before posting.");
    }

    const timestamp = Date.parse(args.dateTime);
    if (Number.isNaN(timestamp)) {
      throw new Error("Invalid listing date.");
    }

    return await ctx.db.insert("listings", {
      ownerUserId: userId,
      college,
      dateTime: new Date(timestamp).toISOString(),
      seats: args.seats,
      year,
      role,
      message: args.message.trim(),
      status: "active",
    });
  },
});

export const createRequest = mutation({
  args: {
    targetListingId: v.id("listings"),
    offeringListingId: v.id("listings"),
    message: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);

    if (args.targetListingId === args.offeringListingId) {
      throw new Error("You must offer a different listing.");
    }

    const target = await getListingOrThrow(ctx, args.targetListingId);
    const offering = await getListingOrThrow(ctx, args.offeringListingId);
    if (target.status !== "active" || offering.status !== "active") {
      throw new Error("Both listings must be active.");
    }
    if (offering.ownerUserId !== userId) {
      throw new Error("You can only offer your own listing.");
    }
    if (target.ownerUserId === userId) {
      throw new Error("You cannot request your own listing.");
    }

    const mine = await ctx.db
      .query("requests")
      .withIndex("by_fromUserId", (q) => q.eq("fromUserId", userId))
      .take(200);
    const existing = mine.find(
      (item) =>
        item.targetListingId === args.targetListingId &&
        item.offeringListingId === args.offeringListingId &&
        item.status === "pending",
    );
    if (existing) {
      throw new Error("You already sent this request.");
    }

    return await ctx.db.insert("requests", {
      fromUserId: userId,
      toUserId: target.ownerUserId,
      targetListingId: args.targetListingId,
      offeringListingId: args.offeringListingId,
      message: args.message.trim(),
      status: "pending",
    });
  },
});

export const declineRequest = mutation({
  args: { requestId: v.id("requests") },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const req = await ctx.db.get(args.requestId);
    if (!req) throw new Error("Request not found");
    if (req.toUserId !== userId) throw new Error("Not allowed");
    if (req.status !== "pending") throw new Error("Request is no longer pending");

    await ctx.db.patch(req._id, { status: "declined" });
    return req._id;
  },
});

export const withdrawRequest = mutation({
  args: { requestId: v.id("requests") },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const req = await ctx.db.get(args.requestId);
    if (!req) throw new Error("Request not found");
    if (req.fromUserId !== userId) throw new Error("Not allowed");
    if (req.status !== "pending") throw new Error("Request is no longer pending");

    await ctx.db.delete(req._id);
    return req._id;
  },
});

export const acceptRequest = mutation({
  args: { requestId: v.id("requests") },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const req = await ctx.db.get(args.requestId);
    if (!req) throw new Error("Request not found");
    if (req.toUserId !== userId) throw new Error("Not allowed");
    if (req.status !== "pending") throw new Error("Request is no longer pending");

    const target = await getListingOrThrow(ctx, req.targetListingId);
    const offering = await getListingOrThrow(ctx, req.offeringListingId);
    if (target.status !== "active" || offering.status !== "active") {
      throw new Error("Listings are no longer active.");
    }

    await ctx.db.patch(req._id, { status: "accepted" });
    await ctx.db.patch(req.targetListingId, { status: "confirmed" });
    await ctx.db.patch(req.offeringListingId, { status: "confirmed" });

    const pendingForTarget = await ctx.db
      .query("requests")
      .withIndex("by_targetListingId_and_status", (q) =>
        q.eq("targetListingId", req.targetListingId).eq("status", "pending"),
      )
      .take(200);
    const pendingForOffering = await ctx.db
      .query("requests")
      .withIndex("by_offeringListingId_and_status", (q) =>
        q.eq("offeringListingId", req.offeringListingId).eq("status", "pending"),
      )
      .take(200);

    const touched = new Set<Id<"requests">>();
    for (const pending of [...pendingForTarget, ...pendingForOffering]) {
      if (pending._id === req._id) continue;
      if (touched.has(pending._id)) continue;
      touched.add(pending._id);
      await ctx.db.patch(pending._id, { status: "declined" });
    }

    return req._id;
  },
});
