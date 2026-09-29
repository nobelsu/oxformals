/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { describe, expect, test, vi } from "vitest";
import { api, internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import schema from "./schema";

const modules = import.meta.glob("./**/*.*s");

const DAY = 864e5;
type T = ReturnType<typeof convexTest<(typeof schema)["tables"]>>;

const makeUser = (t: T, name: string, isPrivate = false) =>
  t.run((ctx) =>
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

const as = (t: T, id: Id<"users">) => t.withIdentity({ subject: `${id}|s` });

const follows = (t: T) =>
  t.run(async (ctx) =>
    (await ctx.db.query("follows").collect()).map((f) => [f.followerId, f.followeeId, f.status]),
  );

describe("invite links", () => {
  test("a code is made once and shows who invited you", async () => {
    const t = convexTest(schema, modules);
    const ann = await makeUser(t, "Ann Lee");
    const code = await as(t, ann).mutation(api.invites.getOrCreateMyInviteCode, {});
    expect(code).toMatch(/^[abcdefghjkmnpqrstuvwxyz23456789]{6}$/);
    expect(await as(t, ann).mutation(api.invites.getOrCreateMyInviteCode, {})).toBe(code);
    expect(await t.query(api.invites.getInvitePreview, { code })).toMatchObject({
      inviter: { _id: ann, name: "Ann Lee" },
    });
    expect(await t.query(api.invites.getInvitePreview, { code: "zzzzzz" })).toBeNull();
  });

  test("a new account becomes friends (even with a private inviter) and is a pending referral", async () => {
    const t = convexTest(schema, modules);
    const ann = await makeUser(t, "Ann", true);
    const code = await as(t, ann).mutation(api.invites.getOrCreateMyInviteCode, {});
    const openedAt = Date.now();
    vi.setSystemTime(openedAt + 60_000);
    const ben = await makeUser(t, "Ben");
    expect(await as(t, ben).mutation(api.invites.claimInvite, { code, openedAt })).toBe("joined");
    expect(await follows(t)).toEqual(
      expect.arrayContaining([
        [ben, ann, "active"],
        [ann, ben, "active"],
      ]),
    );
    await t.run(async (ctx) => {
      expect(await ctx.db.query("referrals").collect()).toMatchObject([
        { inviterId: ann, inviteeId: ben, source: "link", status: "pending" },
      ]);
      const toAnn = await ctx.db
        .query("notifications")
        .withIndex("by_userId_and_createdAt", (q) => q.eq("userId", ann))
        .collect();
      expect(toAnn.map((n) => n.kind)).toEqual(["invite_joined"]);
    });
  });

  test("an existing account just becomes friends; a pending follow is upgraded", async () => {
    const t = convexTest(schema, modules);
    const ben = await makeUser(t, "Ben");
    const ann = await makeUser(t, "Ann", true);
    await as(t, ben).mutation(api.follows.follow, { userId: ann }); // pending
    vi.setSystemTime(Date.now() + 40 * DAY);
    const code = await as(t, ann).mutation(api.invites.getOrCreateMyInviteCode, {});
    expect(
      await as(t, ben).mutation(api.invites.claimInvite, { code, openedAt: Date.now() }),
    ).toBe("friends");
    expect(await follows(t)).toEqual(
      expect.arrayContaining([
        [ben, ann, "active"],
        [ann, ben, "active"],
      ]),
    );
    await t.run(async (ctx) => {
      expect(await ctx.db.query("referrals").collect()).toHaveLength(0);
    });
  });

  test("your own code and unknown codes do nothing", async () => {
    const t = convexTest(schema, modules);
    const ann = await makeUser(t, "Ann");
    const code = await as(t, ann).mutation(api.invites.getOrCreateMyInviteCode, {});
    expect(await as(t, ann).mutation(api.invites.claimInvite, { code, openedAt: Date.now() })).toBe("own");
    expect(
      await as(t, ann).mutation(api.invites.claimInvite, { code: "nope22", openedAt: Date.now() }),
    ).toBe("invalid");
    expect(await follows(t)).toEqual([]);
  });

  test("only the first inviter gets the referral", async () => {
    const t = convexTest(schema, modules);
    const ann = await makeUser(t, "Ann");
    const cat = await makeUser(t, "Cat");
    const annCode = await as(t, ann).mutation(api.invites.getOrCreateMyInviteCode, {});
    const catCode = await as(t, cat).mutation(api.invites.getOrCreateMyInviteCode, {});
    const openedAt = Date.now();
    vi.setSystemTime(openedAt + 1000);
    const ben = await makeUser(t, "Ben");
    expect(await as(t, ben).mutation(api.invites.claimInvite, { code: annCode, openedAt })).toBe("joined");
    expect(await as(t, ben).mutation(api.invites.claimInvite, { code: catCode, openedAt })).toBe("friends");
    await t.run(async (ctx) => {
      expect(await ctx.db.query("referrals").collect()).toMatchObject([{ inviterId: ann }]);
    });
  });

  test("deleting an account removes its code and voids its referrals", async () => {
    const t = convexTest(schema, modules);
    const ann = await makeUser(t, "Ann");
    const code = await as(t, ann).mutation(api.invites.getOrCreateMyInviteCode, {});
    const openedAt = Date.now();
    vi.setSystemTime(openedAt + 1000);
    const ben = await makeUser(t, "Ben");
    await as(t, ben).mutation(api.invites.claimInvite, { code, openedAt });
    await as(t, ann).mutation(api.accountDeletion.deleteMyAccount, { confirmEmail: "ann@ox.ac.uk" });
    await t.mutation(internal.accountDeletion.purgeUserContent, { userId: ann });
    await t.run(async (ctx) => {
      expect(await ctx.db.query("inviteCodes").collect()).toHaveLength(0);
      expect(await ctx.db.query("referrals").collect()).toMatchObject([{ status: "void" }]);
    });
    expect(await t.query(api.invites.getInvitePreview, { code })).toBeNull();
  });
});
