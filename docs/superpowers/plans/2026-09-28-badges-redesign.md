# Badges Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace emoji badges with hand-drawn medals and college stamps, show progress, and celebrate newly earned badges (picks 1A, 2B, 3A, 4A, 5A + 5B).

**Architecture:** Badge definitions keep their ids but swap `icon` (emoji) for an `icon` key into a small SVG icon set; college badges get a stamp label. Shared art lives in `components/badges/BadgeArt.tsx`. The backend adds `getBadgeProgress`, an unseen-badges query plus `markBadgesSeen` (via `users.badgesSeenAt`), and a badge share card. A `BadgeCelebration` component mounted for signed-in users shows a toast for milestones and a stamp pop-up (with Share to story) for colleges.

**Tech Stack:** Convex, Next.js 16, next/og share cards (from the share-cards work), vitest + convex-test.

## Global Constraints

- Earned medal: `--accent-wash` disc, 2px `--ink` border, `3px 3px 0 var(--ink)` shadow, ink line icon. Locked: 2px border at 22% ink, icon at 28% ink.
- Earned stamp: `--accent` double ring rotated −7°..+7° (stable per college), Schoolbell label. Locked: dashed 20%-ink ring.
- 1A: profile shows up to 3 earned medals (most recent first) and "+N"; nothing when none are earned.
- 2B: two ladders, Formals (1, 5, 10, 25) and Reviews (1, 5, 10), each with its current count.
- 4A: detail card — earned: name, description, "earned {d MMM yyyy}"; locked milestone: "{n} more {formals|reviews} to go" + progress bar; locked college: "Attend a formal at {college}".
- 5A/5B: only badges earned after `badgesSeenAt` celebrate; a user with no `badgesSeenAt` gets a baseline of now (no backlog of celebrations).
- Stamp labels: overrides BNC, LMH, SEH, CCC, CHCH, NEW, GTC, HMC, ASC, CAM, SAN, SAT, CATZ, SCR, SHI, SHU, SJC, SPC, QUE, RPC, UNIV, WYC; otherwise first three letters, upper-case.

### Task 1: Backend (`convex/badges.ts`, schema) + tests
- `users.badgesSeenAt?: number`.
- `getBadgeProgress({ userId })` → `{ formals, reviews }` from `collectBadgeInputs`.
- `getMyNewBadges({})` → `{ needsBaseline: boolean; badges: { badgeId, earnedAt }[] }` (earned after `badgesSeenAt`, oldest first).
- `markBadgesSeen({ upTo: number })` → sets `badgesSeenAt = max(current, upTo)`.
- `share.getBadgeShareCard({ userId, badgeId })` → `{ firstName, badgeId, collegesVisited, totalColleges } | null` (null unless the user holds the badge).
- Tests in `convex/badges.test.ts`.

### Task 2: Art + definitions
- `lib/data/badges.ts`: `icon` becomes a `BadgeIconId` ("glass", "cap", "candle", "crown", "star", "pen", "trophy", "college"); export `stampLabel(college)`.
- `components/badges/BadgeArt.tsx`: `BadgeIcon`, `Medal`, `Stamp`, `BadgeArt` (picks Medal or Stamp from the definition).

### Task 3: Profile (1A) and badge case (2B, 3A, 4A)
- `ProfileView.tsx` header: earned medals/stamps (max 3) + "+N"; hidden when none.
- `BadgeCaseModal.tsx`: rewrite with ladders, stamp grid, detail card; takes `progress`.

### Task 4: Celebration (5A, 5B) + badge share card
- `components/badges/BadgeCelebration.tsx` mounted in `app/layout.tsx` inside the auth provider: queries `getMyNewBadges`; baseline when needed; queue shows milestones as a toast (auto-dismiss 5s) and colleges as a pop-up with "Share to story"; `markBadgesSeen(earnedAt)` as each is dismissed.
- `app/api/share/badge/[id]/route.tsx` (`id = "{userId}~{badgeId}"`) and a `BadgeCard` layout: "{First name} stamped {College}" / "{n} of 43 colleges".
- `ShareKind` gains `"badge"`.
