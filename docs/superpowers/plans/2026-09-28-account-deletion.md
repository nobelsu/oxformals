# Account Deletion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a signed-in user permanently delete their account from Settings on web and mobile (App Store guideline 5.1.1(v)).

**Architecture:** One Convex mutation, `accountDeletion.deleteMyAccount`, re-checks the typed email, tidies up upcoming formals, deletes personal rows, and replaces the user document with a `"Deleted user"` placeholder (`deletedAt` set), so messages, reviews and past formals keep resolving to that placeholder. A preview query, `accountDeletion.getDeletionImpact`, powers the confirmation screen. Emails to affected guests and hosts are scheduled as one internal action.

**Tech Stack:** Convex (queries, mutations, internal actions, scheduler), `@convex-dev/auth` tables, Resend, Next.js 16 client (web), Expo Router (mobile), vitest + convex-test (new).

## Global Constraints

- Approved design: scrub to a placeholder ("Option 1"), anonymise messages and reviews ("A"), tidy up formals and notify affected people ("A + notify"), immediate deletion confirmed by typing the account's email.
- Placeholder user document is exactly `{ name: "Deleted user", deletedAt: <ms> }` — no email, so re-signing up with the same address creates a fresh account.
- Kept (anonymised): `messages`, `conversations`, `conversationMembers`, `collegeReviews`, `collegeReviewVotes`, `collegeReviewReports`, `feedComments`, `formalAttendanceConfirmations`, past `listings` and their `requests`.
- Deleted: `authAccounts` (+ their `authVerificationCodes`), `authSessions` (+ their `authRefreshTokens`), `collegeWishlists`, `feedLikes`, `feedBookmarks`, `pushTokens`, `userBadges`, `uploadedFiles` rows (bookkeeping only — review photos stay because the reviews stay), upcoming hosted `listings` (+ menu PDF).
- Upcoming = `!listingIsPast(listing.dateTime, Date.now())` from `convex/listingHelpers.ts`.
- Email copy: host left → "The host of your {college} formal on {date} has left Oxformals, so the formal is cancelled."; guest left → "A guest has left your {college} formal on {date}, so a seat is free again." Declined pending requests send nothing.
- Backend is deployed only from the web repo. Mobile references functions with `makeFunctionReference` (its `convex/` folder is a stale copy and must not be deployed).

---

## File structure

**Web repo (`/Users/nobel/Desktop/Work/oxformals`, branch `feat/account-deletion` off `revival`)**
- Create `vitest.config.mts` — convex-test environment.
- Create `convex/accountDeletion.ts` — `getDeletionImpact` query, `deleteMyAccount` mutation, pure helpers.
- Create `convex/accountDeletion.test.ts` — backend tests.
- Modify `convex/schema.ts` — `users.deletedAt`, `feedLikes.by_userId` index.
- Modify `convex/users.ts` — hide deleted users from `listPublic`, `listForChatPicker`; `getPublicProfile` returns `null` for them.
- Modify `convex/emails.ts` — `sendAccountDeletionNotices` internal action + templates.
- Create `components/DeleteAccountModal.tsx` — confirmation screen.
- Modify `components/SettingsModal.tsx` — "Delete account" link.
- Modify `package.json` — `test` script, dev deps.

**Mobile repo (`/Users/nobel/Desktop/Work/oxformals-mobile-updates`, branch `revival`)**
- Create `src/components/settings/DeleteAccountSheet.tsx`.
- Modify `src/components/settings/SettingsModal.tsx` — "Delete account" link.

---

### Task 1: Test harness

**Files:** Modify `package.json`; create `vitest.config.mts`.

- [ ] **Step 1:** `npm install --save-dev vitest convex-test @edge-runtime/vm`
- [ ] **Step 2:** Create `vitest.config.mts`:

```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "edge-runtime",
    include: ["convex/**/*.test.ts"],
    server: { deps: { inline: ["convex-test"] } },
  },
});
```

