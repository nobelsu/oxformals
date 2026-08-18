"use client";

import rough from "roughjs";
import { useEffect, useRef } from "react";
import { useReducedOrCoarse } from "@/lib/hooks/usePaintCanvas";

const HEIGHT = 14; // SVG box height in px; the wobble lives in the lower half.
const SEED = 7; // fixed so the hand-drawn wobble is stable across redraws.

/**
 * A hand-drawn roughjs underline that draws itself once, under the phrase it
 * wraps. Sits absolutely beneath its positioned parent (give the parent
 * `relative`), tracks the parent's width via ResizeObserver, and animates the
 * stroke on first mount via stroke-dashoffset. Decorative only (`aria-hidden`).
 *
 * Under prefers-reduced-motion / coarse pointers it renders fully drawn with no
 * animation.
 */
export function HeadlineMark() {
  const skip = useReducedOrCoarse();
  const svgRef = useRef<SVGSVGElement | null>(null);
  const drawnRef = useRef(false);

  useEffect(() => {
    const svg = svgRef.current;
    const parent = svg?.parentElement;
    if (!svg || !parent) return;

    const draw = () => {
      const width = Math.round(parent.getBoundingClientRect().width);
      if (width <= 0) return;

      while (svg.firstChild) svg.removeChild(svg.firstChild);
      svg.setAttribute("width", String(width));
      svg.setAttribute("viewBox", `0 0 ${width} ${HEIGHT}`);

      const rc = rough.svg(svg);
      // A left-to-right stroke across the phrase, riding the lower third.
      const node = rc.line(1, HEIGHT - 5, width - 1, HEIGHT - 6, {
        stroke: "currentColor",
        strokeWidth: 2.5,
        roughness: 1.4,
        bowing: 1.6,
        seed: SEED,
      });
      svg.appendChild(node);

      // Animate the draw once, the first time we have a real width. roughjs
      // emits <path> children; dash each so it strokes on.
      const animate = !skip && !drawnRef.current;
      if (animate) drawnRef.current = true;
      node.querySelectorAll("path").forEach((path) => {
        const len = path.getTotalLength();
        if (!animate) {
          path.style.strokeDasharray = "none";
          path.style.strokeDashoffset = "0";
          return;
        }
        path.style.strokeDasharray = String(len);
        path.style.strokeDashoffset = String(len);
        path.style.transition = "stroke-dashoffset 620ms ease-out";
        // next frame, release to 0 so the transition runs
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            path.style.strokeDashoffset = "0";
          });
        });
      });
    };

    draw();
    const ro = new ResizeObserver(draw);
    ro.observe(parent);
    return () => ro.disconnect();
  }, [skip]);

  return (
    <svg
      ref={svgRef}
      aria-hidden
      height={HEIGHT}
      viewBox={`0 0 100 ${HEIGHT}`}
      preserveAspectRatio="none"
      className="pointer-events-none absolute left-0 top-full text-[var(--accent)]"
    />
  );
}
