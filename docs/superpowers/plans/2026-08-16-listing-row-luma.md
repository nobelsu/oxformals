# Listing Row (Luma-style day rail) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the `ListingCard` grid box with a wide row grouped by day under a Luma-style left date rail, across all four consumers.

**Architecture:** Grouping and the rail live in a container (`ListingDayList`); the row (`ListingRow`) is presentational and receives the same props today's card does. Consumers keep their own handlers and pass a render callback. Pure date/grouping logic lives in `lib/data` and is unit-tested with `node:test`.

**Tech Stack:** Next.js 16 (App Router, React 19), TypeScript, Tailwind v4 with CSS custom properties, roughjs for sketch accents, `node:test` run via `npx tsx --test`.

**Spec:** `docs/superpowers/specs/2026-08-16-listing-row-luma-design.md`

## Global Constraints

- Files under `lib/data/` import siblings **relatively** (`./format`, `./types`), never via the `@/` alias. Components use `@/...` alias imports.
- Tests run with `npx tsx --test <file>`. Plain `node --test` fails on this repo's extensionless TS imports. Do not add a `test` script or new devDependency.
- Colors come from CSS custom properties only: `--ink`, `--ink-muted`, `--ink-soft`, `--paper`, `--bg`, `--accent`, `--accent-hover`, `--tag`, `--tag-ink`. No hardcoded hex.
- Client components need the `"use client"` directive on line 1.
- The `Listing` type is in active flux: read only the fields listed in `lib/data/types.ts` and treat `price`, `menu`, `menuPdfUrl`, `menuFileContentType`, `message` as possibly absent/empty.
- Commit after every task. Branch is `revival`; do not merge or push.
- Verify TypeScript with `npx tsc --noEmit` and lint with `npm run lint` before each commit.

---

## File Structure

**Create:**
- `lib/data/groupListingsByDay.ts` — pure grouping/sorting of listings into day buckets.
- `lib/data/groupListingsByDay.test.ts` — its unit tests.
- `components/ui/SketchDot.tsx` — roughjs circle marker, one per day group.
- `components/swap/ListingRow.tsx` — the row.
- `components/swap/ListingDayList.tsx` — the rail container.

**Modify:**
- `lib/data/format.ts` — add `formatListingTime`, `formatDayLabel`, `formatListingRowMeta`; refactor `formatListingDate` and `formatListingMetaLine` to reuse them.
- `lib/data/format.test.ts` — create (does not exist yet) for the new helpers.
- `components/swap/BrowseTab.tsx:488-509` — grid → `ListingDayList`.
- `components/colleges/CollegeListingsSection.tsx:149-173` — grid → `ListingDayList`, `hideCollege` → `title`.
- `components/swap/ProfileView.tsx:528-551` — grid → `ListingDayList`.
- `components/swap/NewRequestPicker.tsx:35-58` — grid → `ListingDayList`.

**Delete:**
- `components/swap/ListingCard.tsx` — after the last consumer moves (Task 7).

---

### Task 1: Date/meta format helpers

**Files:**
- Modify: `lib/data/format.ts`
- Test: `lib/data/format.test.ts` (create)

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces:
  - `formatListingTime(iso: string): string` → `"7:15pm"`, `"7pm"` on the hour.
  - `formatDayLabel(iso: string): { day: string; weekday: string }` → `{ day: "16 Aug", weekday: "Saturday" }`.
  - `formatListingRowMeta(args: { groupSize: number; seatsAvailable: number; isPast: boolean; price?: number }): string` → `"Group of 4 · 2 seats left · £28"`.

- [ ] **Step 1: Write the failing test**

Create `lib/data/format.test.ts`:

