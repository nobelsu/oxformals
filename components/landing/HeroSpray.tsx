"use client";

import { useCallback, useEffect, useRef } from "react";
import { useCanvasDpr, useReducedOrCoarse } from "@/lib/hooks/usePaintCanvas";

/** Dab radius in CSS px (device-px radius = this * dpr). Soft and wide — an ambient wash, not a brush. */
const RADIUS = 130;
/** Alpha laid down per dab. Low, so overlapping passes build up gradually. */
const PER_DAB_ALPHA = 0.06;
/**
 * Hard ceiling on accumulated alpha in any one region. Derived from the
 * contrast budget: --accent-wash (#edbfba) is identical in light and dark
 * mode, but --ink flips from near-black (light) to near-cream (dark), so
 * dark mode is the binding case. At alpha 0.5 (the brief's starting figure)
 * ink-on-wash contrast in dark mode falls to ~4.16:1 — under the 4.5:1
 * floor. Solving for the exact break-even gives alpha ~0.47; 0.35 leaves
 * comfortable headroom, and even the worst-case one-dab overshoot to ~0.41
 * still measures ~5.28:1 in dark mode (light mode stays ~13:1 throughout).
 */
const ALPHA_CAP = 0.35;
/** CSS-px bucket size for the coarse accumulation grid used to enforce the cap. */
const CELL = 24;
/** Radius (CSS px) within which a dab's alpha is tracked against the cap. */
const CORE = RADIUS * 0.45;

function parseHexColor(value: string): [number, number, number] | null {
  const hex = value.trim().replace("#", "");
  if (hex.length === 3) {
    const r = parseInt(hex[0] + hex[0], 16);
    const g = parseInt(hex[1] + hex[1], 16);
    const b = parseInt(hex[2] + hex[2], 16);
    return [r, g, b];
  }
  if (hex.length === 6) {
    const r = parseInt(hex.slice(0, 2), 16);
    const g = parseInt(hex.slice(2, 4), 16);
    const b = parseInt(hex.slice(4, 6), 16);
    if ([r, g, b].some(Number.isNaN)) return null;
    return [r, g, b];
  }
  return null;
}

/**
 * Decorative layer behind the landing hero: a faint `--accent-wash` colour
 * wash that builds up under the pointer as it moves over the hero, like
 * watercolour pooling (soft translucent radial dabs, low alpha, source-over,
 * interpolated between samples — ported from the paintbrush prototype's
 * build-up brush). Ambient and subtle by design, unlike the overt
 * paint-reveal block at the bottom of the page.
 *
 * The canvas never intercepts input: it's `pointer-events-none`, and instead
 * of listening on itself it watches `window` for `pointermove` and only
 * paints when the pointer is within its own bounding rect. That means the
 * hero's CTAs and showcase stay fully clickable with no extra wiring in
 * `LandingHero` beyond placement.
 *
 * Falls back to a single static CSS radial-gradient wash under
 * prefers-reduced-motion / coarse pointers — no canvas, no listeners.
 */
