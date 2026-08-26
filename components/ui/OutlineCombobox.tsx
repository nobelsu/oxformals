"use client";

import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";

export type OutlineComboboxOption = {
  value: string;
  label: string;
};

function renderHighlightedMatch(label: string, query: string) {
  const q = query.trim();
  if (!q) return label;
  const lowerLabel = label.toLowerCase();
  const lowerQuery = q.toLowerCase();
  const start = lowerLabel.indexOf(lowerQuery);
  if (start < 0) return label;
  const end = start + q.length;
  return (
    <>
      {label.slice(0, start)}
      <mark className="rounded bg-[var(--accent-wash)]/25 px-0.5 text-current">
        {label.slice(start, end)}
      </mark>
      {label.slice(end)}
    </>
  );
}

export type OutlineComboboxProps = {
  id?: string;
  "aria-labelledby"?: string;
  value: string;
  options: OutlineComboboxOption[];
  onChange: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  searchable?: boolean;
  className?: string;
  /** Controlled open state (use with `onOpenChange`). */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** `underline` matches the edit-profile hairline fields. */
  variant?: "outline" | "underline";
};

/**
 * Outline dropdown (profile-style trigger + list). Optional search when
 * `searchable` is true.
 */
export function OutlineCombobox({
  id,
  "aria-labelledby": ariaLabelledBy,
  value,
  options,
  onChange,
  placeholder = "Choose…",
  searchPlaceholder = "Search",
  searchable = false,
  className = "",
  open: openControlled,
  onOpenChange,
  variant = "outline",
}: OutlineComboboxProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const listboxId = useId();
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled =
    openControlled !== undefined && onOpenChange !== undefined;
  const open = isControlled ? openControlled : internalOpen;
  const setOpen = isControlled ? onOpenChange : setInternalOpen;

  const [search, setSearch] = useState("");

  const selectedLabel = useMemo(
    () => options.find((o) => o.value === value)?.label ?? "",
    [options, value],
  );

  const wasOpenRef = useRef(false);
  useEffect(() => {
    if (!searchable) return;
    if (open && !wasOpenRef.current) {
      setSearch(selectedLabel);
    }
    wasOpenRef.current = open;
  }, [open, selectedLabel, searchable]);

  useEffect(() => {
    if (!open) return;
    function handlePointerDown(event: MouseEvent) {
      const target = event.target as Node;
      if (rootRef.current?.contains(target)) return;
      setOpen(false);
    }
    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [open, setOpen]);

  const filtered = useMemo(() => {
    if (!searchable) return options;
    const q = search.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) => o.label.toLowerCase().includes(q));
  }, [options, search, searchable]);

  const display = selectedLabel || placeholder;
  const underline = variant === "underline";
  const triggerCls = underline
    ? `w-full rounded-none border-0 border-b-[1.5px] bg-transparent px-0 py-1.5 pr-7 text-left text-base text-[var(--ink)] focus:outline-none ${
        open
          ? "border-[var(--ink)]"
          : "border-[color-mix(in_srgb,var(--ink)_28%,transparent)] focus:border-[var(--ink)]"
      }`
    : "w-full rounded-full border-[2px] border-[var(--ink)] bg-[var(--bg)] px-4 py-2 pr-12 text-left text-base text-[var(--ink)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ink)]/30";
  const chevronCls = underline
    ? "pointer-events-none absolute right-0 top-2.5 text-[var(--ink-muted)]"
    : "pointer-events-none absolute inset-y-0 right-4 flex items-center text-[var(--ink-muted)]";
  const listCls = underline
    ? "absolute left-0 right-0 top-[calc(100%+0.35rem)] z-30 rounded-[18px] border-[1.5px] border-[color-mix(in_srgb,var(--ink)_14%,transparent)] bg-[var(--paper)] p-2 shadow-[0_2px_14px_-10px_rgba(0,0,0,0.25)]"
    : "absolute left-0 right-0 top-[calc(100%+0.5rem)] z-30 rounded-2xl border-[2px] border-[var(--ink)] bg-[var(--bg)] p-2 shadow-sm";

  return (
    <div
      ref={rootRef}
      id={id}
      className={`relative min-w-0 ${className}`.trim()}
    >
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listboxId}
        {...(ariaLabelledBy ? { "aria-labelledby": ariaLabelledBy } : {})}
        onClick={() => setOpen(!open)}
        className={triggerCls}
      >
        <span className={selectedLabel ? "" : "text-[var(--ink-soft)]"}>
          {display}
        </span>
      </button>
      <span className={chevronCls}>
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
          className={listCls}
        >
          {searchable ? (
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={searchPlaceholder}
              className="w-full rounded-full border-[2px] border-[var(--ink)] bg-[var(--bg)] px-3 py-1.5 text-sm text-[var(--ink)] placeholder:text-[var(--ink-soft)] focus:outline-none"
            />
          ) : null}
          <div
            className={
              searchable ? "mt-2 max-h-48 overflow-y-auto" : "max-h-48 overflow-y-auto"
            }
          >
            {filtered.length > 0 ? (
              <div className="flex flex-col gap-1">
                {filtered.map((opt) => {
                  const selected = opt.value === value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      role="option"
                      aria-selected={selected}
                      onClick={() => {
                        onChange(opt.value);
                        setOpen(false);
                      }}
                      className={`rounded-xl px-3 py-2 text-left text-sm transition-colors ${
                        selected
                          ? "bg-[var(--ink)] text-[var(--bg)]"
                          : underline
                            ? "text-[var(--ink)] hover:bg-[var(--bg)]"
                            : "text-[var(--ink)] hover:bg-[var(--paper)]"
                      }`}
                    >
                      {searchable
                        ? renderHighlightedMatch(opt.label, search)
                        : opt.label}
                    </button>
                  );
                })}
              </div>
            ) : (
              <p className="px-2 py-2 text-sm text-[var(--ink-muted)]">
                No matches.
              </p>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
