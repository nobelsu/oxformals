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

describe("dietary requirements need opt-in", () => {
  test("without consent the text is not stored", async () => {
    const t = convexTest(schema, modules);
    const ana = await makeUser(t);
    await as(t, ana).mutation(api.users.patchProfile, {
      dietaryRequirements: "Coeliac",
    });
    const user = await read(t, ana);
    expect(user?.dietaryRequirements ?? "").toBe("");
    expect(user?.dietaryConsentAt).toBeUndefined();
  });

  test("with consent the text and the consent time are stored", async () => {
    const t = convexTest(schema, modules);
    const ana = await makeUser(t);
    await as(t, ana).mutation(api.users.patchProfile, {
      dietaryRequirements: "Coeliac",
      dietaryConsent: true,
    });
    const user = await read(t, ana);
    expect(user?.dietaryRequirements).toBe("Coeliac");
    expect(user?.dietaryConsentAt).toBeTypeOf("number");
  });

  test("withdrawing consent clears the text", async () => {
    const t = convexTest(schema, modules);
    const ana = await makeUser(t, {
      dietaryRequirements: "Coeliac",
      dietaryConsentAt: 1,
    });
    await as(t, ana).mutation(api.users.patchProfile, {
      dietaryRequirements: "Coeliac",
      dietaryConsent: false,
    });
    const user = await read(t, ana);
    expect(user?.dietaryRequirements).toBe("");
    expect(user?.dietaryConsentAt).toBeUndefined();
  });

  test("a legacy value is kept until it is next edited", async () => {
    const t = convexTest(schema, modules);
    const ana = await makeUser(t, { dietaryRequirements: "Vegan" });
    // Saving other fields leaves it alone.
    await as(t, ana).mutation(api.users.patchProfile, {
      subject: "PPE",
      dietaryRequirements: "Vegan",
    });
    expect((await read(t, ana))?.dietaryRequirements).toBe("Vegan");
    // Changing it without consent does not store the new text.
    await as(t, ana).mutation(api.users.patchProfile, {
      dietaryRequirements: "Vegan, nut allergy",
    });
    expect((await read(t, ana))?.dietaryRequirements).toBe("Vegan");
  });

  test("onboarding ignores dietary text without consent", async () => {
    const t = convexTest(schema, modules);
    const ana = await makeUser(t);
    await as(t, ana).mutation(api.users.completeOnboarding, {
      name: "Ana",
      college: "Keble",
      year: "2",
      role: "Undergraduate",
      dietaryRequirements: "Vegan",
    });
    expect((await read(t, ana))?.dietaryRequirements).toBe("");
  });

  test("phone number is optional at onboarding", async () => {
    const t = convexTest(schema, modules);
    const ana = await makeUser(t);
    await as(t, ana).mutation(api.users.completeOnboarding, {
      name: "Ana",
      college: "Keble",
      year: "2",
      role: "Undergraduate",
    });
    const user = await read(t, ana);
    expect(user?.college).toBe("Keble");
    expect(user?.whatsappPhone).toBeUndefined();
  });
});
