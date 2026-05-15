"use client";

import type { ReactNode } from "react";

type Props = {
  children: ReactNode;
  active?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  size?: "sm" | "md";
  as?: "button" | "span";
  variant?: "filled" | "outline";
  /** Skip default fill/outline colors; use className for bg, text, and border. */
  appearance?: "default" | "plain";
  className?: string;
};

export function Chip({
  children,
  active,
  disabled,
  onClick,
  size = "md",
  as = "button",
  variant,
  appearance = "default",
  className = "",
}: Props) {
  const mode = variant ?? (active === false ? "outline" : "filled");
  const sizing =
    size === "sm" ? "px-3 py-0.5 text-xs" : "px-4 py-1 text-sm";

  const border = "border-[2px]";
  const filled =
    "bg-[var(--tag)] text-[var(--tag-ink)] border-[var(--tag)]";
  const outline = "bg-transparent text-[var(--ink)] border-[var(--ink)]";

  const activeFilled =
    active === true
      ? "bg-[var(--tag)] text-[var(--tag-ink)] border-[var(--tag)]"
      : "";
  const hover = disabled
    ? "opacity-40 cursor-not-allowed"
    : onClick
      ? "transition-colors cursor-pointer hover:opacity-90"
      : "";

  const base =
    "inline-flex items-center rounded-full leading-normal max-w-full";
  const colorCls =
    appearance === "plain"
      ? border
      : `${border} ${mode === "filled" ? filled : outline} ${activeFilled}`;
  const cls = `${base} ${sizing} ${colorCls} ${hover} ${className}`.trim();

  const inner = (
    <span className="overflow-hidden text-ellipsis whitespace-nowrap">{children}</span>
  );

  if (as === "span") {
    return <span className={cls}>{inner}</span>;
  }
  return (
    <button type="button" onClick={onClick} disabled={disabled} className={cls}>
      {inner}
    </button>
  );
}
