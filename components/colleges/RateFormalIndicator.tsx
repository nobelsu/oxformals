"use client";

import { StarIcon } from "@/components/colleges/StarRating";

type Props = {
  className?: string;
};

/** Non-pill cue that a past formal can be rated (card/modal stays the click target). */
export function RateFormalIndicator({ className }: Props) {
  return (
    <span
      aria-hidden
      className={[
        "inline-flex shrink-0 items-center gap-1.5 text-xs font-medium text-[var(--accent-hover)]",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <StarIcon className="h-4 w-4" />
      <span>Rate formal</span>
    </span>
  );
}
