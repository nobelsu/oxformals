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
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
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
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
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
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
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
    groupSize: v.union(v.literal(2), v.literal(3), v.literal(4)),
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
      groupSize: args.groupSize,
      seatsAvailable: args.groupSize - 1,
      members: [userId],
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

    const requestId = await ctx.db.insert("requests", {
      fromUserId: userId,
      toUserId: target.ownerUserId,
      targetListingId: args.targetListingId,
      offeringListingId: args.offeringListingId,
      message: args.message.trim(),
      status: "pending",
    });

    const mirrorCandidates = await ctx.db
      .query("requests")
      .withIndex("by_targetListingId_and_status", (q) =>
        q
          .eq("targetListingId", args.offeringListingId)
          .eq("status", "pending"),
      )
      .take(200);
    const mirror = mirrorCandidates.find(
      (r) =>
        r.offeringListingId === args.targetListingId && r._id !== requestId,
    );

    if (mirror) {
      await performAccept(ctx, mirror, [requestId]);
      await ctx.db.patch(requestId, { status: "accepted" });
      return { requestId, autoAccepted: true as const };
    }

    return { requestId, autoAccepted: false as const };
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

async function performAccept(
  ctx: MutationCtx,
  req: Doc<"requests">,
  skipIds: Id<"requests">[] = [],
) {
  const target = await getListingOrThrow(ctx, req.targetListingId);
  const offering = await getListingOrThrow(ctx, req.offeringListingId);
  if (target.status !== "active") {
    throw new Error("Target listing is no longer active.");
  }
  if (offering.status !== "active") {
    throw new Error("Offering listing is no longer active.");
  }
  if (target.seatsAvailable <= 0) {
    throw new Error("No seats available on target listing.");
  }
  if (offering.seatsAvailable <= 0) {
    throw new Error("No seats available on offering listing.");
  }

  await ctx.db.patch(req._id, { status: "accepted" });

  const newSeats = target.seatsAvailable - 1;
  const newMembers = [...target.members, req.fromUserId];
  await ctx.db.patch(req.targetListingId, {
    seatsAvailable: newSeats,
    members: newMembers,
    ...(newSeats === 0 ? { status: "closed" as const } : {}),
  });

  const newOfferingSeats = offering.seatsAvailable - 1;
  const newOfferingMembers = [...offering.members, req.toUserId];
  await ctx.db.patch(req.offeringListingId, {
    seatsAvailable: newOfferingSeats,
    members: newOfferingMembers,
    ...(newOfferingSeats === 0 ? { status: "confirmed" as const } : {}),
  });

  const idsToSkip = new Set([req._id, ...skipIds]);

  if (newSeats === 0) {
    const pendingForTarget = await ctx.db
      .query("requests")
      .withIndex("by_targetListingId_and_status", (q) =>
        q.eq("targetListingId", req.targetListingId).eq("status", "pending"),
      )
      .take(200);
    for (const pending of pendingForTarget) {
      if (idsToSkip.has(pending._id)) continue;
      await ctx.db.patch(pending._id, { status: "declined" });
    }
  }

  if (newOfferingSeats === 0) {
    const pendingForOffering = await ctx.db
      .query("requests")
      .withIndex("by_offeringListingId_and_status", (q) =>
        q.eq("offeringListingId", req.offeringListingId).eq("status", "pending"),
      )
      .take(200);
    for (const pending of pendingForOffering) {
      if (idsToSkip.has(pending._id)) continue;
      await ctx.db.patch(pending._id, { status: "declined" });
    }
  }
}

export const acceptRequest = mutation({
  args: { requestId: v.id("requests") },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const req = await ctx.db.get(args.requestId);
    if (!req) throw new Error("Request not found");
    if (req.toUserId !== userId) throw new Error("Not allowed");
    if (req.status !== "pending") throw new Error("Request is no longer pending");

    await performAccept(ctx, req);

    return req._id;
  },
});

