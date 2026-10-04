/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { describe, expect, test, vi } from "vitest";
import { api } from "./_generated/api";
import { buildAccountDeletionNoticeText } from "./emails";
import schema from "./schema";

const modules = import.meta.glob("./**/*.*s");

describe("deleted users are hidden", () => {
  test("listPublic and getPublicProfile skip a deleted user", async () => {
    const t = convexTest(schema, modules);
    const ids = await t.run(async (ctx) => {
      const live = await ctx.db.insert("users", {
        name: "Live",
        email: "live@ox.ac.uk",
      });
      const gone = await ctx.db.insert("users", {
        name: "Deleted user",
        deletedAt: 1,
      });
      return { live, gone };
    });
    const list = await t
      .withIdentity({ subject: `${ids.live}|session` })
      .query(api.users.listPublic, {});
    expect(list.map((u) => u._id)).toEqual([ids.live]);
    expect(
      await t.query(api.users.getPublicProfile, { userId: ids.gone }),
    ).toBeNull();
  });
});

const FUTURE = new Date(Date.now() + 7 * 864e5).toISOString();
const PAST = new Date(Date.now() - 7 * 864e5).toISOString();

async function seed(t: ReturnType<typeof convexTest>) {
  return await t.run(async (ctx) => {
    const me = await ctx.db.insert("users", {
      name: "Me",
      email: "me@ox.ac.uk",
      college: "Keble",
      dietaryRequirements: "vegan",
      agreedToRules: true,
    });
    const guest = await ctx.db.insert("users", {
      name: "Guest",
      email: "guest@ox.ac.uk",
    });
    const host = await ctx.db.insert("users", {
      name: "Host",
      email: "host@ox.ac.uk",
    });
    const base = { groupSize: 2 as const, year: "2", role: "UG", message: "" };
    const hosted = await ctx.db.insert("listings", {
      ...base,
      ownerUserId: me,
      college: "Worcester",
      dateTime: FUTURE,
      seatsAvailable: 0,
      members: [me, guest],
      status: "closed",
    });
    const pastHosted = await ctx.db.insert("listings", {
      ...base,
      ownerUserId: me,
      college: "Exeter",
      dateTime: PAST,
      seatsAvailable: 0,
      members: [me, guest],
      status: "expired",
    });
    const joined = await ctx.db.insert("listings", {
      ...base,
      ownerUserId: host,
      college: "Magdalen",
      dateTime: FUTURE,
      seatsAvailable: 0,
      members: [host, me],
      status: "closed",
    });
    await ctx.db.insert("requests", {
      fromUserId: me,
      toUserId: host,
      targetListingId: joined,
      message: "",
      status: "accepted",
    });
    const pending = await ctx.db.insert("requests", {
      fromUserId: guest,
      toUserId: me,
      targetListingId: hosted,
      message: "",
      status: "pending",
    });
    await ctx.db.insert("collegeWishlists", { userId: me, college: "Keble" });
    await ctx.db.insert("feedLikes", { userId: me, targetKey: "review:x" });
    await ctx.db.insert("feedBookmarks", { userId: me, targetKey: "review:x" });
    await ctx.db.insert("pushTokens", {
      userId: me,
      token: "t",
      platform: "ios",
      updatedAt: 1,
    });
    await ctx.db.insert("userBadges", {
      userId: me,
      badgeId: "first",
      earnedAt: 1,
    });
    await ctx.db.insert("authAccounts", {
      userId: me,
      provider: "password",
      providerAccountId: "me@ox.ac.uk",
    });
    const session = await ctx.db.insert("authSessions", {
      userId: me,
      expirationTime: Date.now() + 1e6,
    });
    await ctx.db.insert("authRefreshTokens", {
      sessionId: session,
      expirationTime: Date.now() + 1e6,
    });
    return { me, guest, host, hosted, pastHosted, joined, pending };
  });
}

