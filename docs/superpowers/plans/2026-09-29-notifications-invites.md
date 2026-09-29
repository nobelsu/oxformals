# Notifications and Invites Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give Oxformals a notification bell (with web push, email routing and per-category settings), then personal invite links, seat links in group booking, referral credits and "People you may know".

**Architecture:** Every event calls one helper, `notify(ctx, …)`, inside the mutation where it happens. It writes a `notifications` row (skipping self-notifications, deleted users and repeats within 24h) and schedules `notificationDelivery.deliver`, a `"use node"` action that reads a delivery plan (push/email gated by `users.notificationPrefs`) and sends web push (`web-push`), Expo push (existing sender) and email (existing templates, or the shared `renderEmail` template). One pure module, `convex/notificationCopy.ts`, renders every kind for the bell, push and email. Part 2 adds `inviteCodes`, `referrals` and `seatLinks`, a `"link"` party seat kind, and two public pages (`/i/[code]`, `/s/[token]`) whose code is carried through sign-in in a first-party cookie and claimed by a global client component.

**Tech Stack:** Convex (queries, mutations, internal actions, scheduler, crons), `web-push` (Node action), Resend, Next.js 16 App Router (client components, `public/sw.js`), Tailwind v4 with theme CSS variables, vitest + convex-test (`npx vitest run`).

**Spec:** `docs/superpowers/specs/2026-09-29-notifications-invites-design.md`. Mockup: `notif-body.html` (bell panel option A, alerts prompt, settings grid).

## Global Constraints

- Two parts, shipped in order: Part 1 notifications (Tasks 1–13), then Part 2 invites (Tasks 14–23). Part 2 builds on `notify`.
- Every task ends green (`npx vitest run`) and committed. Commit messages: `FEAT: ...` or `FIX: ...`, ending with the line `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Only `git add` the specific files the task lists; never `git add -A` or `git add .`.
- Backend pushes go to DEV only: `npx convex dev --once`. Never `--prod`, never `npx convex deploy`.
- Read `convex/_generated/ai/guidelines.md` before touching Convex code (its rules override training data): argument validators on every function, `withIndex` not `filter`, bounded `.take(n)`, `"use node"` files export only actions, index names list every field.
- Read the relevant guide in `node_modules/next/dist/docs/` before using a Next API. This repo's auth runs in `proxy.ts` (Next 16's renamed middleware) via `convexAuthNextjsMiddleware`; public routes are listed in its `isPublicRoute` matcher. Dynamic route `params` is a `Promise` (`const { code } = await params`).
- Web push uses the `web-push` npm package inside a `"use node"` Convex action. VAPID keys come from `npx web-push generate-vapid-keys`, are set on DEV with `npx convex env set VAPID_PUBLIC_KEY …` / `VAPID_PRIVATE_KEY …`; the private key is never committed or pasted into chat. The public key also goes in `NEXT_PUBLIC_VAPID_PUBLIC_KEY` in `.env.local` (gitignored) and in Vercel's Preview environment — the Vercel step needs the user.
- Notification data model (verbatim from spec): `notifications { userId, category, kind, actorId?, listingId?, requestId?, data?, dedupeKey, readAt?, createdAt }`; categories `bookings | invites | social | credits`; indexes `by_userId_and_createdAt`, `by_userId_and_readAt`, `by_userId_and_dedupeKey`, `by_createdAt`. `webPushSubscriptions { userId, endpoint, p256dh, auth, createdAt }`, indexes `by_userId`, `by_endpoint`.
- Kinds (fixed): bookings `request_received`, `request_accepted`, `request_declined`, `formal_cancelled`, `swap_undone`; invites `party_invite`, `party_response`, `seat_link_claimed`; social `new_follower`, `follow_request`, `now_friends`, `invite_joined`; credits `credit_earned`, `credit_paid_out`, `formal_tomorrow`, `wishlist_listing`.
- Dedupe: same `dedupeKey` for the same user within 24h is skipped.
- Pref defaults when `notificationPrefs` is absent: push on for all four categories; email on for bookings and invites, off for social and credits; if legacy `emailNotifications === false`, all email off. `pushChatAlerts` keeps controlling Expo chat pushes; web chat pushes follow `push.social`.
- Chat messages never create bell rows.
- Retention: notifications older than 90 days are deleted daily (batched). Formal reminders at 09:00 London.
- UI: calm colours. No tinted unread rows, only a small accent dot. Ink primary buttons (`bg-[var(--ink)] text-[var(--bg)]`), outline secondary (`border-[var(--ink)] bg-[var(--paper)]`). Outlined bell. No emojis. Short copy. No dashed or dotted lines. Theme CSS vars only (`--bg`, `--paper`, `--ink`, `--ink-muted`, `--accent`, plus the nav's `--nav-ink`/`--nav-bg`).
- Emails: a separate effort owns `convex/emailTemplate.ts`: `renderEmail({ title, eyebrow, heading, body?, ticket?: { college, when, tag?, quote? }, code?, cta?: { href, label }, secondary?: { href, label }, note? })` (HTML) and `renderEmailText(sameInput)` (plain text). This plan does not create it; new emails call it. Task 4 needs it — if `convex/emailTemplate.ts` isn't on the branch yet, stop and ask the user.
- Don't assume users have a phone number (a GDPR pass is making it optional).
- Other sessions are tightening copy and doing a GDPR pass in some of the same files (`SettingsModal.tsx`, `JoinRequestFlow.tsx`, `IncomingRequestRow.tsx`, `ProfileView.tsx`, `schema.ts`). If a "replace this" snippet no longer matches exactly, apply the same change to the equivalent block and keep their edits; never revert them.
- `convex/_generated/api.d.ts` is tracked in git: commit it after `npx convex dev --once` regenerates it (only that file).
- Group limits: `MAX_GUESTS` is 4 (`convex/seats.ts`, derived from `MAX_GROUP_SIZE` 6 in `convex/groupSize.ts`). Link seats count towards it.
- Tests never run scheduled functions (they call web-push, Expo and Resend). Task 1 turns fake timers on for every test file.
- Seat links: 48h expiry; invite cookie 30 days; invite codes 6 characters from `abcdefghjkmnpqrstuvwxyz23456789`; referral cap 5 earned per inviter; PYMK score = 3 × mutual friends + 2 × shared formals + 1 × same college, limit 10.

---

## File structure

**Part 1 — backend (`convex/`)**
- Create `notificationKinds.ts` — kinds, categories, validators, `categoryOf`. Pure; imported by schema and the client.
- Create `notificationPrefs.ts` — prefs validator, `resolvePrefs`, `pushAllowed`, `emailAllowed`. Pure.
- Create `notificationCopy.ts` — `renderNotification`, `notificationEmail`, `relativeTime`, `formalDay`, `formalWhen`. Pure; shared by bell, push and email.
- Create `notify.ts` — the `notify` helper and `dedupeKeyFor`.
- Create `notifications.ts` — `loadView`, bell queries/mutations, prefs, web push subscriptions, `getDeliveryPlan`, reminder + retention crons' mutations.
- Create `webPushCore.ts` — `sendToSubscriptions` (sender injected, so it's testable).
- Create `expoPush.ts` — `deliverExpoPushMessages` moved out of `pushNotifications.ts` so the Node action can import it.
- Create `notificationDelivery.ts` — `"use node"`: `deliver`, `sendChatWebPush`.
- Create `londonTime.ts` — `londonHour`, `londonDayRange`.
- Modify `schema.ts`, `listings.ts`, `partyInvites.ts`, `swapLinks.ts`, `follows.ts`, `credits.ts`, `emails.ts`, `emailNotifications.ts`, `pushNotifications.ts`, `chat.ts`, `crons.ts`, `accountDeletion.ts`.
- Tests: `notificationPrefs.test.ts`, `notificationCopy.test.ts`, `notify.test.ts`, `webPushCore.test.ts`, `notificationEmails.test.ts`, `notifications.test.ts`, `bookingNotifications.test.ts`, `socialNotifications.test.ts`, `reminders.test.ts`, `chatWebPush.test.ts`; update `swapLinks.test.ts`.
- Create `test/setup.ts` (outside `convex/` so Convex never bundles it); modify `vitest.config.ts`.

**Part 1 — web**
- Create `public/sw.js`, `lib/push/webPush.ts`.
- Create `components/notifications/NotificationBell.tsx`, `NotificationPanel.tsx`, `NotificationRow.tsx`, `AlertsPrompt.tsx`, `NotificationSettings.tsx`, `BellIcon.tsx`.
- Modify `components/Nav.tsx`, `components/SettingsModal.tsx`, `components/ui/EmptyState.tsx`, `next.config.ts`.

**Part 2 — backend**
- Create `randomCode.ts`, `invites.ts`, `referrals.ts`, `seatLinks.ts`, `peopleYouMayKnow.ts`.
- Modify `schema.ts`, `seats.ts`, `follows.ts`, `credits.ts`, `formalAttendance.ts`, `listings.ts`, `accountDeletion.ts`.
- Tests: `seats.test.ts`, `invites.test.ts`, `referrals.test.ts`, `seatLinkFlow.test.ts`, `peopleYouMayKnow.test.ts`.

**Part 2 — web**
- Create `lib/invites/cookies.ts`, `lib/invites/share.ts`.
- Create `app/i/[code]/page.tsx`, `app/s/[token]/page.tsx`.
- Create `components/invites/InviteLanding.tsx`, `SeatLinkLanding.tsx`, `InviteClaimer.tsx`, `InviteFriendsButton.tsx`, `PeopleYouMayKnow.tsx`, `SeatLinksModal.tsx`.
- Modify `proxy.ts`, `app/layout.tsx`, `components/swap/JoinRequestFlow.tsx`, `components/data/DataProvider.tsx`, `lib/data/types.ts`, `lib/data/party.ts`, `components/swap/IncomingRequestRow.tsx`, `components/swap/ProfileView.tsx`, `components/feed/FeedTab.tsx`, `components/feed/FeedSidebar.tsx`.

## Spec decisions made while planning

These resolve gaps in the spec; each is marked where it's implemented.

1. **Wishlist emails go off by default.** `wishlist_listing` is in `credits`, whose email default is off, so existing users stop getting wishlist emails unless they turn "Credits & reminders" email on. This is what the spec's defaults say.
2. **Review-reminder emails** (not in the spec) follow `email.credits` once a user has saved new prefs; until then they keep the legacy `emailNotifications` switch (`emailNotificationsEnabled`, Task 4).
3. **Which kinds email:** `request_received` (existing template), `wishlist_listing` (existing template), and on the shared template `party_invite`, `party_response`, `formal_cancelled`, `swap_undone`, `request_accepted` (replaces the "Your swap is on" notice). Everything else is bell + push only.
4. **Formal notices without a kind** — "You were removed from a formal" and "Your swap partner left" — stay as transactional `sendFormalNotices` emails, unchanged.
5. **`request_declined`** is also sent when a request is auto-declined because the formal filled up (`declinePendingWhenFull`), not only on the host's explicit decline.
6. **`approveFollower`** sends `now_friends` only when it makes the pair mutual (no "approved" kind exists).
7. **`credit_earned`** goes to the host when a credit hold is taken (`data.pending: true`, one row per request with `count`), and to an inviter when a referral pays (`data.reason: "referral"`). `credit_paid_out` is one row per host per listing per settle run.
8. **Formal reminders** go to every member of an active/confirmed/closed listing dated tomorrow (London) that has at least one guest; a host alone gets none. The cron runs at 08:00 and 09:00 UTC and only acts when it's 09:00 in London (handles BST/GMT).
9. **Expo pushes** for bell notifications carry `{ url, notificationId, kind }` where `url` is a web path; the mobile app doesn't route these yet (mobile bell UI is out of scope).
10. **"New account" for an invite link:** the account was created at or after the cookie's first-open time, that time is at or after the code's creation, and the account is under 30 days old. For seat links: account created at or after the seat link's `createdAt` (server-side).
11. **Existing users claiming an invite** become friends; the inviter gets `now_friends` (if they weren't already friends), no referral.
12. **Referrals past the cap of 5** are recorded with status `"void"` (the spec's third status) and pay nothing. A referral whose inviter was deleted is also voided.
13. **"Completed formal" for referrals:** a settled credit hold where the invitee is the seat holder or the host (`settleDueHolds`), or a guest's attendance confirmation on a listing where their seat wasn't credit-paid and nothing is disputed (`confirmAttendance`).
14. **Link seats** store extra optional fields on the party entry (`token`, `expiresAt`, `paysOwn`) with `kind: "link"`, `payerId` = requester until claimed, `response: "pending"`. On claim they become a normal `"friend"` seat (payer = the claimer if `paysOwn`, else the requester), so the existing named-friend rule applies from then on: the host is blocked while any link seat is unclaimed, and after claiming only while a self-paying friend hasn't said "I'm in".
15. **Link seats paid by "Them"** don't count against the requester's credit balance at send time.
16. **Seat link claim** also works for an already signed-in user (the `/s/[token]` page claims directly); signed-out users get a cookie and are claimed by `InviteClaimer` after sign-in.
17. **PYMK "mutual friends"** is approximated as "people I follow (active) who follow the candidate (active)", bounded to 40 × 40 reads; same-college candidates need a new `users.by_college` index.
18. **The alerts prompt** is "shown once" per browser: "Not now" is remembered in `localStorage`; it also hides once the browser permission is no longer `"default"`. If permission is already granted, the bell silently keeps this browser's subscription saved (no prompt).

---
# Part 1 — Notifications

### Task 1: Notification kinds, preferences and tables

**Files:**
- Create: `convex/notificationKinds.ts`
- Create: `convex/notificationPrefs.ts`
- Modify: `convex/schema.ts`
- Create: `test/setup.ts`
- Modify: `vitest.config.ts`
- Test: `convex/notificationPrefs.test.ts`

**Interfaces:**
- Produces: `NotificationKind`, `NotificationCategory`, `NotificationData`, `categoryOf(kind)`, `notificationKindValidator`, `notificationCategoryValidator`, `notificationDataValidator` (from `convex/notificationKinds.ts`); `NotificationPrefs`, `NotificationChannel` (`"push" | "email"`), `notificationPrefsValidator`, `resolvePrefs(user)`, `pushAllowed(user, category)`, `emailAllowed(user, category)` (from `convex/notificationPrefs.ts`); tables `notifications`, `webPushSubscriptions`; `users.notificationPrefs`.

- [ ] **Step 1: Turn fake timers on for every test file**

Scheduled functions must never run under test (Task 3 makes almost every mutation schedule a delivery action that calls web-push, Expo and Resend). Some test files (e.g. `follows.test.ts`) don't use fake timers today, so do it globally.

Create `test/setup.ts`:

```ts
import { beforeEach, vi } from "vitest";

// Notification delivery, emails and pushes are scheduled functions that call
// web-push, Expo and Resend. With fake timers they stay queued in
// `_scheduled_functions` (tests can still inspect them) and never run.
beforeEach(() => {
  vi.useFakeTimers();
});
```

Modify `vitest.config.ts` to:

```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "edge-runtime",
    include: ["convex/**/*.test.ts"],
    setupFiles: ["./test/setup.ts"],
    server: { deps: { inline: ["convex-test"] } },
  },
});
```

Run: `npx vitest run`
Expected: all existing tests still PASS (66 at the time of writing).

- [ ] **Step 2: Write the failing prefs test**

Create `convex/notificationPrefs.test.ts`:

```ts
import { describe, expect, test } from "vitest";
import { emailAllowed, pushAllowed, resolvePrefs } from "./notificationPrefs";
import { categoryOf, NOTIFICATION_KINDS } from "./notificationKinds";

describe("notification prefs", () => {
  test("defaults: push everything, email bookings and invites", () => {
    expect(resolvePrefs({})).toEqual({
      push: { bookings: true, invites: true, social: true, credits: true },
      email: { bookings: true, invites: true, social: false, credits: false },
    });
  });

  test("legacy emailNotifications: false turns every email default off", () => {
    const user = { emailNotifications: false };
    expect(resolvePrefs(user).email).toEqual({
      bookings: false,
      invites: false,
      social: false,
      credits: false,
    });
    expect(pushAllowed(user, "bookings")).toBe(true);
  });

  test("saved prefs win over the legacy switch", () => {
    const user = {
      emailNotifications: false,
      notificationPrefs: {
        push: { bookings: false, invites: true, social: true, credits: true },
        email: { bookings: true, invites: true, social: true, credits: false },
      },
    };
    expect(pushAllowed(user, "bookings")).toBe(false);
    expect(emailAllowed(user, "social")).toBe(true);
    expect(emailAllowed(user, "credits")).toBe(false);
  });

  test("every kind belongs to exactly one category", () => {
    expect(NOTIFICATION_KINDS).toHaveLength(16);
    expect(categoryOf("party_invite")).toBe("invites");
    expect(categoryOf("wishlist_listing")).toBe("credits");
    expect(categoryOf("now_friends")).toBe("social");
    expect(categoryOf("swap_undone")).toBe("bookings");
  });
});
```

- [ ] **Step 3: Run it to verify it fails**

Run: `npx vitest run convex/notificationPrefs.test.ts`
Expected: FAIL — cannot resolve `./notificationPrefs`.

- [ ] **Step 4: Create `convex/notificationKinds.ts`**

```ts
import { v, type Infer } from "convex/values";

/**
 * Every notification has one kind, and each kind belongs to one category.
 * Categories are what people switch on and off in Settings.
 */

export const NOTIFICATION_CATEGORIES = [
  "bookings",
  "invites",
  "social",
  "credits",
] as const;
export type NotificationCategory = (typeof NOTIFICATION_CATEGORIES)[number];

export const KIND_CATEGORY = {
  request_received: "bookings",
  request_accepted: "bookings",
  request_declined: "bookings",
  formal_cancelled: "bookings",
  swap_undone: "bookings",
  party_invite: "invites",
  party_response: "invites",
  seat_link_claimed: "invites",
  new_follower: "social",
  follow_request: "social",
  now_friends: "social",
  invite_joined: "social",
  credit_earned: "credits",
  credit_paid_out: "credits",
  formal_tomorrow: "credits",
  wishlist_listing: "credits",
} as const satisfies Record<string, NotificationCategory>;

export type NotificationKind = keyof typeof KIND_CATEGORY;
export const NOTIFICATION_KINDS = Object.keys(KIND_CATEGORY) as NotificationKind[];

export function categoryOf(kind: NotificationKind): NotificationCategory {
  return KIND_CATEGORY[kind];
}

export const notificationCategoryValidator = v.union(
  v.literal("bookings"),
  v.literal("invites"),
  v.literal("social"),
  v.literal("credits"),
);

export const notificationKindValidator = v.union(
  v.literal("request_received"),
  v.literal("request_accepted"),
  v.literal("request_declined"),
  v.literal("formal_cancelled"),
  v.literal("swap_undone"),
  v.literal("party_invite"),
  v.literal("party_response"),
  v.literal("seat_link_claimed"),
  v.literal("new_follower"),
  v.literal("follow_request"),
  v.literal("now_friends"),
  v.literal("invite_joined"),
  v.literal("credit_earned"),
  v.literal("credit_paid_out"),
  v.literal("formal_tomorrow"),
  v.literal("wishlist_listing"),
);

/**
 * A snapshot of what the sentence needs, so a notification still reads right
 * after its listing is cancelled or edited.
 */
export const notificationDataValidator = v.object({
  college: v.optional(v.string()),
  dateTime: v.optional(v.string()),
  /** Seats in a request, or credits earned / paid out. */
  count: v.optional(v.number()),
  /** party_response: what the friend said. */
  response: v.optional(v.union(v.literal("in"), v.literal("out"))),
  /** credit_earned from a hold that pays out after the formal. */
  pending: v.optional(v.boolean()),
  /** credit_earned from an invite. */
  reason: v.optional(v.literal("referral")),
  /** party_invite: whether the friend pays for their own seat, and how. */
  paysOwn: v.optional(v.boolean()),
  method: v.optional(
    v.union(v.literal("swap"), v.literal("pay"), v.literal("credit")),
  ),
});
export type NotificationData = Infer<typeof notificationDataValidator>;
```

- [ ] **Step 5: Create `convex/notificationPrefs.ts`**

```ts
import { v, type Infer } from "convex/values";
import type { Doc } from "./_generated/dataModel";
import type { NotificationCategory } from "./notificationKinds";

const channelPrefsValidator = v.object({
  bookings: v.boolean(),
  invites: v.boolean(),
  social: v.boolean(),
  credits: v.boolean(),
});

export const notificationPrefsValidator = v.object({
  push: channelPrefsValidator,
  email: channelPrefsValidator,
});
export type NotificationPrefs = Infer<typeof notificationPrefsValidator>;
export type NotificationChannel = keyof NotificationPrefs;

type PrefsUser = Partial<
  Pick<Doc<"users">, "notificationPrefs" | "emailNotifications">
>;

/**
 * Saved prefs, or the defaults: push on for everything; email on for bookings
 * and invites only. Someone who had switched email off (legacy
 * `emailNotifications: false`) starts with every email off.
 */
export function resolvePrefs(user: PrefsUser): NotificationPrefs {
  if (user.notificationPrefs) return user.notificationPrefs;
  const emailOn = user.emailNotifications !== false;
  return {
    push: { bookings: true, invites: true, social: true, credits: true },
    email: { bookings: emailOn, invites: emailOn, social: false, credits: false },
  };
}

export function pushAllowed(user: PrefsUser, category: NotificationCategory): boolean {
  return resolvePrefs(user).push[category];
}

export function emailAllowed(user: PrefsUser, category: NotificationCategory): boolean {
  return resolvePrefs(user).email[category];
}
```

- [ ] **Step 6: Add the tables and the user field to `convex/schema.ts`**

Add imports at the top:

```ts
import {
  notificationCategoryValidator,
  notificationDataValidator,
  notificationKindValidator,
} from "./notificationKinds";
import { notificationPrefsValidator } from "./notificationPrefs";
```

In `users: defineTable({ ... })`, after `isPrivate: v.optional(v.boolean()),` add:

```ts
    /** Push/email per category. Absent means the defaults (see resolvePrefs). */
    notificationPrefs: v.optional(notificationPrefsValidator),
```

After the `creditHolds` table (last table), add:

```ts
  /**
   * The bell. One row per thing that happened to `userId`; `data` snapshots
   * what the sentence needs. Deleted after 90 days.
   */
  notifications: defineTable({
    userId: v.id("users"),
    category: notificationCategoryValidator,
    kind: notificationKindValidator,
    actorId: v.optional(v.id("users")),
    listingId: v.optional(v.id("listings")),
    requestId: v.optional(v.id("requests")),
    data: v.optional(notificationDataValidator),
    /** kind + the ids involved: a repeat within 24h is skipped. */
    dedupeKey: v.string(),
    readAt: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index("by_userId_and_createdAt", ["userId", "createdAt"])
    .index("by_userId_and_readAt", ["userId", "readAt"])
    .index("by_userId_and_dedupeKey", ["userId", "dedupeKey"])
    .index("by_createdAt", ["createdAt"]),
  /** Browser push subscriptions (one per browser the user allowed alerts in). */
  webPushSubscriptions: defineTable({
    userId: v.id("users"),
    endpoint: v.string(),
    p256dh: v.string(),
    auth: v.string(),
    createdAt: v.number(),
  })
    .index("by_userId", ["userId"])
    .index("by_endpoint", ["endpoint"]),
```

- [ ] **Step 7: Run the tests**

Run: `npx vitest run`
Expected: PASS, including the 4 new prefs tests.

- [ ] **Step 8: Regenerate Convex types on DEV**

Run: `npx convex dev --once`
Expected: "Convex functions ready!" (schema pushed to the dev deployment; `convex/_generated` updated). Never add `--prod`.

- [ ] **Step 9: Commit**

```bash
git add test/setup.ts vitest.config.ts convex/notificationKinds.ts convex/notificationPrefs.ts convex/notificationPrefs.test.ts convex/schema.ts convex/_generated/api.d.ts
git commit -m "FEAT: Notification kinds, preferences and tables

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Notification copy

**Files:**
- Create: `convex/notificationCopy.ts`
- Test: `convex/notificationCopy.test.ts`

**Interfaces:**
- Consumes: `NotificationKind`, `NotificationData` (Task 1).
- Produces:
  - `type NotificationView = { kind: NotificationKind; actorName: string | null; actorId?: string; listingId?: string; requestId?: string; data: NotificationData }`
  - `type Segment = { text: string; bold?: boolean }`
  - `renderNotification(view): { segments: Segment[]; title: string; body: string; url: string }`
  - `type NotificationEmailCopy = { subject: string; eyebrow: string; heading: string; body?: string; ticket?: { college: string; when: string; tag?: string }; cta: { label: string; path: string }; secondary?: { label: string; path: string } }`
  - `notificationEmail(view): NotificationEmailCopy | null` (non-null only for `EMAIL_NOTICE_KINDS`)
  - `EMAIL_NOTICE_KINDS: ReadonlySet<NotificationKind>`
  - `relativeTime(ms, nowMs): string`, `formalDay(iso?)`, `formalTime(iso)`, `formalWhen(iso?)`
  - URL constants: `FORMALS_URL = "/?tab=requests&section=overview"`, `BROWSE_URL = "/?tab=browse"`

- [ ] **Step 1: Write the failing test**

Create `convex/notificationCopy.test.ts`:

```ts
import { describe, expect, test } from "vitest";
import {
  notificationEmail,
  relativeTime,
  renderNotification,
  type NotificationView,
} from "./notificationCopy";

const THU = "2026-10-15T18:30:00.000Z"; // Thu 15 Oct, 7:30pm in London

const view = (v: Partial<NotificationView> & Pick<NotificationView, "kind">): NotificationView => ({
  actorName: "Maya",
  actorId: "u_maya",
  listingId: "l_1",
  requestId: "r_1",
  data: { college: "Worcester", dateTime: THU },
  ...v,
});

describe("renderNotification", () => {
  test("party invite names the friend and the formal", () => {
    const r = renderNotification(view({ kind: "party_invite" }));
    expect(r.body).toBe("Maya added you to their group for Worcester, Thu 15 Oct");
    expect(r.segments.filter((s) => s.bold).map((s) => s.text)).toEqual(["Maya", "Worcester"]);
    expect(r.url).toBe("/");
  });

  test("a request for several seats says so and opens the requests page", () => {
    const r = renderNotification(
      view({ kind: "request_received", actorName: "Tom", data: { college: "Keble", count: 3 } }),
    );
    expect(r.body).toBe("Tom wants 3 seats at your Keble formal");
    expect(r.title).toBe("New request");
    expect(r.url).toBe("/requests/l_1");
  });

  test("now friends links to their profile", () => {
    const r = renderNotification(view({ kind: "now_friends", actorName: "Priya", actorId: "u_p" }));
    expect(r.body).toBe("You and Priya are now friends.");
    expect(r.url).toBe("/profile/u_p");
  });

  test("payouts need no actor", () => {
    const r = renderNotification(
      view({ kind: "credit_paid_out", actorName: null, data: { college: "Keble", count: 2 } }),
    );
    expect(r.body).toBe("You earned 2 credits for hosting at Keble.");
  });

  test("a referral credit names who joined", () => {
    const r = renderNotification(
      view({ kind: "credit_earned", actorName: "Sam", data: { reason: "referral", count: 1 } }),
    );
    expect(r.body).toBe("You earned 1 credit. Sam went to their first formal.");
  });

  test("a missing actor reads as Someone", () => {
    const r = renderNotification(view({ kind: "new_follower", actorName: null }));
    expect(r.body).toBe("Someone followed you.");
  });
});

describe("notificationEmail", () => {
  test("party invite: ticket with the payment tag, I'm in and Not me", () => {
    const e = notificationEmail(
      view({ kind: "party_invite", data: { college: "Worcester", dateTime: THU, paysOwn: true, method: "credit" } }),
    );
    expect(e).toMatchObject({
      subject: "Maya wants to bring you to Worcester",
      eyebrow: "Group invite",
      heading: "Maya added you to their group",
      ticket: { college: "Worcester", tag: "You pay 1 credit" },
      cta: { label: "I'm in", path: "/" },
      secondary: { label: "Not me", path: "/" },
    });
    expect(e?.ticket?.when).toContain("Thu 15 Oct");
  });

  test("kinds without an email return null", () => {
    expect(notificationEmail(view({ kind: "new_follower" }))).toBeNull();
    expect(notificationEmail(view({ kind: "request_received" }))).toBeNull();
  });
});

describe("relativeTime", () => {
  const now = Date.parse("2026-10-15T12:00:00Z");
  test.each([
    [now - 30_000, "Now"],
    [now - 4 * 60_000, "4m"],
    [now - 2 * 3_600_000, "2h"],
    [now - 30 * 3_600_000, "Yesterday"],
    [now - 3 * 86_400_000, "3d"],
  ])("%s → %s", (ms, label) => {
    expect(relativeTime(ms, now)).toBe(label);
  });

  test("older than a week shows the date", () => {
    expect(relativeTime(now - 10 * 86_400_000, now)).toBe("5 Oct");
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run convex/notificationCopy.test.ts`
Expected: FAIL — cannot resolve `./notificationCopy`.

- [ ] **Step 3: Implement `convex/notificationCopy.ts`**

```ts
import type { NotificationData, NotificationKind } from "./notificationKinds";

/**
 * The words for every notification, in one place: the bell row (segments,
 * with names and colleges in bold), the push (title + body), and — for the
 * kinds that email — the email copy. Pure, so the client can import it too.
 */

export const FORMALS_URL = "/?tab=requests&section=overview";
export const BROWSE_URL = "/?tab=browse";

export type NotificationView = {
  kind: NotificationKind;
  /** First name of whoever caused it; null when nobody did (payouts, reminders). */
  actorName: string | null;
  actorId?: string;
  listingId?: string;
  requestId?: string;
  data: NotificationData;
};

export type Segment = { text: string; bold?: boolean };

export type RenderedNotification = {
  segments: Segment[];
  /** Push title. */
  title: string;
  /** Push body: the segments as plain text. */
  body: string;
  /** Where tapping it goes: a path on the web app. */
  url: string;
};

const b = (text: string): Segment => ({ text, bold: true });
const t = (text: string): Segment => ({ text });
const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

/** "Thu 15 Oct", in Oxford time. */
export function formalDay(iso: string | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "Europe/London",
  }).format(d);
}

/** "7:30 pm", in Oxford time. */
export function formalTime(iso: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: "Europe/London",
  }).format(new Date(iso));
}

/** "Thu 15 Oct · 7:30 pm", in Oxford time. */
export function formalWhen(iso: string | undefined): string {
  const day = formalDay(iso);
  if (!day || !iso) return day;
  return `${day} · ${formalTime(iso)}`;
}

export function renderNotification(n: NotificationView): RenderedNotification {
  const who = n.actorName ?? "Someone";
  const college = n.data.college ?? "a formal";
  const day = formalDay(n.data.dateTime);
  const count = n.data.count ?? 1;
  const profileUrl = n.actorId ? `/profile/${n.actorId}` : "/";

  let title: string;
  let segments: Segment[];
  let url: string;

  switch (n.kind) {
    case "request_received":
      title = "New request";
      segments = [
        b(who),
        t(count > 1 ? ` wants ${count} seats at your ` : " wants a seat at your "),
        b(college),
        t(" formal"),
      ];
      url = n.listingId ? `/requests/${n.listingId}` : FORMALS_URL;
      break;
    case "request_accepted":
      title = "You're going";
      segments = [b(who), t(" said yes. You're going to "), b(college), t(".")];
      url = FORMALS_URL;
      break;
    case "request_declined":
      title = "Request not accepted";
      segments = [t("Your request for "), b(college), t(" wasn't accepted.")];
      url = BROWSE_URL;
      break;
    case "formal_cancelled":
      title = "Formal cancelled";
      segments = [b(who), t(" cancelled their "), b(college), t(" formal.")];
      url = BROWSE_URL;
      break;
    case "swap_undone":
      title = "Swap undone";
      segments = [
        t("Your swap with "),
        b(who),
        t(" fell through, so your "),
        b(college),
        t(" seat was released."),
      ];
      url = BROWSE_URL;
      break;
    case "party_invite":
      title = "You're invited";
      segments = [
        b(who),
        t(" added you to their group for "),
        b(college),
        ...(day ? [t(`, ${day}`)] : []),
      ];
      url = "/";
      break;
    case "party_response":
      title = n.data.response === "in" ? "They're in" : "Group change";
      segments =
        n.data.response === "in"
          ? [b(who), t(" is in for "), b(college), t(".")]
          : [b(who), t(" can't make "), b(college), t(".")];
      url = FORMALS_URL;
      break;
    case "seat_link_claimed":
      title = "New in your group";
      segments = [b(who), t(" joined your group for "), b(college), t(".")];
      url = FORMALS_URL;
      break;
    case "new_follower":
      title = "New follower";
      segments = [b(who), t(" followed you.")];
      url = profileUrl;
      break;
    case "follow_request":
      title = "Follow request";
      segments = [b(who), t(" wants to follow you.")];
      url = "/?tab=mine";
      break;
    case "now_friends":
      title = "New friend";
      segments = [t("You and "), b(who), t(" are now friends.")];
      url = profileUrl;
      break;
    case "invite_joined":
      title = "Your invite worked";
      segments = [b(who), t(" joined from your invite.")];
      url = profileUrl;
      break;
    case "credit_earned":
      if (n.data.reason === "referral") {
        title = "Credit earned";
        segments = [t("You earned 1 credit. "), b(who), t(" went to their first formal.")];
      } else if (n.data.pending) {
        title = "Credit on the way";
        segments = [
          t(`You'll earn ${plural(count, "credit")} for hosting `),
          b(who),
          t(" at "),
          b(college),
          t("."),
        ];
      } else {
        title = "Credit earned";
        segments = [t(`You earned ${plural(count, "credit")}.`)];
      }
      url = FORMALS_URL;
      break;
    case "credit_paid_out":
      title = "Credits paid";
      segments = [t(`You earned ${plural(count, "credit")} for hosting at `), b(college), t(".")];
      url = FORMALS_URL;
      break;
    case "formal_tomorrow":
      title = "Tomorrow";
      segments = [
        b(college),
        t(n.data.dateTime ? ` is tomorrow at ${formalTime(n.data.dateTime)}.` : " is tomorrow."),
      ];
      url = FORMALS_URL;
      break;
    case "wishlist_listing":
      title = "New formal";
      segments = [b(who), t(" listed a formal at "), b(college), t(day ? `, ${day}.` : ".")];
      url = n.listingId ? `/?tab=browse&listing=${n.listingId}` : BROWSE_URL;
      break;
  }

  return { segments, title, body: segments.map((s) => s.text).join(""), url };
}

