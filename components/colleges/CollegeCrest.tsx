import { useId } from "react";
import { CRESTS, TINCTURES } from "@/lib/data/crests";
import { stampLabel } from "@/lib/data/badges";

/**
 * Our own simplified drawing of a college's arms, in the site's hand-drawn
 * line style (the design comes from the blazon; the drawing is ours).
 * Colleges not drawn yet get a plain shield with their initials.
 */

export const SHIELD_PATH = "M6 4h48v26c0 16-12 25-24 30C18 55 6 46 6 30z";

export function CollegeCrest({
  college,
  size = 56,
  className = "",
}: {
  college: string;
  size?: number;
  className?: string;
}) {
  const clipId = useId().replace(/:/g, "");
  const crest = CRESTS[college];
  return (
    <svg
      viewBox="0 0 60 64"
      width={size}
      height={Math.round((size * 64) / 60)}
      className={`shrink-0 ${className}`}
      role="img"
      aria-label={`${college} crest`}
    >
      <defs>
        <clipPath id={clipId}>
          <path d={SHIELD_PATH} />
        </clipPath>
      </defs>
      <g clipPath={`url(#${clipId})`}>
        <rect width="60" height="64" fill={crest ? crest.field : TINCTURES.plain} />
        {crest ? (
          crest.art
        ) : (
          <text
            x="30"
            y="36"
            textAnchor="middle"
            fontFamily="var(--font-display-face), Schoolbell, cursive"
            fontSize={stampLabel(college).length > 3 ? 12 : 15}
            fill={TINCTURES.ink}
          >
            {stampLabel(college)}
          </text>
        )}
      </g>
      <path
        d={SHIELD_PATH}
        fill="none"
        stroke={TINCTURES.ink}
        strokeWidth="2.2"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** The college's two main colours, for banners. */
export function collegeColours(college: string): [string, string] {
  return CRESTS[college]?.colours ?? [TINCTURES.plain, TINCTURES.plainDark];
}
