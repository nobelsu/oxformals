/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { describe, expect, test, vi } from "vitest";
import { api, internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import schema from "./schema";

const modules = import.meta.glob("./**/*.*s");

const DAY = 864e5;
const inDays = (n: number) => new Date(Date.now() + n * DAY).toISOString();

type T = ReturnType<typeof convexTest<(typeof schema)["tables"]>>;

const makeUser = (t: T, name: string, college = "Keble", isPrivate = false) =>
  t.run((ctx) =>
    ctx.db.insert("users", {
      name,
      email: `${name.toLowerCase()}@ox.ac.uk`,
      emailVerificationTime: 1,
      agreedToRules: true,
      college,
      year: "2",
      role: "UG",
      ...(isPrivate ? { isPrivate: true } : {}),
    }),
  );

const as = (t: T, id: Id<"users">) => t.withIdentity({ subject: `${id}|s` });

const kindsFor = async (t: T, userId: Id<"users">) =>
  (
    await t.run((ctx) =>
      ctx.db
        .query("notifications")
        .withIndex("by_userId_and_createdAt", (q) => q.eq("userId", userId))
        .collect(),
    )
  ).map((n) => n.kind);

describe("social notifications", () => {
  test("follow, then follow back makes friends on both sides", async () => {
    const t = convexTest(schema, modules);
    const ann = await makeUser(t, "Ann");
    const ben = await makeUser(t, "Ben");
    await as(t, ann).mutation(api.follows.follow, { userId: ben });
    expect(await kindsFor(t, ben)).toEqual(["new_follower"]);
    await as(t, ben).mutation(api.follows.follow, { userId: ann });
    expect(await kindsFor(t, ann)).toEqual(["now_friends"]);
    expect(await kindsFor(t, ben)).toEqual(["new_follower", "now_friends"]);
  });

  test("following a private account asks; approving a follow-back makes friends", async () => {
    const t = convexTest(schema, modules);
    const ann = await makeUser(t, "Ann");
    const cat = await makeUser(t, "Cat", "Keble", true);
    await as(t, cat).mutation(api.follows.follow, { userId: ann }); // Ann is public
    await as(t, ann).mutation(api.follows.follow, { userId: cat });
    expect(await kindsFor(t, cat)).toEqual(["follow_request"]);
    await as(t, cat).mutation(api.follows.approveFollower, { userId: ann });
    expect(await kindsFor(t, cat)).toEqual(["follow_request", "now_friends"]);
    expect(await kindsFor(t, ann)).toEqual(["new_follower", "now_friends"]);
  });
});

describe("credit notifications", () => {
  test("accepting a credit guest tells the host a credit is coming, then paid", async () => {
    const t = convexTest(schema, modules);
    const gia = await makeUser(t, "Gia");
    const hal = await makeUser(t, "Hal", "Worcester");
    const listing = await as(t, hal).mutation(api.listings.createListing, {
      dateTime: inDays(3),
      groupSize: 4,
      message: "",
      listingType: "swap",
    });
    const { requestId } = await as(t, gia).mutation(api.listings.createRequest, {
      requestType: "credit",
      targetListingId: listing,
      message: "",
    });
    await as(t, hal).mutation(api.listings.acceptRequest, { requestId });
    vi.setSystemTime(Date.now() + 4 * DAY + 36e5);
    await t.mutation(internal.credits.settleDueHolds, {});
    const rows = await t.run((ctx) =>
      ctx.db
        .query("notifications")
        .withIndex("by_userId_and_createdAt", (q) => q.eq("userId", hal))
        .collect(),
    );
    expect(rows.map((r) => [r.kind, r.data?.count, r.data?.pending])).toEqual([
      ["request_received", 1, undefined],
      ["credit_earned", 1, true],
      ["credit_paid_out", 1, undefined],
    ]);
  });
});

describe("wishlist notifications", () => {
  test("a new listing notifies people wishing for that college, not the host", async () => {
    const t = convexTest(schema, modules);
    const ann = await makeUser(t, "Ann", "Keble");
    const hal = await makeUser(t, "Hal", "Worcester");
    await t.run(async (ctx) => {
      await ctx.db.insert("collegeWishlists", { userId: ann, college: "Worcester" });
      await ctx.db.insert("collegeWishlists", { userId: hal, college: "Worcester" });
    });
    const listing = await as(t, hal).mutation(api.listings.createListing, {
      dateTime: inDays(3),
      groupSize: 4,
      message: "",
      listingType: "swap",
    });
    const rows = await t.run((ctx) => ctx.db.query("notifications").collect());
    expect(rows).toMatchObject([
      { userId: ann, kind: "wishlist_listing", actorId: hal, listingId: listing, data: { college: "Worcester" } },
    ]);
  });
});