- [ ] **Step 3:** Add `"test": "vitest run"` to `package.json` scripts.
- [ ] **Step 4:** Commit with Task 2 (no test file exists yet to run).

### Task 2: Schema + deleted users hidden from people lists

**Files:** Modify `convex/schema.ts`, `convex/users.ts`. Test: `convex/accountDeletion.test.ts`.

**Produces:** `users.deletedAt?: number`; index `feedLikes.by_userId`.

- [ ] **Step 1: Failing test** (`convex/accountDeletion.test.ts`):

```ts
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
      const live = await ctx.db.insert("users", { name: "Live", email: "live@ox.ac.uk" });
      const gone = await ctx.db.insert("users", { name: "Deleted user", deletedAt: 1 });
      return { live, gone };
    });
    const list = await t.query(api.users.listPublic, {});
    expect(list.map((u) => u._id)).toEqual([ids.live]);
    expect(await t.query(api.users.getPublicProfile, { userId: ids.gone })).toBeNull();
  });
});
```

- [ ] **Step 2:** `npm test` → FAIL (`deletedAt` not in schema).
- [ ] **Step 3:** In `convex/schema.ts` add to `users`: `deletedAt: v.optional(v.number()),`; add `.index("by_userId", ["userId"])` to `feedLikes`.
- [ ] **Step 4:** In `convex/users.ts`:
  - `listPublic`: `return users.filter((u) => u.deletedAt === undefined).map(sanitizePublicUser);`
  - `listForChatPicker`: add `u.deletedAt === undefined &&` to the filter.
  - `getPublicProfile`: change `if (!user) return null;` to `if (!user || user.deletedAt !== undefined) return null;`
- [ ] **Step 5:** `npm test` → PASS. `npx tsc --noEmit` clean.
- [ ] **Step 6:** Commit: `FEAT: Deleted users are hidden from people lists and profiles` (include Task 1 files).

### Task 3: `getDeletionImpact` + `deleteMyAccount`

**Files:** Create `convex/accountDeletion.ts`; extend `convex/accountDeletion.test.ts`.

**Produces:**
- `api.accountDeletion.getDeletionImpact({})` → `null | { email: string; hosting: { listingId; college; dateTime; guestCount }[]; joined: { listingId; college; dateTime }[]; pendingRequests: number }`
- `api.accountDeletion.deleteMyAccount({ confirmEmail: string })` → `null`
- Schedules `internal.emails.sendAccountDeletionNotices({ notices: { kind: "hostLeft" | "guestLeft"; toEmail; college; dateTime }[] })` when notices is non-empty (Task 4 defines it).

- [ ] **Step 1: Failing tests** — append to `convex/accountDeletion.test.ts`:

