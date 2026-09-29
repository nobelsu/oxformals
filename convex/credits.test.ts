/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { api, internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import schema from "./schema";

const modules = import.meta.glob("./**/*.*s");

const DAY = 864e5;
const inDays = (n: number) => new Date(Date.now() + n * DAY).toISOString();

beforeEach(() => {
  vi.useFakeTimers();
});

type T = ReturnType<typeof convexTest>;

async function makeUser(t: T, name: string, college: string) {
  return await t.run((ctx) =>
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
}

const as = (t: T, id: Id<"users">) => t.withIdentity({ subject: `${id}|s` });

async function setup() {
  const t = convexTest(schema, modules);
  const guest = await makeUser(t, "Gia", "Keble");
  const host = await makeUser(t, "Hal", "Worcester");
  const listing = await as(t, host).mutation(api.listings.createListing, {
    dateTime: inDays(3),
    groupSize: 4,
    message: "",
    listingType: "swap",
  });
  return { t, guest, host, listing };
}

async function requestWithCredit(t: T, from: Id<"users">, listing: Id<"listings">) {
  const { requestId } = await as(t, from).mutation(api.listings.createRequest, {
    requestType: "credit",
    targetListingId: listing,
    message: "",
  });
  return requestId;
}

const credits = (t: T, id: Id<"users">) =>
  as(t, id).query(api.credits.getMyCredits, {});

describe("seat credits", () => {
  test("everyone starts with one credit", async () => {
    const s = await setup();
    expect(await credits(s.t, s.guest)).toEqual({ balance: 1, spending: 0, earning: 0 });
  });

  test("any listing takes a credit; accepting holds it", async () => {
    const s = await setup();
    const requestId = await requestWithCredit(s.t, s.guest, s.listing);
    await as(s.t, s.host).mutation(api.listings.acceptRequest, { requestId });
    expect(await credits(s.t, s.guest)).toEqual({ balance: 0, spending: 1, earning: 0 });
    expect(await credits(s.t, s.host)).toEqual({ balance: 1, spending: 0, earning: 1 });
    await s.t.run(async (ctx) => {
      expect((await ctx.db.get(s.listing))?.members).toEqual([s.host, s.guest]);
    });
  });

  test("the host is paid 24 hours after the formal", async () => {
    const s = await setup();
    const requestId = await requestWithCredit(s.t, s.guest, s.listing);
    await as(s.t, s.host).mutation(api.listings.acceptRequest, { requestId });

    vi.setSystemTime(Date.now() + 3 * DAY + 12 * 36e5); // 12h after
    await s.t.mutation(internal.credits.settleDueHolds, {});
    expect((await credits(s.t, s.host))?.balance).toBe(1);

    vi.setSystemTime(Date.now() + 13 * 36e5); // 25h after
    await s.t.mutation(internal.credits.settleDueHolds, {});
    expect(await credits(s.t, s.host)).toEqual({ balance: 2, spending: 0, earning: 0 });
  });

  test("no credits, no credit request", async () => {
    const s = await setup();
    const other = await as(s.t, s.host).mutation(api.listings.createListing, {
      dateTime: inDays(4),
      groupSize: 2,
      message: "",
      listingType: "pay",
      price: 10,
    });
    const first = await requestWithCredit(s.t, s.guest, s.listing);
    await as(s.t, s.host).mutation(api.listings.acceptRequest, { requestId: first });
    await expect(requestWithCredit(s.t, s.guest, other)).rejects.toThrow(/don't have any credits/);
  });

  test("accepting fails if the guest has spent their credit elsewhere", async () => {
    const s = await setup();
    const host2 = await makeUser(s.t, "Ivy", "Magdalen");
    const other = await as(s.t, host2).mutation(api.listings.createListing, {
      dateTime: inDays(4),
      groupSize: 2,
      message: "",
      listingType: "swap",
    });
    const a = await requestWithCredit(s.t, s.guest, s.listing);
    const b = await requestWithCredit(s.t, s.guest, other);
    await as(s.t, s.host).mutation(api.listings.acceptRequest, { requestId: a });
    await expect(
      as(s.t, host2).mutation(api.listings.acceptRequest, { requestId: b }),
    ).rejects.toThrow(/enough credits/);
  });

  test("leaving before the formal refunds the credit", async () => {
    const s = await setup();
    const requestId = await requestWithCredit(s.t, s.guest, s.listing);
    await as(s.t, s.host).mutation(api.listings.acceptRequest, { requestId });
    await as(s.t, s.guest).mutation(api.listings.leaveGroup, { listingId: s.listing });
    expect(await credits(s.t, s.guest)).toEqual({ balance: 1, spending: 0, earning: 0 });
    expect((await credits(s.t, s.host))?.earning).toBe(0);
  });

  test("a cancelled formal refunds the credit", async () => {
    const s = await setup();
    const requestId = await requestWithCredit(s.t, s.guest, s.listing);
    await as(s.t, s.host).mutation(api.listings.acceptRequest, { requestId });
    await as(s.t, s.host).mutation(api.listings.deleteListing, { listingId: s.listing });
    expect((await credits(s.t, s.guest))?.balance).toBe(1);
  });

  test("'didn't happen' stops the payout", async () => {
    const s = await setup();
    const requestId = await requestWithCredit(s.t, s.guest, s.listing);
    await as(s.t, s.host).mutation(api.listings.acceptRequest, { requestId });
    vi.setSystemTime(Date.now() + 3 * DAY + 36e5);
    await as(s.t, s.guest).mutation(api.credits.reportFormalDidntHappen, {
      listingId: s.listing,
    });
    vi.setSystemTime(Date.now() + 2 * DAY);
    await s.t.mutation(internal.credits.settleDueHolds, {});
    expect((await credits(s.t, s.host))?.balance).toBe(1);
    expect(
      await as(s.t, s.guest).query(api.credits.getMyHoldsForListing, { listingId: s.listing }),
    ).toEqual({ held: 0, disputed: 1 });
  });

  test("'didn't happen' can't be reported before the formal", async () => {
    const s = await setup();
    const requestId = await requestWithCredit(s.t, s.guest, s.listing);
    await as(s.t, s.host).mutation(api.listings.acceptRequest, { requestId });
    await expect(
      as(s.t, s.guest).mutation(api.credits.reportFormalDidntHappen, {
        listingId: s.listing,
      }),
    ).rejects.toThrow(/hasn't happened yet/);
    expect(
      await as(s.t, s.guest).query(api.credits.getMyHoldsForListing, { listingId: s.listing }),
    ).toEqual({ held: 1, disputed: 0 });
  });

  test("leaving before the formal refunds a disputed credit too", async () => {
    const s = await setup();
    const requestId = await requestWithCredit(s.t, s.guest, s.listing);
    await as(s.t, s.host).mutation(api.listings.acceptRequest, { requestId });
    // A dispute raised before the formal (as the old rules allowed).
    await s.t.run(async (ctx) => {
      const [hold] = await ctx.db.query("creditHolds").collect();
      await ctx.db.patch(hold._id, { status: "disputed" });
    });
    await as(s.t, s.guest).mutation(api.listings.leaveGroup, { listingId: s.listing });
    expect(await credits(s.t, s.guest)).toEqual({ balance: 1, spending: 0, earning: 0 });
    expect(
      await as(s.t, s.guest).query(api.credits.getMyHoldsForListing, { listingId: s.listing }),
    ).toEqual({ held: 0, disputed: 0 });
  });
});
