# Beli-style Profile Revamp + Badge System — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the profile page as a Beli-style surface — compact header with stat strip and badge row above one mixed Activity stream — powered by a new stored-awards badge system.

**Architecture:** Badge definitions live client-safe in `lib/data/badges.ts`; `convex/badges.ts` holds an idempotent award helper invoked inside the mutations that create badge-qualifying evidence, plus a public query for a user's earned rows. A one-off idempotent migration backfills existing users with derived earned dates. A new `getProfileActivity` query merges active listings, attended formals and public reviews into one newest-first stream with header stats. The frontend swaps `ProfileView`'s sketch-card + tabs anatomy for the new layout, reusing existing request-flow modals untouched.

**Tech Stack:** Next.js 16 App Router + React 19, Convex (queries/mutations/internalMutation), Tailwind v4, TypeScript strict.

**Spec:** `docs/superpowers/specs/2026-08-21-beli-profile-design.md`

## Global Constraints

- **Read `convex/_generated/ai/guidelines.md` before touching any Convex file** (mandated by CLAUDE.md). Key rules applied throughout: every function gets `args` validators (even `{}`); index names include all indexed fields; no DB-level `.filter()` (fetch via `withIndex`, narrow in JS like existing code does); bounded reads with `.take(200)`; private helpers are plain functions, private entry points are `internalMutation`.
- **No test framework exists in this repo (per approved spec).** Verification is: `npx tsc --noEmit` must stay clean (baseline verified clean on `revival` before this plan), `npx convex dev` must push without errors, targeted `npx convex run` calls for backend behaviour, and the manual browser checklist in Task 8. Do not introduce vitest/jest.
- Design tokens: actionable accent is `var(--accent)` / `var(--accent-hover)` with `var(--accent-ink)` text (rose); body font Manrope (default); display face is `font-display` (Schoolbell) for name, day labels, and row headlines — **no `uppercase` on the new profile headings** (the old header's uppercase is retired).
- Badge totals: **50 badges** (7 milestone + 43 college from `OXFORD_COLLEGES` which is 39 colleges + 4 permanent private halls).
- Anonymous reviews never earn review-milestone badges and never appear in the stream.
- Attendance rows with `attended === false` (declines) never count; rows missing the `attended` field count as attended (use `rowCountsAsAttended` from `lib/data/formalAttendance`).
- Every task ends with `npx tsc --noEmit` clean and a git commit. Convex-affecting tasks additionally require `npx convex dev` (running in another terminal) to push cleanly.
- Prerequisite for `npx convex run` verification steps: a dev Convex deployment is running (`npx convex dev` in a separate terminal).

---

### Task 1: Badge definitions, `userBadges` table, and badge query/award helper

**Files:**
- Create: `lib/data/badges.ts`
- Create: `convex/badges.ts`
- Modify: `convex/schema.ts` (add table after `formalAttendanceConfirmations`, before the closing `});`)

**Interfaces:**
- Consumes: `OXFORD_COLLEGES` from `lib/data/colleges.ts`; `normalizeCollegeName` from `lib/data/colleges.ts`; `rowCountsAsAttended(row)` from `lib/data/formalAttendance.ts` (returns true for `null`-safe rows where `attended !== false`).
- Produces (used by Tasks 2, 3, 6, 7):
  - `lib/data/badges.ts`: `type BadgeDefinition`, `MILESTONE_BADGES: MilestoneBadgeDefinition[]`, `COLLEGE_BADGES: CollegeBadgeDefinition[]`, `BADGE_DEFINITIONS: BadgeDefinition[]`, `TOTAL_BADGE_COUNT: number`, `badgeById(id: string): BadgeDefinition | undefined`
  - `convex/badges.ts`: `collectBadgeInputs(ctx, userId): Promise<BadgeInputs>`, `awardNewBadges(ctx: MutationCtx, userId: Id<"users">, nowMs: number): Promise<number>` (returns count inserted), public query `getUserBadges({ userId }) → Array<{ badgeId: string; earnedAt: number }>`

- [ ] **Step 1: Create `lib/data/badges.ts` (pure, client-safe definitions)**

```ts
import { OXFORD_COLLEGES } from "./colleges";

export type BadgeFamily = "milestone" | "college";
export type BadgeMetric = "formals" | "reviews";

export type MilestoneBadgeDefinition = {
  id: string;
  family: "milestone";
  metric: BadgeMetric;
  threshold: number;
  name: string;
  icon: string;
  description: string;
};

export type CollegeBadgeDefinition = {
  id: string;
  family: "college";
  college: string;
  name: string;
  icon: string;
  description: string;
};

export type BadgeDefinition = MilestoneBadgeDefinition | CollegeBadgeDefinition;

const COLLEGE_BADGE_ICON = "🏛️";

function collegeSlug(college: string): string {
  return college.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

export const MILESTONE_BADGES: MilestoneBadgeDefinition[] = [
  {
    id: "formals-1",
    family: "milestone",
    metric: "formals",
    threshold: 1,
    name: "First Formal",
    icon: "🎉",
    description: "Attended your first formal.",
  },
  {
    id: "formals-5",
    family: "milestone",
    metric: "formals",
    threshold: 5,
    name: "Regular",
    icon: "🎓",
    description: "Attended 5 formals.",
  },
  {
    id: "formals-10",
    family: "milestone",
    metric: "formals",
    threshold: 10,
    name: "Formal Fixture",
    icon: "🔥",
    description: "Attended 10 formals.",
  },
  {
    id: "formals-25",
    family: "milestone",
    metric: "formals",
    threshold: 25,
    name: "Formal Royalty",
    icon: "👑",
    description: "Attended 25 formals.",
  },
  {
    id: "reviews-1",
    family: "milestone",
    metric: "reviews",
    threshold: 1,
    name: "First Review",
    icon: "⭐",
    description: "Posted your first public review.",
  },
  {
    id: "reviews-5",
    family: "milestone",
    metric: "reviews",
    threshold: 5,
    name: "Critic",
    icon: "📝",
    description: "Posted 5 public reviews.",
  },
  {
    id: "reviews-10",
    family: "milestone",
    metric: "reviews",
    threshold: 10,
    name: "Connoisseur",
    icon: "🏆",
    description: "Posted 10 public reviews.",
  },
];

export const COLLEGE_BADGES: CollegeBadgeDefinition[] = OXFORD_COLLEGES.map(
  (college) => ({
    id: `college-${collegeSlug(college)}`,
    family: "college",
    college,
    name: college,
    icon: COLLEGE_BADGE_ICON,
    description: `Attended a formal at ${college}.`,
  }),
);

export const BADGE_DEFINITIONS: BadgeDefinition[] = [
  ...MILESTONE_BADGES,
  ...COLLEGE_BADGES,
];

export const TOTAL_BADGE_COUNT = BADGE_DEFINITIONS.length;

export function badgeById(id: string): BadgeDefinition | undefined {
  return BADGE_DEFINITIONS.find((b) => b.id === id);
}
```

- [ ] **Step 2: Add the `userBadges` table to `convex/schema.ts`**

Insert immediately before the final `});` of the schema (after the `formalAttendanceConfirmations` table):

```ts
  userBadges: defineTable({
    userId: v.id("users"),
    badgeId: v.string(),
    earnedAt: v.number(),
  })
    .index("by_userId", ["userId"])
    .index("by_userId_and_badgeId", ["userId", "badgeId"]),
```

- [ ] **Step 3: Create `convex/badges.ts` (shared reader, award helper, public query)**

```ts
import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { query } from "./_generated/server";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { normalizeCollegeName } from "../lib/data/colleges";
import { rowCountsAsAttended } from "../lib/data/formalAttendance";
import {
  COLLEGE_BADGES,
  MILESTONE_BADGES,
} from "../lib/data/badges";

export type BadgeInputs = {
  attendedCount: number;
  /** `confirmedAt` of every attended confirmation, ascending. */
  attendedConfirmedAtsAsc: number[];
  /** Normalized college → earliest attended confirmation time. */
  collegeFirstAttendedAt: Map<string, number>;
  publicReviewCount: number;
  /** `updatedAt` of every public review, ascending. */
  publicReviewUpdatedAtsAsc: number[];
};

/**
 * Single reader over the evidence tables. Bounded to 200 rows per table —
 * the same cap convention used across this codebase (users.ts, etc.).
 */
export async function collectBadgeInputs(
  ctx: QueryCtx | MutationCtx,
  userId: Id<"users">,
): Promise<BadgeInputs> {
  const attendanceRows = await ctx.db
    .query("formalAttendanceConfirmations")
    .withIndex("by_userId", (q) => q.eq("userId", userId))
    .take(200);
  const attendedRows = attendanceRows.filter(rowCountsAsAttended);

  const collegeFirstAttendedAt = new Map<string, number>();
  for (const row of attendedRows) {
    const listing = await ctx.db.get(row.listingId);
    if (!listing) continue;
    const college = normalizeCollegeName(listing.college);
    if (!college) continue;
    const prev = collegeFirstAttendedAt.get(college);
    if (prev === undefined || row.confirmedAt < prev) {
      collegeFirstAttendedAt.set(college, row.confirmedAt);
    }
  }

  const reviewRows = await ctx.db
    .query("collegeReviews")
    .withIndex("by_userId", (q) => q.eq("userId", userId))
    .take(200);
  const publicReviewRows = reviewRows.filter((r) => !r.isAnonymous);

  return {
    attendedCount: attendedRows.length,
    attendedConfirmedAtsAsc: attendedRows
      .map((r) => r.confirmedAt)
      .sort((a, b) => a - b),
    collegeFirstAttendedAt,
    publicReviewCount: publicReviewRows.length,
    publicReviewUpdatedAtsAsc: publicReviewRows
      .map((r) => r.updatedAt)
      .sort((a, b) => a - b),
  };
}

/**
 * Idempotently insert every badge the user now qualifies for but doesn't
 * hold. Live awards are stamped with `nowMs` (not backdated — backfill
 * derives historical dates instead). Returns the number of rows inserted.
 */
export async function awardNewBadges(
  ctx: MutationCtx,
  userId: Id<"users">,
  nowMs: number,
): Promise<number> {
  const inputs = await collectBadgeInputs(ctx, userId);
  const existing = await ctx.db
    .query("userBadges")
    .withIndex("by_userId", (q) => q.eq("userId", userId))
    .take(100);
  const owned = new Set(existing.map((b) => b.badgeId));

  let inserted = 0;
  for (const badge of MILESTONE_BADGES) {
    const count =
      badge.metric === "formals"
        ? inputs.attendedCount
        : inputs.publicReviewCount;
    if (count >= badge.threshold && !owned.has(badge.id)) {
      await ctx.db.insert("userBadges", {
        userId,
        badgeId: badge.id,
        earnedAt: nowMs,
      });
      inserted += 1;
    }
  }
  for (const badge of COLLEGE_BADGES) {
    if (inputs.collegeFirstAttendedAt.has(badge.college) && !owned.has(badge.id)) {
      await ctx.db.insert("userBadges", {
        userId,
        badgeId: badge.id,
        earnedAt: nowMs,
      });
      inserted += 1;
    }
  }
  return inserted;
}

/** Earned badge rows for a profile's badge row + badge case modal. */
export const getUserBadges = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("userBadges")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .take(100);
  },
});
```

- [ ] **Step 4: Verify types and schema push**

Run: `npx tsc --noEmit`
Expected: no output (clean).

With `npx convex dev` running in another terminal, confirm the push succeeds with the new table (watch the terminal for `ConvexPushSuccess`/no schema errors). If `convex dev` reports a validation error, fix before committing.

- [ ] **Step 5: Commit**

```bash
git add lib/data/badges.ts convex/badges.ts convex/schema.ts
git commit -m "FEAT: Badge definitions, userBadges table, award helper + query"
```

---

### Task 2: Award badges from attendance and review mutations

**Files:**
- Modify: `convex/formalAttendance.ts` (`confirmAttendance` handler, lines ~117-138)
- Modify: `convex/collegeReviews.ts` (`submitReview` handler ending ~line 298; `updateReview` handler ending ~line 344)

**Interfaces:**
- Consumes: `awardNewBadges(ctx, userId, nowMs)` from `./badges` (Task 1).
- Produces: side effect only — badges are inserted in the same transaction as the triggering mutation. No signature changes.

- [ ] **Step 1: Wire `confirmAttendance`**

In `convex/formalAttendance.ts`, add the import:

```ts
import { awardNewBadges } from "./badges";
```

Replace the final line of the `confirmAttendance` handler:

```ts
    return await recordAttendanceConfirmation(ctx, listing, userId, args.nowMs);
```

with:

```ts
    const confirmationId = await recordAttendanceConfirmation(
      ctx,
      listing,
      userId,
      args.nowMs,
    );
    await awardNewBadges(ctx, userId, args.nowMs);
    return confirmationId;
```

Do **not** touch `declineAttendance` — declines (`attended: false`) never award.

- [ ] **Step 2: Wire `submitReview` and `updateReview`**

In `convex/collegeReviews.ts`, add the import:

```ts
import { awardNewBadges } from "./badges";
```

In `submitReview`, after `await recordReviewInsert(ctx, college, ratings, args.nowMs);` and before `return reviewId;`, add:

```ts
    if (!args.isAnonymous) {
      await awardNewBadges(ctx, userId, args.nowMs);
    }
```

In `updateReview`, after the `await recordReviewUpdate(...)` call and before `return null;`, add:

```ts
    if (!args.isAnonymous) {
      await awardNewBadges(ctx, userId, args.nowMs);
    }
```

(The `updateReview` call covers a review being flipped from anonymous to public.)

- [ ] **Step 3: Verify**

Run: `npx tsc --noEmit` — expect clean.

Manual (dev deployment with seeded data): confirm attendance for a past listing via the app, then run:

```bash
npx convex run badges:getUserBadges '{"userId":"<your-user-id>"}'
```

Expected: at least `formals-1` and a `college-…` badge for that listing's college. Post a public review and re-run: `reviews-1` appears. Post an **anonymous** review and re-run: no new review badge.

- [ ] **Step 4: Commit**

```bash
git add convex/formalAttendance.ts convex/collegeReviews.ts
git commit -m "FEAT: Award badges atomically on attendance confirm and public review"
```

---

### Task 3: Idempotent backfill migration

**Files:**
- Modify: `convex/migrations.ts` (append new internal mutation)

**Interfaces:**
- Consumes: `collectBadgeInputs` + `BadgeInputs` from `./badges` (Task 1); `COLLEGE_BADGES`, `MILESTONE_BADGES` from `../lib/data/badges`.
- Produces: `backfillUserBadges` internal mutation, run manually via `npx convex run migrations:backfillUserBadges`. Returns `{ awarded, scanned, done }`.

- [ ] **Step 1: Append the migration to `convex/migrations.ts`**

Update the imports at the top of the file:

```ts
import { internal } from "./_generated/api";
import { internalMutation } from "./_generated/server";
import { v } from "convex/values";
import type { MutationCtx } from "./_generated/server";
import { collectBadgeInputs } from "./badges";
import { COLLEGE_BADGES, MILESTONE_BADGES } from "../lib/data/badges";
```

Append at the end of the file:

```ts
function milestoneEarnedAt(
  metricDatesAsc: number[],
  threshold: number,
): number | null {
  return metricDatesAsc.length >= threshold
    ? metricDatesAsc[threshold - 1]
    : null;
}

/**
 * All badges this user qualifies for, with historically derived earnedAt:
 * milestone dates come from the threshold-th piece of evidence; college
 * dates from the first attended confirmation at that college.
 */
function earnedBadgesWithDerivedDates(
  inputs: Awaited<ReturnType<typeof collectBadgeInputs>>,
): Array<{ badgeId: string; earnedAt: number }> {
  const earned: Array<{ badgeId: string; earnedAt: number }> = [];
  for (const badge of MILESTONE_BADGES) {
    const dates =
      badge.metric === "formals"
        ? inputs.attendedConfirmedAtsAsc
        : inputs.publicReviewUpdatedAtsAsc;
    const ts = milestoneEarnedAt(dates, badge.threshold);
    if (ts !== null) earned.push({ badgeId: badge.id, earnedAt: ts });
  }
  for (const badge of COLLEGE_BADGES) {
    const ts = inputs.collegeFirstAttendedAt.get(badge.college);
    if (ts !== undefined) earned.push({ badgeId: badge.id, earnedAt: ts });
  }
  return earned;
}

/**
 * One-off backfill: award every badge existing users already qualify for,
 * with derived earnedAt dates. Idempotent — held badges are never
 * re-inserted, so re-running awards nothing new. Batched 100 users per
 * transaction with scheduler continuation (same pattern as
 * users.backfillCollegeWishlists).
 *
 * Run with: `npx convex run migrations:backfillUserBadges`
 */
export const backfillUserBadges = internalMutation({
  args: {},
  returns: v.object({
    awarded: v.number(),
    scanned: v.number(),
    done: v.boolean(),
  }),
  handler: async (ctx) => {
    const users = await ctx.db.query("users").take(100);
    let awarded = 0;
    for (const user of users) {
      const inputs = await collectBadgeInputs(ctx, user._id);
      const existing = await ctx.db
        .query("userBadges")
        .withIndex("by_userId", (q) => q.eq("userId", user._id))
        .take(100);
      const owned = new Set(existing.map((b) => b.badgeId));
      for (const earned of earnedBadgesWithDerivedDates(inputs)) {
        if (owned.has(earned.badgeId)) continue;
        await ctx.db.insert("userBadges", {
          userId: user._id,
          badgeId: earned.badgeId,
          earnedAt: earned.earnedAt,
        });
        awarded += 1;
      }
    }
    const done = users.length < 100;
    if (!done) {
      await ctx.scheduler.runAfter(0, internal.migrations.backfillUserBadges, {});
    }
    return { awarded, scanned: users.length, done };
  },
});
```

Note: `MutationCtx` is imported only if the linter flags it — with this exact code it is unused, so **omit it from the imports**. The import block is:

```ts
import { internal } from "./_generated/api";
import { internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { collectBadgeInputs } from "./badges";
import { COLLEGE_BADGES, MILESTONE_BADGES } from "../lib/data/badges";
```

- [ ] **Step 2: Verify types and idempotency**

Run: `npx tsc --noEmit` — expect clean.

Manual on dev data:

```bash
npx convex run migrations:backfillUserBadges
# Expected: {"awarded":N,"scanned":<user count>,"done":true}
npx convex run migrations:backfillUserBadges
# Expected: {"awarded":0,...}  ← idempotent re-run inserts nothing
```

- [ ] **Step 3: Commit**

```bash
git add convex/migrations.ts
git commit -m "FEAT: Idempotent badge backfill with derived earned dates"
```

---

### Task 4: `getProfileActivity` merged-stream query

**Files:**
- Create: `convex/profileActivity.ts`

**Interfaces:**
- Consumes: `enrichListing(ctx, listing)` from `./listingHelpers` (returns doc + `menuPdfUrl`, `menuFileContentType`); `rowCountsAsAttended` from `../lib/data/formalAttendance`.
- Produces (consumed by Tasks 5 and 7): public query `getProfileActivity({ userId })` returning `{ items, stats }` where:

```ts
type ProfileActivityItem =
  | { kind: "listing"; ts: number; listing: ListingWithMenuPdfUrl }
  | {
      kind: "attended";
      ts: number; // Date.parse(listing.dateTime), fallback row.confirmedAt
      college: string;
      dateTime: string; // original ISO string
      hosted: boolean;
      price?: number;
    }
  | {
      kind: "review";
      ts: number; // review.updatedAt
      college: string;
      ratings: { food: number; atmosphere: number; value: number; overall: number };
      comment: string | null;
    };
// items: newest-first, capped at 50
// stats: { activeCount: number; reviewCount: number; attendedCount: number }
```

(No `returns` validator — mirrors `getPublicProfile`, which omits one for its rich shape.)

- [ ] **Step 1: Create `convex/profileActivity.ts`**

```ts
import { v } from "convex/values";
import { query } from "./_generated/server";
import { enrichListing } from "./listingHelpers";
import { rowCountsAsAttended } from "../lib/data/formalAttendance";

/**
 * The Beli-style profile stream: active listings, attended formals and
 * public non-anonymous reviews merged newest-first. Bounded reads (200 per
 * source) and a 50-item cap; revisit pagination when real volume demands it.
 */
export const getProfileActivity = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const listingDocs = await ctx.db
      .query("listings")
      .withIndex("by_ownerUserId", (q) => q.eq("ownerUserId", args.userId))
      .take(200);
    const activeListings: Array<
      Awaited<ReturnType<typeof enrichListing>>
    > = [];
    for (const listing of listingDocs) {
      if (listing.status !== "active") continue;
      activeListings.push(await enrichListing(ctx, listing));
    }

    const attendanceRows = await ctx.db
      .query("formalAttendanceConfirmations")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .take(200);
    const attendedItems: Array<
      | {
          kind: "attended";
          ts: number;
          college: string;
          dateTime: string;
          hosted: boolean;
          price?: number;
        }
    > = [];
    for (const row of attendanceRows) {
      if (!rowCountsAsAttended(row)) continue;
      const listing = await ctx.db.get(row.listingId);
      if (!listing) continue;
      const parsed = Date.parse(listing.dateTime);
      attendedItems.push({
        kind: "attended",
        ts: Number.isNaN(parsed) ? row.confirmedAt : parsed,
        college: listing.college,
        dateTime: listing.dateTime,
        hosted: listing.ownerUserId === args.userId,
        ...(listing.price !== undefined ? { price: listing.price } : {}),
      });
    }

    const reviewDocs = await ctx.db
      .query("collegeReviews")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .take(200);
    const reviewItems = reviewDocs
      .filter((r) => !r.isAnonymous)
      .map((r) => ({
        kind: "review" as const,
        ts: r.updatedAt,
        college: r.college,
        ratings: r.ratings,
        comment: r.comment ?? null,
      }));

    const items = [
      ...activeListings.map((l) => ({
        kind: "listing" as const,
        ts: l._creationTime,
        listing: l,
      })),
      ...attendedItems,
      ...reviewItems,
    ]
      .sort((a, b) => b.ts - a.ts)
      .slice(0, 50);

    return {
      items,
      stats: {
        activeCount: activeListings.length,
        reviewCount: reviewItems.length,
        attendedCount: attendedItems.length,
      },
    };
  },
});
```

- [ ] **Step 2: Verify**

Run: `npx tsc --noEmit` — expect clean.

Manual: `npx convex run profileActivity:getProfileActivity '{"userId":"<id-with-activity>"}'` — expect `items` sorted newest-first containing the kinds you know that user has, and `stats` counts matching. For a fresh user id, expect `{ items: [], stats: { activeCount: 0, reviewCount: 0, attendedCount: 0 } }`.

- [ ] **Step 3: Commit**

```bash
git add convex/profileActivity.ts
git commit -m "FEAT: Merged profile activity stream query with header stats"
```

---

### Task 5: Client stream primitives (grouping util, stream row, stream list)

**Files:**
- Create: `lib/data/groupActivityByDay.ts`
- Create: `components/swap/ProfileStreamRow.tsx`
- Create: `components/swap/ProfileActivityStream.tsx`

**Interfaces:**
- Consumes: `Listing` type from `lib/data/types`; `User` from `lib/auth/types`; `isoToLocalDateKey`, `formatDayLabel`, `formatListingTime`, `formatShortDate`, `formatRelativeTime`, `formatPrice`, `formatYearLabel` from `lib/data/format`; `ListingRow` (props: `listing`, `owner`, `memberUsers`, `onPress`, `onRequest`, `disabled`, `disabledLabel`, `hideInterests`, `align`); `Avatar` from `ui/Avatar`; item shape produced by Task 4's query (inferred via `api.profileActivity.getProfileActivity` return type — the util below re-declares it structurally).
- Produces (consumed by Task 7):
  - `groupActivityByDay(items: ProfileActivityItem[]): ActivityDayGroup[]` with `{ dateKey: string; day: string; weekday: string; items: ProfileActivityItem[] }` groups, newest-first
  - `ProfileActivityStream` component: props `{ items, owner, memberUsersFor, onRequest, onPress, disabled?, disabledLabel?, className? }`
  - `ProfileStreamRow` component: props `{ item, owner, memberUsers, onPress, onRequest?, disabled?, disabledLabel? }`

- [ ] **Step 1: Create `lib/data/groupActivityByDay.ts`**

```ts
import type { Listing } from "./types";
import { formatDayLabel, isoToLocalDateKey } from "./format";

export type AttendedActivity = {
  kind: "attended";
  ts: number;
  college: string;
  dateTime: string;
  hosted: boolean;
  price?: number;
};

export type ReviewActivity = {
  kind: "review";
  ts: number;
  college: string;
  ratings: {
    food: number;
    atmosphere: number;
    value: number;
    overall: number;
  };
  comment: string | null;
};

export type ListingActivity = { kind: "listing"; ts: number; listing: Listing };

export type ProfileActivityItem =
  | ListingActivity
  | AttendedActivity
  | ReviewActivity;

export type ActivityDayGroup = {
  dateKey: string;
  day: string;
  weekday: string;
  items: ProfileActivityItem[];
};

function itemIso(item: ProfileActivityItem): string {
  return item.kind === "attended"
    ? item.dateTime
    : new Date(item.ts).toISOString();
}

/**
 * Group the (already newest-first sorted) stream into local-day buckets.
 * Insertion order of the Map preserves the caller's ordering.
 */
export function groupActivityByDay(
  items: ProfileActivityItem[],
): ActivityDayGroup[] {
  const groups = new Map<string, ProfileActivityItem[]>();
  for (const item of items) {
    const key = isoToLocalDateKey(itemIso(item));
    const bucket = groups.get(key);
    if (bucket) bucket.push(item);
    else groups.set(key, [item]);
  }
  return [...groups.entries()].map(([dateKey, groupItems]) => {
    const { day, weekday } = formatDayLabel(itemIso(groupItems[0]));
    return { dateKey, day, weekday, items: groupItems };
  });
}
```

- [ ] **Step 2: Create `components/swap/ProfileStreamRow.tsx`**

```tsx
"use client";

import { ListingRow } from "./ListingRow";
import {
  formatListingTime,
  formatPrice,
  formatRelativeTime,
} from "@/lib/data/format";
import type { Listing } from "@/lib/data/types";
import type { User } from "@/lib/auth/types";
import type { ProfileActivityItem } from "@/lib/data/groupActivityByDay";

type Props = {
  item: ProfileActivityItem;
  owner: User;
  memberUsers: User[];
  onPress: (listing: Listing) => void;
  onRequest?: (listing: Listing) => void;
  disabled?: boolean;
  disabledLabel?: string;
};

const KIND_PILL_CLS: Record<ProfileActivityItem["kind"], string> = {
  listing: "border-[var(--ink)] bg-[var(--bg)] text-[var(--ink)]",
  attended:
    "border-[var(--ink)] bg-[color-mix(in_srgb,var(--paper)_82%,var(--ink)_6%)] text-[var(--ink)]",
  review: "border-[var(--accent)] bg-[var(--accent)] text-[var(--accent-ink)]",
};

function Stars({ overall }: { overall: number }) {
  const filled = Math.max(0, Math.min(5, Math.round(overall)));
  return (
    <span className="text-[var(--accent)]" aria-label={`${overall} out of 5`}>
      {"★".repeat(filled)}
      <span className="text-[var(--ink-soft)]">{"★".repeat(5 - filled)}</span>
    </span>
  );
}

/**
 * One card of the profile activity stream: kind pill + relative timestamp
 * header, then the body for that kind. Listings delegate their body to
 * ListingRow (browse-feed card content) so the two surfaces stay in sync.
 */
export function ProfileStreamRow({
  item,
  owner,
  memberUsers,
  onPress,
  onRequest,
  disabled,
  disabledLabel,
}: Props) {
  return (
    <li className="rounded-[18px] border-[1.5px] border-[color-mix(in_srgb,var(--ink)_14%,transparent)] bg-[var(--paper)] px-4 py-3 shadow-[0_2px_14px_-10px_rgba(0,0,0,0.25)] sm:px-5 sm:py-4">
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <span
          className={`rounded-full border-[1.5px] px-2 py-[3px] text-[0.65rem] font-bold uppercase tracking-[0.07em] ${KIND_PILL_CLS[item.kind]}`}
        >
          {item.kind === "attended" ? "Attended" : item.kind}
        </span>
        <span className="text-[0.7rem] text-[var(--ink-muted)]">
          {formatRelativeTime(item.ts)}
        </span>
      </div>

      {item.kind === "listing" ? (
        <ListingRow
          listing={item.listing}
          owner={owner}
          memberUsers={memberUsers}
          align="center"
          hideInterests
          onPress={() => onPress(item.listing)}
          onRequest={onRequest ? () => onRequest(item.listing) : undefined}
          disabled={disabled}
          disabledLabel={disabledLabel}
        />
      ) : item.kind === "attended" ? (
        <div>
          <h3 className="flex flex-wrap items-baseline gap-x-2 font-display text-[1.3rem] leading-tight sm:text-[1.5rem]">
            {item.college}
            <span className="text-[0.95rem] normal-case tracking-normal text-[var(--ink-muted)]">
              {formatListingTime(item.dateTime)}
            </span>
          </h3>
          <p className="mt-1 text-[0.9rem] text-[var(--ink-muted)]">
            {item.hosted ? "Hosted" : "Guest"}
            {!item.hosted && item.price !== undefined
              ? ` · paid ${formatPrice(item.price)}`
              : ""}
          </p>
        </div>
      ) : (
        <div>
          <h3 className="flex flex-wrap items-baseline gap-x-2 font-display text-[1.3rem] leading-tight sm:text-[1.5rem]">
            {item.college}
            <Stars overall={item.ratings.overall} />
          </h3>
          {item.comment ? (
            <p className="mt-1 line-clamp-2 break-words text-pretty text-[0.95rem] italic text-[var(--ink-muted)]">
              &ldquo;{item.comment}&rdquo;
            </p>
          ) : null}
        </div>
      )}
    </li>
  );
}
```

- [ ] **Step 3: Create `components/swap/ProfileActivityStream.tsx`**

```tsx
"use client";

import { ProfileStreamRow } from "./ProfileStreamRow";
import {
  groupActivityByDay,
  type ProfileActivityItem,
} from "@/lib/data/groupActivityByDay";
import type { Listing } from "@/lib/data/types";
import type { User } from "@/lib/auth/types";

type Props = {
  items: ProfileActivityItem[];
  owner: User;
  memberUsersFor: (listing: Listing) => User[];
  onPress: (listing: Listing) => void;
  onRequest?: (listing: Listing) => void;
  disabled?: boolean;
  disabledLabel?: string;
  className?: string;
};

/**
 * The mixed Beli-style stream: day-labelled groups of stream cards,
 * newest first (ordering is owned by the getProfileActivity query).
 */
export function ProfileActivityStream({
  items,
  owner,
  memberUsersFor,
  onPress,
  onRequest,
  disabled,
  disabledLabel,
  className = "",
}: Props) {
  const groups = groupActivityByDay(items);
  return (
    <div className={className}>
      {groups.map((group) => (
        <section key={group.dateKey} aria-label={`${group.weekday} ${group.day}`}>
          <div className="font-display text-[1.1rem] text-[var(--ink-muted)]">
            {group.day}
          </div>
          <ul className="mt-2 flex flex-col gap-3">
            {group.items.map((item) =>
              item.kind === "listing" ? (
                <ProfileStreamRow
                  key={`listing-${item.listing.id}`}
                  item={item}
                  owner={owner}
                  memberUsers={memberUsersFor(item.listing)}
                  onPress={onPress}
                  onRequest={onRequest}
                  disabled={disabled}
                  disabledLabel={disabledLabel}
                />
              ) : (
                <ProfileStreamRow
                  key={`${item.kind}-${item.ts}-${item.college}`}
                  item={item}
                  owner={owner}
                  memberUsers={[]}
                  onPress={onPress}
                  disabled={disabled}
                  disabledLabel={disabledLabel}
                />
              ),
            )}
          </ul>
        </section>
      ))}
    </div>
  );
}
```

- [ ] **Step 4: Verify**

Run: `npx tsc --noEmit` — expect clean. (Components aren't rendered anywhere yet; Task 7 wires them.)

- [ ] **Step 5: Commit**

```bash
git add lib/data/groupActivityByDay.ts components/swap/ProfileStreamRow.tsx components/swap/ProfileActivityStream.tsx
git commit -m "FEAT: Profile activity stream primitives (day grouping, stream row, list)"
```

---

### Task 6: Badge case modal

**Files:**
- Create: `components/swap/BadgeCaseModal.tsx`

**Interfaces:**
- Consumes: `Modal` from `ui/Modal` (props: `open`, `onClose`, `title`, `panelClassName`); `badgeById`, `COLLEGE_BADGES`, `MILESTONE_BADGES`, `TOTAL_BADGE_COUNT` from `lib/data/badges`.
- Produces: `BadgeCaseModal` with props `{ open: boolean; onClose: () => void; earned: Array<{ badgeId: string; earnedAt: number }> | undefined }` (undefined = loading → render nothing but the shell).

- [ ] **Step 1: Create `components/swap/BadgeCaseModal.tsx`**

```tsx
"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import {
  COLLEGE_BADGES,
  MILESTONE_BADGES,
  badgeById,
  type BadgeDefinition,
} from "@/lib/data/badges";

type Props = {
  open: boolean;
  onClose: () => void;
  earned: Array<{ badgeId: string; earnedAt: number }> | undefined;
};

function formatEarnedDate(ts: number): string {
  return new Date(ts).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function BadgeCircle({
  def,
  earnedAt,
  selected,
  onSelect,
}: {
  def: BadgeDefinition;
  earnedAt?: number;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      title={def.name}
      aria-pressed={selected}
      className={`flex w-full cursor-pointer flex-col items-center gap-1 rounded-xl p-1.5 transition-colors ${
        selected ? "bg-[color-mix(in_srgb,var(--accent)_14%,transparent)]" : "hover:bg-[var(--paper)]"
      }`}
    >
      <span
        className={`flex h-11 w-11 items-center justify-center rounded-full border-2 border-[var(--ink)] bg-[var(--bg)] text-lg ${
          earnedAt === undefined ? "border-dashed opacity-30" : ""
        }`}
      >
        {earnedAt === undefined ? "🔒" : def.icon}
      </span>
      <span
        className={`w-full truncate text-center text-[0.65rem] ${
          earnedAt === undefined ? "text-[var(--ink-muted)]" : "text-[var(--ink)]"
        }`}
      >
        {def.name}
      </span>
    </button>
  );
}

/** Full badge case: milestone + college sections, earned vs locked, detail line. */
export function BadgeCaseModal({ open, onClose, earned }: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const earnedMap = new Map((earned ?? []).map((e) => [e.badgeId, e.earnedAt]));
  const selected = selectedId ? badgeById(selectedId) : undefined;
  const selectedEarnedAt = selectedId ? earnedMap.get(selectedId) : undefined;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Badges · ${earnedMap.size} of ${TOTAL_BADGE_COUNT}`}
      panelClassName="max-w-md"
    >
      <section>
        <h3 className="text-[0.7rem] font-bold uppercase tracking-[0.08em] text-[var(--ink-muted)]">
          Milestones
        </h3>
        <div className="mt-2 grid grid-cols-4 gap-1.5 sm:grid-cols-7">
          {MILESTONE_BADGES.map((def) => (
            <BadgeCircle
              key={def.id}
              def={def}
              earnedAt={earnedMap.get(def.id)}
              selected={selectedId === def.id}
              onSelect={() =>
                setSelectedId((cur) => (cur === def.id ? null : def.id))
              }
            />
          ))}
        </div>
      </section>

      <section className="mt-5">
        <h3 className="text-[0.7rem] font-bold uppercase tracking-[0.08em] text-[var(--ink-muted)]">
          Colleges · {COLLEGE_BADGES.filter((b) => earnedMap.has(b.id)).length} of{" "}
          {COLLEGE_BADGES.length}
        </h3>
        <div className="mt-2 grid grid-cols-4 gap-1.5 sm:grid-cols-6">
          {COLLEGE_BADGES.map((def) => (
            <BadgeCircle
              key={def.id}
              def={def}
              earnedAt={earnedMap.get(def.id)}
              selected={selectedId === def.id}
              onSelect={() =>
                setSelectedId((cur) => (cur === def.id ? null : def.id))
              }
            />
          ))}
        </div>
      </section>

      {selected ? (
        <div className="mt-5 rounded-xl bg-[color-mix(in_srgb,var(--accent)_10%,transparent)] px-4 py-3">
          <p className="text-sm font-bold text-[var(--accent)]">
            {selected.icon} {selected.name}
            {selectedEarnedAt !== undefined
              ? ` — earned ${formatEarnedDate(selectedEarnedAt)}`
              : ""}
          </p>
          <p className="mt-0.5 text-[0.85rem] text-[var(--ink-muted)]">
            {selected.description}
          </p>
        </div>
      ) : (
        <p className="mt-5 text-center text-[0.8rem] text-[var(--ink-muted)]">
          Tap an earned badge to see when you got it.
        </p>
      )}
    </Modal>
  );
}
```

- [ ] **Step 2: Verify and commit**

Run: `npx tsc --noEmit` — expect clean.

```bash
git add components/swap/BadgeCaseModal.tsx
git commit -m "FEAT: Badge case modal (milestones + colleges, locked states, earned dates)"
```

---

### Task 7: Rewrite `ProfileView` around the new anatomy

**Files:**
- Modify: `components/swap/ProfileView.tsx` (full restructure; ~720 lines today)

**Interfaces:**
- Consumes: everything from Tasks 1–6 plus existing `useQuery(api.users.getPublicProfile)`, `useQuery(api.badges.getUserBadges)`, `useQuery(api.profileActivity.getProfileActivity)`, `TOTAL_BADGE_COUNT` from `lib/data/badges`, existing modals and `AvatarLightbox` (kept verbatim from the current file).
- Produces: same external props `{ userId, embedded?, onEditProfile? }` — the Me tab and `/profile/[userId]` keep working unchanged.

**Preserve verbatim from the current file** (do not retype, keep as-is):
- `mapProfileListing`, `AvatarLightbox` (whole component), all state + callbacks from `detailListing` through `handleRequestTypeChosen` (including `openRequestFlow`, `handleRequestClick`, blocking-request logic), `myActiveListings`, `ownerAsUser`, `editProfileClass`, loading + not-found branches, and **all five modals** (`ListingDetailModal`, `RequestTypeChooserModal`, `RequestSwapModal`, `RequestPayModal`, `SwapConfirmedModal`, `BlockingRequestModal`) plus the `showNoListingPrompt` `Modal`.

**Remove:** the `profileTab` state and its `useEffect`, the entire Listings/Reviews tab UI, the old `SketchCard` header block (from `<SketchCard seed={userId.length}` to its closing `</SketchCard>`), the Reviews tab body (`publicReviews` rendering — reviews now arrive via the stream), the interests chips block (interests intentionally leave the profile header per spec — they still render on browse rows), and the `Chip` import (no longer used here).

- [ ] **Step 1: Update imports and queries**

Add to imports:

```ts
import { TOTAL_BADGE_COUNT } from "@/lib/data/badges";
import { ProfileActivityStream } from "./ProfileActivityStream";
import { BadgeCaseModal } from "./BadgeCaseModal";
import type { ProfileActivityItem } from "@/lib/data/groupActivityByDay";
```

Replace the `publicReviews` query with:

```ts
  const activity = useQuery(api.profileActivity.getProfileActivity, {
    userId: userId as Id<"users">,
  });
  const earnedBadges = useQuery(api.badges.getUserBadges, {
    userId: userId as Id<"users">,
  });
  const [badgeCaseOpen, setBadgeCaseOpen] = useState(false);
