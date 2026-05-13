"use client";

import { forwardRef, useId } from "react";
import {
  UI_FONT_OPTIONS,
  type UiFontId,
} from "@/convex/uiFont";

export type UiFontDropdownProps = {
  value: UiFontId;
  onChange: (id: UiFontId) => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  disabled?: boolean;
  /** Optional id for the visible field label element */
  "aria-labelledby"?: string;
};

export const UiFontDropdown = forwardRef<HTMLDivElement, UiFontDropdownProps>(
  function UiFontDropdown(
    {
      value,
      onChange,
      open,
      onOpenChange,
      disabled,
      "aria-labelledby": ariaLabelledBy,
    },
    ref,
  ) {
    const listboxId = useId();
    const current = UI_FONT_OPTIONS.find((o) => o.id === value);
    const display = current?.label ?? "Choose theme";

    return (
      <div ref={ref} className="relative">
        <button
          type="button"
          disabled={disabled}
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-controls={listboxId}
          {...(ariaLabelledBy ? { "aria-labelledby": ariaLabelledBy } : {})}
          onClick={() => {
            if (disabled) return;
            onOpenChange(!open);
          }}
          className="w-full rounded-full border-[2px] border-[var(--ink)] bg-[var(--bg)] px-4 py-2 pr-12 text-left text-base text-[var(--ink)] focus:outline-none disabled:cursor-not-allowed disabled:opacity-60"
        >
          {display}
        </button>
        <span className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-[var(--ink-muted)]">
          <svg
            aria-hidden="true"
            viewBox="0 0 12 8"
            className="h-3.5 w-3.5"
            fill="none"
          >
            <path
              d="M1 1.5 6 6.5 11 1.5"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
        {open ? (
          <div
            id={listboxId}
            role="listbox"
            aria-labelledby={ariaLabelledBy}
            className="absolute left-0 right-0 top-[calc(100%+0.5rem)] z-20 rounded-2xl border-[2px] border-[var(--ink)] bg-[var(--bg)] p-2 shadow-sm"
          >
            <div className="flex max-h-48 flex-col gap-1 overflow-y-auto">
              {UI_FONT_OPTIONS.map((opt) => {
                const selected = opt.id === value;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    role="option"
                    aria-selected={selected}
                    onClick={() => {
                      onChange(opt.id);
                      onOpenChange(false);
                    }}
                    className={`rounded-xl px-3 py-2 text-left text-sm transition-colors ${
                      selected
                        ? "bg-[var(--ink)] text-[var(--bg)]"
                        : "text-[var(--ink)] hover:bg-[var(--paper)]"
                    }`}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}
      </div>
    );
  },
);
