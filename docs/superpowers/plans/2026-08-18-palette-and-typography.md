# Palette and Typography Revamp Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move the default theme to the Sand ground with white surfaces, make Manrope the body face with Schoolbell as an accent, split `--accent` into an actionable rose and a decorative wash, and retire the hardcoded colours the audit found.

**Architecture:** Everything lands in `app/globals.css` and `app/layout.tsx` except the component sweeps, which replace hardcoded `text-white` and `red-*` utilities with the tokens that already exist. Components were built against tokens throughout, so most of the visual change arrives without touching them.

**Tech Stack:** Next.js 16 (App Router, React 19), Tailwind v4 with CSS custom properties, `next/font/google`.

**Spec:** `docs/superpowers/specs/2026-08-18-palette-and-typography-design.md`

## Global Constraints

- **Only the default theme (`html[data-ui-font="schoolbell"]`) changes its palette and fonts.** The other six keep their current values and their current body/display faces. The only edit they receive is gaining `--accent-wash` and `--danger-ink`.
- Every colour lives in `app/globals.css` as a token. No hex in components, ever.
- `convex/uiFont.ts` must not change — it is byte-identical to the mobile repo's copy, and theme ids are persisted on `users.uiFont`.
- Do not touch the `--rank-*` tokens; they die with the rankings page in its own spec.
- Verify with `npx tsc --noEmit` and `npm run lint` before each commit. Two pre-existing `.next/types/*` typecheck errors and a lint baseline of 33 problems (19 errors, 14 warnings) exist in untouched files — add none.
- Commit on branch `revival`. Do not push, do not merge.

## Token reference (default theme)

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

---

### Task 1: Sand palette and the token contract

**Files:**
- Modify: `app/globals.css`

- [ ] **Step 1: Replace the default theme's light palette**

In `html[data-ui-font="schoolbell"]`, replace the colour declarations with the light column of the token reference above, adding `--accent-wash` and `--danger-ink` as new declarations. Leave `--font-app` alone for now — Task 2 handles fonts.

- [ ] **Step 2: Replace the default theme's dark palette**

Do the same for `html[data-ui-font="schoolbell"]` inside the `@media (prefers-color-scheme: dark)` block, using the dark column.

- [ ] **Step 3: Add the two new tokens to the other six themes**

For each of `inter`, `dm_sans`, `lora`, `georgia`, `arial`, `system_ui`, in **both** the light and dark blocks, add:

```css
  --accent-wash: <that theme's existing --accent value>;
  --danger-ink: <#ffffff or the theme's --bg, whichever contrasts with its --danger>;
```

