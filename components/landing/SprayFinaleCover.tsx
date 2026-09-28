"use client";

import { useEffect, useRef, useState } from "react";

type PersonDot = {
  initials: string;
  x: number;
  y: number;
  scale: number;
  /** Already on Oxformals: gets a small rose check. */
  onApp: boolean;
};

const INITIALS = ["JO", "LI", "PR", "MK", "SA", "EM", "AX", "CH"] as const;

// Fixed, evenly-spaced ring positions (deterministic → SSR-safe, no jitter).
const RING_RADIUS = 148;
const PEOPLE: PersonDot[] = INITIALS.map((initials, i) => {
  const angle = ((-90 + i * (360 / INITIALS.length)) * Math.PI) / 180;
  return {
    initials,
    x: Math.round(Math.cos(angle) * RING_RADIUS),
    y: Math.round(Math.sin(angle) * RING_RADIUS),
    scale: i % 2 === 0 ? 1.02 : 0.94,
    onApp: i % 3 === 0,
  };
});

/**
 * Cover card for SprayFinale — "someone you know is going". When scrolled into
 * view, contacts pop out of the centre address book one by one into fixed
 * positions and stay put; a few carry a rose check for "already on Oxformals",
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
      {/* Contacts popping outward from an address book */}
      <div className="relative h-[340px] w-[340px] sm:h-[420px] sm:w-[420px]">
        {/* Soft rose glow */}
        <div
          className="absolute inset-10 rounded-full opacity-70 blur-2xl"
          style={{
            background:
              "radial-gradient(circle, var(--accent-wash) 0%, transparent 70%)",
          }}
        />

        {/* Centre: address book */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl border-2 border-[var(--ink)] bg-[var(--bg)] shadow-[3px_3px_0_var(--ink)] sm:h-20 sm:w-20 sm:rounded-[20px]">
            <svg
              viewBox="0 0 24 24"
              className="h-8 w-8 sm:h-10 sm:w-10"
              fill="none"
              stroke="var(--ink)"
              strokeWidth={1.5}
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <rect x={5} y={2.5} width={15} height={19} rx={2.5} />
              <path d="M3 7h3M3 12h3M3 17h3" />
              <circle cx={12.5} cy={10} r={2.6} />
              <path d="M8.5 17c.6-2.2 2.2-3.3 4-3.3s3.4 1.1 4 3.3" />
            </svg>
          </div>
        </div>

        {/* Avatars pop out to fixed positions, one after another */}
        {PEOPLE.map((person, i) => {
          const delay = 120 + i * 90;
          const baseRotation = (i % 2 === 0 ? -1 : 1) * (4 + (i % 3) * 1.5);

          return (
            <span
              key={person.initials}
              className="absolute left-1/2 top-1/2 flex h-9 w-9 items-center justify-center rounded-full border-[2px] border-[var(--ink)] bg-[var(--bg)] text-[0.7rem] font-bold text-[var(--ink)] shadow-sm sm:h-10 sm:w-10"
              style={{
                transform: visible
                  ? `translate(calc(-50% + ${person.x}px), calc(-50% + ${person.y}px)) rotate(${baseRotation}deg) scale(${person.scale})`
                  : "translate(-50%, -50%) scale(0)",
                opacity: visible ? 1 : 0,
                transition: `transform 0.7s cubic-bezier(0.22, 1.6, 0.36, 1) ${delay}ms, opacity 0.25s ease ${delay}ms`,
              }}
            >
              {person.initials}
              {person.onApp ? (
                <span
                  aria-hidden
                  className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full border-[1.5px] border-[var(--ink)] bg-[var(--accent)] text-[var(--accent-ink)]"
                >
                  <svg viewBox="0 0 12 12" className="h-2.5 w-2.5" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                    <path d="M2.5 6.2 5 8.5l4.5-5" />
                  </svg>
                </span>
              ) : null}
            </span>
          );
        })}
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