export type NotificationEmailCopy = {
  subject: string;
  eyebrow: string;
  heading: string;
  body?: string;
  ticket?: { college: string; when: string; tag?: string };
  cta: { label: string; path: string };
  secondary?: { label: string; path: string };
};

/**
 * Kinds emailed on the shared template. `request_received` and
 * `wishlist_listing` email too, on their own existing templates.
 */
export const EMAIL_NOTICE_KINDS: ReadonlySet<NotificationKind> = new Set<NotificationKind>([
  "party_invite",
  "party_response",
  "formal_cancelled",
  "swap_undone",
  "request_accepted",
]);

export function notificationEmail(n: NotificationView): NotificationEmailCopy | null {
  if (!EMAIL_NOTICE_KINDS.has(n.kind)) return null;
  const who = n.actorName ?? "Someone";
  const college = n.data.college ?? "your formal";
  const ticket = n.data.college
    ? { college: n.data.college, when: formalWhen(n.data.dateTime) }
    : undefined;
  const formals = { label: "See your formals", path: FORMALS_URL };
  const browse = { label: "Find another formal", path: BROWSE_URL };

  switch (n.kind) {
    case "party_invite": {
      const tag = n.data.paysOwn
        ? n.data.method === "credit"
          ? "You pay 1 credit"
          : "You pay the host"
        : `${who} is covering you`;
      return {
        subject: `${who} wants to bring you to ${college}`,
        eyebrow: "Group invite",
        heading: `${who} added you to their group`,
        ...(ticket ? { ticket: { ...ticket, tag } } : {}),
        cta: { label: "I'm in", path: "/" },
        secondary: { label: "Not me", path: "/" },
      };
    }
    case "party_response":
      return n.data.response === "in"
        ? {
            subject: `${who} is in`,
            eyebrow: "Group update",
            heading: `${who} is in`,
            body: `${who} confirmed their seat in your group for ${college}.`,
            ...(ticket ? { ticket } : {}),
            cta: formals,
          }
        : {
            subject: `${who} can't make it`,
            eyebrow: "Group update",
            heading: `${who} can't make it`,
            body: `${who} said "Not me", so your group request is one seat smaller. The rest of it still stands.`,
            ...(ticket ? { ticket } : {}),
            cta: formals,
          };
    case "formal_cancelled":
      return {
        subject: "Your formal has been cancelled",
        eyebrow: "Formal cancelled",
        heading: `${who} cancelled their formal`,
        body: `Your seat at ${college} is gone.`,
        ...(ticket ? { ticket } : {}),
        cta: browse,
      };
    case "swap_undone":
      return {
        subject: "Your swap was undone",
        eyebrow: "Swap undone",
        heading: `Your swap with ${who} fell through`,
        body: `Your seat at ${college} has been released too. Swaps are all or nothing: nobody keeps their half.`,
        ...(ticket ? { ticket } : {}),
        cta: browse,
      };
    case "request_accepted":
      return {
        subject: `You're going to ${college}`,
        eyebrow: "Request accepted",
        heading: `${who} said yes`,
        ...(ticket ? { ticket } : {}),
        cta: formals,
      };
    default:
      return null;
  }
}

/** "Now", "4m", "2h", "Yesterday", "3d", then "5 Oct". */
export function relativeTime(ms: number, nowMs: number): string {
  const minutes = Math.floor(Math.max(0, nowMs - ms) / 60_000);
  if (minutes < 1) return "Now";
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days}d`;
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    timeZone: "Europe/London",
  }).format(new Date(ms));
}
```

- [ ] **Step 4: Run the tests**

Run: `npx vitest run convex/notificationCopy.test.ts`
Expected: PASS (all tests). If the `"5 Oct"` or `"Thu 15 Oct"` assertions fail because of ICU differences, print the actual string and fix the formatter, not the test.

- [ ] **Step 5: Run the whole suite and commit**

Run: `npx vitest run`
Expected: PASS.

```bash
git add convex/notificationCopy.ts convex/notificationCopy.test.ts
git commit -m "FEAT: One place for notification wording

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---
### Task 3: `notify()` and push delivery

**Files:**
- Create: `convex/notify.ts`
- Create: `convex/notifications.ts` (first part: `loadView`, `getDeliveryPlan`, `removeWebPushSubscriptions`)
- Create: `convex/webPushCore.ts`
- Create: `convex/expoPush.ts`
- Create: `convex/notificationDelivery.ts` (`"use node"`)
- Modify: `convex/pushNotifications.ts` (import the Expo sender from `expoPush.ts`)
- Modify: `package.json`, `package-lock.json` (`web-push`, `@types/web-push`)
- Test: `convex/notify.test.ts`, `convex/webPushCore.test.ts`

**Interfaces:**
- Consumes: Task 1 validators/prefs, Task 2 `renderNotification`, `EMAIL_NOTICE_KINDS`, `NotificationView`.
- Produces:
  - `notify(ctx: MutationCtx, args: NotifyArgs): Promise<Id<"notifications"> | null>` where `type NotifyArgs = { userId: Id<"users">; kind: NotificationKind; actorId?: Id<"users">; listingId?: Id<"listings">; requestId?: Id<"requests">; data?: NotificationData }`
  - `dedupeKeyFor(args: NotifyArgs): string`, `DEDUPE_WINDOW_MS`
  - `loadView(ctx: QueryCtx | MutationCtx, n: Doc<"notifications">): Promise<NotificationView>` (exported from `convex/notifications.ts`)
  - `internal.notifications.getDeliveryPlan({ notificationId })` → `null | { push: null | { title, body, url, tag, webSubscriptions: {endpoint,p256dh,auth}[], expoTokens: string[] }, email: null | { type: "request", requestId } | { type: "wishlist", listingId, userId } | { type: "notice" } }`
  - `internal.notifications.removeWebPushSubscriptions({ endpoints: string[] })`
  - `sendToSubscriptions(subs, payload, send): Promise<string[]>` (gone endpoints), `type WebPushSubscription`, `type WebPushSender`
  - `deliverExpoPushMessages(ctx: ActionCtx, messages: PushMessage[])`, `type PushMessage` (from `convex/expoPush.ts`)
  - `internal.notificationDelivery.deliver({ notificationId })`
  - `sendWeb(ctx, subs, message)` (module-private in `notificationDelivery.ts`, reused by Task 9)

- [ ] **Step 1: Install web-push**

Run: `npm install web-push && npm install --save-dev @types/web-push`
Expected: both added to `package.json`.

- [ ] **Step 2: Write the failing tests**

Create `convex/notify.test.ts`:

```ts
/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { describe, expect, test, vi } from "vitest";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { notify } from "./notify";
import schema from "./schema";

const modules = import.meta.glob("./**/*.*s");

type T = ReturnType<typeof convexTest>;

async function makeUser(t: T, name: string, extra: Record<string, unknown> = {}) {
  return await t.run((ctx) =>
    ctx.db.insert("users", {
      name,
      email: `${name.toLowerCase()}@ox.ac.uk`,
      emailVerificationTime: 1,
      agreedToRules: true,
      college: "Keble",
      year: "2",
      role: "UG",
      ...extra,
    }),
  );
}

const rowsFor = (t: T, userId: Id<"users">) =>
  t.run((ctx) =>
    ctx.db
      .query("notifications")
      .withIndex("by_userId_and_createdAt", (q) => q.eq("userId", userId))
      .collect(),
  );

describe("notify", () => {
  test("inserts a row with its category and schedules delivery", async () => {
    const t = convexTest(schema, modules);
    const maya = await makeUser(t, "Maya");
    const priya = await makeUser(t, "Priya");
    const id = await t.run((ctx) =>
      notify(ctx, { userId: priya, kind: "new_follower", actorId: maya }),
    );
    expect(id).not.toBeNull();
    const rows = await rowsFor(t, priya);
    expect(rows).toMatchObject([
      { kind: "new_follower", category: "social", actorId: maya, dedupeKey: `new_follower:${maya}:::` },
    ]);
    const jobs = await t.run((ctx) => ctx.db.system.query("_scheduled_functions").collect());
    expect(jobs.map((j) => j.name)).toEqual(
      expect.arrayContaining([expect.stringContaining("deliver")]),
    );
  });

  test("never notifies you about yourself", async () => {
    const t = convexTest(schema, modules);
    const maya = await makeUser(t, "Maya");
    expect(
      await t.run((ctx) => notify(ctx, { userId: maya, kind: "new_follower", actorId: maya })),
    ).toBeNull();
    expect(await rowsFor(t, maya)).toHaveLength(0);
  });

  test("skips deleted users", async () => {
    const t = convexTest(schema, modules);
    const gone = await t.run((ctx) =>
      ctx.db.insert("users", { name: "Deleted user", deletedAt: 1 }),
    );
    expect(await t.run((ctx) => notify(ctx, { userId: gone, kind: "formal_tomorrow" }))).toBeNull();
  });

  test("the same thing twice within 24h is one notification", async () => {
    const t = convexTest(schema, modules);
    const maya = await makeUser(t, "Maya");
    const priya = await makeUser(t, "Priya");
    const once = () =>
      t.run((ctx) => notify(ctx, { userId: priya, kind: "new_follower", actorId: maya }));
    await once();
    await once();
    expect(await rowsFor(t, priya)).toHaveLength(1);
    vi.setSystemTime(Date.now() + 25 * 60 * 60 * 1000);
    await once();
    expect(await rowsFor(t, priya)).toHaveLength(2);
  });
});

describe("delivery plan", () => {
  async function seeded(extra: Record<string, unknown> = {}) {
    const t = convexTest(schema, modules);
    const maya = await makeUser(t, "Maya");
    const priya = await makeUser(t, "Priya", extra);
    await t.run(async (ctx) => {
      await ctx.db.insert("webPushSubscriptions", {
        userId: priya,
        endpoint: "https://push.example/abc",
        p256dh: "p",
        auth: "a",
        createdAt: Date.now(),
      });
      await ctx.db.insert("pushTokens", {
        userId: priya,
        token: "ExponentPushToken[x]",
        platform: "ios",
        updatedAt: Date.now(),
      });
    });
    return { t, maya, priya };
  }

  test("push goes to web and Expo; party invites also email", async () => {
    const { t, maya, priya } = await seeded();
    const id = await t.run((ctx) =>
      notify(ctx, {
        userId: priya,
        kind: "party_invite",
        actorId: maya,
        data: { college: "Worcester", dateTime: "2026-10-15T18:30:00.000Z" },
      }),
    );
    const plan = await t.query(internal.notifications.getDeliveryPlan, { notificationId: id! });
    expect(plan?.push).toMatchObject({
      title: "You're invited",
      url: "/",
      webSubscriptions: [{ endpoint: "https://push.example/abc", p256dh: "p", auth: "a" }],
      expoTokens: ["ExponentPushToken[x]"],
    });
    expect(plan?.email).toEqual({ type: "notice" });
  });

  test("prefs gate push and email per category", async () => {
    const { t, maya, priya } = await seeded({
      notificationPrefs: {
        push: { bookings: true, invites: false, social: true, credits: true },
        email: { bookings: true, invites: true, social: false, credits: false },
      },
    });
    const invite = await t.run((ctx) =>
      notify(ctx, { userId: priya, kind: "party_invite", actorId: maya }),
    );
    const follow = await t.run((ctx) =>
      notify(ctx, { userId: priya, kind: "new_follower", actorId: maya }),
    );
    const invitePlan = await t.query(internal.notifications.getDeliveryPlan, { notificationId: invite! });
    const followPlan = await t.query(internal.notifications.getDeliveryPlan, { notificationId: follow! });
    expect(invitePlan?.push).toBeNull();
    expect(invitePlan?.email).toEqual({ type: "notice" });
    expect(followPlan?.push).not.toBeNull();
    expect(followPlan?.email).toBeNull();
  });

  test("legacy emailNotifications: false stops the email", async () => {
    const { t, maya, priya } = await seeded({ emailNotifications: false });
    const id = await t.run((ctx) =>
      notify(ctx, { userId: priya, kind: "party_invite", actorId: maya }),
    );
    const plan = await t.query(internal.notifications.getDeliveryPlan, { notificationId: id! });
    expect(plan?.email).toBeNull();
    expect(plan?.push).not.toBeNull();
  });

  test("new requests and wishlist listings use their own email templates", async () => {
    const { t, maya, priya } = await seeded({
      notificationPrefs: {
        push: { bookings: true, invites: true, social: true, credits: true },
        email: { bookings: true, invites: true, social: false, credits: true },
      },
    });
    const listingId = await t.run((ctx) =>
      ctx.db.insert("listings", {
        ownerUserId: maya,
        college: "Worcester",
        dateTime: "2026-10-15T18:30:00.000Z",
        groupSize: 4,
        seatsAvailable: 3,
        members: [maya],
        year: "2",
        role: "UG",
        message: "",
        status: "active",
      }),
    );
    const requestId = await t.run((ctx) =>
      ctx.db.insert("requests", {
        fromUserId: maya,
        toUserId: priya,
        targetListingId: listingId,
        message: "",
        status: "pending",
      }),
    );
    const req = await t.run((ctx) =>
      notify(ctx, { userId: priya, kind: "request_received", actorId: maya, listingId, requestId }),
    );
    const wish = await t.run((ctx) =>
      notify(ctx, { userId: priya, kind: "wishlist_listing", actorId: maya, listingId }),
    );
    expect((await t.query(internal.notifications.getDeliveryPlan, { notificationId: req! }))?.email)
      .toEqual({ type: "request", requestId });
    expect((await t.query(internal.notifications.getDeliveryPlan, { notificationId: wish! }))?.email)
      .toEqual({ type: "wishlist", listingId, userId: priya });
  });

  test("gone subscriptions are removed", async () => {
    const { t } = await seeded();
    await t.mutation(internal.notifications.removeWebPushSubscriptions, {
      endpoints: ["https://push.example/abc"],
    });
    expect(await t.run((ctx) => ctx.db.query("webPushSubscriptions").collect())).toHaveLength(0);
  });
});
```

Create `convex/webPushCore.test.ts`:

```ts
import { describe, expect, test, vi } from "vitest";
import { sendToSubscriptions } from "./webPushCore";

const sub = (endpoint: string) => ({ endpoint, p256dh: "p", auth: "a" });

describe("sendToSubscriptions", () => {
  test("returns endpoints the push service says are gone", async () => {
    const statuses: Record<string, number> = { a: 201, b: 410, c: 404, d: 500 };
    const send = vi.fn(async (s: { endpoint: string }) => statuses[s.endpoint]);
    const gone = await sendToSubscriptions(
      [sub("a"), sub("b"), sub("c"), sub("d")],
      '{"title":"Hi"}',
      send,
    );
    expect(gone).toEqual(["b", "c"]);
    expect(send).toHaveBeenCalledTimes(4);
  });

  test("one failure doesn't stop the rest", async () => {
    const send = vi.fn(async (s: { endpoint: string }) => {
      if (s.endpoint === "a") throw new Error("network");
      return 201;
    });
    vi.spyOn(console, "error").mockImplementation(() => {});
    expect(await sendToSubscriptions([sub("a"), sub("b")], "{}", send)).toEqual([]);
    expect(send).toHaveBeenCalledTimes(2);
  });
});
```

- [ ] **Step 3: Run them to verify they fail**

Run: `npx vitest run convex/notify.test.ts convex/webPushCore.test.ts`
Expected: FAIL — cannot resolve `./notify` / `./webPushCore`.

- [ ] **Step 4: Create `convex/webPushCore.ts`**

```ts
/**
 * Sending to a user's browsers, with the actual sender injected so this can be
 * tested without the `web-push` package (which only runs in the Node action).
 */

export type WebPushSubscription = { endpoint: string; p256dh: string; auth: string };

/** Sends one payload; resolves to the push service's HTTP status. */
export type WebPushSender = (sub: WebPushSubscription, payload: string) => Promise<number>;

/** Sends to every subscription and returns the endpoints that are gone (404/410). */
export async function sendToSubscriptions(
  subs: WebPushSubscription[],
  payload: string,
  send: WebPushSender,
): Promise<string[]> {
  const gone: string[] = [];
  for (const sub of subs) {
    try {
      const status = await send(sub, payload);
      if (status === 404 || status === 410) gone.push(sub.endpoint);
    } catch (err) {
      console.error("web push failed", sub.endpoint, err);
    }
  }
  return gone;
}
```

- [ ] **Step 5: Move the Expo sender into `convex/expoPush.ts`**

Create `convex/expoPush.ts` with the body of `deliverExpoPushMessages` moved verbatim from `convex/pushNotifications.ts`, and a wider `data` type so bell notifications can use it:

```ts
import { internal } from "./_generated/api";
import type { ActionCtx } from "./_generated/server";

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";

export type PushMessage = {
  to: string;
  title: string;
  body: string;
  data: { url: string } & Record<string, string>;
  categoryId?: string;
  channelId?: string;
  collapseId?: string;
};

type ExpoPushTicket =
  | { status: "ok"; id?: string }
  | { status: "error"; message?: string; details?: { error?: string } };

/** Sends to Expo; prunes tokens Expo says are no longer registered. */
export async function deliverExpoPushMessages(
  ctx: ActionCtx,
  messages: PushMessage[],
): Promise<void> {
  if (messages.length === 0) return;

  const response = await fetch(EXPO_PUSH_URL, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Accept-Encoding": "gzip, deflate",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(messages),
  });

  if (!response.ok) {
    console.error(
      "deliverExpoPushMessages: Expo API error",
      response.status,
      await response.text(),
    );
    return;
  }

  const result = (await response.json()) as { data?: ExpoPushTicket[] };
  const tickets = result.data ?? [];
  const invalidTokens: string[] = [];

  for (let i = 0; i < tickets.length; i++) {
    const ticket = tickets[i];
    if (ticket.status === "error") {
      const err = ticket.details?.error;
      if (err === "DeviceNotRegistered") {
        const msg = messages[i];
        if (msg) invalidTokens.push(msg.to);
      } else {
        console.error("deliverExpoPushMessages: ticket error", ticket);
      }
    }
  }

  if (invalidTokens.length > 0) {
    await ctx.runMutation(internal.pushNotifications.pruneInvalidPushTokens, {
      tokens: invalidTokens,
    });
  }
}
```

In `convex/pushNotifications.ts`:
- Delete `const EXPO_PUSH_URL = …`, the local `type PushMessage = {…}`, `type ExpoPushTicket = …` and the whole `async function deliverExpoPushMessages(…) {…}`.
- Add `import { deliverExpoPushMessages, type PushMessage } from "./expoPush";`
- Change the `ActionCtx` import line to `import type { MutationCtx, QueryCtx } from "./_generated/server";` if `ActionCtx` is no longer used there.

- [ ] **Step 6: Create `convex/notify.ts`**

```ts
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import type { MutationCtx } from "./_generated/server";
import {
  categoryOf,
  type NotificationData,
  type NotificationKind,
} from "./notificationKinds";

export const DEDUPE_WINDOW_MS = 24 * 60 * 60 * 1000;

export type NotifyArgs = {
  userId: Id<"users">;
  kind: NotificationKind;
  actorId?: Id<"users">;
  listingId?: Id<"listings">;
  requestId?: Id<"requests">;
  data?: NotificationData;
};

/** kind + the ids involved (+ a party answer, so "in" then "out" both show). */
export function dedupeKeyFor(args: NotifyArgs): string {
  return [
    args.kind,
    args.actorId ?? "",
    args.listingId ?? "",
    args.requestId ?? "",
    args.data?.response ?? "",
  ].join(":");
}

/**
 * Record that something happened to `userId` and schedule its push/email.
 * Call it inside the mutation where the event happens, so it commits (or rolls
 * back) with it. Returns null when skipped: yourself, a deleted user, or the
 * same thing within the last 24h.
 */
export async function notify(
  ctx: MutationCtx,
  args: NotifyArgs,
): Promise<Id<"notifications"> | null> {
  if (args.actorId !== undefined && args.actorId === args.userId) return null;
  const user = await ctx.db.get(args.userId);
  if (!user || user.deletedAt !== undefined) return null;

  const now = Date.now();
  const dedupeKey = dedupeKeyFor(args);
  const last = await ctx.db
    .query("notifications")
    .withIndex("by_userId_and_dedupeKey", (q) =>
      q.eq("userId", args.userId).eq("dedupeKey", dedupeKey),
    )
    .order("desc")
    .first();
  if (last && now - last.createdAt < DEDUPE_WINDOW_MS) return null;

  const notificationId = await ctx.db.insert("notifications", {
    userId: args.userId,
    category: categoryOf(args.kind),
    kind: args.kind,
    ...(args.actorId !== undefined ? { actorId: args.actorId } : {}),
    ...(args.listingId !== undefined ? { listingId: args.listingId } : {}),
    ...(args.requestId !== undefined ? { requestId: args.requestId } : {}),
    ...(args.data !== undefined ? { data: args.data } : {}),
    dedupeKey,
    createdAt: now,
  });
  await ctx.scheduler.runAfter(0, internal.notificationDelivery.deliver, {
    notificationId,
  });
  return notificationId;
}
```

- [ ] **Step 7: Create `convex/notifications.ts` (delivery part)**

```ts
import { v } from "convex/values";
import type { Doc } from "./_generated/dataModel";
import {
  internalMutation,
  internalQuery,
  type MutationCtx,
  type QueryCtx,
} from "./_generated/server";
import {
  EMAIL_NOTICE_KINDS,
  renderNotification,
  type NotificationView,
} from "./notificationCopy";
import { emailAllowed, pushAllowed } from "./notificationPrefs";

type Ctx = QueryCtx | MutationCtx;

/** Most browsers / devices we push to per person. */
const MAX_PUSH_TARGETS = 20;

/** What renderNotification needs: the row plus the actor's first name. */
export async function loadView(ctx: Ctx, n: Doc<"notifications">): Promise<NotificationView> {
  const actor = n.actorId ? await ctx.db.get(n.actorId) : null;
  return {
    kind: n.kind,
    actorName: actor?.name?.trim().split(" ")[0] || null,
    ...(n.actorId ? { actorId: n.actorId } : {}),
    ...(n.listingId ? { listingId: n.listingId } : {}),
    ...(n.requestId ? { requestId: n.requestId } : {}),
    data: n.data ?? {},
  };
}

const subscriptionValidator = v.object({
  endpoint: v.string(),
  p256dh: v.string(),
  auth: v.string(),
});

/**
 * Everything `deliver` needs, after the recipient's prefs: the push (web
 * subscriptions + Expo tokens) and which email to send, if any.
 */
export const getDeliveryPlan = internalQuery({
  args: { notificationId: v.id("notifications") },
  returns: v.union(
    v.null(),
    v.object({
      push: v.union(
        v.null(),
        v.object({
          title: v.string(),
          body: v.string(),
          url: v.string(),
          tag: v.string(),
          webSubscriptions: v.array(subscriptionValidator),
          expoTokens: v.array(v.string()),
        }),
      ),
      email: v.union(
        v.null(),
        v.object({ type: v.literal("request"), requestId: v.id("requests") }),
        v.object({
          type: v.literal("wishlist"),
          listingId: v.id("listings"),
          userId: v.id("users"),
        }),
        v.object({ type: v.literal("notice") }),
      ),
    }),
  ),
  handler: async (ctx, { notificationId }) => {
    const n = await ctx.db.get(notificationId);
    if (!n) return null;
    const user = await ctx.db.get(n.userId);
    if (!user || user.deletedAt !== undefined) return null;

    let push = null;
    if (pushAllowed(user, n.category)) {
      const rendered = renderNotification(await loadView(ctx, n));
      const subs = await ctx.db
        .query("webPushSubscriptions")
        .withIndex("by_userId", (q) => q.eq("userId", n.userId))
        .take(MAX_PUSH_TARGETS);
      const tokens = await ctx.db
        .query("pushTokens")
        .withIndex("by_userId", (q) => q.eq("userId", n.userId))
        .take(MAX_PUSH_TARGETS);
      push = {
        title: rendered.title,
        body: rendered.body,
        url: rendered.url,
        tag: n.dedupeKey,
        webSubscriptions: subs.map((s) => ({ endpoint: s.endpoint, p256dh: s.p256dh, auth: s.auth })),
        expoTokens: tokens.map((t) => t.token),
      };
    }

    let email = null;
    if (emailAllowed(user, n.category)) {
      if (n.kind === "request_received" && n.requestId) {
        email = { type: "request" as const, requestId: n.requestId };
      } else if (n.kind === "wishlist_listing" && n.listingId) {
        email = { type: "wishlist" as const, listingId: n.listingId, userId: n.userId };
      } else if (EMAIL_NOTICE_KINDS.has(n.kind)) {
        email = { type: "notice" as const };
      }
    }

    return { push, email };
  },
});

/** The push service said these browsers are gone (404/410). */
export const removeWebPushSubscriptions = internalMutation({
  args: { endpoints: v.array(v.string()) },
  returns: v.null(),
  handler: async (ctx, { endpoints }) => {
    for (const endpoint of endpoints) {
      const rows = await ctx.db
        .query("webPushSubscriptions")
        .withIndex("by_endpoint", (q) => q.eq("endpoint", endpoint))
        .take(10);
      for (const row of rows) await ctx.db.delete(row._id);
    }
    return null;
  },
});
```

- [ ] **Step 8: Create `convex/notificationDelivery.ts`**

```ts
"use node";

import webpush from "web-push";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { internalAction, type ActionCtx } from "./_generated/server";
import { deliverExpoPushMessages } from "./expoPush";
import {
  sendToSubscriptions,
  type WebPushSender,
  type WebPushSubscription,
} from "./webPushCore";

/** The `web-push` sender, or null when VAPID keys aren't configured. */
function webPushSender(): WebPushSender | null {
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!publicKey || !privateKey) return null;
  webpush.setVapidDetails("mailto:team@oxformals.com", publicKey, privateKey);
  return async (sub, payload) => {
    try {
      const res = await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        payload,
        { TTL: 24 * 60 * 60 },
      );
      return res.statusCode;
    } catch (err) {
      if (err instanceof webpush.WebPushError) return err.statusCode;
      throw err;
    }
  };
}

/** Push to a user's browsers and forget the ones that are gone. */
async function sendWeb(
  ctx: ActionCtx,
  subs: WebPushSubscription[],
  message: { title: string; body: string; url: string; tag: string },
): Promise<void> {
  if (subs.length === 0) return;
  const send = webPushSender();
  if (!send) {
    console.warn("VAPID keys are not set; skipping web push");
    return;
  }
  const gone = await sendToSubscriptions(subs, JSON.stringify(message), send);
  if (gone.length > 0) {
    await ctx.runMutation(internal.notifications.removeWebPushSubscriptions, {
      endpoints: gone,
    });
  }
}

/** Sends one notification's push and email, per the recipient's prefs. */
export const deliver = internalAction({
  args: { notificationId: v.id("notifications") },
  returns: v.null(),
  handler: async (ctx, { notificationId }) => {
    const plan = await ctx.runQuery(internal.notifications.getDeliveryPlan, {
      notificationId,
    });
    if (!plan) return null;

    if (plan.push) {
      const { title, body, url, tag } = plan.push;
      try {
        await sendWeb(ctx, plan.push.webSubscriptions, { title, body, url, tag });
      } catch (err) {
        console.error("deliver: web push failed", err);
      }
      await deliverExpoPushMessages(
        ctx,
        plan.push.expoTokens.map((to) => ({
          to,
          title,
          body,
          data: { url, notificationId, kind: tag.split(":")[0] },
        })),
      );
    }
    return null;
  },
});
```

(Task 4 adds the email branch to `deliver`; Task 9 adds `sendChatWebPush` using `sendWeb`.)

- [ ] **Step 9: Run the tests**

Run: `npx vitest run convex/notify.test.ts convex/webPushCore.test.ts`
Expected: PASS.

Run: `npx vitest run`
Expected: PASS (nothing calls `notify` yet outside these tests).

- [ ] **Step 10: Generate VAPID keys and set them on DEV**

Run: `npx web-push generate-vapid-keys --json`
Keep the output in your terminal only (never paste the private key into chat, a file in the repo, or a commit).

Run (substituting the two values):

```bash
npx convex env set VAPID_PUBLIC_KEY '<publicKey>'
npx convex env set VAPID_PRIVATE_KEY '<privateKey>'
```

Expected: "Successfully set VAPID_PUBLIC_KEY" / "…VAPID_PRIVATE_KEY" (dev deployment — no `--prod`).

Append the public key to `.env.local` (gitignored):

```bash
echo "NEXT_PUBLIC_VAPID_PUBLIC_KEY=<publicKey>" >> .env.local
```

Tell the user: "Please add `NEXT_PUBLIC_VAPID_PUBLIC_KEY` = `<publicKey>` to the Vercel project's **Preview** environment (Settings → Environment Variables), or run `vercel env add NEXT_PUBLIC_VAPID_PUBLIC_KEY preview`." Don't do the Vercel step yourself.

- [ ] **Step 11: Push to DEV**

Run: `npx convex dev --once`
Expected: "Convex functions ready!". If bundling `web-push` fails, create `convex.json` with `{ "node": { "externalPackages": ["web-push"] } }`, rerun, and add `convex.json` to this task's commit.

- [ ] **Step 12: Commit**

```bash
git add package.json package-lock.json convex/notify.ts convex/notifications.ts convex/webPushCore.ts convex/expoPush.ts convex/notificationDelivery.ts convex/pushNotifications.ts convex/notify.test.ts convex/webPushCore.test.ts convex/_generated/api.d.ts
git commit -m "FEAT: notify() records notifications and pushes them to browsers and phones

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---
### Task 4: Notification emails

