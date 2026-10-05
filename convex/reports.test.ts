/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { expect, test } from "vitest";
import { api } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import schema from "./schema";

const modules = import.meta.glob("./**/*.*s");
type T = ReturnType<typeof convexTest>;
const as = (t: T, id: Id<"users">) => t.withIdentity({ subject: `${id}|s` });

async function seed(t: T) {
  return await t.run(async (ctx) => {
    const user = (name: string) =>
      ctx.db.insert("users", {
        name,
        email: `${name.toLowerCase()}@ox.ac.uk`,
        emailVerificationTime: 1,
        agreedToRules: true,
      });
    const me = await user("Me");
    const them = await user("Them");
    const outsider = await user("Outsider");
    const comment = await ctx.db.insert("feedComments", {
      targetKey: "listing:x",
      userId: them,
      text: "rude words",
    });
    const [low, high] = me < them ? [me, them] : [them, me];
    const conversation = await ctx.db.insert("conversations", {
      kind: "dm",
      participantLow: low,
      participantHigh: high,
      lastMessageAt: 1,
    });
    const message = await ctx.db.insert("messages", {
      conversationId: conversation,
      senderUserId: them,
      body: "nasty",
    });
    return { me, them, outsider, comment, message };
  });
}

test("a report is stored once per reporter with a snapshot of the text", async () => {
  const t = convexTest(schema, modules);
  const { me, them, comment } = await seed(t);
  const args = {
    target: { kind: "comment" as const, commentId: comment },
    reason: "harassment" as const,
    details: "  aimed at me  ",
  };
  expect(await as(t, me).mutation(api.reports.report, args)).toEqual({ alreadyReported: false });
  expect(await as(t, me).mutation(api.reports.report, args)).toEqual({ alreadyReported: true });
  const rows = await t.run((ctx) => ctx.db.query("reports").collect());
  expect(rows).toHaveLength(1);
  expect(rows[0]).toMatchObject({
    reporterUserId: me,
    reportedUserId: them,
    targetKey: `comment:${comment}`,
    reason: "harassment",
    details: "aimed at me",
    snapshot: "rude words",
  });
});

test("you can report a person, but not yourself", async () => {
  const t = convexTest(schema, modules);
  const { me, them } = await seed(t);
  await expect(
    as(t, me).mutation(api.reports.report, {
      target: { kind: "user", userId: me },
      reason: "spam",
    }),
  ).rejects.toThrow("can't report yourself");
  expect(
    await as(t, me).mutation(api.reports.report, {
      target: { kind: "user", userId: them },
      reason: "impersonation",
    }),
  ).toEqual({ alreadyReported: false });
});

test("only someone in the chat can report a message from it", async () => {
  const t = convexTest(schema, modules);
  const { me, outsider, message } = await seed(t);
  const target = { kind: "message" as const, messageId: message };
  await expect(
    as(t, outsider).mutation(api.reports.report, { target, reason: "other" }),
  ).rejects.toThrow("your own chats");
  expect(await as(t, me).mutation(api.reports.report, { target, reason: "other" })).toEqual({
    alreadyReported: false,
  });
});
