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
        fill: "var(--bg)",
        fillStyle: "solid",
      }),
    );
  }, [seed, size]);

  return (
    <svg
      ref={svgRef}
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className={className}
      aria-hidden
    />
  );
}
