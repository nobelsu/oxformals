/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";
import { api, internal } from "./_generated/api";
import schema from "./schema";
import { COLLEGE_BADGES, stampLabel } from "../lib/data/badges";

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

test("every college has its own stamp label", () => {
  const labels = COLLEGE_BADGES.map((b) => stampLabel(b.college));
  expect(new Set(labels).size).toBe(labels.length);
});

describe("founding badge", () => {
  test("goes to everyone who signed up before the cutoff, once", async () => {
    const t = convexTest(schema, modules);
    const { early, gone } = await t.run(async (ctx) => {
      const early = await ctx.db.insert("users", { name: "Early", email: "e@ox.ac.uk" });
      const gone = await ctx.db.insert("users", {
        name: "Gone",
        email: "g@ox.ac.uk",
        deletedAt: 1,
      });
      return { early, gone };
    });
    const args = {
      signedUpBefore: Date.now() + 1000,
      paginationOpts: { numItems: 100, cursor: null },
    };
    const first = await t.mutation(internal.migrations.awardFoundingBadge, args);
    expect(first.awarded).toBe(1);
    const again = await t.mutation(internal.migrations.awardFoundingBadge, args);
    expect(again.awarded).toBe(0);
    const rows = await t.run((ctx) => ctx.db.query("userBadges").collect());
    expect(rows.map((r) => [r.userId, r.badgeId])).toEqual([[early, "founding-guest"]]);
    expect(rows.some((r) => r.userId === gone)).toBe(false);

    // Nobody who signs up after the cutoff gets it.
    const none = await t.mutation(internal.migrations.awardFoundingBadge, {
      ...args,
      signedUpBefore: 0,
    });
    expect(none.awarded).toBe(0);
  });
});
