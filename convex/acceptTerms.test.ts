/// <reference types="vite/client" />
import { describe, expect, test } from "vitest";
import { convexTest } from "convex-test";
import { api } from "./_generated/api";
import schema from "./schema";

const modules = import.meta.glob("./**/*.*s");

describe("agreeToRules", () => {
  test("accepts the terms and records when", async () => {
    const t = convexTest(schema, modules);
    const me = await t.run((ctx) =>
      ctx.db.insert("users", {
        name: "New",
        email: "new@ox.ac.uk",
        emailVerificationTime: 1,
      }),
    );
    const before = Date.now();
    await t.withIdentity({ subject: `${me}|s` }).mutation(api.users.agreeToRules, {});
    const user = await t.run((ctx) => ctx.db.get(me));
    expect(user?.agreedToRules).toBe(true);
    expect(user?.agreedToTermsAt).toBeGreaterThanOrEqual(before);
    expect(user?.agreedToTermsAt).toBeLessThanOrEqual(Date.now());
  });

  test("needs a signed-in user", async () => {
    const t = convexTest(schema, modules);
    await expect(t.mutation(api.users.agreeToRules, {})).rejects.toThrow();
  });
});
