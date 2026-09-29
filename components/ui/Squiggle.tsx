"use client";

import { useEffect, useRef, useState } from "react";
import { usePrefersReducedMotion } from "@/lib/hooks/usePaintCanvas";

/**
 * A hand-drawn accent squiggle under a key word or phrase, drawn in the first
 * time it scrolls into view. Wrap the words in a `relative inline-block` span
 * and put this inside it. `bumps` sets how many waves it has, so longer
 * phrases don't get one stretched-out wave.
 */
export function Squiggle({
  bumps = 3,
  delayMs = 150,
}: {
  bumps?: number;
  delayMs?: number;
}) {
  const wrapRef = useRef<HTMLSpanElement>(null);
  const pathRef = useRef<SVGPathElement>(null);
  const reduced = usePrefersReducedMotion();
  const [drawn, setDrawn] = useState(false);
  const [length, setLength] = useState(0);

  useEffect(() => {
    const path = pathRef.current;
    if (path) setLength(path.getTotalLength());
  }, [bumps]);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el || drawn) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        io.disconnect();
        window.setTimeout(() => setDrawn(true), reduced ? 0 : delayMs);
      },
      { threshold: 0.6 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [drawn, delayMs, reduced]);

  return (
    <span
      ref={wrapRef}
      aria-hidden
      className="pointer-events-none absolute inset-x-[-0.07em] bottom-[-0.12em] block h-[0.5em]"
    >
      <svg
        className="h-full w-full overflow-visible"
        viewBox="0 0 100 12"
        preserveAspectRatio="none"
      >
        <path
          ref={pathRef}
          d={squigglePath(bumps)}
          fill="none"
          stroke="var(--accent)"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={
            length
              ? {
                  strokeDasharray: length,
                  strokeDashoffset: drawn ? 0 : length,
                  transition: reduced
                    ? "none"
                    : "stroke-dashoffset 900ms cubic-bezier(0.33, 1, 0.68, 1)",
                }
              : { opacity: 0 }
          }
        />
      </svg>
    </span>
  );
}

/** A slightly irregular wave across the 0–100 viewBox. */
function squigglePath(bumps: number): string {
  const n = Math.max(1, Math.round(bumps));
  const step = 100 / n;
  let d = "M0 8";
  for (let i = 0; i < n; i++) {
    const x0 = i * step;
    // Alternate the crest height a little so it reads hand-drawn.
    const hi = i % 2 === 0 ? 2 : 3.5;
    const lo = i % 2 === 0 ? 11 : 10;
    d += ` C${(x0 + step * 0.3).toFixed(1)} ${hi}, ${(x0 + step * 0.6).toFixed(1)} ${lo}, ${(x0 + step).toFixed(1)} ${i % 2 === 0 ? 6 : 8}`;
  }
  return d;
}
