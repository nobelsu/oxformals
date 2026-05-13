import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import type { Doc, Id } from "./_generated/dataModel";
import { internal } from "./_generated/api";
import { internalMutation, mutation, query } from "./_generated/server";
import type { QueryCtx } from "./_generated/server";
import { DEFAULT_UI_FONT, uiFontValidator } from "./uiFont";

const avatarValue = v.union(
  v.object({ kind: v.literal("preset"), id: v.string() }),
  v.object({ kind: v.literal("image"), dataUrl: v.string() }),
);

const avatarOrClear = v.optional(v.union(avatarValue, v.null()));

async function swapHasUpcomingFormal(
  ctx: QueryCtx,
  targetListingId: Id<"listings">,
  offeringListingId: Id<"listings">,
  nowMs: number,
): Promise<boolean> {
  const target = await ctx.db.get(targetListingId);
  const offering = await ctx.db.get(offeringListingId);
  if (!target || !offering) return false;
  const t = Date.parse(target.dateTime);
  const o = Date.parse(offering.dateTime);
  if (Number.isNaN(t) || Number.isNaN(o)) return false;
  return t > nowMs || o > nowMs;
}

/** Whether the viewer may see profile contact fields for profileUserId (trusted server time). */
async function hasRevealableContact(
  ctx: QueryCtx,
  viewerId: Id<"users"> | null,
  profileUserId: Id<"users">,
  nowMs: number,
): Promise<boolean> {
  if (!viewerId) return false;
  if (viewerId === profileUserId) return true;

  const fromViewer = await ctx.db
    .query("requests")
    .withIndex("by_fromUserId", (q) => q.eq("fromUserId", viewerId))
    .take(200);
  for (const r of fromViewer) {
    if (r.status !== "accepted" || r.toUserId !== profileUserId) continue;
    if (
      await swapHasUpcomingFormal(
        ctx,
        r.targetListingId,
        r.offeringListingId,
        nowMs,
      )
    ) {
      return true;
    }
  }

  const fromProfile = await ctx.db
    .query("requests")
    .withIndex("by_fromUserId", (q) => q.eq("fromUserId", profileUserId))
    .take(200);
  for (const r of fromProfile) {
    if (r.status !== "accepted" || r.toUserId !== viewerId) continue;
    if (
      await swapHasUpcomingFormal(
        ctx,
        r.targetListingId,
        r.offeringListingId,
        nowMs,
      )
    ) {
      return true;
    }
  }

  return false;
}

function userWithoutPublicContact(user: Doc<"users">): Omit<
  Doc<"users">,
  "instagramHandle" | "whatsappPhone"
> {
  const copy = { ...user };
  delete copy.instagramHandle;
  delete copy.whatsappPhone;
  return copy;
}

export const current = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    return await ctx.db.get(userId);
  },
});

export const listPublic = query({
  args: {},
  handler: async (ctx) => {
    const users = await ctx.db.query("users").take(200);
    return users.map(userWithoutPublicContact);
  },
});

export const myWishlist = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    const user = await ctx.db.get(userId);
    if (!user) return [];
    return user.wishlistColleges ?? [];
  },
});

export const completeOnboarding = mutation({
  args: {
    name: v.string(),
    college: v.string(),
    year: v.string(),
    role: v.string(),
    interests: v.optional(v.array(v.string())),
    instagramHandle: v.optional(v.string()),
    whatsappPhone: v.optional(v.string()),
    dietaryRequirements: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const name = args.name.trim();
    const college = args.college.trim();
    const year = args.year.trim();
    const role = args.role.trim();
    if (!name || !college || !year || !role) {
      throw new Error("Missing required profile fields.");
    }

    await ctx.db.patch(userId, {
      name,
      college,
      year,
      role,
      interests: args.interests ?? [],
      instagramHandle: args.instagramHandle?.trim() || undefined,
      whatsappPhone: args.whatsappPhone?.trim() || undefined,
      dietaryRequirements: args.dietaryRequirements?.trim() ?? "",
      uiFont: DEFAULT_UI_FONT,
    });

    return userId;
  },
});

export const agreeToRules = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    await ctx.db.patch(userId, { agreedToRules: true });
  },
});