describe("deleteMyAccount", () => {
  test("impact lists hosted and joined upcoming formals", async () => {
    const t = convexTest(schema, modules);
    const s = await seed(t);
    const impact = await t
      .withIdentity({ subject: `${s.me}|session` })
      .query(api.accountDeletion.getDeletionImpact, {});
    expect(impact).toMatchObject({
      email: "me@ox.ac.uk",
      hosting: [{ listingId: s.hosted, college: "Worcester", guestCount: 1 }],
      joined: [{ listingId: s.joined, college: "Magdalen" }],
      pendingRequests: 1,
    });
  });

  test("rejects a wrong confirmation email", async () => {
    const t = convexTest(schema, modules);
    const s = await seed(t);
    await expect(
      t
        .withIdentity({ subject: `${s.me}|session` })
        .mutation(api.accountDeletion.deleteMyAccount, {
          confirmEmail: "nope@ox.ac.uk",
        }),
    ).rejects.toThrow("doesn't match");
  });

  test("deletes personal data, tidies formals, keeps a placeholder", async () => {
    vi.useFakeTimers();
    const t = convexTest(schema, modules);
    const s = await seed(t);
    await t
      .withIdentity({ subject: `${s.me}|session` })
      .mutation(api.accountDeletion.deleteMyAccount, {
        confirmEmail: " ME@ox.ac.uk ",
      });

    await t.run(async (ctx) => {
      const me = await ctx.db.get(s.me);
      expect(me).toMatchObject({ name: "Deleted user" });
      expect(me?.deletedAt).toBeTypeOf("number");
      expect(me?.email).toBeUndefined();
      expect(me?.dietaryRequirements).toBeUndefined();

      expect(await ctx.db.get(s.hosted)).toBeNull();
      expect(await ctx.db.get(s.pastHosted)).not.toBeNull();
      const joined = await ctx.db.get(s.joined);
      expect(joined?.members).toEqual([s.host]);
      expect(joined?.seatsAvailable).toBe(1);
      expect((await ctx.db.get(s.pending))?.status).toBe("declined");

      for (const table of [
        "collegeWishlists",
        "feedLikes",
        "feedBookmarks",
        "pushTokens",
        "userBadges",
        "authAccounts",
        "authSessions",
        "authRefreshTokens",
      ] as const) {
        expect(await ctx.db.query(table).collect()).toHaveLength(0);
      }
      const scheduled = (
        await ctx.db.system.query("_scheduled_functions").collect()
      ).filter((f) => f.name.includes("sendAccountDeletionNotices"));
      expect(scheduled).toHaveLength(1);
      expect(scheduled[0].args[0]).toEqual({
        notices: expect.arrayContaining([
          {
            kind: "hostLeft",
            toEmail: "guest@ox.ac.uk",
            college: "Worcester",
            dateTime: FUTURE,
          },
          {
            kind: "guestLeft",
            toEmail: "host@ox.ac.uk",
            college: "Magdalen",
            dateTime: FUTURE,
          },
        ]),
      });
    });
    vi.useRealTimers();
  });

  test("an unauthenticated caller cannot delete anything", async () => {
    const t = convexTest(schema, modules);
    await seed(t);
    await expect(
      t.mutation(api.accountDeletion.deleteMyAccount, {
        confirmEmail: "me@ox.ac.uk",
      }),
    ).rejects.toThrow("Not authenticated");
  });
});

test("notice copy", () => {
  const host = buildAccountDeletionNoticeText({
    kind: "hostLeft",
    college: "Worcester",
    when: "Sat 12 Oct · 7pm",
  });
  expect(host).toContain("Your formal was cancelled");
  expect(host).toContain("The host left Oxformals, so this formal is off.");
  expect(host).toContain("Worcester · Sat 12 Oct · 7pm");
  const guest = buildAccountDeletionNoticeText({
    kind: "guestLeft",
    college: "Keble",
    when: "Sun 3 Nov · 7pm",
  });
  expect(guest).toContain("A guest left Oxformals, so their seat is open again.");
  expect(guest).toContain("Keble · Sun 3 Nov · 7pm");
});