```ts
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  formatDayLabel,
  formatListingDate,
  formatListingMetaLine,
  formatListingRowMeta,
  formatListingTime,
} from "./format";

describe("formatListingTime", () => {
  it("drops :00 on the hour", () => {
    assert.equal(formatListingTime("2026-05-08T19:00:00"), "7pm");
  });

  it("keeps minutes otherwise", () => {
    assert.equal(formatListingTime("2026-05-08T19:15:00"), "7:15pm");
  });

  it("renders midnight and noon", () => {
    assert.equal(formatListingTime("2026-05-08T00:30:00"), "12:30am");
    assert.equal(formatListingTime("2026-05-08T12:00:00"), "12pm");
  });
});

describe("formatDayLabel", () => {
  it("splits day and weekday", () => {
    assert.deepEqual(formatDayLabel("2026-05-08T19:00:00"), {
      day: "8 May",
      weekday: "Friday",
    });
  });
});

describe("formatListingRowMeta", () => {
  it("omits the date and keeps group, seats, price", () => {
    assert.equal(
      formatListingRowMeta({
        groupSize: 4,
        seatsAvailable: 2,
        isPast: false,
        price: 28,
      }),
      "Group of 4 · 2 seats left · £28",
    );
  });

  it("drops seats when past and price when absent", () => {
    assert.equal(
      formatListingRowMeta({ groupSize: 3, seatsAvailable: 1, isPast: true }),
      "Group of 3",
    );
  });

  it("says group full at zero seats", () => {
    assert.equal(
      formatListingRowMeta({ groupSize: 2, seatsAvailable: 0, isPast: false }),
      "Group of 2 · Group full",
    );
  });
});

describe("existing formatters still behave", () => {
  it("formatListingDate keeps day and time", () => {
    assert.equal(formatListingDate("2026-05-08T19:15:00"), "Fri 8 May · 7:15pm");
  });

  it("formatListingMetaLine still leads with the date", () => {
    assert.equal(
      formatListingMetaLine({
        dateTime: "2026-05-08T19:15:00",
        groupSize: 4,
        seatsAvailable: 2,
        isPast: false,
        price: 28,
      }),
      "Fri 8 May · 7:15pm · Group of 4 · 2 seats left · £28",
    );
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx tsx --test lib/data/format.test.ts`
Expected: FAIL — `formatListingTime`, `formatDayLabel`, `formatListingRowMeta` are not exported.

- [ ] **Step 3: Write minimal implementation**

In `lib/data/format.ts`, replace the existing `formatListingMetaLine` and `formatListingDate` block with:

```ts
/** `Group of 3 · 2 seats left · £28` — no date; the day rail carries it. */
export function formatListingRowMeta(args: {
  groupSize: number;
  seatsAvailable: number;
  isPast: boolean;
  price?: number;
}): string {
  const parts: string[] = [`Group of ${args.groupSize}`];
  const seats = formatListingSeatsSuffix(args.seatsAvailable, args.isPast);
  if (seats) parts.push(seats);
  if (args.price !== undefined) parts.push(formatPrice(args.price));
  return parts.join(" · ");
}

/** `Thu 8 May · 7:15pm · Group of 3 · …` — drops seat availability for past formals. */
export function formatListingMetaLine(args: {
  dateTime: string;
  groupSize: number;
  seatsAvailable: number;
  isPast: boolean;
  price?: number;
}): string {
  return `${formatListingDate(args.dateTime)} · ${formatListingRowMeta(args)}`;
}

/** `7:15pm`, or `7pm` on the hour. */
export function formatListingTime(iso: string): string {
  const d = new Date(iso);
  let hours = d.getHours();
  const minutes = d.getMinutes().toString().padStart(2, "0");
  const suffix = hours >= 12 ? "pm" : "am";
  hours = hours % 12 || 12;
  return minutes === "00" ? `${hours}${suffix}` : `${hours}:${minutes}${suffix}`;
}

/** `{ day: "8 May", weekday: "Friday" }` for the day rail. */
export function formatDayLabel(iso: string): { day: string; weekday: string } {
  const d = new Date(iso);
  return {
    day: new Intl.DateTimeFormat("en-GB", {
      day: "numeric",
      month: "short",
    }).format(d),
    weekday: new Intl.DateTimeFormat("en-GB", { weekday: "long" }).format(d),
  };
}

// "Thu 8 May · 7:15pm"
export function formatListingDate(iso: string): string {
  const day = new Intl.DateTimeFormat("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
  }).format(new Date(iso));
  return `${day} · ${formatListingTime(iso)}`;
}
```

Keep `formatListingStatusLabel`, `formatListingSeatsSuffix`, `formatShortDate`, `isoToLocalDateKey`, `formatRelativeTime`, `ordinalSuffix`, `formatPrice`, and `formatYearLabel` exactly as they are.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx tsx --test lib/data/format.test.ts`
Expected: PASS, 9 tests.

- [ ] **Step 5: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add lib/data/format.ts lib/data/format.test.ts
git commit -m "FEAT: Date and meta helpers for listing rows"
```

