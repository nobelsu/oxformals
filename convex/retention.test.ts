/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { afterEach, describe, expect, test, vi } from "vitest";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import schema from "./schema";

const modules = import.meta.glob("./**/*.*s");

const newTest = () => convexTest(schema, modules);
type T = ReturnType<typeof newTest>;

const DAY = 24 * 60 * 60 * 1000;
const MONTH = 365 * DAY / 12;
const NOW = Date.UTC(2030, 0, 1);

afterEach(() => {
  vi.useRealTimers();
});

async function makeUser(t: T, name: string, deletedAt?: number) {
  return await t.run((ctx) =>
    ctx.db.insert("users", {
      name: deletedAt === undefined ? name : "Deleted user",
      ...(deletedAt === undefined ? {} : { deletedAt }),
    }),
  );
}

async function makeListing(t: T, ownerUserId: Id<"users">) {
  return await t.run((ctx) =>
    ctx.db.insert("listings", {
      ownerUserId,
      college: "Keble",
      dateTime: new Date(NOW - 3 * 365 * DAY).toISOString(),
      groupSize: 2,
      seatsAvailable: 0,
      members: [ownerUserId],
      year: "2",
      role: "UG",
      message: "",
      status: "expired",
    }),
  );
}

async function makeMessages(t: T, senderUserId: Id<"users">, count: number) {
  return await t.run(async (ctx) => {
    const conversationId = await ctx.db.insert("conversations", {
      kind: "group",
      lastMessageAt: 1,
    });
    for (let i = 0; i < count; i++) {
      await ctx.db.insert("messages", {
        conversationId,
        senderUserId,
        body: `m${i}`,
      });
    }
  });
}

async function messageCount(t: T, senderUserId: Id<"users">) {
  return await t.run(
    async (ctx) =>
      (
        await ctx.db
          .query("messages")
          .withIndex("by_senderUserId", (q) => q.eq("senderUserId", senderUserId))
          .collect()
      ).length,
  );
}

describe("messages from deleted users", () => {
  test("go 12 months after the account was deleted", async () => {
    const t = newTest();
    const old = await makeUser(t, "Old", NOW - 13 * MONTH);
    const recent = await makeUser(t, "Recent", NOW - 11 * MONTH);
    const live = await makeUser(t, "Live");
    await makeMessages(t, old, 3);
    await makeMessages(t, recent, 3);
    await makeMessages(t, live, 3);

    await t.mutation(internal.retention.purgeDeletedUsersMessages, { now: NOW });

    expect(await messageCount(t, old)).toBe(0);
    expect(await messageCount(t, recent)).toBe(3);
    expect(await messageCount(t, live)).toBe(3);
  });

  test("large backlogs finish in batches", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
    const t = newTest();
    const users = [];
    for (let i = 0; i < 3; i++) {
      const u = await makeUser(t, `Old${i}`, NOW - (13 + i) * MONTH);
      await makeMessages(t, u, 230);
      users.push(u);
    }
    await t.mutation(internal.retention.runDaily, {});
    await t.finishAllScheduledFunctions(vi.runAllTimers);
    for (const u of users) expect(await messageCount(t, u)).toBe(0);
  });
});

describe("reviews by deleted users", () => {
  async function seedReview(t: T, userId: Id<"users">, overall: number) {
    const listingId = await makeListing(t, userId);
    const voter = await makeUser(t, "Voter");
    return await t.run(async (ctx) => {
      const reviewId = await ctx.db.insert("collegeReviews", {
        userId,
        listingId,
        college: "Keble",
        ratings: { food: 4, atmosphere: 4, value: 4, overall },
        isAnonymous: false,
        updatedAt: 1,
        voteScore: 1,
      });
      await ctx.db.insert("collegeReviewVotes", {
        reviewId,
        userId: voter,
        value: 1,
        updatedAt: 1,
      });
      await ctx.db.insert("collegeReviewReports", {
        reviewId,
        reporterUserId: voter,
        createdAt: 1,
      });
      const targetKey = `review:${reviewId}`;
      await ctx.db.insert("feedComments", { targetKey, userId: voter, text: "hi" });
      await ctx.db.insert("feedLikes", { targetKey, userId: voter });
      await ctx.db.insert("feedBookmarks", { targetKey, userId: voter });
      return reviewId;
    });
  }

  test("go 24 months after deletion, with their votes, reports and feed reactions, and stats follow", async () => {
    const t = newTest();
    const old = await makeUser(t, "Old", NOW - 25 * MONTH);
    const recent = await makeUser(t, "Recent", NOW - 23 * MONTH);
    const oldReview = await seedReview(t, old, 2);
    const keptReview = await seedReview(t, recent, 5);
    await t.run((ctx) =>
      ctx.db.insert("collegeStats", {
        college: "Keble",
        reviewCount: 2,
        ratingSums: { food: 8, atmosphere: 8, value: 8, overall: 7 },
        attendanceCount: 4,
        completedFormalCount: 2,
        updatedAt: 1,
      }),
    );

    await t.mutation(internal.retention.purgeDeletedUsersReviews, { now: NOW });

    await t.run(async (ctx) => {
      expect(await ctx.db.get(oldReview)).toBeNull();
      expect(await ctx.db.get(keptReview)).not.toBeNull();
      const key = `review:${oldReview}`;
      expect(
        await ctx.db
          .query("collegeReviewVotes")
          .withIndex("by_reviewId", (q) => q.eq("reviewId", oldReview))
          .collect(),
      ).toEqual([]);
      expect(
        await ctx.db
          .query("collegeReviewReports")
          .withIndex("by_reviewId", (q) => q.eq("reviewId", oldReview))
          .collect(),
      ).toEqual([]);
      expect(
        await ctx.db
          .query("feedComments")
          .withIndex("by_targetKey", (q) => q.eq("targetKey", key))
          .collect(),
      ).toEqual([]);
      expect(
        await ctx.db
          .query("feedLikes")
          .withIndex("by_targetKey", (q) => q.eq("targetKey", key))
          .collect(),
      ).toEqual([]);
      expect(
        await ctx.db
          .query("feedBookmarks")
          .withIndex("by_targetKey_and_userId", (q) => q.eq("targetKey", key))
          .collect(),
      ).toEqual([]);
      // The kept review's votes are untouched.
      expect(
        await ctx.db
          .query("collegeReviewVotes")
          .withIndex("by_reviewId", (q) => q.eq("reviewId", keptReview))
          .collect(),
      ).toHaveLength(1);

      const stats = await ctx.db
        .query("collegeStats")
        .withIndex("by_college", (q) => q.eq("college", "Keble"))
        .unique();
      expect(stats).toMatchObject({
        reviewCount: 1,
        ratingSums: { food: 4, atmosphere: 4, value: 4, overall: 5 },
        attendanceCount: 4,
        completedFormalCount: 2,
      });
    });
  });
});

