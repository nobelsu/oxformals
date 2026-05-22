"use client";

type Props = {
  size?: "sm" | "md";
  className?: string;
  /** Lower contrast when unselected in a picker. */
  subdued?: boolean;
};

const SIZE = {
  sm: { root: "text-xs", segment: "px-3 py-0.5" },
  md: { root: "text-sm", segment: "px-3 py-1" },
} as const;

/** Split Swap | Pay badge for listings that accept either. */
export function DualTypeBadge({ size = "sm", className, subdued }: Props) {
  const s = SIZE[size];
  return (
    <span
      className={[
        "inline-flex shrink-0 overflow-hidden rounded-full border-[2px] border-[var(--ink)]",
        "divide-x-2 divide-[var(--ink)] leading-normal",
        s.root,
        subdued ? "opacity-55" : "",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      aria-label="Swap or pay"
    >
      <span
        className={`${s.segment} bg-[var(--tag)] font-medium text-[var(--tag-ink)]`}
      >
        Swap
      </span>
      <span
        className={`${s.segment} bg-[var(--accent)] font-medium text-[var(--accent-ink)]`}
      >
        Pay
      </span>
    </span>
  );
}
