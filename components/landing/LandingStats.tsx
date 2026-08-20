"use client";

import { useEffect, useRef, useState } from "react";
import { usePrefersReducedMotion } from "@/lib/hooks/usePaintCanvas";
import { Reveal } from "@/components/landing/Reveal";

// TODO(numbers): placeholder figures — swap for the real ones the user supplies.
const STATS = [
  { value: 100, suffix: "+", label: "formals" },
  { value: 38, suffix: "", label: "colleges & halls" },
  { value: 600, suffix: "+", label: "students on board" },
  { value: 0, suffix: "", prefix: "£", label: "to join" },
] as const;

function formatNumber(n: number): string {
  return n.toLocaleString("en-GB");
}

/** Eases a value from 0 to `target` over `duration` ms once `active` flips true. */
function useCountUp(target: number, active: boolean, duration = 1300): number {
  const reduced = usePrefersReducedMotion();
  const [value, setValue] = useState(0);
  const rafRef = useRef<number | null>(null);
  const startRef = useRef<number | null>(null);

  useEffect(() => {
    if (!active || reduced) return;
    const step = (now: number) => {
      if (startRef.current == null) startRef.current = now;
      const t = Math.min(1, (now - startRef.current) / duration);
      // easeOutCubic
      const eased = 1 - Math.pow(1 - t, 3);
      setValue(Math.round(target * eased));
      if (t < 1) rafRef.current = requestAnimationFrame(step);
    };
    rafRef.current = requestAnimationFrame(step);
    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
      startRef.current = null;
    };
  }, [active, target, duration, reduced]);

  return reduced ? target : value;
}

function Stat({
  value,
  suffix,
  prefix,
  label,
  active,
}: {
  value: number;
  suffix: string;
  prefix?: string;
  label: string;
  active: boolean;
}) {
  const n = useCountUp(value, active);
  return (
    <div className="flex flex-col items-center text-center">
      <span className="font-display text-[clamp(2.75rem,8vw,5rem)] leading-none text-[var(--accent)]">
        {prefix}
        {formatNumber(n)}
        {suffix}
      </span>
      <span className="mt-2 text-sm uppercase tracking-wide text-[var(--ink-muted)]">
        {label}
      </span>
    </div>
  );
}

/**
 * A count-up stats band. The numbers animate from zero once the band scrolls
 * into view (one-shot); under reduced motion they render at their final value.
 */
export function LandingStats() {
  const ref = useRef<HTMLDivElement | null>(null);
  const [active, setActive] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setActive(true);
          io.disconnect();
        }
      },
      { threshold: 0.3 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <section className="flex min-h-[70svh] flex-col justify-center py-16">
      <Reveal>
        <h2 className="text-center font-display text-3xl uppercase tracking-wide">
          Oxford formal swapping,{" "}
          <span className="relative inline-block">
            <span
              aria-hidden
              className="absolute inset-x-[-0.15em] bottom-[0.05em] top-[0.42em] -z-0 -rotate-1 rounded-[0.2em] bg-[var(--accent-wash)]"
            />
            <span className="relative z-[1]">by the numbers</span>
          </span>
        </h2>
      </Reveal>
      <div
        ref={ref}
        className="mt-12 grid grid-cols-2 gap-10 sm:grid-cols-4"
      >
        {STATS.map((s, i) => (
          <Reveal key={s.label} delay={i * 90}>
            <Stat
              value={s.value}
              suffix={s.suffix}
              prefix={"prefix" in s ? s.prefix : undefined}
              label={s.label}
              active={active}
            />
          </Reveal>
        ))}
      </div>
    </section>
  );
}
