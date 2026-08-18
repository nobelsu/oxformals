# Palette and typography revamp — design

Date: 2026-08-18
Status: approved, ready for planning

## Problem

Three things, established by the colour audit and by looking at the app:

1. **The accent can't carry text.** `--accent` is `#edbfba`, a pale pink. 34
   places put `text-white` on it — **1.6:1 contrast**, against a 4.5:1 minimum.
   The token built for this, `--accent-ink`, exists and is used 12 times. But
   simply switching to it gives black-on-pale-pink, which reads as a warning
   label rather than a call to action. One token is being asked to do two
   incompatible jobs: decorative wash, and button fill.
2. **Nothing reads as raised.** `--bg` (`#f2ead8`) and `--paper` (`#f6efe0`)
   differ by about 4% lightness, so cards, modals and inputs sit flat on the
   page. The feed the app is moving toward is surface-dense; this gets worse,
   not better.
3. **Schoolbell is doing all the work.** It is the body face everywhere, which
   forces `font-weight: 700` to stay legible and caps how much text a screen can
   carry. Row type is too small as a result.

## Decisions

| Question | Decision |
|---|---|
| Body face | **Manrope.** Inter was rejected; Roboto considered and passed over. |
| Schoolbell | Demoted to accent: wordmark, row headlines, day-rail dates, section headings. |
| Ground | **Sand** — `#f2ecdd`, a warm with a little olive in it, so it no longer shares a hue with the pink. |
| Surfaces | White. `--paper` becomes `#ffffff`. |
| Accent | Split in two: `--accent` becomes a deeper rose, `--accent-wash` keeps the pale pink for decoration. |
| Scope | Default theme (`schoolbell` id) only. The other six keep their palettes and fonts. |
| Theme ids | Unchanged. `convex/uiFont.ts` is byte-identical to the mobile repo's copy — changing ids would desync them and orphan stored `users.uiFont` values. |

## The accent split

```
--accent:       #b8524c   /* actionable: buttons, links, active states */
--accent-hover: #a3453f
--accent-ink:   #ffffff   /* text on --accent — 4.83:1, passes AA */
--accent-wash:  #edbfba   /* decorative only: avatars, chips, tints. Never carries text. */
```

This is what resolves the "black on pink looks poor" objection. The CTA becomes
rose with white text — same hue family as today's pink, strong enough to be a
button. The pale pink survives as the thing that makes the page feel like
oxformals, on avatars and chips where it never has to meet contrast rules.

**`--accent-wash` must be defined in all seven themes**, or shared components
break under the other six. For those six it is one line each, pointing at their
existing `--accent` value. That is not a redesign of their palettes.

## Sand, light and dark

```
                  light        dark
--bg              #f2ecdd      #1a1810
--paper           #ffffff      #232016
--ink             #1b1a12      #f2ecdd
--ink-muted       #565039      #c6bfa9
--ink-soft        #716b55      #8f8875
--tag             #1b1a12      #f2ecdd
--tag-ink         #f5f1e6      #1a1810
--accent          #b8524c      #d9736c
--accent-hover    #a3453f      #c85f58
--accent-ink      #ffffff      #1a1810
--accent-wash     #edbfba      #edbfba
--danger          #b8423e      #f87171
--danger-ink      #ffffff      #1a1810
```

The dark accent lightens so it stays visible on a dark ground, and `--accent-ink`
flips to the dark ground colour to stay readable on it.

## Typography

`--font-app` currently drives **both** body text and `.font-display`, which is
why Schoolbell is everywhere. Split them:

- `--font-app` — body face. Manrope for the default theme, unchanged for the others.
- `--font-display-face` — display face. Schoolbell for the default theme;
  `var(--font-app)` for the other six, preserving their current behaviour exactly.

`.font-display` reads `--font-display-face`. Manrope loads through
`next/font/google` alongside the existing Schoolbell import in `app/layout.tsx`.

**Weights.** `body` is currently `font-weight: 700` because Schoolbell needs it.
Manrope at 700 shouts. The default theme moves to **400 body, 500–600 for
emphasis**; Schoolbell stays 400 wherever it appears. The other six themes keep
their current 600.

