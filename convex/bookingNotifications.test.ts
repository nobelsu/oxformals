/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";
import { api } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import schema from "./schema";

const modules = import.meta.glob("./**/*.*s");

const inDays = (n: number) => new Date(Date.now() + n * 864e5).toISOString();

type T = ReturnType<typeof convexTest<(typeof schema)["tables"]>>;

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

const notificationsFor = (t: T, userId: Id<"users">) =>
  t.run((ctx) =>
    ctx.db
      .query("notifications")
      .withIndex("by_userId_and_createdAt", (q) => q.eq("userId", userId))
      .collect(),
  );

async function setup() {
  const t = convexTest(schema, modules);
  const alice = await makeUser(t, "Alice", 3);
  const priya = await makeUser(t, "Priya", 1);
  const wes = await makeUser(t, "Wes");
  await as(t, alice).mutation(api.follows.follow, { userId: priya });
  await as(t, priya).mutation(api.follows.follow, { userId: alice });
  const worcester = await as(t, wes).mutation(api.listings.createListing, {
    dateTime: inDays(3),
    groupSize: 5,
    message: "",
    listingType: "both",
    price: 25,
  });
  // Follows above create social notifications; start each test from a clean bell.
  await t.run(async (ctx) => {
    for (const n of await ctx.db.query("notifications").collect()) await ctx.db.delete(n._id);
  });
  return { t, alice, priya, wes, worcester };
}

describe("booking notifications", () => {
  test("a group request notifies the host and each named friend", async () => {
    const s = await setup();
    const { requestId } = await as(s.t, s.alice).mutation(api.listings.createRequest, {
      requestType: "credit",
      targetListingId: s.worcester,
      message: "",
      friends: [{ userId: s.priya, paysOwn: true, method: "credit" }],
      guests: 1,
      guestMethods: ["credit"],
    });
    expect(await notificationsFor(s.t, s.wes)).toMatchObject([
      {
        kind: "request_received",
        actorId: s.alice,
        requestId,
        listingId: s.worcester,
        data: { college: "Keble", count: 3 },
      },
    ]);
    expect(await notificationsFor(s.t, s.priya)).toMatchObject([
      { kind: "party_invite", actorId: s.alice, requestId, data: { paysOwn: true, method: "credit" } },
    ]);
    expect(await notificationsFor(s.t, s.alice)).toEqual([]);
  });

  test("accepting and declining tell the requester", async () => {
    const s = await setup();
    const a = await as(s.t, s.alice).mutation(api.listings.createRequest, {
      requestType: "credit",
      targetListingId: s.worcester,
      message: "",
    });
    await as(s.t, s.wes).mutation(api.listings.acceptRequest, { requestId: a.requestId });
    const b = await as(s.t, s.priya).mutation(api.listings.createRequest, {
      requestType: "credit",
      targetListingId: s.worcester,
      message: "",
    });
    await as(s.t, s.wes).mutation(api.listings.declineRequest, { requestId: b.requestId });
    expect((await notificationsFor(s.t, s.alice)).map((n) => n.kind)).toEqual(["request_accepted"]);
    expect((await notificationsFor(s.t, s.priya)).map((n) => n.kind)).toEqual(["request_declined"]);
  });

  test("a friend's answer reaches the requester", async () => {
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
    expect(await notificationsFor(s.t, s.alice)).toMatchObject([
      { kind: "party_response", actorId: s.priya, data: { response: "out", college: "Keble" } },
    ]);
  });

  test("cancelling a formal tells every guest", async () => {
    const s = await setup();
    const { requestId } = await as(s.t, s.alice).mutation(api.listings.createRequest, {
      requestType: "credit",
      targetListingId: s.worcester,
      message: "",
    });
    await as(s.t, s.wes).mutation(api.listings.acceptRequest, { requestId });
    await as(s.t, s.wes).mutation(api.listings.deleteListing, { listingId: s.worcester });
    const kinds = (await notificationsFor(s.t, s.alice)).map((n) => n.kind);
    expect(kinds).toEqual(["request_accepted", "formal_cancelled"]);
  });
});
