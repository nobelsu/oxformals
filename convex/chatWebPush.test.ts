/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";
import { internal } from "./_generated/api";
import schema from "./schema";

const modules = import.meta.glob("./**/*.*s");

async function dm(recipientExtra: Record<string, unknown> = {}) {
  const t = convexTest(schema, modules);
  const ids = await t.run(async (ctx) => {
    const sender = await ctx.db.insert("users", { name: "Maya Lee" });
    const recipient = await ctx.db.insert("users", { name: "Priya", ...recipientExtra });
    const [low, high] = [sender, recipient].sort();
    const conversationId = await ctx.db.insert("conversations", {
      kind: "dm",
      participantLow: low,
      participantHigh: high,
      lastMessageAt: Date.now(),
    });
    await ctx.db.insert("webPushSubscriptions", {
      userId: recipient,
      endpoint: "https://push.example/p",
      p256dh: "p",
      auth: "a",
      createdAt: Date.now(),
    });
    const messageId = await ctx.db.insert("messages", {
      conversationId,
      senderUserId: sender,
      body: "See you at seven",
    });
    return { conversationId, messageId };
  });
  return { t, ...ids };
}

describe("chat web push", () => {
  test("the other person's browsers get the message", async () => {
    const { t, conversationId, messageId } = await dm();
    const payload = await t.query(internal.pushNotifications.getChatWebPushPayload, { messageId });
    expect(payload).toEqual({
      items: [
        {
          title: "Maya Lee",
          body: "See you at seven",
          url: `/?tab=chats&conversation=${conversationId}`,
          tag: `chat:${conversationId}`,
          subscriptions: [{ endpoint: "https://push.example/p", p256dh: "p", auth: "a" }],
        },
      ],
    });
    expect(await t.run((ctx) => ctx.db.query("notifications").collect())).toHaveLength(0);
  });

  test("social push off means no chat push on the web", async () => {
    const { t, messageId } = await dm({
      notificationPrefs: {
        push: { bookings: true, invites: true, social: false, credits: true },
        email: { bookings: true, invites: true, social: false, credits: false },
      },
    });
    expect(
      await t.query(internal.pushNotifications.getChatWebPushPayload, { messageId }),
    ).toBeNull();
  });
});
