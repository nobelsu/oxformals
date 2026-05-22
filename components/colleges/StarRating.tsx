"use client";

type Props = {
  value: number;
  onChange?: (value: number) => void;
  label: string;
  size?: "sm" | "md";
};

export function StarRating({ value, onChange, label, size = "md" }: Props) {
  const interactive = onChange !== undefined;
  const starClass = size === "sm" ? "h-5 w-5 text-base" : "h-6 w-6 text-lg";

  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <span className="text-sm text-[var(--ink-muted)]">{label}</span>
      <div
        className="inline-flex gap-0.5"
        role={interactive ? "radiogroup" : undefined}
        aria-label={label}
      >
        {[1, 2, 3, 4, 5].map((star) => {
          const filled = star <= Math.round(value);
          if (interactive) {
            return (
              <button
                key={star}
                type="button"
                role="radio"
                aria-checked={value === star}
                aria-label={`${star} star${star === 1 ? "" : "s"}`}
                onClick={() => onChange(star)}
                className={`${starClass} leading-none transition-transform hover:scale-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ink)] rounded`}
              >
                <span className={filled ? "text-[var(--accent)]" : "text-[var(--ink-soft)]/40"}>
                  ★
                </span>
              </button>
            );
          }
          return (
            <span
              key={star}
              aria-hidden="true"
              className={`${starClass} leading-none ${filled ? "text-[var(--accent)]" : "text-[var(--ink-soft)]/40"}`}
            >
              ★
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
