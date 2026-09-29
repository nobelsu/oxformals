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

test("the Following feed only shows people you follow", async () => {
  const t = convexTest(schema, modules);
  const s = await seed(t);
  const everyone = await as(t, s.me).query(api.feed.getCampusFeed, {});
  const following = await as(t, s.me).query(api.feed.getCampusFeed, { scope: "following" });
  expect(everyone.items).toHaveLength(4);
  expect(following.items.map((i) => (i.kind === "listing" ? i.actor._id : null))).toEqual([s.friend]);
});
