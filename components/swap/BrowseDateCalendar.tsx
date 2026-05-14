"use client";

import { useMemo, useRef, useState } from "react";

type Props = {
  value: string[];
  onChange: (next: string[]) => void;
  /** When true, omit outer frame (e.g. inside a modal). */
  embedded?: boolean;
};

export const BROWSE_DATE_CALENDAR_INSTRUCTIONS =
  "Tap days to filter. Shift+tap two days to include every day between them. With none selected, all dates show.";

const WEEK_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

/** Local calendar key YYYY-MM-DD from parts (month 0–11). */
function toDateKey(y: number, month0: number, day: number): string {
  return `${y}-${pad2(month0 + 1)}-${pad2(day)}`;
}

function keyFromDate(d: Date): string {
  return toDateKey(d.getFullYear(), d.getMonth(), d.getDate());
}

function parseKey(key: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(key);
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]) - 1;
  const day = Number(m[3]);
  const d = new Date(y, mo, day, 12, 0, 0, 0);
  if (
    d.getFullYear() !== y ||
    d.getMonth() !== mo ||
    d.getDate() !== day
  ) {
    return null;
  }
  return d;
}

/** Monday = 0 … Sunday = 6 for the first of `month0`. */
function mondayIndexOfFirst(year: number, month0: number): number {
  const dow = new Date(year, month0, 1).getDay();
  return (dow + 6) % 7;
}

function daysInMonth(year: number, month0: number): number {
  return new Date(year, month0 + 1, 0).getDate();
}

function monthTitle(year: number, month0: number): string {
  return new Intl.DateTimeFormat("en-GB", {
    month: "long",
    year: "numeric",
  }).format(new Date(year, month0, 1));
}

function enumerateKeysInclusive(a: string, b: string): string[] {
  const da = parseKey(a);
  const db = parseKey(b);
  if (!da || !db) return [];
  const t0 = +da <= +db ? da : db;
  const t1 = +da <= +db ? db : da;
  const out: string[] = [];
  const cur = new Date(t0);
  while (cur <= t1) {
    out.push(keyFromDate(cur));
    cur.setDate(cur.getDate() + 1);
  }
  return out;
}

function mergeUniqueSorted(a: string[], b: string[]): string[] {
  return Array.from(new Set([...a, ...b])).sort();
}

const BTN_BASE =
  "flex aspect-square w-full min-h-[2.25rem] max-h-[2.75rem] items-center justify-center rounded-xl border-2 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ink)]/40";

/** Denser grid when embedded in the dates modal. */
const BTN_BASE_EMBEDDED =
  "flex aspect-square w-full min-h-[1.75rem] max-h-[2.05rem] items-center justify-center rounded-lg border-2 text-xs font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ink)]/40";

