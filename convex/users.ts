import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import type { Doc } from "./_generated/dataModel";
import { mutation, query } from "./_generated/server";

const avatarValue = v.union(
  v.object({ kind: v.literal("preset"), id: v.string() }),
  v.object({ kind: v.literal("image"), dataUrl: v.string() }),
);

const avatar = v.optional(avatarValue);
const avatarOrClear = v.optional(v.union(avatarValue, v.null()));

export const current = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    return await ctx.db.get(userId);
  },
});

export const completeOnboarding = mutation({
  args: {
    name: v.string(),
    college: v.string(),
    year: v.string(),
    role: v.string(),
    interests: v.optional(v.array(v.string())),
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
    });

    return userId;
  },
});

export const patchProfile = mutation({
  args: {
    name: v.optional(v.string()),
    college: v.optional(v.string()),
    year: v.optional(v.string()),
    role: v.optional(v.string()),
    interests: v.optional(v.array(v.string())),
    avatar: avatarOrClear,
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    type UserPatch = Partial<
      Pick<
        Doc<"users">,
        "name" | "college" | "year" | "role" | "interests" | "avatar"
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
