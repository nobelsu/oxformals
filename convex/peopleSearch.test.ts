/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { expect, test } from "vitest";
import { api } from "./_generated/api";
import schema from "./schema";

const modules = import.meta.glob("./**/*.*s");

test("finds people by name, minus yourself, unfinished sign-ups and blocked people", async () => {
  const t = convexTest(schema, modules);
  const { me, blockedOne } = await t.run(async (ctx) => {
    const user = (name: string, college?: string) =>
      ctx.db.insert("users", {
        name,
        email: `${name.toLowerCase().replace(/ /g, ".")}@ox.ac.uk`,
        emailVerificationTime: 1,
        agreedToRules: true,
        ...(college ? { college } : {}),
      });
    const me = await user("Sam Carter", "Keble");
    await user("Samira Khan", "Oriel");
    await user("Sam Unfinished");
    const blockedOne = await user("Sam Blocked", "Exeter");
    await user("Priya Shah", "Keble");
    return { me, blockedOne };
  });
  const as = t.withIdentity({ subject: `${me}|s` });
  await as.mutation(api.blocks.block, { userId: blockedOne });

  const names = (await as.query(api.peopleSearch.searchPeople, { query: "sam" })).map((p) => p.name);
  expect(names).toEqual(["Samira Khan"]);
  expect(await as.query(api.peopleSearch.searchPeople, { query: "s" })).toEqual([]);
  expect(await t.query(api.peopleSearch.searchPeople, { query: "sam" })).toEqual([]);
});

test("the chat picker's search uses the same index, and still finds by college", async () => {
  const t = convexTest(schema, modules);
  const { me, blockedOne } = await t.run(async (ctx) => {
    const user = (name: string, college: string) =>
      ctx.db.insert("users", {
        name,
        email: `${name.toLowerCase().replace(/ /g, ".")}@ox.ac.uk`,
        emailVerificationTime: 1,
        agreedToRules: true,
        college,
      });
    const me = await user("Sam Carter", "Keble");
    await user("Samira Khan", "Oriel");
    await user("Priya Shah", "Keble");
    const blockedOne = await user("Sam Blocked", "Exeter");
    return { me, blockedOne };
  });
  const as = t.withIdentity({ subject: `${me}|s` });
  await as.mutation(api.blocks.block, { userId: blockedOne });

  const byName = await as.query(api.chat.searchUsersForChat, { query: "sam" });
  expect(byName.map((u) => u.name)).toEqual(["Samira Khan"]);
  const byCollege = await as.query(api.chat.searchUsersForChat, { query: "keb" });
  expect(byCollege.map((u) => u.name)).toEqual(["Priya Shah"]);
});