describe("deleteMyAccount purges user content", () => {
  async function seedContent(t: ReturnType<typeof convexTest>) {
    return await t.run(async (ctx) => {
      const me = await ctx.db.insert("users", {
        name: "Me",
        email: "me@ox.ac.uk",
        bio: "I like formals",
      });
      const other = await ctx.db.insert("users", {
        name: "Other",
        email: "other@ox.ac.uk",
        bio: "Other bio",
      });
      await ctx.db.insert("authAccounts", {
        userId: me,
        provider: "resend-otp",
        providerAccountId: "me@ox.ac.uk",
      });
      const base = { groupSize: 2 as const, year: "2", role: "UG", message: "" };
      const past = await ctx.db.insert("listings", {
        ...base,
        ownerUserId: other,
        college: "Exeter",
        dateTime: PAST,
        seatsAvailable: 0,
        members: [other, me],
        status: "expired",
      });
      const request = await ctx.db.insert("requests", {
        fromUserId: me,
        toUserId: other,
        targetListingId: past,
        message: "Hi, I'm Me from Keble",
        status: "accepted",
      });

      const photo = await ctx.storage.store(new Blob(["photo"]));
      const menu = await ctx.storage.store(new Blob(["menu"]));
      for (const storageId of [photo, menu]) {
        await ctx.db.insert("uploadedFiles", {
          storageId,
          ownerUserId: me,
          createdAt: 1,
        });
      }
      const myReview = await ctx.db.insert("collegeReviews", {
        userId: me,
        listingId: past,
        college: "Exeter",
        ratings: { food: 4, atmosphere: 4, value: 4, overall: 4 },
        comment: "Lovely",
        imageIds: [photo],
        isAnonymous: false,
        updatedAt: 1,
      });
      const theirReview = await ctx.db.insert("collegeReviews", {
        userId: other,
        listingId: past,
        college: "Exeter",
        ratings: { food: 3, atmosphere: 3, value: 3, overall: 3 },
        isAnonymous: false,
        updatedAt: 1,
        voteScore: 1,
      });
      await ctx.db.insert("collegeReviewVotes", {
        reviewId: theirReview,
        userId: me,
        value: 1,
        updatedAt: 1,
      });
      await ctx.db.insert("collegeReviewReports", {
        reviewId: theirReview,
        reporterUserId: me,
        reason: "spam",
        createdAt: 1,
      });
      await ctx.db.insert("formalAttendanceConfirmations", {
        listingId: past,
        userId: me,
        confirmedAt: 1,
        attended: false,
        reasonPreset: "other",
        reasonOther: "I was ill with flu",
      });
      await ctx.db.insert("feedComments", {
        targetKey: "review:x",
        userId: me,
        text: "Mine",
      });
      await ctx.db.insert("feedComments", {
        targetKey: "review:x",
        userId: other,
        text: "Theirs",
      });
      await ctx.db.insert("bioReports", {
        reportedUserId: me,
        reporterUserId: other,
        bioText: "I like formals",
      });
      await ctx.db.insert("bioReports", {
        reportedUserId: other,
        reporterUserId: me,
        bioText: "Other bio",
      });
      await ctx.db.insert("collegeTips", {
        college: "Keble",
        userId: me,
        text: "Sit near the window",
        createdAt: 1,
      });
      const guide = await ctx.db.insert("collegeGuides", {
        college: "Keble",
        formalNights: ["Friday"],
        updatedBy: me,
        updatedAt: 1,
      });
      await ctx.db.insert("partyInvites", { requestId: request, userId: me });
      await ctx.db.insert("creditAccounts", { userId: me, balance: 3 });
      const hold = await ctx.db.insert("creditHolds", {
        requestId: request,
        listingId: past,
        payerId: me,
        hostId: other,
        seatHolderId: me,
        isGuest: false,
        status: "paid",
        releaseAt: 1,
      });
      await ctx.db.insert("authRateLimits", {
        identifier: "me@ox.ac.uk",
        lastAttemptTime: 1,
        attemptsLeft: 5,
      });
      const conversation = await ctx.db.insert("conversations", {
        kind: "dm",
        lastMessageAt: 1,
      });
      const message = await ctx.db.insert("messages", {
        conversationId: conversation,
        senderUserId: me,
        body: "See you there",
      });
      const swapBreak = await ctx.db.insert("swapBreaks", {
        requestId: request,
        brokenByUserId: me,
        wrongedUserId: other,
        listingId: past,
        createdAt: 1,
      });
      return {
        me,
        other,
        request,
        photo,
        menu,
        myReview,
        theirReview,
        guide,
        hold,
        message,
        swapBreak,
      };
    });
  }

  test("removes or blanks every personal row, keeps documented records", async () => {
    vi.useFakeTimers();
    const t = convexTest(schema, modules);
    const s = await seedContent(t);
    await t
      .withIdentity({ subject: `${s.me}|session` })
      .mutation(api.accountDeletion.deleteMyAccount, {
        confirmEmail: "me@ox.ac.uk",
      });
    await t.finishAllScheduledFunctions(vi.runAllTimers);

    await t.run(async (ctx) => {
      const all = async <T extends Parameters<typeof ctx.db.query>[0]>(
        table: T,
      ) => await ctx.db.query(table).collect();

      // Deleted outright.
      expect((await all("feedComments")).map((c) => c.userId)).toEqual([
        s.other,
      ]);
      expect(await all("bioReports")).toHaveLength(0);
      expect(await all("collegeTips")).toHaveLength(0);
      expect(await all("collegeReviewVotes")).toHaveLength(0);
      expect(await all("collegeReviewReports")).toHaveLength(0);
      expect(await all("partyInvites")).toHaveLength(0);
      expect(await all("creditAccounts")).toHaveLength(0);
      expect(await all("authRateLimits")).toHaveLength(0);
      expect(await all("uploadedFiles")).toHaveLength(0);
      expect(await ctx.db.system.get("_storage", s.photo)).toBeNull();
      expect(await ctx.db.system.get("_storage", s.menu)).toBeNull();

      // Kept but scrubbed.
      const myReview = await ctx.db.get(s.myReview);
      expect(myReview?.comment).toBe("Lovely");
      expect(myReview?.imageIds).toBeUndefined();
      expect((await ctx.db.get(s.theirReview))?.voteScore).toBe(0);
      const [attendance] = await all("formalAttendanceConfirmations");
      expect(attendance.reasonOther).toBeUndefined();
      expect(attendance.reasonPreset).toBe("other");
      expect((await ctx.db.get(s.request))?.message).toBe("");
      expect((await ctx.db.get(s.guide))?.updatedBy).toBeUndefined();

      // Documented retention.
      expect(await ctx.db.get(s.hold)).not.toBeNull();
      expect(await ctx.db.get(s.message)).not.toBeNull();
      expect(await ctx.db.get(s.swapBreak)).not.toBeNull();
    });
    vi.useRealTimers();
  });

  test("the review of a deleted user reads as Deleted user", async () => {
    vi.useFakeTimers();
    const t = convexTest(schema, modules);
    const s = await seedContent(t);
    await t
      .withIdentity({ subject: `${s.me}|session` })
      .mutation(api.accountDeletion.deleteMyAccount, {
        confirmEmail: "me@ox.ac.uk",
      });
    await t.finishAllScheduledFunctions(vi.runAllTimers);
    const card = await t.query(api.share.getReviewShareCard, {
      reviewId: s.myReview,
    });
    expect(card).toMatchObject({
      authorFirstName: "Deleted user",
      photoUrl: null,
    });
    vi.useRealTimers();
  });

  test("large volumes are purged across several batches", async () => {
    vi.useFakeTimers();
    const t = convexTest(schema, modules);
    const me = await t.run(async (ctx) => {
      const me = await ctx.db.insert("users", {
        name: "Me",
        email: "me@ox.ac.uk",
      });
      for (let i = 0; i < 450; i++) {
        await ctx.db.insert("feedComments", {
          targetKey: `review:${i}`,
          userId: me,
          text: `c${i}`,
        });
      }
      return me;
    });
    await t
      .withIdentity({ subject: `${me}|session` })
      .mutation(api.accountDeletion.deleteMyAccount, {
        confirmEmail: "me@ox.ac.uk",
      });
    await t.finishAllScheduledFunctions(vi.runAllTimers);
    await t.run(async (ctx) => {
      expect(await ctx.db.query("feedComments").collect()).toHaveLength(0);
    });
    vi.useRealTimers();
  });
});
