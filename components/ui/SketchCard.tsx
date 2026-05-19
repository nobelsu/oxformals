"use client";

import rough from "roughjs";
import { useEffect, useRef, type HTMLAttributes, type ReactNode } from "react";

type Props = HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
  seed?: number;
  padded?: boolean;
  roughness?: number;
  strokeWidth?: number;
};

// Renders an actual hand-drawn SVG rectangle behind its children using
// roughjs. The border wobbles authentically rather than being a smooth CSS
// border, which is what sells the "doodle" feel.
export function SketchCard({
  children,
  seed,
  padded = true,
  roughness = 2.2,
  strokeWidth = 2.5,
  className = "",
  style,
  ...rest
}: Props) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);

  const effectiveSeed = typeof seed === "number" ? Math.abs(seed) || 1 : 1;

  useEffect(() => {
    const host = hostRef.current;
    const svg = svgRef.current;
    if (!host || !svg) return;

    let frame = 0;

    const draw = () => {
      if (!host || !svg) return;
      const { width, height } = host.getBoundingClientRect();
      if (width === 0 || height === 0) return;

      svg.setAttribute("width", String(width));
      svg.setAttribute("height", String(height));
      svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
      while (svg.firstChild) svg.removeChild(svg.firstChild);

      const rc = rough.svg(svg);
      const inset = strokeWidth + 1;
      const node = rc.rectangle(
        inset,
        inset,
        Math.max(1, width - inset * 2),
        Math.max(1, height - inset * 2),
        {
          stroke: "currentColor",
          strokeWidth,
          roughness,
          bowing: 1.6,
          seed: effectiveSeed,
          fill: "none",
        },
      );
      svg.appendChild(node);
    };

    const schedule = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(draw);
    };

    schedule();
    const ro = new ResizeObserver(schedule);
    ro.observe(host);

    return () => {
      cancelAnimationFrame(frame);
      ro.disconnect();
    };
  }, [effectiveSeed, roughness, strokeWidth]);

  return (
    <div
      ref={hostRef}
      className={`relative flex flex-col bg-[var(--paper)] text-[var(--ink)] ${padded ? "p-5" : ""} ${className}`}
      style={style}
      {...rest}
    >
      <svg
        ref={svgRef}
        className="pointer-events-none absolute inset-0 overflow-visible"
        aria-hidden
      />
      <div className="relative flex min-h-0 min-w-0 flex-1 flex-col">
        {children}
      </div>
    </div>
  );
}

export function seedFrom(s: string): number {
  let hash = 0;
  for (let i = 0; i < s.length; i++) {
    hash = (hash * 31 + s.charCodeAt(i)) >>> 0;
  }
  return (hash % 10000) + 1;
}

/** Chunky offset hover for sketch cards inside a `group` wrapper. */
export const sketchCardBlockyHover =
  "transition-[transform,box-shadow] duration-200 ease-out group-hover:translate-x-3 group-hover:-translate-y-3 group-hover:shadow-[0_12px_26px_rgba(0,0,0,0.16)] group-focus-within:translate-x-3 group-focus-within:-translate-y-3 group-focus-within:shadow-[0_12px_26px_rgba(0,0,0,0.16)] group-focus-visible:translate-x-3 group-focus-visible:-translate-y-3 group-focus-visible:shadow-[0_12px_26px_rgba(0,0,0,0.16)]";
