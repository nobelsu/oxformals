/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { expect, test } from "vitest";
import { api } from "./_generated/api";
import schema from "./schema";

const modules = import.meta.glob("./**/*.*s");

test("account summary counts friends who joined; signing out elsewhere keeps this session", async () => {
  const t = convexTest(schema, modules);
  const { me, here, there } = await t.run(async (ctx) => {
    const me = await ctx.db.insert("users", { name: "Me", email: "me@ox.ac.uk" });
    const friend = await ctx.db.insert("users", { name: "Fay", email: "fay@ox.ac.uk" });
    const other = await ctx.db.insert("users", { name: "Sam", email: "sam@ox.ac.uk" });
    await ctx.db.insert("referrals", {
      inviterId: me,
      inviteeId: friend,
      source: "link",
      status: "earned",
      createdAt: 1,
    });
    await ctx.db.insert("referrals", {
      inviterId: other,
      inviteeId: me,
      source: "link",
      status: "earned",
      createdAt: 1,
    });
    const session = (userId: typeof me) =>
      ctx.db.insert("authSessions", { userId, expirationTime: Date.now() + 1e9 });
    return { me, here: await session(me), there: await session(me) };
  });
  const as = t.withIdentity({ subject: `${me}|${here}` });

  const summary = await as.query(api.account.getMyAccountSummary, {});
  expect(summary?.friendsJoined).toBe(1);
  expect(summary?.memberSince).toBeGreaterThan(0);

  await as.action(api.account.signOutOtherDevices, {});
  const left = await t.run((ctx) => ctx.db.query("authSessions").collect());
  expect(left.map((s) => s._id)).toEqual([here]);
  expect(left.some((s) => s._id === there)).toBe(false);
});

test("export holds my own rows and nobody else's", async () => {
  const t = convexTest(schema, modules);
  const { me } = await t.run(async (ctx) => {
    const me = await ctx.db.insert("users", { name: "Me", email: "me@ox.ac.uk" });
    const other = await ctx.db.insert("users", { name: "Sam", email: "sam@ox.ac.uk" });
    await ctx.db.insert("userBadges", { userId: me, badgeId: "formals-1", earnedAt: 1 });
    await ctx.db.insert("userBadges", { userId: other, badgeId: "formals-5", earnedAt: 1 });
    await ctx.db.insert("follows", { followerId: me, followeeId: other, status: "active" });
    return { me };
  });
  type Export = {
    profile?: { email?: string };
    badges?: { badgeId: string }[];
    following?: unknown[];
    followers?: unknown[];
  };
  const data: Export = await t
    .withIdentity({ subject: `${me}|s` })
    .query(api.account.exportMyData, {});
  expect(data.profile?.email).toBe("me@ox.ac.uk");
  expect(data.badges?.map((b) => b.badgeId)).toEqual(["formals-1"]);
  expect(data.following).toHaveLength(1);
  expect(data.followers).toEqual([]);
  await expect(t.query(api.account.exportMyData, {})).rejects.toThrow();

  // Only the groups asked for.
  const some: Export = await t
    .withIdentity({ subject: `${me}|s` })
    .query(api.account.exportMyData, { sections: ["social"] });
  expect(some.following).toHaveLength(1);
  expect(some.profile).toBeUndefined();
  expect(some.badges).toBeUndefined();
});
