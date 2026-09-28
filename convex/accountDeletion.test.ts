/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";
import { api } from "./_generated/api";
import schema from "./schema";

const modules = import.meta.glob("./**/*.*s");

describe("deleted users are hidden", () => {
  test("listPublic and getPublicProfile skip a deleted user", async () => {
    const t = convexTest(schema, modules);
    const ids = await t.run(async (ctx) => {
      const live = await ctx.db.insert("users", {
        name: "Live",
        email: "live@ox.ac.uk",
      });
      const gone = await ctx.db.insert("users", {
        name: "Deleted user",
        deletedAt: 1,
      });
      return { live, gone };
    });
    const list = await t.query(api.users.listPublic, {});
    expect(list.map((u) => u._id)).toEqual([ids.live]);
    expect(
      await t.query(api.users.getPublicProfile, { userId: ids.gone }),
    ).toBeNull();
  });
});
