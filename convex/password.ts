import { v } from "convex/values";
import { createAccount, getAuthUserId } from "@convex-dev/auth/server";
import { action, query } from "./_generated/server";
import { api } from "./_generated/api";
import type { DataModel } from "./_generated/dataModel";
import { requireUserId } from "./guards";
import { MIN_PASSWORD_LENGTH } from "./auth";

/** Whether the signed-in user has a password credential attached. */
export const hasPassword = query({
  args: {},
  returns: v.boolean(),
  handler: async (ctx) => {
    const userId = await requireUserId(ctx);
    const account = await ctx.db
      .query("authAccounts")
      .withIndex("userIdAndProvider", (q) =>
        q.eq("userId", userId).eq("provider", "password"),
      )
      .unique();
    return account !== null;
  },
});

/**
 * Attach a password to the currently authenticated (OTP-verified) user.
 *
 * The email is derived server-side from the session — never trusted from the
 * client — so a user can only set a password on their own account. Because the
 * user's email is already verified (OTP), `createAccount` links the new
 * `password` credential to the existing user instead of creating a duplicate.
 *
 * Must be an `action` because `createAccount` dispatches via `ctx.runMutation`.
 */
export const setPassword = action({
  args: { password: v.string() },
  returns: v.null(),
  handler: async (ctx, { password }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }
    if (!password || password.length < MIN_PASSWORD_LENGTH) {
      throw new Error(
        `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`,
      );
    }

    const me = await ctx.runQuery(api.users.current);
    const email = me?.email?.trim();
    if (!email) {
      throw new Error("No verified email on this account.");
    }

    // Set-once: changing an existing password is out of scope for v1.
    if (await ctx.runQuery(api.password.hasPassword)) {
      throw new Error("Password already set");
    }

    await createAccount<DataModel>(ctx, {
      provider: "password",
      account: { id: email, secret: password },
      profile: { email },
      shouldLinkViaEmail: true,
      shouldLinkViaPhone: false,
    });

    return null;
  },
});