---

### Task 2: Group listings by day

**Files:**
- Create: `lib/data/groupListingsByDay.ts`
- Test: `lib/data/groupListingsByDay.test.ts`

**Interfaces:**
- Consumes: `isoToLocalDateKey` from `./format`; `Listing` from `./types`.
- Produces:
  - `type ListingDayGroup = { dateKey: string; dateTime: string; listings: Listing[] }`
  - `groupListingsByDay(listings: Listing[]): ListingDayGroup[]`

- [ ] **Step 1: Write the failing test**

Create `lib/data/groupListingsByDay.test.ts`:

```ts
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { groupListingsByDay } from "./groupListingsByDay";
import type { Listing } from "./types";

function listing(id: string, dateTime: string): Listing {
  return {
    id,
    ownerUserId: "u1",
    college: "Balliol",
    dateTime,
    groupSize: 4,
    seatsAvailable: 2,
    members: [],
    year: "2",
    role: "PPE",
    message: "",
    menu: "",
    listingType: "swap",
    status: "active",
    createdAt: 0,
  };
}

describe("groupListingsByDay", () => {
  it("returns an empty array for no listings", () => {
    assert.deepEqual(groupListingsByDay([]), []);
  });

  it("buckets same-day listings into one group", () => {
    const groups = groupListingsByDay([
      listing("a", "2026-05-08T19:00:00"),
      listing("b", "2026-05-08T21:30:00"),
    ]);
    assert.equal(groups.length, 1);
    assert.equal(groups[0].dateKey, "2026-05-08");
    assert.deepEqual(
      groups[0].listings.map((l) => l.id),
      ["a", "b"],
    );
  });

  it("sorts groups and listings ascending regardless of input order", () => {
    const groups = groupListingsByDay([
      listing("late", "2026-05-09T18:00:00"),
      listing("second", "2026-05-08T21:00:00"),
      listing("first", "2026-05-08T19:00:00"),
    ]);
    assert.deepEqual(
      groups.map((g) => g.dateKey),
      ["2026-05-08", "2026-05-09"],
    );
    assert.deepEqual(
      groups[0].listings.map((l) => l.id),
      ["first", "second"],
    );
  });

  it("uses the earliest listing of the day as the group dateTime", () => {
    const groups = groupListingsByDay([
      listing("b", "2026-05-08T21:30:00"),
      listing("a", "2026-05-08T19:00:00"),
    ]);
    assert.equal(groups[0].dateTime, "2026-05-08T19:00:00");
  });

  it("splits local days that share a UTC day", () => {
    // 23:30 on the 8th and 00:30 on the 9th, local time.
    const groups = groupListingsByDay([
      listing("a", "2026-05-08T23:30:00"),
      listing("b", "2026-05-09T00:30:00"),
    ]);
    assert.deepEqual(
      groups.map((g) => g.dateKey),
      ["2026-05-08", "2026-05-09"],
    );
  });

  it("does not mutate the input array", () => {
    const input = [
      listing("late", "2026-05-09T18:00:00"),
      listing("early", "2026-05-08T19:00:00"),
    ];
    groupListingsByDay(input);
    assert.deepEqual(
      input.map((l) => l.id),
      ["late", "early"],
    );
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx tsx --test lib/data/groupListingsByDay.test.ts`
Expected: FAIL — cannot find module `./groupListingsByDay`.

- [ ] **Step 3: Write minimal implementation**

Create `lib/data/groupListingsByDay.ts`:

```ts
import { isoToLocalDateKey } from "./format";
import type { Listing } from "./types";

export type ListingDayGroup = {
  /** `YYYY-MM-DD` in the viewer's local timezone. */
  dateKey: string;
  /** ISO of the earliest listing that day — the rail's label source. */
  dateTime: string;
  listings: Listing[];
};

/**
 * Buckets listings into ascending local-day groups. Sorts internally rather
 * than trusting callers: not every consumer hands us an ordered list.
 */
export function groupListingsByDay(listings: Listing[]): ListingDayGroup[] {
  const sorted = [...listings].sort(
    (a, b) => Date.parse(a.dateTime) - Date.parse(b.dateTime),
  );

  const groups: ListingDayGroup[] = [];
  const byKey = new Map<string, ListingDayGroup>();

  for (const listing of sorted) {
    const dateKey = isoToLocalDateKey(listing.dateTime);
    const existing = byKey.get(dateKey);
    if (existing) {
      existing.listings.push(listing);
      continue;
    }
    const group: ListingDayGroup = {
      dateKey,
      dateTime: listing.dateTime,
      listings: [listing],
    };
    byKey.set(dateKey, group);
    groups.push(group);
  }

  return groups;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx tsx --test lib/data/groupListingsByDay.test.ts`
