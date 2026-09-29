"use client";

import { useEffect, useRef, useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { CollegeCrest } from "@/components/colleges/CollegeCrest";

type Bubble = {
  key: string;
  college: string;
  dateTime: string;
  listingIds: string[];
  onWishlist: boolean;
};

const london = (iso: string) =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/London",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(iso));

function dayLabel(iso: string, nowMs: number): string {
  const day = london(iso);
  if (day === london(new Date(nowMs).toISOString())) return "Tonight";
  if (day === london(new Date(nowMs + 864e5).toISOString())) return "Tomorrow";
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/London",
    weekday: "short",
    day: "numeric",
  }).format(new Date(iso));
}

/**
 * Open formals this week as college bubbles, grouped by night. Scrolls
 * sideways; the right edge fades while there's more, and desktop gets an
 * arrow. Hidden when nothing's on.
 */
export function WeekFormals({
  onOpen,
}: {
  onOpen: (bubble: Bubble) => void;
}) {
  const bubbles = useQuery(api.feed.getWeekFormals, {});
  const scroller = useRef<HTMLDivElement>(null);
  const [more, setMore] = useState(false);
  const [nowMs] = useState(() => Date.now());

  useEffect(() => {
    const el = scroller.current;
    if (!el) return;
    const update = () =>
      setMore(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
    update();
    el.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      el.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [bubbles]);

  if (!bubbles || bubbles.length === 0) return null;

  const days: { label: string; items: Bubble[] }[] = [];
  for (const b of bubbles) {
    const label = dayLabel(b.dateTime, nowMs);
    const last = days[days.length - 1];
    if (last && last.label === label) last.items.push(b);
    else days.push({ label, items: [b] });
  }

  return (
    <div className="relative">
      <div
        ref={scroller}
        className="scrollbar-hide flex snap-x gap-5 overflow-x-auto pb-1"
        style={
          more
            ? {
                maskImage: "linear-gradient(to right, #000 82%, transparent)",
                WebkitMaskImage: "linear-gradient(to right, #000 82%, transparent)",
              }
            : undefined
        }
      >
        {days.map((day, i) => (
          <div
            key={day.label}
            className={`flex shrink-0 snap-start flex-col gap-2 ${
              i > 0 ? "border-l-[1.5px] border-[color-mix(in_srgb,var(--ink)_12%,transparent)] pl-5" : ""
            }`}
          >
            <span
              className={`text-xs font-bold ${
                day.label === "Tonight" ? "text-[var(--accent)]" : "text-[var(--ink-muted)]"
              }`}
            >
              {day.label}
            </span>
            <div className="flex gap-3">
              {day.items.map((b) => (
                <button
                  key={b.key}
                  type="button"
                  onClick={() => onOpen(b)}
                  title={`${b.college} · ${day.label}`}
                  className="group flex w-16 cursor-pointer flex-col items-center gap-1.5"
                >
                  <span
                    className={`flex h-16 w-16 items-center justify-center rounded-full border-2 p-[3px] transition-transform group-hover:scale-105 ${
                      b.onWishlist ? "border-[var(--accent)]" : "border-[var(--ink)]"
                    }`}
                  >
                    <span className="flex h-full w-full items-center justify-center rounded-full bg-[var(--paper)]">
                      <CollegeCrest college={b.college} size={32} />
                    </span>
                  </span>
                  <span className="w-full truncate text-center text-[0.72rem] text-[var(--ink-muted)]">
                    {b.college}
                  </span>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
      {more ? (
        <button
          type="button"
          aria-label="More formals"
          onClick={() => scroller.current?.scrollBy({ left: 240, behavior: "smooth" })}
          className="absolute right-0 top-[calc(50%+2px)] hidden h-8 w-8 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full border-[1.5px] border-[var(--ink)] bg-[var(--paper)] text-[var(--ink)] shadow-sm hover:bg-[var(--ink)] hover:text-[var(--bg)] sm:flex"
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="m9 6 6 6-6 6" />
          </svg>
        </button>
      ) : null}
    </div>
  );
}
