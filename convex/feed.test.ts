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
    const friend = await user("Fay");
    const stranger = await user("Sam");
    const listing = (owner: Id<"users">, college: string, inHours: number) =>
      ctx.db.insert("listings", {
        ownerUserId: owner,
        college,
        dateTime: new Date(Date.now() + inHours * 36e5).toISOString(),
        groupSize: 3,
        seatsAvailable: 2,
        members: [owner],
        year: "2",
        role: "UG",
        message: "",
        status: "active",
      });
    await listing(friend, "Keble", 20);
    await listing(stranger, "Keble", 21);
    await listing(stranger, "Magdalen", 30);
    await listing(stranger, "Exeter", 24 * 9);
    await ctx.db.insert("follows", { followerId: me, followeeId: friend, status: "active" });
    return { me, friend, stranger };
  });
}

test("this week's formals: one bubble per college per night, next 7 days only", async () => {
  const t = convexTest(schema, modules);
  const s = await seed(t);
  const bubbles = await as(t, s.me).query(api.feed.getWeekFormals, {});
  expect(bubbles.map((b) => [b.college, b.listingIds.length])).toEqual([
    ["Keble", 2],
    ["Magdalen", 1],
  ]);
});

test("this week's formals leave out ones you're already going to", async () => {
  const t = convexTest(schema, modules);
  const s = await seed(t);
  await t.run(async (ctx) => {
    const magdalen = (await ctx.db.query("listings").collect()).find(
      (l) => l.college === "Magdalen",
    )!;
    await ctx.db.patch(magdalen._id, {
      members: [...magdalen.members, s.me],
      seatsAvailable: 1,
    });
  });
  const bubbles = await as(t, s.me).query(api.feed.getWeekFormals, {});
  expect(bubbles.map((b) => b.college)).toEqual(["Keble"]);
});

test("the Following feed only shows people you follow", async () => {
  const t = convexTest(schema, modules);
  const s = await seed(t);
  const everyone = await as(t, s.me).query(api.feed.getCampusFeed, {});
  const following = await as(t, s.me).query(api.feed.getCampusFeed, { scope: "following" });
  expect(everyone.items).toHaveLength(4);
  expect(following.items.map((i) => (i.kind === "listing" ? i.actor._id : null))).toEqual([s.friend]);
});

test("'went to' items only reach people who follow them", async () => {
  const t = convexTest(schema, modules);
  const s = await seed(t);
  await t.run(async (ctx) => {
    for (const who of [s.friend, s.stranger]) {
      const listing = await ctx.db.insert("listings", {
        ownerUserId: who,
        college: "Oriel",
        dateTime: new Date(Date.now() - 864e5).toISOString(),
        groupSize: 2,
        seatsAvailable: 1,
        members: [who],
        year: "2",
        role: "UG",
        message: "",
        status: "expired",
      });
      await ctx.db.insert("formalAttendanceConfirmations", {
        listingId: listing,
        userId: who,
        confirmedAt: Date.now(),
      });
    }
  });
  const feed = await as(t, s.me).query(api.feed.getCampusFeed, {});
  const attended = feed.items.filter((i) => i.kind === "attended");
  expect(attended.flatMap((i) => (i.kind === "attended" ? i.actors.map((a) => a._id) : []))).toEqual([s.friend]);
});

test("For you shows everything, wishlist colleges and people you follow first", async () => {
  const t = convexTest(schema, modules);
  const s = await seed(t);
  await t.run((ctx) => ctx.db.patch(s.me, { wishlistColleges: ["Magdalen"] }));
  const feed = await as(t, s.me).query(api.feed.getCampusFeed, {});
  expect(feed.wishlistEmpty).toBe(false);
  const label = (i: (typeof feed.items)[number]) =>
    i.kind === "listing" ? `${i.listing.college}:${i.actor._id}` : i.kind;
  expect(feed.items).toHaveLength(4);
  // Magdalen (wishlist) + the friend's Keble listing (people you follow) lead.
  expect(feed.items.slice(0, 2).map(label).sort()).toEqual(
    [`Keble:${s.friend}`, `Magdalen:${s.stranger}`].sort(),
  );
});
