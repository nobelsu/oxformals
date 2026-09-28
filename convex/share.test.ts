/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";
import { api } from "./_generated/api";
import schema from "./schema";

const modules = import.meta.glob("./**/*.*s");
const FUTURE = new Date(Date.now() + 7 * 864e5).toISOString();

async function seed(t: ReturnType<typeof convexTest>) {
  return await t.run(async (ctx) => {
    const host = await ctx.db.insert("users", {
      name: "Sophia Chen",
      email: "sophia@ox.ac.uk",
    });
    const listing = await ctx.db.insert("listings", {
      ownerUserId: host,
      college: "Worcester",
      dateTime: FUTURE,
      groupSize: 3,
      seatsAvailable: 2,
      members: [host],
      year: "2",
      role: "UG",
      message: "",
      status: "active",
      formalType: "social",
    });
    const named = await ctx.db.insert("collegeReviews", {
      userId: host,
      listingId: listing,
      college: "Worcester",
      ratings: { food: 4, atmosphere: 5, value: 4, overall: 4.5 },
      comment: "Best hall of the term.",
      isAnonymous: false,
      updatedAt: 1,
    });
    const anon = await ctx.db.insert("collegeReviews", {
      userId: host,
      listingId: listing,
      college: "Worcester",
      ratings: { food: 3, atmosphere: 3, value: 3, overall: 3 },
      isAnonymous: true,
      updatedAt: 1,
    });
    return { host, listing, named, anon };
  });
}

describe("share cards", () => {
  test("listing card shows the host's first name only", async () => {
    const t = convexTest(schema, modules);
    const s = await seed(t);
    expect(
      await t.query(api.share.getListingShareCard, { listingId: s.listing }),
    ).toEqual({
      college: "Worcester",
      dateTime: FUTURE,
      seatsAvailable: 2,
      formalType: "social",
      hostFirstName: "Sophia",
    });
  });

  test("review card hides anonymous authors", async () => {
    const t = convexTest(schema, modules);
    const s = await seed(t);
    expect(
      await t.query(api.share.getReviewShareCard, { reviewId: s.named }),
    ).toMatchObject({
      college: "Worcester",
      overall: 4.5,
      comment: "Best hall of the term.",
      authorFirstName: "Sophia",
      photoUrl: null,
    });
    expect(
      (await t.query(api.share.getReviewShareCard, { reviewId: s.anon }))
        ?.authorFirstName,
    ).toBeNull();
  });

  test("missing rows return null", async () => {
    const t = convexTest(schema, modules);
    const s = await seed(t);
    await t.run(async (ctx) => {
      await ctx.db.delete(s.listing);
      await ctx.db.delete(s.named);
    });
    expect(
      await t.query(api.share.getListingShareCard, { listingId: s.listing }),
    ).toBeNull();
    expect(
      await t.query(api.share.getReviewShareCard, { reviewId: s.named }),
    ).toBeNull();
  });
});
