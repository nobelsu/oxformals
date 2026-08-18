"use client";

import rough from "roughjs";
import { useEffect, useRef } from "react";
import { seedFrom } from "@/components/ui/SketchCard";

export type MountainRankVariant = "summit" | "ridge" | "foothill";

const RANK_LABELS: Record<1 | 2 | 3, string> = {
  1: "1st",
  2: "2nd",
  3: "3rd",
};

/** Summit (#1) card — primary fill; tokens in globals.css (--rank-summit-*). */
export const rankSummitSurface = "!bg-[var(--rank-summit-bg)]";

export const rankSummitEmphasis = "text-[var(--rank-summit-emphasis)]";

export const rankSummitScore = "text-[var(--rank-summit-score)]";

export const rankSummitMuted = "text-[var(--rank-summit-muted)]";

export const rankSummitDivider = "border-[var(--rank-summit-divider)]";

export const rankSummitStar =
  "[&_path]:fill-[var(--accent)] [&_path]:stroke-[var(--tag-ink)]";

/** Oxford academic honors: wreath (1st), shield (2nd), book (3rd). */
export function MountainRankIcon({
  variant,
  className = "",
}: {
  variant: MountainRankVariant;
  className?: string;
}) {
  const iconClass = `h-9 w-9 shrink-0 text-[var(--accent)] ${className}`;
  const stroke = {
    stroke: "currentColor",
    strokeWidth: 2.5,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };

  if (variant === "summit") {
    return (
      <svg viewBox="0 0 36 36" className={iconClass} fill="none" aria-hidden>
        <ellipse cx="18" cy="15" rx="12" ry="11" {...stroke} />
        <path d="M11 9 L8 11 L11 13" {...stroke} strokeWidth={2} />
        <path d="M9 15 L6 17 L9 19" {...stroke} strokeWidth={2} />
        <path d="M10 21 L7 23 L10 25" {...stroke} strokeWidth={2} />
        <path d="M25 9 L28 11 L25 13" {...stroke} strokeWidth={2} />
        <path d="M27 15 L30 17 L27 19" {...stroke} strokeWidth={2} />
        <path d="M26 21 L29 23 L26 25" {...stroke} strokeWidth={2} />
        <path
          d="M14 24 C14 24, 16 28, 18 28 C20 28, 22 24, 22 24"
          {...stroke}
          strokeWidth={2}
        />
        <path
          d="M15 27 L18 31 L21 27 Z"
          fill="currentColor"
          opacity="0.25"
          stroke="currentColor"
          strokeWidth={1.5}
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  if (variant === "ridge") {
    return (
      <svg viewBox="0 0 36 36" className={iconClass} fill="none" aria-hidden>
        <path
          d="M18 5 L28 9 L28 18 C28 24, 24 28, 18 31 C12 28, 8 24, 8 18 L8 9 Z"
          fill="currentColor"
          fillOpacity={0.12}
          {...stroke}
        />
        <path d="M11 11 L25 25" {...stroke} />
        <path
          d="M18 13 L18 23 M13 18 L23 18"
          {...stroke}
          strokeWidth={2}
          opacity={0.45}
        />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 36 36" className={iconClass} fill="none" aria-hidden>
      <path d="M6 28 L18 9 L30 28 Z" fill="currentColor" fillOpacity={0.1} />
      <path d="M6 28 L18 9 L30 28" {...stroke} />
      <path d="M18 9 L18 28" {...stroke} />
      <path d="M6 28 L30 28" {...stroke} />
      <path d="M10 20 L16 20" {...stroke} strokeWidth={2} opacity={0.4} />
      <path d="M10 24 L15 24" {...stroke} strokeWidth={2} opacity={0.35} />
      <path d="M20 20 L26 20" {...stroke} strokeWidth={2} opacity={0.4} />
      <path d="M21 24 L26 24" {...stroke} strokeWidth={2} opacity={0.35} />
    </svg>
  );
}

export function RankBadge({
  rank,
  onSummitBg = false,
}: {
  rank: 1 | 2 | 3;
  onSummitBg?: boolean;
}) {
  const label = RANK_LABELS[rank];
  const isFirst = rank === 1;

  return (
    <span
      className={`inline-block w-fit shrink-0 rounded-full px-3 py-0.5 font-display text-xs uppercase tracking-widest ${
        isFirst && onSummitBg
          ? "border-[2px] border-[var(--tag-ink)] bg-[var(--tag-ink)] text-[var(--tag)]"
          : isFirst
            ? "bg-[var(--tag)] text-[var(--tag-ink)]"
            : rank === 2
              ? "border-[2px] border-[var(--ink)] bg-[var(--accent-wash)]/15 text-[var(--ink)]"
              : "border-[2px] border-[var(--ink)] bg-[var(--accent-wash)]/8 text-[var(--ink-muted)]"
      }`}
    >
      {label}
    </span>
  );
}

/** Front-mountain summit ridge — shared by silhouette + snow cap. */
const FRONT_SUMMIT = { x: 0.5, y: 0.02 };
const FRONT_LEFT_RIDGE = { x: 0.42, y: 0.38 };
const FRONT_RIGHT_RIDGE = { x: 0.58, y: 0.35 };
/** How far down the ridge lines the snow cap extends (overlap with peak). */
const SNOW_CAP_DEPTH = 0.2;

type MountainLayer = {
  points: (w: number, h: number) => [number, number][];
  fillWeight: number;
  roughness: number;
  seedOffset: number;
  className?: string;
};

function lerpPoint(
  a: [number, number],
  b: [number, number],
  t: number,
): [number, number] {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
}

const MOUNTAIN_LAYERS: MountainLayer[] = [
  {
    points: (w, h) => {
      const inset = 2;
      return [
        [inset, h - inset],
        [w * 0.12, h * 0.62],
        [w * 0.28, h * 0.38],
        [w * 0.42, h * 0.55],
        [w * 0.55, h * 0.32],
        [w * 0.68, h * 0.5],
        [w * 0.85, h * 0.4],
        [w - inset, h - inset],
      ];
    },
    fillWeight: 0.22,
    roughness: 2.4,
    seedOffset: 11,
    className: "rank-mountain-layer--back",
  },
  {
    points: (w, h) => {
      const inset = 4;
      return [
        [inset, h - inset],
        [w * 0.18, h * 0.5],
        [w * 0.3, h * 0.68],
        [w * FRONT_LEFT_RIDGE.x, h * FRONT_LEFT_RIDGE.y],
        [w * FRONT_SUMMIT.x, h * FRONT_SUMMIT.y],
        [w * FRONT_RIGHT_RIDGE.x, h * FRONT_RIGHT_RIDGE.y],
        [w * 0.7, h * 0.62],
        [w * 0.82, h * 0.34],
        [w - inset, h - inset],
      ];
    },
    fillWeight: 0.42,
    roughness: 2.3,
    seedOffset: 0,
    className: "rank-mountain-layer--front",
  },
];

function snowCapPoints(width: number, height: number): [number, number][] {
  const peak: [number, number] = [
    width * FRONT_SUMMIT.x,
    height * FRONT_SUMMIT.y,
  ];
  const leftRidge: [number, number] = [
    width * FRONT_LEFT_RIDGE.x,
    height * FRONT_LEFT_RIDGE.y,
  ];
  const rightRidge: [number, number] = [
    width * FRONT_RIGHT_RIDGE.x,
    height * FRONT_RIGHT_RIDGE.y,
  ];
  const leftBase = lerpPoint(peak, leftRidge, SNOW_CAP_DEPTH);
  const rightBase = lerpPoint(peak, rightRidge, SNOW_CAP_DEPTH);
  return [peak, rightBase, leftBase];
}

function appendSnowCap(
  svg: SVGSVGElement,
  width: number,
  height: number,
  strokeWidth: number,
) {
  const points = snowCapPoints(width, height);
  const snowG = document.createElementNS("http://www.w3.org/2000/svg", "g");
  snowG.setAttribute("class", "rank-mountain-layer--snow");

  const poly = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
  poly.setAttribute(
    "points",
    points.map(([x, y]) => `${x},${y}`).join(" "),
  );
  poly.setAttribute("fill", "currentColor");
  poly.setAttribute("stroke", "currentColor");
  poly.setAttribute("stroke-width", String(strokeWidth));
  poly.setAttribute("stroke-linejoin", "round");
  poly.setAttribute("stroke-linecap", "round");

  snowG.appendChild(poly);
  svg.appendChild(snowG);
}

export function MountainSilhouette({ className = "" }: { className?: string }) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const baseSeed = seedFrom("rankings-mountain");

  useEffect(() => {
    const host = hostRef.current;
    const svg = svgRef.current;
    if (!host || !svg) return;

    let frame = 0;
    const strokeWidth = 2;
    const bowing = 1.6;

    const draw = () => {
      if (!host || !svg) return;
      const { width, height } = host.getBoundingClientRect();
      if (width === 0 || height === 0) return;

      svg.setAttribute("width", String(width));
      svg.setAttribute("height", String(height));
      svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
      while (svg.firstChild) svg.removeChild(svg.firstChild);

      const rc = rough.svg(svg);

      for (const layer of MOUNTAIN_LAYERS) {
        const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
        if (layer.className) g.setAttribute("class", layer.className);
        const points = layer.points(width, height);
        const node = rc.polygon(
          points.map(([x, y]) => [x, y]),
          {
            stroke: "currentColor",
            strokeWidth,
            roughness: layer.roughness,
            bowing,
            seed: baseSeed + layer.seedOffset,
            fill: "currentColor",
            fillStyle: "solid",
            fillWeight: layer.fillWeight,
            preserveVertices: true,
          },
        );
        g.appendChild(node);
        svg.appendChild(g);
      }

      appendSnowCap(svg, width, height, strokeWidth);
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
  }, [baseSeed]);

  return (
    <div
      ref={hostRef}
      className={`rank-mountain-silhouette pointer-events-none relative -mt-8 h-40 w-full text-[var(--rank-mountain-fill)] md:-mt-[4.5rem] md:h-44 lg:-mt-20 lg:h-48 ${className}`}
      aria-hidden
    >
      <svg ref={svgRef} className="absolute inset-0 h-full w-full" />
    </div>
  );
}

export function MountainTrail({ className = "" }: { className?: string }) {
  return (
    <div
      className={`flex justify-center py-2 md:hidden ${className}`}
      aria-hidden
    >
      <svg
        viewBox="0 0 48 56"
        className="h-14 w-12 text-[var(--rank-mountain-fill)]"
        fill="none"
      >
        <path
          d="M8 48 L8 38 L20 30 L20 18 L36 10 L36 4"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray="5 4"
          opacity="0.85"
        />
        <path
          d="M32 8 L36 4 L40 8 L36 10 Z"
          fill="currentColor"
          opacity="0.5"
        />
        <path
          d="M16 26 L20 22 L24 26 L20 28 Z"
          fill="currentColor"
          opacity="0.35"
        />
        <path
          d="M4 50 L44 50"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          opacity="0.4"
        />
      </svg>
    </div>
  );
}

/** Compact peak accent above summit card on mobile. */
export function SummitPeakAccent({ className = "" }: { className?: string }) {
  return (
    <div
      className={`flex justify-center pb-1 md:hidden ${className}`}
      aria-hidden
    >
      <svg
        viewBox="0 0 64 24"
        className="h-6 w-16 text-[var(--rank-mountain-fill)] opacity-80"
        fill="none"
      >
        <path
          d="M4 20 L20 8 L32 20 L44 6 L60 20"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M40 6 L44 2 L48 6 L44 8 Z"
          fill="currentColor"
          opacity="0.45"
        />
      </svg>
    </div>
  );
}

export function rankMountainVariant(rank: number): MountainRankVariant {
  if (rank === 1) return "summit";
  if (rank === 2) return "ridge";
  return "foothill";
}