```

Delete the `profileTab` state and its reset `useEffect`. `activeListings` (mapped via `mapProfileListing`) is still needed for `ListingDayList`? **No** — the stream renders listings itself, so delete `activeListings` too; the request-flow still needs `myActiveListings` (keep).

- [ ] **Step 2: Replace the header + tabs + lists section**

Replace everything from the `return (` of the loaded branch's `<Outer ...>` down to (but not including) `<ListingDetailModal` with:

```tsx
  const stats = activity?.stats;
  // The query returns raw enriched listing docs; ListingRow needs the
  // client-mapped `Listing` shape (id/createdAt/formalType defaults), so
  // listing items go through the existing mapProfileListing helper.
  const streamItems = ((activity?.items ?? []) as ProfileActivityItem[]).map(
    (item) =>
      item.kind === "listing"
        ? {
            kind: "listing" as const,
            ts: item.ts,
            listing: mapProfileListing(item.listing),
          }
        : item,
  );
  const earnedCount = earnedBadges?.length ?? 0;
  const memberUsersFor = (l: Listing) =>
    l.members
      .filter((mid) => mid !== l.ownerUserId)
      .map(getUser)
      .filter((u): u is NonNullable<typeof u> => !!u);

  return (
    <Outer className={outerClass}>
      {!embedded ? (
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="rounded-full border-[2px] border-[var(--ink)] px-4 py-1.5 text-sm text-[var(--ink)] transition-colors hover:bg-[var(--ink)] hover:text-[var(--bg)]"
          >
            Back to Browse
          </Link>
        </div>
      ) : null}

      {/* Header — left-aligned compact */}
      <div className="flex items-center gap-3.5">
        <div
          role="button"
          tabIndex={0}
          className="shrink-0 cursor-pointer transition-transform hover:scale-105"
          onClick={() => setAvatarOpen(true)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              setAvatarOpen(true);
            }
          }}
          aria-label={`View ${name}'s avatar`}
        >
          <Avatar name={name} size="lg" source={avatar} />
        </div>
        {avatarOpen && (
          <AvatarLightbox source={avatar} name={name} onClose={closeAvatar} />
        )}
        <div className="min-w-0 flex-1">
          <h1 className="font-display text-[1.75rem] leading-tight">{name}</h1>
          {profileLine ? (
            <p className="mt-0.5 text-sm text-[var(--ink-soft)]">{profileLine}</p>
          ) : null}
        </div>
        {isOwnProfile ? (
          onEditProfile ? (
            <button type="button" onClick={onEditProfile} className={editProfileClass}>
              Edit
            </button>
          ) : (
            <Link href="/?tab=mine&edit=1" className={editProfileClass}>
              Edit
            </Link>
          )
        ) : isAuthenticated ? (
          <MessageUserButton
            otherUserId={userId as Id<"users">}
            className="shrink-0 cursor-pointer rounded-full border-[2px] border-[var(--ink)] px-5 py-2 text-sm text-[var(--ink)] transition-colors hover:bg-[var(--ink)] hover:text-[var(--bg)] disabled:opacity-50"
          />
        ) : (
          <button
            type="button"
            onClick={() =>
              router.push(
                `/login?next=${encodeURIComponent(`/profile/${userId}`)}`,
              )
            }
            className="shrink-0 cursor-pointer rounded-full border-[2px] border-[var(--ink)] px-5 py-2 text-sm text-[var(--ink)] transition-colors hover:bg-[var(--ink)] hover:text-[var(--bg)]"
          >
            Message
          </button>
        )}
      </div>

      {(instagramHandle || whatsappPhone) && (
        <div className="flex flex-wrap gap-2">
          {/* Paste the two social <a> elements from the current file's socials
              section here unchanged (same href/target/rel/inner SVG + label),
              replacing only each anchor's className with this quiet-pill style:
              "inline-flex h-8 max-w-full min-w-0 items-center gap-1.5 rounded-full border-[1.5px] border-[color-mix(in_srgb,var(--ink)_35%,transparent)] px-3 text-[0.85rem] text-[var(--ink-soft)] transition-colors hover:border-[var(--ink)] hover:text-[var(--ink)]" */}
        </div>
      )}

      {(dietaryRequirements || subject) && (
        <div className="-mt-4 space-y-0.5 text-sm text-[var(--ink-muted)]">
          {dietaryRequirements ? (
            <p>
              <span className="font-medium text-[var(--ink)]">
                Allergens / Dietary requirements:
              </span>{" "}
              {dietaryRequirements}
            </p>
          ) : null}
          {subject ? (
            <p>
              <span className="font-medium text-[var(--ink)]">Subject:</span>{" "}
              {subject}
            </p>
          ) : null}
        </div>
      )}

      {/* Stat strip */}
      <div className="flex items-baseline gap-6">
        <span className="text-[1.05rem]">
          <span className="font-extrabold text-[var(--accent)]">
            {stats ? stats.activeCount : "–"}
          </span>{" "}
          <span className="text-[0.75rem] uppercase tracking-[0.05em] text-[var(--ink-muted)]">
            active
          </span>
        </span>
        <span className="text-[1.05rem]">
          <span className="font-extrabold">{stats ? stats.reviewCount : "–"}</span>{" "}
          <span className="text-[0.75rem] uppercase tracking-[0.05em] text-[var(--ink-muted)]">
            reviews
          </span>
        </span>
        <span className="text-[1.05rem]">
          <span className="font-extrabold">{stats ? stats.attendedCount : "–"}</span>{" "}
          <span className="text-[0.75rem] uppercase tracking-[0.05em] text-[var(--ink-muted)]">
            formals
          </span>
        </span>
      </div>

      {/* Badge row */}
      <button
        type="button"
        onClick={() => setBadgeCaseOpen(true)}
        className="flex cursor-pointer items-center gap-2 self-start"
      >
        {(earnedBadges ?? []).slice(0, 4).map((b) => {
          const def = badgeById(b.badgeId);
          if (!def) return null;
          return (
            <span
              key={b.badgeId}
              className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-[var(--ink)] bg-[var(--bg)] text-base"
            >
              {def.icon}
            </span>
          );
        })}
        <span className="text-[0.85rem] text-[var(--ink-muted)]">
          {earnedCount} of {TOTAL_BADGE_COUNT} ›
        </span>
      </button>

      {/* Activity stream */}
      <section aria-label="Activity">
        <h2 className="text-[0.7rem] font-bold uppercase tracking-[0.08em] text-[var(--ink-muted)]">
          Activity
        </h2>
        {activity === undefined ? (
          <p className="mt-3 text-[var(--ink-muted)]">Loading activity…</p>
        ) : streamItems.length === 0 ? (
          <div className="mt-3 rounded-[18px] border-[1.5px] border-dashed border-[color-mix(in_srgb,var(--ink)_25%,transparent)] px-5 py-8 text-center text-[var(--ink-muted)]">
            {isOwnProfile
              ? "No activity yet — list a formal to get started."
              : `${name.split(" ")[0]} hasn\u2019t been active yet.`}
          </div>
        ) : (
          <ProfileActivityStream
            className="mt-3"
            items={streamItems}
            owner={ownerAsUser}
            memberUsersFor={memberUsersFor}
            onPress={(l) => setDetailListing(l)}
            onRequest={
              isOwnProfile ? undefined : (l) => handleRequestClick(l)
            }
            disabled={listingDisabled}
            disabledLabel={
              isOwnProfile
                ? "Your listing"
                : !isAuthenticated
                  ? "Sign in to request"
                  : undefined
            }
          />
        )}
      </section>