**Prerequisite:** `convex/emailTemplate.ts` from the email restyle must be on this branch, exporting `renderEmail(input)` (HTML string) and `renderEmailText(input)` (plain text) with input `{ title, eyebrow, heading, body?, ticket?: { college, when, tag?, quote? }, code?, cta?: { href, label }, secondary?: { href, label }, note? }`. Run `grep -n "export function renderEmail" convex/emailTemplate.ts`. If it's missing, stop and ask the user. If the exported names or fields differ, keep everything below and adapt only the `renderEmail`/`renderEmailText` call in `sendNotificationEmail`.

**Files:**
- Modify: `convex/emails.ts` (add `getNotificationEmail`, `sendNotificationEmail`)
- Modify: `convex/notificationDelivery.ts` (email branch in `deliver`)
- Modify: `convex/emailNotifications.ts` (prefs-aware)
- Test: `convex/notificationEmails.test.ts`

**Interfaces:**
- Consumes: `notificationEmail`, `NotificationEmailCopy` (Task 2); `loadView`, `getDeliveryPlan` (Task 3); `renderEmail`, `renderEmailText` (email restyle); existing `internal.emails.sendNewRequestEmail({ requestId })`, `internal.emails.sendNewListingAlertEmail({ listingId, userId })`.
- Produces: `internal.emails.getNotificationEmail({ notificationId })`, `internal.emails.sendNotificationEmail({ notificationId })`; `emailNotificationsEnabled(user)` now consults `notificationPrefs.email.credits` when prefs are saved.

- [ ] **Step 1: Write the failing test**

Create `convex/notificationEmails.test.ts`:

```ts
/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";
import { internal } from "./_generated/api";
import { emailNotificationsEnabled } from "./emailNotifications";
import { notify } from "./notify";
import schema from "./schema";

const modules = import.meta.glob("./**/*.*s");

type T = ReturnType<typeof convexTest>;

const makeUser = (t: T, name: string, extra: Record<string, unknown> = {}) =>
  t.run((ctx) =>
    ctx.db.insert("users", {
      name: `${name} Smith`,
      email: `${name.toLowerCase()}@ox.ac.uk`,
      emailVerificationTime: 1,
      agreedToRules: true,
      ...extra,
    }),
  );

describe("notification emails", () => {
  test("a party invite email has the ticket and both answers", async () => {
    const t = convexTest(schema, modules);
    const maya = await makeUser(t, "Maya");
    const priya = await makeUser(t, "Priya");
    const id = await t.run((ctx) =>
      notify(ctx, {
        userId: priya,
        kind: "party_invite",
        actorId: maya,
        data: { college: "Worcester", dateTime: "2026-10-15T18:30:00.000Z", paysOwn: false },
      }),
    );
    const email = await t.query(internal.emails.getNotificationEmail, { notificationId: id! });
    expect(email).toMatchObject({
      to: "priya@ox.ac.uk",
      subject: "Maya wants to bring you to Worcester",
      eyebrow: "Group invite",
      heading: "Maya added you to their group",
      ticket: { college: "Worcester", tag: "Maya is covering you" },
      cta: { label: "I'm in", path: "/" },
      secondary: { label: "Not me", path: "/" },
    });
  });

  test("no email for kinds without one, or for deleted users", async () => {
    const t = convexTest(schema, modules);
    const maya = await makeUser(t, "Maya");
    const priya = await makeUser(t, "Priya");
    const follow = await t.run((ctx) =>
      notify(ctx, { userId: priya, kind: "new_follower", actorId: maya }),
    );
    expect(await t.query(internal.emails.getNotificationEmail, { notificationId: follow! })).toBeNull();

    const invite = await t.run((ctx) =>
      notify(ctx, { userId: priya, kind: "party_invite", actorId: maya }),
    );
    await t.run((ctx) => ctx.db.patch(priya, { deletedAt: 1, email: undefined }));
    expect(await t.query(internal.emails.getNotificationEmail, { notificationId: invite! })).toBeNull();
  });

  test("review reminders follow the credits email pref once prefs are saved", () => {
    expect(emailNotificationsEnabled({})).toBe(true);
    expect(emailNotificationsEnabled({ emailNotifications: false })).toBe(false);
    const prefs = {
      push: { bookings: true, invites: true, social: true, credits: true },
      email: { bookings: true, invites: true, social: false, credits: false },
    };
    expect(emailNotificationsEnabled({ notificationPrefs: prefs })).toBe(false);
    expect(
      emailNotificationsEnabled({
        notificationPrefs: { ...prefs, email: { ...prefs.email, credits: true } },
      }),
    ).toBe(true);
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run convex/notificationEmails.test.ts`
Expected: FAIL — `internal.emails.getNotificationEmail` is not a function / `emailNotificationsEnabled({ notificationPrefs })` returns true.

- [ ] **Step 3: Make `emailNotificationsEnabled` prefs-aware**

Replace `convex/emailNotifications.ts` with:

```ts
import type { Doc } from "./_generated/dataModel";

/**
 * Review reminders (and anything else not routed through notify): once the
 * user has saved per-category prefs they follow "Credits & reminders" email;
 * before that, the legacy on/off switch (default on).
 */
export function emailNotificationsEnabled(
  user: Partial<
    Pick<Doc<"users">, "emailNotifications" | "emailWishlistAlerts" | "notificationPrefs">
  >,
): boolean {
  if (user.notificationPrefs) return user.notificationPrefs.email.credits;
  if (user.emailNotifications !== undefined) {
    return user.emailNotifications !== false;
  }
  return user.emailWishlistAlerts !== false;
}
```

- [ ] **Step 4: Add the email query and action to `convex/emails.ts`**

Add imports at the top of `convex/emails.ts`:

```ts
import { renderEmail, renderEmailText } from "./emailTemplate";
import { notificationEmail } from "./notificationCopy";
import { loadView } from "./notifications";
```

Append at the end of the file:

```ts
// ── Bell notifications that email (see EMAIL_NOTICE_KINDS) ─────────────────

const linkValidator = v.object({ label: v.string(), path: v.string() });

const notificationEmailValidator = v.object({
  to: v.string(),
  subject: v.string(),
  eyebrow: v.string(),
  heading: v.string(),
  body: v.optional(v.string()),
  ticket: v.optional(
    v.object({ college: v.string(), when: v.string(), tag: v.optional(v.string()) }),
  ),
  cta: linkValidator,
  secondary: v.optional(linkValidator),
});

type NotificationEmail = {
  to: string;
  subject: string;
  eyebrow: string;
  heading: string;
  body?: string;
  ticket?: { college: string; when: string; tag?: string };
  cta: { label: string; path: string };
  secondary?: { label: string; path: string };
};

export const getNotificationEmail = internalQuery({
  args: { notificationId: v.id("notifications") },
  returns: v.union(v.null(), notificationEmailValidator),
  handler: async (ctx, { notificationId }) => {
    const n = await ctx.db.get(notificationId);
    if (!n) return null;
    const user = await ctx.db.get(n.userId);
    if (!user || user.deletedAt !== undefined || !user.email?.trim()) return null;
    const copy = notificationEmail(await loadView(ctx, n));
    if (!copy) return null;
    return { to: user.email.trim().toLowerCase(), ...copy };
  },
});

/** Sent by `deliver` only when the recipient's email pref allows it. */
export const sendNotificationEmail = internalAction({
  args: { notificationId: v.id("notifications") },
  returns: v.null(),
  handler: async (ctx, { notificationId }) => {
    const email: NotificationEmail | null = await ctx.runQuery(
      internal.emails.getNotificationEmail,
      { notificationId },
    );
    if (!email) return null;
    const apiKey = process.env.AUTH_RESEND_KEY;
    if (!apiKey) {
      console.error("sendNotificationEmail: AUTH_RESEND_KEY is not set");
      return null;
    }
    const input = {
      title: email.subject,
      eyebrow: email.eyebrow,
      heading: email.heading,
      ...(email.body ? { body: email.body } : {}),
      ...(email.ticket ? { ticket: email.ticket } : {}),
      cta: { href: `${siteUrl()}${email.cta.path}`, label: email.cta.label },
      ...(email.secondary
        ? { secondary: { href: `${siteUrl()}${email.secondary.path}`, label: email.secondary.label } }
        : {}),
    };
    const { error } = await new ResendAPI(apiKey).emails.send({
      from: "Oxformals <team@oxformals.com>",
      to: [email.to],
      subject: email.subject,
      html: renderEmail(input),
      text: renderEmailText(input),
    });
    if (error) console.error("sendNotificationEmail: Resend error", error);
    return null;
  },
});
```

- [ ] **Step 5: Add the email branch to `deliver`**

In `convex/notificationDelivery.ts`, inside `deliver`'s handler, directly after `if (!plan) return null;` and before `if (plan.push) {`, add:

```ts
    // Email first: a push failure must not cost someone their email.
    if (plan.email?.type === "request") {
      await ctx.scheduler.runAfter(0, internal.emails.sendNewRequestEmail, {
        requestId: plan.email.requestId,
      });
    } else if (plan.email?.type === "wishlist") {
      await ctx.scheduler.runAfter(0, internal.emails.sendNewListingAlertEmail, {
        listingId: plan.email.listingId,
        userId: plan.email.userId,
      });
    } else if (plan.email?.type === "notice") {
      await ctx.scheduler.runAfter(0, internal.emails.sendNotificationEmail, {
        notificationId,
      });
    }
```

- [ ] **Step 6: Run the tests**

Run: `npx vitest run convex/notificationEmails.test.ts`
Expected: PASS.

Run: `npx vitest run`
Expected: PASS.

- [ ] **Step 7: Push to DEV and commit**

Run: `npx convex dev --once`
Expected: "Convex functions ready!".

```bash
git add convex/emails.ts convex/notificationDelivery.ts convex/emailNotifications.ts convex/notificationEmails.test.ts convex/_generated/api.d.ts
git commit -m "FEAT: Notifications send their emails, on the shared template, when prefs allow

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Bell, prefs and subscription API

**Files:**
- Modify: `convex/notifications.ts` (add public functions)
- Modify: `convex/accountDeletion.ts` (delete notifications + subscriptions)
- Test: `convex/notifications.test.ts`

**Interfaces:**
- Consumes: `loadView` (Task 3), `renderNotification`, `Segment` (Task 2), `resolvePrefs`, `notificationPrefsValidator` (Task 1), `optionalUserId`, `requireActiveUser` (`convex/guards.ts`).
- Produces (all in `api.notifications`):
  - `getBellState({})` → `null | { unread: number /* capped at 10 */; alertsEligible: boolean }`
  - `listMyNotifications({ paginationOpts })` → paginated `{ page: BellItem[], isDone, continueCursor }` where `BellItem = { _id, kind, category, createdAt, readAt?: number, url, segments: Segment[], actor: null | { _id, name?: string, avatar? }, requestId?: Id<"requests">, action: null | { type: "party"; state: "pending" | "in" | "out" | "closed" } | { type: "request"; state: "pending" | "accepted" | "declined" | "gone" } }`
  - `markAllRead({})` → `null`
  - `getMyNotificationPrefs({})` → `null | NotificationPrefs`
  - `setNotificationPref({ channel: "push" | "email", category, enabled })` → `null`
  - `saveWebPushSubscription({ endpoint, p256dh, auth })` → `null`
  - `removeMyWebPushSubscription({ endpoint })` → `null`
  - `UNREAD_CAP = 10`

- [ ] **Step 1: Write the failing test**

Create `convex/notifications.test.ts`:

```ts
/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";
import { api } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { notify } from "./notify";
import schema from "./schema";

const modules = import.meta.glob("./**/*.*s");

type T = ReturnType<typeof convexTest>;

const makeUser = (t: T, name: string) =>
  t.run((ctx) =>
    ctx.db.insert("users", {
      name,
      email: `${name.toLowerCase()}@ox.ac.uk`,
      emailVerificationTime: 1,
      agreedToRules: true,
      college: "Keble",
      year: "2",
      role: "UG",
    }),
  );

const as = (t: T, id: Id<"users">) => t.withIdentity({ subject: `${id}|s` });

async function followers(t: T, target: Id<"users">, n: number) {
  for (let i = 0; i < n; i++) {
    const u = await makeUser(t, `Fan${i}`);
    await t.run((ctx) => notify(ctx, { userId: target, kind: "new_follower", actorId: u }));
  }
}

