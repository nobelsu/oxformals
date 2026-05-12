"use client";

import type { ReactNode } from "react";

type Props = {
  children: ReactNode;
  active?: boolean;
  onClick?: () => void;
  size?: "sm" | "md";
  as?: "button" | "span";
  variant?: "filled" | "outline";
  className?: string;
};

export function Chip({
  children,
  active,
  onClick,
  size = "md",
  as = "button",
  variant,
  className = "",
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
    "inline-flex items-center rounded-full leading-normal max-w-full";
  const cls = `${base} ${sizing} ${mode === "filled" ? filled : outline} ${activeFilled} ${hover} ${className}`.trim();

  const inner = (
    <span className="overflow-hidden text-ellipsis whitespace-nowrap">{children}</span>
  );

  if (as === "span") {
    return <span className={cls}>{inner}</span>;
  }
  return (
    <button type="button" onClick={onClick} className={cls}>
      {inner}
    </button>
  );
}
