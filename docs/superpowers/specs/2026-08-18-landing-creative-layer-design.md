# Landing creative layer — design

Date: 2026-08-18
Status: approved in direction; three features, validated by prototype where noted.

## Overview

Three creative/interactive touches on the **logged-out landing page only**, inspired
by Studio Marrone: a cursor paint-reveal block, a full-page fading spray,
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

## Feature 2 — Full-page fading spray

**Revised** from the prototype: a living spray trail across the **whole landing page**
that **dissipates** rather than accumulating permanently.

`components/landing/LandingSpray.tsx` — a **fixed, full-viewport** canvas
(`position: fixed; inset: 0; z-0; pointer-events: none`) mounted at the top of
`LandingPage`, behind a `relative z-10` content wrapper. Soft translucent
`--accent-wash` dabs follow the cursor anywhere on the page, and a
`requestAnimationFrame` loop **fades the canvas continuously** so old strokes fade out
a second or so after the cursor leaves them.

**The fade loop must idle.** It runs only while there is paint to fade — it stops
itself once the canvas is empty and restarts on the next dab — so an idle page burns
no frames. (This supersedes the earlier "no rAF loop" rule, which applied to the
permanent version; a fading trail inherently needs a loop.)

**Clicks never blocked**: the canvas is `pointer-events: none`; it watches `window`
for `pointermove` and paints at the pointer's viewport position, so all page content
stays interactive with no per-section wiring.

**Contrast guardrail (still required, now easier).** The spray now sits behind *all*
page text, not just the hero — but most body text lives on opaque white/paper cards
that cover the spray, and the continuous fade caps how much wash can accumulate. The
binding case is **dark mode**, where `--ink` is light while `--accent-wash` stays pale:
at accumulated alpha 0.5 the ink-on-wash ratio falls to ~4.16:1, under the floor. So
the per-region accumulation is **capped at ≤ 0.35** (measured worst-case ~5.28:1 dark,
~13:1 light), and the accumulation estimate decays in step with the canvas fade. Text
directly on the Sand ground (hero headline, section headings) stays ≥ 4.5:1.

**Static form** (reduced-motion / touch / SSR): a single faint static `--accent-wash`
radial-gradient wash, no canvas, no loop, no listeners.

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
3. **Feature 2** (full-page fading spray) — fade loop must idle; depends on the contrast cap.
4. **Feature 3** (drawn accent mark) — independent and cheap; reuses the roughjs setup.

## Testing

No new pure logic to unit-test. Everything is visual + interaction, verified in the
browser: paint-reveal reveals + repaints and resets on scroll-out; spray fades out when idle and stays under the contrast floor (measured, not eyeballed); the drawn mark animates once and respects reduced-motion; all three render their static form with motion
reduced and on touch. Confirm the app's working surfaces are untouched.

## Out of scope

Any of this on authenticated/app surfaces; the 404 page (explicitly not wanted); the
follow graph; the feed; the scroll-reveal/parallax discussed separately.
