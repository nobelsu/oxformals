/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { describe, expect, test, vi } from "vitest";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { londonDayRange, londonHour } from "./londonTime";
import schema from "./schema";

const modules = import.meta.glob("./**/*.*s");

type T = ReturnType<typeof convexTest<(typeof schema)["tables"]>>;

const makeUser = (t: T, name: string) =>
  t.run((ctx) => ctx.db.insert("users", { name, email: `${name}@ox.ac.uk` }));

const makeListing = (t: T, host: Id<"users">, members: Id<"users">[], dateTime: string) =>
  t.run((ctx) =>
    ctx.db.insert("listings", {
      ownerUserId: host,
      college: "Worcester",
      dateTime,
      groupSize: 4,
      seatsAvailable: 4 - members.length,
      members,
      year: "2",
      role: "UG",
      message: "",
      status: "active",
    }),
  );

describe("london time", () => {
  test("hour and day bounds follow BST and GMT", () => {
    const bst = Date.parse("2026-10-14T08:00:00Z");
    expect(londonHour(bst)).toBe(9);
    expect(londonDayRange(bst, 1)).toEqual({
      start: Date.parse("2026-10-14T23:00:00Z"),
      end: Date.parse("2026-10-15T23:00:00Z"),
    });
    const gmt = Date.parse("2026-12-01T09:00:00Z");
    expect(londonHour(gmt)).toBe(9);
    expect(londonDayRange(gmt, 1)).toEqual({
      start: Date.parse("2026-12-02T00:00:00Z"),
      end: Date.parse("2026-12-03T00:00:00Z"),
    });
  });
});

describe("formal reminders", () => {
  test("at 9am London, everyone seated at tomorrow's formals is reminded once", async () => {
    vi.setSystemTime(new Date("2026-10-14T08:00:00Z")); // 09:00 BST
    const t = convexTest(schema, modules);
    const host = await makeUser(t, "host");
    const guest = await makeUser(t, "guest");
    const loner = await makeUser(t, "loner");
    await makeListing(t, host, [host, guest], "2026-10-15T18:30:00.000Z");
    await makeListing(t, loner, [loner], "2026-10-15T18:30:00.000Z"); // no guests
    await makeListing(t, host, [host, guest], "2026-10-16T18:30:00.000Z"); // day after

    expect(await t.mutation(internal.notifications.sendFormalReminders, {})).toEqual({ sent: 2 });
    expect(await t.mutation(internal.notifications.sendFormalReminders, {})).toEqual({ sent: 0 });
    const rows = await t.run((ctx) => ctx.db.query("notifications").collect());
    expect(rows.map((r) => [r.userId, r.kind])).toEqual([
      [host, "formal_tomorrow"],
      [guest, "formal_tomorrow"],
    ]);
  });

  test("does nothing at other hours", async () => {
    vi.setSystemTime(new Date("2026-10-14T07:00:00Z")); // 08:00 BST
    const t = convexTest(schema, modules);
    const host = await makeUser(t, "host");
    const guest = await makeUser(t, "guest");
    await makeListing(t, host, [host, guest], "2026-10-15T18:30:00.000Z");
    expect(await t.mutation(internal.notifications.sendFormalReminders, {})).toEqual({ sent: 0 });
  });
});

describe("retention", () => {
  test("deletes notifications older than 90 days", async () => {
    const t = convexTest(schema, modules);
    const me = await makeUser(t, "me");
    const now = Date.now();
    await t.run(async (ctx) => {
      for (const createdAt of [now - 91 * 864e5, now - 89 * 864e5]) {
        await ctx.db.insert("notifications", {
          userId: me,
          category: "credits",
          kind: "formal_tomorrow",
          dedupeKey: `k${createdAt}`,
          createdAt,
        });
      }
    });
    expect(await t.mutation(internal.notifications.pruneOldNotifications, {})).toEqual({ deleted: 1 });
    expect(await t.run((ctx) => ctx.db.query("notifications").collect())).toHaveLength(1);
  });
});
