"use client";

import { useCallback, useEffect, useRef } from "react";
import { useCanvasDpr, useReducedOrCoarse } from "@/lib/hooks/usePaintCanvas";

const TAGLINE = "find your next formal";

/** Reveal-brush radius (cursor wipes to the layer beneath) in CSS px. */
const REVEAL_RADIUS = 66;

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

function wrapLines(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (current && ctx.measureText(candidate).width > maxWidth) {
      lines.push(current);
      current = word;
    } else {
      current = candidate;
    }
  }
  if (current) lines.push(current);
  return lines;
}

/**
 * Full-bleed closing panel that recolours the whole viewport (Studio Marrone
 * style) and doubles as a scratch-card. It breaks out of the page's max-width
 * column and pins (`position: sticky`) over a tall runway, so scrolling off the
 * last Sand section pulls it up and the rose page rises to fill the screen.
 *
 * On the rose page the tagline is visible; moving the cursor over it paints the
 * flip — the veil wipes away under the cursor to reveal the same words beneath in
 * a different colour on a different ground, so the colour follows the pointer.
 *
 * The flip is a mouse affordance. Under reduced motion / coarse pointers the
 * panel is a plain, fully-legible rose page — no canvas, no listeners, and fully
 * scrollable (so touch visitors can always scroll past the pinned runway).
 */