describe("bell", () => {
  test("unread count caps at 10 and mark all read clears it", async () => {
    const t = convexTest(schema, modules);
    const me = await makeUser(t, "Me");
    await followers(t, me, 12);
    expect(await as(t, me).query(api.notifications.getBellState, {})).toEqual({
      unread: 10,
      alertsEligible: false,
    });
    await as(t, me).mutation(api.notifications.markAllRead, {});
    expect((await as(t, me).query(api.notifications.getBellState, {}))?.unread).toBe(0);
  });

  test("lists newest first with rendered sentences", async () => {
    const t = convexTest(schema, modules);
    const me = await makeUser(t, "Me");
    const maya = await makeUser(t, "Maya Lee");
    await t.run((ctx) => notify(ctx, { userId: me, kind: "new_follower", actorId: maya }));
    await t.run((ctx) =>
      notify(ctx, { userId: me, kind: "credit_paid_out", data: { college: "Keble", count: 1 } }),
    );
    const page = await as(t, me).query(api.notifications.listMyNotifications, {
      paginationOpts: { numItems: 30, cursor: null },
    });
    expect(page.page.map((n) => n.kind)).toEqual(["credit_paid_out", "new_follower"]);
    expect(page.page[1]).toMatchObject({
      actor: { _id: maya, name: "Maya Lee" },
      url: `/profile/${maya}`,
      action: null,
    });
    expect(page.page[1].segments.map((s) => s.text).join("")).toBe("Maya followed you.");
  });

  test("a party invite row carries the answer state", async () => {
    const t = convexTest(schema, modules);
    const me = await makeUser(t, "Me");
    const maya = await makeUser(t, "Maya");
    const listing = await t.run((ctx) =>
      ctx.db.insert("listings", {
        ownerUserId: maya,
        college: "Worcester",
        dateTime: new Date(Date.now() + 3 * 864e5).toISOString(),
        groupSize: 4,
        seatsAvailable: 3,
        members: [maya],
        year: "2",
        role: "UG",
        message: "",
        status: "active",
      }),
    );
    const requestId = await t.run((ctx) =>
      ctx.db.insert("requests", {
        fromUserId: maya,
        toUserId: maya,
        targetListingId: listing,
        message: "",
        status: "pending",
        party: [{ kind: "friend", userId: me, payerId: me, method: "credit", response: "in" }],
      }),
    );
    await t.run((ctx) =>
      notify(ctx, { userId: me, kind: "party_invite", actorId: maya, requestId }),
    );
    const page = await as(t, me).query(api.notifications.listMyNotifications, {
      paginationOpts: { numItems: 30, cursor: null },
    });
    expect(page.page[0].action).toEqual({ type: "party", state: "in" });
    expect((await as(t, me).query(api.notifications.getBellState, {}))?.alertsEligible).toBe(false);
  });

  test("prefs start at the defaults and save per switch", async () => {
    const t = convexTest(schema, modules);
    const me = await makeUser(t, "Me");
    expect((await as(t, me).query(api.notifications.getMyNotificationPrefs, {}))?.email.social).toBe(false);
    await as(t, me).mutation(api.notifications.setNotificationPref, {
      channel: "email",
      category: "social",
      enabled: true,
    });
    await as(t, me).mutation(api.notifications.setNotificationPref, {
      channel: "push",
      category: "credits",
      enabled: false,
    });
    expect(await as(t, me).query(api.notifications.getMyNotificationPrefs, {})).toEqual({
      push: { bookings: true, invites: true, social: true, credits: false },
      email: { bookings: true, invites: true, social: true, credits: false },
    });
  });

  test("a browser's subscription moves to whoever saved it last", async () => {
    const t = convexTest(schema, modules);
    const a = await makeUser(t, "Ann");
    const b = await makeUser(t, "Ben");
    const sub = { endpoint: "https://push.example/1", p256dh: "p", auth: "a" };
    await as(t, a).mutation(api.notifications.saveWebPushSubscription, sub);
    await as(t, a).mutation(api.notifications.saveWebPushSubscription, sub);
    await as(t, b).mutation(api.notifications.saveWebPushSubscription, sub);
    const rows = await t.run((ctx) => ctx.db.query("webPushSubscriptions").collect());
    expect(rows).toMatchObject([{ userId: b, endpoint: sub.endpoint }]);
    await expect(
      as(t, a).mutation(api.notifications.saveWebPushSubscription, { ...sub, endpoint: "http://x" }),
    ).rejects.toThrow();
  });

  test("deleting your account deletes your notifications and subscriptions", async () => {
    const t = convexTest(schema, modules);
    const me = await makeUser(t, "Me");
    await followers(t, me, 2);
    await as(t, me).mutation(api.notifications.saveWebPushSubscription, {
      endpoint: "https://push.example/2",
      p256dh: "p",
      auth: "a",
    });
    await as(t, me).mutation(api.accountDeletion.deleteMyAccount, { confirmEmail: "me@ox.ac.uk" });
    await t.run(async (ctx) => {
      expect(await ctx.db.query("notifications").collect()).toHaveLength(0);
      expect(await ctx.db.query("webPushSubscriptions").collect()).toHaveLength(0);
    });
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run convex/notifications.test.ts`
Expected: FAIL — `api.notifications.getBellState` is not a function.

- [ ] **Step 3: Add the public functions to `convex/notifications.ts`**

Change the imports at the top to:

```ts
import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import {
  internalMutation,
  internalQuery,
  mutation,
  query,
  type MutationCtx,
  type QueryCtx,
} from "./_generated/server";
import { optionalUserId, requireActiveUser } from "./guards";
import {
  EMAIL_NOTICE_KINDS,
  renderNotification,
  type NotificationView,
} from "./notificationCopy";
import { notificationCategoryValidator } from "./notificationKinds";
import { emailAllowed, pushAllowed, resolvePrefs } from "./notificationPrefs";
```

Append:

```ts
/** The badge shows "9+" past this. */
export const UNREAD_CAP = 10;
/** Most browsers one person keeps subscribed. */
const MAX_SUBSCRIPTIONS_PER_USER = 10;

/** Unread count, and whether to offer "Turn on alerts?" (after a first request, listing or invite). */
export const getBellState = query({
  args: {},
  returns: v.union(v.null(), v.object({ unread: v.number(), alertsEligible: v.boolean() })),
  handler: async (ctx) => {
    const userId = await optionalUserId(ctx);
    if (!userId) return null;
    const unread = await ctx.db
      .query("notifications")
      .withIndex("by_userId_and_readAt", (q) => q.eq("userId", userId).eq("readAt", undefined))
      .take(UNREAD_CAP);
    const sent = await ctx.db
      .query("requests")
      .withIndex("by_fromUserId", (q) => q.eq("fromUserId", userId))
      .first();
    const hosted = sent
      ? null
      : await ctx.db
          .query("listings")
          .withIndex("by_ownerUserId", (q) => q.eq("ownerUserId", userId))
          .first();
    const invited =
      sent || hosted
        ? null
        : await ctx.db
            .query("partyInvites")
            .withIndex("by_userId", (q) => q.eq("userId", userId))
            .first();
    return { unread: unread.length, alertsEligible: !!(sent || hosted || invited) };
  },
});

async function actionFor(ctx: QueryCtx, n: Doc<"notifications">, userId: Id<"users">) {
  if (n.kind === "party_invite" && n.requestId) {
    const req = await ctx.db.get(n.requestId);
    const seat = req?.party?.find((p) => p.kind === "friend" && p.userId === userId);
    if (!req || req.status !== "pending" || !seat) {
      return { type: "party" as const, state: "closed" as const };
    }
    return { type: "party" as const, state: seat.response ?? ("pending" as const) };
  }
  if (n.kind === "request_received" && n.requestId) {
    const req = await ctx.db.get(n.requestId);
    return { type: "request" as const, state: req ? req.status : ("gone" as const) };
  }
  return null;
}

/** The bell panel, newest first, 30 at a time. */
export const listMyNotifications = query({
  args: { paginationOpts: paginationOptsValidator },
  handler: async (ctx, { paginationOpts }) => {
    const userId = await optionalUserId(ctx);
    if (!userId) return { page: [], isDone: true, continueCursor: "" };
    const result = await ctx.db
      .query("notifications")
      .withIndex("by_userId_and_createdAt", (q) => q.eq("userId", userId))
      .order("desc")
      .paginate(paginationOpts);
    const page = [];
    for (const n of result.page) {
      const rendered = renderNotification(await loadView(ctx, n));
      const actor = n.actorId ? await ctx.db.get(n.actorId) : null;
      page.push({
        _id: n._id,
        kind: n.kind,
        category: n.category,
        createdAt: n.createdAt,
        ...(n.readAt !== undefined ? { readAt: n.readAt } : {}),
        ...(n.requestId ? { requestId: n.requestId } : {}),
        url: rendered.url,
        segments: rendered.segments,
        actor: actor ? { _id: actor._id, name: actor.name, avatar: actor.avatar } : null,
        action: await actionFor(ctx, n, userId),
      });
    }
    return { ...result, page };
  },
});

/** Opening the panel reads everything. */
export const markAllRead = mutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const { userId } = await requireActiveUser(ctx);
    const unread = await ctx.db
      .query("notifications")
      .withIndex("by_userId_and_readAt", (q) => q.eq("userId", userId).eq("readAt", undefined))
      .take(200);
    const now = Date.now();
    for (const n of unread) await ctx.db.patch(n._id, { readAt: now });
    return null;
  },
});

export const getMyNotificationPrefs = query({
  args: {},
  handler: async (ctx) => {
    const userId = await optionalUserId(ctx);
    if (!userId) return null;
    const user = await ctx.db.get(userId);
    return user ? resolvePrefs(user) : null;
  },
});

export const setNotificationPref = mutation({
  args: {
    channel: v.union(v.literal("push"), v.literal("email")),
    category: notificationCategoryValidator,
    enabled: v.boolean(),
  },
  returns: v.null(),
  handler: async (ctx, { channel, category, enabled }) => {
    const { userId, user } = await requireActiveUser(ctx);
    const prefs = resolvePrefs(user);
    await ctx.db.patch(userId, {
      notificationPrefs: {
        ...prefs,
        [channel]: { ...prefs[channel], [category]: enabled },
      },
    });
    return null;
  },
});

/** Save this browser's push subscription (or move it to whoever's signed in now). */
export const saveWebPushSubscription = mutation({
  args: { endpoint: v.string(), p256dh: v.string(), auth: v.string() },
  returns: v.null(),
  handler: async (ctx, { endpoint, p256dh, auth }) => {
    const { userId } = await requireActiveUser(ctx);
    if (!endpoint.startsWith("https://") || endpoint.length > 1000) {
      throw new Error("That isn't a push subscription.");
    }
    const existing = await ctx.db
      .query("webPushSubscriptions")
      .withIndex("by_endpoint", (q) => q.eq("endpoint", endpoint))
      .first();
    if (existing) {
      if (existing.userId !== userId || existing.p256dh !== p256dh || existing.auth !== auth) {
        await ctx.db.patch(existing._id, { userId, p256dh, auth });
      }
      return null;
    }
    const mine = await ctx.db
      .query("webPushSubscriptions")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .take(MAX_SUBSCRIPTIONS_PER_USER);
    if (mine.length >= MAX_SUBSCRIPTIONS_PER_USER) {
      const oldest = mine.reduce((a, b) => (a.createdAt <= b.createdAt ? a : b));
      await ctx.db.delete(oldest._id);
    }
    await ctx.db.insert("webPushSubscriptions", {
      userId,
      endpoint,
      p256dh,
      auth,
      createdAt: Date.now(),
    });
    return null;
  },
});

export const removeMyWebPushSubscription = mutation({
  args: { endpoint: v.string() },
  returns: v.null(),
  handler: async (ctx, { endpoint }) => {
    const { userId } = await requireActiveUser(ctx);
    const existing = await ctx.db
      .query("webPushSubscriptions")
      .withIndex("by_endpoint", (q) => q.eq("endpoint", endpoint))
      .first();
    if (existing && existing.userId === userId) await ctx.db.delete(existing._id);
    return null;
  },
});
```

- [ ] **Step 4: Delete them with the account**

In `convex/accountDeletion.ts`, in the "4. Personal rows." block, extend the `deleteByUserId` table union with `| "webPushSubscriptions"`, and after `await deleteByUserId("userBadges");` add:

```ts
    await deleteByUserId("webPushSubscriptions");
    for (const row of await ctx.db
      .query("notifications")
      .withIndex("by_userId_and_createdAt", (q) => q.eq("userId", userId))
      .take(MAX_ROWS)) {
      await ctx.db.delete(row._id);
    }
```

- [ ] **Step 5: Run the tests**

Run: `npx vitest run convex/notifications.test.ts`
Expected: PASS.

Run: `npx vitest run`
Expected: PASS.

- [ ] **Step 6: Push to DEV and commit**

Run: `npx convex dev --once`
Expected: "Convex functions ready!".

```bash
git add convex/notifications.ts convex/accountDeletion.ts convex/notifications.test.ts convex/_generated/api.d.ts
git commit -m "FEAT: Bell list, unread count, notification settings and browser subscriptions

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---
### Task 6: Booking notifications

**Files:**
- Modify: `convex/listings.ts` (`createRequest`, `declineRequest`, `declinePendingWhenFull`, `acceptRequest`, `deleteListing`)
- Modify: `convex/partyInvites.ts` (`respondToPartyInvite`)
- Modify: `convex/swapLinks.ts` (`undoSwap`)
- Modify: `convex/swapLinks.test.ts` (assert notifications instead of notice emails)
- Test: `convex/bookingNotifications.test.ts`

**Interfaces:**
- Consumes: `notify(ctx, NotifyArgs)` (Task 3).
- Produces: notifications `request_received` (to host; `data.count` = seats), `party_invite` (to each named friend; `data.paysOwn`, `data.method`), `request_accepted` (to requester, including the mirror-swap auto-accept), `request_declined` (explicit decline and full-formal auto-decline), `formal_cancelled` (to each guest), `swap_undone` (to the breaker's partner side), `party_response` (to requester; `data.response`). Every listing-related row has `data.college` + `data.dateTime`.

- [ ] **Step 1: Write the failing test**

Create `convex/bookingNotifications.test.ts`:

```ts
/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";
import { api } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import schema from "./schema";

const modules = import.meta.glob("./**/*.*s");

const inDays = (n: number) => new Date(Date.now() + n * 864e5).toISOString();

type T = ReturnType<typeof convexTest>;

async function makeUser(t: T, name: string, credits?: number) {
  return await t.run(async (ctx) => {
    const id = await ctx.db.insert("users", {
      name,
      email: `${name.toLowerCase()}@ox.ac.uk`,
      emailVerificationTime: 1,
      agreedToRules: true,
      college: "Keble",
      year: "2",
      role: "UG",
    });
    if (credits !== undefined) {
      await ctx.db.insert("creditAccounts", { userId: id, balance: credits });
    }
    return id;
  });
}

const as = (t: T, id: Id<"users">) => t.withIdentity({ subject: `${id}|s` });

const notificationsFor = (t: T, userId: Id<"users">) =>
  t.run((ctx) =>
    ctx.db
      .query("notifications")
      .withIndex("by_userId_and_createdAt", (q) => q.eq("userId", userId))
      .collect(),
  );

async function setup() {
  const t = convexTest(schema, modules);
  const alice = await makeUser(t, "Alice", 3);
  const priya = await makeUser(t, "Priya", 1);
  const wes = await makeUser(t, "Wes");
  await as(t, alice).mutation(api.follows.follow, { userId: priya });
  await as(t, priya).mutation(api.follows.follow, { userId: alice });
  const worcester = await as(t, wes).mutation(api.listings.createListing, {
    dateTime: inDays(3),
    groupSize: 5,
    message: "",
    listingType: "both",
    price: 25,
  });
  // Follows above create social notifications; start each test from a clean bell.
  await t.run(async (ctx) => {
    for (const n of await ctx.db.query("notifications").collect()) await ctx.db.delete(n._id);
  });
  return { t, alice, priya, wes, worcester };
}

describe("booking notifications", () => {
  test("a group request notifies the host and each named friend", async () => {
    const s = await setup();
    const { requestId } = await as(s.t, s.alice).mutation(api.listings.createRequest, {
      requestType: "credit",
      targetListingId: s.worcester,
      message: "",
      friends: [{ userId: s.priya, paysOwn: true, method: "credit" }],
      guests: 1,
      guestMethods: ["credit"],
    });
    expect(await notificationsFor(s.t, s.wes)).toMatchObject([
      {
        kind: "request_received",
        actorId: s.alice,
        requestId,
        listingId: s.worcester,
        data: { college: "Keble", count: 3 },
      },
    ]);
    expect(await notificationsFor(s.t, s.priya)).toMatchObject([
      { kind: "party_invite", actorId: s.alice, requestId, data: { paysOwn: true, method: "credit" } },
    ]);
    expect(await notificationsFor(s.t, s.alice)).toEqual([]);
  });

  test("accepting and declining tell the requester", async () => {
    const s = await setup();
    const a = await as(s.t, s.alice).mutation(api.listings.createRequest, {
      requestType: "credit",
      targetListingId: s.worcester,
      message: "",
    });
    await as(s.t, s.wes).mutation(api.listings.acceptRequest, { requestId: a.requestId });
    const b = await as(s.t, s.priya).mutation(api.listings.createRequest, {
      requestType: "credit",
      targetListingId: s.worcester,
      message: "",
    });
    await as(s.t, s.wes).mutation(api.listings.declineRequest, { requestId: b.requestId });
    expect((await notificationsFor(s.t, s.alice)).map((n) => n.kind)).toEqual(["request_accepted"]);
    expect((await notificationsFor(s.t, s.priya)).map((n) => n.kind)).toEqual(["request_declined"]);
  });

  test("a friend's answer reaches the requester", async () => {
    const s = await setup();
    const { requestId } = await as(s.t, s.alice).mutation(api.listings.createRequest, {
      requestType: "pay",
      targetListingId: s.worcester,
      message: "",
      friends: [{ userId: s.priya, paysOwn: false, method: "pay" }],
    });
    await as(s.t, s.priya).mutation(api.partyInvites.respondToPartyInvite, {
      requestId,
      response: "out",
    });
    expect(await notificationsFor(s.t, s.alice)).toMatchObject([
      { kind: "party_response", actorId: s.priya, data: { response: "out", college: "Keble" } },
    ]);
  });

  test("cancelling a formal tells every guest", async () => {
    const s = await setup();
    const { requestId } = await as(s.t, s.alice).mutation(api.listings.createRequest, {
      requestType: "credit",
      targetListingId: s.worcester,
      message: "",
    });
    await as(s.t, s.wes).mutation(api.listings.acceptRequest, { requestId });
    await as(s.t, s.wes).mutation(api.listings.deleteListing, { listingId: s.worcester });
    const kinds = (await notificationsFor(s.t, s.alice)).map((n) => n.kind);
    expect(kinds).toEqual(["request_accepted", "formal_cancelled"]);
  });
});
```

(`data.college` is the listing's college, which `createListing` copies from the host's profile — "Keble" for everyone in this file.)

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run convex/bookingNotifications.test.ts`
Expected: FAIL — no notifications are created.

- [ ] **Step 3: `createRequest` — request_received and party_invite**

In `convex/listings.ts` add `import { notify } from "./notify";` with the other local imports.

In `createRequest`, replace:

```ts
    await ctx.scheduler.runAfter(0, internal.emails.sendNewRequestEmail, {
      requestId,
    });

    if (friends.length > 0) {
      const me = await ctx.db.get(userId);
      const myName = me?.name?.split(" ")[0] ?? "A friend";
      const notices: FormalNotice[] = [];
      for (const f of friends) {
        await ctx.db.insert("partyInvites", { requestId, userId: f.userId });
        notices.push({
          userId: f.userId,
          subject: `${myName} wants to bring you to ${target.college}`,
          body: f.paysOwn
            ? `${myName} asked for seats at ${target.college} for the two of you (and maybe more). Your seat is yours to pay for${f.method === "credit" ? " with a credit" : ""}, so tap "I'm in" to confirm, or "Not me" if you can't make it.`
            : `${myName} asked for seats at ${target.college} for the two of you (and maybe more), and is covering your seat. If you can't make it, tap "Not me".`,
          cta: "invites",
        });
      }
      await sendFormalNotices(ctx, notices);
    }
```

with:

```ts
    const formal = { college: target.college, dateTime: target.dateTime };
    // The new-request email is sent by notify's delivery (it obeys prefs now).
    await notify(ctx, {
      userId: target.ownerUserId,
      kind: "request_received",
      actorId: userId,
      listingId: target._id,
      requestId,
      data: { ...formal, count: seats.length },
    });
    for (const f of friends) {
      await ctx.db.insert("partyInvites", { requestId, userId: f.userId });
      await notify(ctx, {
        userId: f.userId,
        kind: "party_invite",
        actorId: userId,
        listingId: target._id,
        requestId,
        data: { ...formal, paysOwn: f.paysOwn, method: f.method },
      });
    }
```

In the mirror-swap branch of `createRequest`, replace:

```ts
        await performAccept(ctx, mirror);
        const me = await ctx.db.get(userId);
        const theirs = await ctx.db.get(mirror.targetListingId);
        await sendFormalNotices(ctx, [
          {
            userId: mirror.fromUserId,
            subject: "Your swap is on",
            body: `${me?.name?.split(" ")[0] ?? "The host"} asked for your formal too, so your swap into ${theirs?.college ?? "their formal"} has gone through.`,
            cta: "formals",
          },
        ]);
        return { requestId: mirror._id, autoAccepted: true as const };
```

with:

```ts
        await performAccept(ctx, mirror);
        const theirs = await ctx.db.get(mirror.targetListingId);
        await notify(ctx, {
          userId: mirror.fromUserId,
          kind: "request_accepted",
          actorId: userId,
          listingId: mirror.targetListingId,
          requestId: mirror._id,
          ...(theirs ? { data: { college: theirs.college, dateTime: theirs.dateTime } } : {}),
        });
        return { requestId: mirror._id, autoAccepted: true as const };
```

- [ ] **Step 4: `declineRequest`, `declinePendingWhenFull`, `acceptRequest`**

Add this helper just above `export const declineRequest`:

```ts
/** Tell a requester their request was turned down (by the host, or because it filled up). */
async function notifyDeclined(ctx: MutationCtx, req: Doc<"requests">) {
  const target = await ctx.db.get(req.targetListingId);
  await notify(ctx, {
    userId: req.fromUserId,
    kind: "request_declined",
    actorId: req.toUserId,
    listingId: req.targetListingId,
    requestId: req._id,
    ...(target ? { data: { college: target.college, dateTime: target.dateTime } } : {}),
  });
}
```

In `declineRequest`, after `await ctx.db.patch(req._id, { status: "declined" });` add:

```ts
    await notifyDeclined(ctx, req);
```

In `declinePendingWhenFull`, replace the final loop:

```ts
  for (const r of pending) {
    if (skip.has(r._id)) continue;
    await ctx.db.patch(r._id, { status: "declined" });
  }
```

with:

```ts
  for (const r of pending) {
    if (skip.has(r._id)) continue;
    await ctx.db.patch(r._id, { status: "declined" });
    await notifyDeclined(ctx, r);
  }
```

In `acceptRequest`, replace:

```ts
    await performAccept(ctx, req);

    return req._id;
```

with:

```ts
    await performAccept(ctx, req);

    const target = await ctx.db.get(req.targetListingId);
    await notify(ctx, {
      userId: req.fromUserId,
      kind: "request_accepted",
      actorId: userId,
      listingId: req.targetListingId,
      requestId: req._id,
      ...(target ? { data: { college: target.college, dateTime: target.dateTime } } : {}),
    });
    return req._id;
```

- [ ] **Step 5: `deleteListing` — formal_cancelled**

In `deleteListing`, replace:

```ts
      const notices: FormalNotice[] = [];
      const host = await ctx.db.get(userId);
      const hostName = host?.name?.split(" ")[0] ?? "The host";
      await undoSwapsForCancelledListing(ctx, listing, notices);
      for (const guestId of listing.members) {
        if (guestId === userId) continue;
        notices.push({
          userId: guestId,
          subject: "Your formal has been cancelled",
          body: `${hostName} cancelled their ${listing.college} formal, so your seat there is gone.`,
          cta: "browse",
        });
      }
      await sendFormalNotices(ctx, notices);
```

with:

```ts
      await undoSwapsForCancelledListing(ctx, listing);
      for (const guestId of listing.members) {
        if (guestId === userId) continue;
        await notify(ctx, {
          userId: guestId,
          kind: "formal_cancelled",
          actorId: userId,
          listingId: listing._id,
          data: { college: listing.college, dateTime: listing.dateTime },
        });
      }
```

In `removeMember`, change `await undoSwap(ctx, link, args.listingId, notices);` to `await undoSwap(ctx, link, args.listingId);` (the "You were removed" notice stays a `sendFormalNotices` email — spec decision 4).

- [ ] **Step 6: `undoSwap` — swap_undone**

In `convex/swapLinks.ts`:
- Add `import { notify } from "./notify";`.
- Delete the now-unused `formalLabel` and `firstName` helpers.
- Change `undoSwap`'s signature to drop `notices`:

```ts
export async function undoSwap(
  ctx: MutationCtx,
  req: Doc<"requests">,
  brokenListingId: Id<"listings">,
): Promise<void> {
```

- Replace its last block:

```ts
  await detachMember(ctx, otherListingId, brokenByUserId);
  const partner = await firstName(ctx, wrongedUserId);
  notices.push({
    userId: brokenByUserId,
    subject: "Your swap was undone",
    body: `Your swap with ${partner} fell through, so your seat at ${formalLabel(other)} has been released too. Swaps are all or nothing: nobody keeps their half.`,
    cta: "browse",
  });
}
```

with:

```ts
  await detachMember(ctx, otherListingId, brokenByUserId);
  await notify(ctx, {
    userId: brokenByUserId,
    kind: "swap_undone",
    actorId: wrongedUserId,
    listingId: otherListingId,
    requestId: req._id,
    data: { college: other.college, dateTime: other.dateTime },
  });
}
```

- Replace `undoSwapsForCancelledListing` with:

```ts
/** Undo every swap tied to a listing that is being cancelled. */
export async function undoSwapsForCancelledListing(
  ctx: MutationCtx,
  listing: Doc<"listings">,
): Promise<void> {
  const swaps = await acceptedSwapsForListing(ctx, listing._id);
  for (const req of swaps) {
    await undoSwap(ctx, req, listing._id);
  }
}
```

Keep `FormalNotice` and `sendFormalNotices` (still used by `leaveGroup` and `removeMember`).

- [ ] **Step 7: `respondToPartyInvite` — party_response**

In `convex/partyInvites.ts`, replace `import { sendFormalNotices } from "./swapLinks";` with `import { notify } from "./notify";` and replace:

```ts
    if (response === "out") {
      const me = await ctx.db.get(userId);
      await sendFormalNotices(ctx, [
        {
          userId: req.fromUserId,
          subject: `${me?.name?.split(" ")[0] ?? "A friend"} can't make it`,
          body: `${me?.name?.split(" ")[0] ?? "A friend"} said "Not me" to your group request, so it's one seat smaller now. The rest of the request still stands.`,
          cta: "formals",
        },
      ]);
    }
    return null;
```

with:

```ts
    const listing = await ctx.db.get(req.targetListingId);
    await notify(ctx, {
      userId: req.fromUserId,
      kind: "party_response",
      actorId: userId,
      listingId: req.targetListingId,
      requestId,
      data: {
        response,
        ...(listing ? { college: listing.college, dateTime: listing.dateTime } : {}),
      },
    });
    return null;
```

- [ ] **Step 8: Clean up `listings.ts` imports**

`internal.emails.sendNewRequestEmail` is no longer referenced from `listings.ts`; `internal` is still used by `createListing` and `expirePastListings`, so keep that import. Keep `FormalNotice` and `sendFormalNotices` imports (used by `leaveGroup`/`removeMember`).

Run: `npx tsc --noEmit -p convex`
Expected: no errors. (If unused-import warnings appear from `npm run lint`, remove exactly the reported names.)

- [ ] **Step 9: Update `convex/swapLinks.test.ts`**

Replace the `scheduledNotices` helper with:

```ts
async function notificationsOf(t: ReturnType<typeof convexTest>) {
  return await t.run(async (ctx) =>
    (await ctx.db.query("notifications").collect()).map((n) => [n.userId, n.kind]),
  );
}
```

In "cancelling your formal loses you the seat you got in return", replace:

```ts
    const notices = await scheduledNotices(s.t);
    expect(notices.map((n) => [n.userId, n.subject])).toEqual(
      expect.arrayContaining([
        [s.alice, "Your swap was undone"],
        [s.wes, "Your formal has been cancelled"],
      ]),
    );
```

with:

```ts
    expect(await notificationsOf(s.t)).toEqual(
      expect.arrayContaining([
        [s.alice, "swap_undone"],
        [s.wes, "formal_cancelled"],
      ]),
    );
```

In "a mirror swap auto-accepts as one linked swap", replace:

```ts
    const notices = await scheduledNotices(t);
    expect(notices.map((n) => n.subject)).not.toContain("Your swap was undone");
```

with:

```ts
    expect((await notificationsOf(t)).map(([, kind]) => kind)).not.toContain("swap_undone");
```

- [ ] **Step 10: Run the tests**

Run: `npx vitest run`
Expected: PASS (new booking tests, updated swap tests, and the existing party/credit/group tests).

- [ ] **Step 11: Push to DEV and commit**

Run: `npx convex dev --once`
Expected: "Convex functions ready!".

```bash
git add convex/listings.ts convex/partyInvites.ts convex/swapLinks.ts convex/swapLinks.test.ts convex/bookingNotifications.test.ts convex/_generated/api.d.ts
git commit -m "FEAT: Requests, group invites, cancellations and undone swaps notify people

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: Social, credit and wishlist notifications

**Files:**
- Modify: `convex/follows.ts` (`follow`, `approveFollower`)
- Modify: `convex/credits.ts` (`holdSeatCredits`, `settleDueHolds`)
- Modify: `convex/listings.ts` (`createListing`)
- Modify: `convex/emails.ts` (remove `notifyWishlistForNewListing`, `getNewListingAlertRecipients`)
- Modify: `convex/pushNotifications.ts` (remove `getWishlistListingPushPayload`, `sendWishlistListingPush`)
- Modify: `convex/SECURITY_STANDARD.md` (drop the removed function's line)
- Test: `convex/socialNotifications.test.ts`

**Interfaces:**
- Consumes: `notify` (Task 3).
- Produces: `new_follower`, `follow_request`, `now_friends` (both sides), `credit_earned` (`data.pending: true`, `data.count`), `credit_paid_out` (`data.count`), `wishlist_listing`.

- [ ] **Step 1: Write the failing test**

Create `convex/socialNotifications.test.ts`:

```ts
/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { describe, expect, test, vi } from "vitest";
import { api, internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import schema from "./schema";

const modules = import.meta.glob("./**/*.*s");

const DAY = 864e5;
const inDays = (n: number) => new Date(Date.now() + n * DAY).toISOString();

type T = ReturnType<typeof convexTest>;

const makeUser = (t: T, name: string, college = "Keble", isPrivate = false) =>
  t.run((ctx) =>
    ctx.db.insert("users", {
      name,
      email: `${name.toLowerCase()}@ox.ac.uk`,
      emailVerificationTime: 1,
      agreedToRules: true,
      college,
      year: "2",
      role: "UG",
      ...(isPrivate ? { isPrivate: true } : {}),
    }),
  );

const as = (t: T, id: Id<"users">) => t.withIdentity({ subject: `${id}|s` });

const kindsFor = async (t: T, userId: Id<"users">) =>
  (
    await t.run((ctx) =>
      ctx.db
        .query("notifications")
        .withIndex("by_userId_and_createdAt", (q) => q.eq("userId", userId))
        .collect(),
    )
  ).map((n) => n.kind);

describe("social notifications", () => {
  test("follow, then follow back makes friends on both sides", async () => {
    const t = convexTest(schema, modules);
    const ann = await makeUser(t, "Ann");
    const ben = await makeUser(t, "Ben");
    await as(t, ann).mutation(api.follows.follow, { userId: ben });
    expect(await kindsFor(t, ben)).toEqual(["new_follower"]);
    await as(t, ben).mutation(api.follows.follow, { userId: ann });
    expect(await kindsFor(t, ann)).toEqual(["now_friends"]);
    expect(await kindsFor(t, ben)).toEqual(["new_follower", "now_friends"]);
  });

  test("following a private account asks; approving a follow-back makes friends", async () => {
    const t = convexTest(schema, modules);
    const ann = await makeUser(t, "Ann");
    const cat = await makeUser(t, "Cat", "Keble", true);
    await as(t, cat).mutation(api.follows.follow, { userId: ann }); // Ann is public
    await as(t, ann).mutation(api.follows.follow, { userId: cat });
    expect(await kindsFor(t, cat)).toEqual(["follow_request"]);
    await as(t, cat).mutation(api.follows.approveFollower, { userId: ann });
    expect(await kindsFor(t, cat)).toEqual(["follow_request", "now_friends"]);
    expect(await kindsFor(t, ann)).toEqual(["new_follower", "now_friends"]);
  });
});

describe("credit notifications", () => {
  test("accepting a credit guest tells the host a credit is coming, then paid", async () => {
    const t = convexTest(schema, modules);
    const gia = await makeUser(t, "Gia");
    const hal = await makeUser(t, "Hal", "Worcester");
    const listing = await as(t, hal).mutation(api.listings.createListing, {
      dateTime: inDays(3),
      groupSize: 4,
      message: "",
      listingType: "swap",
    });
    const { requestId } = await as(t, gia).mutation(api.listings.createRequest, {
      requestType: "credit",
      targetListingId: listing,
      message: "",
    });
    await as(t, hal).mutation(api.listings.acceptRequest, { requestId });
    vi.setSystemTime(Date.now() + 4 * DAY + 36e5);
    await t.mutation(internal.credits.settleDueHolds, {});
    const rows = await t.run((ctx) =>
      ctx.db
        .query("notifications")
        .withIndex("by_userId_and_createdAt", (q) => q.eq("userId", hal))
        .collect(),
    );
    expect(rows.map((r) => [r.kind, r.data?.count, r.data?.pending])).toEqual([
      ["request_received", 1, undefined],
      ["credit_earned", 1, true],
      ["credit_paid_out", 1, undefined],
    ]);
  });
});

describe("wishlist notifications", () => {
  test("a new listing notifies people wishing for that college, not the host", async () => {
    const t = convexTest(schema, modules);
    const ann = await makeUser(t, "Ann", "Keble");
    const hal = await makeUser(t, "Hal", "Worcester");
    await t.run(async (ctx) => {
      await ctx.db.insert("collegeWishlists", { userId: ann, college: "Worcester" });
      await ctx.db.insert("collegeWishlists", { userId: hal, college: "Worcester" });
    });
    const listing = await as(t, hal).mutation(api.listings.createListing, {
      dateTime: inDays(3),
      groupSize: 4,
      message: "",
      listingType: "swap",
    });
    const rows = await t.run((ctx) => ctx.db.query("notifications").collect());
    expect(rows).toMatchObject([
      { userId: ann, kind: "wishlist_listing", actorId: hal, listingId: listing, data: { college: "Worcester" } },
    ]);
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run convex/socialNotifications.test.ts`
Expected: FAIL — no notifications.

- [ ] **Step 3: Follows**

In `convex/follows.ts` add `import { notify } from "./notify";` and replace `follow`'s handler body after `if (existing) return existing.status;`:

```ts
    const status = target.isPrivate === true ? "pending" : "active";
    await ctx.db.insert("follows", { followerId: me, followeeId: userId, status });
    return status;
```

with:

```ts
    const status = target.isPrivate === true ? "pending" : "active";
    await ctx.db.insert("follows", { followerId: me, followeeId: userId, status });
    if (status === "pending") {
      await notify(ctx, { userId, kind: "follow_request", actorId: me });
    } else if (await isActiveFollower(ctx, userId, me)) {
      await notify(ctx, { userId, kind: "now_friends", actorId: me });
      await notify(ctx, { userId: me, kind: "now_friends", actorId: userId });
    } else {
      await notify(ctx, { userId, kind: "new_follower", actorId: me });
    }
    return status;
```

In `approveFollower`, replace:

```ts
    if (existing.status === "pending") {
      await ctx.db.patch(existing._id, { status: "active" });
    }
    return null;
```

with:

```ts
    if (existing.status === "pending") {
      await ctx.db.patch(existing._id, { status: "active" });
      if (await isActiveFollower(ctx, me, userId)) {
        await notify(ctx, { userId, kind: "now_friends", actorId: me });
        await notify(ctx, { userId: me, kind: "now_friends", actorId: userId });
      }
    }
    return null;
```

- [ ] **Step 4: Credits**

In `convex/credits.ts` add `import { notify } from "./notify";`.

At the end of `holdSeatCredits` (after the `for (const c of args.charges) { … insert creditHolds … }` loop) add:

```ts
  const req = await ctx.db.get(args.requestId);
  await notify(ctx, {
    userId: args.listing.ownerUserId,
    kind: "credit_earned",
    ...(req ? { actorId: req.fromUserId } : {}),
    listingId: args.listing._id,
    requestId: args.requestId,
    data: {
      college: args.listing.college,
      dateTime: args.listing.dateTime,
      count: args.charges.length,
      pending: true,
    },
  });
```

In `settleDueHolds`, replace:

```ts
    for (const hold of due) {
      await ctx.db.patch(hold._id, { status: "paid" });
      await adjustCredits(ctx, hold.hostId, 1);
    }
```

with:

```ts
    const paidOut = new Map<string, { hostId: Id<"users">; listingId: Id<"listings">; count: number }>();
    for (const hold of due) {
      await ctx.db.patch(hold._id, { status: "paid" });
      await adjustCredits(ctx, hold.hostId, 1);
      const key = `${hold.hostId}|${hold.listingId}`;
      const entry = paidOut.get(key) ?? { hostId: hold.hostId, listingId: hold.listingId, count: 0 };
      entry.count++;
      paidOut.set(key, entry);
    }
    for (const { hostId, listingId, count } of paidOut.values()) {
      const listing = await ctx.db.get(listingId);
      await notify(ctx, {
        userId: hostId,
        kind: "credit_paid_out",
        listingId,
        data: {
          count,
          ...(listing ? { college: listing.college, dateTime: listing.dateTime } : {}),
        },
      });
    }
```

- [ ] **Step 5: Wishlist listings**

In `createListing` (`convex/listings.ts`), replace:

```ts
    await ctx.scheduler.runAfter(0, internal.emails.notifyWishlistForNewListing, {
      listingId,
    });

    await ctx.scheduler.runAfter(
      0,
      internal.pushNotifications.sendWishlistListingPush,
      { listingId },
    );
```

with:

```ts
    // Everyone wishing for this college hears about it (bell, push, and email
    // if they've turned "Credits & reminders" email on).
    const wishers = await ctx.db
      .query("collegeWishlists")
      .withIndex("by_college", (q) => q.eq("college", college))
      .take(500);
    const told = new Set<Id<"users">>();
    for (const w of wishers) {
      if (w.userId === userId || told.has(w.userId)) continue;
      told.add(w.userId);
      await notify(ctx, {
        userId: w.userId,
        kind: "wishlist_listing",
        actorId: userId,
        listingId,
        data: { college, dateTime: new Date(timestamp).toISOString() },
      });
    }
```

Then remove the now-unused wishlist fan-out functions:
- `convex/emails.ts`: delete `export const notifyWishlistForNewListing = …` and `export const getNewListingAlertRecipients = …` (and `listingAlertRecipientValidator` if nothing else uses it). Keep `getNewListingAlertEmailPayload` and `sendNewListingAlertEmail` — `deliver` uses them.
- `convex/pushNotifications.ts`: delete `getWishlistListingPushPayload` and `sendWishlistListingPush`. Keep `wishlistPushDataValidator` only if still referenced.
- `convex/SECURITY_STANDARD.md`: delete the line ``- `sendWishlistListingPush` (`internalAction`): `InternalOnly` ``.

Run: `grep -rn "notifyWishlistForNewListing\|getNewListingAlertRecipients\|sendWishlistListingPush\|getWishlistListingPushPayload" convex components app lib`
Expected: no matches outside `convex/_generated` (which the next push regenerates).

- [ ] **Step 6: Run the tests**

Run: `npx vitest run`
Expected: PASS. (`bookingNotifications.test.ts` clears follow notifications in `setup`, so it's unaffected.)

- [ ] **Step 7: Push to DEV and commit**

Run: `npx convex dev --once`
Expected: "Convex functions ready!".

```bash
git add convex/follows.ts convex/credits.ts convex/listings.ts convex/emails.ts convex/pushNotifications.ts convex/SECURITY_STANDARD.md convex/socialNotifications.test.ts convex/_generated/api.d.ts
git commit -m "FEAT: Follows, credits and wishlist listings notify people

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---
### Task 8: Formal reminders and retention

**Files:**
- Create: `convex/londonTime.ts`
- Modify: `convex/notifications.ts` (add `sendFormalReminders`, `pruneOldNotifications`)
- Modify: `convex/crons.ts`
- Test: `convex/reminders.test.ts`

**Interfaces:**
- Consumes: `notify` (Task 3).
- Produces: `londonHour(ms): number`, `londonDayRange(ms, offsetDays): { start: number; end: number }` (UTC ms of London midnight to next London midnight); `internal.notifications.sendFormalReminders({})` → `{ sent }`; `internal.notifications.pruneOldNotifications({})` → `{ deleted }`; `REMINDER_HOUR = 9`, `RETENTION_MS` (90 days).

- [ ] **Step 1: Write the failing test**

Create `convex/reminders.test.ts`:

```ts
/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { describe, expect, test, vi } from "vitest";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { londonDayRange, londonHour } from "./londonTime";
import schema from "./schema";

const modules = import.meta.glob("./**/*.*s");

type T = ReturnType<typeof convexTest>;

const makeUser = (t: T, name: string) =>
  t.run((ctx) => ctx.db.insert("users", { name, email: `${name}@ox.ac.uk` }));

const makeListing = (t: T, host: Id<"users">, members: Id<"users">[], dateTime: string) =>
  t.run((ctx) =>
    ctx.db.insert("listings", {
      ownerUserId: host,
      college: "Worcester",
      dateTime,
      groupSize: 4,
      seatsAvailable: 4 - members.length,
      members,
      year: "2",
      role: "UG",
      message: "",
      status: "active",
    }),
  );

describe("london time", () => {
  test("hour and day bounds follow BST and GMT", () => {
    const bst = Date.parse("2026-10-14T08:00:00Z");
    expect(londonHour(bst)).toBe(9);
    expect(londonDayRange(bst, 1)).toEqual({
      start: Date.parse("2026-10-14T23:00:00Z"),
      end: Date.parse("2026-10-15T23:00:00Z"),
    });
    const gmt = Date.parse("2026-12-01T09:00:00Z");
    expect(londonHour(gmt)).toBe(9);
    expect(londonDayRange(gmt, 1)).toEqual({
      start: Date.parse("2026-12-02T00:00:00Z"),
      end: Date.parse("2026-12-03T00:00:00Z"),
    });
  });
});

describe("formal reminders", () => {
  test("at 9am London, everyone seated at tomorrow's formals is reminded once", async () => {
    vi.setSystemTime(new Date("2026-10-14T08:00:00Z")); // 09:00 BST
    const t = convexTest(schema, modules);
    const host = await makeUser(t, "host");
    const guest = await makeUser(t, "guest");
    const loner = await makeUser(t, "loner");
    await makeListing(t, host, [host, guest], "2026-10-15T18:30:00.000Z");
    await makeListing(t, loner, [loner], "2026-10-15T18:30:00.000Z"); // no guests
    await makeListing(t, host, [host, guest], "2026-10-16T18:30:00.000Z"); // day after

    expect(await t.mutation(internal.notifications.sendFormalReminders, {})).toEqual({ sent: 2 });
    expect(await t.mutation(internal.notifications.sendFormalReminders, {})).toEqual({ sent: 0 });
    const rows = await t.run((ctx) => ctx.db.query("notifications").collect());
    expect(rows.map((r) => [r.userId, r.kind])).toEqual([
      [host, "formal_tomorrow"],
      [guest, "formal_tomorrow"],
    ]);
  });

  test("does nothing at other hours", async () => {
    vi.setSystemTime(new Date("2026-10-14T07:00:00Z")); // 08:00 BST
    const t = convexTest(schema, modules);
    const host = await makeUser(t, "host");
    const guest = await makeUser(t, "guest");
    await makeListing(t, host, [host, guest], "2026-10-15T18:30:00.000Z");
    expect(await t.mutation(internal.notifications.sendFormalReminders, {})).toEqual({ sent: 0 });
  });
});

describe("retention", () => {
  test("deletes notifications older than 90 days", async () => {
    const t = convexTest(schema, modules);
    const me = await makeUser(t, "me");
    const now = Date.now();
    await t.run(async (ctx) => {
      for (const createdAt of [now - 91 * 864e5, now - 89 * 864e5]) {
        await ctx.db.insert("notifications", {
          userId: me,
          category: "credits",
          kind: "formal_tomorrow",
          dedupeKey: `k${createdAt}`,
          createdAt,
        });
      }
    });
    expect(await t.mutation(internal.notifications.pruneOldNotifications, {})).toEqual({ deleted: 1 });
    expect(await t.run((ctx) => ctx.db.query("notifications").collect())).toHaveLength(1);
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run convex/reminders.test.ts`
Expected: FAIL — cannot resolve `./londonTime`.

- [ ] **Step 3: Create `convex/londonTime.ts`**

```ts
/** Oxford wall-clock helpers (BST/GMT) without a date library. */

const PARTS = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Europe/London",
  year: "numeric",
  month: "numeric",
  day: "numeric",
  hour: "numeric",
  minute: "numeric",
  hourCycle: "h23",
});

function londonParts(ms: number) {
  const out: Record<string, number> = {};
  for (const p of PARTS.formatToParts(new Date(ms))) {
    if (p.type !== "literal") out[p.type] = Number(p.value);
  }
  return { year: out.year, month: out.month, day: out.day, hour: out.hour, minute: out.minute };
}

/** London's offset from UTC at `ms`, in ms (0 in winter, +1h in summer). */
function londonOffsetMs(ms: number): number {
  const p = londonParts(ms);
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute);
  return asUtc - Math.floor(ms / 60_000) * 60_000;
}

/** UTC ms of midnight in London on the given calendar day (day may overflow). */
function londonMidnight(year: number, month: number, day: number): number {
  const guess = Date.UTC(year, month - 1, day);
  return guess - londonOffsetMs(guess);
}

export function londonHour(ms: number): number {
  return londonParts(ms).hour;
}

/** The London calendar day `offsetDays` from the one containing `ms`, as [start, end). */
export function londonDayRange(ms: number, offsetDays: number): { start: number; end: number } {
  const p = londonParts(ms);
  return {
    start: londonMidnight(p.year, p.month, p.day + offsetDays),
    end: londonMidnight(p.year, p.month, p.day + offsetDays + 1),
  };
}
```

- [ ] **Step 4: Add the two cron mutations to `convex/notifications.ts`**

Add imports:

```ts
import { internal } from "./_generated/api";
import { londonDayRange, londonHour } from "./londonTime";
import { notify } from "./notify";
```

Append:

```ts
/** Reminders go out at 9am Oxford time. */
export const REMINDER_HOUR = 9;
export const RETENTION_MS = 90 * 24 * 60 * 60 * 1000;
const PRUNE_BATCH = 500;

/**
 * "Worcester is tomorrow at 7:30 pm." to everyone seated at a formal tomorrow
 * (formals with at least one guest). The cron fires at 08:00 and 09:00 UTC so
 * one of them is 09:00 in London whatever the season; the other does nothing.
 */
export const sendFormalReminders = internalMutation({
  args: {},
  returns: v.object({ sent: v.number() }),
  handler: async (ctx) => {
    const now = Date.now();
    if (londonHour(now) !== REMINDER_HOUR) return { sent: 0 };
    const { start, end } = londonDayRange(now, 1);
    const from = new Date(start).toISOString();
    const to = new Date(end).toISOString();
    let sent = 0;
    for (const status of ["active", "confirmed", "closed"] as const) {
      const listings = await ctx.db
        .query("listings")
        .withIndex("by_status_and_dateTime", (q) =>
          q.eq("status", status).gte("dateTime", from).lt("dateTime", to),
        )
        .take(200);
      for (const listing of listings) {
        if (listing.members.length < 2) continue;
        for (const userId of listing.members) {
          const id = await notify(ctx, {
            userId,
            kind: "formal_tomorrow",
            listingId: listing._id,
            data: { college: listing.college, dateTime: listing.dateTime },
          });
          if (id) sent++;
        }
      }
    }
    return { sent };
  },
});

/** Daily: notifications older than 90 days go, in batches. */
export const pruneOldNotifications = internalMutation({
  args: {},
  returns: v.object({ deleted: v.number() }),
  handler: async (ctx) => {
    const cutoff = Date.now() - RETENTION_MS;
    const old = await ctx.db
      .query("notifications")
      .withIndex("by_createdAt", (q) => q.lt("createdAt", cutoff))
      .take(PRUNE_BATCH);
    for (const n of old) await ctx.db.delete(n._id);
    if (old.length === PRUNE_BATCH) {
      await ctx.scheduler.runAfter(0, internal.notifications.pruneOldNotifications, {});
    }
    return { deleted: old.length };
  },
});
```

- [ ] **Step 5: Register the crons**

In `convex/crons.ts`, before `export default crons;` add:

```ts
// 08:00 and 09:00 UTC: whichever is 09:00 in London sends the reminders.
crons.cron(
  "formal tomorrow reminders",
  "0 8,9 * * *",
  internal.notifications.sendFormalReminders,
  {},
);

crons.cron(
  "delete old notifications",
  "30 3 * * *",
  internal.notifications.pruneOldNotifications,
  {},
);
```

- [ ] **Step 6: Run the tests**

Run: `npx vitest run`
Expected: PASS.

- [ ] **Step 7: Push to DEV and commit**

Run: `npx convex dev --once`
Expected: "Convex functions ready!".

```bash
git add convex/londonTime.ts convex/notifications.ts convex/crons.ts convex/reminders.test.ts convex/_generated/api.d.ts
git commit -m "FEAT: Morning-before reminders, and old notifications are cleared after 90 days

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 9: Chat messages push to browsers

**Files:**
- Modify: `convex/pushNotifications.ts` (add `getChatWebPushPayload`)
- Modify: `convex/notificationDelivery.ts` (add `sendChatWebPush`)
- Modify: `convex/chat.ts` (`sendMessage` schedules it)
- Test: `convex/chatWebPush.test.ts`

**Interfaces:**
- Consumes: `pushAllowed` (Task 1), `sendWeb` (Task 3, private to `notificationDelivery.ts`), existing private helpers in `pushNotifications.ts` (`conversationKind`, `otherParticipantId`, `getGroupMemberUserIds`, `resolveGroupTitle`, `truncatePreview`).
- Produces: `internal.pushNotifications.getChatWebPushPayload({ messageId })` → `null | { items: { title, body, url, tag, subscriptions: {endpoint,p256dh,auth}[] }[] }`; `internal.notificationDelivery.sendChatWebPush({ messageId })`. No bell rows.

- [ ] **Step 1: Write the failing test**

Create `convex/chatWebPush.test.ts`:

```ts
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
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run convex/chatWebPush.test.ts`
Expected: FAIL — `getChatWebPushPayload` is not a function.

- [ ] **Step 3: Add `getChatWebPushPayload` to `convex/pushNotifications.ts`**

Add `import { pushAllowed } from "./notificationPrefs";` and append:

```ts
const webSubscriptionValidator = v.object({
  endpoint: v.string(),
  p256dh: v.string(),
  auth: v.string(),
});

/**
 * Web push for a chat message: one item per recipient with browser
 * subscriptions, gated by their "Social" push setting (the mobile app keeps
 * using `pushChatAlerts`). Chat never creates bell rows.
 */
export const getChatWebPushPayload = internalQuery({
  args: { messageId: v.id("messages") },
  returns: v.union(
    v.null(),
    v.object({
      items: v.array(
        v.object({
          title: v.string(),
          body: v.string(),
          url: v.string(),
          tag: v.string(),
          subscriptions: v.array(webSubscriptionValidator),
        }),
      ),
    }),
  ),
  handler: async (ctx, { messageId }) => {
    const message = await ctx.db.get(messageId);
    if (!message) return null;
    const convo = await ctx.db.get(message.conversationId);
    if (!convo) return null;

    const sender = await ctx.db.get(message.senderUserId);
    const senderName = sender?.name?.trim() || "User";
    const preview = truncatePreview(message.body);
    const isGroup = conversationKind(convo) === "group";
    const recipientIds = isGroup
      ? (await getGroupMemberUserIds(ctx, convo._id)).filter((id) => id !== message.senderUserId)
      : [otherParticipantId(convo, message.senderUserId)];
    const title = isGroup ? await resolveGroupTitle(ctx, convo, message.senderUserId) : senderName;
    const body = isGroup ? `${senderName}: ${preview}` : preview;
    const url = `/?tab=chats&conversation=${convo._id}`;

    const items = [];
    for (const recipientId of recipientIds) {
      const user = await ctx.db.get(recipientId);
      if (!user || user.deletedAt !== undefined || !pushAllowed(user, "social")) continue;
      const subs = await ctx.db
        .query("webPushSubscriptions")
        .withIndex("by_userId", (q) => q.eq("userId", recipientId))
        .take(20);
      if (subs.length === 0) continue;
      items.push({
        title,
        body,
        url,
        tag: `chat:${convo._id}`,
        subscriptions: subs.map((s) => ({ endpoint: s.endpoint, p256dh: s.p256dh, auth: s.auth })),
      });
    }
    return items.length > 0 ? { items } : null;
  },
});
```

- [ ] **Step 4: Add `sendChatWebPush` to `convex/notificationDelivery.ts`**

Append:

```ts
/** Web push for one chat message (see getChatWebPushPayload). */
export const sendChatWebPush = internalAction({
  args: { messageId: v.id("messages") },
  returns: v.null(),
  handler: async (ctx, { messageId }) => {
    const payload = await ctx.runQuery(internal.pushNotifications.getChatWebPushPayload, {
      messageId,
    });
    if (!payload) return null;
    for (const item of payload.items) {
      await sendWeb(ctx, item.subscriptions, {
        title: item.title,
        body: item.body,
        url: item.url,
        tag: item.tag,
      });
    }
    return null;
  },
});
```

- [ ] **Step 5: Schedule it from `sendMessage`**

In `convex/chat.ts` `sendMessage`, directly after:

```ts
    await ctx.scheduler.runAfter(
      0,
      internal.pushNotifications.sendChatMessagePush,
      { messageId },
    );
```

add:

```ts
    await ctx.scheduler.runAfter(0, internal.notificationDelivery.sendChatWebPush, {
      messageId,
    });
```

- [ ] **Step 6: Run the tests**

Run: `npx vitest run`
Expected: PASS.

- [ ] **Step 7: Push to DEV and commit**

Run: `npx convex dev --once`
Expected: "Convex functions ready!".

```bash
git add convex/pushNotifications.ts convex/notificationDelivery.ts convex/chat.ts convex/chatWebPush.test.ts convex/_generated/api.d.ts
git commit -m "FEAT: Chat messages push to your browser too

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---
### Task 10: Web push on the client

**Files:**
- Create: `public/sw.js`
- Create: `lib/push/webPush.ts`
- Modify: `next.config.ts` (no-cache header for `/sw.js`)

**Interfaces:**
- Consumes: `api.notifications.saveWebPushSubscription` (Task 5); `NEXT_PUBLIC_VAPID_PUBLIC_KEY` (Task 3, Step 10).
- Produces: `webPushSupported(): boolean`, `ensureWebPushSubscription(save, { prompt }): Promise<"granted" | "denied" | "default" | "unsupported">` where `save: (sub: { endpoint: string; p256dh: string; auth: string }) => Promise<unknown>`.

Read first: `node_modules/next/dist/docs/01-app/02-guides/progressive-web-apps.md` (sections 3–5 and 8: subscribing, `public/sw.js`, the `/sw.js` headers).

This task is browser-only code; there's no vitest coverage. It's verified by `tsc`, lint, and by hand in Task 13.

- [ ] **Step 1: Create the service worker**

Create `public/sw.js`:

```js
/* Oxformals service worker: shows pushes and opens their link. */

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { body: event.data ? event.data.text() : "" };
  }
  const title = data.title || "Oxformals";
  event.waitUntil(
    self.registration.showNotification(title, {
      body: data.body || "",
      icon: "/logo.JPG",
      badge: "/logo.JPG",
      tag: data.tag,
      data: { url: data.url || "/" },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = new URL(
    (event.notification.data && event.notification.data.url) || "/",
    self.location.origin,
  ).href;
  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      for (const w of windows) {
        if (w.url === url && "focus" in w) return w.focus();
      }
      for (const w of windows) {
        if ("navigate" in w) {
          await w.focus();
          return w.navigate(url);
        }
      }
      return self.clients.openWindow(url);
    })(),
  );
});
```

- [ ] **Step 2: Create `lib/push/webPush.ts`**

```ts
"use client";

/**
 * Browser push: register the service worker, subscribe with our VAPID key, and
 * save the subscription. Only prompts when asked to (the "Turn on alerts?"
 * card); otherwise just keeps an already-allowed browser's subscription saved.
 */

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";

export type SavedSubscription = { endpoint: string; p256dh: string; auth: string };

/** False on iPhone Safari outside a home-screen app, and without a key. */
export function webPushSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window &&
    VAPID_PUBLIC_KEY !== ""
  );
}

