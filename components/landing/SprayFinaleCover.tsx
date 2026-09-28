"use client";

import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";

type Notice = {
  initials: string;
  body: ReactNode;
  /** Resting tilt in degrees. */
  rotate: number;
  /** Horizontal nudge so the stack looks hand-placed. */
  offsetX: number;
  /** The last card: rose wash and a check on the avatar. */
  highlight?: boolean;
};

const NOTICES: Notice[] = [
  {
    initials: "JY",
    body: (
      <>
        <b>Juyeon</b> from your contacts just joined Oxformals
      </>
    ),
    rotate: -3,
    offsetX: 10,
  },
  {
    initials: "MK",
    body: (
      <>
        <b>Max</b> listed a Keble formal ·{" "}
        <span className="font-bold text-[var(--accent)]">2 seats left</span>
      </>
    ),
    rotate: 2.5,
    offsetX: -8,
  },
  {
    initials: "PR",
    body: (
      <>
        <b>Priya</b> is going to Worcester on Saturday. Want in?
      </>
    ),
    rotate: -1,
    offsetX: 4,
    highlight: true,
  },
];

function Check() {
  return (
    <span
      aria-hidden
      className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full border-[1.5px] border-[var(--ink)] bg-[var(--accent)] text-[var(--accent-ink)]"
    >
      <svg viewBox="0 0 12 12" className="h-2.5 w-2.5" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
        <path d="M2.5 6.2 5 8.5l4.5-5" />
      </svg>
    </span>
  );
}

/**
 * Cover card for SprayFinale — "someone you know is going". When scrolled into
 * view, three friend notifications drop onto a loose stack one after another,
 * hinting at contact sync in the app.
 */
export function SprayFinaleCover() {
  const [visible, setVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setVisible(true);
      },
      { threshold: 0.2 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div ref={ref} className="flex flex-col items-center gap-8 text-center">
      {/* Notification stack */}
      <div className="relative flex w-full max-w-[360px] flex-col gap-4 px-4 py-6 sm:max-w-[400px]">
        {NOTICES.map((n, i) => {
          const delay = 150 + i * 220;
          return (
            <div
              key={n.initials}
              className={`flex items-center gap-3 rounded-2xl border-2 border-[var(--ink)] p-3 text-left shadow-[4px_4px_0_var(--ink)] ${
                n.highlight
                  ? "bg-[var(--accent-wash)] text-[var(--accent-wash-ink)]"
                  : "bg-[var(--paper)] text-[var(--ink)]"
              }`}
              style={{
                transform: visible
                  ? `translateX(${n.offsetX}px) rotate(${n.rotate}deg)`
                  : `translateX(${n.offsetX}px) translateY(-28px) rotate(${n.rotate * 2}deg) scale(0.92)`,
                opacity: visible ? 1 : 0,
                transition: `transform 0.6s cubic-bezier(0.22, 1.4, 0.36, 1) ${delay}ms, opacity 0.3s ease ${delay}ms`,
              }}
            >
              <span
                className={`relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 border-[var(--ink)] text-[0.7rem] font-bold text-[var(--accent-wash-ink)] ${
                  n.highlight ? "bg-[var(--paper)] !text-[var(--ink)]" : "bg-[var(--accent-wash)]"
                }`}
              >
                {n.initials}
                {n.highlight ? <Check /> : null}
              </span>
              <p className="text-[0.8rem] leading-snug sm:text-sm">{n.body}</p>
            </div>
          );
        })}

        {/* Hand-drawn burst */}
        <svg
          aria-hidden
          viewBox="0 0 36 36"
          className="absolute -right-1 top-1 h-9 w-9 text-[var(--accent)]"
          fill="none"
          stroke="currentColor"
          strokeWidth={2.5}
          strokeLinecap="round"
          style={{
            opacity: visible ? 1 : 0,
            transform: visible ? "scale(1) rotate(0deg)" : "scale(0.4) rotate(-30deg)",
            transition: "opacity 0.3s ease 0.8s, transform 0.5s cubic-bezier(0.22, 1.6, 0.36, 1) 0.8s",
          }}
        >
          <path d="M18 3v9M18 24v9M3 18h9M24 18h9M8 8l5 5M23 23l5 5M28 8l-5 5M13 23l-5 5" />
        </svg>
      </div>

      {/* Copy */}
      <div className="flex flex-col items-center gap-3">
        <h3
          className="font-display text-[clamp(1.5rem,5vw,2.6rem)] font-bold lowercase leading-[0.95] tracking-tight text-[var(--ink)]"
          style={{
            opacity: visible ? 1 : 0,
            transform: visible ? "none" : "translateY(12px)",
            transition: "opacity 0.6s ease 0.9s, transform 0.6s ease 0.9s",
          }}
        >
          someone you know
          <br />
          is going
        </h3>
        <p
          className="max-w-[30ch] text-sm leading-relaxed text-[var(--ink-muted)] sm:text-base"
          style={{
            opacity: visible ? 1 : 0,
            transform: visible ? "none" : "translateY(8px)",
            transition: "opacity 0.5s ease 1.1s, transform 0.5s ease 1.1s",
          }}
        >
          Sync your contacts in the app to see
          <br />
          which friends are already swapping.
        </p>
      </div>
    </div>
  );
}