export const patchProfile = mutation({
  args: {
    name: v.optional(v.string()),
    college: v.optional(v.string()),
    year: v.optional(v.string()),
    role: v.optional(v.string()),
    interests: v.optional(v.array(v.string())),
    instagramHandle: v.optional(v.string()),
    whatsappPhone: v.optional(v.string()),
    dietaryRequirements: v.optional(v.string()),
    uiFont: v.optional(uiFontValidator),
    avatar: avatarOrClear,
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    type UserPatch = Partial<
      Pick<
        Doc<"users">,
        | "name"
        | "college"
        | "year"
        | "role"
        | "interests"
        | "instagramHandle"
        | "whatsappPhone"
        | "dietaryRequirements"
        | "uiFont"
        | "avatar"
      >
    >;

    const patch: UserPatch = {};

    if (args.name !== undefined) {
      patch.name = args.name.trim() || undefined;
    }
    if (args.college !== undefined) {
      patch.college = args.college.trim() || undefined;
    }
    if (args.year !== undefined) {
      patch.year = args.year.trim() || undefined;
    }
    if (args.role !== undefined) {
      patch.role = args.role.trim() || undefined;
    }
    if (args.interests !== undefined) {
      patch.interests = args.interests;
    }
    if (args.instagramHandle !== undefined) {
      patch.instagramHandle = args.instagramHandle.trim() || undefined;
    }
    if (args.whatsappPhone !== undefined) {
      patch.whatsappPhone = args.whatsappPhone.trim() || undefined;
    }
    if (args.dietaryRequirements !== undefined) {
      patch.dietaryRequirements = args.dietaryRequirements.trim();
    }
    if (args.uiFont !== undefined) {
      patch.uiFont = args.uiFont;
    }
    if (args.avatar !== undefined) {
      patch.avatar =
        args.avatar === null ? undefined : (args.avatar as Doc<"users">["avatar"]);
    }

    if (Object.keys(patch).length === 0) {
      throw new Error("No profile fields to update.");
    }

    await ctx.db.patch(userId, patch);

    const updated = await ctx.db.get(userId);
    if (!updated) {
      throw new Error("User profile not found.");
    }
    return updated._id;
  },
});

export const getPublicProfile = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) return null;

    const viewerId = await getAuthUserId(ctx);
    /* Trusted server time for contact privacy; client-supplied `now` would be spoofable. */
    const nowMs = Date.now();
    const revealContact = await hasRevealableContact(
      ctx,
      viewerId,
      args.userId,
      nowMs,
    );

    const activeListings = await ctx.db
      .query("listings")
      .withIndex("by_ownerUserId", (q) => q.eq("ownerUserId", args.userId))
      .take(200);

    return {
      user: {
        _id: user._id,
        name: user.name,
        college: user.college,
        year: user.year,
        role: user.role,
        interests: user.interests,
        ...(revealContact
          ? {
              instagramHandle: user.instagramHandle,
              whatsappPhone: user.whatsappPhone,
            }
          : {}),
        dietaryRequirements: user.dietaryRequirements,
        uiFont: user.uiFont ?? DEFAULT_UI_FONT,
        avatar: user.avatar,
      },
      listings: activeListings.filter((l) => l.status === "active"),
    };
  },
});

export const toggleWishlistCollege = mutation({
  args: { college: v.string() },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const user = await ctx.db.get(userId);
    if (!user) throw new Error("User profile not found.");

    const college = args.college.trim();
    if (!college) throw new Error("College is required.");

    const current = user.wishlistColleges ?? [];
    const next = current.includes(college)
      ? current.filter((c) => c !== college)
      : [...current, college];

    await ctx.db.patch(userId, { wishlistColleges: next });
    return next;
  },
});

export const saveWishlistColleges = mutation({
  args: { colleges: v.array(v.string()) },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const user = await ctx.db.get(userId);
    if (!user) throw new Error("User profile not found.");

    const cleaned = Array.from(
      new Set(args.colleges.map((college) => college.trim()).filter(Boolean)),
    );
    await ctx.db.patch(userId, { wishlistColleges: cleaned });
    return cleaned;
  },
});

export const backfillDietaryRequirements = internalMutation({
  args: {},
  handler: async (ctx) => {
    const users = await ctx.db.query("users").take(100);
    let patched = 0;
    for (const user of users) {
      if (user.dietaryRequirements === undefined) {
        await ctx.db.patch(user._id, { dietaryRequirements: "" });
        patched++;
      }
    }
    if (patched === 100) {
      await ctx.scheduler.runAfter(0, internal.users.backfillDietaryRequirements, {});
    }
    return { patched };
  },
});

export const backfillUiFont = internalMutation({
  args: {},
  handler: async (ctx) => {
    const users = await ctx.db.query("users").take(100);
    let patched = 0;
    for (const user of users) {
      if (user.uiFont === undefined) {
        await ctx.db.patch(user._id, { uiFont: DEFAULT_UI_FONT });
        patched++;
      }
    }
    if (users.length === 100) {
      await ctx.scheduler.runAfter(0, internal.users.backfillUiFont, {});
    }
    return { patched, scanned: users.length };
  },
});

