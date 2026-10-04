"use client";

import rough from "roughjs";
import { useEffect, useRef } from "react";

type Props = {
  /** Stable per day group so the wobble does not change between renders. */
  seed?: number;
  /** Box size in px. */
  size?: number;
  className?: string;
};

/**
 * Hand-drawn circle used as the day marker on the listing rail. One instance
 * per day group, never per row — roughjs redraws on every resize tick.
 */
export function SketchDot({ seed = 1, size = 14, className = "" }: Props) {
  const svgRef = useRef<SVGSVGElement | null>(null);

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;

    while (svg.firstChild) svg.removeChild(svg.firstChild);

    const rc = rough.svg(svg);
    svg.appendChild(
      rc.circle(size / 2, size / 2, size - 4, {
        stroke: "currentColor",
        strokeWidth: 2,
        roughness: 1.6,
        bowing: 1.4,
        seed: Math.abs(seed) || 1,
        fill: "none",
      }),
    );
  }, [seed, size]);

  // SVG fill is a presentation attribute, not CSS — roughjs writes the fill
  // string straight into the attribute, where var() is never substituted.
  // So the knockout disc behind the stroke is a plain CSS-backed element
  // instead: background-color resolves var(--bg) correctly, and needs no
  // JS colour resolution at draw time.
  return (
    <span
      className={`relative inline-block ${className}`}
      style={{ width: size, height: size }}
      aria-hidden
    >
      <span
        className="absolute rounded-full bg-[var(--bg)]"
        style={{ inset: 2 }}
      />
      <svg
        ref={svgRef}
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="absolute inset-0"
      />
    </span>
  );
}
