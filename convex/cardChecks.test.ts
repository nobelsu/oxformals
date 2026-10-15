/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { expect, test } from "vitest";
import { api, internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import schema from "./schema";

const modules = import.meta.glob("./**/*.*s");
type T = ReturnType<typeof convexTest>;
const as = (t: T, id: Id<"users">) => t.withIdentity({ subject: `${id}|s` });

const read = {
  isOxfordUniversityCard: true,
  name: "Casey Card",
  college: "Keble College",
  expiry: "2099-06-30",
  confidence: "high" as const,
};

async function seed(t: T) {
  return await t.run(async (ctx) => {
    const user = (name: string, email: string, college?: string) =>
      ctx.db.insert("users", {
        name,
        email,
        emailVerificationTime: 1,
        agreedToRules: true,
        ...(college ? { college } : {}),
      });
    const card = await user("Casey Card", "casey@gmail.com", "Balliol");
    const student = await user("Sam Student", "sam@ox.ac.uk", "Merton");
    const admin = await user("Admin", "admin@ox.ac.uk");
    return { card, student, admin };
  });
}

async function photo(t: T) {
  return await t.run((ctx) => ctx.storage.store(new Blob(["card"], { type: "image/jpeg" })));
}

test("an allowed email never needs a card", async () => {
  const t = convexTest(schema, modules);
  const s = await seed(t);
  expect(await as(t, s.student).query(api.cardChecks.myCardStatus, {})).toEqual({
    needsCard: false,
    member: true,
    latest: null,
  });
  await expect(as(t, s.student).mutation(api.cardChecks.generateUploadUrl, {})).rejects.toThrow(
    /already confirms/,
  );
});

test("until the card is approved, actions that touch other people are refused", async () => {
  const t = convexTest(schema, modules);
  const s = await seed(t);
  await expect(
    as(t, s.card).mutation(api.follows.follow, { userId: s.student }),
  ).rejects.toThrow(/still being checked/);
  await expect(
    as(t, s.card).mutation(api.feedComments.addComment, { targetKey: "listing:x", text: "hi" }),
  ).rejects.toThrow(/still being checked/);
});

test("a clear card is approved, sets the college, deletes the photo and unlocks the account", async () => {
  const t = convexTest(schema, modules);
  const s = await seed(t);
  const imageId = await photo(t);
  const checkId = await as(t, s.card).mutation(api.cardChecks.submit, { imageId });
  await t.mutation(internal.cardChecks.applyRead, { checkId, read });

  const status = await as(t, s.card).query(api.cardChecks.myCardStatus, {});
  expect(status).toMatchObject({ needsCard: true, member: true, latest: { status: "approved" } });
  await t.run(async (ctx) => {
    expect(await ctx.storage.get(imageId)).toBeNull();
    expect((await ctx.db.get(s.card))?.college).toBe("Keble");
    expect((await ctx.db.get(checkId))?.imageId).toBeUndefined();
  });
  await as(t, s.card).mutation(api.follows.follow, { userId: s.student });
});

test("an unreadable card waits for an admin, who can reject it with a reason", async () => {
  const t = convexTest(schema, modules);
  const s = await seed(t);
  const imageId = await photo(t);
  const checkId = await as(t, s.card).mutation(api.cardChecks.submit, { imageId });
  await t.mutation(internal.cardChecks.applyRead, { checkId, read: null });

  await expect(as(t, s.card).mutation(api.cardChecks.submit, { imageId })).rejects.toThrow(
    /still checking/,
  );
  await expect(as(t, s.student).query(api.cardChecks.listForReview, {})).rejects.toThrow(/Admin/);
  const queue = await as(t, s.admin).query(api.cardChecks.listForReview, {});
  expect(queue).toHaveLength(1);
  expect(queue[0]).toMatchObject({ checkId, profileName: "Casey Card", suggestedCollege: "Balliol" });

  await as(t, s.admin).mutation(api.cardChecks.decide, {
    checkId,
    approve: false,
    reason: "That card has expired.",
  });
  const status = await as(t, s.card).query(api.cardChecks.myCardStatus, {});
  expect(status).toMatchObject({
    member: false,
    latest: { status: "rejected", reason: "That card has expired." },
  });
  await t.run(async (ctx) => {
    expect(await ctx.storage.get(imageId)).toBeNull();
  });
});

test("an admin approval needs a college from the list", async () => {
  const t = convexTest(schema, modules);
  const s = await seed(t);
  const checkId = await as(t, s.card).mutation(api.cardChecks.submit, {
    imageId: await photo(t),
  });
  await t.mutation(internal.cardChecks.applyRead, { checkId, read: { ...read, confidence: "low" } });
  await expect(
    as(t, s.admin).mutation(api.cardChecks.decide, { checkId, approve: true, college: "Hogwarts" }),
  ).rejects.toThrow(/college/);
  await as(t, s.admin).mutation(api.cardChecks.decide, { checkId, approve: true, college: "merton college" });
  await t.run(async (ctx) => {
    expect((await ctx.db.get(s.card))?.college).toBe("Merton");
  });
});

test("three tries a day at most", async () => {
  const t = convexTest(schema, modules);
  const s = await seed(t);
  for (let i = 0; i < 3; i++) {
    const checkId = await as(t, s.card).mutation(api.cardChecks.submit, {
      imageId: await photo(t),
    });
    await t.mutation(internal.cardChecks.applyRead, {
      checkId,
      read: { ...read, expiry: "2001-01-01" },
    });
  }
  await expect(
    as(t, s.card).mutation(api.cardChecks.submit, { imageId: await photo(t) }),
  ).rejects.toThrow(/three tries/);
});

test("checks nobody decided in 30 days are closed and their photos deleted", async () => {
  const t = convexTest(schema, modules);
  const s = await seed(t);
  const imageId = await photo(t);
  const checkId = await t.run((ctx) =>
    ctx.db.insert("cardChecks", {
      userId: s.card,
      status: "needs_review",
      imageId,
      createdAt: Date.now() - 31 * 24 * 60 * 60 * 1000,
    }),
  );
  await t.mutation(internal.cardChecks.closeStale, {});
  await t.run(async (ctx) => {
    expect((await ctx.db.get(checkId))?.status).toBe("rejected");
    expect(await ctx.storage.get(imageId)).toBeNull();
  });
});
