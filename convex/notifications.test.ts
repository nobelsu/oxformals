/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";
import { api, internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { notify } from "./notify";
import schema from "./schema";

const modules = import.meta.glob("./**/*.*s");

type T = ReturnType<typeof convexTest<(typeof schema)["tables"]>>;

const makeUser = (t: T, name: string) =>
  t.run((ctx) =>
    ctx.db.insert("users", {
      name,
      email: `${name.toLowerCase()}@ox.ac.uk`,
      emailVerificationTime: 1,
      agreedToRules: true,
      college: "Keble",
      year: "2",
      role: "UG",
    }),
  );

const as = (t: T, id: Id<"users">) => t.withIdentity({ subject: `${id}|s` });

async function followers(t: T, target: Id<"users">, n: number) {
  for (let i = 0; i < n; i++) {
    const u = await makeUser(t, `Fan${i}`);
    await t.run((ctx) => notify(ctx, { userId: target, kind: "new_follower", actorId: u }));
  }
}

describe("bell", () => {
  test("unread count caps at 10 and mark all read clears it", async () => {
    const t = convexTest(schema, modules);
    const me = await makeUser(t, "Me");
    await followers(t, me, 12);
    expect(await as(t, me).query(api.notifications.getBellState, {})).toEqual({
      unread: 10,
      alertsEligible: false,
    });
    await as(t, me).mutation(api.notifications.markAllRead, {});
    expect((await as(t, me).query(api.notifications.getBellState, {}))?.unread).toBe(0);
  });

  test("lists newest first with rendered sentences", async () => {
    const t = convexTest(schema, modules);
    const me = await makeUser(t, "Me");
    const maya = await makeUser(t, "Maya Lee");
    await t.run((ctx) => notify(ctx, { userId: me, kind: "new_follower", actorId: maya }));
    await t.run((ctx) =>
      notify(ctx, { userId: me, kind: "credit_paid_out", data: { college: "Keble", count: 1 } }),
    );
    const page = await as(t, me).query(api.notifications.listMyNotifications, {
      paginationOpts: { numItems: 30, cursor: null },
    });
    expect(page.page.map((n) => n.kind)).toEqual(["credit_paid_out", "new_follower"]);
    expect(page.page[1]).toMatchObject({
      actor: { _id: maya, name: "Maya Lee" },
      url: `/profile/${maya}`,
      action: null,
    });
    expect(page.page[1].segments.map((s) => s.text).join("")).toBe("Maya followed you.");
  });

  test("a party invite row carries the answer state", async () => {
    const t = convexTest(schema, modules);
    const me = await makeUser(t, "Me");
    const maya = await makeUser(t, "Maya");
    const listing = await t.run((ctx) =>
      ctx.db.insert("listings", {
        ownerUserId: maya,
        college: "Worcester",
        dateTime: new Date(Date.now() + 3 * 864e5).toISOString(),
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
        toUserId: maya,
        targetListingId: listing,
        message: "",
        status: "pending",
        party: [{ kind: "friend", userId: me, payerId: me, method: "credit", response: "in" }],
      }),
    );
    await t.run((ctx) =>
      notify(ctx, { userId: me, kind: "party_invite", actorId: maya, requestId }),
    );
    const page = await as(t, me).query(api.notifications.listMyNotifications, {
      paginationOpts: { numItems: 30, cursor: null },
    });
    expect(page.page[0].action).toEqual({ type: "party", state: "in" });
    expect((await as(t, me).query(api.notifications.getBellState, {}))?.alertsEligible).toBe(false);
  });

  test("prefs start at the defaults and save per switch", async () => {
    const t = convexTest(schema, modules);
    const me = await makeUser(t, "Me");
    expect((await as(t, me).query(api.notifications.getMyNotificationPrefs, {}))?.email.social).toBe(false);
    await as(t, me).mutation(api.notifications.setNotificationPref, {
      channel: "email",
      category: "social",
      enabled: true,
    });
    await as(t, me).mutation(api.notifications.setNotificationPref, {
      channel: "push",
      category: "credits",
      enabled: false,
    });
    expect(await as(t, me).query(api.notifications.getMyNotificationPrefs, {})).toEqual({
      push: { bookings: true, invites: true, social: true, credits: false },
      email: { bookings: true, invites: true, social: true, credits: true },
    });
  });

  test("a browser's subscription moves to whoever saved it last", async () => {
    const t = convexTest(schema, modules);
    const a = await makeUser(t, "Ann");
    const b = await makeUser(t, "Ben");
    const sub = { endpoint: "https://push.example/1", p256dh: "p", auth: "a" };
    await as(t, a).mutation(api.notifications.saveWebPushSubscription, sub);
    await as(t, a).mutation(api.notifications.saveWebPushSubscription, sub);
    await as(t, b).mutation(api.notifications.saveWebPushSubscription, sub);
    const rows = await t.run((ctx) => ctx.db.query("webPushSubscriptions").collect());
    expect(rows).toMatchObject([{ userId: b, endpoint: sub.endpoint }]);
    await expect(
      as(t, a).mutation(api.notifications.saveWebPushSubscription, { ...sub, endpoint: "http://x" }),
    ).rejects.toThrow();
  });

  test("deleting your account deletes your notifications and subscriptions", async () => {
    const t = convexTest(schema, modules);
    const me = await makeUser(t, "Me");
    await followers(t, me, 2);
    await as(t, me).mutation(api.notifications.saveWebPushSubscription, {
      endpoint: "https://push.example/2",
      p256dh: "p",
      auth: "a",
    });
    await as(t, me).mutation(api.accountDeletion.deleteMyAccount, { confirmEmail: "me@ox.ac.uk" });
    await t.mutation(internal.accountDeletion.purgeUserContent, { userId: me });
    await t.run(async (ctx) => {
      expect(await ctx.db.query("notifications").collect()).toHaveLength(0);
      expect(await ctx.db.query("webPushSubscriptions").collect()).toHaveLength(0);
    });
  });

  test("a private actor you can't see shows without their photo", async () => {
    const t = convexTest(schema, modules);
    const me = await makeUser(t, "Me");
    const cat = await t.run((ctx) =>
      ctx.db.insert("users", {
        name: "Cat",
        email: "cat@ox.ac.uk",
        isPrivate: true,
        avatar: { kind: "preset", id: "p1" },
      }),
    );
    await t.run((ctx) => notify(ctx, { userId: me, kind: "new_follower", actorId: cat }));
    const page = await as(t, me).query(api.notifications.listMyNotifications, {
      paginationOpts: { numItems: 30, cursor: null },
    });
    expect(page.page[0].actor).toMatchObject({ _id: cat, name: "Cat" });
    expect(page.page[0].actor?.avatar).toBeUndefined();
  });
});
