# Instagram Story Share Cards Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A Share button on feed listings, feed reviews (author only) and the listing popup that produces a 1080×1920 story image in the Oxformals style, handed to the phone's share sheet (or downloaded on desktop).

**Architecture:** `convex/share.ts` exposes two public queries returning exactly what a card shows (first names only; anonymous reviews show no name). Next route handlers `app/api/share/listing/[id]/route.tsx` and `app/api/share/review/[id]/route.tsx` fetch that data with `ConvexHttpClient` and draw it with `ImageResponse` from `next/og`. A client helper fetches the PNG and calls `navigator.share({ files })`, falling back to a download.

**Tech Stack:** Next.js 16 `next/og` (Satori; flexbox only, ttf/otf fonts), Convex, Google Fonts (Schoolbell, Space Grotesk) fetched at runtime.

## Global Constraints

- Image size 1080×1920 PNG. Palette: sand `#f2ecdd`, paper `#ffffff`, ink `#1b1a12`, muted `#565039`, rose accent `#b8524c`, accent wash `#edbfba`.
- Dates render in `Europe/London` time, e.g. "Sat 12 Oct · 7pm".
- Listing card: college (Schoolbell, large), date · time, seats left ("2 seats left" / "Full"), formal type, "Hosted by {first name}", footer "Swap a seat on oxformals.com".
- Review card: first photo if any, college, overall stars (SVG, half-star aware), comment ≤ 140 chars with "…", "— {first name}" or "— Anonymous", footer "Rated on oxformals.com".
- Privacy: first names only; `isAnonymous` reviews never expose a name; deleted users render as "Deleted user".
- Share button: listings for everyone; reviews only on the viewer's own review.
- Web cannot open Instagram's story composer or add link stickers, so the URL is printed on the card.
- `/api/share/*` is a public route (cards hold public info only).

---

### Task 1: `convex/share.ts` + tests
- Queries `getListingShareCard({ listingId })` and `getReviewShareCard({ reviewId })`, each returning `null` when missing.
- Tests in `convex/share.test.ts`: first name only; anonymous review → `authorFirstName: null`; missing → `null`; first photo URL.

### Task 2: Card rendering
- `lib/share/cardFonts.ts` — `loadFonts()` fetches Schoolbell 400 and Space Grotesk 400/700 ttf from Google Fonts once per process.
- `lib/share/format.ts` — `formatShareDate(iso)` in Europe/London; `excerpt(text, 140)`.
- `app/api/share/listing/[id]/route.tsx`, `app/api/share/review/[id]/route.tsx` — `GET` returns the PNG (404 when the query returns null), `Cache-Control: public, max-age=300`.
- `proxy.ts` — add `"/api/share(.*)"` to public routes.

### Task 3: Share buttons
- `lib/share/shareCard.ts` — `shareCard(kind, id, title)`: fetch PNG → `navigator.canShare({ files })` ? `navigator.share` : download `oxformals-{kind}.png`.
- `components/share/ShareButton.tsx` — icon button (share glyph), busy state.
- `FeedRow.tsx` action row: listing items always; review items when `item.actor.id === user.id`. Ids come from `item.key` (`listing:<id>`, `review:<id>`).
- `ListingDetailModal.tsx`: Share button in the header area.

### Task 4: Verify
- Render both cards in the browser against dev data (a real listing id and review id), light check of layout and fonts; `npm test`, `tsc`, lint.
