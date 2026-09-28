/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { api } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import schema from "./schema";

const modules = import.meta.glob("./**/*.*s");

const DAY = 864e5;
const inDays = (n: number) => new Date(Date.now() + n * DAY).toISOString();

beforeEach(() => {
  vi.useFakeTimers();
});

async function makeUser(t: ReturnType<typeof convexTest>, name: string, college: string) {
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

const as = (t: ReturnType<typeof convexTest>, id: Id<"users">) =>
  t.withIdentity({ subject: `${id}|s` });

/** Alice (Keble) swaps into Wes's Worcester formal; both groups of 3. */
async function swapped(opts: { aliceDays?: number; wesDays?: number } = {}) {
  const t = convexTest(schema, modules);
  const alice = await makeUser(t, "Alice", "Keble");
  const wes = await makeUser(t, "Wes", "Worcester");
  const keble = await as(t, alice).mutation(api.listings.createListing, {
    dateTime: inDays(opts.aliceDays ?? 5),
    groupSize: 3,
    message: "",
    listingType: "swap",
  });
  const worcester = await as(t, wes).mutation(api.listings.createListing, {
    dateTime: inDays(opts.wesDays ?? 3),
    groupSize: 3,
    message: "",
    listingType: "swap",
  });
  const { requestId } = await as(t, alice).mutation(api.listings.createRequest, {
    requestType: "swap",
    targetListingId: worcester,
    offeringListingId: keble,
    message: "",
  });
  await as(t, wes).mutation(api.listings.acceptRequest, { requestId });
  return { t, alice, wes, keble, worcester, requestId };
}

async function scheduledNotices(t: ReturnType<typeof convexTest>) {
  return await t.run(async (ctx) => {
    const jobs = await ctx.db.system.query("_scheduled_functions").collect();
    return jobs
      .filter((j) => j.name.includes("sendFormalNotices"))
      .flatMap((j) => (j.args[0] as { notices: Array<{ userId: string; subject: string }> }).notices);
  });
}

describe("linked swaps", () => {
  test("accepting seats both sides", async () => {
    const s = await swapped();
    await s.t.run(async (ctx) => {
      expect((await ctx.db.get(s.worcester))?.members).toEqual([s.wes, s.alice]);
      expect((await ctx.db.get(s.keble))?.members).toEqual([s.alice, s.wes]);
    });
  });

  test("cancelling your formal loses you the seat you got in return", async () => {
    const s = await swapped();
    await as(s.t, s.alice).mutation(api.listings.deleteListing, { listingId: s.keble });
    await s.t.run(async (ctx) => {
      expect(await ctx.db.get(s.keble)).toBeNull();
      const worcester = await ctx.db.get(s.worcester);
      expect(worcester?.members).toEqual([s.wes]);
      expect(worcester?.seatsAvailable).toBe(2);
      expect((await ctx.db.get(s.requestId))?.status).toBe("declined");
    });
    const notices = await scheduledNotices(s.t);
    expect(notices.map((n) => [n.userId, n.subject])).toEqual(
      expect.arrayContaining([
        [s.alice, "Your swap was undone"],
        [s.wes, "Your formal has been cancelled"],
      ]),
    );
  });

  test("the other host cancelling works the same way round", async () => {
    const s = await swapped();
    await as(s.t, s.wes).mutation(api.listings.deleteListing, { listingId: s.worcester });
    await s.t.run(async (ctx) => {
      expect((await ctx.db.get(s.keble))?.members).toEqual([s.alice]);
    });
  });

  test("removing your swap partner undoes your half too", async () => {
    const s = await swapped();
    await as(s.t, s.alice).mutation(api.listings.removeMember, {
      listingId: s.keble,
      memberId: s.wes,
    });
    await s.t.run(async (ctx) => {
      expect((await ctx.db.get(s.keble))?.members).toEqual([s.alice]);
      expect((await ctx.db.get(s.worcester))?.members).toEqual([s.wes]);
    });
  });

  test("leaving only gives up your own half", async () => {
    const s = await swapped();
    await as(s.t, s.alice).mutation(api.listings.leaveGroup, { listingId: s.worcester });
    await s.t.run(async (ctx) => {
      expect((await ctx.db.get(s.worcester))?.members).toEqual([s.wes]);
      expect((await ctx.db.get(s.keble))?.members).toEqual([s.alice, s.wes]);
      expect((await ctx.db.get(s.requestId))?.status).toBe("declined");
    });
  });

  test("a break after the other formal happened is recorded, not undone", async () => {
    const s = await swapped({ wesDays: 1, aliceDays: 5 });
    vi.setSystemTime(Date.now() + 2 * DAY); // Worcester has happened
    await as(s.t, s.alice).mutation(api.listings.deleteListing, { listingId: s.keble });
    await s.t.run(async (ctx) => {
      expect((await ctx.db.get(s.worcester))?.members).toEqual([s.wes, s.alice]);
      const breaks = await ctx.db.query("swapBreaks").collect();
      expect(breaks).toMatchObject([{ brokenByUserId: s.alice, wrongedUserId: s.wes }]);
    });
  });
});

describe("listing lock", () => {
  test("the date can't move once someone has joined", async () => {
    const s = await swapped();
    await expect(
      as(s.t, s.wes).mutation(api.listings.updateListing, {
        listingId: s.worcester,
        dateTime: inDays(10),
      }),
    ).rejects.toThrow(/can't change the date/);
  });

  test("an empty listing can still move", async () => {
    const t = convexTest(schema, modules);
    const alice = await makeUser(t, "Alice", "Keble");
    const id = await as(t, alice).mutation(api.listings.createListing, {
      dateTime: inDays(5),
      groupSize: 2,
      message: "",
      listingType: "swap",
    });
    await as(t, alice).mutation(api.listings.updateListing, {
      listingId: id,
      dateTime: inDays(6),
    });
  });
});
