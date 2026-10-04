/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { expect, test } from "vitest";
import { api } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import schema from "./schema";

const modules = import.meta.glob("./**/*.*s");
type T = ReturnType<typeof convexTest>;
const as = (t: T, id: Id<"users">) => t.withIdentity({ subject: `${id}|s` });

async function seed(t: T) {
  return await t.run(async (ctx) => {
    const user = (name: string) =>
      ctx.db.insert("users", {
        name,
        email: `${name.toLowerCase()}@ox.ac.uk`,
        emailVerificationTime: 1,
        agreedToRules: true,
      });
    const me = await user("Me");
    const them = await user("Them");
    await ctx.db.insert("follows", { followerId: me, followeeId: them, status: "active" });
    await ctx.db.insert("follows", { followerId: them, followeeId: me, status: "active" });
    const listing = await ctx.db.insert("listings", {
      ownerUserId: them,
      college: "Keble",
      dateTime: new Date(Date.now() + 48 * 36e5).toISOString(),
      groupSize: 3,
      seatsAvailable: 2,
      members: [them],
      year: "2",
      role: "UG",
      message: "",
      status: "active",
    });
    return { me, them, listing };
  });
}

test("blocking drops follows and hides each from the other", async () => {
  const t = convexTest(schema, modules);
  const s = await seed(t);

  expect((await as(t, s.me).query(api.feed.getCampusFeed, {})).items).toHaveLength(1);
  await as(t, s.me).mutation(api.blocks.block, { userId: s.them });

  expect(await t.run((ctx) => ctx.db.query("follows").collect())).toEqual([]);
  expect(await as(t, s.me).query(api.blocks.getBlockState, { userId: s.them })).toEqual({
    iBlocked: true,
    blockedMe: false,
  });
  expect(await as(t, s.them).query(api.blocks.getBlockState, { userId: s.me })).toEqual({
    iBlocked: false,
    blockedMe: true,
  });

  // Their listing is gone from my feed and my listings, and mine from theirs.
  expect((await as(t, s.me).query(api.feed.getCampusFeed, {})).items).toEqual([]);
  expect(await as(t, s.me).query(api.listings.listListings, {})).toEqual([]);
  // Someone else still sees it.
  expect(await t.query(api.listings.listListings, {})).toHaveLength(1);
});

test("blocked pairs can't follow, message or request, in either direction", async () => {
  const t = convexTest(schema, modules);
  const s = await seed(t);
  await as(t, s.me).mutation(api.blocks.block, { userId: s.them });

  await expect(as(t, s.me).mutation(api.follows.follow, { userId: s.them })).rejects.toThrow();
  await expect(as(t, s.them).mutation(api.follows.follow, { userId: s.me })).rejects.toThrow();
  await expect(
    as(t, s.them).mutation(api.chat.getOrCreateConversation, { otherUserId: s.me }),
  ).rejects.toThrow("can't message");
  await expect(
    as(t, s.me).mutation(api.listings.createRequest, {
      requestType: "pay",
      targetListingId: s.listing,
      message: "",
    }),
  ).rejects.toThrow("no longer available");
});

test("unblocking restores visibility; my blocks are listed", async () => {
  const t = convexTest(schema, modules);
  const s = await seed(t);
  await as(t, s.me).mutation(api.blocks.block, { userId: s.them });
  expect((await as(t, s.me).query(api.blocks.listMyBlocks, {})).map((b) => b.name)).toEqual([
    "Them",
  ]);
  await as(t, s.me).mutation(api.blocks.unblock, { userId: s.them });
  expect(await as(t, s.me).query(api.blocks.listMyBlocks, {})).toEqual([]);
  expect(await as(t, s.me).query(api.listings.listListings, {})).toHaveLength(1);
});
