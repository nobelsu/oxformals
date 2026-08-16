# Listing row redesign — Luma-style day rail

Date: 2026-08-16
Status: approved, ready for planning

## Problem

`ListingCard` renders each listing as a tall box in a responsive grid. Four
consumers use it: `BrowseTab`, `CollegeListingsSection`, `ProfileView`,
`NewRequestPicker`. The grid wastes vertical space, shows few listings per
screen, and gives the date no prominence — it sits mid-sentence in a metadata
line.

## Goal

Replace the box with a wide row, grouped by day under a left date rail, in the
manner of Luma's event feed. Rows read fast; the date becomes structure rather
than text.

## Decisions

| Question | Decision |
|---|---|
| Scope | `ListingCard` only. `MyListingCard` unchanged. |
| Aesthetic | Flat row, sketch retained as accents (day marker, avatars, CTA). |
| Date pattern | Sticky day rail with dotted timeline (Luma home feed). |
| Row density | Rich — keeps menu/message, interest chips, dining-with avatars. |
| College page headline | `title` override prop; `hideCollege` deleted. |

## Architecture

Grouping lives in the container, not the row. The row stays presentational and
reusable; each consumer swaps one grid wrapper for one list component.

```
consumer (filters listings, owns handlers)
  └─ ListingDayList        groups + sorts, renders rail
       └─ ListingRow       per listing, via render callback
```

### New files

**`lib/data/groupListingsByDay.ts`**

```ts
export type ListingDayGroup = {
  dateKey: string;      // YYYY-MM-DD, local
  dateTime: string;     // ISO of first listing that day
  listings: Listing[];
};

export function groupListingsByDay(listings: Listing[]): ListingDayGroup[];
```

Sorts ascending by `dateTime`, buckets with the existing `isoToLocalDateKey`.
Sorts internally rather than trusting callers — `CollegeListingsSection` gives
no ordering guarantee.

**`components/swap/ListingDayList.tsx`**

Owns the gutter, dotted timeline, sticky day label, and the mobile collapse.
Takes `listings` plus a render callback so each consumer keeps its own
per-listing props (owner lookup, handlers, disabled state).

```tsx
type Props = {
  listings: Listing[];
  renderRow: (listing: Listing) => ReactNode;
};
```

**`components/swap/ListingRow.tsx`**

Prop parity with today's card: `listing`, `owner`, `memberUsers`, `onPress`,
`onRequest`, `disabled`, `disabledLabel`, `hideInterests`, `requestLabel`, plus
the new `title?: string`. `hideCollege` is gone.

### Changed files

- `lib/data/format.ts` — add `formatListingTime(iso)` → `"7:15pm"` and
  `formatDayLabel(iso)` → `{ day: "16 Aug", weekday: "Saturday" }`. Existing
  `formatListingDate` untouched; `MyListingCard` still uses it.
- `components/swap/BrowseTab.tsx` — grid → `ListingDayList`, keeps the
  full-bleed wrapper.
- `components/colleges/CollegeListingsSection.tsx` — grid → list; passes
  `title={firstName + "'s table"}`, keeps `hideInterests`, drops `hideCollege`.
- `components/swap/ProfileView.tsx` — grid → list.
- `components/swap/NewRequestPicker.tsx` — grid → list inside the modal; day
  labels stick within the modal body.
- `components/swap/ListingCard.tsx` — deleted once all four consumers move. No
  parallel old/new card.

## Row anatomy

Left to right:

| Zone | Content | Width |
|---|---|---|
| Time | `7:15pm` | fixed ~4.5rem |
| Body | title (uppercase display) → meta `Group of 4 · 2 seats left · £28` → host line (avatar, first name, year/role, dining-with avatars stacked) → menu/message clamped to 2 lines, italic → interest chips | flex-1 |
| Right | `ListingTypeTag`, then CTA button or `ListingStatusTag` | shrink-0 |

Title is `title ?? listing.college`. Rows separated by a 1px dashed hairline;
no per-row card border.

`Listing` field access stays defensive — `price`, `menu`, `message` are already
optional and the schema is in active flux.

### Sketch accents

- Day marker dot drawn with roughjs — **one per day group**, not per row, to
  keep SVG instance count low.
- Avatars and the CTA keep their existing ink borders.
- The rail line is CSS dashed, not roughjs: cheap, and stable across resize
  (roughjs redraws on every `ResizeObserver` tick).

### Mobile (below `sm`)

Gutter collapses. The day label becomes a sticky full-width header above its
rows; the time moves to the front of the meta line; the right column drops
below the body with the CTA left-aligned.

## States

- **Empty** — container renders nothing; consumers keep their existing empty copy.
- **Expired / confirmed / closed** — right column shows `ListingStatusTag`
  instead of the CTA, same branch as `ListingCard.tsx:145` today.
- **Disabled (signed out)** — CTA renders disabled with `disabledLabel`.
- **Past days** — rail marker uses `--ink-soft` so past groups recede. Reachable
  from profile views only.

## Accessibility

- Day group is a `<section aria-label="Saturday 16 August">`; rows sit in a
  `<ul>`/`<li>`.
- The row keeps the `role="button"` + `tabIndex` + Enter/Space pattern already
  used by `MyListingCard`, because it wraps nested links (host profile,
  dining-with avatars) and cannot be an `<a>`.
- Inner links and the CTA call `stopPropagation`, as today.

## Testing

`groupListingsByDay` gets `node:test` unit tests alongside the existing
`lib/data/*.test.ts`: ascending order, same-day bucketing, local-timezone date
keys across a DST boundary, empty input.

Row and container are visual; verified in the browser. This matches the repo's
current split — unit tests exist only under `lib/data`.

## Out of scope

`MyListingCard`, `MyListingsSection`, `AttendedFormalsSection`,
`ListingDetailModal`. The row opens the existing detail modal unchanged.
