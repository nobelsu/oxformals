# Landing creative layer — design

Date: 2026-08-18
Status: approved in direction; three features, validated by prototype where noted.

## Overview

Three creative/interactive touches on the **logged-out landing page only**, inspired
by Studio Marrone: a cursor paint-reveal block, an ambient spray behind the hero,
and a drawn accent mark on the headline. All decorative, all landing-only —
none of this goes near the app's working surfaces (Browse, feed, chats, forms),
where native scroll and plain interaction must stay untouched.

## Cross-cutting constraints (bind all three)

- **Client components, tokens only.** Every colour is a CSS custom property
  (`--accent`, `--accent-wash`, `--bg`, `--ink`, `--tag-ink`/`--ink-on`). No hex in
  the components.
- **Reduced-motion is a first-class state, not an afterthought.** Under
  `prefers-reduced-motion: reduce` each effect renders its *final/static* form with
  no animation and no pointer requirement (details per feature).
- **Touch / no-pointer / SSR** get the same static form. The interactive layer is a
  progressive enhancement over a fully-working static page. The static form is also
  what server-renders, so first paint is never blank.
- **Accessibility.** Canvases are `aria-hidden` decorative. All text (the tagline,
  the wordmark) is real, readable DOM — the page communicates fully with zero
  interaction.
- **Performance.** The two paint effects run on `pointermove` only — **no
  `requestAnimationFrame` loop**. `devicePixelRatio` capped at 2. Canvases sized via
  `ResizeObserver`. The drawn mark is a one-shot draw on load.
- **Landing-only.** Rendered by `LandingPage`/`LandingHero`, which only mount for
  logged-out visitors on a bare `/`. Nothing here ships to authenticated users.

---

## Feature 1 — Paint-reveal block (bottom of landing)

**Validated by prototype** (`paint-reveal-v3`). The Marrone bottom-of-page anchor.

`components/landing/PaintReveal.tsx`, added as the **last** section of `LandingPage`
after the social teaser.

**Structure** — three layers:
1. **Reveal field** (bottom): a `--accent` (rose) background with the tagline
   **"find your next formal"** in Schoolbell, coloured `--tag-ink` (cream) on the rose.
2. **Veil** (canvas, top): filled with `--bg` (Sand), erased by a **feathered** brush
   (radial-alpha `destination-out`) so it reads as painting, not scratching.
3. **Custom cursor**: a ring that tracks the pointer and matches the brush diameter;
   native cursor hidden over the block.

**Behaviour**: one stroke both wipes the Sand and exposes the rose field + tagline.
Production uses a single field colour (rose) and one fixed brush size — no dev
controls. An `IntersectionObserver` re-fills the veil when the block scrolls out of
view, so it's fresh on the next visit.

**Static form** (reduced-motion / touch / SSR): render **pre-revealed** — the rose
field and tagline fully shown, veil and cursor skipped.

---

## Feature 2 — Ambient spray behind the hero

**Validated by prototype** (`paintbrush-v2`, the build-up brush).

`components/landing/HeroSpray.tsx`, an absolutely-positioned canvas **behind** the
hero content (`z-0`; hero content sits at `z-10`). Soft translucent dabs in
`--accent-wash` accumulate gently as the cursor moves across the hero, building a
faint colour wash. The canvas is `pointer-events: none`; the hero section listens for
`pointermove` and forwards coordinates, so CTAs stay clickable.

**The contrast guardrail — this is the one that can go wrong.** Spray behind the
headline could drop text contrast below AA. Mitigations, all required:
- Cap accumulated alpha low (a faint wash, not a fill).
- Keep the wash in `--accent-wash` (pale), never the rose.
- **Verify**: with the wash at maximum accumulation, the hero headline (`--ink` on
  the sprayed ground) must still measure ≥ 4.5:1. If it can't, the spray is confined
  to the hero's margins / the area behind the showcase panel rather than behind the
  copy.

**Static form**: a single faint pre-painted `--accent-wash` gradient wash, no pointer
interaction. (Ambient and subtle enough that the static version looks intentional.)

**Register**: deliberately different from Feature 1 — ambient and barely-there vs the
overt bottom block — so the two paint interactions don't compete.

---

## Feature 3 — Drawn accent mark on the hero headline

A hand-drawn **roughjs** mark — an underline (or circle/arrow) — that *draws itself*
under a word in the hero headline on load. On-brand with the existing roughjs doodles
(`SketchCard`, `SketchDot`), cheap, and unmistakably an accent. The nav keeps its
Schoolbell wordmark unchanged.

`components/landing/HeadlineMark.tsx`. It renders a roughjs-generated SVG path
(hand-drawn underline) positioned under the target phrase in the hero `<h1>` —
**"Oxford formal."**, the phrase already kept together on one line — and animates the
path drawing via `stroke-dashoffset`, one-shot on first load, in `--accent`.

- Reuse the existing roughjs setup (same import as `SketchDot`). One instance, one
  draw. The underline width tracks the phrase width via `ResizeObserver` so it stays
  under the words if the headline reflows.
- **Static form** (reduced-motion): the mark shown fully drawn instantly, no draw
  animation.
- `aria-hidden` — purely decorative; the headline text is unchanged and unaffected.

**Deferred (not this build):** a genuine single-stroke pen-script *word* that writes
itself. It carries real path-authoring risk (Schoolbell is a filled font, so a true
pen-draw needs sourced single-stroke paths). Ship the drawn mark now; revisit the
pen-script word as a later, separate piece.

---

## Build order

1. **Shared canvas util** — a small hook/helper for the two paint canvases (dpr-capped
   sizing via `ResizeObserver`, pointer-move plumbing, reduced-motion/touch detection)
   so Features 1 and 2 don't duplicate it.
2. **Feature 1** (paint-reveal block) — validated, highest-value, ship first.
3. **Feature 2** (hero spray) — depends on the contrast verification.
4. **Feature 3** (drawn accent mark) — independent and cheap; reuses the roughjs setup.

## Testing

No new pure logic to unit-test. Everything is visual + interaction, verified in the
browser: paint-reveal reveals + repaints and resets on scroll-out; spray stays under
the contrast floor at max accumulation (measured, not eyeballed); the drawn mark animates once and respects reduced-motion; all three render their static form with motion
reduced and on touch. Confirm the app's working surfaces are untouched.

## Out of scope

Any of this on authenticated/app surfaces; the 404 page (explicitly not wanted); the
follow graph; the feed; the scroll-reveal/parallax discussed separately.
