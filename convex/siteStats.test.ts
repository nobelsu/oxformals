/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { expect, test } from "vitest";
import { api, internal } from "./_generated/api";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");

test("landing stats are null until counted, then count finished profiles only", async () => {
  const t = convexTest(schema, modules);
  expect(await t.query(api.siteStats.get, {})).toBeNull();

  await t.run(async (ctx) => {
    await ctx.db.insert("users", { name: "Ada", college: "Keble" });
    await ctx.db.insert("users", { name: "No college yet" });
    await ctx.db.insert("users", { name: "Gone", college: "Keble", deletedAt: 1 });
  });
  await t.mutation(internal.siteStats.recompute, {});
  expect(await t.query(api.siteStats.get, {})).toEqual({ formals: 0, students: 1 });

  // A second run updates the one row rather than adding another.
  await t.mutation(internal.siteStats.recompute, {});
  expect(await t.run((ctx) => ctx.db.query("siteStats").collect())).toHaveLength(1);
});
