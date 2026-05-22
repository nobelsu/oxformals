"use client";

import { useState, type CSSProperties } from "react";

/** Same hand-drawn star as preset avatars — keeps ratings on-brand. */
const STAR_PATH =
  "m12 4 2.3 4.7L20 9.5l-4 3.9.9 5.6L12 16.5 7.1 19l.9-5.6-4-3.9 5.7-.8z";

type Props = {
  value: number;
  onChange?: (value: number) => void;
  label: string;
  size?: "sm" | "md";
};

function RatingStar({
  filled,
  selected,
  preview,
  hoverTarget,
  size,
  index,
}: {
  filled: boolean;
  selected?: boolean;
  preview?: boolean;
  hoverTarget?: boolean;
  size: "sm" | "md";
  index: number;
}) {
  const dim = size === "sm" ? "h-5 w-5" : "h-6 w-6";
  const wobble = (index - 3) * 1.25;
  const showFilled = filled || preview;

  return (
    <svg
      viewBox="0 0 24 24"
      className={`${dim} shrink-0 transition-transform duration-200 ease-out ${
        hoverTarget ? "rating-star-hover-animate" : ""
      }`}
      style={
        hoverTarget
          ? ({ ["--star-wobble"]: `${wobble}deg` } as CSSProperties)
          : {
              transform: `rotate(${wobble}deg) scale(${showFilled ? (preview ? 1.08 : 1.05) : 1})`,
            }
      }
      aria-hidden
    >
      <path
        d={STAR_PATH}
        fill={showFilled ? (preview ? "var(--accent-hover)" : "var(--accent)") : "none"}
        stroke={showFilled ? "var(--ink)" : "var(--ink-soft)"}
        strokeWidth={showFilled ? (selected ? 2.25 : 2) : 1.6}
        strokeLinecap="round"
        strokeLinejoin="round"
        className="transition-[opacity,fill] duration-150 ease-out"
        opacity={showFilled ? 1 : 0.4}
      />
    </svg>
  );
}

export function StarRating({ value, onChange, label, size = "md" }: Props) {
  const interactive = onChange !== undefined;
  const [hoveredStar, setHoveredStar] = useState<number | null>(null);
  const starWrapClass =
    size === "sm"
      ? "inline-flex h-7 w-7 items-center justify-center"
      : "inline-flex h-8 w-8 items-center justify-center";

  const displayValue = interactive && hoveredStar !== null ? hoveredStar : value;

  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <span className="text-sm text-[var(--ink-muted)]">{label}</span>
      <div
        className="inline-flex gap-0.5"
        role={interactive ? "radiogroup" : undefined}
        aria-label={label}
        onMouseLeave={interactive ? () => setHoveredStar(null) : undefined}
      >
        {[1, 2, 3, 4, 5].map((star) => {
          const committed = star <= Math.round(value);
          const preview = interactive && hoveredStar !== null && star <= hoveredStar;
          const filled = interactive
            ? star <= Math.round(displayValue)
            : committed;
          const selected = interactive && value === star && hoveredStar === null;
          const hoverTarget = interactive && hoveredStar === star;

          const icon = (
            <RatingStar
              filled={filled}
              selected={selected}
              preview={preview && !committed}
              hoverTarget={hoverTarget}
              size={size}
              index={star}
            />
          );

          if (interactive) {
            return (
              <button
                key={star}
                type="button"
                role="radio"
                aria-checked={value === star}
                aria-label={`${star} star${star === 1 ? "" : "s"}`}
                onMouseEnter={() => setHoveredStar(star)}
                onFocus={() => setHoveredStar(star)}
                onBlur={() => setHoveredStar(null)}
                onClick={() => onChange(star)}
                className={`${starWrapClass} cursor-pointer rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ink)]`}
              >
                {icon}
              </button>
            );
          }
          return (
            <span key={star} className={starWrapClass}>
              {icon}
            </span>
          );
        })}
      </div>
    </div>
  );
}

export function formatRatingAverage(n: number): string {
  return n.toFixed(1);
}

/** Single filled star for read-only score labels (e.g. leaderboard). */
export function StarIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className ?? "h-4 w-4 shrink-0"}
      aria-hidden
    >
      <path
        d={STAR_PATH}
        fill="var(--accent)"
        stroke="var(--ink)"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
