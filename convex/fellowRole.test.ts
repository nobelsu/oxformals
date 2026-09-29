/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";
import { api } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import schema from "./schema";

const modules = import.meta.glob("./**/*.*s");

type T = ReturnType<typeof convexTest>;

async function makeUser(t: T, extra: Record<string, unknown> = {}) {
  return await t.run((ctx) =>
    ctx.db.insert("users", {
      name: "Ana",
      email: "ana@ox.ac.uk",
      emailVerificationTime: 1,
      agreedToRules: true,
      ...extra,
    }),
  );
}

const as = (t: T, id: Id<"users">) => t.withIdentity({ subject: `${id}|s` });
const read = (t: T, id: Id<"users">) => t.run((ctx) => ctx.db.get(id));
const inDays = (n: number) => new Date(Date.now() + n * 86_400_000).toISOString();

describe("Fellow role", () => {
  test("a fellow can finish onboarding without a year", async () => {
    const t = convexTest(schema, modules);
    const ana = await makeUser(t);
    await as(t, ana).mutation(api.users.completeOnboarding, {
      name: "Ana",
      college: "All Souls",
      year: "",
      role: "Fellow",
    });
    const user = await read(t, ana);
    expect(user?.role).toBe("Fellow");
    expect(user?.college).toBe("All Souls");
    expect(user?.year ?? "").toBe("");
  });

  test("a fellow's year is dropped even if one is sent", async () => {
    const t = convexTest(schema, modules);
    const ana = await makeUser(t);
    await as(t, ana).mutation(api.users.completeOnboarding, {
      name: "Ana",
      college: "All Souls",
      year: "3",
      role: "Fellow",
    });
    expect((await read(t, ana))?.year ?? "").toBe("");
  });

  test("students still need a year", async () => {
    const t = convexTest(schema, modules);
    const ana = await makeUser(t);
    await expect(
      as(t, ana).mutation(api.users.completeOnboarding, {
        name: "Ana",
        college: "Keble",
        year: "",
        role: "Undergrad",
      }),
    ).rejects.toThrow(/Missing required profile fields/);
  });

  test("switching to Fellow in Edit profile clears the year", async () => {
    const t = convexTest(schema, modules);
    const ana = await makeUser(t, { college: "Keble", year: "2", role: "DPhil" });
    await as(t, ana).mutation(api.users.patchProfile, { role: "Fellow" });
    const user = await read(t, ana);
    expect(user?.role).toBe("Fellow");
    expect(user?.year ?? "").toBe("");
  });

  test("a fellow can post a listing without a year", async () => {
    const t = convexTest(schema, modules);
    const ana = await makeUser(t, { college: "All Souls", role: "Fellow" });
    const listingId = await as(t, ana).mutation(api.listings.createListing, {
      dateTime: inDays(3),
      groupSize: 2,
      message: "",
      listingType: "swap",
    });
    const listing = await t.run((ctx) => ctx.db.get(listingId));
    expect(listing?.role).toBe("Fellow");
    expect(listing?.year).toBe("");
  });

  test("a student without a year still cannot post", async () => {
    const t = convexTest(schema, modules);
    const ana = await makeUser(t, { college: "Keble", role: "Undergrad" });
    await expect(
      as(t, ana).mutation(api.listings.createListing, {
        dateTime: inDays(3),
        groupSize: 2,
        message: "",
        listingType: "swap",
      }),
    ).rejects.toThrow(/Set college, year, and role/);
  });
});
