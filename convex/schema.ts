import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

const avatar = v.optional(
  v.union(
    v.object({ kind: v.literal("preset"), id: v.string() }),
    v.object({ kind: v.literal("image"), dataUrl: v.string() }),
  ),
);

export default defineSchema({
  ...authTables,
  users: defineTable({
    name: v.optional(v.string()),
    image: v.optional(v.string()),
    email: v.optional(v.string()),
    emailVerificationTime: v.optional(v.number()),
    phone: v.optional(v.string()),
    phoneVerificationTime: v.optional(v.number()),
    isAnonymous: v.optional(v.boolean()),
    college: v.optional(v.string()),
    year: v.optional(v.string()),
    role: v.optional(v.string()),
    interests: v.optional(v.array(v.string())),
    avatar,
  })
    .index("email", ["email"])
    .index("phone", ["phone"]),
});
