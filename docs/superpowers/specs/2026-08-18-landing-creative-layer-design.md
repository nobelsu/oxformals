# Landing creative layer — design

Date: 2026-08-18
Status: approved in direction; three features, validated by prototype where noted.

## Overview

Three creative/interactive touches on the **logged-out landing page only**, inspired
by Studio Marrone: a cursor paint-reveal block, an ambient spray behind the hero,
and a handwritten wordmark that draws itself. All decorative, all landing-only —
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
  `ResizeObserver`. The handwriting is a one-shot draw on load.
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

## Feature 3 — Handwritten wordmark (draws on load)

Genuine **single-stroke pen-script** (not Schoolbell — Schoolbell is a filled font and
can't be pen-drawn), animated via SVG `stroke-dashoffset`, one-shot on first load.

**Placement — needs your call at spec review.** Recommended: the **nav wordmark**
"oxformals" (top-left) becomes an inline SVG that writes itself once as the page
loads, then persists as the drawn wordmark. This respects the earlier decision to
keep the wordmark small in the nav and lead the hero with the headline, and gives the
handwriting a natural home — the brand signing itself as you arrive.

- Trade-off: the nav wordmark stops being live text and becomes an SVG (add
  `aria-label="oxformals"`; it stays a link to `/`). And its resting state is the
  pen-script face, not Schoolbell — so the pen-script has to look right as the
  permanent wordmark, not just mid-draw.
- Alternative if you'd rather: a larger handwritten "oxformals" as a hero accent above
  the headline, with the nav keeping its Schoolbell text. More presence, some
  redundancy (two wordmarks).

**Sourcing the path — the technical risk.** A true pen-draw needs single-stroke path
data for the word. Approach: author it as a **static SVG asset** — generate the
single-line paths from a single-stroke/engraving script font (Hershey-style) or a
handwriting-to-path tool, committed as a component/asset, not generated at runtime.
This is the part most likely to need iteration to look right; the build should
timebox it and fall back to Feature-1/2 shipping independently if the letterforms
don't land.

**Static form** (reduced-motion): the word shown fully drawn instantly, no stroke
animation.

---

## Build order

1. **Shared canvas util** — a small hook/helper for the two paint canvases (dpr-capped
   sizing via `ResizeObserver`, pointer-move plumbing, reduced-motion/touch detection)
   so Features 1 and 2 don't duplicate it.
2. **Feature 1** (paint-reveal block) — validated, highest-value, ship first.
3. **Feature 2** (hero spray) — depends on the contrast verification.
4. **Feature 3** (handwriting) — independent; the path-authoring risk means it must be
   able to slip without blocking 1 and 2.

## Testing

No new pure logic to unit-test. Everything is visual + interaction, verified in the
browser: paint-reveal reveals + repaints and resets on scroll-out; spray stays under
the contrast floor at max accumulation (measured, not eyeballed); handwriting draws
once and respects reduced-motion; all three render their static form with motion
reduced and on touch. Confirm the app's working surfaces are untouched.

## Out of scope

Any of this on authenticated/app surfaces; the 404 page (explicitly not wanted); the
follow graph; the feed; the scroll-reveal/parallax discussed separately.
