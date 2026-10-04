/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { expect, test, vi } from "vitest";
import { api, internal } from "./_generated/api";
import schema from "./schema";

const modules = import.meta.glob("./**/*.*s");

async function seed(t: ReturnType<typeof convexTest>) {
  const ids = await t.run(async (ctx) => {
    const userId = await ctx.db.insert("users", {
      name: "Pat",
      email: "pat@ox.ac.uk",
      emailVerificationTime: 1,
    });
    const sessionId = await ctx.db.insert("authSessions", {
      userId,
      expirationTime: Date.now() + 1e9,
    });
    return { userId, sessionId };
  });
  await t.action(internal.password.setPasswordForEmail, {
    email: "pat@ox.ac.uk",
    password: "first-password",
  });
  return { ...ids, as: t.withIdentity({ subject: `${ids.userId}|${ids.sessionId}` }) };
}

test("changing a password needs the current one", async () => {
  const t = convexTest(schema, modules);
  const { as } = await seed(t);
  expect(
    await as.action(api.password.changePassword, { current: "nope-nope", next: "second-password" }),
  ).toBe("wrong_password");
  expect(
    await as.action(api.password.changePassword, {
      current: "first-password",
      next: "second-password",
    }),
  ).toBe("ok");
  // The old one no longer works; the new one does.
  expect(
    await as.action(api.password.changePassword, {
      current: "first-password",
      next: "third-password",
    }),
  ).toBe("wrong_password");
  expect(
    await as.action(api.password.changePassword, {
      current: "second-password",
      next: "third-password",
    }),
  ).toBe("ok");
});

test("resetting works on a fresh session and replaces the password", async () => {
  const t = convexTest(schema, modules);
  const { as } = await seed(t);
  expect(await as.action(api.password.resetPassword, { next: "brand-new-password" })).toBe("ok");
  expect(
    await as.action(api.password.changePassword, {
      current: "first-password",
      next: "whatever-else",
    }),
  ).toBe("wrong_password");
});

test("a short new password is refused", async () => {
  const t = convexTest(schema, modules);
  const { as } = await seed(t);
  await expect(as.action(api.password.resetPassword, { next: "short" })).rejects.toThrow();
});

test("resetting is refused once the session is no longer fresh", async () => {
  const t = convexTest(schema, modules);
  const { as } = await seed(t);
  vi.useFakeTimers({ now: Date.now() + 11 * 60 * 1000, toFake: ["Date"] });
  try {
    expect(await as.action(api.password.resetPassword, { next: "brand-new-password" })).toBe(
      "stale_session",
    );
  } finally {
    vi.useRealTimers();
  }
});

test("removing a password needs the current one, then it's gone", async () => {
  const t = convexTest(schema, modules);
  const { as } = await seed(t);
  expect(await as.action(api.password.removePassword, { current: "nope-nope" })).toBe(
    "wrong_password",
  );
  expect(await as.query(api.password.hasPassword, {})).toBe(true);
  expect(await as.action(api.password.removePassword, { current: "first-password" })).toBe("ok");
  expect(await as.query(api.password.hasPassword, {})).toBe(false);
});
