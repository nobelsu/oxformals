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

const makeUser = (t: T, name: string, college = "Keble") =>
  t.run((ctx) =>
    ctx.db.insert("users", {
      name,
      email: `${name.toLowerCase()}@ox.ac.uk`,
      emailVerificationTime: 1,
      agreedToRules: true,
      college,
      year: "2",
      role: "UG",
    }),
  );

const as = (t: T, id: Id<"users">) => t.withIdentity({ subject: `${id}|s` });
const balance = async (t: T, id: Id<"users">) =>
  (await as(t, id).query(api.credits.getMyCredits, {}))?.balance;
const referral = (t: T) => t.run(async (ctx) => (await ctx.db.query("referrals").collect())[0]);

/** Ivy invited Neo; Neo books Hal's Worcester formal with a credit and Hal accepts. */
async function setup() {
  const t = convexTest(schema, modules);
  const ivy = await makeUser(t, "Ivy");
  const neo = await makeUser(t, "Neo");
  const hal = await makeUser(t, "Hal", "Worcester");
  await t.run((ctx) =>
    ctx.db.insert("referrals", {
      inviterId: ivy,
      inviteeId: neo,
      source: "link",
      status: "pending",
      createdAt: Date.now(),
    }),
  );
  const listing = await as(t, hal).mutation(api.listings.createListing, {
    dateTime: inDays(3),
    groupSize: 4,
    message: "",
    listingType: "swap",
  });
  const { requestId } = await as(t, neo).mutation(api.listings.createRequest, {
    requestType: "credit",
    targetListingId: listing,
    message: "",
  });
  await as(t, hal).mutation(api.listings.acceptRequest, { requestId });
  return { t, ivy, neo, hal, listing };
}

describe("referral credits", () => {
  test("the inviter earns one credit when the invitee's first formal settles, once", async () => {
    const s = await setup();
    vi.setSystemTime(Date.now() + 4 * DAY + 36e5);
    await s.t.mutation(internal.credits.settleDueHolds, {});
    await s.t.mutation(internal.credits.settleDueHolds, {});
    expect(await balance(s.t, s.ivy)).toBe(2);
    expect((await referral(s.t)).status).toBe("earned");
    const toIvy = await s.t.run((ctx) =>
      ctx.db
        .query("notifications")
        .withIndex("by_userId_and_createdAt", (q) => q.eq("userId", s.ivy))
        .collect(),
    );
    expect(toIvy).toMatchObject([{ kind: "credit_earned", actorId: s.neo, data: { reason: "referral" } }]);
  });

  test("past five earned referrals, nothing more is paid", async () => {
    const s = await setup();
    await s.t.run(async (ctx) => {
      for (let i = 0; i < 5; i++) {
        const u = await ctx.db.insert("users", { name: `Old${i}` });
        await ctx.db.insert("referrals", {
          inviterId: s.ivy,
          inviteeId: u,
          source: "link",
          status: "earned",
          createdAt: 1,
        });
      }
    });
    vi.setSystemTime(Date.now() + 4 * DAY + 36e5);
    await s.t.mutation(internal.credits.settleDueHolds, {});
    expect(await balance(s.t, s.ivy)).toBe(1);
    const mine = await s.t.run((ctx) =>
      ctx.db
        .query("referrals")
        .withIndex("by_inviteeId", (q) => q.eq("inviteeId", s.neo))
        .first(),
    );
    expect(mine?.status).toBe("void");
  });

  test("a formal reported as not happening doesn't count", async () => {
    const s = await setup();
    vi.setSystemTime(Date.now() + 3 * DAY + 36e5); // after the formal, before payout
    await as(s.t, s.neo).mutation(api.credits.reportFormalDidntHappen, { listingId: s.listing });
    vi.setSystemTime(Date.now() + 2 * DAY);
    await s.t.mutation(internal.credits.settleDueHolds, {});
    expect((await referral(s.t)).status).toBe("pending");
    expect(await balance(s.t, s.ivy)).toBe(1);
  });

  test("confirming attendance at a formal without credits counts", async () => {
    const t = convexTest(schema, modules);
    const ivy = await makeUser(t, "Ivy");
    const neo = await makeUser(t, "Neo");
    const hal = await makeUser(t, "Hal", "Worcester");
    await t.run(async (ctx) => {
      await ctx.db.insert("referrals", {
        inviterId: ivy,
        inviteeId: neo,
        source: "seat",
        status: "pending",
        createdAt: Date.now(),
      });
    });
    const listing = await t.run((ctx) =>
      ctx.db.insert("listings", {
        ownerUserId: hal,
        college: "Worcester",
        dateTime: new Date(Date.now() - DAY).toISOString(),
        groupSize: 2,
        seatsAvailable: 0,
        members: [hal, neo],
        year: "2",
        role: "UG",
        message: "",
        status: "closed",
      }),
    );
    await as(t, neo).mutation(api.formalAttendance.confirmAttendance, {
      listingId: listing,
      nowMs: Date.now(),
    });
    expect((await referral(t)).status).toBe("earned");
    expect(await balance(t, ivy)).toBe(2);
  });
});
