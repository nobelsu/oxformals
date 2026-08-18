# Logged-out landing page — design

Date: 2026-08-17
Status: approved, ready for planning

## Problem

There is no landing page. `/` renders the tabbed home, and a logged-out visitor
lands on the Browse tab behind a two-line hero (`components/swap/Hero.tsx`:
wordmark plus "Browse formals, request a seat, and go somewhere new"). Nothing
explains what the product is, and the Oxford-only signup restriction is
discovered only after typing an email into the OTP step
(`convex/ResendOTP.ts:113`).

This also breaks under the planned IA change: once the feed takes `/`, the
logged-out home cannot be a personalised feed.

## Decisions

| Question | Decision |
|---|---|
| Landing shape | Marketing hero with live formals in it, not a bare product page. |
| Hero layout | Split — copy and CTAs left, live rail right ("B"). |
| Headline | Marketplace-first: "Find a seat at any Oxford formal." |
| Listings on the page | Hero rail only (next 4–5), ending in "Browse all formals →". |
| Sections below | How it works (3 steps), then a social-layer teaser. |
| Social teaser data | Static mock cards. The feed does not exist yet. |
| Oxford-only notice | Above the fold, under the CTAs. |

## Styling constraint — read this before writing any markup

The typography and colour revamp (Space Grotesk body, Schoolbell demoted to accent, a
new warm ground, an `--accent` / `--accent-wash` split) is **agreed in direction
but not yet specced, and the ground tone is still unpicked.**

This page must therefore be built entirely from the **existing** design tokens
(`--bg`, `--paper`, `--ink`, `--ink-muted`, `--ink-soft`, `--tag`, `--tag-ink`,
`--accent`, `--accent-hover`, `--accent-ink`) and the existing font classes
(`font-display`, the inherited body font). Do not hardcode Space Grotesk, Oat, or any
hex value. Built this way, the landing page inherits the new palette
automatically when it lands, and needs no rework.

**One exception, deliberately forward-looking:** the primary CTA uses
`var(--accent-ink)` for its text colour, **not** `text-white`. The audit found 34
existing places putting white on the pale pink `--accent`, which is 1.6:1
contrast; `--accent-ink` is the token built for this and gives 11:1 in the
default theme. New code should not add a 35th instance.

## Route

`/` becomes conditional:

- unauthenticated → `<LandingPage />`
- authenticated → the existing tabbed home (later, the feed)

Browse stays publicly reachable. The landing simply stops duplicating it.

**Soft dependency on the IA spec:** the "Browse all formals →" link target
depends on whether Browse keeps `/?tab=browse` or gets a real route. Implement it
as a single named constant so the IA change is a one-line edit, not a search.

## Components

New, under `components/landing/`:

- `LandingPage.tsx` — orchestrator; composes the three sections.
- `LandingHero.tsx` — split layout. Left: wordmark, headline, subline, two CTAs,
  Oxford-only notice. Right: the live rail in a raised surface. Stacks to one
  column below `md`, copy first.
- `LandingHowItWorks.tsx` — three static steps: list your formal / request a seat
  / go somewhere new.
- `LandingSocialTeaser.tsx` — copy plus two static mock feed cards (a review, and
  a wishlist-college listing alert). Explicitly not live data.

## Row reuse

The hero rail renders through the existing `ListingDayList` and `ListingRow`,
passing `disabled` and `disabledLabel="Sign in to request"` — the same props
`BrowseTab` already passes for logged-out visitors. No second row
implementation and no new props on `ListingRow`.

Host profile links stay live: profile pages are public today, and a logged-out
visitor following one is a reasonable path rather than a dead end.

## Data — new query `listings.listUpcomingPublic({ limit })`

Returns the next `limit` listings that are `status: "active"` with `dateTime` in
the future, ascending, each with the owner summary `ListingRow` needs.

**Why not reuse what exists.** Browse gets its data from `DataProvider`, which on
mount pulls `users.listPublic` (500 users) *and* `listings.listListings` (200
listings, each enriched) — see `components/data/DataProvider.tsx:157-158`. Making
the landing page — the highest-traffic, least-authenticated page — pay that cost
to render five rows is the wrong trade. With a dedicated query, `LandingPage`
does not need `DataProvider` at all.

## States

- **Populated:** rail shows up to 5 upcoming formals, grouped by day as elsewhere.
- **Empty:** if no listings qualify, the rail is replaced by a bordered card —
  "No open formals right now" plus a list-yours CTA. Without this the hero's
  entire right column collapses and the page looks broken exactly when supply is
  thinnest.
- **Loading:** the rail area holds its height to avoid shifting the hero.

## Copy

- Headline: **Find a seat at any Oxford formal.**
- Subline: Swap your place, take an empty seat, and eat somewhere you've never
  been.
- Primary CTA: **Sign in with Oxford email** → `/login`
- Secondary CTA: **Browse formals** → the browse route constant
- Notice: Oxford students only · verified with your `@ox.ac.uk` email
- Rail header: Open right now
- Steps: *List your formal* — Post a seat at your college, a swap or a paid guest
  place. *Request a seat* — Ask to swap yours for theirs, or take an open place.
  *Go somewhere new* — Meet your host, eat, then rate the hall you visited.
- Teaser heading: Follow people, not just formals.

## Responsive

Below `md` the hero stacks: wordmark, headline, subline, CTAs, Oxford notice,
then the rail. The How-it-works steps go from three columns to one; the social
teaser goes from two columns to stacked, copy first.

## Testing

No new pure logic — grouping and formatting are already covered by
`groupListingsByDay` and the `format` helpers. `listUpcomingPublic` is a
thin server query verified manually against the dev deployment; the components
are verified visually in the browser at desktop and mobile widths, including the
empty state.

## Out of scope

The feed; the four-tab IA change; the palette and typography revamp; any change
to `ListingRow` or `ListingDayList`; live data in the social teaser; SEO metadata
and Open Graph work; the existing `components/swap/Hero.tsx`, which stays until
the IA change decides the fate of the tabbed home.
