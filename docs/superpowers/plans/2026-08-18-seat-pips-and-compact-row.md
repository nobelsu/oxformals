# Seat Pips and Compact Row Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the row's "Group of 3 · 2 seats left" prose with person-glyph seat pips, demote the time from a column to a headline suffix, and add a compact row variant so the landing hero's narrow column stops wrapping.

**Architecture:** A new presentational `SeatPips` component and a new pure `formatRowTail` helper, consumed by `ListingRow`. The compact variant is a prop on `ListingRow`; `LandingHero` adopts it and drops `ListingDayList`, which is otherwise untouched.

**Tech Stack:** Next.js 16 (App Router, React 19), TypeScript, Tailwind v4 with CSS custom properties.

**Spec:** `docs/superpowers/specs/2026-08-18-seat-pips-and-compact-row-design.md`

## Global Constraints

- Build only from existing design tokens (`--bg`, `--paper`, `--ink`, `--ink-muted`, `--ink-soft`, `--tag`, `--tag-ink`, `--accent`, `--accent-hover`, `--accent-ink`) and existing font classes. No hardcoded hex. The palette/typography revamp is pending and this work must inherit it, not pre-empt it.
- Text on `--accent` uses `text-[var(--accent-ink)]`, never `text-white`.
- `"use client"` on line 1 for client components; `@/...` alias imports outside `lib/data/`, relative imports inside it.
- **Do not change `formatListingRowMeta` or `formatListingMetaLine`.** `MyListingCard` depends on their current output, and it is out of scope.
- Do not modify `ListingDayList`, `MyListingCard`, the listings-hub components, or anything under `convex/`.
- Tests run with `npx tsx --test <file>`. No new `test` script, no new devDependency.
- Verify with `npx tsc --noEmit` and `npm run lint` before each commit. Two pre-existing `.next/types/*` typecheck errors and a lint baseline of 33 problems (19 errors, 14 warnings) exist in untouched files — add none.
- Commit on branch `revival`. Do not push, do not merge.

---

## File Structure

**Create:**
- `components/swap/SeatPips.tsx`

**Modify:**
- `lib/data/format.ts` — add `formatRowTail`
- `lib/data/format.test.ts` — cover it
- `components/swap/ListingRow.tsx` — pips, time suffix, `compact` variant
- `components/landing/LandingHero.tsx` — use `compact`, drop `ListingDayList`

---

### Task 1: `formatRowTail`

**Files:**
- Modify: `lib/data/format.ts`
- Test: `lib/data/format.test.ts`

**Interfaces:**
- Produces: `formatRowTail({ seatsAvailable, isPast, price? }): string` → `"2 left · £28"`, `"Group full"`, `"£28"`, or `""`.

- [ ] **Step 1: Write the failing test**

Append to `lib/data/format.test.ts`, and add `formatRowTail` to the existing import from `./format`:

```ts
describe("formatRowTail", () => {
  it("pairs remaining seats with price", () => {
    assert.equal(
      formatRowTail({ seatsAvailable: 2, isPast: false, price: 28 }),
      "2 left · £28",
    );
  });

  it("says group full at zero seats", () => {
    assert.equal(
      formatRowTail({ seatsAvailable: 0, isPast: false }),
      "Group full",
    );
  });

  it("omits seats entirely once past", () => {
    assert.equal(formatRowTail({ seatsAvailable: 2, isPast: true, price: 28 }), "£28");
  });

  it("returns an empty string when a past listing has no price", () => {
    assert.equal(formatRowTail({ seatsAvailable: 2, isPast: true }), "");
  });

  it("omits price when absent", () => {
    assert.equal(formatRowTail({ seatsAvailable: 1, isPast: false }), "1 left");
  });
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `npx tsx --test lib/data/format.test.ts`
Expected: FAIL — `formatRowTail` is not exported.

- [ ] **Step 3: Implement**

Add to `lib/data/format.ts`, directly after `formatListingRowMeta` (leave that function exactly as it is):

```ts
/** `2 left · £28` — the text beside the seat pips. Seats are dropped once past. */
export function formatRowTail(args: {
  seatsAvailable: number;
  isPast: boolean;
  price?: number;
}): string {
  const parts: string[] = [];
  if (!args.isPast) {
    parts.push(
      args.seatsAvailable === 0 ? "Group full" : `${args.seatsAvailable} left`,
    );
  }
  if (args.price !== undefined) parts.push(formatPrice(args.price));
  return parts.join(" · ");
}
```

- [ ] **Step 4: Run it and watch it pass**

Run: `npx tsx --test lib/data/format.test.ts`
Expected: PASS, 14 tests.

- [ ] **Step 5: Typecheck, lint, commit**

```bash
npx tsc --noEmit && npm run lint
git add lib/data/format.ts lib/data/format.test.ts
git commit -m "FEAT: Row tail helper for seat pips"
```

---

### Task 2: `SeatPips`

**Files:**
- Create: `components/swap/SeatPips.tsx`

**Interfaces:**
- Produces: `<SeatPips total={number} taken={number} className?={string} />`

No test: presentational SVG with no logic worth asserting, matching this repo's convention (`SketchCard`, `SketchDot` are likewise untested).

- [ ] **Step 1: Write it**

```tsx
type Props = {
  /** Total seats in the group — `listing.groupSize`. */
  total: number;
  /** Seats already taken — `groupSize - seatsAvailable`. */
  taken: number;
  className?: string;
};

