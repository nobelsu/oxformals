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

async function makeUser(t: T, name: string, college: string, credits?: number) {
  return await t.run(async (ctx) => {
    const id = await ctx.db.insert("users", {
      name,
      email: `${name.toLowerCase()}@ox.ac.uk`,
      emailVerificationTime: 1,
      agreedToRules: true,
      college,
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

async function listing(
  t: T,
  owner: Id<"users">,
  groupSize: 2 | 3 | 4 | 5 | 6,
  listingType: "swap" | "pay" | "both" = "both",
) {
  return await as(t, owner).mutation(api.listings.createListing, {
    dateTime: inDays(3),
    groupSize,
    message: "",
    listingType,
    ...(listingType === "swap" ? {} : { price: 20 }),
  });
}

const get = (t: T, id: Id<"listings">) => t.run((ctx) => ctx.db.get(id));

describe("group requests (me + N)", () => {
  test("paying cash for me + 2 takes three seats", async () => {
    const t = convexTest(schema, modules);
    const alice = await makeUser(t, "Alice", "Keble");
    const wes = await makeUser(t, "Wes", "Worcester");
    const worcester = await listing(t, wes, 5);
    const { requestId } = await as(t, alice).mutation(api.listings.createRequest, {
      requestType: "pay",
      targetListingId: worcester,
      message: "",
      guests: 2,
    });
    await as(t, wes).mutation(api.listings.acceptRequest, { requestId });
    const l = await get(t, worcester);
    expect(l?.members).toEqual([wes, alice]);
    expect(l?.guestSeats).toEqual([{ userId: alice, count: 2 }]);
    expect(l?.seatsAvailable).toBe(1);
  });

  test("can't ask for more seats than are left", async () => {
    const t = convexTest(schema, modules);
    const alice = await makeUser(t, "Alice", "Keble");
    const wes = await makeUser(t, "Wes", "Worcester");
    const worcester = await listing(t, wes, 3);
    await expect(
      as(t, alice).mutation(api.listings.createRequest, {
        requestType: "pay",
        targetListingId: worcester,
        message: "",
        guests: 2,
      }),
    ).rejects.toThrow(/only 2 seats left/);
  });

  test("credits: one per seat, and the host earns them all", async () => {
    const t = convexTest(schema, modules);
    const alice = await makeUser(t, "Alice", "Keble", 3);
    const wes = await makeUser(t, "Wes", "Worcester");
    const worcester = await listing(t, wes, 4);
    const { requestId } = await as(t, alice).mutation(api.listings.createRequest, {
      requestType: "credit",
      targetListingId: worcester,
      message: "",
      guests: 2,
    });
    await as(t, wes).mutation(api.listings.acceptRequest, { requestId });
    expect(await as(t, alice).query(api.credits.getMyCredits, {})).toMatchObject({
      balance: 0,
      spending: 3,
    });
    vi.setSystemTime(Date.now() + 5 * DAY);
    await t.mutation(internal.credits.settleDueHolds, {});
    expect((await as(t, wes).query(api.credits.getMyCredits, {}))?.balance).toBe(4);
  });

  test("not enough credits for the whole group", async () => {
    const t = convexTest(schema, modules);
    const alice = await makeUser(t, "Alice", "Keble");
    const wes = await makeUser(t, "Wes", "Worcester");
    const worcester = await listing(t, wes, 4);
    await expect(
      as(t, alice).mutation(api.listings.createRequest, {
        requestType: "credit",
        targetListingId: worcester,
        message: "",
        guests: 1,
      }),
    ).rejects.toThrow(/needs 2 credits and you have 1/);
  });

  test("group swap is seats for seats; the host can give spare seats back", async () => {
    const t = convexTest(schema, modules);
    const alice = await makeUser(t, "Alice", "Keble");
    const wes = await makeUser(t, "Wes", "Worcester");
    const keble = await listing(t, alice, 4, "swap");
    const worcester = await listing(t, wes, 4, "swap");
    const { requestId } = await as(t, alice).mutation(api.listings.createRequest, {
      requestType: "swap",
      targetListingId: worcester,
      offeringListingId: keble,
      message: "",
      guests: 2,
    });
    await as(t, wes).mutation(api.listings.acceptRequest, { requestId });
    expect((await get(t, worcester))?.seatsAvailable).toBe(0);
    const k = await get(t, keble);
    expect(k?.members).toEqual([alice, wes]);
    expect(k?.guestSeats).toEqual([{ userId: wes, count: 2 }]);
    expect(k?.seatsAvailable).toBe(0);

    await as(t, wes).mutation(api.listings.releaseGuestSeat, { listingId: keble });
    const after = await get(t, keble);
    expect(after?.guestSeats).toEqual([{ userId: wes, count: 1 }]);
    expect(after?.seatsAvailable).toBe(1);
    expect(after?.status).toBe("active");
  });

  test("a group swap needs enough free seats at your formal", async () => {
    const t = convexTest(schema, modules);
    const alice = await makeUser(t, "Alice", "Keble");
    const wes = await makeUser(t, "Wes", "Worcester");
    const keble = await listing(t, alice, 2, "swap");
    const worcester = await listing(t, wes, 4, "swap");
    await expect(
      as(t, alice).mutation(api.listings.createRequest, {
        requestType: "swap",
        targetListingId: worcester,
        offeringListingId: keble,
        message: "",
        guests: 1,
      }),
    ).rejects.toThrow(/needs 2 free seats at your formal/);
  });

  test("leaving takes your guests with you and refunds their credits", async () => {
    const t = convexTest(schema, modules);
    const alice = await makeUser(t, "Alice", "Keble", 2);
    const wes = await makeUser(t, "Wes", "Worcester");
    const worcester = await listing(t, wes, 4);
    const { requestId } = await as(t, alice).mutation(api.listings.createRequest, {
      requestType: "credit",
      targetListingId: worcester,
      message: "",
      guests: 1,
    });
    await as(t, wes).mutation(api.listings.acceptRequest, { requestId });
    await as(t, alice).mutation(api.listings.leaveGroup, { listingId: worcester });
    const l = await get(t, worcester);
    expect(l?.members).toEqual([wes]);
    expect(l?.guestSeats).toEqual([]);
    expect(l?.seatsAvailable).toBe(3);
    expect((await as(t, alice).query(api.credits.getMyCredits, {}))?.balance).toBe(2);
  });

  test("group size can't drop below who's going, guests included", async () => {
    const t = convexTest(schema, modules);
    const alice = await makeUser(t, "Alice", "Keble");
    const wes = await makeUser(t, "Wes", "Worcester");
    const worcester = await listing(t, wes, 5);
    const { requestId } = await as(t, alice).mutation(api.listings.createRequest, {
      requestType: "pay",
      targetListingId: worcester,
      message: "",
      guests: 2,
    });
    await as(t, wes).mutation(api.listings.acceptRequest, { requestId });
    await expect(
      as(t, wes).mutation(api.listings.updateListing, {
        listingId: worcester,
        groupSize: 3,
      }),
    ).rejects.toThrow(/already going/);
  });
});