```ts
import { vi } from "vitest";

const FUTURE = new Date(Date.now() + 7 * 864e5).toISOString();
const PAST = new Date(Date.now() - 7 * 864e5).toISOString();

async function seed(t: ReturnType<typeof convexTest>) {
  return await t.run(async (ctx) => {
    const me = await ctx.db.insert("users", {
      name: "Me", email: "me@ox.ac.uk", college: "Keble", dietaryRequirements: "vegan", agreedToRules: true,
    });
    const guest = await ctx.db.insert("users", { name: "Guest", email: "guest@ox.ac.uk" });
    const host = await ctx.db.insert("users", { name: "Host", email: "host@ox.ac.uk" });
    const base = { groupSize: 2 as never, year: "2", role: "UG", message: "" };
    const hosted = await ctx.db.insert("listings", {
      ...base, ownerUserId: me, college: "Worcester", dateTime: FUTURE,
      seatsAvailable: 0, members: [me, guest], status: "closed",
    });
    const pastHosted = await ctx.db.insert("listings", {
      ...base, ownerUserId: me, college: "Exeter", dateTime: PAST,
      seatsAvailable: 0, members: [me, guest], status: "expired",
    });
    const joined = await ctx.db.insert("listings", {
      ...base, ownerUserId: host, college: "Magdalen", dateTime: FUTURE,
      seatsAvailable: 0, members: [host, me], status: "closed",
    });
    await ctx.db.insert("requests", {
      fromUserId: me, toUserId: host, targetListingId: joined, message: "", status: "accepted",
    });
    const pending = await ctx.db.insert("requests", {
      fromUserId: guest, toUserId: me, targetListingId: hosted, message: "", status: "pending",
    });
    await ctx.db.insert("collegeWishlists", { userId: me, college: "Keble" });
    await ctx.db.insert("feedLikes", { userId: me, targetKey: "review:x" });
    await ctx.db.insert("feedBookmarks", { userId: me, targetKey: "review:x" });
    await ctx.db.insert("pushTokens", { userId: me, token: "t", platform: "ios", updatedAt: 1 });
    await ctx.db.insert("userBadges", { userId: me, badgeId: "first", earnedAt: 1 });
    const account = await ctx.db.insert("authAccounts", {
      userId: me, provider: "password", providerAccountId: "me@ox.ac.uk",
    });
    const session = await ctx.db.insert("authSessions", { userId: me, expirationTime: Date.now() + 1e6 });
    await ctx.db.insert("authRefreshTokens", { sessionId: session, expirationTime: Date.now() + 1e6 });
    return { me, guest, host, hosted, pastHosted, joined, pending, account };
  });
}

describe("deleteMyAccount", () => {
  test("impact lists hosted and joined upcoming formals", async () => {
    const t = convexTest(schema, modules);
    const s = await seed(t);
    const impact = await t.withIdentity({ subject: `${s.me}|session` })
      .query(api.accountDeletion.getDeletionImpact, {});
    expect(impact).toMatchObject({
      email: "me@ox.ac.uk",
      hosting: [{ listingId: s.hosted, college: "Worcester", guestCount: 1 }],
      joined: [{ listingId: s.joined, college: "Magdalen" }],
      pendingRequests: 1,
    });
  });

  test("rejects a wrong confirmation email", async () => {
    const t = convexTest(schema, modules);
    const s = await seed(t);
    await expect(
      t.withIdentity({ subject: `${s.me}|session` })
        .mutation(api.accountDeletion.deleteMyAccount, { confirmEmail: "nope@ox.ac.uk" }),
    ).rejects.toThrow("doesn't match");
  });

  test("deletes personal data, tidies formals, keeps a placeholder", async () => {
    vi.useFakeTimers();
    const t = convexTest(schema, modules);
    const s = await seed(t);
    await t.withIdentity({ subject: `${s.me}|session` })
      .mutation(api.accountDeletion.deleteMyAccount, { confirmEmail: " ME@ox.ac.uk " });

    await t.run(async (ctx) => {
      const me = await ctx.db.get(s.me);
      expect(me).toMatchObject({ name: "Deleted user" });
      expect(me?.deletedAt).toBeTypeOf("number");
      expect(me?.email).toBeUndefined();
      expect(me?.dietaryRequirements).toBeUndefined();

      expect(await ctx.db.get(s.hosted)).toBeNull();
      expect(await ctx.db.get(s.pastHosted)).not.toBeNull();
      const joined = await ctx.db.get(s.joined);
      expect(joined?.members).toEqual([s.host]);
      expect(joined?.seatsAvailable).toBe(1);
      expect((await ctx.db.get(s.pending))?.status).toBe("declined");

      for (const table of ["collegeWishlists", "feedLikes", "feedBookmarks", "pushTokens", "userBadges", "authAccounts", "authSessions", "authRefreshTokens"] as const) {
        expect(await ctx.db.query(table).collect()).toHaveLength(0);
      }
      const scheduled = await ctx.db.system.query("_scheduled_functions").collect();
      expect(scheduled).toHaveLength(1);
      expect(scheduled[0].args[0]).toEqual({
        notices: expect.arrayContaining([
          { kind: "hostLeft", toEmail: "guest@ox.ac.uk", college: "Worcester", dateTime: FUTURE },
          { kind: "guestLeft", toEmail: "host@ox.ac.uk", college: "Magdalen", dateTime: FUTURE },
        ]),
      });
    });
    vi.useRealTimers();
  });

  test("an unauthenticated caller cannot delete anything", async () => {
    const t = convexTest(schema, modules);
    await seed(t);
    await expect(
      t.mutation(api.accountDeletion.deleteMyAccount, { confirmEmail: "me@ox.ac.uk" }),
    ).rejects.toThrow("Not authenticated");
  });
});
```

