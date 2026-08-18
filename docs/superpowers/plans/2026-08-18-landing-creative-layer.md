# Landing Creative Layer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add three landing-only creative touches — a cursor paint-reveal block at the bottom, an ambient spray behind the hero, and a self-drawing roughjs mark under the headline — each degrading to a clean static form.

**Architecture:** A shared canvas hook powers the two paint effects; each feature is its own client component under `components/landing/`. All are decorative, tokens-only, reduced-motion-safe, and landing-only (they mount inside `LandingHero`/`LandingPage`, which only render for logged-out visitors on a bare `/`).

**Tech Stack:** Next.js 16 (App Router, React 19), Canvas 2D, roughjs (already a dep), Tailwind v4 CSS custom properties.

**Spec:** `docs/superpowers/specs/2026-08-18-landing-creative-layer-design.md`

**Prototypes to port from (validated):** `.superpowers/brainstorm/*/content/paint-reveal-v3.html` (Feature 1) and `paintbrush-v2.html` (Feature 2). Lift the canvas logic from these; do not reinvent it.

## Global Constraints

- **Tokens only, no hex** in components. Colours: `--accent`, `--accent-wash`, `--accent-wash-ink`, `--bg`, `--ink`, `--ink-muted`, `--tag-ink`.
- **`prefers-reduced-motion: reduce` → static form** for every feature: no animation, no pointer requirement. Detect with `window.matchMedia`, and re-check on change.
- **Touch / no-pointer / SSR also get the static form.** The interactive layer is enhancement over a fully-working static page; the static form is what server-renders.
- **Canvases are `aria-hidden`.** All text stays real DOM.
- **No `requestAnimationFrame` loop** in the paint effects — paint on `pointermove` only. Cap `devicePixelRatio` at 2. Size via `ResizeObserver`.
- `"use client"` on line 1 of every component here.
- **Do not touch** anything outside `components/landing/` and the one `LandingHero` edit points named below. Nothing on app/authenticated surfaces.
- Verify `npx tsc --noEmit` and `npm run lint` before each commit. Two pre-existing `.next/types/*` typecheck errors and a lint baseline of 33 problems (19 errors, 14 warnings) exist in untouched files — add none.
- Commit on branch `revival`. Do not push, do not merge.
- No unit tests — all visual/interaction, verified in the browser (consistent with the repo testing only `lib/data`).

---

## File Structure

**Create:**
- `lib/hooks/usePaintCanvas.ts` — shared canvas setup hook (dpr-capped sizing, reduced-motion/coarse-pointer detection).
- `components/landing/PaintReveal.tsx` — Feature 1.
- `components/landing/HeroSpray.tsx` — Feature 2.
- `components/landing/HeadlineMark.tsx` — Feature 3.

**Modify:**
- `components/landing/LandingPage.tsx` — append `<PaintReveal />` as the last section.
- `components/landing/LandingHero.tsx` — mount `<HeroSpray />` behind the hero content; drop `<HeadlineMark />` under the "Oxford formal." phrase.

---

### Task 1: Shared canvas hook

**Files:**
- Create: `lib/hooks/usePaintCanvas.ts`

**Interfaces:**
- Produces:
  ```ts
  export function useReducedOrCoarse(): boolean; // true => render static form
  export function useCanvasDpr(
    canvasRef: React.RefObject<HTMLCanvasElement | null>,
    onResize?: (ctx: CanvasRenderingContext2D, w: number, h: number, dpr: number) => void,
  ): void; // sizes the canvas to its box * dpr(≤2) via ResizeObserver, calls onResize after each resize
  ```

- [ ] **Step 1: Write the hook**

```ts
"use client";

import { useEffect, useState } from "react";

/**
 * True when the interactive paint layer should be skipped in favour of the
 * static form: the user prefers reduced motion, or the primary pointer is
 * coarse (touch). Re-evaluates on media-query change.
 */
export function useReducedOrCoarse(): boolean {
  const [skip, setSkip] = useState(false);
  useEffect(() => {
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const coarse = window.matchMedia("(pointer: coarse)");
    const sync = () => setSkip(motion.matches || coarse.matches);
    sync();
    motion.addEventListener("change", sync);
    coarse.addEventListener("change", sync);
    return () => {
      motion.removeEventListener("change", sync);
      coarse.removeEventListener("change", sync);
    };
  }, []);
  return skip;
}

/** Keeps a canvas sized to its CSS box × dpr (capped at 2); calls back after each resize. */
export function useCanvasDpr(
  canvasRef: React.RefObject<HTMLCanvasElement | null>,
  onResize?: (
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    dpr: number,
  ) => void,
): void {
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ro = new ResizeObserver(() => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const rect = canvas.getBoundingClientRect();
      canvas.width = Math.round(rect.width * dpr);
      canvas.height = Math.round(rect.height * dpr);
      const ctx = canvas.getContext("2d");
      if (ctx && onResize) onResize(ctx, canvas.width, canvas.height, dpr);
    });
    ro.observe(canvas);
    return () => ro.disconnect();
  }, [canvasRef, onResize]);
}
```

