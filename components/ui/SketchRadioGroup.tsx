"use client";

import type { ReactNode } from "react";

type GroupProps = {
  label: string;
  children: ReactNode;
  className?: string;
};

export function SketchRadioGroup({ label, children, className = "" }: GroupProps) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={`mt-4 flex flex-col gap-1 ${className}`.trim()}
    >
      {children}
    </div>
  );
}

type OptionProps = {
  name: string;
  value: string;
  label: string;
  checked: boolean;
  onSelect: () => void;
  disabled?: boolean;
};

export function SketchRadioOption({
  name,
  value,
  label,
  checked,
  onSelect,
  disabled = false,
}: OptionProps) {
  return (
    <button
      type="button"
      role="radio"
      name={name}
      aria-checked={checked}
      disabled={disabled}
      onClick={onSelect}
      className={[
        "flex w-full cursor-pointer items-center gap-3 rounded-lg px-1 py-2.5 text-left text-sm text-[var(--ink)] transition-colors",
        "hover:bg-[var(--ink)]/6",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ink)]/35",
        "disabled:cursor-not-allowed disabled:opacity-50",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <span
        className="relative flex h-[1.125rem] w-[1.125rem] shrink-0 items-center justify-center rounded-full border-[2px] border-[var(--ink)] bg-[var(--bg)]"
        aria-hidden
      >
        {checked ? (
          <span className="h-2 w-2 rounded-full bg-[var(--accent-wash)]" />
        ) : null}
      </span>
      <span className="min-w-0 flex-1 leading-snug">{label}</span>
    </button>
  );
}
