"use client";

import type { InputHTMLAttributes, ReactNode } from "react";
import { OUTLINE_FIELD_CLS, OUTLINE_SEARCH_FIELD_CLS } from "@/lib/ui/formClasses";

function ClearInputIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  );
}

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, "className"> & {
  label?: string;
  className?: string;
  inputClassName?: string;
  /** Show clear control when value is non-empty (search-style). */
  clearable?: boolean;
  onClear?: () => void;
  hint?: ReactNode;
};

export function OutlineTextField({
  label,
  className = "",
  inputClassName = "",
  clearable = false,
  onClear,
  hint,
  value,
  type = "text",
  inputMode,
  ...rest
}: Props) {
  const showClear =
    clearable &&
    value !== undefined &&
    value !== null &&
    String(value).length > 0;

  // type="search" adds a native clear button (often blue) in WebKit beside ours.
  const wantsSearchKeyboard = type === "search" || inputMode === "search";
  const inputType = clearable && wantsSearchKeyboard ? "text" : type;
  const resolvedInputMode =
    wantsSearchKeyboard && inputMode === undefined ? "search" : inputMode;

  const isSearchStyle = wantsSearchKeyboard || clearable;
  const fieldCls = isSearchStyle ? OUTLINE_SEARCH_FIELD_CLS : OUTLINE_FIELD_CLS;

  return (
    <label className={`flex flex-col gap-2 ${className}`.trim()}>
      {label ? (
        <span className="text-sm text-[var(--ink-muted)]">{label}</span>
      ) : null}
      <div
        className={
          isSearchStyle
            ? "relative -mx-1.5 px-1.5 py-1"
            : "relative"
        }
      >
        <input
          type={inputType}
          inputMode={resolvedInputMode}
          value={value}
          className={`${fieldCls} ${showClear ? "pr-11" : ""} ${inputClassName}`.trim()}
          {...rest}
        />
        {showClear ? (
          <button
            type="button"
            onClick={() => {
              onClear?.();
            }}
            className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-[var(--ink-muted)] transition-colors hover:bg-[var(--ink)]/10 hover:text-[var(--ink)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ink)]/30"
            aria-label="Clear"
          >
            <ClearInputIcon className="h-4 w-4" />
          </button>
        ) : null}
      </div>
      {hint ? (
        <span className="text-sm text-[var(--ink-soft)]">{hint}</span>
      ) : null}
    </label>
  );
}
