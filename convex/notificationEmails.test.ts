/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";
import { internal } from "./_generated/api";
import { emailNotificationsEnabled } from "./emailNotifications";
import { notify } from "./notify";
import schema from "./schema";

const modules = import.meta.glob("./**/*.*s");

type T = ReturnType<typeof convexTest<(typeof schema)["tables"]>>;

const makeUser = (t: T, name: string, extra: Record<string, unknown> = {}) =>
  t.run((ctx) =>
    ctx.db.insert("users", {
      name: `${name} Smith`,
      email: `${name.toLowerCase()}@ox.ac.uk`,
      emailVerificationTime: 1,
      agreedToRules: true,
      ...extra,
    }),
  );

describe("notification emails", () => {
  test("a party invite email has the ticket and both answers", async () => {
    const t = convexTest(schema, modules);
    const maya = await makeUser(t, "Maya");
    const priya = await makeUser(t, "Priya");
    const id = await t.run((ctx) =>
      notify(ctx, {
        userId: priya,
        kind: "party_invite",
        actorId: maya,
        data: { college: "Worcester", dateTime: "2026-10-15T18:30:00.000Z", paysOwn: false },
      }),
    );
    const email = await t.query(internal.emails.getNotificationEmail, { notificationId: id! });
    expect(email).toMatchObject({
      to: "priya@ox.ac.uk",
      subject: "Maya wants to bring you to Worcester",
      eyebrow: "Group invite",
      heading: "Maya added you to their group",
      ticket: { college: "Worcester", tag: "Maya is covering you" },
      cta: { label: "I'm in", path: "/" },
      secondary: { label: "Not me", path: "/" },
    });
  });

  test("no email for kinds without one, or for deleted users", async () => {
    const t = convexTest(schema, modules);
    const maya = await makeUser(t, "Maya");
    const priya = await makeUser(t, "Priya");
    const follow = await t.run((ctx) =>
      notify(ctx, { userId: priya, kind: "new_follower", actorId: maya }),
    );
    expect(await t.query(internal.emails.getNotificationEmail, { notificationId: follow! })).toBeNull();

    const invite = await t.run((ctx) =>
      notify(ctx, { userId: priya, kind: "party_invite", actorId: maya }),
    );
    await t.run((ctx) => ctx.db.patch(priya, { deletedAt: 1, email: undefined }));
    expect(await t.query(internal.emails.getNotificationEmail, { notificationId: invite! })).toBeNull();
  });

  test("review reminders follow the credits email pref once prefs are saved", () => {
    expect(emailNotificationsEnabled({})).toBe(true);
    expect(emailNotificationsEnabled({ emailNotifications: false })).toBe(false);
    const prefs = {
      push: { bookings: true, invites: true, social: true, credits: true },
      email: { bookings: true, invites: true, social: false, credits: false },
    };
    expect(emailNotificationsEnabled({ notificationPrefs: prefs })).toBe(false);
    expect(
      emailNotificationsEnabled({
        notificationPrefs: { ...prefs, email: { ...prefs.email, credits: true } },
      }),
    ).toBe(true);
  });
});
