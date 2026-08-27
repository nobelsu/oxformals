"use client";

import { useEffect, useRef, useState } from "react";

type PersonDot = {
  initials: string;
  x: number;
  y: number;
  scale: number;
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
  };
});

/**
 * Cover card for SprayFinale — shows "your friends are probably already here".
 * When scrolled into view the avatars pop out of the centre Instagram ring one
 * by one into fixed positions, then stay put (no floating), hinting at the
 * upcoming Instagram integration.
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
      {/* Avatars popping outward from an IG-gradient ring */}
      <div className="relative h-[340px] w-[340px] sm:h-[420px] sm:w-[420px]">
        {/* Pulsing Instagram conic-gradient glow */}
        <div
          className="absolute inset-4 rounded-full opacity-50 blur-xl"
          style={{
            background:
              "conic-gradient(from 0deg, #f09433, #e6683c, #dc2743, #cc2366, #bc1888, #833ab4, #5851db, #405de6, #f09433)",
            animation: "spin 6s linear infinite",
          }}
        />

        {/* Center icon */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl border-2 border-[var(--ink)] bg-[var(--bg)] sm:h-20 sm:w-20 sm:rounded-[20px]">
            <svg
              viewBox="0 0 24 24"
              className="h-8 w-8 sm:h-10 sm:w-10"
              fill="none"
              stroke="var(--ink)"
              strokeWidth={1.5}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x={2} y={2} width={20} height={20} rx={5} />
              <circle cx={12} cy={12} r={5} />
              <circle cx={17.5} cy={6.5} r={1} fill="var(--ink)" stroke="none" />
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
          your friends are
          <br />
          probably already here
        </h3>
        <p
          className="max-w-[30ch] text-sm leading-relaxed text-[var(--ink-muted)] sm:text-base"
          style={{
            opacity: visible ? 1 : 0,
            transform: visible ? "none" : "translateY(8px)",
            transition: "opacity 0.5s ease 1.1s, transform 0.5s ease 1.1s",
          }}
        >
          Connect your Instagram
          <br />
          to find them instantly.
        </p>
      </div>
    </div>
  );
}
