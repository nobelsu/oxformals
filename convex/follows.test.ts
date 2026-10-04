/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";
import { api } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import schema from "./schema";

const modules = import.meta.glob("./**/*.*s");

type T = ReturnType<typeof convexTest>;

async function makeUser(t: T, name: string, isPrivate = false) {
  return await t.run((ctx) =>
    ctx.db.insert("users", {
      name,
      email: `${name.toLowerCase()}@ox.ac.uk`,
      emailVerificationTime: 1,
      agreedToRules: true,
      college: "Keble",
      year: "2",
      role: "UG",
      ...(isPrivate ? { isPrivate: true } : {}),
    }),
  );
}

const as = (t: T, id: Id<"users">) => t.withIdentity({ subject: `${id}|s` });

/** A past listing at Worcester that `userId` attended and reviewed. */
async function giveActivity(t: T, userId: Id<"users">) {
  await t.run(async (ctx) => {
    const host = await ctx.db.insert("users", { name: "Host" });
    const listing = await ctx.db.insert("listings", {
      ownerUserId: host,
      college: "Worcester",
      dateTime: new Date(Date.now() - 864e5).toISOString(),
      groupSize: 2,
      seatsAvailable: 0,
      members: [host, userId],
      year: "2",
      role: "UG",
      message: "",
      status: "expired",
    });
    await ctx.db.insert("formalAttendanceConfirmations", {
      listingId: listing,
      userId,
      confirmedAt: Date.now(),
    } as never);
    await ctx.db.insert("collegeReviews", {
      listingId: listing,
      userId,
      college: "Worcester",
      ratings: { food: 4, atmosphere: 5, value: 4, overall: 4 },
      comment: "Lovely",
      isAnonymous: false,
      updatedAt: Date.now(),
    } as never);
    await ctx.db.insert("userBadges", { userId, badgeId: "first", earnedAt: 1 });
  });
}

describe("follows", () => {
  test("following a public account is instant; mutual follows are friends", async () => {
    const t = convexTest(schema, modules);
    const a = await makeUser(t, "Ana");
    const b = await makeUser(t, "Ben");
    expect(await as(t, a).mutation(api.follows.follow, { userId: b })).toBe("active");
    expect(await as(t, a).query(api.follows.listMyFriends, {})).toEqual([]);
    await as(t, b).mutation(api.follows.follow, { userId: a });
    const friends = await as(t, a).query(api.follows.listMyFriends, {});
    expect(friends.map((f) => f._id)).toEqual([b]);
    const state = await as(t, a).query(api.follows.getFollowState, { userId: b });
    expect(state).toMatchObject({ following: "active", followsYou: true, followers: 1 });
  });

  test("a private account approves followers", async () => {
    const t = convexTest(schema, modules);
    const a = await makeUser(t, "Ana");
    const p = await makeUser(t, "Pia", true);
    expect(await as(t, a).mutation(api.follows.follow, { userId: p })).toBe("pending");
    expect(
      (await as(t, p).query(api.follows.listFollowRequests, {})).map((u) => u._id),
    ).toEqual([a]);
    await as(t, p).mutation(api.follows.approveFollower, { userId: a });
    expect(
      await as(t, a).query(api.follows.getFollowState, { userId: p }),
    ).toMatchObject({ following: "active", canSeeActivity: true });
  });

  test("going public lets everyone waiting in", async () => {
    const t = convexTest(schema, modules);
    const a = await makeUser(t, "Ana");
    const p = await makeUser(t, "Pia", true);
    await as(t, a).mutation(api.follows.follow, { userId: p });
    await as(t, p).mutation(api.follows.setPrivate, { isPrivate: false });
    expect(
      (await as(t, a).query(api.follows.getFollowState, { userId: p }))?.following,
    ).toBe("active");
  });
});

describe("private accounts", () => {
  test("activity, badges and feed items are hidden from non-followers", async () => {
    const t = convexTest(schema, modules);
    const stranger = await makeUser(t, "Sam");
    const fan = await makeUser(t, "Fay");
    const p = await makeUser(t, "Pia", true);
    await giveActivity(t, p);
    await as(t, fan).mutation(api.follows.follow, { userId: p });
    await as(t, p).mutation(api.follows.approveFollower, { userId: fan });

    const strangerView = await as(t, stranger).query(
      api.profileActivity.getProfileActivity,
      { userId: p },
    );
    expect(strangerView.hidden).toBe(true);
    expect(strangerView.items).toEqual([]);
    expect(
      await as(t, stranger).query(api.badges.getUserBadges, { userId: p }),
    ).toEqual([]);
    const strangerFeed = await as(t, stranger).query(api.feed.getCampusFeed, {});
    expect(strangerFeed.items.some((i) => i.kind === "review")).toBe(false);

    const fanView = await as(t, fan).query(api.profileActivity.getProfileActivity, {
      userId: p,
    });
    expect(fanView.hidden).toBe(false);
    expect(fanView.items.map((i) => i.kind).sort()).toEqual(["attended", "review"]);
    const fanFeed = await as(t, fan).query(api.feed.getCampusFeed, {});
    expect(fanFeed.items.some((i) => i.kind === "review")).toBe(true);

    const selfView = await as(t, p).query(api.profileActivity.getProfileActivity, {
      userId: p,
    });
    expect(selfView.hidden).toBe(false);
  });
});
