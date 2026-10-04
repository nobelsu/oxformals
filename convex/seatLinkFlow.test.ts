/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { describe, expect, test, vi } from "vitest";
import { api, internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import schema from "./schema";

const modules = import.meta.glob("./**/*.*s");

const HOUR = 36e5;
const inDays = (n: number) => new Date(Date.now() + n * 864e5).toISOString();
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

/** Alice asks Wes's Worcester formal for herself + one new person who pays with their own credit. */
async function setup() {
  const t = convexTest(schema, modules);
  const alice = await makeUser(t, "Alice");
  const wes = await makeUser(t, "Wes", "Worcester");
  const worcester = await as(t, wes).mutation(api.listings.createListing, {
    dateTime: inDays(5),
    groupSize: 5,
    message: "",
    listingType: "both",
    price: 25,
  });
  const sent = await as(t, alice).mutation(api.listings.createRequest, {
    requestType: "credit",
    targetListingId: worcester,
    message: "",
    links: [{ paysOwn: true, method: "credit" }],
  });
  if (sent.autoAccepted) throw new Error("unexpected auto-accept");
  return { t, alice, wes, worcester, requestId: sent.requestId, token: sent.links[0] };
}

describe("seat links", () => {
  test("sending returns a token; the host can't accept until it's claimed", async () => {
    const s = await setup();
    expect(s.token).toMatch(/^[a-z2-9]{12}$/);
    // Alice's balance (1) covers only her own seat: the link seat is the new person's.
    await expect(
      as(s.t, s.wes).mutation(api.listings.acceptRequest, { requestId: s.requestId }),
    ).rejects.toThrow(/join/);
    expect(await s.t.query(api.seatLinks.getSeatLinkPreview, { token: s.token })).toMatchObject({
      state: "open",
      college: "Worcester",
      host: { name: "Wes" },
      from: { name: "Alice" },
    });
  });

  test("claim → friend seat → I'm in → the host can accept", async () => {
    const s = await setup();
    const neo = await makeUser(s.t, "Neo");
    expect(await as(s.t, neo).mutation(api.seatLinks.claimSeatLink, { token: s.token })).toEqual({
      requestId: s.requestId,
    });
    await s.t.run(async (ctx) => {
      const req = await ctx.db.get(s.requestId);
      expect(req?.party).toEqual([
        { kind: "friend", userId: neo, payerId: neo, method: "credit", response: "pending" },
      ]);
      const follows = (await ctx.db.query("follows").collect()).map((f) => [f.followerId, f.followeeId]);
      expect(follows).toEqual(expect.arrayContaining([[neo, s.alice], [s.alice, neo]]));
      expect(await ctx.db.query("referrals").collect()).toMatchObject([
        { inviterId: s.alice, inviteeId: neo, source: "seat", status: "pending" },
      ]);
      const toAlice = await ctx.db
        .query("notifications")
        .withIndex("by_userId_and_createdAt", (q) => q.eq("userId", s.alice))
        .collect();
      expect(toAlice.map((n) => n.kind)).toContain("seat_link_claimed");
    });
    expect(await as(s.t, neo).query(api.partyInvites.listMyPartyInvites, {})).toHaveLength(1);
    await expect(
      as(s.t, s.wes).mutation(api.listings.acceptRequest, { requestId: s.requestId }),
    ).rejects.toThrow(/Waiting for Neo/);
    await as(s.t, neo).mutation(api.partyInvites.respondToPartyInvite, {
      requestId: s.requestId,
      response: "in",
    });
    await as(s.t, s.wes).mutation(api.listings.acceptRequest, { requestId: s.requestId });
    const listing = await s.t.run((ctx) => ctx.db.get(s.worcester));
    expect(listing?.members).toEqual([s.wes, s.alice, neo]);
  });

  test("a claimed token can't be used again", async () => {
    const s = await setup();
    const neo = await makeUser(s.t, "Neo");
    const zed = await makeUser(s.t, "Zed");
    await as(s.t, neo).mutation(api.seatLinks.claimSeatLink, { token: s.token });
    await expect(
      as(s.t, zed).mutation(api.seatLinks.claimSeatLink, { token: s.token }),
    ).rejects.toThrow(/already been used/);
    expect((await s.t.query(api.seatLinks.getSeatLinkPreview, { token: s.token }))?.state).toBe("used");
  });

  test("an unclaimed link expires after 48h and drops out of the request", async () => {
    const s = await setup();
    vi.setSystemTime(Date.now() + 49 * HOUR);
    await s.t.mutation(internal.seatLinks.expireSeatLink, { requestId: s.requestId, token: s.token });
    expect((await s.t.query(api.seatLinks.getSeatLinkPreview, { token: s.token }))?.state).toBe("expired");
    const neo = await makeUser(s.t, "Neo");
    await expect(
      as(s.t, neo).mutation(api.seatLinks.claimSeatLink, { token: s.token }),
    ).rejects.toThrow(/expired/);
    await as(s.t, s.wes).mutation(api.listings.acceptRequest, { requestId: s.requestId });
    const listing = await s.t.run((ctx) => ctx.db.get(s.worcester));
    expect(listing?.members).toEqual([s.wes, s.alice]);
  });

  test("withdrawing kills the link", async () => {
    const s = await setup();
    await as(s.t, s.alice).mutation(api.listings.withdrawRequest, { requestId: s.requestId });
    expect(await s.t.query(api.seatLinks.getSeatLinkPreview, { token: s.token })).toBeNull();
    const neo = await makeUser(s.t, "Neo");
    await expect(
      as(s.t, neo).mutation(api.seatLinks.claimSeatLink, { token: s.token }),
    ).rejects.toThrow(/doesn't work/);
  });

  test("the requester can't claim their own link", async () => {
    const s = await setup();
    await expect(
      as(s.t, s.alice).mutation(api.seatLinks.claimSeatLink, { token: s.token }),
    ).rejects.toThrow(/your own link/);
  });

  test("a new person paying for themselves can only use a credit", async () => {
    const s = await setup();
    const other = await as(s.t, s.wes).mutation(api.listings.createListing, {
      dateTime: inDays(6),
      groupSize: 4,
      message: "",
      listingType: "both",
      price: 20,
    });
    await expect(
      as(s.t, s.alice).mutation(api.listings.createRequest, {
        requestType: "pay",
        targetListingId: other,
        message: "",
        links: [{ paysOwn: true, method: "pay" }],
      }),
    ).rejects.toThrow(/credit/);
  });

  test("deleting the requester's account removes their seat links", async () => {
    const s = await setup();
    await as(s.t, s.alice).mutation(api.accountDeletion.deleteMyAccount, {
      confirmEmail: "alice@ox.ac.uk",
    });
    await s.t.mutation(internal.accountDeletion.purgeUserContent, { userId: s.alice });
    await s.t.run(async (ctx) => {
      expect(await ctx.db.query("seatLinks").collect()).toHaveLength(0);
    });
    expect(await s.t.query(api.seatLinks.getSeatLinkPreview, { token: s.token })).toBeNull();
  });
});