- [ ] **Step 2: Typecheck, lint, commit**

```bash
npx tsc --noEmit && npm run lint
git add lib/hooks/usePaintCanvas.ts
git commit -m "FEAT: Shared canvas hook for the landing paint effects"
```

---

### Task 2: Paint-reveal block (Feature 1)

**Files:**
- Create: `components/landing/PaintReveal.tsx`
- Modify: `components/landing/LandingPage.tsx`

**Interfaces:**
- Consumes: `useReducedOrCoarse`, `useCanvasDpr` (Task 1).
- Produces: `<PaintReveal />`, no props.

Port the canvas logic from `.superpowers/brainstorm/*/content/paint-reveal-v3.html` — read it first. The reveal is a rose field with the Schoolbell tagline; a Sand veil canvas is erased with a feathered radial-alpha `destination-out` brush; a ring cursor tracks the pointer.

- [ ] **Step 1: Write the component**

Key requirements (translate the prototype into React + tokens):

- Root `<section>`, full-width within the landing container, height ~`clamp(18rem, 40vh, 24rem)`, `rounded-[16px] overflow-hidden`, `bg-[var(--accent)]`.
- **Reveal layer**: centered `<p>` tagline **"find your next formal"** — `font-display` (Schoolbell), lowercase, `text-[var(--tag-ink)]`, `clamp` font-size. This is real text, always in the DOM.
- **Veil**: a `<canvas aria-hidden>` absolutely covering the section, filled `--bg` (read the token via `getComputedStyle(document.documentElement).getPropertyValue('--bg')` once). Erase with the feathered brush from the prototype (radial gradient, `destination-out`), interpolating between pointer samples so fast drags stay continuous.
- **Cursor**: a `<span aria-hidden>` ring, `position: fixed`, `pointer-events-none`, `mix-blend-mode: difference`, sized to the brush; shown only while the pointer is over the section; section sets `cursor: none`.
- **Reset on scroll-out**: `IntersectionObserver` on the section; when it leaves the viewport, re-fill the veil (Sand) so it's fresh next time.
- **Static form**: when `useReducedOrCoarse()` is true, render the reveal layer only — no canvas, no cursor, no listeners. The rose field + tagline show fully (this is also the SSR paint).

Brush radius: a single fixed value (~64px CSS). Field colour: `--accent`. No dev controls.

- [ ] **Step 2: Mount it**

In `components/landing/LandingPage.tsx`, import `PaintReveal` and append it after `<LandingSocialTeaser />`:

```tsx
      <LandingSocialTeaser />
      <PaintReveal />
    </main>
```

- [ ] **Step 3: Typecheck, lint, commit**

```bash
npx tsc --noEmit && npm run lint
git add components/landing/PaintReveal.tsx components/landing/LandingPage.tsx
git commit -m "FEAT: Paint-reveal block at the bottom of the landing page"
```

- [ ] **Step 4: Report for controller verification**

Note in the report that the controller must confirm in the browser: dragging reveals the rose field + tagline; the ring cursor tracks and matches the brush; it resets after scrolling away and back; reduced-motion renders pre-revealed. Do not start a dev server yourself.

---

### Task 3: Ambient hero spray (Feature 2)

**Files:**
- Create: `components/landing/HeroSpray.tsx`
- Modify: `components/landing/LandingHero.tsx`

**Interfaces:**
- Consumes: `useReducedOrCoarse`, `useCanvasDpr` (Task 1).
- Produces: `<HeroSpray />`, no props.

Port the build-up brush from `.superpowers/brainstorm/*/content/paintbrush-v2.html` — read it first. Soft translucent `--accent-wash` dabs that accumulate.

- [ ] **Step 1: Write the component**

