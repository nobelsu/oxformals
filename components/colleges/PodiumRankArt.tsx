"use client";

import rough from "roughjs";
import { useEffect, useRef } from "react";
import { seedFrom } from "@/components/ui/SketchCard";

export type PodiumRankVariant = "first" | "second" | "third";

const RANK_LABELS: Record<1 | 2 | 3, string> = {
  1: "1st",
  2: "2nd",
  3: "3rd",
};

const STEP_HEIGHT: Record<1 | 2 | 3, string> = {
  1: "h-14",
  2: "h-10",
  3: "h-5",
};

/** Shared winner surface — theme tokens in globals.css (--podium-winner-*). */
export const podiumWinnerSurface =
  "!bg-[var(--podium-winner-bg)] ring-2 ring-[var(--podium-winner-ring)]";

export const podiumWinnerEmphasis = "text-[var(--podium-winner-emphasis)]";

export const podiumWinnerScore = "text-[var(--podium-winner-score)]";

export function PodiumRankIcon({
  variant,
  className = "",
}: {
  variant: PodiumRankVariant;
  className?: string;
}) {
  const iconClass = `h-9 w-9 shrink-0 text-[var(--accent)] ${className}`;

  if (variant === "first") {
    return (
      <svg
        viewBox="0 0 36 36"
        className={iconClass}
        fill="none"
        aria-hidden
      >
        <path
          d="M6 26 L10 14 L14 20 L18 10 L22 20 L26 14 L30 26"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M5 26 L31 26"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
        <circle cx="18" cy="8" r="2" fill="currentColor" opacity="0.35" />
        <path
          d="M8 26 L28 26"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          opacity="0.4"
        />
      </svg>
    );
  }

  if (variant === "second") {
    return (
      <svg
        viewBox="0 0 36 36"
        className={iconClass}
        fill="none"
        aria-hidden
      >
        <circle
          cx="18"
          cy="16"
          r="10"
          stroke="currentColor"
          strokeWidth="2.5"
        />
        <circle
          cx="18"
          cy="16"
          r="6"
          fill="currentColor"
          opacity="0.2"
        />
        <path
          d="M14 28 C14 24, 16 22, 18 22 C20 22, 22 24, 22 28"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
        <path
          d="M12 28 L24 28"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <path
          d="M18 6 L20 10 L18 9 L16 10 Z"
          fill="currentColor"
          opacity="0.5"
        />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 36 36" className={iconClass} fill="none" aria-hidden>
      <path
        d="M18 6 L21 14 L30 15 L23 21 L25 30 L18 25 L11 30 L13 21 L6 15 L15 14 Z"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <path
        d="M18 10 L20 16 L26 17 L21 21 L22 27 L18 24 L14 27 L15 21 L10 17 L16 16 Z"
        fill="currentColor"
        opacity="0.2"
      />
    </svg>
  );
}

export function PodiumRankBadge({
  rank,
}: {
  rank: 1 | 2 | 3;
}) {
  const label = RANK_LABELS[rank];
  const isFirst = rank === 1;

  return (
    <span
      className={`inline-block w-fit shrink-0 rounded-full px-3 py-0.5 font-display text-xs uppercase tracking-widest ${
        isFirst
          ? "bg-[var(--tag)] text-[var(--tag-ink)]"
          : rank === 2
            ? "border-[2px] border-[var(--ink)] bg-[var(--accent)]/15 text-[var(--ink)]"
            : "border-[2px] border-[var(--ink)] bg-[var(--accent)]/8 text-[var(--ink-muted)]"
      }`}
    >
      {label}
    </span>
  );
}

export function PodiumStep({
  rank,
  college,
}: {
  rank: 1 | 2 | 3;
  college: string;
}) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const effectiveSeed = seedFrom(`${college}-step`);

  useEffect(() => {
    const host = hostRef.current;
    const svg = svgRef.current;
    if (!host || !svg) return;

    let frame = 0;
    const strokeWidth = 2;
    const roughness = 2;
    const bowing = 1.4;
    const inset = strokeWidth + 1;

    const draw = () => {
      if (!host || !svg) return;
      const { width, height } = host.getBoundingClientRect();
      if (width === 0 || height === 0) return;

      svg.setAttribute("width", String(width));
      svg.setAttribute("height", String(height));
      svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
      while (svg.firstChild) svg.removeChild(svg.firstChild);

      const rc = rough.svg(svg);
      const node = rc.rectangle(
        inset,
        inset,
        Math.max(1, width - inset * 2),
        Math.max(1, height - inset * 2),
        {
          stroke: "currentColor",
          strokeWidth,
          roughness,
          bowing,
          seed: effectiveSeed,
          fill: "currentColor",
          fillStyle: "solid",
          fillWeight: 0.4,
          preserveVertices: true,
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
  }, [effectiveSeed]);

  return (
    <div
      ref={hostRef}
      className={`relative hidden w-full text-[var(--podium-step-fill)] opacity-90 md:block ${STEP_HEIGHT[rank]} -mt-0.5`}
      aria-hidden
    >
      <svg ref={svgRef} className="pointer-events-none absolute inset-0" />
    </div>
  );
}

export function podiumRankVariant(rank: number): PodiumRankVariant {
  if (rank === 1) return "first";
  if (rank === 2) return "second";
  return "third";
}
