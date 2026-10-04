# Seat pips, demoted time, and a compact row — design

Date: 2026-08-18
Status: approved, ready for planning

## Problem

Three issues with `ListingRow` as shipped:

1. **Seat availability is prose.** "Group of 3 · 2 seats left" states twice over
   what a picture shows at a glance, and it buries the number that matters (how
   full is this?) inside a sentence.
2. **Time occupies a whole column.** A fixed ~4.5rem gutter for "7:15pm" — the
   least important fact in the row — at the cost of the width everything else
   needs.
3. **The row does not fit a narrow column.** In the landing hero's split layout
   (~420px) the day gutter + time column + body + tag + CTA collide: college
   names wrap mid-word and the meta line breaks across two lines.

## Decisions

| Question | Decision |
|---|---|
| Seat display | Person glyphs — filled = taken, outline = free — followed by "N left" in text. |
| Time | Small muted suffix beside the headline; the time column is removed. |
| Narrow contexts | A `compact` variant of `ListingRow`, used by the landing hero. |
| Pip ceiling | None needed. `GroupSize` is `2 \| 3 \| 4 \| 5 \| 6`, so six pips is the maximum by construction. |

## Seat pips

New `components/swap/SeatPips.tsx`:

```tsx
type Props = {
  /** Total seats in the group — `listing.groupSize`. */
  total: number;
  /** Seats already taken — `groupSize - seatsAvailable`. */
  taken: number;
  className?: string;
};
```

Renders `total` person glyphs, the first `taken` of them filled. The glyph is an
inline SVG (head circle + shoulders arc) using `currentColor`, so it inherits the
ink token of whatever context it sits in.

**Accessibility is not optional here.** Marks alone convey nothing to a screen
reader, so the group carries `role="img"` and
`aria-label="{taken} of {total} seats taken"`. The individual glyphs are
`aria-hidden`.

**Past listings.** Seat availability is already suppressed for past formals
(`formatListingSeatsSuffix` returns `null` when `isPast`). Pips follow the same
rule: not rendered at all for a past listing, rather than showing a full group.

## Row changes

Meta line becomes:

```
[pips]  2 left · £28
```

The headline becomes `WORCESTER 7:15pm`, where the time is small, muted, and not
uppercased — a suffix, not a peer. The dedicated time column is deleted, which is
what gives the narrow column its width back.

`formatListingRowMeta` currently produces `Group of 3 · 2 seats left · £28` and
is used by **both** `ListingRow` and `formatListingMetaLine`, which
`MyListingCard` still depends on. It must therefore not change. Add a separate
helper instead:

```ts
// lib/data/format.ts
/** `2 left · £28` — the text beside the seat pips. Empty string if neither applies. */
export function formatRowTail(args: {
  seatsAvailable: number;
  isPast: boolean;
  price?: number;
}): string;
```

Rules: omit the seat clause entirely when `isPast`; render `Group full` when
`seatsAvailable === 0`; omit price when undefined; join with ` · `.

## Compact variant

`ListingRow` gains `compact?: boolean`. When set:

- A small line above the headline carries date and time together (`18 Oct 7:15pm`),
  since a compact row is not sitting under a day rail that already states the date.
- The right-hand column (type tag + CTA) moves below the body, with the CTA
  full-width.
- Everything else — pips, host, menu, message, interests — is unchanged.

`LandingHero` switches to it, and in doing so **stops using `ListingDayList`**:
without a day gutter there is nothing for the container to provide, so the hero
maps its listings directly. `ListingDayList` is untouched and continues to serve
Browse, college pages, profiles, and the picker at full width.

## Consumers

The seat-pip and time changes are inside `ListingRow`, so `BrowseTab`,
`CollegeListingsSection`, `ProfileView`, and `NewRequestPicker` inherit them with
no edit. Only `LandingHero` changes, to pass `compact` and drop the container.

## Testing

`formatRowTail` is pure and gets `node:test` coverage alongside the existing
`lib/data/format.test.ts` cases: seats + price, seats only, price only, past
(seats suppressed), and zero seats ("Group full"). `SeatPips` and the row variant
are visual, verified in the browser at full width and at ~420px.

## Out of scope

The palette and typography revamp; `ListingDayList`; `MyListingCard` and the
listings hub; any change to `formatListingRowMeta` or `formatListingMetaLine`.