function applicationServerKey(base64: string): ArrayBuffer {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const raw = window.atob((base64 + padding).replace(/-/g, "+").replace(/_/g, "/"));
  const bytes = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
  return bytes.buffer;
}

export async function ensureWebPushSubscription(
  save: (sub: SavedSubscription) => Promise<unknown>,
  { prompt }: { prompt: boolean },
): Promise<NotificationPermission | "unsupported"> {
  if (!webPushSupported()) return "unsupported";
  let permission = Notification.permission;
  if (permission === "default" && prompt) {
    permission = await Notification.requestPermission();
  }
  if (permission !== "granted") return permission;

  const registration = await navigator.serviceWorker.register("/sw.js", {
    scope: "/",
    updateViaCache: "none",
  });
  await navigator.serviceWorker.ready;
  const subscription =
    (await registration.pushManager.getSubscription()) ??
    (await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: applicationServerKey(VAPID_PUBLIC_KEY),
    }));
  const json = subscription.toJSON();
  if (json.endpoint && json.keys?.p256dh && json.keys?.auth) {
    await save({ endpoint: json.endpoint, p256dh: json.keys.p256dh, auth: json.keys.auth });
  }
  return "granted";
}
```

- [ ] **Step 3: Never cache the service worker**

Replace `next.config.ts` with:

```ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/sw.js",
        headers: [
          { key: "Content-Type", value: "application/javascript; charset=utf-8" },
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
        ],
      },
    ];
  },
};

export default nextConfig;
```

(If `next.config.ts` has gained other options since this plan was written, add `headers()` alongside them instead of replacing the file.)

- [ ] **Step 4: Type-check and lint**

Run: `npx tsc --noEmit`
Expected: no errors.

Run: `npm run lint`
Expected: no new errors in `lib/push/webPush.ts` or `next.config.ts`. (`public/sw.js` is plain JS for the browser; if ESLint flags `self`/`clients` globals, add `/* eslint-env serviceworker */` as its first line.)

- [ ] **Step 5: Commit**

```bash
git add public/sw.js lib/push/webPush.ts next.config.ts
git commit -m "FEAT: Service worker and browser push subscription

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 11: The bell and its panel

**Files:**
- Create: `components/notifications/BellIcon.tsx`
- Create: `components/notifications/NotificationBell.tsx`
- Create: `components/notifications/NotificationPanel.tsx`
- Create: `components/notifications/NotificationRow.tsx`
- Create: `components/notifications/AlertsPrompt.tsx`
- Modify: `components/ui/EmptyState.tsx` (add a `bell` icon)
- Modify: `components/Nav.tsx` (bell left of the credits chip)

**Interfaces:**
- Consumes: `api.notifications.getBellState`, `listMyNotifications`, `markAllRead`, `saveWebPushSubscription` (Task 5); `api.partyInvites.respondToPartyInvite`; `api.listings.acceptRequest`, `api.listings.declineRequest`; `relativeTime`, `Segment` (Task 2); `ensureWebPushSubscription`, `webPushSupported` (Task 10); `Avatar` (`components/ui/Avatar.tsx`: `{ name, size?: "sm" | …, source? }`), `EmptyState`.
- Produces: `<NotificationBell />` (self-contained; renders nothing when signed out).

Visual rules (mockup option A): outlined 36px circle bell in nav ink, ink count badge with a nav-bg ring, "9+" cap. Panel: white (`--paper`) with a 2px ink border and 18px radius on desktop, dropping under the bell (360px wide); a full-screen sheet under 640px. Header "Notifications" (display font) + "Mark all read". Section labels "New" / "Earlier" (11px, uppercase, tracked, muted). Rows separated by 1.5px 12%-ink hairlines; no background tint for unread, only an 8px accent dot on the right. Ink primary / outline secondary pill buttons.

- [ ] **Step 1: Bell icon and EmptyState icon**

Create `components/notifications/BellIcon.tsx`:

```tsx
/** Outlined bell, drawn to match the nav's other line icons. */
export function BellIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M6 16v-5a6 6 0 0 1 12 0v5l1.5 2h-15z" />
      <path d="M10 20a2 2 0 0 0 4 0" />
    </svg>
  );
}
```

In `components/ui/EmptyState.tsx`, add to `ICONS`:

```tsx
  bell: (
    <>
      <path d="M6 16v-5a6 6 0 0 1 12 0v5l1.5 2h-15z" />
      <path d="M10 20a2 2 0 0 0 4 0" />
    </>
  ),
```

and add `| "bell"` to the `EmptyIcon` union.

- [ ] **Step 2: Alerts prompt**

Create `components/notifications/AlertsPrompt.tsx`:

```tsx
"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { ensureWebPushSubscription, webPushSupported } from "@/lib/push/webPush";

const DISMISSED_KEY = "oxformals.alertsPrompt.dismissed";

function shouldHide(): boolean {
  if (!webPushSupported()) return true;
  if (Notification.permission !== "default") return true;
  try {
    return window.localStorage.getItem(DISMISSED_KEY) === "1";
  } catch {
    return false;
  }
}

/**
 * "Turn on alerts?" at the top of the panel, once the person has something
 * worth being alerted about. Never shown on page load: the panel only opens
 * when they tap the bell.
 */
export function AlertsPrompt({ eligible }: { eligible: boolean }) {
  const save = useMutation(api.notifications.saveWebPushSubscription);
  const [hidden, setHidden] = useState(shouldHide);
  const [busy, setBusy] = useState(false);
  if (!eligible || hidden) return null;

  const dismiss = () => {
    try {
      window.localStorage.setItem(DISMISSED_KEY, "1");
    } catch {
      // Private mode: it'll ask again next time.
    }
    setHidden(true);
  };

  const turnOn = async () => {
    setBusy(true);
    try {
      await ensureWebPushSubscription((sub) => save(sub), { prompt: true });
    } finally {
      setBusy(false);
      setHidden(true);
    }
  };

  return (
    <div className="mx-4 mb-3 mt-1 rounded-2xl border-[1.5px] border-[color-mix(in_srgb,var(--ink)_14%,transparent)] bg-[var(--bg)] p-3.5">
      <p className="text-sm font-bold text-[var(--ink)]">Turn on alerts?</p>
      <p className="text-sm text-[var(--ink-muted)]">Know when someone wants your seat.</p>
      <div className="mt-2.5 flex gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={() => void turnOn()}
          className="cursor-pointer rounded-full border-2 border-[var(--ink)] bg-[var(--ink)] px-3.5 py-1 text-[13px] font-bold text-[var(--bg)] disabled:opacity-50"
        >
          Turn on
        </button>
        <button
          type="button"
          onClick={dismiss}
          className="cursor-pointer rounded-full border-2 border-[var(--ink)] bg-[var(--paper)] px-3.5 py-1 text-[13px] font-bold text-[var(--ink)]"
        >
          Not now
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: A row**

Create `components/notifications/NotificationRow.tsx`:

```tsx
"use client";

import Link from "next/link";
import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { FunctionReturnType } from "convex/server";
import type { Id } from "@/convex/_generated/dataModel";
import { relativeTime } from "@/convex/notificationCopy";
import { Avatar } from "@/components/ui/Avatar";
import type { AvatarSource } from "@/lib/auth/types";
import { BellIcon } from "./BellIcon";

export type BellItem = FunctionReturnType<
  typeof api.notifications.listMyNotifications
>["page"][number];

const ink =
  "cursor-pointer rounded-full border-2 border-[var(--ink)] bg-[var(--ink)] px-3.5 py-1 text-[13px] font-bold text-[var(--bg)] disabled:opacity-50";
const outline =
  "cursor-pointer rounded-full border-2 border-[var(--ink)] bg-[var(--paper)] px-3.5 py-1 text-[13px] font-bold text-[var(--ink)] disabled:opacity-50";

function RowActions({ item }: { item: BellItem }) {
  const respond = useMutation(api.partyInvites.respondToPartyInvite);
  const accept = useMutation(api.listings.acceptRequest);
  const decline = useMutation(api.listings.declineRequest);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { action, requestId } = item;
  if (!action || !requestId) return null;

  const run = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    setError(null);
    try {
      await fn();
    } catch (err) {
      setError(err instanceof Error ? err.message : "That didn't work.");
    } finally {
      setBusy(false);
    }
  };

  let body: React.ReactNode = null;
  if (action.type === "party") {
    body =
      action.state === "pending" ? (
        <>
          <button type="button" disabled={busy} className={ink}
            onClick={() => void run(() => respond({ requestId: requestId as Id<"requests">, response: "in" }))}>
            I&apos;m in
          </button>
          <button type="button" disabled={busy} className={outline}
            onClick={() => void run(() => respond({ requestId: requestId as Id<"requests">, response: "out" }))}>
            Not me
          </button>
        </>
      ) : action.state === "in" ? (
        <span className="text-xs text-[var(--ink-muted)]">You&apos;re in.</span>
      ) : action.state === "out" ? (
        <span className="text-xs text-[var(--ink-muted)]">You said not me.</span>
      ) : null;
  } else {
    body =
      action.state === "pending" ? (
        <>
          <button type="button" disabled={busy} className={ink}
            onClick={() => void run(() => accept({ requestId: requestId as Id<"requests"> }))}>
            Accept
          </button>
          <button type="button" disabled={busy} className={outline}
            onClick={() => void run(() => decline({ requestId: requestId as Id<"requests"> }))}>
            Decline
          </button>
        </>
      ) : (
        <span className="text-xs text-[var(--ink-muted)]">
          {action.state === "accepted" ? "Accepted." : action.state === "declined" ? "Declined." : "Withdrawn."}
        </span>
      );
  }
  if (!body) return null;
  return (
    <>
      <div className="mt-2 flex items-center gap-2">{body}</div>
      {error ? <p className="mt-1 text-xs text-[var(--danger)]">{error}</p> : null}
    </>
  );
}

export function NotificationRow({
  item,
  isNew,
  nowMs,
  onNavigate,
}: {
  item: BellItem;
  isNew: boolean;
  nowMs: number;
  onNavigate: () => void;
}) {
  return (
    <li className="flex gap-3 border-t-[1.5px] border-[color-mix(in_srgb,var(--ink)_12%,transparent)] px-4 py-3">
      <Link href={item.url} onClick={onNavigate} className="shrink-0" tabIndex={-1} aria-hidden>
        {item.actor ? (
          <Avatar
            name={item.actor.name ?? "Someone"}
            size="sm"
            source={item.actor.avatar as AvatarSource | undefined}
          />
        ) : (
          <span className="flex h-8 w-8 items-center justify-center rounded-full border-[2px] border-[var(--ink)] text-[var(--ink)]">
            <BellIcon className="h-3.5 w-3.5" />
          </span>
        )}
      </Link>
      <div className="min-w-0 flex-1">
        <Link href={item.url} onClick={onNavigate} className="block text-sm leading-snug text-[var(--ink)]">
          {item.segments.map((s, i) =>
            s.bold ? (
              <span key={i} className="font-bold">{s.text}</span>
            ) : (
              <span key={i}>{s.text}</span>
            ),
          )}
        </Link>
        <p className="mt-0.5 text-xs text-[var(--ink-muted)]">{relativeTime(item.createdAt, nowMs)}</p>
        <RowActions item={item} />
      </div>
      {isNew ? (
        <span aria-label="Unread" className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-[var(--accent)]" />
      ) : null}
    </li>
  );
}
```

- [ ] **Step 4: The panel**

Create `components/notifications/NotificationPanel.tsx`:

```tsx
"use client";

