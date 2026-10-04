type Props = {
  /** Total seats in the group — `listing.groupSize`. */
  total: number;
  /** Seats already taken — `groupSize - seatsAvailable`. */
  taken: number;
  className?: string;
};

/**
 * Filled glyph = seat taken, outline = seat free. `GroupSize` is 2–6, so the
 * pip count is bounded and always countable at a glance.
 */
export function SeatPips({ total, taken, className = "" }: Props) {
  const safeTotal = Math.max(0, Math.trunc(total));
  const safeTaken = Math.min(Math.max(0, Math.trunc(taken)), safeTotal);

  if (safeTotal === 0) return null;

  return (
    <span
      role="img"
      aria-label={`${safeTaken} of ${safeTotal} seats taken`}
      className={`inline-flex items-center gap-[3px] text-[var(--ink)] ${className}`.trim()}
    >
      {Array.from({ length: safeTotal }, (_, index) => (
        <svg
          key={index}
          viewBox="0 0 24 24"
          aria-hidden="true"
          className="h-[0.95rem] w-[0.95rem] shrink-0"
        >
          <circle
            cx="12"
            cy="7.5"
            r="4"
            fill={index < safeTaken ? "currentColor" : "none"}
            stroke="currentColor"
            strokeWidth="2"
          />
          <path
            d="M4.5 20.5c0-4.2 3.4-7 7.5-7s7.5 2.8 7.5 7"
            fill={index < safeTaken ? "currentColor" : "none"}
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      ))}
    </span>
  );
}