Expected: PASS, 6 tests.

- [ ] **Step 5: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add lib/data/groupListingsByDay.ts lib/data/groupListingsByDay.test.ts
git commit -m "FEAT: Group listings into local day buckets"
```

---

### Task 3: Sketch dot marker

**Files:**
- Create: `components/ui/SketchDot.tsx`

**Interfaces:**
- Consumes: `roughjs` (already a dependency).
- Produces: `<SketchDot seed?: number; size?: number; className?: string />` — a hand-drawn circle, `currentColor` stroke, `--bg` fill.

There is no unit test here: it is a presentational SVG with no logic worth asserting, matching the repo's existing convention (`components/ui/SketchCard.tsx` is untested). Verification is visual, in Task 4.

- [ ] **Step 1: Write the component**

Create `components/ui/SketchDot.tsx`:

```tsx
"use client";

import rough from "roughjs";
import { useEffect, useRef } from "react";

type Props = {
  /** Stable per day group so the wobble does not change between renders. */
  seed?: number;
  /** Box size in px. */
  size?: number;
  className?: string;
};

/**
 * Hand-drawn circle used as the day marker on the listing rail. One instance
 * per day group, never per row — roughjs redraws on every resize tick.
 */
export function SketchDot({ seed = 1, size = 14, className = "" }: Props) {
  const svgRef = useRef<SVGSVGElement | null>(null);

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;

    while (svg.firstChild) svg.removeChild(svg.firstChild);

    const rc = rough.svg(svg);
    svg.appendChild(
      rc.circle(size / 2, size / 2, size - 4, {
        stroke: "currentColor",
        strokeWidth: 2,
        roughness: 1.6,
        bowing: 1.4,
        seed: Math.abs(seed) || 1,
        fill: "var(--bg)",
        fillStyle: "solid",
      }),
    );
  }, [seed, size]);

  return (
    <svg
      ref={svgRef}
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className={className}
      aria-hidden
    />
  );
}
```

- [ ] **Step 2: Typecheck and lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add components/ui/SketchDot.tsx
git commit -m "FEAT: Hand-drawn dot marker for the listing rail"
```

---

### Task 4: ListingRow

**Files:**
- Create: `components/swap/ListingRow.tsx`

**Interfaces:**
- Consumes: `formatListingTime`, `formatListingRowMeta`, `formatYearLabel` from `@/lib/data/format`; `listingIsPast` from `@/lib/data/collegeReviewEligibility`; `useNowMs` from `@/lib/hooks/useNowMs`; `listingRequestCta` from `@/lib/data/listingType`; existing `Avatar`, `Chip`, `ListingMenu`, `ListingTypeTag`, `ListingStatusTag`.
- Produces: `<ListingRow />` with props:

```ts
type Props = {
  listing: Listing;
  owner: User;
  memberUsers?: User[];
  onRequest?: () => void;
  onPress?: () => void;
  disabled?: boolean;
  disabledLabel?: string;
  hideInterests?: boolean;
  /** Headline override — the college page uses the host's name instead. */
  title?: string;
  requestLabel?: string;
};
```

Note the prop list is that of `ListingCard` with `hideCollege` removed and `title` added.

- [ ] **Step 1: Write the component**

Create `components/swap/ListingRow.tsx`:

