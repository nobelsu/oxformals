/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { expect, test } from "vitest";
import { api, internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import schema from "./schema";

const modules = import.meta.glob("./**/*.*s");
type T = ReturnType<typeof convexTest>;
const as = (t: T, id: Id<"users">) => t.withIdentity({ subject: `${id}|s` });

async function user(t: T, name: string, college: string) {
  return await t.run((ctx) =>
    ctx.db.insert("users", {
      name,
      email: `${name.toLowerCase()}@ox.ac.uk`,
      emailVerificationTime: 1,
      agreedToRules: true,
      college,
    }),
  );
}

test("only members of a college can edit its guide", async () => {
  const t = convexTest(schema, modules);
  const insider = await user(t, "Ina", "Worcester");
  const outsider = await user(t, "Oli", "Keble");
  await as(t, insider).mutation(api.collegeGuide.updateGuide, {
    college: "Worcester",
    formalNights: ["Thu", "Tue", "Nope"],
    gowns: "yes",
    guestPrice: 14,
    dressCode: "smart",
  });
  await expect(
    as(t, outsider).mutation(api.collegeGuide.updateGuide, {
      college: "Worcester",
      formalNights: [],
    }),
  ).rejects.toThrow(/Only members/);
  const guide = await as(t, outsider).query(api.collegeGuide.getGuide, { college: "Worcester" });
  expect(guide.canEdit).toBe(false);
  expect(guide.guide).toEqual({
    formalNights: ["Tue", "Thu"],
    gowns: "yes",
    guestPrice: 14,
    dressCode: "smart",
  });
});

test("tips come from members only", async () => {
  const t = convexTest(schema, modules);
  const insider = await user(t, "Ina", "Worcester");
  const outsider = await user(t, "Oli", "Keble");
  await t.mutation(internal.collegeGuide.insertTip, {
    userId: insider,
    college: "Worcester",
    text: "Sunday is the one to get.",
  });
  await expect(
    t.mutation(internal.collegeGuide.insertTip, {
      userId: outsider,
      college: "Worcester",
      text: "hi",
    }),
  ).rejects.toThrow(/Only members/);
  const guide = await as(t, insider).query(api.collegeGuide.getGuide, { college: "Worcester" });
  expect(guide.tips).toMatchObject([{ text: "Sunday is the one to get.", authorFirstName: "Ina", mine: true }]);
});

test("directory: want counts, formals this week, wishlist flag", async () => {
  const t = convexTest(schema, modules);
  const me = await user(t, "Me", "Keble");
  await t.run(async (ctx) => {
    await ctx.db.patch(me, { wishlistColleges: ["Worcester"] });
    await ctx.db.insert("collegeWishlists", { userId: me, college: "Worcester" });
    await ctx.db.insert("listings", {
      ownerUserId: me,
      college: "Worcester",
      dateTime: new Date(Date.now() + 2 * 864e5).toISOString(),
      groupSize: 3,
      seatsAvailable: 2,
      members: [me],
      year: "2",
      role: "UG",
      message: "",
      status: "active",
    });
  });
  const dir = await as(t, me).query(api.collegeDirectory.listDirectory, {});
  expect(dir.find((d) => d.college === "Worcester")).toMatchObject({
    wantCount: 1,
    weekCount: 1,
    onMyWishlist: true,
  });
  const overview = await as(t, me).query(api.collegeDirectory.getOverview, { college: "Keble" });
  expect(overview).toMatchObject({ memberCount: 1, isMember: true });
});