- [ ] **Step 2:** `npm test` → FAIL (`api.accountDeletion` missing).
- [ ] **Step 3: Implement** `convex/accountDeletion.ts`:

```ts
import { v } from "convex/values";
import { internal } from "./_generated/api";
import type { Doc, Id } from "./_generated/dataModel";
import { mutation, query, type MutationCtx, type QueryCtx } from "./_generated/server";
import { optionalUserId, requireUser } from "./guards";
import {
  declinePendingRequestsForListing,
  deleteMenuPdfIfPresent,
  listingIsPast,
} from "./listingHelpers";
import { removeUserFromListingGroup } from "./listingMembership";

const MAX_ROWS = 1000;

type Notice = {
  kind: "hostLeft" | "guestLeft";
  toEmail: string;
  college: string;
  dateTime: string;
};

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/** Upcoming formals the user hosts, and upcoming formals they joined as a guest. */
async function upcomingFormals(ctx: QueryCtx | MutationCtx, userId: Id<"users">) {
  const nowMs = Date.now();
  const owned = await ctx.db
    .query("listings")
    .withIndex("by_ownerUserId", (q) => q.eq("ownerUserId", userId))
    .take(MAX_ROWS);
  const hosting = owned.filter((l) => !listingIsPast(l.dateTime, nowMs));

  const candidateIds = new Set<Id<"listings">>();
  const sent = await ctx.db
    .query("requests")
    .withIndex("by_fromUserId", (q) => q.eq("fromUserId", userId))
    .take(MAX_ROWS);
  for (const r of sent) if (r.status === "accepted") candidateIds.add(r.targetListingId);
  const received = await ctx.db
    .query("requests")
    .withIndex("by_toUserId", (q) => q.eq("toUserId", userId))
    .take(MAX_ROWS);
  for (const r of received) {
    if (r.status === "accepted" && r.offeringListingId) candidateIds.add(r.offeringListingId);
  }
  const joined: Doc<"listings">[] = [];
  for (const id of candidateIds) {
    const l = await ctx.db.get(id);
    if (l && l.ownerUserId !== userId && l.members.includes(userId) && !listingIsPast(l.dateTime, nowMs)) {
      joined.push(l);
    }
  }
  return { hosting, joined, sent, received };
}

export const getDeletionImpact = query({
  args: {},
  returns: v.union(
    v.null(),
    v.object({
      email: v.string(),
      hosting: v.array(v.object({
        listingId: v.id("listings"), college: v.string(), dateTime: v.string(), guestCount: v.number(),
      })),
      joined: v.array(v.object({
        listingId: v.id("listings"), college: v.string(), dateTime: v.string(),
      })),
      pendingRequests: v.number(),
    }),
  ),
  handler: async (ctx) => {
    const userId = await optionalUserId(ctx);
    if (!userId) return null;
    const user = await ctx.db.get(userId);
    if (!user || user.deletedAt !== undefined || !user.email) return null;
    const { hosting, joined, sent, received } = await upcomingFormals(ctx, userId);
    return {
      email: user.email,
      hosting: hosting.map((l) => ({
        listingId: l._id, college: l.college, dateTime: l.dateTime,
        guestCount: l.members.filter((m) => m !== userId).length,
      })),
      joined: joined.map((l) => ({ listingId: l._id, college: l.college, dateTime: l.dateTime })),
      pendingRequests: [...sent, ...received].filter((r) => r.status === "pending").length,
    };
  },
});

async function emailOf(ctx: MutationCtx, id: Id<"users">): Promise<string | null> {
  const u = await ctx.db.get(id);
  return u && u.deletedAt === undefined && u.email ? u.email : null;
}

export const deleteMyAccount = mutation({
  args: { confirmEmail: v.string() },
  returns: v.null(),
  handler: async (ctx, { confirmEmail }) => {
    const { userId, user } = await requireUser(ctx);
    if (!user.email || normalizeEmail(confirmEmail) !== normalizeEmail(user.email)) {
      throw new Error("That email doesn't match your account.");
    }

    const notices: Notice[] = [];
    const { hosting, joined, sent, received } = await upcomingFormals(ctx, userId);

    // 1. Upcoming formals they host: cancel, and tell each guest.
    for (const listing of hosting) {
      for (const guestId of listing.members) {
        if (guestId === userId) continue;
        const toEmail = await emailOf(ctx, guestId);
        if (toEmail) notices.push({ kind: "hostLeft", toEmail, college: listing.college, dateTime: listing.dateTime });
      }
      await declinePendingRequestsForListing(ctx, listing._id);
      await deleteMenuPdfIfPresent(ctx, listing.menuPdfId);
      await ctx.db.delete(listing._id);
    }

    // 2. Upcoming formals they joined: free the seat, and tell the host.
    for (const listing of joined) {
      await removeUserFromListingGroup(ctx, listing._id, userId);
      const toEmail = await emailOf(ctx, listing.ownerUserId);
      if (toEmail) notices.push({ kind: "guestLeft", toEmail, college: listing.college, dateTime: listing.dateTime });
    }

    // 3. Any request still pending, sent or received, is declined.
    for (const r of [...sent, ...received]) {
      const fresh = await ctx.db.get(r._id);
      if (fresh?.status === "pending") await ctx.db.patch(r._id, { status: "declined" });
    }

    // 4. Personal rows.
    const byUser = async <T extends "collegeWishlists" | "feedLikes" | "feedBookmarks" | "pushTokens" | "userBadges">(table: T) => {
      const rows = await ctx.db.query(table).withIndex("by_userId", (q) => q.eq("userId", userId)).take(MAX_ROWS);
      for (const row of rows) await ctx.db.delete(row._id);
    };
    await byUser("collegeWishlists");
    await byUser("feedLikes");
    await byUser("feedBookmarks");
    await byUser("pushTokens");
    await byUser("userBadges");
    const files = await ctx.db
      .query("uploadedFiles")
      .withIndex("by_ownerUserId", (q) => q.eq("ownerUserId", userId))
      .take(MAX_ROWS);
    for (const f of files) await ctx.db.delete(f._id);

    // 5. Sign-in records: accounts (+ codes) and sessions (+ refresh tokens).
    const accounts = await ctx.db
      .query("authAccounts")
      .withIndex("userIdAndProvider", (q) => q.eq("userId", userId))
      .take(MAX_ROWS);
    for (const a of accounts) {
      const codes = await ctx.db.query("authVerificationCodes").withIndex("accountId", (q) => q.eq("accountId", a._id)).take(MAX_ROWS);
      for (const c of codes) await ctx.db.delete(c._id);
      await ctx.db.delete(a._id);
    }
    const sessions = await ctx.db
      .query("authSessions")
      .withIndex("userId", (q) => q.eq("userId", userId))
      .take(MAX_ROWS);
    for (const s of sessions) {
      const tokens = await ctx.db.query("authRefreshTokens").withIndex("sessionId", (q) => q.eq("sessionId", s._id)).take(MAX_ROWS);
      for (const tok of tokens) await ctx.db.delete(tok._id);
      await ctx.db.delete(s._id);
    }

    // 6. Scrub the profile to a placeholder that messages and reviews can still point at.
    await ctx.db.replace(userId, { name: "Deleted user", deletedAt: Date.now() });

    if (notices.length > 0) {
      await ctx.scheduler.runAfter(0, internal.emails.sendAccountDeletionNotices, { notices });
    }
    return null;
  },
});
```