export function BrowseDateCalendar({
  value,
  onChange,
  embedded = false,
}: Props) {
  const now = useMemo(() => new Date(), []);
  const [viewStart, setViewStart] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const lastClickRef = useRef<string | null>(null);

  const viewYear = viewStart.getFullYear();
  const viewMonth = viewStart.getMonth();

  const selected = useMemo(() => new Set(value), [value]);
  const todayKey = keyFromDate(now);

  const cells = useMemo(() => {
    const lead = mondayIndexOfFirst(viewYear, viewMonth);
    const n = daysInMonth(viewYear, viewMonth);
    const total = lead + n;
    const rows = Math.ceil(total / 7);
    const padTotal = rows * 7;
    const items: { key: string | null; day: number | null }[] = [];
    for (let i = 0; i < padTotal; i++) {
      const dayNum = i - lead + 1;
      if (i < lead || dayNum > n) {
        items.push({ key: null, day: null });
      } else {
        items.push({
          key: toDateKey(viewYear, viewMonth, dayNum),
          day: dayNum,
        });
      }
    }
    return items;
  }, [viewYear, viewMonth]);

  function goPrevMonth() {
    setViewStart(
      (d) => new Date(d.getFullYear(), d.getMonth() - 1, 1),
    );
  }

  function goNextMonth() {
    setViewStart(
      (d) => new Date(d.getFullYear(), d.getMonth() + 1, 1),
    );
  }

  function handleDayClick(key: string, shiftKey: boolean) {
    if (shiftKey && lastClickRef.current && lastClickRef.current !== key) {
      const span = enumerateKeysInclusive(lastClickRef.current, key);
      onChange(mergeUniqueSorted(value, span));
    } else {
      const next = new Set(value);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      onChange(Array.from(next).sort());
    }
    lastClickRef.current = key;
  }

  const hasSelection = value.length > 0;

  const shell = embedded
    ? "w-full"
    : "w-full max-w-md rounded-2xl border-2 border-[var(--ink)] bg-[var(--paper)] p-4 sm:p-5";

  const ringOffset = embedded ? "ring-offset-[var(--bg)]" : "ring-offset-[var(--paper)]";

  const btnBase = embedded ? BTN_BASE_EMBEDDED : BTN_BASE;
  const ringToday = embedded
    ? `ring-1 ring-[var(--accent)] ring-offset-1 ${ringOffset}`
    : `ring-2 ring-[var(--accent)] ring-offset-2 ${ringOffset}`;

  return (
    <div className={shell}>
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={goPrevMonth}
          className={
            embedded
              ? "flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 border-[var(--ink)] bg-[var(--bg)] text-base leading-none text-[var(--ink)] transition-colors hover:bg-[var(--ink)]/5"
              : "flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 border-[var(--ink)] bg-[var(--bg)] text-lg leading-none text-[var(--ink)] transition-colors hover:bg-[var(--ink)]/5"
          }
          aria-label="Previous month"
        >
          ‹
        </button>
        <h3
          className={
            embedded
              ? "min-w-0 text-center font-display text-base uppercase tracking-wide text-[var(--ink)]"
              : "min-w-0 text-center font-display text-xl uppercase tracking-wide text-[var(--ink)]"
          }
        >
          {monthTitle(viewYear, viewMonth)}
        </h3>
        <button
          type="button"
          onClick={goNextMonth}
          className={
            embedded
              ? "flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 border-[var(--ink)] bg-[var(--bg)] text-base leading-none text-[var(--ink)] transition-colors hover:bg-[var(--ink)]/5"
              : "flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 border-[var(--ink)] bg-[var(--bg)] text-lg leading-none text-[var(--ink)] transition-colors hover:bg-[var(--ink)]/5"
          }
          aria-label="Next month"
        >
          ›
        </button>
      </div>

      {!embedded ? (
        <p className="mt-3 text-center text-xs leading-snug text-[var(--ink-muted)]">
          {BROWSE_DATE_CALENDAR_INSTRUCTIONS}
        </p>
      ) : null}

      <div
        className={embedded ? "mt-2 grid grid-cols-7 gap-1" : "mt-4 grid grid-cols-7 gap-1.5"}
        role="grid"
        aria-multiselectable="true"
        aria-label="Choose formal dates"
      >
        {WEEK_LABELS.map((w) => (
          <div
            key={w}
            className={
              embedded
                ? "flex aspect-square max-h-[1.25rem] items-end justify-center pb-px text-[0.55rem] font-medium uppercase tracking-wide text-[var(--ink-soft)]"
                : "flex aspect-square max-h-[2rem] items-end justify-center pb-0.5 text-[0.65rem] font-medium uppercase tracking-wide text-[var(--ink-soft)]"
            }
            role="columnheader"
          >
            {w}
          </div>
        ))}
        {cells.map((cell, i) => {
          if (cell.key == null || cell.day == null) {
            return (
              <div
                key={`e-${i}`}
                className={embedded ? "min-h-[1.75rem]" : "min-h-[2.25rem]"}
              />
            );
          }
          const isSel = selected.has(cell.key);
          const isToday = cell.key === todayKey;
          return (
            <button
              key={cell.key}
              type="button"
              role="gridcell"
              aria-selected={isSel}
              aria-label={`${cell.day}${isSel ? ", selected" : ""}${isToday ? ", today" : ""}`}
              onClick={(e) => handleDayClick(cell.key!, e.shiftKey)}
              className={`${btnBase} ${
                isSel
                  ? "border-[var(--tag)] bg-[var(--tag)] text-[var(--tag-ink)]"
                  : "border-[var(--ink)]/25 bg-[var(--bg)] text-[var(--ink)] hover:border-[var(--ink)]/50"
              } ${isToday && !isSel ? ringToday : ""}`}
            >
              {cell.day}
            </button>
          );
        })}
      </div>

      {hasSelection ? (
        <div className={embedded ? "mt-2 flex justify-center" : "mt-4 flex justify-center"}>
          <button
            type="button"
            onClick={() => onChange([])}
            className={
              embedded
                ? "cursor-pointer rounded-full border-2 border-[var(--ink)] bg-[var(--bg)] px-4 py-1.5 text-xs text-[var(--ink)] transition-colors hover:bg-[var(--ink)]/5"
                : "cursor-pointer rounded-full border-2 border-[var(--ink)] bg-[var(--bg)] px-5 py-2 text-sm text-[var(--ink)] transition-colors hover:bg-[var(--ink)]/5"
            }
          >
            Clear dates ({value.length})
          </button>
        </div>
      ) : null}
    </div>
  );
}
