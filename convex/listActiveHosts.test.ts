/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { expect, test } from "vitest";
import { api } from "./_generated/api";
import schema from "./schema";

const modules = import.meta.glob("./**/*.*s");
const FUTURE = new Date(Date.now() + 7 * 864e5).toISOString();
const PAST = new Date(Date.now() - 7 * 864e5).toISOString();

test("listActiveHosts: signed-out browse gets upcoming hosts, private ones limited", async () => {
  const t = convexTest(schema, modules);
  const { open, hidden } = await t.run(async (ctx) => {
    const open = await ctx.db.insert("users", {
      name: "Open Host",
      college: "Worcester",
      bio: "Hi there",
    });
    const hidden = await ctx.db.insert("users", {
      name: "Private Host",
      college: "Keble",
      bio: "Secret",
      isPrivate: true,
    });
    const pastOnly = await ctx.db.insert("users", { name: "Past Host" });
    const listing = (ownerUserId: typeof open, dateTime: string) =>
      ctx.db.insert("listings", {
        ownerUserId,
        college: "Worcester",
        dateTime,
        groupSize: 3,
        seatsAvailable: 2,
        members: [ownerUserId],
        year: "2",
        role: "UG",
        message: "",
        status: "active",
        formalType: "social",
      });
    await listing(open, FUTURE);
    await listing(hidden, FUTURE);
    await listing(pastOnly, PAST);
    return { open, hidden };
  });

  const hosts = await t.query(api.listings.listActiveHosts, {});
  const byId = new Map(hosts.map((h) => [h._id, h]));
  expect(hosts).toHaveLength(2);
  expect(byId.get(open)?.name).toBe("Open Host");
  expect(byId.get(hidden)?.name).toBe("Private Host");
  expect(JSON.stringify(byId.get(hidden))).not.toContain("Secret");
});
