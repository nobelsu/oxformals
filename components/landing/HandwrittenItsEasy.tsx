"use client";

import { useEffect, useRef, useState, useCallback } from "react";

/**
 * "it's that easy." with a stroke-dashoffset handwriting reveal that mirrors
 * the mobile app's splash animation. Uses the actual display font so the
 * letterforms match perfectly. `progress` (0→1) scrubs the drawing.
 */

const TEXT = "it's that easy.";

export function HandwrittenItsEasy({ progress }: { progress: number }) {
  const textRef = useRef<SVGTextElement | null>(null);
  const [length, setLength] = useState(0);

  const measure = useCallback(() => {
    const el = textRef.current;
    if (!el) return;
    const l = el.getComputedTextLength();
    if (l > 0) setLength(l);
  }, []);

  useEffect(() => {
    measure();
    // Retry until font loads
    if (!length) {
      const id = setInterval(() => {
        measure();
      }, 80);
      return () => clearInterval(id);
    }
  }, [measure, length]);

  const offset = length * (1 - progress);
  const fillOpacity = Math.min(1, Math.max(0, (progress - 0.6) / 0.4));

  return (
    <svg
      viewBox="0 0 100 20"
      className="w-[clamp(280px,75vw,720px)]"
      aria-label="it's that easy."
    >
      <text
        ref={textRef}
        x="50"
        y="16"
        textAnchor="middle"
        className="font-display"
        style={{
          fontSize: "14px",
          fill: "var(--accent)",
          fillOpacity,
          stroke: "var(--accent)",
          strokeWidth: 0.3,
          strokeLinecap: "round",
          strokeLinejoin: "round",
          strokeDasharray: length || undefined,
          strokeDashoffset: length ? offset : undefined,
          transition: "fill-opacity 0.15s ease-out",
        }}
      >
        {TEXT}
      </text>
    </svg>
  );
}
