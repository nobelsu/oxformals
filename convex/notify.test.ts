/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { describe, expect, test, vi } from "vitest";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { notify } from "./notify";
import schema from "./schema";

const modules = import.meta.glob("./**/*.*s");

type T = ReturnType<typeof convexTest<(typeof schema)["tables"]>>;

async function makeUser(t: T, name: string, extra: Record<string, unknown> = {}) {
  return await t.run((ctx) =>
    ctx.db.insert("users", {
      name,
      email: `${name.toLowerCase()}@ox.ac.uk`,
      emailVerificationTime: 1,
      agreedToRules: true,
      college: "Keble",
      year: "2",
      role: "UG",
      ...extra,
    }),
  );
}

const rowsFor = (t: T, userId: Id<"users">) =>
  t.run((ctx) =>
    ctx.db
      .query("notifications")
      .withIndex("by_userId_and_createdAt", (q) => q.eq("userId", userId))
      .collect(),
  );

describe("notify", () => {
  test("inserts a row with its category and schedules delivery", async () => {
    const t = convexTest(schema, modules);
    const maya = await makeUser(t, "Maya");
    const priya = await makeUser(t, "Priya");
    const id = await t.run((ctx) =>
      notify(ctx, { userId: priya, kind: "new_follower", actorId: maya }),
    );
    expect(id).not.toBeNull();
    const rows = await rowsFor(t, priya);
    expect(rows).toMatchObject([
      { kind: "new_follower", category: "social", actorId: maya, dedupeKey: `new_follower:${maya}:::` },
    ]);
    const jobs = await t.run((ctx) => ctx.db.system.query("_scheduled_functions").collect());
    expect(jobs.map((j) => j.name)).toEqual(
      expect.arrayContaining([expect.stringContaining("deliver")]),
    );
  });

  test("never notifies you about yourself", async () => {
    const t = convexTest(schema, modules);
    const maya = await makeUser(t, "Maya");
    expect(
      await t.run((ctx) => notify(ctx, { userId: maya, kind: "new_follower", actorId: maya })),
    ).toBeNull();
    expect(await rowsFor(t, maya)).toHaveLength(0);
  });

  test("skips deleted users", async () => {
    const t = convexTest(schema, modules);
    const gone = await t.run((ctx) =>
      ctx.db.insert("users", { name: "Deleted user", deletedAt: 1 }),
    );
    expect(await t.run((ctx) => notify(ctx, { userId: gone, kind: "formal_tomorrow" }))).toBeNull();
  });

  test("the same thing twice within 24h is one notification", async () => {
    const t = convexTest(schema, modules);
    const maya = await makeUser(t, "Maya");
    const priya = await makeUser(t, "Priya");
    const once = () =>
      t.run((ctx) => notify(ctx, { userId: priya, kind: "new_follower", actorId: maya }));
    await once();
    await once();
    expect(await rowsFor(t, priya)).toHaveLength(1);
    vi.setSystemTime(Date.now() + 25 * 60 * 60 * 1000);
    await once();
    expect(await rowsFor(t, priya)).toHaveLength(2);
  });
});

