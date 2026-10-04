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
      bio: `${name}'s bio`,
      subject: "History",
      interests: ["rowing"],
      avatar: { kind: "preset", id: "fox" },
      ...(isPrivate ? { isPrivate: true } : {}),
    }),
  );
}

const as = (t: T, id: Id<"users">) => t.withIdentity({ subject: `${id}|s` });

async function follow(t: T, followerId: Id<"users">, followeeId: Id<"users">) {
  await t.run((ctx) =>
    ctx.db.insert("follows", { followerId, followeeId, status: "active" }),
  );
}

async function giveReviewAndBadge(t: T, userId: Id<"users">) {
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
    await ctx.db.insert("collegeReviews", {
      listingId: listing,
      userId,
      college: "Worcester",
      ratings: { food: 4, atmosphere: 5, value: 4, overall: 4 },
      comment: "Lovely",
      isAnonymous: false,
      updatedAt: Date.now(),
    });
    await ctx.db.insert("userBadges", {
      userId,
      badgeId: "college-worcester",
      earnedAt: 1,
    });
  });
}

describe("users.listPublic", () => {
  test("signed-out callers get nobody", async () => {
    const t = convexTest(schema, modules);
    await makeUser(t, "Ana");
    expect(await t.query(api.users.listPublic, {})).toEqual([]);
  });

  test("private accounts only appear to themselves and their followers", async () => {
    const t = convexTest(schema, modules);
    const ana = await makeUser(t, "Ana");
    const ben = await makeUser(t, "Ben");
    const pia = await makeUser(t, "Pia", true);
    const ids = async (viewer: Id<"users">) =>
      (await as(t, viewer).query(api.users.listPublic, {}))
        .map((u) => u._id)
        .sort();
    expect(await ids(ana)).toEqual([ana, ben].sort());
    expect(await ids(pia)).toEqual([ana, ben, pia].sort());
    await follow(t, ana, pia);
    expect(await ids(ana)).toEqual([ana, ben, pia].sort());
  });
});

describe("users.getPublicByIds", () => {
  test("signed-out callers get nobody", async () => {
    const t = convexTest(schema, modules);
    const ana = await makeUser(t, "Ana");
    expect(
      await t.query(api.users.getPublicByIds, { userIds: [ana] }),
    ).toEqual([]);
  });

  test("a private account shows only who they are to non-followers", async () => {
    const t = convexTest(schema, modules);
    const ana = await makeUser(t, "Ana");
    const pia = await makeUser(t, "Pia", true);
    const [limited] = await as(t, ana).query(api.users.getPublicByIds, {
      userIds: [pia],
    });
    expect(limited).toMatchObject({
      _id: pia,
      name: "Pia",
      college: "Keble",
      bio: "",
      subject: "",
      interests: [],
    });
    expect(limited.avatar).toBeUndefined();

    await follow(t, ana, pia);
    const [full] = await as(t, ana).query(api.users.getPublicByIds, {
      userIds: [pia],
    });
    expect(full).toMatchObject({
      bio: "Pia's bio",
      subject: "History",
      avatar: { kind: "preset", id: "fox" },
    });
  });
});

describe("activity of private accounts", () => {
  test("listPublicReviewsForUser hides a private member's reviews from non-followers", async () => {
    const t = convexTest(schema, modules);
    const ana = await makeUser(t, "Ana");
    const pia = await makeUser(t, "Pia", true);
    await giveReviewAndBadge(t, pia);
    const args = { userId: pia };
    const list = (viewer?: Id<"users">) =>
      viewer
        ? as(t, viewer).query(api.collegeReviews.listPublicReviewsForUser, args)
        : t.query(api.collegeReviews.listPublicReviewsForUser, args);
    expect(await list()).toEqual([]);
    expect(await list(ana)).toEqual([]);
    expect(await list(pia)).toHaveLength(1);
    await follow(t, ana, pia);
    expect(await list(ana)).toHaveLength(1);
  });

  test("a private member's badge has no public share card", async () => {
    const t = convexTest(schema, modules);
    const ana = await makeUser(t, "Ana");
    const pia = await makeUser(t, "Pia", true);
    await giveReviewAndBadge(t, ana);
    await giveReviewAndBadge(t, pia);
    const args = (userId: Id<"users">) => ({
      userId,
      badgeId: "college-worcester",
    });
    expect(
      await t.query(api.share.getBadgeShareCard, args(ana)),
    ).not.toBeNull();
    expect(await t.query(api.share.getBadgeShareCard, args(pia))).toBeNull();
  });
});

const LIMITED = { bio: "", subject: "", interests: [] };

async function makeUpcomingListing(t: T, ownerUserId: Id<"users">) {
  return await t.run((ctx) =>
    ctx.db.insert("listings", {
      ownerUserId,
      college: "Keble",
      dateTime: new Date(Date.now() + 7 * 864e5).toISOString(),
      groupSize: 2,
      seatsAvailable: 1,
      members: [ownerUserId],
      year: "2",
      role: "UG",
      message: "",
      status: "active",
    }),
  );
}