- A `<canvas aria-hidden>` filling its positioned parent, `pointer-events-none`.
- Soft radial dabs in `--accent-wash` at **low alpha** (start ~0.06 per dab), `source-over`, accumulating. Interpolate between samples.
- The canvas does **not** listen for pointer events itself (it's `pointer-events-none`); it exposes a `paintAt(clientX, clientY)` the parent calls — implement by having `HeroSpray` attach its own `pointermove` listener to `window` but only paint when the pointer is within the canvas's rect (so it never blocks the hero's own clicks and needs no wiring in `LandingHero` beyond placement).
- **Contrast cap (required):** clamp total accumulation so the wash never darkens the ground past the point where `--ink` on it stays ≥ 4.5:1. Since the wash is `--accent-wash` (`#edbfba`) and `--ink` is near-black, even a full `#edbfba` field is ~10.6:1 — so the risk is low, but **cap the per-region alpha at ≤ 0.5 total** and note the measured worst-case ratio in the report. If a deeper colour is ever swapped in, this cap must be re-derived.
- **Static form**: when `useReducedOrCoarse()`, render a single faint static `--accent-wash` radial-gradient wash (a `div` with a CSS radial-gradient background at low opacity), no canvas, no listeners.

- [ ] **Step 2: Mount it behind the hero**

In `components/landing/LandingHero.tsx`, make the hero `<section>` a positioned context and layer the spray behind the content:

```tsx
    <section className="relative grid items-center gap-10 py-10 md:grid-cols-2 md:gap-14">
      <HeroSpray />
      <div className="relative z-10 flex flex-col items-start">
        {/* existing hero-left content unchanged */}
```

`HeroSpray` renders an absolutely-positioned, inset-0, `z-0`, `pointer-events-none` canvas/wash. The existing right-hand `HeroShowcase` column also needs `relative z-10` so it stays above the spray. Change only the wrapper classes; leave the content untouched.

- [ ] **Step 3: Typecheck, lint, commit**

```bash
npx tsc --noEmit && npm run lint
git add components/landing/HeroSpray.tsx components/landing/LandingHero.tsx
git commit -m "FEAT: Ambient spray behind the landing hero"
```

- [ ] **Step 4: Report for controller verification**

Report the measured worst-case headline contrast over the wash, and note the controller must confirm: spray accumulates behind the hero, CTAs and the showcase stay fully clickable, headline stays legible, reduced-motion shows the static wash.

---

### Task 4: Drawn accent mark (Feature 3)

**Files:**
- Create: `components/landing/HeadlineMark.tsx`
- Modify: `components/landing/LandingHero.tsx`

**Interfaces:**
- Consumes: `roughjs` (as `components/ui/SketchDot.tsx` imports it — `import rough from "roughjs"`); `useReducedOrCoarse` (Task 1) for the static form.
- Produces: `<HeadlineMark />`, an inline SVG underline that draws itself once.

- [ ] **Step 1: Write the component**

- An inline `<svg aria-hidden>` sized to its container width (via `ResizeObserver`), positioned as an underline beneath its wrapping phrase. It draws a roughjs line/underline path across its width in `stroke="currentColor"` with `color: var(--accent)`.
- Generate the path with `rough.svg(svg)` (mirror `SketchDot`'s construction: create the generator, append the returned node), using a `line` from left to right with a slight `roughness`/`bowing` so it wobbles like the day-rail dot. Give it a fixed `seed` so it's stable.
- **Animate the draw**: after the roughjs `<path>` is in the DOM, set `strokeDasharray = strokeDashoffset = path.getTotalLength()`, then transition `strokeDashoffset` to 0 over ~600ms once, on mount. (roughjs may emit multiple sub-paths — apply to each.)
- **Static form**: if `useReducedOrCoarse()`, skip the dash animation — render fully drawn.
- Redraw on resize so the underline keeps matching the phrase width.

- [ ] **Step 2: Attach it under "Oxford formal."**

In `LandingHero`'s `<h1>`, wrap the existing nowrap phrase so the mark can position under it:

```tsx
        <h1 className="text-3xl font-bold leading-tight tracking-tight sm:text-4xl">
          Find a seat at any{" "}
          <span className="relative whitespace-nowrap">
            Oxford formal.
            <HeadlineMark />
          </span>
        </h1>
```

`HeadlineMark` positions itself `absolute left-0 right-0 -bottom-1` (or similar) so it sits just under the phrase. The headline text is unchanged.

- [ ] **Step 3: Typecheck, lint, commit**

```bash
npx tsc --noEmit && npm run lint
git add components/landing/HeadlineMark.tsx components/landing/LandingHero.tsx
git commit -m "FEAT: Self-drawing accent underline on the hero headline"
```

- [ ] **Step 4: Report for controller verification**

Note the controller must confirm: the underline draws itself once under "Oxford formal." on load, wobbles like the roughjs doodles, tracks the phrase width on resize, and shows fully-drawn under reduced-motion.

---

### Task 5: Whole-landing verification (controller)

**Files:** none — controller performs this in the browser.

- All three effects on `/` logged out, at desktop and 375px.
- Reduced-motion (emulated): all three show their static forms, no animation, no console errors.
- Touch/coarse-pointer: static forms; no broken cursor.
- The app's working surfaces (`/?tab=browse`, a college page) are visually unchanged and scroll natively.
- No hydration warnings; lint at baseline; `npx tsc --noEmit` clean.

## Self-Review Notes

Spec coverage: shared canvas hook with reduced-motion/coarse detection (T1), paint-reveal block with reset-on-scroll and pre-revealed static form (T2), ambient spray with the measured contrast cap and static wash (T3), roughjs self-drawing underline reusing the SketchDot setup (T4), whole-page + reduced-motion + app-untouched verification (T5). The deferred pen-script word is explicitly not built. Nothing outside `components/landing/` and `lib/hooks/` is touched.