```tsx
"use client";

import Link from "next/link";
import { Avatar } from "@/components/ui/Avatar";
import { Chip } from "@/components/ui/Chip";
import type { User } from "@/lib/auth/types";
import {
  formatListingRowMeta,
  formatListingTime,
  formatYearLabel,
} from "@/lib/data/format";
import type { Listing } from "@/lib/data/types";
import { listingIsPast } from "@/lib/data/collegeReviewEligibility";
import { listingRequestCta } from "@/lib/data/listingType";
import { useNowMs } from "@/lib/hooks/useNowMs";
import { ListingMenu } from "@/components/swap/ListingMenu";
import { ListingStatusTag } from "@/components/swap/ListingStatusTag";
import { ListingTypeTag } from "@/components/swap/ListingTypeTag";

type Props = {
  listing: Listing;
  owner: User;
  memberUsers?: User[];
  onRequest?: () => void;
  onPress?: () => void;
  disabled?: boolean;
  disabledLabel?: string;
  hideInterests?: boolean;
  /** Headline override — the college page uses the host's name instead. */
  title?: string;
  requestLabel?: string;
};

export function ListingRow({
  listing,
  owner,
  memberUsers = [],
  onRequest,
  onPress,
  disabled,
  disabledLabel,
  hideInterests,
  title,
  requestLabel,
}: Props) {
  const nowMs = useNowMs();
  const isPast = listingIsPast(listing.dateTime, nowMs);
  const ctaLabel = requestLabel ?? listingRequestCta(listing.listingType);

  const profileLine = [
    formatYearLabel(owner.year) || owner.year || formatYearLabel(listing.year) || listing.year,
    owner.role || listing.role,
  ]
    .filter(Boolean)
    .join(" · ");

  const showStatusInsteadOfCta =
    listing.status === "expired" ||
    listing.status === "confirmed" ||
    listing.status === "closed";

  return (
    <div
      role={onPress ? "button" : undefined}
      tabIndex={onPress ? 0 : undefined}
      onClick={onPress}
      onKeyDown={
        onPress
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onPress();
              }
            }
          : undefined
      }
      className={`flex flex-col gap-3 py-4 sm:flex-row sm:items-start sm:gap-4${
        onPress
          ? " cursor-pointer transition-colors hover:bg-[color-mix(in_srgb,var(--paper)_70%,transparent)]"
          : ""
      }`}
    >
      <div className="shrink-0 pt-0.5 text-[0.95rem] text-[var(--ink-muted)] sm:w-[4.5rem]">
        {formatListingTime(listing.dateTime)}
      </div>

      <div className="min-w-0 flex-1">
        <h3 className="break-words font-display text-[1.4rem] uppercase leading-tight tracking-wide sm:text-[1.65rem]">
          {title ?? listing.college}
        </h3>

        <div className="mt-1 text-[0.9rem] text-[var(--ink-muted)]">
          {formatListingRowMeta({
            groupSize: listing.groupSize,
            seatsAvailable: listing.seatsAvailable,
            isPast,
            price: listing.price,
          })}
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-2">
          <Link
            href={`/profile/${owner.id}`}
            onClick={(e) => e.stopPropagation()}
            className="flex items-center gap-2 hover:underline"
          >
            <Avatar name={owner.name} size="sm" source={owner.avatar} />
            <span className="text-[0.95rem]">{owner.name.split(" ")[0]}</span>
          </Link>
          {profileLine ? (
            <span className="text-[0.85rem] text-[var(--ink-soft)]">
              {profileLine}
            </span>
          ) : null}
          {memberUsers.length > 0 ? (
            <span className="flex items-center gap-1.5">
              <span className="text-[0.8rem] text-[var(--ink-soft)]">with</span>
              <span className="flex flex-wrap -space-x-1.5">
                {memberUsers.map((m) => (
                  <Link
                    key={m.id}
                    href={`/profile/${m.id}`}
                    title={m.name}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Avatar name={m.name} size="sm" source={m.avatar} />
                  </Link>
                ))}
              </span>
            </span>
          ) : null}
        </div>

        <ListingMenu
          menu={listing.menu}
          menuPdfUrl={listing.menuPdfUrl}
          menuFileContentType={listing.menuFileContentType}
          className="mt-2 break-words text-pretty text-[0.9rem] text-[var(--ink-muted)]"
          textClassName="line-clamp-2"
          imageClassName="mt-1 max-h-24 max-w-full rounded-[12px] border-[2px] border-[var(--ink)] object-contain"
        />

        {listing.message ? (
          <p className="mt-2 line-clamp-2 break-words text-pretty text-[0.9rem] italic text-[var(--ink-muted)]">
            &ldquo;{listing.message}&rdquo;
          </p>
        ) : null}

        {!hideInterests && owner.interests.length > 0 ? (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {owner.interests.map((tag) => (
              <Chip key={tag} size="sm" as="span" className="!text-[0.65rem]">
                {tag}
              </Chip>
            ))}
          </div>
        ) : null}
      </div>

      <div
        className="flex shrink-0 flex-row items-center gap-2 sm:flex-col sm:items-end"
        onClick={(e) => e.stopPropagation()}
      >
        <ListingTypeTag listingType={listing.listingType} />
        {showStatusInsteadOfCta ? (
          <ListingStatusTag
            status={listing.status}
            seatsAvailable={listing.seatsAvailable}
            size="sm"
          />
        ) : disabled ? (
          <button
            type="button"
            disabled
            className="cursor-not-allowed whitespace-nowrap rounded-full border-[2px] border-[var(--ink)] bg-[color-mix(in_srgb,var(--accent)_50%,var(--bg))] px-5 py-2 text-[0.75rem] text-white opacity-70"
          >
            {disabledLabel ?? ctaLabel}
          </button>
        ) : onRequest ? (
          <button
            type="button"
            onClick={onRequest}
            className="whitespace-nowrap rounded-full bg-[var(--accent)] px-5 py-2 text-[0.75rem] text-white transition-colors hover:bg-[var(--accent-hover)]"
          >
            {ctaLabel}
          </button>
        ) : null}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Typecheck and lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: no errors.

If `owner.avatar`, `owner.interests`, or `owner.year` do not exist on `User`, read `lib/auth/types.ts` and use the actual field names — do not add optional chaining to paper over a wrong name.

- [ ] **Step 3: Commit**

```bash
git add components/swap/ListingRow.tsx
git commit -m "FEAT: Listing row component"
```

---

### Task 5: ListingDayList

**Files:**
- Create: `components/swap/ListingDayList.tsx`

**Interfaces:**
- Consumes: `groupListingsByDay` and `ListingDayGroup` from `@/lib/data/groupListingsByDay`; `formatDayLabel` from `@/lib/data/format`; `SketchDot` from `@/components/ui/SketchDot`; `seedFrom` from `@/components/ui/SketchCard`.
- Produces:

```ts
type Props = {
  listings: Listing[];
  renderRow: (listing: Listing) => ReactNode;
  className?: string;
};
```

Rendering contract: a `<section>` per day (labelled for screen readers), rows in a `<ul>`/`<li>`, dashed hairline between rows within a day.

- [ ] **Step 1: Write the component**

Create `components/swap/ListingDayList.tsx`:

```tsx
"use client";