export const leaveGroup = mutation({
  args: { listingId: v.id("listings") },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const listing = await getListingOrThrow(ctx, args.listingId);

    if (listing.ownerUserId === userId) {
      throw new Error("The owner cannot leave their own group.");
    }
    if (!listing.members.includes(userId)) {
      throw new Error("You are not a member of this group.");
    }

    const newMembers = listing.members.filter((m) => m !== userId);
    const newSeats = listing.seatsAvailable + 1;
    const reopened = listing.status === "closed" && newSeats > 0;
    await ctx.db.patch(args.listingId, {
      members: newMembers,
      seatsAvailable: newSeats,
      ...(reopened ? { status: "active" as const } : {}),
    });

    const acceptedRequests = await ctx.db
      .query("requests")
      .withIndex("by_targetListingId_and_status", (q) =>
        q.eq("targetListingId", args.listingId).eq("status", "accepted"),
      )
      .take(200);
    for (const req of acceptedRequests) {
      if (req.fromUserId === userId) {
        await ctx.db.patch(req._id, { status: "declined" });
      }
    }

    return args.listingId;
  },
});

export const removeMember = mutation({
  args: { listingId: v.id("listings"), memberId: v.id("users") },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const listing = await getListingOrThrow(ctx, args.listingId);

    if (listing.ownerUserId !== userId) {
      throw new Error("Only the owner can remove members.");
    }
    if (args.memberId === userId) {
      throw new Error("The owner cannot remove themselves.");
    }
    if (!listing.members.includes(args.memberId)) {
      throw new Error("User is not a member of this group.");
    }

    const newMembers = listing.members.filter((m) => m !== args.memberId);
    const newSeats = listing.seatsAvailable + 1;
    const reopened = listing.status === "closed" && newSeats > 0;
    await ctx.db.patch(args.listingId, {
      members: newMembers,
      seatsAvailable: newSeats,
      ...(reopened ? { status: "active" as const } : {}),
    });

    const acceptedRequests = await ctx.db
      .query("requests")
      .withIndex("by_targetListingId_and_status", (q) =>
        q.eq("targetListingId", args.listingId).eq("status", "accepted"),
      )
      .take(200);
    for (const req of acceptedRequests) {
      if (req.fromUserId === args.memberId) {
        await ctx.db.patch(req._id, { status: "declined" });
      }
    }

    return args.listingId;
  },
});

export const updateListing = mutation({
  args: {
    listingId: v.id("listings"),
    dateTime: v.optional(v.string()),
    groupSize: v.optional(v.union(v.literal(2), v.literal(3), v.literal(4))),
    message: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const listing = await getListingOrThrow(ctx, args.listingId);

    if (listing.ownerUserId !== userId) {
      throw new Error("Only the owner can edit a listing.");
    }
    if (listing.status !== "active") {
      throw new Error("Only active listings can be edited.");
    }
    if (listing.members.length > 1) {
      throw new Error("Cannot edit a listing that already has other members.");
    }

    const patch: Partial<Doc<"listings">> = {};

    if (args.dateTime !== undefined) {
      const timestamp = Date.parse(args.dateTime);
      if (Number.isNaN(timestamp)) {
        throw new Error("Invalid listing date.");
      }
      patch.dateTime = new Date(timestamp).toISOString();
    }

    if (args.groupSize !== undefined) {
      patch.groupSize = args.groupSize;
      patch.seatsAvailable = args.groupSize - listing.members.length;
    }

    if (args.message !== undefined) {
      patch.message = args.message.trim();
    }

    if (Object.keys(patch).length === 0) {
      return args.listingId;
    }

    await ctx.db.patch(args.listingId, patch);
    return args.listingId;
  },
});

export const deleteListing = mutation({
  args: { listingId: v.id("listings") },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const listing = await getListingOrThrow(ctx, args.listingId);

    if (listing.ownerUserId !== userId) {
      throw new Error("Only the owner can delete a listing.");
    }
    if (listing.status !== "active") {
      throw new Error("Only active listings can be deleted.");
    }

    const pendingAsTarget = await ctx.db
      .query("requests")
      .withIndex("by_targetListingId_and_status", (q) =>
        q.eq("targetListingId", args.listingId).eq("status", "pending"),
      )
      .take(200);
    for (const req of pendingAsTarget) {
      await ctx.db.patch(req._id, { status: "declined" });
    }

    const pendingAsOffering = await ctx.db
      .query("requests")
      .withIndex("by_offeringListingId_and_status", (q) =>
        q.eq("offeringListingId", args.listingId).eq("status", "pending"),
      )
      .take(200);
    for (const req of pendingAsOffering) {
      await ctx.db.patch(req._id, { status: "declined" });
    }

    await ctx.db.delete(args.listingId);
    return args.listingId;
  },
});
