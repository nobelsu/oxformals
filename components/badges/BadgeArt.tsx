import type { ReactNode } from "react";
import {
  medalTone,
  stampLabel,
  type BadgeDefinition,
  type BadgeIconId,
  type MedalTone,
} from "@/lib/data/badges";

const STROKE = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

const ICON_PATHS: Record<BadgeIconId, ReactNode> = {
  glass: (
    <g {...STROKE}>
      <path d="M8 3h8l-1 7a3 3 0 0 1-6 0z" />
      <path d="M12 13v6M8.5 21h7" />
    </g>
  ),
  cap: (
    <g {...STROKE}>
      <path d="M2.5 9 12 4.5 21.5 9 12 13.5z" />
      <path d="M6.5 11v4.5c1.5 1.7 3.4 2.5 5.5 2.5s4-.8 5.5-2.5V11" />
    </g>
  ),
  candle: (
    <g {...STROKE}>
      <path d="M9 10h6v11H9z" />
      <path d="M12 10V8" />
      <path d="M12 2.8c1.6 1.6 1.8 3.3 0 4.6-1.8-1.3-1.6-3 0-4.6z" />
    </g>
  ),
  crown: (
    <g {...STROKE}>
      <path d="M3 8l4.5 4L12 5l4.5 7L21 8l-1.8 10H4.8z" />
    </g>
  ),
  star: (
    <g {...STROKE}>
      <path d="M12 3.5l2.6 5.4 5.9.8-4.3 4.1 1 5.8L12 16.8l-5.2 2.8 1-5.8-4.3-4.1 5.9-.8z" />
    </g>
  ),
  pen: (
    <g {...STROKE}>
      <path d="M15.5 4.5l4 4L9 19l-5 1 1-5z" />
      <path d="M13.5 6.5l4 4" />
    </g>
  ),
  trophy: (
    <g {...STROKE}>
      <path d="M7 4h10v5a5 5 0 0 1-10 0z" />
      <path d="M7 6H4v1a3 3 0 0 0 3 3M17 6h3v1a3 3 0 0 1-3 3M12 14v4M8.5 20.5h7" />
    </g>
  ),
  college: (
    <g {...STROKE}>
      <path d="M3 9.5 12 4l9 5.5M5 10v8M9 10v8M15 10v8M19 10v8M3 20h18" />
    </g>
  ),
  // A canapé: olive on a cocktail stick, through a bite on a little plate.
  canape: (
    <g {...STROKE}>
      <path d="M12 2.5v9" />
      <circle cx="12" cy="6.2" r="2.1" />
      <path d="M7 11.5h10l-1.2 4.5H8.2z" />
      <path d="M3.5 19.5c2.6 1.3 5.4 2 8.5 2s5.9-.7 8.5-2" />
    </g>
  ),
};

export function BadgeIcon({
  id,
  className = "h-6 w-6",
}: {
  id: BadgeIconId;
  className?: string;
}) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      {ICON_PATHS[id]}
    </svg>
  );
}

/**
 * Fixed metal fills (the same in light and dark), each with dark ink on top.
 * Ruby is the app's rose; special badges are a dark disc with a rose shadow.
 */
const TONES: Record<MedalTone, string> = {
  bronze: "border-[var(--ink)] bg-[#e2b28c] text-[#1a1810] shadow-[3px_3px_0_var(--ink)]",
  silver: "border-[var(--ink)] bg-[#d9d8d2] text-[#1a1810] shadow-[3px_3px_0_var(--ink)]",
  gold: "border-[var(--ink)] bg-[#eec95c] text-[#1a1810] shadow-[3px_3px_0_var(--ink)]",
  ruby: "border-[var(--ink)] bg-[#d9736c] text-[#1a1810] shadow-[3px_3px_0_var(--ink)]",
  // Always the dark disc: flipping with the theme left a pale icon on a pale disc.
  ink: "border-[var(--ink)] bg-[#1b1a12] text-[#edbfba] shadow-[3px_3px_0_var(--accent)]",
};

/**
 * Milestone medal: a metal disc with an ink outline and offset shadow when
 * earned, a pale ghost until then. The metal says how far up the ladder it is.
 */
export function Medal({
  icon,
  earned,
  size = 56,
  tone = "bronze",
}: {
  icon: BadgeIconId;
  earned: boolean;
  size?: number;
  tone?: MedalTone;
}) {
  return (
    <span
      className={`flex shrink-0 items-center justify-center rounded-full border-[2px] ${
        earned
          ? TONES[tone]
          : "border-[color-mix(in_srgb,var(--ink)_22%,transparent)] bg-[var(--paper)] text-[color-mix(in_srgb,var(--ink)_28%,transparent)]"
      }`}
      style={{ width: size, height: size }}
    >
      <BadgeIcon
        id={icon}
        className={size >= 48 ? "h-7 w-7" : size >= 36 ? "h-5 w-5" : "h-4 w-4"}
      />
    </span>
  );
}

/** Stable small tilt per college so stamps look hand-pressed. */
function tiltFor(college: string): number {
  let h = 0;
  for (const ch of college) h = (h * 31 + ch.charCodeAt(0)) | 0;
  return (Math.abs(h) % 15) - 7;
}

/** College passport stamp: pale "ghost" double ring until earned, then rose and tilted. */
export function Stamp({
  college,
  earned,
  size = 68,
}: {
  college: string;
  earned: boolean;
  size?: number;
}) {
  const label = stampLabel(college);
  return (
    <span
      className={`relative flex shrink-0 items-center justify-center rounded-full border-[2.5px] ${
        earned
          ? "border-[var(--accent)] text-[var(--accent)]"
          : "border-[color-mix(in_srgb,var(--ink)_12%,transparent)] text-[color-mix(in_srgb,var(--ink)_22%,transparent)]"
      }`}
      style={{
        width: size,
        height: size,
        transform: earned ? `rotate(${tiltFor(college)}deg)` : undefined,
      }}
    >
      <span
        className={`absolute inset-[5px] rounded-full border ${
          earned
            ? "border-[var(--accent)]"
            : "border-[color-mix(in_srgb,var(--ink)_12%,transparent)]"
        }`}
      />
      <span
        className="font-display leading-none"
        style={{ fontSize: size * (label.length > 3 ? 0.24 : 0.3) }}
      >
        {label}
      </span>
    </span>
  );
}

/** A badge's art, whichever kind it is. */
export function BadgeArt({
  def,
  earned,
  size,
}: {
  def: BadgeDefinition;
  earned: boolean;
  size?: number;
}) {
  return def.family === "college" ? (
    <Stamp college={def.college} earned={earned} size={size} />
  ) : (
    <Medal icon={def.icon} earned={earned} size={size} tone={medalTone(def)} />
  );
}