describe("delivery plan", () => {
  async function seeded(extra: Record<string, unknown> = {}) {
    const t = convexTest(schema, modules);
    const maya = await makeUser(t, "Maya");
    const priya = await makeUser(t, "Priya", extra);
    await t.run(async (ctx) => {
      await ctx.db.insert("webPushSubscriptions", {
        userId: priya,
        endpoint: "https://push.example/abc",
        p256dh: "p",
        auth: "a",
        createdAt: Date.now(),
      });
      await ctx.db.insert("pushTokens", {
        userId: priya,
        token: "ExponentPushToken[x]",
        platform: "ios",
        updatedAt: Date.now(),
      });
    });
    return { t, maya, priya };
  }

  test("push goes to web and Expo; party invites also email", async () => {
    const { t, maya, priya } = await seeded();
    const id = await t.run((ctx) =>
      notify(ctx, {
        userId: priya,
        kind: "party_invite",
        actorId: maya,
        data: { college: "Worcester", dateTime: "2026-10-15T18:30:00.000Z" },
      }),
    );
    const plan = await t.query(internal.notifications.getDeliveryPlan, { notificationId: id! });
    expect(plan?.push).toMatchObject({
      title: "You're invited",
      url: "/",
      webSubscriptions: [{ endpoint: "https://push.example/abc", p256dh: "p", auth: "a" }],
      expoTokens: ["ExponentPushToken[x]"],
    });
    expect(plan?.email).toEqual({ type: "notice" });
  });

  test("prefs gate push and email per category", async () => {
    const { t, maya, priya } = await seeded({
      notificationPrefs: {
        push: { bookings: true, invites: false, social: true, credits: true },
        email: { bookings: true, invites: true, social: false, credits: false },
      },
    });
    const invite = await t.run((ctx) =>
      notify(ctx, { userId: priya, kind: "party_invite", actorId: maya }),
    );
    const follow = await t.run((ctx) =>
      notify(ctx, { userId: priya, kind: "new_follower", actorId: maya }),
    );
    const invitePlan = await t.query(internal.notifications.getDeliveryPlan, { notificationId: invite! });
    const followPlan = await t.query(internal.notifications.getDeliveryPlan, { notificationId: follow! });
    expect(invitePlan?.push).toBeNull();
    expect(invitePlan?.email).toEqual({ type: "notice" });
    expect(followPlan?.push).not.toBeNull();
    expect(followPlan?.email).toBeNull();
  });

  test("legacy emailNotifications: false stops the email", async () => {
    const { t, maya, priya } = await seeded({ emailNotifications: false });
    const id = await t.run((ctx) =>
      notify(ctx, { userId: priya, kind: "party_invite", actorId: maya }),
    );
    const plan = await t.query(internal.notifications.getDeliveryPlan, { notificationId: id! });
    expect(plan?.email).toBeNull();
    expect(plan?.push).not.toBeNull();
  });

  test("new requests and wishlist listings use their own email templates", async () => {
    const { t, maya, priya } = await seeded({
      notificationPrefs: {
        push: { bookings: true, invites: true, social: true, credits: true },
        email: { bookings: true, invites: true, social: false, credits: true },
      },
    });
    const listingId = await t.run((ctx) =>
      ctx.db.insert("listings", {
        ownerUserId: maya,
        college: "Worcester",
        dateTime: "2026-10-15T18:30:00.000Z",
        groupSize: 4,
        seatsAvailable: 3,
        members: [maya],
        year: "2",
        role: "UG",
        message: "",
        status: "active",
      }),
    );
    const requestId = await t.run((ctx) =>
      ctx.db.insert("requests", {
        fromUserId: maya,
        toUserId: priya,
        targetListingId: listingId,
        message: "",
        status: "pending",
      }),
    );
    const req = await t.run((ctx) =>
      notify(ctx, { userId: priya, kind: "request_received", actorId: maya, listingId, requestId }),
    );
    const wish = await t.run((ctx) =>
      notify(ctx, { userId: priya, kind: "wishlist_listing", actorId: maya, listingId }),
    );
    expect((await t.query(internal.notifications.getDeliveryPlan, { notificationId: req! }))?.email)
      .toEqual({ type: "request", requestId });
    expect((await t.query(internal.notifications.getDeliveryPlan, { notificationId: wish! }))?.email)
      .toEqual({ type: "wishlist", listingId, userId: priya });
  });

  test("gone subscriptions are removed", async () => {
    const { t } = await seeded();
    await t.mutation(internal.notifications.removeWebPushSubscriptions, {
      endpoints: ["https://push.example/abc"],
    });
    expect(await t.run((ctx) => ctx.db.query("webPushSubscriptions").collect())).toHaveLength(0);
  });
});