describe("users.getPublicProfile of a private account", () => {
  test("signed-out visitors and non-followers see only who they are", async () => {
    const t = convexTest(schema, modules);
    const ana = await makeUser(t, "Ana");
    const pia = await makeUser(t, "Pia", true);
    for (const profile of [
      await t.query(api.users.getPublicProfile, { userId: pia }),
      await as(t, ana).query(api.users.getPublicProfile, { userId: pia }),
    ]) {
      expect(profile?.user).toMatchObject({
        _id: pia,
        name: "Pia",
        college: "Keble",
        year: "2",
        role: "UG",
        wishlistColleges: [],
        ...LIMITED,
      });
      expect(profile?.user.avatar).toBeUndefined();
    }
  });

  test("the owner and approved followers see everything", async () => {
    const t = convexTest(schema, modules);
    const ana = await makeUser(t, "Ana");
    const pia = await makeUser(t, "Pia", true);
    await follow(t, ana, pia);
    for (const viewer of [ana, pia]) {
      const profile = await as(t, viewer).query(api.users.getPublicProfile, {
        userId: pia,
      });
      expect(profile?.user).toMatchObject({
        bio: "Pia's bio",
        subject: "History",
        interests: ["rowing"],
        avatar: { kind: "preset", id: "fox" },
      });
    }
  });

  test("a pending follow request doesn't unlock the profile", async () => {
    const t = convexTest(schema, modules);
    const ana = await makeUser(t, "Ana");
    const pia = await makeUser(t, "Pia", true);
    await t.run((ctx) =>
      ctx.db.insert("follows", {
        followerId: ana,
        followeeId: pia,
        status: "pending",
      }),
    );
    const profile = await as(t, ana).query(api.users.getPublicProfile, {
      userId: pia,
    });
    expect(profile?.user).toMatchObject(LIMITED);
  });

  test("a matched counterparty on an upcoming formal sees the full profile", async () => {
    const t = convexTest(schema, modules);
    const ana = await makeUser(t, "Ana");
    const pia = await makeUser(t, "Pia", true);
    const listing = await makeUpcomingListing(t, pia);
    await t.run((ctx) =>
      ctx.db.insert("requests", {
        fromUserId: ana,
        toUserId: pia,
        targetListingId: listing,
        message: "",
        status: "accepted",
        requestType: "pay",
      }),
    );
    const profile = await as(t, ana).query(api.users.getPublicProfile, {
      userId: pia,
    });
    expect(profile?.user).toMatchObject({
      bio: "Pia's bio",
      avatar: { kind: "preset", id: "fox" },
    });
  });

  test("public accounts are unchanged", async () => {
    const t = convexTest(schema, modules);
    const ana = await makeUser(t, "Ana");
    const profile = await t.query(api.users.getPublicProfile, { userId: ana });
    expect(profile?.user).toMatchObject({
      bio: "Ana's bio",
      avatar: { kind: "preset", id: "fox" },
    });
  });
});

describe("other people's summaries of a private account", () => {
  test("feedComments.listComments limits a private author to name and initials", async () => {
    const t = convexTest(schema, modules);
    const ana = await makeUser(t, "Ana");
    const pia = await makeUser(t, "Pia", true);
    await t.run((ctx) =>
      ctx.db.insert("feedComments", {
        targetKey: "listing:x",
        userId: pia,
        text: "Hi",
      }),
    );
    const args = { targetKey: "listing:x" };
    const author = async (viewer?: Id<"users">) =>
      (
        viewer
          ? await as(t, viewer).query(api.feedComments.listComments, args)
          : await t.query(api.feedComments.listComments, args)
      )[0].author;
    for (const viewer of [undefined, ana]) {
      const a = await author(viewer);
      expect(a).toMatchObject({ name: "Pia", ...LIMITED });
      expect(a?.avatar).toBeUndefined();
    }
    expect(await author(pia)).toMatchObject({ bio: "Pia's bio" });
    await follow(t, ana, pia);
    expect(await author(ana)).toMatchObject({ bio: "Pia's bio" });
  });

  test("the feed shows a private host's listing with a limited actor", async () => {
    const t = convexTest(schema, modules);
    const ana = await makeUser(t, "Ana");
    const pia = await makeUser(t, "Pia", true);
    await makeUpcomingListing(t, pia);
    const feed = await as(t, ana).query(api.feed.getCampusFeed, {});
    const item = feed.items.find((i) => i.kind === "listing");
    expect(item && "actor" in item ? item.actor : null).toMatchObject({
      name: "Pia",
      ...LIMITED,
    });
  });

  test("follows.listFollows limits private members of a public list", async () => {
    const t = convexTest(schema, modules);
    const ana = await makeUser(t, "Ana");
    const ben = await makeUser(t, "Ben");
    const pia = await makeUser(t, "Pia", true);
    await follow(t, pia, ben);
    const list = async (viewer: Id<"users">) =>
      await as(t, viewer).query(api.follows.listFollows, {
        userId: ben,
        direction: "followers",
      });
    const [limited] = (await list(ana)) ?? [];
    expect(limited).toMatchObject({ _id: pia, ...LIMITED });
    expect(limited.avatar).toBeUndefined();
    const [full] = (await list(pia)) ?? [];
    expect(full).toMatchObject({ bio: "Pia's bio" });
  });

  test("chat pickers and search show a private account without their photo", async () => {
    const t = convexTest(schema, modules);
    const ana = await makeUser(t, "Ana");
    const pia = await makeUser(t, "Pia", true);
    const picker = await as(t, ana).query(api.users.listForChatPicker, {});
    expect(picker.find((u) => u._id === pia)?.avatar).toBeUndefined();
    const search = await as(t, ana).query(api.chat.searchUsersForChat, {
      query: "pia",
    });
    expect(search).toHaveLength(1);
    expect(search[0].avatar).toBeUndefined();
    const mention = await as(t, ana).query(api.chat.searchUsersForMention, {
      query: "pi",
    });
    expect(mention[0].avatar).toBeUndefined();

    await follow(t, ana, pia);
    const after = await as(t, ana).query(api.chat.searchUsersForChat, {
      query: "pia",
    });
    expect(after[0].avatar).toEqual({ kind: "preset", id: "fox" });
  });
});