/**
 * Filled glyph = seat taken, outline = seat free. `GroupSize` is 2–6, so the
 * pip count is bounded and always countable at a glance.
 */
export function SeatPips({ total, taken, className = "" }: Props) {
  const safeTotal = Math.max(0, Math.trunc(total));
  const safeTaken = Math.min(Math.max(0, Math.trunc(taken)), safeTotal);

  if (safeTotal === 0) return null;

  return (
    <span
      role="img"
      aria-label={`${safeTaken} of ${safeTotal} seats taken`}
      className={`inline-flex items-center gap-[3px] text-[var(--ink)] ${className}`.trim()}
    >
      {Array.from({ length: safeTotal }, (_, index) => (
        <svg
          key={index}
          viewBox="0 0 24 24"
          aria-hidden="true"
          className="h-[0.95rem] w-[0.95rem] shrink-0"
        >
          <circle
            cx="12"
            cy="7.5"
            r="4"
            fill={index < safeTaken ? "currentColor" : "none"}
            stroke="currentColor"
            strokeWidth="2"
          />
          <path
            d="M4.5 20.5c0-4.2 3.4-7 7.5-7s7.5 2.8 7.5 7"
            fill={index < safeTaken ? "currentColor" : "none"}
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      ))}
    </span>
  );
}
```

The clamping exists because `taken` is derived arithmetic (`groupSize - seatsAvailable`) and a stale or inconsistent listing must not produce a negative array length, which would throw.

- [ ] **Step 2: Typecheck, lint, commit**

```bash
npx tsc --noEmit && npm run lint
git add components/swap/SeatPips.tsx
git commit -m "FEAT: Seat pips indicator"
```

---

### Task 3: Row uses pips, time becomes a suffix

**Files:**
- Modify: `components/swap/ListingRow.tsx`

**Interfaces:**
- Consumes: `SeatPips` (Task 2), `formatRowTail` (Task 1).
- Produces: no prop changes yet — `compact` arrives in Task 4.

- [ ] **Step 1: Swap the imports**

Replace the `formatListingRowMeta` import with `formatRowTail`, keep `formatListingTime`, and add:

```tsx
import { SeatPips } from "@/components/swap/SeatPips";
```

- [ ] **Step 2: Delete the time column**

Remove this element entirely (currently the first child of the row's flex container):

```tsx
<div className="shrink-0 pt-0.5 text-[0.95rem] text-[var(--ink-muted)] sm:w-[4.5rem]">
  {formatListingTime(listing.dateTime)}
</div>
```

- [ ] **Step 3: Put the time on the headline**

Replace the `<h3>` with:

```tsx
<h3 className="flex flex-wrap items-baseline gap-x-2 break-words font-display text-[1.4rem] uppercase leading-tight tracking-wide sm:text-[1.65rem]">
  {title ?? listing.college}
  <span className="text-[0.9rem] normal-case tracking-normal text-[var(--ink-muted)]">
    {formatListingTime(listing.dateTime)}
  </span>
</h3>
```

- [ ] **Step 4: Replace the meta line with pips plus tail**

Replace the `formatListingRowMeta` block with:

```tsx
<div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1">
  {!isPast ? (
    <SeatPips
      total={listing.groupSize}
      taken={listing.groupSize - listing.seatsAvailable}
    />
  ) : null}
  <span className="text-[0.9rem] text-[var(--ink-muted)]">
    {formatRowTail({
      seatsAvailable: listing.seatsAvailable,
      isPast,
      price: listing.price,
    })}
  </span>