**Scale.** Row type is too small today. The default theme's row moves to:
headline 1.65rem → **1.9rem** at `sm` and up, meta 0.9rem → **1rem**, host name
0.95rem → **1.05rem**, host sub 0.85rem → **0.95rem**, chips 0.65rem →
**0.75rem**, CTA 0.75rem → **0.875rem**, day-rail date 1.15rem → **1.25rem**.
These are Manrope sizes; the same numbers under Schoolbell would be too large,
which is another reason the scale change and the face change ship together.

## Token cleanups

From the audit, in this spec's scope:

- **`text-white` on `--accent` → `var(--accent-ink)`, all 34 sites.** This is a
  component fix, not a palette one, so it repairs every theme at once.
- **Hardcoded reds → `var(--danger)`** in `ConfirmDialog`, `OutlineButton`,
  `CollegeReviewEditor`, `ReviewFormalSection`, `ListingRequestsView` (13 sites).
  Those are *filled* red buttons, so they need a paired foreground the same way
  `--accent` does — hence **`--danger-ink`** (light `#ffffff` at 5.40:1, dark
  `#1a1810` at 6.42:1). Without it, white text on the dark theme's `--danger`
  is **2.77:1**. This token was missed in the first draft of this spec and added
  after measuring.
- **Delete the `:root` duplicate** of the `schoolbell` theme block. Two sources of
  truth for the default palette invites drift; the `html[data-ui-font="schoolbell"]`
  block is the real one, and `:root` should only hold what is genuinely
  theme-independent (`--app-nav-height`).
- **`.newsletter-page` stops forking 11 tokens.** It currently redefines the
  palette with four different values on one page. It keeps whatever it genuinely
  needs (its shadow) and inherits the rest.
- **`@theme inline` exports all the semantic tokens**, not 8 of 11, so
  `--danger`, `--accent-ink` and `--accent-wash` are reachable as Tailwind
  utilities rather than only through `bg-[var(--x)]` brackets. Two idioms for the
  same thing is how the current inconsistency started.

Not in scope: the eight `--rank-*` tokens. They belong to the rankings page,
which is being deprecated in its own spec — they should be deleted with it, not
themed now.

## Verification

Contrast was computed while writing this spec, not deferred to implementation.
Three values failed a first pass and were solved for rather than accepted:
`--ink-soft` light was `#9c957c` at **3.00:1** on white, `--danger` light was
`#c96360` at **3.28:1** on the ground, and `--ink-soft` dark was `#8a8370` at
**4.31:1**. The values in the table above are the corrected ones. Measured
results for the default theme:

| Pair | Light | Dark |
|---|---|---|
| ink / bg | 14.81:1 | 15.07:1 |
| ink-muted / paper | 8.07:1 | 8.86:1 |
| ink-soft / paper | 5.33:1 | 4.61:1 |
| accent-ink / accent | 4.83:1 | 5.60:1 |
| tag-ink / tag | 15.47:1 | 15.07:1 |
| danger / bg | 4.58:1 | 6.42:1 |
| danger-ink / danger | 5.40:1 | 6.42:1 |
| ink / accent-wash | 10.61:1 | 10.80:1 |

Implementation must re-run these after any value changes:
every foreground/background pair in the default light and dark palettes —
ink/bg, ink-muted/bg, ink-soft/paper, accent-ink/accent, tag-ink/tag, danger/bg
— must be computed and recorded, with text pairs at 4.5:1 or better. A pair that
fails is a spec bug to fix, not a number to round down.

Visual verification covers the landing page, Browse, a college page, a profile
and the picker modal, in light and dark, at desktop and 375px — plus one pass
through the other six themes confirming they still render with their own
palettes and fonts unchanged.

## Out of scope

The feed; the follow graph; the four-tab IA; the rankings deprecation; the mobile
app's own `oxColors.ts` palettes (a separate mirror job); `role="button"` ARIA
flattening on the row; `DataProvider`'s unconditional queries.
