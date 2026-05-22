"use client";

import type { ReactNode } from "react";

export type ListingTagVariant = "outline" | "accent";

const SIZE_CLASS = {
  sm: "px-3 py-0.5 text-xs",
  md: "px-5 py-2 text-sm",
} as const;

const VARIANT_CLASS: Record<ListingTagVariant, string> = {
  outline: "border-[var(--ink)] bg-transparent text-[var(--ink)]",
  accent: "border-[var(--accent)] bg-[var(--accent)] text-[var(--accent-ink)]",
};

type Props = {
  children: ReactNode;
  variant?: ListingTagVariant;
  size?: keyof typeof SIZE_CLASS;
  className?: string;
};

/** Shared pill for listing status, formal lifecycle, and card footers. */
export function ListingTag({
  children,
  variant = "outline",
  size = "sm",
  className,
}: Props) {
  return (
    <span
      className={[
        "inline-flex max-w-full shrink-0 items-center rounded-full border-[2px] leading-normal",
        SIZE_CLASS[size],
        VARIANT_CLASS[variant],
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <span className="overflow-hidden text-ellipsis whitespace-nowrap">
        {children}
      </span>
    </span>
  );
}
