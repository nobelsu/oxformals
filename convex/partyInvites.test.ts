/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { api } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import schema from "./schema";

const modules = import.meta.glob("./**/*.*s");

const inDays = (n: number) => new Date(Date.now() + n * 864e5).toISOString();

beforeEach(() => {
  vi.useFakeTimers();
});

type T = ReturnType<typeof convexTest>;

async function makeUser(t: T, name: string, credits?: number) {
  return await t.run(async (ctx) => {
    const id = await ctx.db.insert("users", {
      name,
      email: `${name.toLowerCase()}@ox.ac.uk`,
      emailVerificationTime: 1,
      agreedToRules: true,
      college: "Keble",
      year: "2",
      role: "UG",
    });
    if (credits !== undefined) {
      await ctx.db.insert("creditAccounts", { userId: id, balance: credits });
    }
    return id;
  });
}

const as = (t: T, id: Id<"users">) => t.withIdentity({ subject: `${id}|s` });

async function befriend(t: T, a: Id<"users">, b: Id<"users">) {
  await as(t, a).mutation(api.follows.follow, { userId: b });
  await as(t, b).mutation(api.follows.follow, { userId: a });
}

async function setup() {
  const t = convexTest(schema, modules);
  const alice = await makeUser(t, "Alice", 2);
  const priya = await makeUser(t, "Priya", 1);
  const wes = await makeUser(t, "Wes");
  await befriend(t, alice, priya);
  const worcester = await as(t, wes).mutation(api.listings.createListing, {
    dateTime: inDays(3),
    groupSize: 5,
    message: "",
    listingType: "both",
    price: 25,
  });
  return { t, alice, priya, wes, worcester };
}

describe("named friends", () => {
  test("only mutual follows can be named", async () => {
    const s = await setup();
    const stranger = await makeUser(s.t, "Sam");
    await as(s.t, s.alice).mutation(api.follows.follow, { userId: stranger });
    await expect(
      as(s.t, s.alice).mutation(api.listings.createRequest, {
        requestType: "credit",
        targetListingId: s.worcester,
        message: "",
        friends: [{ userId: stranger, paysOwn: false, method: "credit" }],
      }),
    ).rejects.toThrow(/follow you back/);
  });

  test("a friend paying their own credit must say I'm in before the host can accept", async () => {
    const s = await setup();
    const { requestId } = await as(s.t, s.alice).mutation(api.listings.createRequest, {
      requestType: "credit",
      targetListingId: s.worcester,
      message: "",
      friends: [{ userId: s.priya, paysOwn: true, method: "credit" }],
    });
    const invites = await as(s.t, s.priya).query(api.partyInvites.listMyPartyInvites, {});
    expect(invites).toMatchObject([{ requestId, seats: 2, paysOwn: true, method: "credit" }]);

    await expect(
      as(s.t, s.wes).mutation(api.listings.acceptRequest, { requestId }),
    ).rejects.toThrow(/Waiting for Priya/);

    await as(s.t, s.priya).mutation(api.partyInvites.respondToPartyInvite, {
      requestId,
      response: "in",
    });
    await as(s.t, s.wes).mutation(api.listings.acceptRequest, { requestId });

    await s.t.run(async (ctx) => {
      expect((await ctx.db.get(s.worcester))?.members).toEqual([s.wes, s.alice, s.priya]);
    });
    expect((await as(s.t, s.alice).query(api.credits.getMyCredits, {}))?.balance).toBe(1);
    expect((await as(s.t, s.priya).query(api.credits.getMyCredits, {}))?.balance).toBe(0);
  });

  test("'Not me' drops the seat; a covered friend doesn't block accepting", async () => {
    const s = await setup();
    const ben = await makeUser(s.t, "Ben");
    await befriend(s.t, s.alice, ben);
    const { requestId } = await as(s.t, s.alice).mutation(api.listings.createRequest, {
      requestType: "pay",
      targetListingId: s.worcester,
      message: "",
      friends: [
        { userId: s.priya, paysOwn: false, method: "pay" },
        { userId: ben, paysOwn: false, method: "credit" },
      ],
      guests: 1,
      guestMethods: ["pay"],
    });
    await as(s.t, s.priya).mutation(api.partyInvites.respondToPartyInvite, {
      requestId,
      response: "out",
    });
    await as(s.t, s.wes).mutation(api.listings.acceptRequest, { requestId });
    const l = await s.t.run((ctx) => ctx.db.get(s.worcester));
    expect(l?.members).toEqual([s.wes, s.alice, ben]);
    expect(l?.guestSeats).toEqual([{ userId: s.alice, count: 1 }]);
    expect(l?.seatsAvailable).toBe(1);
    // Alice covered Ben's credit.
    expect((await as(s.t, s.alice).query(api.credits.getMyCredits, {}))?.balance).toBe(1);
  });

  test("'Not me' is final", async () => {
    const s = await setup();
    const { requestId } = await as(s.t, s.alice).mutation(api.listings.createRequest, {
      requestType: "pay",
      targetListingId: s.worcester,
      message: "",
      friends: [{ userId: s.priya, paysOwn: false, method: "pay" }],
    });
    await as(s.t, s.priya).mutation(api.partyInvites.respondToPartyInvite, {
      requestId,
      response: "out",
    });
    await expect(
      as(s.t, s.priya).mutation(api.partyInvites.respondToPartyInvite, {
        requestId,
        response: "in",
      }),
    ).rejects.toThrow(/already said/);
    await as(s.t, s.wes).mutation(api.listings.acceptRequest, { requestId });
    const l = await s.t.run((ctx) => ctx.db.get(s.worcester));
    expect(l?.members).toEqual([s.wes, s.alice]);
  });

  test("withdrawing clears the invites", async () => {
    const s = await setup();
    const { requestId } = await as(s.t, s.alice).mutation(api.listings.createRequest, {
      requestType: "credit",
      targetListingId: s.worcester,
      message: "",
      friends: [{ userId: s.priya, paysOwn: false, method: "credit" }],
    });
    await as(s.t, s.alice).mutation(api.listings.withdrawRequest, { requestId });
    expect(await as(s.t, s.priya).query(api.partyInvites.listMyPartyInvites, {})).toEqual([]);
  });
});