import type { ReactNode } from "react";
import { SketchDot } from "@/components/ui/SketchDot";
import { seedFrom } from "@/components/ui/SketchCard";
import { formatDayLabel } from "@/lib/data/format";
import { groupListingsByDay } from "@/lib/data/groupListingsByDay";
import type { Listing } from "@/lib/data/types";
import { useNowMs } from "@/lib/hooks/useNowMs";

type Props = {
  listings: Listing[];
  renderRow: (listing: Listing) => ReactNode;
  className?: string;
};

/**
 * Luma-style day rail: the date is stated once per day in the left gutter,
 * rows carry only the time. Below `sm` the gutter collapses into a sticky
 * full-width day header.
 */
export function ListingDayList({ listings, renderRow, className = "" }: Props) {
  const nowMs = useNowMs();
  const groups = groupListingsByDay(listings);

  if (groups.length === 0) return null;

  return (
    <div className={className}>
      {groups.map((group) => {
        const { day, weekday } = formatDayLabel(group.dateTime);
        const isPastDay = Date.parse(group.dateTime) < nowMs;
        const dayInk = isPastDay ? "text-[var(--ink-soft)]" : "text-[var(--ink)]";

        return (
          <section
            key={group.dateKey}
            aria-label={`${weekday} ${day}`}
            className="sm:grid sm:grid-cols-[6rem_1fr]"
          >
            <div
              className={`sticky top-[var(--app-nav-height)] z-[2] bg-[var(--bg)] py-3 sm:static sm:bg-transparent sm:pr-3 sm:pt-5 ${dayInk}`}
            >
              <div className="flex items-baseline gap-2 sm:block">
                <div className="font-display text-[1.15rem] leading-tight">
                  {day}
                </div>
                <div className="text-[0.85rem] text-[var(--ink-soft)]">
                  {weekday}
                </div>
              </div>
            </div>

            <div className="relative sm:border-l-2 sm:border-dashed sm:border-[color-mix(in_srgb,var(--ink)_28%,transparent)] sm:pl-6">
              <span
                className={`pointer-events-none absolute left-[-8px] top-6 hidden sm:block ${dayInk}`}
              >
                <SketchDot seed={seedFrom(group.dateKey)} />
              </span>

              <ul>
                {group.listings.map((listing, index) => (
                  <li
                    key={listing.id}
                    className={
                      index === 0
                        ? ""
                        : "border-t border-dashed border-[color-mix(in_srgb,var(--ink)_18%,transparent)]"
                    }
                  >
                    {renderRow(listing)}
                  </li>
                ))}
              </ul>
            </div>
          </section>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 2: Typecheck and lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add components/swap/ListingDayList.tsx
git commit -m "FEAT: Day rail container for listing rows"
```

---

### Task 6: Move BrowseTab onto the rail

**Files:**
- Modify: `components/swap/BrowseTab.tsx:488-509`

**Interfaces:**
- Consumes: `ListingDayList` (Task 5), `ListingRow` (Task 4).
- Produces: nothing new.

- [ ] **Step 1: Swap the import**

In `components/swap/BrowseTab.tsx`, replace:

```tsx
import { ListingCard } from "./ListingCard";
```

with:

```tsx
import { ListingDayList } from "./ListingDayList";
import { ListingRow } from "./ListingRow";
```

- [ ] **Step 2: Replace the grid**

Replace the `<div className="grid grid-cols-1 items-stretch gap-4 sm:grid-cols-2 lg:grid-cols-3">` block (and its closing `</div>`) with:

```tsx
<ListingDayList
  listings={browseListings}
  renderRow={(l) => {
    const owner = getUser(l.ownerUserId);
    if (!owner) return null;
    const members = (l.members ?? [])
      .filter((mid) => mid !== l.ownerUserId)
      .map(getUser)
      .filter((u): u is NonNullable<typeof u> => !!u);
    return (
      <ListingRow
        listing={l}
        owner={owner}
        memberUsers={members}
        onPress={() => setDetailListing(l)}
        onRequest={() => handleRequestClick(l)}
        disabled={!isAuthenticated}
        disabledLabel={isAuthenticated ? undefined : "Sign in to request"}
      />
    );
  }}
/>
```

Keep the surrounding `<div data-browse-listings …>` full-bleed wrapper exactly as it is. Drop the `key` prop — `ListingDayList` keys the `<li>` by `listing.id`.

- [ ] **Step 3: Typecheck and lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: no errors.

- [ ] **Step 4: Verify in the browser**

Run: `npm run dev`, open the browse tab.
Expected: listings grouped under day headers with a dotted rail; clicking a row opens the detail modal; the Request button does not also open the modal; on a narrow window the day header sticks to the top and the CTA sits below the body.

- [ ] **Step 5: Commit**

```bash
git add components/swap/BrowseTab.tsx
git commit -m "FEAT: Browse tab uses the day rail"
```

---

### Task 7: Move the remaining three consumers and delete ListingCard

**Files:**
- Modify: `components/colleges/CollegeListingsSection.tsx:149-173`
- Modify: `components/swap/ProfileView.tsx:528-551`
- Modify: `components/swap/NewRequestPicker.tsx:35-58`
- Delete: `components/swap/ListingCard.tsx`

**Interfaces:**
- Consumes: `ListingDayList` (Task 5), `ListingRow` (Task 4).
- Produces: nothing new.

- [ ] **Step 1: CollegeListingsSection**

Replace the `import { ListingCard } from "@/components/swap/ListingCard";` line with:

```tsx
import { ListingDayList } from "@/components/swap/ListingDayList";
import { ListingRow } from "@/components/swap/ListingRow";
```

Replace the `<div className="grid grid-cols-1 items-stretch gap-4 md:grid-cols-2">` block (and its closing `</div>`) with:

```tsx
<ListingDayList
  listings={openListings}
  renderRow={(l) => {
    const owner = getUser(l.ownerUserId);
    if (!owner) return null;
    const members = l.members
      .filter((mid) => mid !== l.ownerUserId)
      .map(getUser)
      .filter((u): u is NonNullable<typeof u> => !!u);
    return (
      <ListingRow
        listing={l}
        owner={owner}
        memberUsers={members}
        title={`${owner.name.split(" ")[0]}’s table`}
        onPress={() => setDetailListing(l)}
        onRequest={() => handleRequestClick(l)}
        disabled={listingDisabled}
        hideInterests
        disabledLabel={!isAuthenticated ? "Sign in to request" : undefined}
      />
    );
  }}
/>
```

The `title` override exists because every listing on this page is the same college: the headline would otherwise repeat the page title, and the date already lives in the rail.

- [ ] **Step 2: ProfileView**

Replace `import { ListingCard } from "@/components/swap/ListingCard";` with:

```tsx
import { ListingDayList } from "@/components/swap/ListingDayList";
import { ListingRow } from "@/components/swap/ListingRow";
```

Replace the `<div className="mt-4 grid grid-cols-1 items-stretch gap-4 sm:grid-cols-2 lg:grid-cols-3">` block (and its closing `</div>`) with:

```tsx
<ListingDayList
  className="mt-4"
  listings={activeListings}
  renderRow={(l) => {
    const members = l.members
      .filter((mid) => mid !== l.ownerUserId)
      .map(getUser)
      .filter((u): u is NonNullable<typeof u> => !!u);
    return (
      <ListingRow
        listing={l}
        owner={ownerAsUser}
        memberUsers={members}
        onPress={() => setDetailListing(l)}
        onRequest={isOwnProfile ? undefined : () => handleRequestClick(l)}
        disabled={listingDisabled}
        hideInterests
        disabledLabel={
          isOwnProfile
            ? "Your listing"
            : !isAuthenticated
              ? "Sign in to request"
              : undefined
        }
      />
    );
  }}
/>
```

- [ ] **Step 3: NewRequestPicker**

Replace `import { ListingCard } from "./ListingCard";` with:

```tsx
import { ListingDayList } from "./ListingDayList";
import { ListingRow } from "./ListingRow";
```

Replace the whole `<div className={\`grid items-stretch gap-4 …\`}>` block (and its closing `</div>`) with:

```tsx
<ListingDayList
  listings={listings}
  renderRow={(l) => {
    const owner = getUser(l.ownerUserId);
    if (!owner) return null;
    return (
      <ListingRow listing={l} owner={owner} onRequest={() => onSelect(l)} />
    );
  }}
/>
```

- [ ] **Step 4: Delete the old card**

```bash
git rm components/swap/ListingCard.tsx
```

- [ ] **Step 5: Confirm nothing still imports it**

Run: `grep -rn "ListingCard" --include="*.tsx" --include="*.ts" app components lib`
Expected: only `MyListingCard` matches. No hit for `swap/ListingCard`.

- [ ] **Step 6: Typecheck, lint, and run the full test suite**

Run: `npx tsc --noEmit && npm run lint && npx tsx --test lib/data/*.test.ts`
Expected: no errors; all tests pass.

- [ ] **Step 7: Verify in the browser**

Run: `npm run dev` and check:
- `/college/<slug>` — headline reads `<Name>'s table`, no interest chips, day rail present.
- `/profile/<id>` — own profile shows "Your listing" disabled CTA; another user's shows a live CTA.
- New-request picker modal — rows grouped by day, day labels stick inside the modal body while scrolling.

- [ ] **Step 8: Commit**

```bash
git add -A components/colleges/CollegeListingsSection.tsx components/swap/ProfileView.tsx components/swap/NewRequestPicker.tsx components/swap/ListingCard.tsx
git commit -m "FEAT: Remaining listing surfaces use the day rail; drop ListingCard"
```

---

## Self-Review Notes

Spec coverage: grouping helper (T2), format helpers (T1), row anatomy incl. rich content and title override (T4, T7), rail container with sticky label, mobile collapse, past-day dimming, a11y sections/lists (T5), sketch accent as one dot per group (T3, T5), all four consumer migrations and `ListingCard` deletion (T6, T7), `node:test` coverage for pure logic (T1, T2). `ListingDetailModal`, `MyListingCard`, `MyListingsSection`, and `AttendedFormalsSection` are untouched, as the spec requires.