```

Then, immediately after that section and before the existing `<ListingDetailModal ...>` (kept verbatim), add:

```tsx
      <BadgeCaseModal
        open={badgeCaseOpen}
        onClose={() => setBadgeCaseOpen(false)}
        earned={earnedBadges}
      />
```

Also add the `badgeById` import to the Task-7 import list:

```ts
import { TOTAL_BADGE_COUNT, badgeById } from "@/lib/data/badges";
```

- [ ] **Step 3: Clean up dead code**

- Delete the now-unused `ListingDayList` import and the old tab section if any remnants remain.
- `publicReviews` references are gone; confirm `CollegeReviewCard` import is removed if unused.
- Run: `npx tsc --noEmit` — expect clean. Fix any unused-import errors it reports.

- [ ] **Step 4: Verify in the browser**

With `npx convex dev` and `npm run dev` running:

1. Open `/profile/<some-other-user-id>` — expect: compact header, socials pills, stat strip, badge row, Activity stream with day labels; listing cards show the CTA; clicking one opens the existing request flow.
2. Open your own profile via the Me tab — expect identical anatomy without the back link; Edit opens the edit flow; "No activity yet" empty state if the account is fresh.
3. Signed out, open a profile — Message redirects to `/login?next=…`.
4. Click the badge row — badge case opens; locked badges are dashed/locked; tapping an earned badge shows its earned date.

- [ ] **Step 5: Commit**

```bash
git add components/swap/ProfileView.tsx
git commit -m "FEAT: Beli-style profile — compact header, stat strip, badges, activity stream"
```

---

### Task 8: Full verification pass

**Files:**
- Modify: none expected (fix-forward if verification finds issues)

- [ ] **Step 1: Lint and build**

Run: `npm run lint` — expect no new errors.
Run: `npm run build` — expect success.

- [ ] **Step 2: Backend idempotency re-check**

```bash
npx convex run migrations:backfillUserBadges
```

Expected: `{"awarded":0,...}` (Task 3 already ran; nothing new owed).

- [ ] **Step 3: Manual spec checklist**

Walk the spec's verification plan end-to-end on dev data:

- [ ] Confirm attendance → badge appears in badge row immediately (atomic award).
- [ ] Post public review → review badge appears; stream gains a Review card.
- [ ] Post anonymous review → no review badge, no stream card.
- [ ] Stream shows all three kinds for a user who has them; day labels correct; newest first.
- [ ] Request flow from a stream listing card: type chooser → swap/pay modal → submit; blocking-request modal still guards; "list your formal first" prompt still appears for swap with no active swap listing.
- [ ] Me tab (embedded) renders the new anatomy; Edit works.
- [ ] Signed-out Message → login redirect with correct `next`.
- [ ] Avatar lightbox opens/closes (click + Escape).
- [ ] Badge case: locked vs earned rendering, earned-date detail line.
- [ ] Dark mode spot-check (tokens are all `var(--…)` based; no hardcoded light-only colours).

- [ ] **Step 4: Final commit (only if fixes were needed)**

```bash
git add -A
git commit -m "FIX: Profile revamp verification fixes"
```

---

## Deployment note (post-merge)

After this lands on the deployed branch: push schema (`npx convex dev` / deploy), then run `npx convex run migrations:backfillUserBadges` **once** against production to award historical badges.