import { useEffect, useState } from "react";
import { useMutation, usePaginatedQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { EmptyState } from "@/components/ui/EmptyState";
import { AlertsPrompt } from "./AlertsPrompt";
import { NotificationRow, type BellItem } from "./NotificationRow";

const PAGE = 30;

const sectionLabel =
  "px-4 pb-1 pt-2.5 text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--ink-muted)]";

/**
 * Dropdown under the bell on desktop, full-screen sheet on phones. Opening it
 * reads everything; what was unread at that moment stays under "New" (with a
 * dot) until it closes.
 */
export function NotificationPanel({
  alertsEligible,
  onClose,
}: {
  alertsEligible: boolean;
  onClose: () => void;
}) {
  const { results, status, loadMore } = usePaginatedQuery(
    api.notifications.listMyNotifications,
    {},
    { initialNumItems: PAGE },
  );
  const markAllRead = useMutation(api.notifications.markAllRead);
  const [nowMs] = useState(() => Date.now());
  const [newIds, setNewIds] = useState<Set<string> | null>(null);

  if (newIds === null && status !== "LoadingFirstPage") {
    setNewIds(new Set(results.filter((r) => r.readAt === undefined).map((r) => r._id)));
  }
  const snapshotTaken = newIds !== null;
  useEffect(() => {
    if (snapshotTaken) void markAllRead({});
  }, [snapshotTaken, markAllRead]);

  const isNew = (r: BellItem) => (newIds?.has(r._id) ?? false) || r.readAt === undefined;
  const fresh = results.filter(isNew);
  const earlier = results.filter((r) => !isNew(r));

  const list = (items: BellItem[]) => (
    <ul>
      {items.map((item) => (
        <NotificationRow key={item._id} item={item} isNew={isNew(item)} nowMs={nowMs} onNavigate={onClose} />
      ))}
    </ul>
  );

  return (
    <div
      role="dialog"
      aria-label="Notifications"
      className="fixed inset-0 z-[60] flex flex-col overflow-hidden bg-[var(--paper)] text-[var(--ink)] sm:absolute sm:inset-auto sm:right-0 sm:top-[calc(100%+0.75rem)] sm:max-h-[min(70vh,560px)] sm:w-[360px] sm:rounded-[18px] sm:border-[2px] sm:border-[var(--ink)]"
    >
      <div className="flex items-baseline justify-between gap-3 px-4 pb-2 pt-3.5">
        <h2 className="font-display text-2xl leading-none">Notifications</h2>
        <div className="flex items-baseline gap-4">
          <button
            type="button"
            onClick={() => {
              void markAllRead({});
              setNewIds(new Set());
            }}
            className="cursor-pointer text-[13px] text-[var(--ink-muted)] underline underline-offset-2"
          >
            Mark all read
          </button>
          <button
            type="button"
            onClick={onClose}
            className="cursor-pointer text-[13px] font-bold sm:hidden"
          >
            Close
          </button>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto pb-2">
        <AlertsPrompt eligible={alertsEligible} />
        {status === "LoadingFirstPage" ? null : results.length === 0 ? (
          <EmptyState compact icon="bell" title="No notifications yet" />
        ) : (
          <>
            {fresh.length > 0 ? (
              <>
                <p className={sectionLabel}>New</p>
                {list(fresh)}
              </>
            ) : null}
            {earlier.length > 0 ? (
              <>
                <p className={sectionLabel}>Earlier</p>
                {list(earlier)}
              </>
            ) : null}
            {status === "CanLoadMore" ? (
              <div className="flex justify-center px-4 pt-2">
                <button
                  type="button"
                  onClick={() => loadMore(PAGE)}
                  className="cursor-pointer rounded-full border-2 border-[var(--ink)] bg-[var(--paper)] px-4 py-1 text-[13px] font-bold"
                >
                  Load more
                </button>
              </div>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 5: The bell**

Create `components/notifications/NotificationBell.tsx`:

```tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { ensureWebPushSubscription } from "@/lib/push/webPush";
import { BellIcon } from "./BellIcon";
import { NotificationPanel } from "./NotificationPanel";

const SYNCED_KEY = "oxformals.pushSynced";

export function NotificationBell() {
  const bell = useQuery(api.notifications.getBellState, {});
  const save = useMutation(api.notifications.saveWebPushSubscription);
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  // Close when the route changes (e.g. after tapping a row).
  const [lastPath, setLastPath] = useState(pathname);
  if (lastPath !== pathname) {
    setLastPath(pathname);
    if (open) setOpen(false);
  }

  // Alerts already allowed here: keep this browser's subscription saved,
  // once per session. Never prompts.
  useEffect(() => {
    try {
      if (window.sessionStorage.getItem(SYNCED_KEY) === "1") return;
      window.sessionStorage.setItem(SYNCED_KEY, "1");
    } catch {
      // Storage blocked: sync anyway.
    }
    void ensureWebPushSubscription((sub) => save(sub), { prompt: false }).catch(() => {});
  }, [save]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  if (!bell) return null;
  const badge = bell.unread >= 10 ? "9+" : bell.unread > 0 ? String(bell.unread) : null;

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-label={badge ? `Notifications, ${badge} unread` : "Notifications"}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="relative inline-flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full border-[2px] border-[var(--nav-ink)] text-[var(--nav-ink)] transition-colors hover:bg-[var(--nav-ink)] hover:text-[var(--nav-bg)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--nav-ink)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--nav-bg)]"
      >
        <BellIcon />
        {badge ? (
          <span className="absolute -right-1.5 -top-1.5 min-w-[1.25rem] rounded-full border-2 border-[var(--nav-bg)] bg-[var(--nav-ink)] px-1 text-center text-[11px] font-bold leading-4 text-[var(--nav-bg)]">
            {badge}
          </span>
        ) : null}
      </button>
      {open ? (
        <NotificationPanel alertsEligible={bell.alertsEligible} onClose={() => setOpen(false)} />
      ) : null}
    </div>
  );
}
```

- [ ] **Step 6: Put the bell in the nav**

In `components/Nav.tsx` add `import { NotificationBell } from "@/components/notifications/NotificationBell";` and replace:

```tsx
          {status === "ready" && isAuthenticated && user ? <CreditsChip compact /> : null}
```

with:

```tsx
          {status === "ready" && isAuthenticated && user ? (
            <>
              <NotificationBell />
              <CreditsChip compact />
            </>
          ) : null}
```

- [ ] **Step 7: Type-check, lint, and look at it**

Run: `npx tsc --noEmit && npm run lint`
Expected: no errors in the new files.

Run `npm run dev` (against the DEV Convex deployment), sign in, and check:
- The bell sits left of the credits chip, same outlined circle as the menu button; the badge shows the unread count ("9+" past 9).
- Desktop: panel drops under the bell, 360px wide, white, ink border. Phone width (<640px): full-screen sheet with "Close".
- Unread rows have only the small accent dot — no tinted background. "New" then "Earlier".
- A `party_invite` row shows "I'm in" (ink) / "Not me" (outline); after tapping, the row shows the outcome instead. A `request_received` row shows "Accept" / "Decline".
- Opening the panel clears the badge. Empty state shows the bell icon card.
- No emojis, no dashed or dotted lines anywhere.

- [ ] **Step 8: Commit**

```bash
git add components/notifications/BellIcon.tsx components/notifications/NotificationBell.tsx components/notifications/NotificationPanel.tsx components/notifications/NotificationRow.tsx components/notifications/AlertsPrompt.tsx components/ui/EmptyState.tsx components/Nav.tsx
git commit -m "FEAT: Notification bell with a panel you can act from

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 12: Notification settings

**Files:**
- Create: `components/notifications/NotificationSettings.tsx`
- Modify: `components/SettingsModal.tsx` (replace the single email toggle)

**Interfaces:**
- Consumes: `api.notifications.getMyNotificationPrefs`, `api.notifications.setNotificationPref` (Task 5).
- Produces: `<NotificationSettings />`.

- [ ] **Step 1: Create the grid**

Create `components/notifications/NotificationSettings.tsx`:

```tsx
"use client";

import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

const ROWS = [
  ["bookings", "Bookings"],
  ["invites", "Group invites"],
  ["social", "Social"],
  ["credits", "Credits & reminders"],
] as const;

const CHANNELS = [
  ["push", "Push"],
  ["email", "Email"],
] as const;

function Switch({ on, label, onToggle }: { on: boolean; label: string; onToggle: () => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={onToggle}
      className={`relative h-6 w-10 shrink-0 cursor-pointer rounded-full border-[2px] border-[var(--ink)] transition-colors ${
        on ? "bg-[var(--ink)]" : "bg-[var(--paper)]"
      }`}
    >
      <span
        className={`absolute left-0.5 top-0.5 h-4 w-4 rounded-full transition-transform ${
          on ? "translate-x-4 bg-[var(--paper)]" : "translate-x-0 bg-[var(--ink)]"
        }`}
      />
    </button>
  );
}

/** Push / Email per category. No extra copy. */
export function NotificationSettings() {
  const prefs = useQuery(api.notifications.getMyNotificationPrefs, {});
  const setPref = useMutation(api.notifications.setNotificationPref).withOptimisticUpdate(
    (store, { channel, category, enabled }) => {
      const current = store.getQuery(api.notifications.getMyNotificationPrefs, {});
      if (!current) return;
      store.setQuery(api.notifications.getMyNotificationPrefs, {}, {
        ...current,
        [channel]: { ...current[channel], [category]: enabled },
      });
    },
  );
  if (!prefs) return null;

  return (
    <div className="min-w-0 border-t border-[var(--ink-soft)] pt-5">
      <span className="text-sm text-[var(--ink-muted)]">Notifications</span>
      <table className="mt-2 w-full text-sm">
        <thead>
          <tr>
            <th className="py-2 text-left" />
            {CHANNELS.map(([, label]) => (
              <th
                key={label}
                className="w-16 py-2 text-center text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--ink-muted)]"
              >
                {label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {ROWS.map(([category, label]) => (
            <tr key={category} className="border-t-[1.5px] border-[color-mix(in_srgb,var(--ink)_12%,transparent)]">
              <td className="py-2.5 text-[var(--ink)]">{label}</td>
              {CHANNELS.map(([channel, channelLabel]) => (
                <td key={channel} className="py-2.5">
                  <div className="flex justify-center">
                    <Switch
                      on={prefs[channel][category]}
                      label={`${label} ${channelLabel.toLowerCase()}`}
                      onToggle={() =>
                        void setPref({ channel, category, enabled: !prefs[channel][category] })
                      }
                    />
                  </div>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

- [ ] **Step 2: Swap it into Settings**

In `components/SettingsModal.tsx`:
- Add `import { NotificationSettings } from "@/components/notifications/NotificationSettings";`.
- Delete the state and handler for the old toggle: `notificationsBusy`, `notificationsError` (both `useState`s), `const notificationsOn = …`, `setNotificationsError(null);` inside `handleClose`, and the whole `const onNotificationsToggle = useCallback(…)`.
- Replace the whole block that starts `<div className="min-w-0 border-t border-[var(--ink-soft)] pt-5">` and contains `id="settings-notifications-label"`, the switch, the "Email notifications" card and `notificationsError` (it ends just before `<PrivateAccountSetting />`) with:

```tsx
        <NotificationSettings />
```

- [ ] **Step 3: Type-check, lint, look**

Run: `npx tsc --noEmit && npm run lint`
Expected: no errors (no unused variables left in `SettingsModal.tsx`).

In `npm run dev`: Settings shows "Notifications" with a Push / Email grid for Bookings, Group invites, Social, Credits & reminders; defaults are push all on, email on for the first two. Toggling updates instantly and survives a reload. Switches are ink/paper, not accent.

- [ ] **Step 4: Commit**

```bash
git add components/notifications/NotificationSettings.tsx components/SettingsModal.tsx
git commit -m "FEAT: Push and email settings per kind of notification

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 13: Ship Part 1 to DEV

**Files:** none new (verification only; commit only if a fix is needed).

- [ ] **Step 1: Full test suite**

Run: `npx vitest run`
Expected: all PASS.

- [ ] **Step 2: Build and lint**

Run: `npx tsc --noEmit && npm run lint && npm run build`
Expected: success.

- [ ] **Step 3: Push the backend to DEV**

Run: `npx convex dev --once`
Expected: "Convex functions ready!". Confirm with `npx convex env list` that `VAPID_PUBLIC_KEY` and `VAPID_PRIVATE_KEY` are set on dev. Never `--prod`.

- [ ] **Step 4: End-to-end by hand (two browsers, two test accounts)**

With `npm run dev` (web push needs HTTPS or localhost; Chrome allows localhost):
1. Account A lists a formal; account B requests it. A's bell shows 1; B's panel (after the request) shows "Turn on alerts?". B taps "Turn on" and allows.
2. A accepts from the bell row. B gets a browser push "You're going" and a bell row; tapping the push focuses/opens the app at "Your formals".
3. A and B follow each other (both get "now friends"). A requests another formal naming B as a friend who pays their own credit; B answers "I'm in" from the bell row and the row then reads "You're in."
4. In Settings, B turns Bookings push off; A declines B's next request: bell row appears, no push.
5. Send a chat message A → B: B gets a web push (no bell row).
6. In the Convex dashboard (dev) check `notifications` rows and that `webPushSubscriptions` has B's browser.

- [ ] **Step 5: Remind the user about Vercel**

Tell the user: Part 1 is on DEV; for preview deploys to show browser push they need `NEXT_PUBLIC_VAPID_PUBLIC_KEY` in Vercel's Preview environment (Task 3, Step 10). Nothing goes to prod in this plan.

---
# Part 2 — Invites

### Task 14: Invite tables and link seats in the seat model

**Files:**
- Modify: `convex/schema.ts` (`inviteCodes`, `referrals`, `seatLinks`, `users.by_college`)
- Modify: `convex/seats.ts` (`"link"` party seats)
- Modify: `lib/data/types.ts` (`PartySeat`)
- Modify: `lib/data/party.ts` (`partySuffix`, `unjoinedLinks`)
- Modify: `components/swap/IncomingRequestRow.tsx` ("Waiting for N to join")
- Test: `convex/seats.test.ts`

**Interfaces:**
- Produces:
  - Tables: `inviteCodes { userId, code, createdAt }` (`by_code`, `by_userId`); `referrals { inviterId, inviteeId, source: "link" | "seat", status: "pending" | "earned" | "void", createdAt }` (`by_inviteeId`, `by_inviterId_and_status`); `seatLinks { token, requestId, createdAt }` (`by_token`, `by_requestId`); `users` index `by_college`.
  - Party seat: `kind: "guest" | "friend" | "link"`, plus optional `token`, `expiresAt`, `paysOwn`.
  - `requestSeats(req)` treats an unanswered link seat as an unnamed guest seat (it can't be accepted anyway until claimed).
  - `unclaimedLinkSeats(req): number` (from `convex/seats.ts`).
  - `unjoinedLinks(request): number` (from `lib/data/party.ts`).

- [ ] **Step 1: Write the failing test**

Create `convex/seats.test.ts`:

```ts
import { describe, expect, test } from "vitest";
import type { Doc } from "./_generated/dataModel";
import { requestSeats, unclaimedLinkSeats } from "./seats";

const req = (party: unknown[]) =>
  ({ fromUserId: "u1", requestType: "credit", party }) as unknown as Doc<"requests">;

describe("link seats", () => {
  test("an open link seat takes a seat; an expired one doesn't", () => {
    const r = req([
      { kind: "link", token: "a", payerId: "u1", method: "credit", paysOwn: true, response: "pending", expiresAt: 1 },
      { kind: "link", token: "b", payerId: "u1", method: "pay", response: "out", expiresAt: 1 },
    ]);
    expect(requestSeats(r).map((s) => s.kind)).toEqual(["requester", "guest"]);
    expect(unclaimedLinkSeats(r)).toBe(1);
  });

  test("friends and guests are unchanged", () => {
    const r = req([
      { kind: "friend", userId: "u2", payerId: "u2", method: "credit", response: "in" },
      { kind: "guest", payerId: "u1", method: "pay" },
    ]);
    expect(requestSeats(r).map((s) => s.kind)).toEqual(["requester", "friend", "guest"]);
    expect(unclaimedLinkSeats(r)).toBe(0);
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run convex/seats.test.ts`
Expected: FAIL — `unclaimedLinkSeats` is not exported.

- [ ] **Step 3: Update `convex/seats.ts`**

Replace `partySeatValidator` with:

```ts
export const partySeatValidator = v.object({
  kind: v.union(v.literal("guest"), v.literal("friend"), v.literal("link")),
  /** The named friend; absent for an unnamed guest or an unclaimed link. */
  userId: v.optional(v.id("users")),
  /** Who pays. For an unclaimed link: the requester, until it's claimed. */
  payerId: v.id("users"),
  method: seatMethodValidator,
  /** A named friend's answer: "in" (confirmed) or "out" ("Not me"). A link's "out" = expired. */
  response: v.optional(
    v.union(v.literal("pending"), v.literal("in"), v.literal("out")),
  ),
  /** Link seats (someone not on Oxformals yet): the token in oxformals.com/s/<token>. */
  token: v.optional(v.string()),
  /** Link seats: when an unclaimed or unanswered link lapses. */
  expiresAt: v.optional(v.number()),
  /** Link seats: the new person pays for themselves (with a credit) once they join. */
  paysOwn: v.optional(v.boolean()),
});
```

In `requestSeats`, change the push to map link seats to guest seats:

```ts
  for (const p of req.party ?? []) {
    if (p.response === "out") continue;
    seats.push({
      kind: p.kind === "link" ? "guest" : p.kind,
      ...(p.userId ? { userId: p.userId } : {}),
      payerId: p.payerId,
      method: p.method,
    });
  }
```

Append:

```ts
/** Link seats nobody has claimed yet (and that haven't expired). */
export function unclaimedLinkSeats(req: Pick<Doc<"requests">, "party">): number {
  return (req.party ?? []).filter((p) => p.kind === "link" && p.response !== "out").length;
}
```

- [ ] **Step 4: Add the tables to `convex/schema.ts`**

On `users`, chain another index after `.index("phone", ["phone"])`:

```ts
    .index("by_college", ["college"]),
```

(Remove the trailing comma from the previous `.index(...)` line accordingly so the chain reads `.index("email", ["email"]).index("phone", ["phone"]).index("by_college", ["college"]),`.)

After `webPushSubscriptions`, add:

```ts
  /** Each person's personal invite link: oxformals.com/i/<code>. Made on first share. */
  inviteCodes: defineTable({
    userId: v.id("users"),
    code: v.string(),
    createdAt: v.number(),
  })
    .index("by_code", ["code"])
    .index("by_userId", ["userId"]),
  /**
   * Who brought whom. One per invitee. "earned" pays the inviter a credit
   * (at most 5); "void" is past the cap or the inviter is gone.
   */
  referrals: defineTable({
    inviterId: v.id("users"),
    inviteeId: v.id("users"),
    source: v.union(v.literal("link"), v.literal("seat")),
    status: v.union(v.literal("pending"), v.literal("earned"), v.literal("void")),
    createdAt: v.number(),
  })
    .index("by_inviteeId", ["inviteeId"])
    .index("by_inviterId_and_status", ["inviterId", "status"]),
  /** Lookup for oxformals.com/s/<token>; the seat itself lives on the request's party. */
  seatLinks: defineTable({
    token: v.string(),
    requestId: v.id("requests"),
    createdAt: v.number(),
  })
    .index("by_token", ["token"])
    .index("by_requestId", ["requestId"]),
```

- [ ] **Step 5: Client types and labels**

In `lib/data/types.ts` replace `PartySeat` with:

```ts
export type PartySeat = {
  kind: "guest" | "friend" | "link";
  userId?: string;
  payerId: string;
  method: RequestType;
  response?: "pending" | "in" | "out";
  /** Link seats only. */
  token?: string;
  expiresAt?: number;
  paysOwn?: boolean;
};
```

In `lib/data/party.ts`, in `partySuffix` add after `const guests = …`:

```ts
  const invited = party.filter((p) => p.kind === "link").length;
```

and change `parts` to:

```ts
  const parts = [
    ...friends,
    ...(guests > 0 ? [`${guests} guest${guests === 1 ? "" : "s"}`] : []),
    ...(invited > 0 ? [`${invited} invited`] : []),
  ];
```

Append to `lib/data/party.ts`:

```ts
/** People invited by link who haven't joined yet (the host can't accept until they do). */
export function unjoinedLinks(request: Pick<SwapRequest, "party">): number {
  return (request.party ?? []).filter((p) => p.kind === "link" && p.response !== "out").length;
}
```

In `components/swap/IncomingRequestRow.tsx`, import `unjoinedLinks` alongside `unconfirmedPayers`, add `const waitingToJoin = isPending ? unjoinedLinks(request) : 0;` next to `waitingOn`, and directly after the `{waitingOn.length > 0 ? (…) : null}` block add:

```tsx
          {waitingToJoin > 0 ? (
            <div className="text-xs leading-snug text-[var(--accent)]">
              Waiting for {waitingToJoin === 1 ? "1 person" : `${waitingToJoin} people`} to join
            </div>
          ) : null}
```

- [ ] **Step 6: Run the tests and type-check**

Run: `npx vitest run`
Expected: PASS.

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 7: Push to DEV and commit**

Run: `npx convex dev --once`
Expected: "Convex functions ready!" (new tables and index built on dev).

```bash
git add convex/schema.ts convex/seats.ts convex/seats.test.ts lib/data/types.ts lib/data/party.ts components/swap/IncomingRequestRow.tsx convex/_generated/api.d.ts
git commit -m "FEAT: Tables for invites and referrals, and link seats in group requests

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 15: Invite codes and `claimInvite`

**Files:**
- Create: `convex/randomCode.ts`
- Create: `convex/referrals.ts` (`recordReferral`)
- Create: `convex/invites.ts`
- Modify: `convex/follows.ts` (`makeFriends`)
- Modify: `convex/accountDeletion.ts` (delete the user's invite code)
- Test: `convex/invites.test.ts`

**Interfaces:**
- Consumes: `notify` (Task 3), `areFriends` (`convex/follows.ts`), `requireActiveUser`.
- Produces:
  - `randomCode(length): string` (alphabet `abcdefghjkmnpqrstuvwxyz23456789`)
  - `makeFriends(ctx: MutationCtx, a, b): Promise<void>` — both active follows, whatever their privacy
  - `recordReferral(ctx, { inviterId, inviteeId, source }): Promise<boolean>` — false if the invitee already has one
  - `api.invites.getOrCreateMyInviteCode({})` → `string`
  - `api.invites.getInvitePreview({ code })` → `null | { inviter: { _id, name, avatar } }`
  - `api.invites.claimInvite({ code, openedAt })` → `"joined" | "friends" | "own" | "invalid"`
  - `INVITE_WINDOW_MS` (30 days)

- [ ] **Step 1: Write the failing test**

Create `convex/invites.test.ts`:

```ts
/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { describe, expect, test, vi } from "vitest";
import { api } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import schema from "./schema";

const modules = import.meta.glob("./**/*.*s");

const DAY = 864e5;
type T = ReturnType<typeof convexTest>;

const makeUser = (t: T, name: string, isPrivate = false) =>
  t.run((ctx) =>
    ctx.db.insert("users", {
      name,
      email: `${name.toLowerCase()}@ox.ac.uk`,
      emailVerificationTime: 1,
      agreedToRules: true,
      college: "Keble",
      year: "2",
      role: "UG",
      ...(isPrivate ? { isPrivate: true } : {}),
    }),
  );

const as = (t: T, id: Id<"users">) => t.withIdentity({ subject: `${id}|s` });

const follows = (t: T) =>
  t.run(async (ctx) =>
    (await ctx.db.query("follows").collect()).map((f) => [f.followerId, f.followeeId, f.status]),
  );

describe("invite links", () => {
  test("a code is made once and shows who invited you", async () => {
    const t = convexTest(schema, modules);
    const ann = await makeUser(t, "Ann Lee");
    const code = await as(t, ann).mutation(api.invites.getOrCreateMyInviteCode, {});
    expect(code).toMatch(/^[abcdefghjkmnpqrstuvwxyz23456789]{6}$/);
    expect(await as(t, ann).mutation(api.invites.getOrCreateMyInviteCode, {})).toBe(code);
    expect(await t.query(api.invites.getInvitePreview, { code })).toMatchObject({
      inviter: { _id: ann, name: "Ann Lee" },
    });
    expect(await t.query(api.invites.getInvitePreview, { code: "zzzzzz" })).toBeNull();
  });

  test("a new account becomes friends (even with a private inviter) and is a pending referral", async () => {
    const t = convexTest(schema, modules);
    const ann = await makeUser(t, "Ann", true);
    const code = await as(t, ann).mutation(api.invites.getOrCreateMyInviteCode, {});
    const openedAt = Date.now();
    vi.setSystemTime(openedAt + 60_000);
    const ben = await makeUser(t, "Ben");
    expect(await as(t, ben).mutation(api.invites.claimInvite, { code, openedAt })).toBe("joined");
    expect(await follows(t)).toEqual(
      expect.arrayContaining([
        [ben, ann, "active"],
        [ann, ben, "active"],
      ]),
    );
    await t.run(async (ctx) => {
      expect(await ctx.db.query("referrals").collect()).toMatchObject([
        { inviterId: ann, inviteeId: ben, source: "link", status: "pending" },
      ]);
      const toAnn = await ctx.db
        .query("notifications")
        .withIndex("by_userId_and_createdAt", (q) => q.eq("userId", ann))
        .collect();
      expect(toAnn.map((n) => n.kind)).toEqual(["invite_joined"]);
    });
  });

  test("an existing account just becomes friends; a pending follow is upgraded", async () => {
    const t = convexTest(schema, modules);
    const ben = await makeUser(t, "Ben");
    const ann = await makeUser(t, "Ann", true);
    await as(t, ben).mutation(api.follows.follow, { userId: ann }); // pending
    vi.setSystemTime(Date.now() + 40 * DAY);
    const code = await as(t, ann).mutation(api.invites.getOrCreateMyInviteCode, {});
    expect(
      await as(t, ben).mutation(api.invites.claimInvite, { code, openedAt: Date.now() }),
    ).toBe("friends");
    expect(await follows(t)).toEqual(
      expect.arrayContaining([
        [ben, ann, "active"],
        [ann, ben, "active"],
      ]),
    );
    await t.run(async (ctx) => {
      expect(await ctx.db.query("referrals").collect()).toHaveLength(0);
    });
  });

  test("your own code and unknown codes do nothing", async () => {
    const t = convexTest(schema, modules);
    const ann = await makeUser(t, "Ann");
    const code = await as(t, ann).mutation(api.invites.getOrCreateMyInviteCode, {});
    expect(await as(t, ann).mutation(api.invites.claimInvite, { code, openedAt: Date.now() })).toBe("own");
    expect(
      await as(t, ann).mutation(api.invites.claimInvite, { code: "nope22", openedAt: Date.now() }),
    ).toBe("invalid");
    expect(await follows(t)).toEqual([]);
  });

  test("only the first inviter gets the referral", async () => {
    const t = convexTest(schema, modules);
    const ann = await makeUser(t, "Ann");
    const cat = await makeUser(t, "Cat");
    const annCode = await as(t, ann).mutation(api.invites.getOrCreateMyInviteCode, {});
    const catCode = await as(t, cat).mutation(api.invites.getOrCreateMyInviteCode, {});
    const openedAt = Date.now();
    vi.setSystemTime(openedAt + 1000);
    const ben = await makeUser(t, "Ben");
    expect(await as(t, ben).mutation(api.invites.claimInvite, { code: annCode, openedAt })).toBe("joined");
    expect(await as(t, ben).mutation(api.invites.claimInvite, { code: catCode, openedAt })).toBe("friends");
    await t.run(async (ctx) => {
      expect(await ctx.db.query("referrals").collect()).toMatchObject([{ inviterId: ann }]);
    });
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run convex/invites.test.ts`
Expected: FAIL — `api.invites` is undefined.

- [ ] **Step 3: Create `convex/randomCode.ts`**

```ts
/** Lowercase letters and digits without look-alikes (no i, l, o, 0, 1). */
export const CODE_ALPHABET = "abcdefghjkmnpqrstuvwxyz23456789";

export function randomCode(length: number): string {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  let out = "";
  for (const b of bytes) out += CODE_ALPHABET[b % CODE_ALPHABET.length];
  return out;
}
```

- [ ] **Step 4: Create `convex/referrals.ts`**

```ts
import type { Id } from "./_generated/dataModel";
import type { MutationCtx } from "./_generated/server";

/**
 * Who brought whom onto Oxformals. Recorded when a new account claims an
 * invite or seat link; pays the inviter a credit after the invitee's first
 * completed formal (see maybeEarnReferral).
 */

/** Records the referral unless the invitee already has one. */
export async function recordReferral(
  ctx: MutationCtx,
  args: { inviterId: Id<"users">; inviteeId: Id<"users">; source: "link" | "seat" },
): Promise<boolean> {
  if (args.inviterId === args.inviteeId) return false;
  const existing = await ctx.db
    .query("referrals")
    .withIndex("by_inviteeId", (q) => q.eq("inviteeId", args.inviteeId))
    .first();
  if (existing) return false;
  await ctx.db.insert("referrals", { ...args, status: "pending", createdAt: Date.now() });
  return true;
}
```

- [ ] **Step 5: Add `makeFriends` to `convex/follows.ts`**

Append:

```ts
/**
 * Both follow each other, whatever their privacy settings: used when both
 * sides chose it (an invite link or a seat link). Pending rows are approved.
 */
export async function makeFriends(
  ctx: MutationCtx,
  a: Id<"users">,
  b: Id<"users">,
): Promise<void> {
  for (const [followerId, followeeId] of [
    [a, b],
    [b, a],
  ] as const) {
    const row = await followRow(ctx, followerId, followeeId);
    if (!row) {
      await ctx.db.insert("follows", { followerId, followeeId, status: "active" });
    } else if (row.status !== "active") {
      await ctx.db.patch(row._id, { status: "active" });
    }
  }
}
```

- [ ] **Step 6: Create `convex/invites.ts`**

```ts
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { areFriends, makeFriends } from "./follows";
import { requireActiveUser } from "./guards";
import { notify } from "./notify";
import { randomCode } from "./randomCode";
import { recordReferral } from "./referrals";

export const INVITE_CODE_LENGTH = 6;
/** How long the invite cookie lives, and so how new an account must be to count. */
export const INVITE_WINDOW_MS = 30 * 24 * 60 * 60 * 1000;

/** My invite link's code, made the first time I share it. */
export const getOrCreateMyInviteCode = mutation({
  args: {},
  returns: v.string(),
  handler: async (ctx) => {
    const { userId } = await requireActiveUser(ctx);
    const existing = await ctx.db
      .query("inviteCodes")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .first();
    if (existing) return existing.code;
    for (let attempt = 0; attempt < 5; attempt++) {
      const code = randomCode(INVITE_CODE_LENGTH);
      const taken = await ctx.db
        .query("inviteCodes")
        .withIndex("by_code", (q) => q.eq("code", code))
        .first();
      if (taken) continue;
      await ctx.db.insert("inviteCodes", { userId, code, createdAt: Date.now() });
      return code;
    }
    throw new Error("Couldn't make your invite link. Try again.");
  },
});

/** Public: who's behind an invite link (for oxformals.com/i/<code>). */
export const getInvitePreview = query({
  args: { code: v.string() },
  handler: async (ctx, { code }) => {
    const row = await ctx.db
      .query("inviteCodes")
      .withIndex("by_code", (q) => q.eq("code", code.trim().toLowerCase()))
      .first();
    if (!row) return null;
    const inviter = await ctx.db.get(row.userId);
    if (!inviter || inviter.deletedAt !== undefined) return null;
    return { inviter: { _id: inviter._id, name: inviter.name ?? "Someone", avatar: inviter.avatar } };
  },
});

/**
 * After sign-in with an invite cookie: you and the inviter become friends
 * (both chose it, so privacy approval is skipped). A new account — created
 * after the link was first opened — also records a referral.
 */
export const claimInvite = mutation({
  args: { code: v.string(), openedAt: v.number() },
  returns: v.union(
    v.literal("joined"),
    v.literal("friends"),
    v.literal("own"),
    v.literal("invalid"),
  ),
  handler: async (ctx, { code, openedAt }) => {
    const { userId, user } = await requireActiveUser(ctx);
    const row = await ctx.db
      .query("inviteCodes")
      .withIndex("by_code", (q) => q.eq("code", code.trim().toLowerCase()))
      .first();
    if (!row) return "invalid";
    if (row.userId === userId) return "own";
    const inviter = await ctx.db.get(row.userId);
    if (!inviter || inviter.deletedAt !== undefined) return "invalid";

    const wereFriends = await areFriends(ctx, userId, row.userId);
    await makeFriends(ctx, userId, row.userId);

    const now = Date.now();
    const isNewAccount =
      openedAt >= row.createdAt &&
      user._creationTime >= openedAt &&
      now - user._creationTime <= INVITE_WINDOW_MS;
    if (
      isNewAccount &&
      (await recordReferral(ctx, { inviterId: row.userId, inviteeId: userId, source: "link" }))
    ) {
      await notify(ctx, { userId: row.userId, kind: "invite_joined", actorId: userId });
      return "joined";
    }
    if (!wereFriends) {
      await notify(ctx, { userId: row.userId, kind: "now_friends", actorId: userId });
    }
    return "friends";
  },
});
```

- [ ] **Step 7: Delete the invite code with the account**

In `convex/accountDeletion.ts`, extend the `deleteByUserId` union with `| "inviteCodes"` and add `await deleteByUserId("inviteCodes");` after `await deleteByUserId("webPushSubscriptions");`. (Referral rows stay: they reference ids only and keep the inviter's cap honest.)

- [ ] **Step 8: Run the tests**

Run: `npx vitest run`
Expected: PASS.

- [ ] **Step 9: Push to DEV and commit**

Run: `npx convex dev --once`
Expected: "Convex functions ready!".

```bash
git add convex/randomCode.ts convex/referrals.ts convex/invites.ts convex/follows.ts convex/accountDeletion.ts convex/invites.test.ts convex/_generated/api.d.ts
git commit -m "FEAT: Personal invite links make you friends and record who brought whom

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 16: Referral credits

**Files:**
- Modify: `convex/referrals.ts` (`maybeEarnReferral`, `earnReferralOnAttendance`, `REFERRAL_CAP`)
- Modify: `convex/credits.ts` (export `adjustCredits`; call from `settleDueHolds`)
- Modify: `convex/formalAttendance.ts` (`confirmAttendance`)
- Test: `convex/referrals.test.ts`

**Interfaces:**
- Consumes: `notify` (Task 3), `recordReferral` (Task 15).
- Produces: `REFERRAL_CAP = 5`; `maybeEarnReferral(ctx, inviteeId)`; `earnReferralOnAttendance(ctx, listingId, userId)`; `adjustCredits` is now exported from `credits.ts`.

`credits.ts` and `referrals.ts` import each other. That's safe: both only use the other's functions at call time, never at module load.

- [ ] **Step 1: Write the failing test**

Create `convex/referrals.test.ts`:

```ts
/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { describe, expect, test, vi } from "vitest";
import { api, internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import schema from "./schema";

const modules = import.meta.glob("./**/*.*s");

const DAY = 864e5;
const inDays = (n: number) => new Date(Date.now() + n * DAY).toISOString();
type T = ReturnType<typeof convexTest>;

const makeUser = (t: T, name: string, college = "Keble") =>
  t.run((ctx) =>
    ctx.db.insert("users", {
      name,
      email: `${name.toLowerCase()}@ox.ac.uk`,
      emailVerificationTime: 1,
      agreedToRules: true,
      college,
      year: "2",
      role: "UG",
    }),
  );

const as = (t: T, id: Id<"users">) => t.withIdentity({ subject: `${id}|s` });
const balance = async (t: T, id: Id<"users">) =>
  (await as(t, id).query(api.credits.getMyCredits, {}))?.balance;
const referral = (t: T) => t.run(async (ctx) => (await ctx.db.query("referrals").collect())[0]);

/** Ivy invited Neo; Neo books Hal's Worcester formal with a credit and Hal accepts. */
async function setup() {
  const t = convexTest(schema, modules);
  const ivy = await makeUser(t, "Ivy");
  const neo = await makeUser(t, "Neo");
  const hal = await makeUser(t, "Hal", "Worcester");
  await t.run((ctx) =>
    ctx.db.insert("referrals", {
      inviterId: ivy,
      inviteeId: neo,
      source: "link",
      status: "pending",
      createdAt: Date.now(),
    }),
  );
  const listing = await as(t, hal).mutation(api.listings.createListing, {
    dateTime: inDays(3),
    groupSize: 4,
    message: "",
    listingType: "swap",
  });
  const { requestId } = await as(t, neo).mutation(api.listings.createRequest, {
    requestType: "credit",
    targetListingId: listing,
    message: "",
  });
  await as(t, hal).mutation(api.listings.acceptRequest, { requestId });
  return { t, ivy, neo, hal, listing };
}

describe("referral credits", () => {
  test("the inviter earns one credit when the invitee's first formal settles, once", async () => {
    const s = await setup();
    vi.setSystemTime(Date.now() + 4 * DAY + 36e5);
    await s.t.mutation(internal.credits.settleDueHolds, {});
    await s.t.mutation(internal.credits.settleDueHolds, {});
    expect(await balance(s.t, s.ivy)).toBe(2);
    expect((await referral(s.t)).status).toBe("earned");
    const toIvy = await s.t.run((ctx) =>
      ctx.db
        .query("notifications")
        .withIndex("by_userId_and_createdAt", (q) => q.eq("userId", s.ivy))
        .collect(),
    );
    expect(toIvy).toMatchObject([{ kind: "credit_earned", actorId: s.neo, data: { reason: "referral" } }]);
  });

  test("past five earned referrals, nothing more is paid", async () => {
    const s = await setup();
    await s.t.run(async (ctx) => {
      for (let i = 0; i < 5; i++) {
        const u = await ctx.db.insert("users", { name: `Old${i}` });
        await ctx.db.insert("referrals", {
          inviterId: s.ivy,
          inviteeId: u,
          source: "link",
          status: "earned",
          createdAt: 1,
        });
      }
    });
    vi.setSystemTime(Date.now() + 4 * DAY + 36e5);
    await s.t.mutation(internal.credits.settleDueHolds, {});
    expect(await balance(s.t, s.ivy)).toBe(1);
    const mine = await s.t.run((ctx) =>
      ctx.db
        .query("referrals")
        .withIndex("by_inviteeId", (q) => q.eq("inviteeId", s.neo))
        .first(),
    );
    expect(mine?.status).toBe("void");
  });

  test("a formal reported as not happening doesn't count", async () => {
    const s = await setup();
    vi.setSystemTime(Date.now() + 3 * DAY + 36e5); // after the formal, before payout
    await as(s.t, s.neo).mutation(api.credits.reportFormalDidntHappen, { listingId: s.listing });
    vi.setSystemTime(Date.now() + 2 * DAY);
    await s.t.mutation(internal.credits.settleDueHolds, {});
    expect((await referral(s.t)).status).toBe("pending");
    expect(await balance(s.t, s.ivy)).toBe(1);
  });

  test("confirming attendance at a formal without credits counts", async () => {
    const t = convexTest(schema, modules);
    const ivy = await makeUser(t, "Ivy");
    const neo = await makeUser(t, "Neo");
    const hal = await makeUser(t, "Hal", "Worcester");
    await t.run(async (ctx) => {
      await ctx.db.insert("referrals", {
        inviterId: ivy,
        inviteeId: neo,
        source: "seat",
        status: "pending",
        createdAt: Date.now(),
      });
    });
    const listing = await t.run((ctx) =>
      ctx.db.insert("listings", {
        ownerUserId: hal,
        college: "Worcester",
        dateTime: new Date(Date.now() - DAY).toISOString(),
        groupSize: 2,
        seatsAvailable: 0,
        members: [hal, neo],
        year: "2",
        role: "UG",
        message: "",
        status: "closed",
      }),
    );
    await as(t, neo).mutation(api.formalAttendance.confirmAttendance, {
      listingId: listing,
      nowMs: Date.now(),
    });
    expect((await referral(t)).status).toBe("earned");
    expect(await balance(t, ivy)).toBe(2);
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run convex/referrals.test.ts`
Expected: FAIL — referrals stay pending; Ivy's balance stays 1.

- [ ] **Step 3: Earning logic in `convex/referrals.ts`**

Change the imports at the top to:

```ts
import type { Id } from "./_generated/dataModel";
import type { MutationCtx } from "./_generated/server";
import { adjustCredits } from "./credits";
import { notify } from "./notify";
```

Append:

```ts
/** Most invites that pay a credit, per inviter. */
export const REFERRAL_CAP = 5;

/**
 * The invitee just completed a formal. If it's their first (their referral is
 * still pending), the inviter earns a credit — unless they've had five.
 */
export async function maybeEarnReferral(
  ctx: MutationCtx,
  inviteeId: Id<"users">,
): Promise<void> {
  const referral = await ctx.db
    .query("referrals")
    .withIndex("by_inviteeId", (q) => q.eq("inviteeId", inviteeId))
    .first();
  if (!referral || referral.status !== "pending") return;
  const inviter = await ctx.db.get(referral.inviterId);
  const earned = await ctx.db
    .query("referrals")
    .withIndex("by_inviterId_and_status", (q) =>
      q.eq("inviterId", referral.inviterId).eq("status", "earned"),
    )
    .take(REFERRAL_CAP);
  if (!inviter || inviter.deletedAt !== undefined || earned.length >= REFERRAL_CAP) {
    await ctx.db.patch(referral._id, { status: "void" });
    return;
  }
  await ctx.db.patch(referral._id, { status: "earned" });
  await adjustCredits(ctx, referral.inviterId, 1);
  await notify(ctx, {
    userId: referral.inviterId,
    kind: "credit_earned",
    actorId: inviteeId,
    data: { reason: "referral", count: 1 },
  });
}

/**
 * A guest confirmed they attended. Seats paid by credit count when their hold
 * settles instead (so a dispute can stop it); nothing counts if anyone said
 * the formal didn't happen.
 */
export async function earnReferralOnAttendance(
  ctx: MutationCtx,
  listingId: Id<"listings">,
  userId: Id<"users">,
): Promise<void> {
  const holds = await ctx.db
    .query("creditHolds")
    .withIndex("by_listingId", (q) => q.eq("listingId", listingId))
    .take(100);
  if (holds.some((h) => h.status === "disputed")) return;
  if (holds.some((h) => h.seatHolderId === userId)) return;
  await maybeEarnReferral(ctx, userId);
}
```

- [ ] **Step 4: Hook `settleDueHolds`**

In `convex/credits.ts`:
- Change `async function adjustCredits(` to `export async function adjustCredits(`.
- Add `import { maybeEarnReferral } from "./referrals";`.
- In `settleDueHolds`, after the `for (const { hostId, listingId, count } of paidOut.values()) { … }` loop (Task 7), add:

```ts
    // A settled seat is a completed formal, for the guest and the host.
    const completed = new Set<Id<"users">>();
    for (const hold of due) {
      completed.add(hold.seatHolderId);
      completed.add(hold.hostId);
    }
    for (const userId of completed) {
      await maybeEarnReferral(ctx, userId);
    }
```

- [ ] **Step 5: Hook `confirmAttendance`**

In `convex/formalAttendance.ts` add `import { earnReferralOnAttendance } from "./referrals";` and in `confirmAttendance`, after `await awardNewBadges(ctx, userId, args.nowMs);` add:

```ts
    await earnReferralOnAttendance(ctx, listing._id, userId);
```

- [ ] **Step 6: Run the tests**

Run: `npx vitest run`
Expected: PASS.

- [ ] **Step 7: Push to DEV and commit**

Run: `npx convex dev --once`
Expected: "Convex functions ready!".

```bash
git add convex/referrals.ts convex/credits.ts convex/formalAttendance.ts convex/referrals.test.ts convex/_generated/api.d.ts
git commit -m "FEAT: Earn a credit when someone you invited goes to their first formal

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---
### Task 17: Seat links

**Files:**
- Create: `convex/seatLinks.ts`
- Modify: `convex/listings.ts` (`createRequest` `links` arg, `assertCanAcceptRequest`, `withdrawRequest`)
- Test: `convex/seatLinkFlow.test.ts`

**Interfaces:**
- Consumes: `randomCode` (Task 15), `makeFriends` (Task 15), `recordReferral` (Task 15), `notify` (Task 3), `unclaimedLinkSeats` (Task 14), `requireActiveUser`.
- Produces:
  - `api.listings.createRequest` accepts `links?: { paysOwn: boolean; method: "swap" | "pay" | "credit" }[]` and returns `{ requestId, autoAccepted: false, links: string[] }` (tokens) for normal sends; the mirror-swap return is unchanged (`{ requestId, autoAccepted: true }`).
  - `SEAT_LINK_TTL_MS` (48h), `newSeatToken(ctx): Promise<string>`
  - `api.seatLinks.getSeatLinkPreview({ token })` → `null | { state: "open" | "used" | "expired" | "closed"; college; dateTime; host: { name, avatar }; from: { name, avatar } }`
  - `api.seatLinks.claimSeatLink({ token })` → `{ requestId }`
  - `internal.seatLinks.expireSeatLink({ requestId, token })` → `null`

- [ ] **Step 1: Write the failing test**

Create `convex/seatLinkFlow.test.ts`:

```ts
/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { describe, expect, test, vi } from "vitest";
import { api, internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import schema from "./schema";

const modules = import.meta.glob("./**/*.*s");

const HOUR = 36e5;
const inDays = (n: number) => new Date(Date.now() + n * 864e5).toISOString();
type T = ReturnType<typeof convexTest>;

const makeUser = (t: T, name: string, college = "Keble") =>
  t.run((ctx) =>
    ctx.db.insert("users", {
      name,
      email: `${name.toLowerCase()}@ox.ac.uk`,
      emailVerificationTime: 1,
      agreedToRules: true,
      college,
      year: "2",
      role: "UG",
    }),
  );

const as = (t: T, id: Id<"users">) => t.withIdentity({ subject: `${id}|s` });

/** Alice asks Wes's Worcester formal for herself + one new person who pays with their own credit. */
async function setup() {
  const t = convexTest(schema, modules);
  const alice = await makeUser(t, "Alice");
  const wes = await makeUser(t, "Wes", "Worcester");
  const worcester = await as(t, wes).mutation(api.listings.createListing, {
    dateTime: inDays(5),
    groupSize: 5,
    message: "",
    listingType: "both",
    price: 25,
  });
  const sent = await as(t, alice).mutation(api.listings.createRequest, {
    requestType: "credit",
    targetListingId: worcester,
    message: "",
    links: [{ paysOwn: true, method: "credit" }],
  });
  if (sent.autoAccepted) throw new Error("unexpected auto-accept");
  return { t, alice, wes, worcester, requestId: sent.requestId, token: sent.links[0] };
}

describe("seat links", () => {
  test("sending returns a token; the host can't accept until it's claimed", async () => {
    const s = await setup();
    expect(s.token).toMatch(/^[a-z2-9]{12}$/);
    // Alice's balance (1) covers only her own seat: the link seat is the new person's.
    await expect(
      as(s.t, s.wes).mutation(api.listings.acceptRequest, { requestId: s.requestId }),
    ).rejects.toThrow(/join/);
    expect(await s.t.query(api.seatLinks.getSeatLinkPreview, { token: s.token })).toMatchObject({
      state: "open",
      college: "Worcester",
      host: { name: "Wes" },
      from: { name: "Alice" },
    });
  });

  test("claim → friend seat → I'm in → the host can accept", async () => {
    const s = await setup();
    const neo = await makeUser(s.t, "Neo");
    expect(await as(s.t, neo).mutation(api.seatLinks.claimSeatLink, { token: s.token })).toEqual({
      requestId: s.requestId,
    });
    await s.t.run(async (ctx) => {
      const req = await ctx.db.get(s.requestId);
      expect(req?.party).toEqual([
        { kind: "friend", userId: neo, payerId: neo, method: "credit", response: "pending" },
      ]);
      const follows = (await ctx.db.query("follows").collect()).map((f) => [f.followerId, f.followeeId]);
      expect(follows).toEqual(expect.arrayContaining([[neo, s.alice], [s.alice, neo]]));
      expect(await ctx.db.query("referrals").collect()).toMatchObject([
        { inviterId: s.alice, inviteeId: neo, source: "seat", status: "pending" },
      ]);
      const toAlice = await ctx.db
        .query("notifications")
        .withIndex("by_userId_and_createdAt", (q) => q.eq("userId", s.alice))
        .collect();
      expect(toAlice.map((n) => n.kind)).toContain("seat_link_claimed");
    });
    expect(await as(s.t, neo).query(api.partyInvites.listMyPartyInvites, {})).toHaveLength(1);
    await expect(
      as(s.t, s.wes).mutation(api.listings.acceptRequest, { requestId: s.requestId }),
    ).rejects.toThrow(/Waiting for Neo/);
    await as(s.t, neo).mutation(api.partyInvites.respondToPartyInvite, {
      requestId: s.requestId,
      response: "in",
    });
    await as(s.t, s.wes).mutation(api.listings.acceptRequest, { requestId: s.requestId });
    const listing = await s.t.run((ctx) => ctx.db.get(s.worcester));
    expect(listing?.members).toEqual([s.wes, s.alice, neo]);
  });

  test("a claimed token can't be used again", async () => {
    const s = await setup();
    const neo = await makeUser(s.t, "Neo");
    const zed = await makeUser(s.t, "Zed");
    await as(s.t, neo).mutation(api.seatLinks.claimSeatLink, { token: s.token });
    await expect(
      as(s.t, zed).mutation(api.seatLinks.claimSeatLink, { token: s.token }),
    ).rejects.toThrow(/already been used/);
    expect((await s.t.query(api.seatLinks.getSeatLinkPreview, { token: s.token }))?.state).toBe("used");
  });

  test("an unclaimed link expires after 48h and drops out of the request", async () => {
    const s = await setup();
    vi.setSystemTime(Date.now() + 49 * HOUR);
    await s.t.mutation(internal.seatLinks.expireSeatLink, { requestId: s.requestId, token: s.token });
    expect((await s.t.query(api.seatLinks.getSeatLinkPreview, { token: s.token }))?.state).toBe("expired");
    const neo = await makeUser(s.t, "Neo");
    await expect(
      as(s.t, neo).mutation(api.seatLinks.claimSeatLink, { token: s.token }),
    ).rejects.toThrow(/expired/);
    await as(s.t, s.wes).mutation(api.listings.acceptRequest, { requestId: s.requestId });
    const listing = await s.t.run((ctx) => ctx.db.get(s.worcester));
    expect(listing?.members).toEqual([s.wes, s.alice]);
  });

  test("withdrawing kills the link", async () => {
    const s = await setup();
    await as(s.t, s.alice).mutation(api.listings.withdrawRequest, { requestId: s.requestId });
    expect(await s.t.query(api.seatLinks.getSeatLinkPreview, { token: s.token })).toBeNull();
    const neo = await makeUser(s.t, "Neo");
    await expect(
      as(s.t, neo).mutation(api.seatLinks.claimSeatLink, { token: s.token }),
    ).rejects.toThrow(/doesn't work/);
  });

  test("the requester can't claim their own link", async () => {
    const s = await setup();
    await expect(
      as(s.t, s.alice).mutation(api.seatLinks.claimSeatLink, { token: s.token }),
    ).rejects.toThrow(/your own link/);
  });

  test("a new person paying for themselves can only use a credit", async () => {
    const s = await setup();
    const other = await as(s.t, s.wes).mutation(api.listings.createListing, {
      dateTime: inDays(6),
      groupSize: 4,
      message: "",
      listingType: "both",
      price: 20,
    });
    await expect(
      as(s.t, s.alice).mutation(api.listings.createRequest, {
        requestType: "pay",
        targetListingId: other,
        message: "",
        links: [{ paysOwn: true, method: "pay" }],
      }),
    ).rejects.toThrow(/credit/);
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run convex/seatLinkFlow.test.ts`
Expected: FAIL — `links` is not a valid argument for `createRequest`.

- [ ] **Step 3: Create `convex/seatLinks.ts`**

```ts
import { v } from "convex/values";
import type { MutationCtx } from "./_generated/server";
import { internalMutation, mutation, query } from "./_generated/server";
import { makeFriends } from "./follows";
import { requireActiveUser } from "./guards";
import { notify } from "./notify";
import { randomCode } from "./randomCode";
import { recordReferral } from "./referrals";

/**
 * Seat links: a seat in a group request for someone not on Oxformals yet.
 * The requester shares oxformals.com/s/<token>; whoever claims it becomes a
 * named friend in the request (and a friend of the requester). Unclaimed or
 * unanswered links lapse after 48 hours.
 */

export const SEAT_LINK_TTL_MS = 48 * 60 * 60 * 1000;
const TOKEN_LENGTH = 12;

export async function newSeatToken(ctx: MutationCtx): Promise<string> {
  for (let attempt = 0; attempt < 5; attempt++) {
    const token = randomCode(TOKEN_LENGTH);
    const taken = await ctx.db
      .query("seatLinks")
      .withIndex("by_token", (q) => q.eq("token", token))
      .first();
    if (!taken) return token;
  }
  throw new Error("Couldn't make a link. Try again.");
}

const publicPerson = (u: { name?: string; avatar?: unknown } | null) => ({
  name: u?.name?.split(" ")[0] ?? "Someone",
  avatar: u?.avatar,
});

/** Public: what oxformals.com/s/<token> shows. */
export const getSeatLinkPreview = query({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    const link = await ctx.db
      .query("seatLinks")
      .withIndex("by_token", (q) => q.eq("token", token))
      .first();
    if (!link) return null;
    const req = await ctx.db.get(link.requestId);
    if (!req) return null;
    const listing = await ctx.db.get(req.targetListingId);
    if (!listing) return null;
    const seat = (req.party ?? []).find((p) => p.kind === "link" && p.token === token);
    const state =
      req.status !== "pending"
        ? ("closed" as const)
        : !seat
          ? ("used" as const)
          : seat.response === "out" || (seat.expiresAt ?? 0) <= Date.now()
            ? ("expired" as const)
            : ("open" as const);
    return {
      state,
      college: listing.college,
      dateTime: listing.dateTime,
      host: publicPerson(await ctx.db.get(listing.ownerUserId)),
      from: publicPerson(await ctx.db.get(req.fromUserId)),
    };
  },
});

/**
 * Turn the link seat into a named-friend seat for me. I then answer "I'm in"
 * / "Not me" like any named friend.
 */
export const claimSeatLink = mutation({
  args: { token: v.string() },
  returns: v.object({ requestId: v.id("requests") }),
  handler: async (ctx, { token }) => {
    const { userId, user } = await requireActiveUser(ctx);
    const link = await ctx.db
      .query("seatLinks")
      .withIndex("by_token", (q) => q.eq("token", token))
      .first();
    const req = link ? await ctx.db.get(link.requestId) : null;
    if (!link || !req) throw new Error("This link doesn't work any more.");
    if (req.status !== "pending") throw new Error("This request is closed.");
    const party = req.party ?? [];
    const index = party.findIndex((p) => p.kind === "link" && p.token === token);
    if (index === -1) throw new Error("This link has already been used.");
    const seat = party[index];
    if (seat.response === "out" || (seat.expiresAt ?? 0) <= Date.now()) {
      throw new Error("This link has expired.");
    }
    if (userId === req.fromUserId) {
      throw new Error("This is your own link. Send it to the person you're bringing.");
    }
    if (userId === req.toUserId) throw new Error("You're hosting this formal.");
    const listing = await ctx.db.get(req.targetListingId);
    if (
      listing?.members.includes(userId) ||
      party.some((p) => p.kind === "friend" && p.userId === userId)
    ) {
      throw new Error("You're already in this group.");
    }

    const next = [...party];
    next[index] = {
      kind: "friend",
      userId,
      payerId: seat.paysOwn ? userId : req.fromUserId,
      method: seat.method,
      response: "pending",
    };
    await ctx.db.patch(req._id, { party: next });
    await ctx.db.insert("partyInvites", { requestId: req._id, userId });
    await makeFriends(ctx, userId, req.fromUserId);
    if (user._creationTime >= link.createdAt) {
      await recordReferral(ctx, { inviterId: req.fromUserId, inviteeId: userId, source: "seat" });
    }
    await notify(ctx, {
      userId: req.fromUserId,
      kind: "seat_link_claimed",
      actorId: userId,
      listingId: req.targetListingId,
      requestId: req._id,
      ...(listing ? { data: { college: listing.college, dateTime: listing.dateTime } } : {}),
    });
    return { requestId: req._id };
  },
});

/** 48h after sending: an unclaimed or unanswered link drops out, like "Not me". */
export const expireSeatLink = internalMutation({
  args: { requestId: v.id("requests"), token: v.string() },
  returns: v.null(),
  handler: async (ctx, { requestId, token }) => {
    const req = await ctx.db.get(requestId);
    if (!req || req.status !== "pending") return null;
    const party = req.party ?? [];
    const index = party.findIndex((p) => p.kind === "link" && p.token === token);
    if (index === -1 || party[index].response === "out") return null;
    const next = [...party];
    next[index] = { ...party[index], response: "out" };
    await ctx.db.patch(requestId, { party: next });
    return null;
  },
});
```

(A claimed seat is a normal friend seat; if the claimer never answers, it waits like any named friend. The spec's "unanswered link seat expires" is covered for the unclaimed case; a claimed-but-unanswered seat is then a named friend and follows the existing named-friend rules.)

- [ ] **Step 4: `createRequest` takes link seats**

In `convex/listings.ts`:
- Add `import { newSeatToken, SEAT_LINK_TTL_MS } from "./seatLinks";` and add `unclaimedLinkSeats` to the `./seats` import.
- Add to `createRequest`'s `args`, after `friends`:

```ts
    /**
     * Seats for people not on Oxformals yet. Each gets a link to claim. They
     * pay with their own credit (`paysOwn`) or the requester covers them.
     */
    links: v.optional(
      v.array(v.object({ paysOwn: v.boolean(), method: seatMethodValidator })),
    ),
```

- Replace the guest-count check:

```ts
    const guests = args.guests ?? 0;
    const friends = args.friends ?? [];
    if (
      !Number.isInteger(guests) ||
      guests < 0 ||
      guests + friends.length > MAX_GUESTS
    ) {
      throw new Error(`You can bring up to ${MAX_GUESTS} people.`);
    }
```

with:

```ts
    const guests = args.guests ?? 0;
    const friends = args.friends ?? [];
    const links = args.links ?? [];
    if (
      !Number.isInteger(guests) ||
      guests < 0 ||
      guests + friends.length + links.length > MAX_GUESTS
    ) {
      throw new Error(`You can bring up to ${MAX_GUESTS} people.`);
    }
    for (const l of links) {
      if (l.paysOwn && l.method !== "credit") {
        throw new Error("Someone new can only pay for themselves with a credit.");
      }
    }
```

- Replace the `party` construction:

```ts
    const party: NonNullable<Doc<"requests">["party"]> = [
      ...friends.map((f) => ({
```

through its closing `];` with:

```ts
    const now = Date.now();
    const linkTokens: string[] = [];
    for (let i = 0; i < links.length; i++) linkTokens.push(await newSeatToken(ctx));
    const party: NonNullable<Doc<"requests">["party"]> = [
      ...friends.map((f) => ({
        kind: "friend" as const,
        userId: f.userId,
        payerId: f.paysOwn ? f.userId : userId,
        method: f.method,
        response: "pending" as const,
      })),
      ...links.map((l, i) => ({
        kind: "link" as const,
        token: linkTokens[i],
        // The requester until someone claims it (then the claimer, if paysOwn).
        payerId: userId,
        method: l.method,
        paysOwn: l.paysOwn,
        response: "pending" as const,
        expiresAt: now + SEAT_LINK_TTL_MS,
      })),
      ...Array.from({ length: guests }, (_, i) => ({
        kind: "guest" as const,
        payerId: userId,
        method: args.guestMethods?.[i] ?? args.requestType,
      })),
    ];
```

- Replace the credit check's first statement:

```ts
    const myCreditSeats = seats.filter(
      (s) => s.method === "credit" && s.payerId === userId,
    ).length;
```

with:

```ts
    // My own seat plus every party seat I cover. A link seat the new person
    // pays for isn't mine, even though I'm its placeholder payer.
    const myCreditSeats =
      (args.requestType === "credit" ? 1 : 0) +
      party.filter((p) => p.method === "credit" && p.payerId === userId && !p.paysOwn).length;
```

- After the request insert (right after the `notify(... "party_invite" ...)` loop from Task 6), add:

```ts
    for (const token of linkTokens) {
      await ctx.db.insert("seatLinks", { token, requestId, createdAt: now });
      await ctx.scheduler.runAfter(SEAT_LINK_TTL_MS, internal.seatLinks.expireSeatLink, {
        requestId,
        token,
      });
    }
```

- Change the final return of `createRequest` to:

```ts
    return { requestId, autoAccepted: false as const, links: linkTokens };
```

- [ ] **Step 5: The host waits for links to be claimed**

In `assertCanAcceptRequest`, directly before the comment `// A friend paying for their own seat has to say "I'm in" first`, add:

```ts
  const unclaimed = unclaimedLinkSeats(req);
  if (unclaimed > 0) {
    throw new Error(
      unclaimed === 1
        ? "Waiting for someone in this group to join Oxformals."
        : `Waiting for ${unclaimed} people in this group to join Oxformals.`,
    );
  }
```

- [ ] **Step 6: Withdrawing deletes the links**

In `withdrawRequest`, before `await ctx.db.delete(req._id);` add:

```ts
    for (const link of await ctx.db
      .query("seatLinks")
      .withIndex("by_requestId", (q) => q.eq("requestId", req._id))
      .take(10)) {
      await ctx.db.delete(link._id);
    }
```

(Declined requests keep their rows; `claimSeatLink` rejects them because the request isn't pending, and the preview shows "closed".)

- [ ] **Step 7: Run the tests**

Run: `npx vitest run`
Expected: PASS (including existing `groupBooking.test.ts` and `partyInvites.test.ts`).

- [ ] **Step 8: Push to DEV and commit**

Run: `npx convex dev --once`
Expected: "Convex functions ready!".

```bash
git add convex/seatLinks.ts convex/listings.ts convex/seatLinkFlow.test.ts convex/_generated/api.d.ts
git commit -m "FEAT: Bring someone who isn't on Oxformals yet with a seat link

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 18: People you may know

**Files:**
- Create: `convex/peopleYouMayKnow.ts`
- Test: `convex/peopleYouMayKnow.test.ts`

**Interfaces:**
- Consumes: `sanitizePublicUser`, `optionalUserId` (`convex/guards.ts`), `users.by_college` index (Task 14).
- Produces: `api.peopleYouMayKnow.getPeopleYouMayKnow({ limit? })` → `Array<{ user: ReturnType<typeof sanitizePublicUser>; mutualFriends: number; sharedFormals: number; sameCollege: boolean }>` (default 10, max 20), sorted by score desc then name.

- [ ] **Step 1: Write the failing test**

Create `convex/peopleYouMayKnow.test.ts`:

```ts
/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";
import { api } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import schema from "./schema";

const modules = import.meta.glob("./**/*.*s");

type T = ReturnType<typeof convexTest>;

const makeUser = (t: T, name: string, college: string, extra: Record<string, unknown> = {}) =>
  t.run((ctx) =>
    ctx.db.insert("users", {
      name,
      email: `${name.toLowerCase()}@ox.ac.uk`,
      emailVerificationTime: 1,
      agreedToRules: true,
      college,
      year: "2",
      role: "UG",
      ...extra,
    }),
  );

const follow = (t: T, a: Id<"users">, b: Id<"users">, status: "active" | "pending" = "active") =>
  t.run((ctx) => ctx.db.insert("follows", { followerId: a, followeeId: b, status }));

describe("people you may know", () => {
  test("ranks friends-of-friends, then shared formals, then college; skips people I follow", async () => {
    const t = convexTest(schema, modules);
    const me = await makeUser(t, "Me", "Keble");
    const amy = await makeUser(t, "Amy", "Keble"); // my friend
    const bob = await makeUser(t, "Bob", "Worcester"); // Amy's friend
    const cal = await makeUser(t, "Cal", "Keble"); // same college only
    const dee = await makeUser(t, "Dee", "Magdalen"); // shared a formal with me
    const eve = await makeUser(t, "Eve", "Keble"); // I already asked to follow
    const gone = await makeUser(t, "Gone", "Keble", { deletedAt: 1 });
    await follow(t, me, amy);
    await follow(t, amy, me);
    await follow(t, amy, bob);
    await follow(t, bob, amy);
    await follow(t, me, eve, "pending");
    await t.run((ctx) =>
      ctx.db.insert("listings", {
        ownerUserId: me,
        college: "Keble",
        dateTime: new Date(Date.now() - 30 * 864e5).toISOString(),
        groupSize: 2,
        seatsAvailable: 0,
        members: [me, dee],
        year: "2",
        role: "UG",
        message: "",
        status: "expired",
      }),
    );

    const people = await t
      .withIdentity({ subject: `${me}|s` })
      .query(api.peopleYouMayKnow.getPeopleYouMayKnow, {});
    expect(people.map((p) => p.user._id)).toEqual([bob, dee, cal]);
    expect(people[0]).toMatchObject({ mutualFriends: 1, sharedFormals: 0, sameCollege: false });
    expect(people[1]).toMatchObject({ mutualFriends: 0, sharedFormals: 1 });
    expect(people.map((p) => p.user._id)).not.toContain(gone);
  });

  test("signed out gets nothing", async () => {
    const t = convexTest(schema, modules);
    expect(await t.query(api.peopleYouMayKnow.getPeopleYouMayKnow, {})).toEqual([]);
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run convex/peopleYouMayKnow.test.ts`
Expected: FAIL — `api.peopleYouMayKnow` is undefined.

- [ ] **Step 3: Implement `convex/peopleYouMayKnow.ts`**

```ts
import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { query } from "./_generated/server";
import { optionalUserId, sanitizePublicUser } from "./guards";

/** Bounds keep this one query well inside Convex's read limits. */
const FRIENDS_SCANNED = 40;
const THEIR_FOLLOWS_SCANNED = 40;
const SAME_COLLEGE_SCANNED = 100;
const FORMALS_SCANNED = 50;
const YEAR_MS = 365 * 24 * 60 * 60 * 1000;

type Score = { mutualFriends: number; sharedFormals: number; sameCollege: boolean };

/**
 * Friends of friends, people from your college, and people you've sat with at
 * a formal in the last year. Score = 3 × mutual friends + 2 × shared formals
 * + 1 × same college. Private accounts can appear (following sends a request).
 */
export const getPeopleYouMayKnow = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, { limit }) => {
    const me = await optionalUserId(ctx);
    if (!me) return [];
    const meDoc = await ctx.db.get(me);
    if (!meDoc) return [];
    const max = Math.min(Math.max(1, Math.floor(limit ?? 10)), 20);

    const exclude = new Set<Id<"users">>([me]);
    for (const status of ["active", "pending"] as const) {
      for (const row of await ctx.db
        .query("follows")
        .withIndex("by_followerId_and_status", (q) => q.eq("followerId", me).eq("status", status))
        .take(500)) {
        exclude.add(row.followeeId);
      }
    }

    const scores = new Map<Id<"users">, Score>();
    const score = (id: Id<"users">) => {
      let s = scores.get(id);
      if (!s) {
        s = { mutualFriends: 0, sharedFormals: 0, sameCollege: false };
        scores.set(id, s);
      }
      return s;
    };

    // Friends of friends: people followed by those I follow.
    const iFollow = await ctx.db
      .query("follows")
      .withIndex("by_followerId_and_status", (q) => q.eq("followerId", me).eq("status", "active"))
      .take(FRIENDS_SCANNED);
    for (const row of iFollow) {
      const theirs = await ctx.db
        .query("follows")
        .withIndex("by_followerId_and_status", (q) =>
          q.eq("followerId", row.followeeId).eq("status", "active"),
        )
        .take(THEIR_FOLLOWS_SCANNED);
      for (const f of theirs) {
        if (!exclude.has(f.followeeId)) score(f.followeeId).mutualFriends++;
      }
    }

    // Same college.
    if (meDoc.college) {
      for (const u of await ctx.db
        .query("users")
        .withIndex("by_college", (q) => q.eq("college", meDoc.college))
        .take(SAME_COLLEGE_SCANNED)) {
        if (!exclude.has(u._id)) score(u._id).sameCollege = true;
      }
    }

    // Shared formals in the last year: ones I hosted, and ones I confirmed attending.
    const since = Date.now() - YEAR_MS;
    const listingIds = new Set<Id<"listings">>();
    for (const l of await ctx.db
      .query("listings")
      .withIndex("by_ownerUserId", (q) => q.eq("ownerUserId", me))
      .order("desc")
      .take(FORMALS_SCANNED)) {
      listingIds.add(l._id);
    }
    for (const c of await ctx.db
      .query("formalAttendanceConfirmations")
      .withIndex("by_userId", (q) => q.eq("userId", me))
      .order("desc")
      .take(FORMALS_SCANNED)) {
      if (c.attended !== false) listingIds.add(c.listingId);
    }
    for (const id of listingIds) {
      const listing = await ctx.db.get(id);
      if (!listing) continue;
      const at = Date.parse(listing.dateTime);
      if (Number.isNaN(at) || at < since || at > Date.now()) continue;
      for (const member of listing.members) {
        if (!exclude.has(member)) score(member).sharedFormals++;
      }
    }

    const ranked = [];
    for (const [id, s] of scores) {
      const user = await ctx.db.get(id);
      if (!user || user.deletedAt !== undefined) continue;
      ranked.push({
        user: sanitizePublicUser(user),
        ...s,
        total: 3 * s.mutualFriends + 2 * s.sharedFormals + (s.sameCollege ? 1 : 0),
      });
    }
    ranked.sort(
      (a, b) => b.total - a.total || (a.user.name ?? "").localeCompare(b.user.name ?? ""),
    );
    return ranked.slice(0, max).map(({ total: _total, ...rest }) => rest);
  },
});
```

Note: in the test, `me` follows Amy, so Amy is excluded; Bob scores 3 (mutual), Dee 2 (shared formal), Cal and Eve are Keble (Eve excluded as pending), Cal scores 1.

- [ ] **Step 4: Run the tests**

Run: `npx vitest run`
Expected: PASS. If lint flags the unused `_total` binding, replace the last line with `return ranked.slice(0, max).map((r) => ({ user: r.user, mutualFriends: r.mutualFriends, sharedFormals: r.sharedFormals, sameCollege: r.sameCollege }));`.

- [ ] **Step 5: Push to DEV and commit**

Run: `npx convex dev --once`
Expected: "Convex functions ready!".

```bash
git add convex/peopleYouMayKnow.ts convex/peopleYouMayKnow.test.ts convex/_generated/api.d.ts
git commit -m "FEAT: People you may know

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---
### Task 19: Invite landing page and claiming after sign-in

**Files:**
- Create: `lib/invites/cookies.ts`
- Create: `lib/invites/share.ts`
- Create: `app/i/[code]/page.tsx`
- Create: `components/invites/InviteLanding.tsx`
- Create: `components/invites/InviteClaimer.tsx`
- Modify: `app/layout.tsx` (mount `InviteClaimer`)
- Modify: `proxy.ts` (public `/i/:code` and `/s/:token`)

**Interfaces:**
- Consumes: `api.invites.getInvitePreview`, `api.invites.claimInvite` (Task 15); `api.seatLinks.claimSeatLink` (Task 17); `useAuth()` (`{ isAuthenticated, user, needsRulesAgreement }`).
- Produces:
  - `INVITE_COOKIE = "oxf_invite"`, `SEAT_COOKIE = "oxf_seat"`, `readCookie(name)`, `setCookie(name, value, maxAgeSeconds)`, `clearCookie(name)`, `rememberInvite(code)`, `readInvite(): { code: string; openedAt: number } | null`, `rememberSeatLink(token)`
  - `shareOrCopy(url, title): Promise<"shared" | "copied" | "failed">`
  - `<InviteClaimer />` — claims the invite cookie, then the seat cookie (and navigates to `/` for a seat), once the user is fully signed in.

Read first: `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/page.md` (async `params`) and `.../proxy.md`.

- [ ] **Step 1: Cookies and sharing helpers**

Create `lib/invites/cookies.ts`:

```ts
"use client";

/**
 * First-party cookies that carry an invite or seat link through the Oxford
 * email sign-in (which can open in another tab). Read and cleared by
 * InviteClaimer once the person is signed in.
 */

export const INVITE_COOKIE = "oxf_invite";
export const SEAT_COOKIE = "oxf_seat";
const THIRTY_DAYS = 60 * 60 * 24 * 30;
const THREE_DAYS = 60 * 60 * 24 * 3;

export function readCookie(name: string): string | null {
  const hit = document.cookie.split("; ").find((c) => c.startsWith(`${name}=`));
  return hit ? decodeURIComponent(hit.slice(name.length + 1)) : null;
}

export function setCookie(name: string, value: string, maxAgeSeconds: number): void {
  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${name}=${encodeURIComponent(value)}; Max-Age=${maxAgeSeconds}; Path=/; SameSite=Lax${secure}`;
}

export function clearCookie(name: string): void {
  document.cookie = `${name}=; Max-Age=0; Path=/; SameSite=Lax`;
}

/** Remember an invite code with when it was first opened (kept if it's the same code). */
export function rememberInvite(code: string): void {
  if (readInvite()?.code === code) return;
  setCookie(INVITE_COOKIE, `${code}.${Date.now()}`, THIRTY_DAYS);
}

export function readInvite(): { code: string; openedAt: number } | null {
  const raw = readCookie(INVITE_COOKIE);
  if (!raw) return null;
  const [code, openedAt] = raw.split(".");
  const at = Number(openedAt);
  return code && Number.isFinite(at) ? { code, openedAt: at } : null;
}

export function rememberSeatLink(token: string): void {
  setCookie(SEAT_COOKIE, token, THREE_DAYS);
}
```

Create `lib/invites/share.ts`:

```ts
"use client";

/** The phone's share sheet when there is one, else copy the link. */
export async function shareOrCopy(
  url: string,
  title: string,
): Promise<"shared" | "copied" | "failed"> {
  if (navigator.share) {
    try {
      await navigator.share({ title, url });
      return "shared";
    } catch {
      // Cancelled or unsupported: fall back to copying.
    }
  }
  try {
    await navigator.clipboard.writeText(url);
    return "copied";
  } catch {
    return "failed";
  }
}
```

- [ ] **Step 2: Make the landing routes public**

In `proxy.ts`, add to the `createRouteMatcher([...])` list, after `"/college/:slug",`:

```ts
  "/i/:code",
  "/s/:token",
```

- [ ] **Step 3: The invite page**

Create `app/i/[code]/page.tsx`:

```tsx
import { InviteLanding } from "@/components/invites/InviteLanding";

export const metadata = {
  title: "You're invited · Oxformals",
};

type Props = { params: Promise<{ code: string }> };

export default async function InvitePage({ params }: Props) {
  const { code } = await params;
  return <InviteLanding code={code.toLowerCase()} />;
}
```

Create `components/invites/InviteLanding.tsx`:

```tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@/components/auth/useAuth";
import { Avatar } from "@/components/ui/Avatar";
import { EmptyState } from "@/components/ui/EmptyState";
import type { AvatarSource } from "@/lib/auth/types";
import { clearCookie, INVITE_COOKIE, readInvite, rememberInvite } from "@/lib/invites/cookies";

/** oxformals.com/i/<code>: "[Name] invited you" and one button. */
export function InviteLanding({ code }: { code: string }) {
  const router = useRouter();
  const { isAuthenticated, user, needsRulesAgreement } = useAuth();
  const preview = useQuery(api.invites.getInvitePreview, { code });
  const claim = useMutation(api.invites.claimInvite);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (preview) rememberInvite(code);
  }, [preview, code]);

  if (preview === undefined) return null;
  if (preview === null) {
    return (
      <main className="mx-auto w-full max-w-md px-4 py-16">
        <EmptyState icon="users" title="This invite link doesn't work" action={{ label: "Go to Oxformals", href: "/" }} />
      </main>
    );
  }

  const first = preview.inviter.name.split(" ")[0];
  const signedIn = isAuthenticated && !!user && !needsRulesAgreement;

  const onJoin = async () => {
    if (!signedIn) {
      router.push("/login");
      return;
    }
    setBusy(true);
    try {
      const saved = readInvite();
      await claim({ code, openedAt: saved?.code === code ? saved.openedAt : Date.now() });
    } finally {
      clearCookie(INVITE_COOKIE);
      router.push(`/profile/${preview.inviter._id}`);
    }
  };

  return (
    <main className="mx-auto flex w-full max-w-md flex-col items-center px-4 py-16 text-center">
      <Avatar name={preview.inviter.name} size="xl" source={preview.inviter.avatar as AvatarSource | undefined} />
      <h1 className="mt-4 font-display text-4xl leading-tight text-[var(--ink)]">{first} invited you</h1>
      <p className="mt-2 text-[var(--ink-muted)]">Swap seats at formals across Oxford.</p>
      <button
        type="button"
        disabled={busy}
        onClick={() => void onJoin()}
        className="mt-6 cursor-pointer rounded-full border-2 border-[var(--ink)] bg-[var(--ink)] px-6 py-2.5 text-base font-bold text-[var(--bg)] disabled:opacity-50"
      >
        {signedIn ? `Add ${first}` : "Join Oxformals"}
      </button>
    </main>
  );
}
```

- [ ] **Step 4: Claim after sign-in, anywhere**

Create `components/invites/InviteClaimer.tsx`:

```tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@/components/auth/useAuth";
import { Modal } from "@/components/ui/Modal";
import { clearCookie, INVITE_COOKIE, readCookie, readInvite, SEAT_COOKIE } from "@/lib/invites/cookies";

/**
 * Once someone is fully signed in (profile done, rules agreed), claim the
 * invite and seat links they opened before signing in. A claimed seat link
 * lands them on the feed, where "I'm in" / "Not me" is waiting.
 */
export function InviteClaimer() {
  const router = useRouter();
  const { isAuthenticated, user, needsRulesAgreement } = useAuth();
  const claimInvite = useMutation(api.invites.claimInvite);
  const claimSeat = useMutation(api.seatLinks.claimSeatLink);
  const ran = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const ready = isAuthenticated && !!user && !needsRulesAgreement;

  useEffect(() => {
    if (!ready || ran.current) return;
    ran.current = true;
    const invite = readInvite();
    const seat = readCookie(SEAT_COOKIE);
    if (!invite && !seat) return;
    void (async () => {
      if (invite) {
        try {
          await claimInvite(invite);
        } catch {
          // A bad or stale invite just does nothing.
        } finally {
          clearCookie(INVITE_COOKIE);
        }
      }
      if (seat) {
        try {
          await claimSeat({ token: seat });
          router.push("/");
        } catch (err) {
          setError(err instanceof Error ? err.message : "That link didn't work.");
        } finally {
          clearCookie(SEAT_COOKIE);
        }
      }
    })();
  }, [ready, claimInvite, claimSeat, router]);

  return (
    <Modal open={error !== null} onClose={() => setError(null)} title="Couldn't join that group" panelClassName="max-w-sm">
      <p className="text-sm text-[var(--ink-muted)]">{error}</p>
      <div className="mt-5 flex justify-end">
        <button
          type="button"
          onClick={() => setError(null)}
          className="cursor-pointer rounded-full border-2 border-[var(--ink)] bg-[var(--ink)] px-5 py-1.5 text-sm font-bold text-[var(--bg)]"
        >
          OK
        </button>
      </div>
    </Modal>
  );
}
```

In `app/layout.tsx` add `import { InviteClaimer } from "@/components/invites/InviteClaimer";` and render `<InviteClaimer />` directly after `<BadgeCelebration />`.

- [ ] **Step 5: Type-check, lint, try it**

Run: `npx tsc --noEmit && npm run lint`
Expected: no errors.

In `npm run dev` (DEV backend):
1. Get test account A's code: in the Convex dashboard (dev) → Data → `inviteCodes`, or insert one row `{ userId: <A's id>, code: "abc234", createdAt: <now ms> }` there. (Task 21 adds the "Invite friends" button that creates it.)
2. In a private window open `/i/<code>`: A's avatar, "A invited you", "Join Oxformals". Check `document.cookie` contains `oxf_invite=<code>.<ms>`.
3. Sign up with a new Oxford test email; after onboarding + rules, A and the new account follow each other, the cookie is gone, and A's bell shows "… joined from your invite".
4. Signed in as an existing user, `/i/<code>` shows "Add A"; tapping it opens A's profile as friends.

- [ ] **Step 6: Commit**

```bash
git add lib/invites/cookies.ts lib/invites/share.ts 'app/i/[code]/page.tsx' components/invites/InviteLanding.tsx components/invites/InviteClaimer.tsx app/layout.tsx proxy.ts
git commit -m "FEAT: Invite link page that carries through sign-in

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 20: Seat link landing page

**Files:**
- Create: `app/s/[token]/page.tsx`
- Create: `components/invites/SeatLinkLanding.tsx`

**Interfaces:**
- Consumes: `api.seatLinks.getSeatLinkPreview`, `api.seatLinks.claimSeatLink` (Task 17); `rememberSeatLink` (Task 19); `formalWhen` (Task 2).
- Produces: the `/s/[token]` page.

- [ ] **Step 1: The page**

Create `app/s/[token]/page.tsx`:

```tsx
import { SeatLinkLanding } from "@/components/invites/SeatLinkLanding";

export const metadata = {
  title: "A seat for you · Oxformals",
};

type Props = { params: Promise<{ token: string }> };

export default async function SeatLinkPage({ params }: Props) {
  const { token } = await params;
  return <SeatLinkLanding token={token.toLowerCase()} />;
}
```

Create `components/invites/SeatLinkLanding.tsx`:

```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { formalWhen } from "@/convex/notificationCopy";
import { useAuth } from "@/components/auth/useAuth";
import { Avatar } from "@/components/ui/Avatar";
import { EmptyState } from "@/components/ui/EmptyState";
import type { AvatarSource } from "@/lib/auth/types";
import { rememberSeatLink } from "@/lib/invites/cookies";

/** oxformals.com/s/<token>: the formal, the host, who invited you, and "Join to answer". */
export function SeatLinkLanding({ token }: { token: string }) {
  const router = useRouter();
  const { isAuthenticated, user, needsRulesAgreement } = useAuth();
  const preview = useQuery(api.seatLinks.getSeatLinkPreview, { token });
  const claim = useMutation(api.seatLinks.claimSeatLink);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (preview === undefined) return null;
  if (preview === null || preview.state !== "open") {
    return (
      <main className="mx-auto w-full max-w-md px-4 py-16">
        <EmptyState
          icon="ticket"
          title={
            preview?.state === "used"
              ? "Someone already took this seat"
              : "This link has expired"
          }
          action={{ label: "Browse formals", href: "/?tab=browse" }}
        />
      </main>
    );
  }

  const signedIn = isAuthenticated && !!user && !needsRulesAgreement;

  const onJoin = async () => {
    if (!signedIn) {
      rememberSeatLink(token);
      router.push("/login");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await claim({ token });
      router.push("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "That didn't work.");
      setBusy(false);
    }
  };

  return (
    <main className="mx-auto flex w-full max-w-md flex-col items-center px-4 py-16 text-center">
      <Avatar name={preview.from.name} size="xl" source={preview.from.avatar as AvatarSource | undefined} />
      <h1 className="mt-4 font-display text-4xl leading-tight text-[var(--ink)]">
        {preview.from.name} saved you a seat
      </h1>
      <div className="mt-5 w-full rounded-[18px] border-[2px] border-[var(--ink)] bg-[var(--paper)] px-5 py-4 text-left">
        <p className="font-display text-2xl uppercase leading-none tracking-wide">{preview.college}</p>
        <p className="mt-1 text-sm text-[var(--ink-muted)]">{formalWhen(preview.dateTime)}</p>
        <p className="mt-1 text-sm text-[var(--ink-muted)]">Hosted by {preview.host.name}</p>
      </div>
      {error ? <p className="mt-3 text-sm text-[var(--danger)]">{error}</p> : null}
      <button
        type="button"
        disabled={busy}
        onClick={() => void onJoin()}
        className="mt-6 cursor-pointer rounded-full border-2 border-[var(--ink)] bg-[var(--ink)] px-6 py-2.5 text-base font-bold text-[var(--bg)] disabled:opacity-50"
      >
        {signedIn ? "Answer" : "Join to answer"}
      </button>
      {!signedIn ? (
        <button
          type="button"
          onClick={() => {
            rememberSeatLink(token);
            router.push("/login");
          }}
          className="mt-3 cursor-pointer text-sm text-[var(--ink-muted)] underline underline-offset-2"
        >
          I already have an account
        </button>
      ) : null}
    </main>
  );
}
```

- [ ] **Step 2: Type-check, lint, try it**

Run: `npx tsc --noEmit && npm run lint`
Expected: no errors.

After Task 22 you can send a real link; for now, create one on DEV with the Convex dashboard (run `listings:createRequest` as a test user with `links: [{ paysOwn: true, method: "credit" }]`) and open `/s/<token>` in a private window: formal card, host, "Join to answer". Sign up; you land on `/` with the "I'm in" / "Not me" card; the requester's bell shows "… joined your group".

- [ ] **Step 3: Commit**

```bash
git add 'app/s/[token]/page.tsx' components/invites/SeatLinkLanding.tsx
git commit -m "FEAT: Seat link page: see the formal and join to answer

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 21: "Invite friends" and "People you may know" on the web

**Files:**
- Create: `components/invites/InviteFriendsButton.tsx`
- Create: `components/invites/PeopleYouMayKnow.tsx`
- Modify: `components/swap/ProfileView.tsx` (own profile)
- Modify: `components/feed/FeedTab.tsx` (empty Following)
- Modify: `components/feed/FeedSidebar.tsx` (sidebar card)

**Interfaces:**
- Consumes: `api.invites.getOrCreateMyInviteCode` (Task 15), `api.peopleYouMayKnow.getPeopleYouMayKnow` (Task 18), `api.follows.follow`, `shareOrCopy` (Task 19).
- Produces: `<InviteFriendsButton variant?: "ink" | "outline" | "link" />`, `<PeopleYouMayKnow limit? className? />` (renders nothing when empty or signed out).

- [ ] **Step 1: The button**

Create `components/invites/InviteFriendsButton.tsx`:

```tsx
"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { shareOrCopy } from "@/lib/invites/share";

const STYLES = {
  ink: "rounded-full border-2 border-[var(--ink)] bg-[var(--ink)] px-5 py-2 text-sm font-bold text-[var(--bg)]",
  outline:
    "rounded-full border-2 border-[var(--ink)] bg-[var(--paper)] px-5 py-2 text-sm font-bold text-[var(--ink)]",
  link: "text-xs font-bold text-[var(--ink)] underline underline-offset-2",
} as const;

/** Shares your personal invite link (share sheet on phones, copy on desktop). */
export function InviteFriendsButton({
  variant = "outline",
  className = "",
}: {
  variant?: keyof typeof STYLES;
  className?: string;
}) {
  const getCode = useMutation(api.invites.getOrCreateMyInviteCode);
  const [state, setState] = useState<"idle" | "busy" | "copied">("idle");

  const onClick = async () => {
    setState("busy");
    try {
      const code = await getCode({});
      const result = await shareOrCopy(`${window.location.origin}/i/${code}`, "Join me on Oxformals");
      if (result === "copied") {
        setState("copied");
        window.setTimeout(() => setState("idle"), 1500);
        return;
      }
    } catch {
      // Not signed in fully, or offline: nothing to share.
    }
    setState("idle");
  };

  return (
    <button
      type="button"
      disabled={state === "busy"}
      onClick={() => void onClick()}
      className={`cursor-pointer disabled:opacity-50 ${STYLES[variant]} ${className}`}
    >
      {state === "copied" ? "Link copied" : "Invite friends"}
    </button>
  );
}
```

- [ ] **Step 2: People you may know**

Create `components/invites/PeopleYouMayKnow.tsx`:

```tsx
"use client";

import Link from "next/link";
import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { FunctionReturnType } from "convex/server";
import { Avatar } from "@/components/ui/Avatar";
import type { AvatarSource } from "@/lib/auth/types";

type Person = FunctionReturnType<typeof api.peopleYouMayKnow.getPeopleYouMayKnow>[number];

function reason(p: Person): string {
  if (p.mutualFriends > 0) {
    return `${p.mutualFriends} mutual friend${p.mutualFriends === 1 ? "" : "s"}`;
  }
  if (p.sharedFormals > 0) {
    return `${p.sharedFormals} formal${p.sharedFormals === 1 ? "" : "s"} together`;
  }
  return p.user.college ?? "";
}

export function PeopleYouMayKnow({ limit = 5, className = "" }: { limit?: number; className?: string }) {
  const people = useQuery(api.peopleYouMayKnow.getPeopleYouMayKnow, { limit });
  const follow = useMutation(api.follows.follow);
  const [busy, setBusy] = useState<string | null>(null);
  if (!people || people.length === 0) return null;

  return (
    <section
      aria-label="People you may know"
      className={`rounded-[16px] border-[1.5px] border-[color-mix(in_srgb,var(--ink)_14%,transparent)] bg-[var(--paper)] p-4 ${className}`}
    >
      <p className="text-sm font-bold text-[var(--ink)]">People you may know</p>
      <ul className="mt-1 flex flex-col">
        {people.map((p) => (
          <li key={p.user._id} className="flex items-center gap-3 py-2">
            <Link href={`/profile/${p.user._id}`} className="flex min-w-0 flex-1 items-center gap-3">
              <Avatar name={p.user.name ?? "Someone"} size="sm" source={p.user.avatar as AvatarSource | undefined} />
              <span className="min-w-0">
                <span className="block truncate text-sm font-bold text-[var(--ink)]">{p.user.name}</span>
                <span className="block truncate text-xs text-[var(--ink-muted)]">{reason(p)}</span>
              </span>
            </Link>
            <button
              type="button"
              disabled={busy === p.user._id}
              onClick={async () => {
                setBusy(p.user._id);
                try {
                  await follow({ userId: p.user._id });
                } finally {
                  setBusy(null);
                }
              }}
              className="shrink-0 cursor-pointer rounded-full border-2 border-[var(--ink)] bg-[var(--ink)] px-3 py-1 text-xs font-bold text-[var(--bg)] disabled:opacity-50"
            >
              Follow
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
```

(Once followed, the person drops out of the query's results, so the row disappears on its own.)

- [ ] **Step 3: Own profile**

In `components/swap/ProfileView.tsx` add `import { InviteFriendsButton } from "@/components/invites/InviteFriendsButton";`. In the `isOwnProfile ? (…)` branch, wrap the existing edit control so the invite button sits next to it:

```tsx
          {isOwnProfile ? (
            <>
              {onEditProfile ? (
                <button type="button" onClick={onEditProfile} className={editProfileClass}>
                  Edit profile
                </button>
              ) : (
                <Link href="/?tab=mine&edit=1" className={editProfileClass}>
                  Edit profile
                </Link>
              )}
              <InviteFriendsButton className="flex-1" />
            </>
          ) : isAuthenticated ? (
```

- [ ] **Step 4: Empty Following feed**

In `components/feed/FeedTab.tsx` add:

```tsx
import { InviteFriendsButton } from "@/components/invites/InviteFriendsButton";
import { PeopleYouMayKnow } from "@/components/invites/PeopleYouMayKnow";
```

and replace:

```tsx
    ) : items.length === 0 && scope === "following" ? (
      <EmptyState className="mt-3" icon="users" title="Nothing from people you follow yet" />
```

with:

```tsx
    ) : items.length === 0 && scope === "following" ? (
      <div className="mt-3 flex flex-col gap-3">
        <EmptyState icon="users" title="Nothing from people you follow yet" />
        <div className="flex justify-center">
          <InviteFriendsButton variant="ink" />
        </div>
        <PeopleYouMayKnow limit={10} />
      </div>
```

- [ ] **Step 5: Feed sidebar**

In `components/feed/FeedSidebar.tsx` add `import { PeopleYouMayKnow } from "@/components/invites/PeopleYouMayKnow";` and change `FeedSidebar`'s return to:

```tsx
    <div className="flex flex-col gap-3">
      {nextFormal ? <NextFormalCard nextFormal={nextFormal} /> : null}
      {hub.hasNeedsAttention ? <NeedsAttention hub={hub} /> : null}
      <PeopleYouMayKnow />
    </div>
```

- [ ] **Step 6: Type-check, lint, look**

Run: `npx tsc --noEmit && npm run lint`
Expected: no errors.

In `npm run dev`: own profile shows "Invite friends" beside "Edit profile" (desktop copies and says "Link copied"; a phone opens the share sheet). The desktop feed sidebar lists up to 5 people with reasons and Follow; following one removes the row. The Following tab with nothing in it shows the empty card, "Invite friends" and up to 10 people.

- [ ] **Step 7: Commit**

```bash
git add components/invites/InviteFriendsButton.tsx components/invites/PeopleYouMayKnow.tsx components/swap/ProfileView.tsx components/feed/FeedTab.tsx components/feed/FeedSidebar.tsx
git commit -m "FEAT: Invite friends from your profile and feed, and see people you may know

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---
### Task 22: Seat links in group booking

**Files:**
- Create: `components/invites/SeatLinksModal.tsx`
- Modify: `components/data/DataProvider.tsx` (`sendRequest` passes `links`, returns tokens)
- Modify: `components/swap/JoinRequestFlow.tsx` ("Someone not on here yet", payer choice, invite friends, links after send)

**Interfaces:**
- Consumes: `createRequest`'s `links` arg and `links: string[]` result (Task 17); `shareOrCopy` (Task 19); `InviteFriendsButton` (Task 21); `MAX_GUESTS` (4).
- Produces: `sendRequest(args & { links?: { paysOwn: boolean; method: RequestType }[] }): Promise<(SwapRequest & { links: string[] }) | null>`; `<SeatLinksModal tokens={string[]} onClose />`.

- [ ] **Step 1: DataProvider passes links through**

In `components/data/DataProvider.tsx`:
- In the `DataContextValue` type, add to `sendRequest`'s args (after `friends?: …`):

```ts
    /** People not on Oxformals yet: each gets a seat link. */
    links?: { paysOwn: boolean; method: RequestType }[];
```

and change its return type to `Promise<(SwapRequest & { links: string[] }) | null>`.
- In the `sendRequest` implementation, add the same `links?` field to its `args` type; in the `createRequestMut({ … })` call add after the `friends` spread:

```ts
          ...(args.links && args.links.length > 0 ? { links: args.links } : {}),
```

- In its returned object, add after `createdAt: Date.now(),`:

```ts
        links: "links" in result ? result.links : [],
```

- [ ] **Step 2: A modal to send the links**

Create `components/invites/SeatLinksModal.tsx`:

```tsx
"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { shareOrCopy } from "@/lib/invites/share";

/** After sending: one link per new person, to share. */
export function SeatLinksModal({ tokens, onClose }: { tokens: string[]; onClose: () => void }) {
  const [copied, setCopied] = useState<string | null>(null);
  const origin = typeof window === "undefined" ? "" : window.location.origin;

  return (
    <Modal
      open={tokens.length > 0}
      onClose={onClose}
      title={tokens.length === 1 ? "Send them their link" : "Send them their links"}
      panelClassName="max-w-md"
    >
      <ul className="flex flex-col gap-2">
        {tokens.map((token, i) => {
          const url = `${origin}/s/${token}`;
          return (
            <li
              key={token}
              className="flex items-center gap-3 rounded-2xl border-[1.5px] border-[color-mix(in_srgb,var(--ink)_14%,transparent)] bg-[var(--paper)] px-4 py-2.5"
            >
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-bold">New person {i + 1}</span>
                <span className="block truncate text-xs text-[var(--ink-muted)]">{url.replace(/^https?:\/\//, "")}</span>
              </span>
              <button
                type="button"
                onClick={async () => {
                  const result = await shareOrCopy(url, "A seat for you on Oxformals");
                  if (result === "copied") setCopied(token);
                }}
                className="shrink-0 cursor-pointer rounded-full border-2 border-[var(--ink)] bg-[var(--paper)] px-3 py-1 text-xs font-bold text-[var(--ink)]"
              >
                {copied === token ? "Copied" : "Share"}
              </button>
            </li>
          );
        })}
      </ul>
      <p className="mt-3 text-xs text-[var(--ink-muted)]">Links last 48 hours.</p>
      <div className="mt-5 flex justify-end">
        <button
          type="button"
          onClick={onClose}
          className="cursor-pointer rounded-full border-2 border-[var(--ink)] bg-[var(--ink)] px-5 py-1.5 text-sm font-bold text-[var(--bg)]"
        >
          Done
        </button>
      </div>
    </Modal>
  );
}
```

- [ ] **Step 3: JoinRequestFlow — types, state and plan**

In `components/swap/JoinRequestFlow.tsx`:
- Add imports:

```tsx
import { InviteFriendsButton } from "@/components/invites/InviteFriendsButton";
import { SeatLinksModal } from "@/components/invites/SeatLinksModal";
```

- Change `PlanSeat`'s `kind` to `"you" | "friend" | "guest" | "link"`.
- In `JoinRequestModal`, next to `const [guests, setGuests] = useState(0);` add:

```tsx
  const [newPeople, setNewPeople] = useState(0);
```

and change `const extra = friendIds.length + guests;` to:

```tsx
  const extra = friendIds.length + guests + newPeople;
```

- In `defaultPlan`, add after the `...friendIds.map(…)` entry:

```tsx
    ...Array.from({ length: newPeople }, (_, i) => ({
      key: `link:${i}`,
      kind: "link" as const,
      label: `New person ${i + 1}`,
      payer: "them" as const,
      method: "credit" as const,
    })),
```

- [ ] **Step 4: JoinRequestFlow — "Who's coming?" rows**

Replace the "Mutual follows show up here." paragraph:

```tsx
          ) : friendsList ? (
            <p className="mt-2 text-xs text-[var(--ink-muted)]">
              Mutual follows show up here.
            </p>
          ) : null}
```

with:

```tsx
          ) : friendsList ? (
            <p className="mt-2 flex flex-wrap items-baseline gap-x-2 text-xs text-[var(--ink-muted)]">
              Mutual follows show up here.
              <InviteFriendsButton variant="link" />
            </p>
          ) : null}
```

Change the guests row label `Others not on Oxformals` to `Unnamed guests`, and directly after that row's closing `</div>` (the one containing the guests `StepButton`s) add:

```tsx
          <div className="mt-2 flex items-center justify-between gap-3">
            <span className="text-xs text-[var(--ink-muted)]">Someone not on here yet</span>
            <span className="flex items-center gap-2">
              <StepButton
                label="One fewer new person"
                disabled={newPeople === 0}
                onClick={() => changePeople(() => setNewPeople((n) => Math.max(0, n - 1)))}
              >
                −
              </StepButton>
              <span className="w-5 text-center font-bold tabular-nums">{newPeople}</span>
              <StepButton
                label="One more new person"
                disabled={extra >= maxExtra}
                onClick={() => changePeople(() => setNewPeople((n) => n + 1))}
              >
                +
              </StepButton>
            </span>
          </div>
```

Replace the friends-pay note under the payment options:

```tsx
          {friendIds.length > 0 ? (
            <p className="text-xs text-[var(--ink-muted)]">
              {friendIds.length === 1
                ? `${friendName(friendIds[0])} pays their own credit.`
                : "Friends pay their own credits."}
            </p>
          ) : null}
```

with:

```tsx
          {friendIds.length > 0 ? (
            <p className="text-xs text-[var(--ink-muted)]">
              {friendIds.length === 1
                ? `${friendName(friendIds[0])} pays their own credit.`
                : "Friends pay their own credits."}
            </p>
          ) : null}
          {newPeople > 0 ? (
            <p className="text-xs text-[var(--ink-muted)]">
              New people pay with the credit they start with. You get a link to send them.
            </p>
          ) : null}
```

- [ ] **Step 5: JoinRequestFlow — per-seat payer for new people**

In `SeatPlanTable`'s `optionsFor`, replace:

```tsx
    const friend = seat.kind === "friend";
```

with:

```tsx
    const friend = seat.kind === "friend" || seat.kind === "link";
```

and replace:

```tsx
    if (seat.kind === "friend") {
      opts.push({ value: "them:credit", label: "They pay: 1 credit" });
      if (allowsPay) opts.push({ value: "them:pay", label: `They pay: ${cash}` });
    }
```

with:

```tsx
    if (seat.kind === "friend") {
      opts.push({ value: "them:credit", label: "They pay: 1 credit" });
      if (allowsPay) opts.push({ value: "them:pay", label: `They pay: ${cash}` });
    }
    if (seat.kind === "link") {
      opts.push({ value: "them:credit", label: "They pay: their 1 credit" });
    }
```

- [ ] **Step 6: JoinRequestFlow — send the links and show them**

In `handleSubmit`, add to the `sendRequest({ … })` argument, after the `friends` spread:

```tsx
        ...(newPeople > 0
          ? {
              links: plan
                .filter((p) => p.kind === "link")
                .map((p) => ({ paysOwn: p.payer === "them", method: p.method })),
            }
          : {}),
```

and change the `onSent(…)` call to pass the tokens:

```tsx
      onSent(
        you.method,
        result.status === "accepted" ? "accepted" : "pending",
        swapSeats > 0 ? effectiveOfferingId : undefined,
        result.links,
      );
```

Update `JoinRequestModal`'s `onSent` prop type to:

```tsx
  onSent: (
    requestType: RequestType,
    status: "pending" | "accepted",
    offeringListingId?: string,
    links?: string[],
  ) => void;
```

In `JoinRequestFlow` (the outer component) add state:

```tsx
  const [seatLinks, setSeatLinks] = useState<string[]>([]);
```

change the `onSent` handler to:

```tsx
          onSent={(requestType, result, offeringListingId, links) => {
            onClose();
            if (links && links.length > 0) setSeatLinks(links);
            if (result === "accepted") {
              setConfirmed({
                requestType,
                mine: offeringListingId ? (getListing(offeringListingId) ?? null) : null,
                theirs: getListing(target.id) ?? target,
                otherUserId: target.ownerUserId,
              });
            }
          }}
```

and render the modal next to `<SwapConfirmedModal … />`:

```tsx
      <SeatLinksModal tokens={seatLinks} onClose={() => setSeatLinks([])} />
```

- [ ] **Step 7: Type-check, lint, try it**

Run: `npx tsc --noEmit && npm run lint`
Expected: no errors.

In `npm run dev`: request a seat at a formal with room, add "Someone not on here yet" (the count respects the 4-person cap together with friends and guests), check "Edit payment" offers "You cover: …" or "They pay: their 1 credit" for the new person, send. The "Send them their link" modal lists `…/s/<token>` with Share. As the host, the incoming request says "Waiting for 1 person to join" and Accept errors with "Waiting for someone in this group to join Oxformals." Open the link in a private window and sign up: the requester's bell shows "… joined your group"; the new person lands on "I'm in" / "Not me"; after "I'm in" the host can accept.

- [ ] **Step 8: Commit**

```bash
git add components/invites/SeatLinksModal.tsx components/data/DataProvider.tsx components/swap/JoinRequestFlow.tsx
git commit -m "FEAT: Group requests can include someone not on Oxformals yet

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 23: Ship Part 2 to DEV

**Files:** none new (verification only; commit only if a fix is needed).

- [ ] **Step 1: Full test suite**

Run: `npx vitest run`
Expected: all PASS.

- [ ] **Step 2: Build and lint**

Run: `npx tsc --noEmit && npm run lint && npm run build`
Expected: success.

- [ ] **Step 3: Push the backend to DEV**

Run: `npx convex dev --once`
Expected: "Convex functions ready!". Never `--prod`.

- [ ] **Step 4: End-to-end by hand**

1. Account A: profile → "Invite friends" → copied `/i/<code>`. Private window: open it, "Join Oxformals", sign up with a fresh Oxford test email. After onboarding: A and the new account are mutual friends; A's bell shows "… joined from your invite"; `referrals` has a pending row.
2. The new account books a formal with a credit; after the host accepts, set the hold's `releaseAt` to the past in the dashboard (dev) and run `credits:settleDueHolds`: A gets +1 credit and "You earned 1 credit. … went to their first formal." Running it again pays nothing more.
3. Group booking with "Someone not on here yet" (Task 22 check), including letting one link lapse: on dev, run `seatLinks:expireSeatLink` with the request id and token; the host can then accept the rest.
4. The feed sidebar and empty Following tab show People you may know; Follow works (a private account shows as requested in their bell as "wants to follow you").
5. `/i/zzzzzz` shows "This invite link doesn't work"; an used `/s/<token>` shows "Someone already took this seat".

- [ ] **Step 5: Report**

Tell the user Part 2 is on DEV (not prod), and repeat the Vercel Preview env reminder for `NEXT_PUBLIC_VAPID_PUBLIC_KEY` if it hasn't been done.