</div>
```

Pips are suppressed for past listings, matching the existing rule that seat availability is not shown once a formal has happened.

- [ ] **Step 5: Typecheck, lint, commit**

```bash
npx tsc --noEmit && npm run lint
git add components/swap/ListingRow.tsx
git commit -m "FEAT: Row shows seat pips and demotes the time"
```

---

### Task 4: Compact variant, adopted by the hero

**Files:**
- Modify: `components/swap/ListingRow.tsx`
- Modify: `components/landing/LandingHero.tsx`

**Interfaces:**
- Produces: `ListingRow` gains `compact?: boolean`.

- [ ] **Step 1: Add the prop**

Add to `ListingRow`'s `Props`:

```tsx
  /** Narrow contexts (the landing hero): no day rail, so the row states its own date. */
  compact?: boolean;
```

Destructure it with the rest, defaulting to `false`.

- [ ] **Step 2: Date-and-time line when compact**

Import `formatShortDate` from `@/lib/data/format` (it already exists and returns e.g. `18 Oct`). Immediately above the `<h3>`, add:

```tsx
{compact ? (
  <div className="mb-0.5 flex items-baseline gap-2 text-[0.85rem] text-[var(--ink-muted)]">
    <span className="font-display text-[1rem] text-[var(--ink)]">
      {formatShortDate(listing.dateTime)}
    </span>
    <span>{formatListingTime(listing.dateTime)}</span>
  </div>
) : null}
```

and make the headline's own time suffix conditional on `!compact`, so the time is not stated twice.

- [ ] **Step 3: Move the tag and CTA below the body when compact**

The right-hand column is currently a sibling of the body with `flex-row sm:flex-col`. Give it a compact form: when `compact` is true it must render *after* the body in a full-width block rather than beside it. Change the row's outer container and that column so that:

- non-compact keeps today's behaviour exactly (`sm:flex-row`, tag+CTA on the right);
- compact stacks: body, then a full-width row containing the type tag and a CTA that fills the remaining width (`flex-1` on the button).

Keep the existing `onClick`/`onKeyDown` `stopPropagation` guards on that column in both forms — they stop the CTA also triggering the row's `onPress`.

- [ ] **Step 4: Hero adopts it**

In `components/landing/LandingHero.tsx`, remove the `ListingDayList` import and usage. The populated branch maps listings directly:

```tsx
<ul className="min-h-[16rem]">
  {listings.map((listing) => {
    const owner = owners.get(listing.ownerUserId);
    if (!owner) return null;
    return (
      <li
        key={listing.id}
        className="border-t border-dashed border-[color-mix(in_srgb,var(--ink)_18%,transparent)] first:border-t-0"
      >
        <ListingRow
          listing={listing}
          owner={owner}
          compact
          hideInterests
          disabled
          disabledLabel="Sign in to request"
        />
      </li>
    );
  })}
</ul>
```

Leave the loading and empty branches as they are. `ListingDayList` itself is not modified — Browse, college pages, profiles, and the picker keep using it.

- [ ] **Step 5: Typecheck, lint, commit**

```bash
npx tsc --noEmit && npm run lint
git add components/swap/ListingRow.tsx components/landing/LandingHero.tsx
git commit -m "FEAT: Compact row variant for the landing hero"
```

---

### Task 5: Verify

**Files:** none — verification only.

- [ ] **Step 1: Run the data tests**

Run: `npx tsx --test lib/data/*.test.ts`
Expected: all passing.

- [ ] **Step 2: Browser checks**

The controller performs these. Do not start a dev server as part of Task 4.

- Browse at full width: pips render, filled count matches seats taken, time sits beside the college name, no time column.
- Landing hero at desktop: no wrapped college names, date+time line above each headline, CTA full-width beneath.
- A past listing (profile → attended): no pips, no "N left".
- Screen-reader label present on the pip group.

## Self-Review Notes

Spec coverage: pips with bounded count and aria-label (T2), text tail without "Group of N" (T1), time demoted to a suffix (T3), pips suppressed when past (T2/T3), compact variant with its own date line and full-width CTA (T4), hero dropping `ListingDayList` while other consumers keep it (T4). `formatListingRowMeta`, `formatListingMetaLine`, `MyListingCard`, and `ListingDayList` are untouched, as the spec requires.
