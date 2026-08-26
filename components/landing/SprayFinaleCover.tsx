"use client";

import { useEffect, useRef, useState } from "react";

type PersonDot = {
  initials: string;
  x: number;
  y: number;
  scale: number;
<<<<<<< HEAD
=======
  vx: number;
  vy: number;
>>>>>>> 6b96ce8 (minor change: changed the profile edit page and profile badges)
};

const INITIALS = ["JO", "LI", "PR", "MK", "SA", "EM", "AX", "CH"] as const;

<<<<<<< HEAD
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
=======
// SSR-safe fallback while client random positions are computed.
const FALLBACK_PEOPLE: PersonDot[] = [
  { initials: "JO", x: -118, y: -126, scale: 1.02, vx: 0.26, vy: -0.24 },
  { initials: "LI", x: 106, y: -112, scale: 0.96, vx: -0.32, vy: 0.2 },
  { initials: "PR", x: 146, y: 24, scale: 1.04, vx: -0.22, vy: -0.28 },
  { initials: "MK", x: -132, y: 56, scale: 0.94, vx: 0.29, vy: -0.18 },
  { initials: "SA", x: 40, y: 138, scale: 0.98, vx: -0.19, vy: -0.33 },
  { initials: "EM", x: -88, y: 124, scale: 0.92, vx: 0.34, vy: -0.16 },
  { initials: "AX", x: -154, y: -26, scale: 1.06, vx: 0.22, vy: 0.3 },
  { initials: "CH", x: 82, y: -146, scale: 0.95, vx: -0.28, vy: 0.25 },
];

function buildRandomPeople(): PersonDot[] {
  const placed: PersonDot[] = [];
  const minRadius = 92;
  const maxRadius = 178;
  const minDistance = 64;

  for (const initials of INITIALS) {
    let pick: PersonDot | null = null;
    let attempt = 0;

    while (attempt < 60 && !pick) {
      const angle = Math.random() * Math.PI * 2;
      const radius = minRadius + Math.random() * (maxRadius - minRadius);
      const x = Math.cos(angle) * radius + (Math.random() - 0.5) * 18;
      const y = Math.sin(angle) * radius + (Math.random() - 0.5) * 18;

      const tooClose = placed.some((p) => {
        const dx = p.x - x;
        const dy = p.y - y;
        return Math.hypot(dx, dy) < minDistance;
      });

      if (!tooClose) {
        pick = {
          initials,
          x: Math.round(x),
          y: Math.round(y),
          scale: 0.92 + Math.random() * 0.16,
          vx: (Math.random() * 0.7 - 0.35) || 0.22,
          vy: (Math.random() * 0.7 - 0.35) || -0.24,
        };
      }
      attempt += 1;
    }

    placed.push(
      pick ?? {
        initials,
        x: FALLBACK_PEOPLE[placed.length].x,
        y: FALLBACK_PEOPLE[placed.length].y,
        scale: FALLBACK_PEOPLE[placed.length].scale,
        vx: FALLBACK_PEOPLE[placed.length].vx,
        vy: FALLBACK_PEOPLE[placed.length].vy,
      },
    );
  }

  return placed;
}

/**
 * Cover card for SprayFinale — shows "your friends are probably already here"
 * with avatars that spring outward from the center IG ring and gently bob,
 * hinting at upcoming Instagram integration.
 */