describe("settled credit holds", () => {
  test("involving a deleted user go 2 years after the formal; balances are untouched", async () => {
    const t = newTest();
    const gone = await makeUser(t, "Gone", NOW - 1 * MONTH);
    const host = await makeUser(t, "Host");
    const other = await makeUser(t, "Other");
    const listingId = await makeListing(t, host);
    const ids = await t.run(async (ctx) => {
      await ctx.db.insert("creditAccounts", { userId: host, balance: 3 });
      const requestId = await ctx.db.insert("requests", {
        fromUserId: gone,
        toUserId: host,
        targetListingId: listingId,
        message: "",
        status: "accepted",
      });
      const hold = (
        payerId: Id<"users">,
        status: "held" | "paid" | "refunded" | "disputed",
        releaseAt: number,
        resolvedAt?: number,
      ) =>
        ctx.db.insert("creditHolds", {
          requestId,
          listingId,
          payerId,
          hostId: host,
          seatHolderId: payerId,
          isGuest: false,
          status,
          releaseAt,
          ...(resolvedAt === undefined ? {} : { resolvedAt }),
        });
      return {
        oldPaid: await hold(gone, "paid", NOW - 25 * MONTH),
        oldRefunded: await hold(gone, "refunded", NOW - 25 * MONTH, NOW - 26 * MONTH),
        recentPaid: await hold(gone, "paid", NOW - 23 * MONTH),
        lateSettled: await hold(gone, "refunded", NOW - 25 * MONTH, NOW - 6 * MONTH),
        oldDisputed: await hold(gone, "disputed", NOW - 25 * MONTH),
        oldHeld: await hold(gone, "held", NOW - 25 * MONTH),
        noDeletedUser: await hold(other, "paid", NOW - 25 * MONTH),
      };
    });

    for (const status of ["paid", "refunded"] as const) {
      await t.mutation(internal.retention.purgeSettledCreditHolds, {
        now: NOW,
        status,
      });
    }

    await t.run(async (ctx) => {
      expect(await ctx.db.get(ids.oldPaid)).toBeNull();
      expect(await ctx.db.get(ids.oldRefunded)).toBeNull();
      for (const kept of [
        ids.recentPaid,
        ids.lateSettled,
        ids.oldDisputed,
        ids.oldHeld,
        ids.noDeletedUser,
      ]) {
        expect(await ctx.db.get(kept)).not.toBeNull();
      }
      const account = await ctx.db
        .query("creditAccounts")
        .withIndex("by_userId", (q) => q.eq("userId", host))
        .unique();
      expect(account?.balance).toBe(3);
    });
  });
});

describe("swap breaks", () => {
  test("go 12 months after they were recorded", async () => {
    const t = newTest();
    const a = await makeUser(t, "A");
    const b = await makeUser(t, "B");
    const listingId = await makeListing(t, a);
    const [old, recent] = await t.run(async (ctx) => {
      const requestId = await ctx.db.insert("requests", {
        fromUserId: a,
        toUserId: b,
        targetListingId: listingId,
        message: "",
        status: "accepted",
      });
      const row = (createdAt: number) =>
        ctx.db.insert("swapBreaks", {
          requestId,
          brokenByUserId: a,
          wrongedUserId: b,
          listingId,
          createdAt,
        });
      return [await row(NOW - 13 * MONTH), await row(NOW - 11 * MONTH)];
    });

    await t.mutation(internal.retention.purgeOldSwapBreaks, { now: NOW });

    await t.run(async (ctx) => {
      expect(await ctx.db.get(old)).toBeNull();
      expect(await ctx.db.get(recent)).not.toBeNull();
    });
  });
});
