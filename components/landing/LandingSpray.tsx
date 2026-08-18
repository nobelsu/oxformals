"use client";

import { useCallback, useEffect, useRef } from "react";
import { useReducedOrCoarse } from "@/lib/hooks/usePaintCanvas";

/** Dab radius in CSS px. Soft and wide — an ambient wash, not a brush. */
const RADIUS = 130;
/** Alpha laid down per dab. Low, so the trail is faint. */
const PER_DAB_ALPHA = 0.05;
/**
 * Per-region ceiling on accumulated alpha, from the contrast budget:
 * `--accent-wash` (#edbfba) is identical in light and dark, but `--ink` flips
 * (near-black light, near-cream dark), so dark mode binds. At alpha 0.5 the
 * ink-on-wash ratio falls to ~4.16:1 (under 4.5:1); 0.35 leaves headroom
 * (~5.28:1 dark, ~13:1 light). The continuous fade keeps accumulation well
 * below this in practice; the cap guards fast scribbling in one spot.
 */
const ALPHA_CAP = 0.35;
/** CSS-px bucket for the coarse accumulation grid that enforces the cap. */
const CELL = 24;
/** CSS-px radius within which a dab's alpha counts toward the cap. */
const CORE = RADIUS * 0.45;
/** Alpha subtracted from the whole canvas each frame — the fade rate. */
const FADE_PER_FRAME = 0.03;
/** Matching decay applied to the accumulation grid each frame. */
const ACCUM_DECAY = 0.05;

function parseHexColor(value: string): [number, number, number] | null {
  const hex = value.trim().replace("#", "");
  if (hex.length === 3) {
    return [0, 1, 2].map((i) => parseInt(hex[i] + hex[i], 16)) as [
      number,
      number,
      number,
    ];
  }
  if (hex.length === 6) {
    const rgb = [0, 2, 4].map((i) => parseInt(hex.slice(i, i + 2), 16));
    if (rgb.some(Number.isNaN)) return null;
    return rgb as [number, number, number];
  }
  return null;
}

/**
 * Decorative full-page layer: a faint `--accent-wash` spray that follows the
 * cursor anywhere on the landing page and dissipates a second or so behind it.
 * A fixed, viewport-sized canvas sits behind a `relative z-10` content wrapper
 * in `LandingPage`; it is `pointer-events: none` and watches `window` for
 * moves, so nothing on the page is ever blocked.
 *
 * A `requestAnimationFrame` loop fades the canvas continuously but idles itself
 * once the canvas is empty — an untouched page burns no frames. Per-region
 * accumulation is capped so text on the Sand ground stays above the 4.5:1
 * contrast floor (dark mode is the binding case).
 *
 * Falls back to a single static CSS radial-gradient wash under
 * prefers-reduced-motion / coarse pointers — no canvas, no loop, no listeners.
 */
export function LandingSpray() {
  const skip = useReducedOrCoarse();

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const dprRef = useRef(1);
  const lastRef = useRef<{ x: number; y: number } | null>(null);
  const washRef = useRef<[number, number, number] | null>(null);
  const accumRef = useRef<Map<string, number>>(new Map());
  const rafRef = useRef<number | null>(null);
  /** Frames since the last dab; drives the fade-out-then-stop cutoff. */
  const idleFramesRef = useRef(0);

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

  // The fade loop: subtract a little alpha from the whole canvas each frame,
  // decay the accumulation grid in step, and stop once nothing's left.
  const tick = useCallback(function loop() {
    const ctx = ctxRef.current;
    const canvas = canvasRef.current;
    if (!ctx || !canvas) {
      rafRef.current = null;
      return;
    }
    ctx.globalCompositeOperation = "destination-out";
    ctx.fillStyle = `rgba(0, 0, 0, ${FADE_PER_FRAME})`;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    for (const [key, value] of accumRef.current) {
      const next = value - ACCUM_DECAY;
      if (next <= 0.001) accumRef.current.delete(key);
      else accumRef.current.set(key, next);
    }

    idleFramesRef.current += 1;
    // destination-out fades multiplicatively (asymptotic to 0), so run long
    // enough that the darkest paint is visually gone, then hard-clear the
    // residue and stop — otherwise a faint ghost would linger forever.
    if (idleFramesRef.current > 150) {
      ctx.globalCompositeOperation = "source-over";
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      accumRef.current.clear();
      rafRef.current = null;
      return;
    }
    rafRef.current = requestAnimationFrame(loop);
  }, []);

  const ensureLoop = useCallback(() => {
    idleFramesRef.current = 0;
    if (rafRef.current == null) rafRef.current = requestAnimationFrame(tick);
  }, [tick]);

  const stampAt = useCallback(
    (cssX: number, cssY: number) => {
      const ctx = ctxRef.current;
      const rgb = washRef.current;
      if (!ctx || !rgb) return;

      const cells = cellsAround(cssX, cssY);
      const maxAccum = cells.reduce(
        (m, c) => Math.max(m, accumRef.current.get(c.key) ?? 0),
        0,
      );
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
      const last = lastRef.current;
      if (last) {
        const distance = Math.hypot(clientX - last.x, clientY - last.y);
        const steps = Math.max(1, Math.round(distance / (RADIUS / 3)));
        for (let i = 1; i <= steps; i++) {
          const t = i / steps;
          stampAt(last.x + (clientX - last.x) * t, last.y + (clientY - last.y) * t);
        }
      } else {
        stampAt(clientX, clientY);
      }
      lastRef.current = { x: clientX, y: clientY };
      ensureLoop();
    },
    [stampAt, ensureLoop],
  );

  // Size the fixed canvas to the viewport (dpr-capped) and (re)read the token.
  useEffect(() => {
    if (skip) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctxRef.current = ctx;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      dprRef.current = dpr;
      canvas.width = Math.round(window.innerWidth * dpr);
      canvas.height = Math.round(window.innerHeight * dpr);
      accumRef.current.clear();
      lastRef.current = null;
    };
    resize();
    washRef.current = parseHexColor(
      getComputedStyle(document.documentElement).getPropertyValue("--accent-wash"),
    );
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, [skip]);

  useEffect(() => {
    if (skip) return;
    const handleMove = (e: PointerEvent) => paint(e.clientX, e.clientY);
    window.addEventListener("pointermove", handleMove);
    return () => {
      window.removeEventListener("pointermove", handleMove);
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    };
  }, [skip, paint]);

  if (skip) {
    return (
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 z-0"
        style={{
          background:
            "radial-gradient(60% 50% at 50% 35%, var(--accent-wash) 0%, transparent 70%)",
          opacity: 0.2,
        }}
      />
    );
  }

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className="pointer-events-none fixed inset-0 z-0 block h-screen w-screen"
    />
  );
}
