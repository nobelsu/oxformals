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
    const list = await t.query(api.users.listPublic, {});
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
      const scheduled = await ctx.db.system
        .query("_scheduled_functions")
        .collect();
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
  expect(
    buildAccountDeletionNoticeText({
      kind: "hostLeft",
      formalLabel: "Worcester · Sat 12 Oct · 7pm",
    }),
  ).toContain(
    "The host of your Worcester · Sat 12 Oct · 7pm formal has left Oxformals, so the formal is cancelled.",
  );
  expect(
    buildAccountDeletionNoticeText({
      kind: "guestLeft",
      formalLabel: "Keble · Sun 3 Nov · 7pm",
    }),
  ).toContain(
    "A guest has left your Keble · Sun 3 Nov · 7pm formal, so a seat is free again.",
  );
});
