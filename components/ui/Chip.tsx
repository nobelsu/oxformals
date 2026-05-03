"use client";

import type { ReactNode } from "react";

type Props = {
  children: ReactNode;
  active?: boolean;
  onClick?: () => void;
  size?: "sm" | "md";
  as?: "button" | "span";
  variant?: "filled" | "outline";
};

export function Chip({
  children,
  active,
  onClick,
  size = "md",
  as = "button",
  variant,
}: Props) {
  const mode = variant ?? (active === false ? "outline" : "filled");
  const sizing =
    size === "sm" ? "px-3 py-0.5 text-xs" : "px-4 py-1 text-sm";

  const filled =
    "bg-[var(--tag)] text-[var(--tag-ink)] border-[2px] border-[var(--tag)]";
  const outline =
    "bg-transparent text-[var(--ink)] border-[2px] border-[var(--ink)]";

  const activeFilled =
    active === true
      ? "bg-[var(--tag)] text-[var(--tag-ink)] border-[var(--tag)]"
      : "";
  const hover = onClick
    ? "transition-colors cursor-pointer hover:opacity-90"
    : "";

  const base =
    "inline-flex items-center rounded-full whitespace-nowrap leading-none";
  const cls = `${base} ${sizing} ${mode === "filled" ? filled : outline} ${activeFilled} ${hover}`;

  if (as === "span") {
    return <span className={cls}>{children}</span>;
  }
  return (
    <button type="button" onClick={onClick} className={cls}>
      {children}
    </button>
  );
}
