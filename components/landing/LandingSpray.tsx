"use client";

import { useCallback, useEffect, useRef } from "react";
import { useReducedOrCoarse } from "@/lib/hooks/usePaintCanvas";

/** Spray cone radius in CSS px — the dab's soft core plus fine grain. */
const RADIUS = 54;
/** Fine grain flecks per dab — texture on top of the core, not the whole dab. */
const GRAIN_COUNT = 70;
/**
 * Alpha values are laid down *on the offscreen mask*. The mask may saturate to
 * fully opaque with no contrast risk — it is only ever composited onto the
 * visible canvas at `globalAlpha = ALPHA_CAP` (see the render step), so what the
 * user sees can never exceed the cap regardless of how hard they scribble.
 */
const CORE_ALPHA = 0.9;
/**
 * Hard ceiling on the visible wash alpha, from the contrast budget:
 * `--accent-wash` (#edbfba) is identical in light and dark, but `--ink` flips
 * (near-black light, near-cream dark), so dark mode binds — cream text over the
 * wash. At alpha 0.5 that ratio falls to ~4.16:1 (under 4.5:1); 0.35 leaves
 * headroom (~5.28:1 dark, ~13:1 light).
 *
 * This is enforced *by construction*: the mask is drawn onto the visible canvas
 * at exactly this globalAlpha, so `visible = mask · ALPHA_CAP ≤ ALPHA_CAP`. No
 * per-region accumulation grid, no gate that a wide speckle radius can escape.
 */
const ALPHA_CAP = 0.35;
/** Alpha erased from the mask each frame — the fade-out rate. */
const FADE_PER_FRAME = 0.035;
/** Frames of no new dab before the layer hard-clears itself and idles. */
const IDLE_CUTOFF = 150;

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
 * Grain is stamped onto an offscreen mask canvas, then each frame the mask is
 * composited onto the visible canvas at `globalAlpha = ALPHA_CAP` — capping the
 * visible wash below the 4.5:1 contrast floor (dark mode is the binding case)
 * no matter how densely the mask is scribbled. A `requestAnimationFrame` loop
 * fades the mask continuously but idles itself once the layer is empty, so an
 * untouched page burns no frames.
 *
 * Falls back to a single static CSS radial-gradient wash under
 * prefers-reduced-motion / coarse pointers — no canvas, no loop, no listeners.
 */
export function LandingSpray() {
  const skip = useReducedOrCoarse();

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const maskRef = useRef<HTMLCanvasElement | null>(null);
  const maskCtxRef = useRef<CanvasRenderingContext2D | null>(null);
  const dprRef = useRef(1);
  const lastRef = useRef<{ x: number; y: number } | null>(null);
  const washRef = useRef<[number, number, number] | null>(null);
  const rafRef = useRef<number | null>(null);
  /** Frames since the last dab; drives the fade-out-then-stop cutoff. */
  const idleFramesRef = useRef(0);

  // The render/fade loop: thin the mask a little each frame, repaint the visible
  // canvas from it at the capped alpha, and stop once the layer is empty.
  const tick = useCallback(function loop() {
    const ctx = ctxRef.current;
    const canvas = canvasRef.current;
    const mask = maskRef.current;
    const maskCtx = maskCtxRef.current;
    if (!ctx || !canvas || !mask || !maskCtx) {
      rafRef.current = null;
      return;
    }

    // Fade the mask.
    maskCtx.globalCompositeOperation = "destination-out";
    maskCtx.fillStyle = `rgba(0, 0, 0, ${FADE_PER_FRAME})`;
    maskCtx.fillRect(0, 0, mask.width, mask.height);
    maskCtx.globalCompositeOperation = "source-over";

    // Repaint the visible canvas from the mask, capped.
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.globalAlpha = ALPHA_CAP;
    ctx.drawImage(mask, 0, 0);
    ctx.globalAlpha = 1;

    idleFramesRef.current += 1;
    if (idleFramesRef.current > IDLE_CUTOFF) {
      maskCtx.clearRect(0, 0, mask.width, mask.height);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      rafRef.current = null;
      return;
    }
    rafRef.current = requestAnimationFrame(loop);
  }, []);

  const ensureLoop = useCallback(() => {
    idleFramesRef.current = 0;
    if (rafRef.current == null) rafRef.current = requestAnimationFrame(tick);
  }, [tick]);

  const stampAt = useCallback((cssX: number, cssY: number) => {
    const maskCtx = maskCtxRef.current;
    const rgb = washRef.current;
    if (!maskCtx || !rgb) return;

    const dpr = dprRef.current;
    const [r, g, b] = rgb;
    const x = cssX * dpr;
    const y = cssY * dpr;
    const radius = RADIUS * dpr;
    // A soft, solid-reading core so the spray is obvious — a smooth radial dab
    // that saturates the mask centre (which composites to the capped alpha) and
    // feathers to nothing at the rim.
    const grad = maskCtx.createRadialGradient(x, y, 0, x, y, radius);
    grad.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${CORE_ALPHA})`);
    grad.addColorStop(0.55, `rgba(${r}, ${g}, ${b}, ${CORE_ALPHA * 0.5})`);
    grad.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);
    maskCtx.fillStyle = grad;
    maskCtx.beginPath();
    maskCtx.arc(x, y, radius, 0, Math.PI * 2);
    maskCtx.fill();
    // Fine flecks over the core so it reads as spray, not a flat wash. Small and
    // dense (sqrt spreads them evenly by area) — texture, not chunky speckle.
    maskCtx.fillStyle = `rgba(${r}, ${g}, ${b}, ${CORE_ALPHA})`;
    for (let i = 0; i < GRAIN_COUNT; i++) {
      const rr = radius * Math.sqrt(Math.random());
      const ang = Math.random() * Math.PI * 2;
      const dotR = (Math.random() * 0.7 + 0.4) * dpr;
      maskCtx.beginPath();
      maskCtx.arc(x + Math.cos(ang) * rr, y + Math.sin(ang) * rr, dotR, 0, Math.PI * 2);
      maskCtx.fill();
    }
  }, []);

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

  // Size both canvases to the viewport (dpr-capped) and (re)read the token.
  useEffect(() => {
    if (skip) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctxRef.current = ctx;

    const mask = document.createElement("canvas");
    maskRef.current = mask;
    maskCtxRef.current = mask.getContext("2d");

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      dprRef.current = dpr;
      const w = Math.round(window.innerWidth * dpr);
      const h = Math.round(window.innerHeight * dpr);
      canvas.width = w;
      canvas.height = h;
      mask.width = w;
      mask.height = h;
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