export function HeroSpray() {
  const skip = useReducedOrCoarse();

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const dprRef = useRef(1);
  const lastRef = useRef<{ x: number; y: number } | null>(null);
  const washRgbRef = useRef<[number, number, number] | null>(null);
  // Coarse per-region accumulation estimate, keyed by "gridX,gridY", used
  // only to enforce ALPHA_CAP — not a pixel-accurate readback of the canvas.
  const accumRef = useRef<Map<string, number>>(new Map());

  const handleResize = useCallback(
    (ctx: CanvasRenderingContext2D, w: number, h: number, dpr: number) => {
      ctxRef.current = ctx;
      dprRef.current = dpr;
      ctx.clearRect(0, 0, w, h);
      accumRef.current.clear();
      lastRef.current = null;
    },
    [],
  );

  useCanvasDpr(canvasRef, handleResize);

  // Read the wash token once we're client-side; canvas gradients need
  // concrete r/g/b, not a var() reference.
  useEffect(() => {
    if (skip) return;
    const value = getComputedStyle(document.documentElement).getPropertyValue(
      "--accent-wash",
    );
    washRgbRef.current = parseHexColor(value);
  }, [skip]);

  // Cells (CSS-px grid, dpr-independent) within CORE of (cx, cy), each with
  // a 0..1 weight for how strongly this dab would land there.
  const cellsAround = useCallback((cx: number, cy: number) => {
    const cells: { key: string; weight: number }[] = [];
    const gx = Math.floor(cx / CELL);
    const gy = Math.floor(cy / CELL);
    const span = Math.ceil(CORE / CELL);
    for (let dy = -span; dy <= span; dy++) {
      for (let dx = -span; dx <= span; dx++) {
        const ccx = (gx + dx) * CELL + CELL / 2;
        const ccy = (gy + dy) * CELL + CELL / 2;
        const dist = Math.hypot(ccx - cx, ccy - cy);
        if (dist > CORE) continue;
        cells.push({ key: `${gx + dx},${gy + dy}`, weight: 1 - dist / CORE });
      }
    }
    return cells;
  }, []);

  const stampAt = useCallback(
    (cssX: number, cssY: number) => {
      const ctx = ctxRef.current;
      const rgb = washRgbRef.current;
      if (!ctx || !rgb) return;

      const cells = cellsAround(cssX, cssY);
      const maxAccum = cells.reduce(
        (m, c) => Math.max(m, accumRef.current.get(c.key) ?? 0),
        0,
      );
      // Region already at the contrast-safe ceiling: stay inert here.
      if (maxAccum >= ALPHA_CAP) return;

      const dpr = dprRef.current;
      const [r, g, b] = rgb;
      const x = cssX * dpr;
      const y = cssY * dpr;
      const radius = RADIUS * dpr;
      const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
      gradient.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${PER_DAB_ALPHA})`);
      gradient.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);
      ctx.globalCompositeOperation = "source-over";
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();

      for (const cell of cells) {
        const prev = accumRef.current.get(cell.key) ?? 0;
        const applied = PER_DAB_ALPHA * cell.weight;
        accumRef.current.set(cell.key, prev + (1 - prev) * applied);
      }
    },
    [cellsAround],
  );

  const paint = useCallback(
    (clientX: number, clientY: number) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const cssX = clientX - rect.left;
      const cssY = clientY - rect.top;
      const last = lastRef.current;
      if (last) {
        const distance = Math.hypot(cssX - last.x, cssY - last.y);
        const steps = Math.max(1, Math.round(distance / (RADIUS / 3)));
        for (let i = 1; i <= steps; i++) {
          const t = i / steps;
          stampAt(last.x + (cssX - last.x) * t, last.y + (cssY - last.y) * t);
        }
      } else {
        stampAt(cssX, cssY);
      }
      lastRef.current = { x: cssX, y: cssY };
    },
    [stampAt],
  );

  // Global pointermove: paint only while the pointer is actually over the
  // canvas's own rect, so no wiring is needed in the hero and clicks on the
  // hero's own content are never intercepted (the canvas is pointer-events:
  // none throughout).
  useEffect(() => {
    if (skip) return;
    const handleMove = (e: PointerEvent) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const within =
        e.clientX >= rect.left &&
        e.clientX <= rect.right &&
        e.clientY >= rect.top &&
        e.clientY <= rect.bottom;
      if (!within) {
        lastRef.current = null;
        return;
      }
      paint(e.clientX, e.clientY);
    };
    window.addEventListener("pointermove", handleMove);
    return () => window.removeEventListener("pointermove", handleMove);
  }, [skip, paint]);

  if (skip) {
    return (
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-0"
        style={{
          background:
            "radial-gradient(60% 60% at 50% 45%, var(--accent-wash) 0%, transparent 70%)",
          opacity: 0.22,
        }}
      />
    );
  }

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className="pointer-events-none absolute inset-0 z-0 block h-full w-full"
    />
  );
}
