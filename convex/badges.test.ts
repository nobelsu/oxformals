/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";
import { api } from "./_generated/api";
import schema from "./schema";

const modules = import.meta.glob("./**/*.*s");

async function seed(t: ReturnType<typeof convexTest>, badgesSeenAt?: number) {
  return await t.run(async (ctx) => {
    const me = await ctx.db.insert("users", {
      name: "Jeremy Tiger",
      email: "j@ox.ac.uk",
      ...(badgesSeenAt !== undefined ? { badgesSeenAt } : {}),
    });
    await ctx.db.insert("userBadges", { userId: me, badgeId: "formals-1", earnedAt: 100 });
    await ctx.db.insert("userBadges", { userId: me, badgeId: "college-worcester", earnedAt: 300 });
    await ctx.db.insert("userBadges", { userId: me, badgeId: "reviews-1", earnedAt: 200 });
    return { me };
  });
}

describe("new badges", () => {
  test("a user with no baseline gets needsBaseline and nothing to celebrate", async () => {
    const t = convexTest(schema, modules);
    const { me } = await seed(t);
    expect(
      await t.withIdentity({ subject: `${me}|s` }).query(api.badges.getMyNewBadges, {}),
    ).toEqual({ needsBaseline: true, badges: [] });
  });

  test("returns badges earned after the baseline, oldest first; marking seen clears them", async () => {
    const t = convexTest(schema, modules);
    const { me } = await seed(t, 150);
    const as = t.withIdentity({ subject: `${me}|s` });
    const res = await as.query(api.badges.getMyNewBadges, {});
    expect(res.needsBaseline).toBe(false);
    expect(res.badges.map((b) => b.badgeId)).toEqual(["reviews-1", "college-worcester"]);
    await as.mutation(api.badges.markBadgesSeen, { upTo: 200 });
    expect(
      (await as.query(api.badges.getMyNewBadges, {})).badges.map((b) => b.badgeId),
    ).toEqual(["college-worcester"]);
    // Never moves backwards.
    await as.mutation(api.badges.markBadgesSeen, { upTo: 50 });
    expect((await as.query(api.badges.getMyNewBadges, {})).badges).toHaveLength(1);
  });

  test("signed-out callers get an empty result", async () => {
    const t = convexTest(schema, modules);
    await seed(t, 0);
    expect(await t.query(api.badges.getMyNewBadges, {})).toEqual({
      needsBaseline: false,
      badges: [],
    });
  });
});

describe("badge share card", () => {
  test("only for badges the user holds", async () => {
    const t = convexTest(schema, modules);
    const { me } = await seed(t, 0);
    expect(
      await t.query(api.share.getBadgeShareCard, { userId: me, badgeId: "college-worcester" }),
    ).toEqual({
      firstName: "Jeremy",
      badgeId: "college-worcester",
      collegesVisited: 1,
      totalColleges: 43,
    });
    expect(
      await t.query(api.share.getBadgeShareCard, { userId: me, badgeId: "college-keble" }),
    ).toBeNull();
  });
});
