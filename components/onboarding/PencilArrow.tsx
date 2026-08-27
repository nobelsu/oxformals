"use client";

import rough from "roughjs";
import { useEffect, useRef } from "react";

type Point = { x: number; y: number };

type Props = {
  from: Point;
  to: Point;
  seed?: number;
};

function prefersReducedMotion(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function PencilArrow({ from, to, seed = 5 }: Props) {
  const svgRef = useRef<SVGSVGElement | null>(null);

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;

    const reduced = prefersReducedMotion();
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const cx = (from.x + to.x) / 2 + Math.max(-80, Math.min(80, -dy * 0.18));
    const cy = (from.y + to.y) / 2 + Math.max(-80, Math.min(80, dx * 0.12));
    const angle = Math.atan2(to.y - cy, to.x - cx);
    const head = 16;
    const left = {
      x: to.x + Math.cos(angle + Math.PI * 0.82) * head,
      y: to.y + Math.sin(angle + Math.PI * 0.82) * head,
    };
    const right = {
      x: to.x + Math.cos(angle - Math.PI * 0.82) * head,
      y: to.y + Math.sin(angle - Math.PI * 0.82) * head,
    };

    while (svg.firstChild) svg.removeChild(svg.firstChild);
    const rc = rough.svg(svg);
    const options = {
      stroke: "currentColor",
      strokeWidth: 2.4,
      roughness: reduced ? 0.4 : 1.8,
      bowing: reduced ? 0.4 : 2.2,
      seed,
      preserveVertices: true,
    };

    svg.appendChild(
      rc.path(`M ${from.x} ${from.y} Q ${cx} ${cy} ${to.x} ${to.y}`, options),
    );
    svg.appendChild(
      rc.linearPath(
        [
          [left.x, left.y],
          [to.x, to.y],
          [right.x, right.y],
        ],
        options,
      ),
    );
  }, [from.x, from.y, to.x, to.y, seed]);

  return (
    <svg
      ref={svgRef}
      className="pointer-events-none absolute inset-0 h-full w-full text-[var(--accent)]"
      aria-hidden
    />
  );
}