export function SprayFinale() {
  const skip = useReducedOrCoarse();

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const textRef = useRef<HTMLParagraphElement | null>(null);
  const cursorRef = useRef<HTMLSpanElement | null>(null);

  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const dprRef = useRef(1);
  const lastRef = useRef<{ x: number; y: number } | null>(null);
  const downRef = useRef(false);
  // Resolved once we're client-side; the veil stays undrawn until then.
  const coverRef = useRef<[number, number, number] | null>(null);
  const inkRef = useRef("");

  // Paint the veil: fill it with the cover colour and letter the tagline onto it
  // in the ink colour, positioned to sit exactly over the DOM tagline beneath.
  const drawVeil = useCallback(
    (ctx: CanvasRenderingContext2D, w: number, h: number, dpr: number) => {
      const cover = coverRef.current;
      const textEl = textRef.current;
      const canvas = canvasRef.current;
      if (!cover || !inkRef.current || !textEl || !canvas) return;

      ctx.globalCompositeOperation = "source-over";
      ctx.fillStyle = `rgb(${cover[0]}, ${cover[1]}, ${cover[2]})`;
      ctx.fillRect(0, 0, w, h);

      const cs = getComputedStyle(textEl);
      const fontSize = parseFloat(cs.fontSize);
      const lineHeight =
        cs.lineHeight === "normal" ? fontSize * 0.9 : parseFloat(cs.lineHeight);
      ctx.font = `${cs.fontStyle} ${cs.fontWeight} ${fontSize * dpr}px ${cs.fontFamily}`;
      ctx.fillStyle = inkRef.current;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      const maxW = textEl.clientWidth * dpr;
      const lines = wrapLines(ctx, TAGLINE, maxW);
      const rect = textEl.getBoundingClientRect();
      const cr = canvas.getBoundingClientRect();
      const cx = (rect.left - cr.left + rect.width / 2) * dpr;
      const cy = (rect.top - cr.top + rect.height / 2) * dpr;
      const lh = lineHeight * dpr;
      const total = lines.length * lh;
      lines.forEach((line, i) =>
        ctx.fillText(line, cx, cy - total / 2 + lh / 2 + i * lh),
      );
    },
    [],
  );

  const handleResize = useCallback(
    (ctx: CanvasRenderingContext2D, w: number, h: number, dpr: number) => {
      ctxRef.current = ctx;
      dprRef.current = dpr;
      drawVeil(ctx, w, h, dpr);
    },
    [drawVeil],
  );

  useCanvasDpr(canvasRef, handleResize);

  // Resolve colours (and wait for the display font) client-side, then lay the
  // initial veil down so the tagline shows before any interaction.
  useEffect(() => {
    if (skip) return;
    const root = getComputedStyle(document.documentElement);
    coverRef.current = parseHexColor(root.getPropertyValue("--accent"));
    inkRef.current = root.getPropertyValue("--tag-ink").trim();
    let cancelled = false;
    const draw = () => {
      const canvas = canvasRef.current;
      const ctx = ctxRef.current;
      if (!cancelled && canvas && ctx && canvas.width > 0) {
        drawVeil(ctx, canvas.width, canvas.height, dprRef.current);
      }
    };
    draw();
    document.fonts.ready.then(draw);
    return () => {
      cancelled = true;
    };
  }, [skip, drawVeil]);

  // Re-veil once the panel scrolls out, so re-entering shows the tagline again.
  useEffect(() => {
    if (skip) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) return;
        const ctx = ctxRef.current;
        if (ctx) drawVeil(ctx, canvas.width, canvas.height, dprRef.current);
        lastRef.current = null;
      },
      { threshold: 0 },
    );
    io.observe(canvas);
    return () => io.disconnect();
  }, [skip, drawVeil]);

  // Global pointerup so a drag that ends outside the panel still stops.
  useEffect(() => {
    if (skip) return;
    const up = () => {
      downRef.current = false;
      lastRef.current = null;
    };
    window.addEventListener("pointerup", up);
    return () => window.removeEventListener("pointerup", up);
  }, [skip]);

  const toDeviceXY = useCallback((clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const dpr = dprRef.current;
    return { x: (clientX - rect.left) * dpr, y: (clientY - rect.top) * dpr };
  }, []);

  // Reveal: erase the veil with a soft brush, uncovering the layer beneath.
  const reveal = useCallback((clientX: number, clientY: number) => {
    const ctx = ctxRef.current;
    const p = toDeviceXY(clientX, clientY);
    if (!ctx || !p) return;
    const radius = REVEAL_RADIUS * dprRef.current;
    const stamp = (x: number, y: number) => {
      const g = ctx.createRadialGradient(x, y, 0, x, y, radius);
      g.addColorStop(0, "rgba(0, 0, 0, 1)");
      g.addColorStop(0.6, "rgba(0, 0, 0, 1)");
      g.addColorStop(1, "rgba(0, 0, 0, 0)");
      ctx.globalCompositeOperation = "destination-out";
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();
    };
    const last = lastRef.current;
    if (last) {
      const dist = Math.hypot(p.x - last.x, p.y - last.y);
      const steps = Math.max(1, Math.round(dist / (radius / 2)));
      for (let i = 1; i <= steps; i++) {
        const t = i / steps;
        stamp(last.x + (p.x - last.x) * t, last.y + (p.y - last.y) * t);
      }
    } else {
      stamp(p.x, p.y);
    }
    lastRef.current = p;
  }, [toDeviceXY]);

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLElement>) => {
      const ring = cursorRef.current;
      if (ring) {
        ring.style.left = `${e.clientX}px`;
        ring.style.top = `${e.clientY}px`;
      }
      if (e.pointerType === "mouse" || downRef.current) {
        reveal(e.clientX, e.clientY);
      }
    },
    [reveal],
  );

  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLElement>) => {
      downRef.current = true;
      reveal(e.clientX, e.clientY);
    },
    [reveal],
  );

  const handlePointerEnter = useCallback(() => {
    if (cursorRef.current) cursorRef.current.style.opacity = "1";
  }, []);

  const handlePointerLeave = useCallback(() => {
    if (cursorRef.current) cursorRef.current.style.opacity = "0";
    lastRef.current = null;
  }, []);

  const taglineClass =
    "max-w-[13ch] text-center font-display text-[clamp(3.5rem,13vw,9rem)] font-bold lowercase leading-[0.88] tracking-tight";

  if (skip) {
    return (
      <section
        aria-label="Find your next formal"
        className="relative h-[170svh] w-full"
      >
        <div className="sticky top-0 flex h-svh items-center justify-center overflow-hidden bg-[var(--accent)] px-6">
          <p className={`${taglineClass} text-[var(--tag-ink)]`}>{TAGLINE}</p>
        </div>
      </section>
    );
  }

  return (
    <section
      aria-label="Find your next formal"
      className="relative h-[170svh] w-full"
    >
      <div
        className="sticky top-0 h-svh cursor-none touch-none select-none overflow-hidden"
        onPointerMove={handlePointerMove}
        onPointerDown={handlePointerDown}
        onPointerEnter={handlePointerEnter}
        onPointerLeave={handlePointerLeave}
      >
        {/* Layer beneath the veil: the reveal state (different colour + ground). */}
        <div className="absolute inset-0 flex items-center justify-center bg-[var(--bg)] px-6">
          <p ref={textRef} className={`${taglineClass} text-[var(--accent)]`}>
            {TAGLINE}
          </p>
        </div>
        {/* The veil: cover colour + tagline, sprayed over on hover, wiped on drag. */}
        <canvas
          ref={canvasRef}
          aria-hidden
          className="absolute inset-0 block h-full w-full"
        />
        <span
          ref={cursorRef}
          aria-hidden
          className="pointer-events-none fixed left-0 top-0 z-50 -translate-x-1/2 -translate-y-1/2 rounded-full border-[1.5px] border-[var(--tag-ink)] opacity-0 [mix-blend-mode:difference] [transition:opacity_.2s]"
          style={{ width: REVEAL_RADIUS * 2, height: REVEAL_RADIUS * 2 }}
        />
      </div>
    </section>
  );
}
