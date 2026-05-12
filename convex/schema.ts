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
    instagramHandle: v.optional(v.string()),
    whatsappPhone: v.optional(v.string()),
    dietaryRequirements: v.optional(v.string()),
    wishlistColleges: v.optional(v.array(v.string())),
    agreedToRules: v.optional(v.boolean()),
    avatar,
  })
    .index("email", ["email"])
    .index("phone", ["phone"]),
  listings: defineTable({
    ownerUserId: v.id("users"),
    college: v.string(),
    dateTime: v.string(),
    groupSize: v.union(v.literal(2), v.literal(3), v.literal(4)),
    seatsAvailable: v.number(),
    members: v.array(v.id("users")),
    year: v.string(),
    role: v.string(),
    message: v.string(),
    menu: v.optional(v.string()),
    status: v.union(
      v.literal("active"),
      v.literal("confirmed"),
      v.literal("closed"),
    ),
  })
    .index("by_ownerUserId", ["ownerUserId"])
    .index("by_status", ["status"])
    .index("by_college_and_status", ["college", "status"]),
  requests: defineTable({
    fromUserId: v.id("users"),
    toUserId: v.id("users"),
    targetListingId: v.id("listings"),
    offeringListingId: v.id("listings"),
    message: v.string(),
    status: v.union(
      v.literal("pending"),
      v.literal("accepted"),
      v.literal("declined"),
    ),
  })
    .index("by_toUserId", ["toUserId"])
    .index("by_fromUserId", ["fromUserId"])
    .index("by_targetListingId", ["targetListingId"])
    .index("by_offeringListingId", ["offeringListingId"])
    .index("by_targetListingId_and_status", ["targetListingId", "status"])
    .index("by_offeringListingId_and_status", ["offeringListingId", "status"]),
});
