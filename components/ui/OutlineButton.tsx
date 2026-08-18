"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "outline" | "filled" | "ghost" | "destructive";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  children: ReactNode;
};

const VARIANT_CLS: Record<Variant, string> = {
  primary:
    "border-[2px] border-[var(--accent)] bg-[var(--accent)] text-[var(--accent-ink)] hover:bg-[var(--accent-hover)] hover:border-[var(--accent-hover)]",
  outline:
    "border-[2px] border-[var(--ink)] bg-transparent text-[var(--ink)] hover:bg-[var(--ink)] hover:text-[var(--bg)]",
  filled:
    "border-[2px] border-[var(--ink)] bg-[var(--ink)] text-[var(--bg)] hover:opacity-90",
  ghost:
    "border-[2px] border-[var(--ink)]/40 bg-transparent text-[var(--ink-muted)] hover:border-[var(--ink)] hover:text-[var(--ink)]",
  destructive:
    "border-[2px] border-[var(--danger)] bg-[var(--danger)] text-[var(--danger-ink)] hover:bg-[color-mix(in_srgb,var(--danger)_85%,black)] hover:border-[color-mix(in_srgb,var(--danger)_85%,black)]",
};

export function OutlineButton({
  variant = "outline",
  className = "",
  children,
  disabled,
  ...rest
}: Props) {
  return (
    <button
      type="button"
      disabled={disabled}
      className={[
        "inline-flex items-center justify-center rounded-full px-4 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50",
        VARIANT_CLS[variant],
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      {...rest}
    >
      {children}
    </button>
  );
}
