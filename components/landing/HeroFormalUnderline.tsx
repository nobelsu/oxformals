"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { usePrefersReducedMotion } from "@/lib/hooks/usePaintCanvas";

/** Spans the full viewBox width (0→100) with irregular bumps. */
const SQUIGGLE_PATH =
  "M0 8 C14 2, 26 11, 40 6 S58 2, 72 8 S86 4, 100 9";

const DRAW_DELAY_MS = 450;
const DRAW_DURATION_MS = 900;

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

export function HeroFormalUnderline() {
  const pathRef = useRef<SVGPathElement>(null);
  const [length, setLength] = useState(0);
  const [offset, setOffset] = useState<number | null>(null);
  const reduced = usePrefersReducedMotion();

  const measure = useCallback(() => {
    const path = pathRef.current;
    if (!path) return 0;
    const l = path.getTotalLength();
    if (l > 0) setLength(l);
    return l;
  }, []);

  useEffect(() => {
    measure();
    if (length) return;
    const id = window.setInterval(() => {
      if (measure() > 0) window.clearInterval(id);
    }, 50);
    return () => window.clearInterval(id);
  }, [measure, length]);

  useEffect(() => {
    if (!length) return;

    if (reduced) {
      setOffset(0);
      return;
    }

    setOffset(length);
    let raf = 0;
    const startAt = performance.now() + DRAW_DELAY_MS;

    const tick = (now: number) => {
      if (now < startAt) {
        raf = requestAnimationFrame(tick);
        return;
      }
      const t = Math.min(1, (now - startAt) / DRAW_DURATION_MS);
      setOffset(length * (1 - easeOutCubic(t)));
      if (t < 1) raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [length, reduced]);

  const dashOffset = offset ?? length;

  return (
    <span
      aria-hidden
      className="pointer-events-none absolute inset-x-[-0.07em] bottom-[-0.1em] block h-[0.55em]"
    >
      <svg
        className="h-full w-full overflow-visible"
        viewBox="0 0 100 12"
        preserveAspectRatio="none"
      >
        <path
          ref={pathRef}
          d={SQUIGGLE_PATH}
          fill="none"
          stroke="var(--accent)"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={
            length
              ? {
                  strokeDasharray: length,
                  strokeDashoffset: dashOffset,
                }
              : undefined
          }
        />
      </svg>
    </span>
  );
}