- [ ] **Step 4:** `npm test` → PASS (Task 4's action must exist for `internal.emails.sendAccountDeletionNotices` to typecheck — do Task 4 Step 3 first if tsc complains, then rerun).
- [ ] **Step 5:** Commit: `FEAT: Account deletion backend (impact preview + delete)`.

### Task 4: Notification emails

**Files:** Modify `convex/emails.ts`.

**Consumes:** `Notice` shape from Task 3.

- [ ] **Step 1: Failing test** — append to `convex/accountDeletion.test.ts`:

```ts
import { buildAccountDeletionNoticeText } from "./emails";

test("notice copy", () => {
  expect(buildAccountDeletionNoticeText({ kind: "hostLeft", formalLabel: "Worcester · Sat 12 Oct · 7pm" }))
    .toContain("The host of your Worcester · Sat 12 Oct · 7pm formal has left Oxformals, so the formal is cancelled.");
  expect(buildAccountDeletionNoticeText({ kind: "guestLeft", formalLabel: "Keble · Sun 3 Nov · 7pm" }))
    .toContain("A guest has left your Keble · Sun 3 Nov · 7pm formal, so a seat is free again.");
});
```

- [ ] **Step 2:** `npm test` → FAIL.
- [ ] **Step 3: Implement** in `convex/emails.ts` (reuses `formatListingDate`, `escapeHtml`, `ResendAPI`, and the review-reminder email's layout):

```ts
const accountDeletionNoticeValidator = v.object({
  kind: v.union(v.literal("hostLeft"), v.literal("guestLeft")),
  toEmail: v.string(),
  college: v.string(),
  dateTime: v.string(),
});

type NoticeCopy = { kind: "hostLeft" | "guestLeft"; formalLabel: string };

function accountDeletionSentence({ kind, formalLabel }: NoticeCopy): string {
  return kind === "hostLeft"
    ? `The host of your ${formalLabel} formal has left Oxformals, so the formal is cancelled.`
    : `A guest has left your ${formalLabel} formal, so a seat is free again.`;
}

export function buildAccountDeletionNoticeText(copy: NoticeCopy): string {
  return `${accountDeletionSentence(copy)}

${copy.kind === "hostLeft" ? `Find another formal: ${siteUrl()}/?tab=browse` : `See your formal: ${siteUrl()}/?tab=requests&section=listings`}

For inquiries or issues, contact us at team@oxformals.com.

See you at dinner,
The Oxformals Team`;
}

function buildAccountDeletionNoticeHtml(copy: NoticeCopy): string {
  // Same shell as buildReviewReminderEmailHtml: header "Oxformals", one paragraph, one CTA.
  const cta = copy.kind === "hostLeft"
    ? { href: `${siteUrl()}/?tab=browse`, label: "Find another formal" }
    : { href: `${siteUrl()}/?tab=requests&section=listings`, label: "See your formal" };
  return buildSimpleNoticeHtml({ title: "A change to your formal", body: accountDeletionSentence(copy), cta });
}

export const sendAccountDeletionNotices = internalAction({
  args: { notices: v.array(accountDeletionNoticeValidator) },
  returns: v.null(),
  handler: async (_ctx, { notices }) => {
    const apiKey = process.env.AUTH_RESEND_KEY;
    if (!apiKey) {
      console.error("sendAccountDeletionNotices: AUTH_RESEND_KEY is not set");
      return null;
    }
    const resend = new ResendAPI(apiKey);
    for (const n of notices) {
      const copy: NoticeCopy = { kind: n.kind, formalLabel: `${n.college} · ${formatListingDate(n.dateTime)}` };
      const { error } = await resend.emails.send({
        from: "Oxformals <team@oxformals.com>",
        to: [n.toEmail],
        subject: n.kind === "hostLeft" ? "Your formal has been cancelled" : "A seat is free at your formal",
        html: buildAccountDeletionNoticeHtml(copy),
        text: buildAccountDeletionNoticeText(copy),
      });
      if (error) console.error("sendAccountDeletionNotices: Resend error", error);
    }
    return null;
  },
});
```

`buildSimpleNoticeHtml({ title, body, cta })` is the review-reminder HTML (`buildReviewReminderEmailHtml`) with its title, subtitle "How was dinner?" → `title`, paragraph → `body`, pink formal box removed, and button → `cta`; extract it as a local function and escape all three inputs with `escapeHtml`.

- [ ] **Step 4:** `npm test` → PASS; `npx tsc --noEmit` clean.
- [ ] **Step 5:** Commit: `FEAT: Email guests and hosts when an account is deleted`.

### Task 5: Web confirmation screen

**Files:** Create `components/DeleteAccountModal.tsx`; modify `components/SettingsModal.tsx`.

**Consumes:** `api.accountDeletion.getDeletionImpact`, `api.accountDeletion.deleteMyAccount`, `useAuth().signOut`.

- [ ] **Step 1:** Create `components/DeleteAccountModal.tsx`: a `Modal` titled "Delete account" that
  - loads `useQuery(api.accountDeletion.getDeletionImpact, open ? {} : "skip")`;
  - lists `hosting` as "You're hosting {college} on {date} with {n} guest(s)", `joined` as "You're a guest at {college} on {date}", and "{n} pending request(s) will be declined" when > 0 (dates via the existing `formatListingDate`-style helper in `lib/`);
  - shows "Your profile and personal data are deleted. Messages and reviews stay, shown as 'Deleted user'. This can't be undone.";
  - has an email input ("Type {email} to confirm"), enabling the red button only when `input.trim().toLowerCase() === impact.email.toLowerCase()`;
  - on click: `await deleteMyAccount({ confirmEmail: input })`, then `await signOut()` and `router.push("/")`; errors render in `text-[var(--danger)]`.
- [ ] **Step 2:** In `SettingsModal.tsx`, after the password section, add a divider and a `text-[var(--danger)]` text button "Delete account" that closes Settings and opens `DeleteAccountModal`.
- [ ] **Step 3:** `npx tsc --noEmit`, `npx eslint components/DeleteAccountModal.tsx components/SettingsModal.tsx`.
- [ ] **Step 4:** Deploy backend to dev (`npx convex dev --once`) and walk through on `localhost:3000` with a throwaway dev account: impact list, disabled button until the email matches, deletion signs out and lands on `/`.
- [ ] **Step 5:** Commit: `FEAT: Delete account from Settings (web)`.

### Task 6: Mobile confirmation screen

**Files:** Create `src/components/settings/DeleteAccountSheet.tsx`; modify `src/components/settings/SettingsModal.tsx`.

- [ ] **Step 1:** Reference functions without the stale generated API:

```ts
import { makeFunctionReference } from "convex/server";

type Impact = null | {
  email: string;
  hosting: { listingId: string; college: string; dateTime: string; guestCount: number }[];
  joined: { listingId: string; college: string; dateTime: string }[];
  pendingRequests: number;
};
const getDeletionImpact = makeFunctionReference<"query", Record<string, never>, Impact>(
  "accountDeletion:getDeletionImpact",
);
const deleteMyAccount = makeFunctionReference<"mutation", { confirmEmail: string }, null>(
  "accountDeletion:deleteMyAccount",
);
```

- [ ] **Step 2:** Build `DeleteAccountSheet` with the same content as the web modal using the app's `OxModal`/`OxInput`/`OxButton` components, then `signOut()` and `router.replace("/login")`.
- [ ] **Step 3:** Add a red "Delete account" link at the bottom of mobile `SettingsModal` that opens it.
- [ ] **Step 4:** `npx tsc --noEmit` (only pre-existing errors), eslint on both files; walk through in the iOS Simulator against dev.
- [ ] **Step 5:** Commit: `FEAT: Delete account from Settings (mobile)`.
