"use client";

import { useCallback, useEffect, useRef } from "react";
import { useCanvasDpr, useReducedOrCoarse } from "@/lib/hooks/usePaintCanvas";

/** Brush radius in CSS px (device-px radius = this * dpr). Fixed, no controls. */
const BRUSH_RADIUS = 64;

/** Soft radial-alpha erase: opaque centre feathering to transparent at the edge. */
function featherErase(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
) {
  const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
  gradient.addColorStop(0, "rgba(0, 0, 0, 1)");
  gradient.addColorStop(0.65, "rgba(0, 0, 0, 1)");
  gradient.addColorStop(1, "rgba(0, 0, 0, 0)");
  ctx.globalCompositeOperation = "destination-out";
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();
}

const TAGLINE = "find your next formal";

/**
 * Decorative bottom-of-page block: a rose reveal field with a tagline, hidden
 * under a Sand veil that the pointer wipes away with a soft painterly brush.
 * Falls back to the fully-revealed static field under reduced motion / touch,
 * which is also what the very first paint (server + pre-hydration) shows,
 * since the veil canvas starts out unfilled until effects run.
 */
export function PaintReveal() {
  const skip = useReducedOrCoarse();

  const sectionRef = useRef<HTMLElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const cursorRef = useRef<HTMLSpanElement | null>(null);

  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const dprRef = useRef(1);
  const lastRef = useRef<{ x: number; y: number } | null>(null);
  const downRef = useRef(false);
  // Empty until the token-read effect resolves it; fill() no-ops until then,
  // leaving the canvas transparent (reveal showing through) rather than
  // guessing at a colour.
  const sandRef = useRef("");

  const fill = useCallback(
    (ctx: CanvasRenderingContext2D, w: number, h: number) => {
      if (!sandRef.current) return;
      ctx.globalCompositeOperation = "source-over";
      ctx.fillStyle = sandRef.current;
      ctx.fillRect(0, 0, w, h);
    },
    [],
  );

  const handleResize = useCallback(
    (ctx: CanvasRenderingContext2D, w: number, h: number, dpr: number) => {
      ctxRef.current = ctx;
      dprRef.current = dpr;
      fill(ctx, w, h);
    },
    [fill],
  );

  useCanvasDpr(canvasRef, handleResize);

  // Read the Sand token once we're client-side and can resolve CSS vars; canvas
  // fillStyle needs a concrete colour, not a var() reference.
  useEffect(() => {
    if (skip) return;
    const value = getComputedStyle(document.documentElement)
      .getPropertyValue("--bg")
      .trim();
    if (value) sandRef.current = value;
    const canvas = canvasRef.current;
    const ctx = ctxRef.current;
    if (canvas && ctx && canvas.width > 0) fill(ctx, canvas.width, canvas.height);
  }, [skip, fill]);

  // Reset: re-fill the veil once the block scrolls out of view.
  useEffect(() => {
    if (skip) return;
    const section = sectionRef.current;
    if (!section) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) return;
        const canvas = canvasRef.current;
        const ctx = ctxRef.current;
        if (canvas && ctx) fill(ctx, canvas.width, canvas.height);
        lastRef.current = null;
      },
      { threshold: 0 },
    );
    io.observe(section);
    return () => io.disconnect();
  }, [skip, fill]);

  // Global pointerup so a drag that ends outside the block still stops.
  useEffect(() => {
    if (skip) return;
    const handlePointerUp = () => {
      downRef.current = false;
      lastRef.current = null;
    };
    window.addEventListener("pointerup", handlePointerUp);
    return () => window.removeEventListener("pointerup", handlePointerUp);
  }, [skip]);

  const paint = useCallback((clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    const ctx = ctxRef.current;
    if (!canvas || !ctx) return;
    const rect = canvas.getBoundingClientRect();
    const dpr = dprRef.current;
    const x = (clientX - rect.left) * dpr;
    const y = (clientY - rect.top) * dpr;
    const radius = BRUSH_RADIUS * dpr;
    const last = lastRef.current;
    if (last) {
      const distance = Math.hypot(x - last.x, y - last.y);
      const steps = Math.max(1, Math.round(distance / (radius / 2)));
      for (let i = 1; i <= steps; i++) {
        const t = i / steps;
        featherErase(ctx, last.x + (x - last.x) * t, last.y + (y - last.y) * t, radius);
      }
    } else {
      featherErase(ctx, x, y, radius);
    }
    lastRef.current = { x, y };
  }, []);

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLElement>) => {
      const cursor = cursorRef.current;
      if (cursor) {
        cursor.style.left = `${e.clientX}px`;
        cursor.style.top = `${e.clientY}px`;
      }
      if (e.pointerType === "mouse" || downRef.current) {
        paint(e.clientX, e.clientY);
      }
    },
    [paint],
  );

  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLElement>) => {
      downRef.current = true;
      lastRef.current = null;
      paint(e.clientX, e.clientY);
    },
    [paint],
  );

  const handlePointerEnter = useCallback(() => {
    const cursor = cursorRef.current;
    if (cursor) cursor.style.opacity = "1";
  }, []);

  const handlePointerLeave = useCallback(() => {
    const cursor = cursorRef.current;
    if (cursor) cursor.style.opacity = "0";
    lastRef.current = null;
  }, []);

  const tagline = (
    <p className="font-display text-[clamp(2rem,6vw,4rem)] leading-[0.95] lowercase tracking-wide text-[var(--tag-ink)]">
      {TAGLINE}
    </p>
  );

  if (skip) {
    return (
      <section className="relative mt-10 w-full overflow-hidden rounded-[16px] bg-[var(--accent)] [height:clamp(18rem,40vh,24rem)]">
        <div className="flex h-full w-full items-center justify-center px-6 text-center">
          {tagline}
        </div>
      </section>
    );
  }

  return (
    <section
      ref={sectionRef}
      className="relative mt-10 w-full touch-none select-none overflow-hidden rounded-[16px] bg-[var(--accent)] [height:clamp(18rem,40vh,24rem)] cursor-none"
      onPointerMove={handlePointerMove}
      onPointerDown={handlePointerDown}
      onPointerEnter={handlePointerEnter}
      onPointerLeave={handlePointerLeave}
    >
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center px-6 text-center">
        {tagline}
      </div>
      <canvas ref={canvasRef} aria-hidden className="absolute inset-0 block h-full w-full" />
      <span
        ref={cursorRef}
        aria-hidden
        className="pointer-events-none fixed left-0 top-0 z-50 -translate-x-1/2 -translate-y-1/2 rounded-full border-[1.5px] border-[var(--ink)] opacity-0 [mix-blend-mode:difference] [transition:opacity_.2s]"
        style={{ width: BRUSH_RADIUS * 2, height: BRUSH_RADIUS * 2 }}
      />
    </section>
  );
}
