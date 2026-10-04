# Beli-style Profile Revamp + Badge System — Design

**Date:** 2026-08-21
**Status:** Approved design (brainstorm session)
**Branch target:** `revival`

## Summary

Rebuild `ProfileView` from today's single sketch-card + two-tab layout into a
Beli-style profile: a compact left-aligned header with an inline stat strip and
a badge row, above one mixed **Activity stream** that interleaves listings,
attended formals and public reviews newest-first. This requires a new badge
system (stored awards) and a merged profile-activity query.

## Decisions locked during brainstorm

1. **Full Beli anatomy** — content restructure, not just a reskin.
2. **Left-aligned compact header** (not centred hero, not cover band).
3. **Stat strip:** active listings · reviews posted · formals attended.
   Colleges-visited becomes a **badge display** instead of a stat.
4. **Single mixed activity stream** — no tabs. Rows tagged Listing /
   Attended / Review.
5. **Attendance history is public** to everyone, consistent with listings
   and reviews already being public.
6. **Badge backend: stored awards table**, written by mutations at award
   time (user chose this over computed-on-read for cheap reads and future
   non-derivable badges). Backfill required for existing users.
7. **Both badge families launch:** milestone tiers + college collection.

## Page anatomy

### Header (left-aligned compact)

- Avatar (56px-class) left → tap opens the existing avatar lightbox unchanged.
- Name in Schoolbell display face; below it the muted identity line:
  `college · year · role` (existing `formatYearLabel` logic).
- Right side: **Edit** button on own profile (existing `onEditProfile` /
  `/?tab=mine&edit=1` behaviour preserved), **Message** otherwise (existing
  `MessageUserButton` + signed-out login redirect).
- Below name row: socials as quiet pill chips (Instagram, WhatsApp) — same
  hrefs/rel as today.
- Dietary requirements and subject remain muted lines under the socials.

### Stat strip

Inline row under the header: `2 active · 7 reviews · 23 formals`.
The active-listings numeral uses the rose accent (`--accent`) since it is the
actionable number. Counts come from the activity query (below).

### Badge row and badge case

- A horizontal row of earned badge circles followed by a muted
  `3 of 50 ›` affordance. Tapping opens the badge-case modal.
- **Badge case modal:** sections *Milestones* and *Colleges*; earned badges
  full-colour circles, unearned shown locked (dashed, dimmed) with their name
  — names of locked badges are visible so users know what to chase. Tapping an
  earned badge shows its description and earned date ("earned 8 Feb 2026").

### Activity stream

- One list titled **Activity**, newest-first, grouped under Schoolbell day
  labels ("Today", then dates).
- Card style matches the browse feed's card variant
  (rounded ~18–26px, hairline border, soft shadow, hover lift on desktop).
- Every card carries a header row: kind pill + timestamp.
  - `LISTING` pill (ink outline): reuse ListingRow's content model — college
    headline + time, seats, listing/formal-type tags, inline CTA opening the
    existing request flow (type chooser → swap/pay modals, blocking-request
    guard, no-listing prompt, swap-confirmed modal — all preserved).
    Active listings only.
  - `ATTENDED` pill (paper fill): college headline + time; context line
    "Hosted · table of N" or "Guest" (+ price if pay). Sourced from attendance
    confirmations joined to their listing. Legacy confirmations without an
    `attended` field count as attended.
  - `REVIEW` pill (rose fill): college + star rating + comment snippet;
    public non-anonymous reviews only (same rule as
    `listPublicReviewsForUser`).
- **Empty state:** single friendly card — own profile prompts listing a
  formal; other profiles get a neutral "No activity yet".
- Loading keeps the current spinner treatment; not-found state keeps the
  existing SketchCard error card.

### Embedded use (Me tab)

`ProfileView` keeps its props (`userId`, `embedded`, `onEditProfile`); the Me
tab renders identically minus page chrome. No API change.

## Badge system

### Definitions (`convex/badges.ts`, pure data, importable client-side)

- **Milestones (7):** first formal, 5 / 10 / 25 formals attended; first
  review, 5 / 10 public reviews posted.
- **Colleges (43):** one per entry in `OXFORD_COLLEGES` (39 colleges + 4
  permanent private halls), earned by attending a formal at that college.
- Total: **50 badges**. Each definition: stable string `id`, family, name,
  icon, description, threshold/college.

### Schema addition

```
userBadges: defineTable({
  userId: v.id("users"),
  badgeId: v.string(),        // definition id from convex/badges.ts
  earnedAt: v.number(),
})
  .index("by_userId", ["userId"])
  .index("by_userId_and_badgeId", ["userId", "badgeId"]);
```

### Awarding

`awardNewBadges(ctx, userId)` in `convex/badges.ts`:

1. Read counts: attended confirmations (`by_userId` on
   `formalAttendanceConfirmations`), public review count, distinct attended
   colleges.
2. Read existing badge ids for the user (`by_userId`).
3. Insert missing awards. Idempotent — safe to call repeatedly.

Called inside the mutations that create evidence, so awarding is atomic with
the action and cannot drift:

- attendance confirmation mutation(s) in `convex/formalAttendance.ts`
- public review create/update in `convex/collegeReviews.ts`
  (anonymous reviews do not earn review-milestone badges)

`earnedAt` = server time at insert (not backdated) for live awards.

### Backfill

One-off internal mutation in `convex/migrations.ts`
(e.g. `backfillUserBadges`), following the existing idempotent pattern:

- For each user with qualifying history, compute owed badges and insert with
  derived `earnedAt`: milestone dates from the threshold-th confirmation /
  review timestamp; college dates from first attendance at that college.
- Safe to re-run; run via `npx convex run migrations:backfillUserBadges`.

### Query

`getUserBadges(userId)` returns the user's earned rows; the client merges with
the shared definitions to render both the compact row and the case modal.

## Profile activity query

New query `getProfileActivity` in a new file `convex/profileActivity.ts`
(keeps the merged-stream logic isolated from `users.ts`):

- Three indexed reads: listings `by_ownerUserId` filtered to `status === "active"`;
  attendance confirmations `by_userId`; public reviews `by_userId`.
- Merge in JS, sort newest-first (listings by creation time; attendance by
  listing date; reviews by update time), cap at latest **50** items. No
  pagination at launch — revisit when real volume demands it.
- Returns stats alongside: `{ activeCount, reviewCount, attendedCount }` so
  the header needs no extra round trip.

## Frontend components

- `components/swap/ProfileView.tsx` — rewritten around the anatomy above;
  request-flow modals, avatar lightbox, login redirects preserved verbatim.
- New: stream row variants (listing/attended/review) and `BadgeCaseModal`.
  Listing rows should reuse `ListingRow` where practical rather than fork it.
- Visual language: Manrope body, Schoolbell headlines/day labels, rose accent
  for actionable elements only, card variant styling consistent with the
  browse feed.

## Out of scope (future)

- Follow graph / social feed integration (separate four-surface work).
- Stream pagination; badge-earned notifications; badge cases on other surfaces.
- Colleges-visited stat (superseded by badges).

## Verification plan

No test framework exists in this repo, so:

- `npm run lint` and `npm run build` clean.
- Manual flows on dev data: confirm attendance → badge awarded atomically;
  post public review → badge awarded; anonymous review → no review-badge
  credit; backfill idempotent (re-run inserts nothing new); stream shows all
  three row kinds; request flow still works from a stream listing card;
  Me tab embedded render intact; signed-out Message redirect intact.