export function SprayFinaleCover() {
  const [visible, setVisible] = useState(false);
  const [motionActive, setMotionActive] = useState(false);
  const [people, setPeople] = useState<PersonDot[]>(FALLBACK_PEOPLE);
  const animRef = useRef<number | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setPeople(buildRandomPeople());

>>>>>>> 6b96ce8 (minor change: changed the profile edit page and profile badges)
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

<<<<<<< HEAD
  return (
    <div ref={ref} className="flex flex-col items-center gap-8 text-center">
      {/* Avatars popping outward from an IG-gradient ring */}
=======
  useEffect(() => {
    if (!visible) return;
    setMotionActive(false);
    const t = window.setTimeout(() => setMotionActive(true), 950);
    return () => window.clearTimeout(t);
  }, [visible]);

  useEffect(() => {
    if (!visible || !motionActive) return;

    const bounds = 172;
    const avatarRadius = 19;
    const collisionDistance = 42;

    const tick = () => {
      setPeople((prev) => {
        const next = prev.map((p) => ({ ...p, x: p.x + p.vx, y: p.y + p.vy }));

        for (const p of next) {
          if (p.x > bounds - avatarRadius) {
            p.x = bounds - avatarRadius;
            p.vx *= -1;
          }
          if (p.x < -bounds + avatarRadius) {
            p.x = -bounds + avatarRadius;
            p.vx *= -1;
          }
          if (p.y > bounds - avatarRadius) {
            p.y = bounds - avatarRadius;
            p.vy *= -1;
          }
          if (p.y < -bounds + avatarRadius) {
            p.y = -bounds + avatarRadius;
            p.vy *= -1;
          }
        }

        for (let i = 0; i < next.length; i += 1) {
          for (let j = i + 1; j < next.length; j += 1) {
            const a = next[i];
            const b = next[j];
            const dx = b.x - a.x;
            const dy = b.y - a.y;
            const dist = Math.hypot(dx, dy);
            if (dist >= collisionDistance || dist === 0) continue;

            const overlap = (collisionDistance - dist) / 2;
            const nx = dx / dist;
            const ny = dy / dist;

            a.x -= nx * overlap;
            a.y -= ny * overlap;
            b.x += nx * overlap;
            b.y += ny * overlap;

            const avx = a.vx;
            const avy = a.vy;
            a.vx = b.vx * 0.997;
            a.vy = b.vy * 0.997;
            b.vx = avx * 0.997;
            b.vy = avy * 0.997;
          }
        }

        return next;
      });

      animRef.current = window.requestAnimationFrame(tick);
    };

    animRef.current = window.requestAnimationFrame(tick);
    return () => {
      if (animRef.current) window.cancelAnimationFrame(animRef.current);
    };
  }, [visible, motionActive]);

  return (
    <div ref={ref} className="flex flex-col items-center gap-8 text-center">
      {/* Exploding avatars around an IG-gradient ring */}
>>>>>>> 6b96ce8 (minor change: changed the profile edit page and profile badges)
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

<<<<<<< HEAD
        {/* Avatars pop out to fixed positions, one after another */}
        {PEOPLE.map((person, i) => {
          const delay = 120 + i * 90;
=======
        {/* Avatars exploding outward unevenly */}
        {people.map((person, i) => {
          const delay = 100 + i * 60;
>>>>>>> 6b96ce8 (minor change: changed the profile edit page and profile badges)
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
<<<<<<< HEAD
                transition: `transform 0.7s cubic-bezier(0.22, 1.6, 0.36, 1) ${delay}ms, opacity 0.25s ease ${delay}ms`,
=======
                transition: motionActive
                  ? "none"
                  : `transform 0.8s cubic-bezier(0.22, 1.6, 0.36, 1) ${delay}ms, opacity 0.3s ease ${delay}ms`,
                willChange: motionActive ? "transform" : "auto",
>>>>>>> 6b96ce8 (minor change: changed the profile edit page and profile badges)
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
<<<<<<< HEAD
            transition: "opacity 0.6s ease 0.9s, transform 0.6s ease 0.9s",
=======
            transition: "opacity 0.6s ease 0.5s, transform 0.6s ease 0.5s",
>>>>>>> 6b96ce8 (minor change: changed the profile edit page and profile badges)
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
<<<<<<< HEAD
            transition: "opacity 0.5s ease 1.1s, transform 0.5s ease 1.1s",
          }}
        >
          Connect your Instagram
=======
            transition: "opacity 0.5s ease 0.75s, transform 0.5s ease 0.75s",
          }}
        >
          Connect your Instagram 
>>>>>>> 6b96ce8 (minor change: changed the profile edit page and profile badges)
          <br />
          to find them instantly.
        </p>
      </div>
    </div>
  );
}