Their palettes are otherwise unchanged. For `--danger-ink`, pick per theme by measuring — a light `--danger` (like the dark themes' `#f87171` or `#fca5a5`) needs a dark ink; a saturated one (like `#dc2626`) takes white. Record each choice and its ratio in your report.

- [ ] **Step 4: Delete the `:root` palette duplicate**

`:root` currently repeats the whole schoolbell palette, giving the default theme two sources of truth. Remove the colour declarations from `:root`, keeping only what is genuinely theme-independent (`--app-nav-height`) plus the `--rank-*` tokens, which are out of scope and must stay exactly as they are.

Then confirm nothing regressed: the `html` element always carries a `data-ui-font` attribute — verify this by reading how it is set (look in `app/layout.tsx` and wherever `data-ui-font` is written) and say in your report what happens before hydration if the attribute is briefly absent. **If a bare `html` with no attribute is reachable, keep a minimal fallback in `:root` rather than shipping an unstyled flash** — and say so.

- [ ] **Step 5: Export the tokens through `@theme inline`**

Add `--color-accent-ink`, `--color-accent-wash`, `--color-danger`, and `--color-danger-ink` alongside the existing eight, so all semantic colours are reachable as Tailwind utilities rather than only through bracket syntax.

- [ ] **Step 6: Verify contrast**

Write a throwaway script (Node, in a temp dir — do not commit it) that computes WCAG contrast for every pair in both default palettes: ink/bg, ink/paper, ink-muted/bg, ink-muted/paper, ink-soft/bg, ink-soft/paper, accent-ink/accent, tag-ink/tag, danger-ink/danger, danger/bg, ink/accent-wash. Paste the table into your report. Every text pair must be ≥ 4.5:1. **If any pair fails, stop and report it rather than adjusting a value on your own** — the spec's numbers were measured, so a failure means something was transcribed wrong.

- [ ] **Step 7: Typecheck, lint, commit**

```bash
npx tsc --noEmit && npm run lint
git add app/globals.css
git commit -m "FEAT: Sand palette with split accent and paired ink tokens"
```

---

### Task 2: Manrope body, Schoolbell as accent

**Files:**
- Modify: `app/layout.tsx`
- Modify: `app/globals.css`

- [ ] **Step 1: Load Manrope**

In `app/layout.tsx`, add a `next/font/google` import for Manrope alongside the existing Schoolbell one, exposing it as `--font-manrope` with the weights the spec needs (400, 500, 600, 700), and add its `.variable` to the `<html>` className next to `schoolbell.variable`.

- [ ] **Step 2: Split body and display faces**

`--font-app` currently drives both body text and `.font-display`, which is why Schoolbell is everywhere. Introduce a second variable so they can differ:

- `html` keeps `--font-app` as the body face, but for the default theme it becomes `var(--font-manrope), ui-sans-serif, system-ui, sans-serif`.
- Add `--font-display-face`. For the default theme it is `var(--font-schoolbell), "Schoolbell", cursive`. For every other theme it is `var(--font-app)`, preserving their behaviour exactly.
- `.font-display` reads `var(--font-display-face)` instead of `var(--font-app)`.

- [ ] **Step 3: Fix the weights**

`body` is `font-weight: 700` because Schoolbell needs it; Manrope at 700 shouts. The default theme's body becomes `400`. `.font-display` under the default theme stays `400` (Schoolbell has one weight). The six other themes keep their existing 600 body / 600 display rules untouched.

Check whether anything relied on the inherited bold — search for elements that set no weight of their own and previously looked bold. Where a specific element genuinely needs emphasis, give it `font-medium` or `font-semibold` explicitly rather than restoring a global bold.

- [ ] **Step 4: Verify in the browser**

Run the dev server. Confirm: body text is Manrope; the wordmark, row headlines and day-rail dates are Schoolbell; switching to the `inter` theme still renders Inter for body *and* display, exactly as before. Report what you saw.

- [ ] **Step 5: Typecheck, lint, commit**

```bash
npx tsc --noEmit && npm run lint
git add app/layout.tsx app/globals.css
git commit -m "FEAT: Manrope body with Schoolbell as display accent"
```

---

### Task 3: Retire `text-white` on accent backgrounds

**Files:**
- Modify: the files found by the sweep below (~14 files, 33 sites)

**Interfaces:** none — this is a mechanical token sweep.

- [ ] **Step 1: Enumerate**

```bash
grep -rn "text-white" app components --include="*.tsx"
```

40 total. They fall into three groups, and **only the first two change in this task**:

1. `text-white` on `bg-[var(--accent)]` — 31 sites → `text-[var(--accent-ink)]`
2. `text-white` on a `color-mix(...var(--accent)...)` background — 2 sites → `text-[var(--accent-ink)]`
3. `text-white` on `bg-red-*` — 6 sites → left alone here; Task 4 converts them together with their background
4. One `text-white` on an SVG inside `components/onboarding/OnboardingOverlay.tsx` — read what sits behind it and decide; if it is over the accent, convert it, if not, leave it and say why

- [ ] **Step 2: Convert groups 1 and 2**

Replace `text-white` with `text-[var(--accent-ink)]` at those sites. Do not change any other class on those elements.

- [ ] **Step 3: Confirm the sweep is complete**

```bash
grep -rn "text-white" app components --include="*.tsx"
```

Expected: only the red-background sites from Task 4 (and the overlay SVG, if you left it). Report the remaining list.

- [ ] **Step 4: Typecheck, lint, commit**

```bash
npx tsc --noEmit && npm run lint
git commit -am "FIX: Use the accent-ink token instead of hardcoded white"
```

---

### Task 4: Retire hardcoded reds

**Files:**
- Modify: `components/ui/ConfirmDialog.tsx`, `components/ui/OutlineButton.tsx`, `components/swap/ListingRequestsView.tsx`, `components/colleges/ReviewFormalSection.tsx`, `components/colleges/CollegeReviewEditor.tsx`

- [ ] **Step 1: Convert**

Replace `red-600` / `red-700` / `red-500` backgrounds, borders and text with `var(--danger)`, and the `text-white` that sits on those filled red backgrounds with `var(--danger-ink)`. Hover states that darkened to `red-700` should use a `color-mix` against `--danger` rather than a second token — match how `--accent-hover` is used nearby, and if a hover token feels warranted, note it rather than inventing one.

- [ ] **Step 2: Confirm**

```bash
grep -rn "red-[0-9]" app components --include="*.tsx"
```

Expected: no matches.

- [ ] **Step 3: Typecheck, lint, commit**

```bash
npx tsc --noEmit && npm run lint
git commit -am "FIX: Use the danger token instead of hardcoded reds"
```

---

### Task 5: Un-fork the letter page and bump the row type scale

**Files:**
- Modify: `app/globals.css` (`.newsletter-page`)
- Modify: `components/swap/ListingRow.tsx`, `components/swap/ListingDayList.tsx`

- [ ] **Step 1: Un-fork `.newsletter-page`**

It redefines 11 palette tokens on one page, four of them with values that differ from the default theme. Delete those redefinitions so the page inherits the theme, keeping only what is genuinely page-specific (`--newsletter-shadow`).

Then look at the page in the browser under the new palette before and after, and report whether anything reads worse. If a specific value turns out to be load-bearing for that page's design, keep that one and say why — the goal is removing an unmaintained fork, not breaking a page to satisfy a rule.

- [ ] **Step 2: Bump the row scale**

Per the spec, in `ListingRow`: headline `sm:text-[1.65rem]` → `sm:text-[1.9rem]`, meta `0.9rem` → `1rem`, host name `0.95rem` → `1.05rem`, host sub `0.85rem` → `0.95rem`, chips `0.65rem` → `0.75rem`, CTA `0.75rem` → `0.875rem`. In `ListingDayList`: day date `1.15rem` → `1.25rem`.

Leave the compact variant's own sizes alone unless they now look wrong beside the bumped ones — check at ~420px and report.

- [ ] **Step 3: Typecheck, lint, commit**

```bash
npx tsc --noEmit && npm run lint
git commit -am "FEAT: Bump row type scale and un-fork the letter page palette"
```

---

### Task 6: Verify

**Files:** none — verification only. The controller performs this.

- Landing, Browse, a college page, a profile, the picker modal — light and dark, desktop and 375px.
- The other six themes still render their own palettes and their own fonts.
- Contrast spot-checks on rendered elements, by computed style rather than by eye.

## Self-Review Notes

Spec coverage: Sand light/dark (T1), `--accent-wash` and `--danger-ink` across all themes (T1), `:root` de-duplication and `@theme inline` exports (T1), Manrope + display-face split + weights (T2), the 33 accent-white sites (T3), the 13 red sites (T4), `.newsletter-page` un-fork and the type scale (T5). `--rank-*`, `convex/uiFont.ts`, and the other six themes' palettes are untouched, as the spec requires.
