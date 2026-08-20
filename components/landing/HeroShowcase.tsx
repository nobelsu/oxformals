"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

export type HeroSlide = {
  /** Stable key + dot aria-label. */
  id: string;
  /** Eyebrow shown top-left of the panel for this slide. */
  label: string;
  content: ReactNode;
};

const ADVANCE_MS = 2000;

/**
 * The hero's right panel: auto-advancing, swipeable showcase of a few product
 * surfaces. Auto-play pauses on hover/focus and is disabled entirely under
 * prefers-reduced-motion, where the track also snaps instead of sliding.
 */
export function HeroShowcase({ slides }: { slides: HeroSlide[] }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [reduced, setReduced] = useState(false);
  const count = slides.length;

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReduced(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    if (reduced || paused || count <= 1) return;
    const t = window.setInterval(
      () => setIndex((i) => (i + 1) % count),
      ADVANCE_MS,
    );
    return () => window.clearInterval(t);
  }, [reduced, paused, count]);

  // Pointer-swipe.
  const startX = useRef<number | null>(null);
  const onPointerDown = (e: React.PointerEvent) => {
    startX.current = e.clientX;
  };
  const onPointerUp = (e: React.PointerEvent) => {
    if (startX.current === null) return;
    const dx = e.clientX - startX.current;
    startX.current = null;
    if (Math.abs(dx) < 40) return;
    setIndex((i) => (dx < 0 ? (i + 1) % count : (i - 1 + count) % count));
  };

  return (
    <div
      className="rounded-[16px] border-[2px] border-[var(--ink)] bg-[var(--paper)] p-4 sm:p-5"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
      role="group"
      aria-roledescription="carousel"
      aria-label="What oxformals does"
    >
      <div className="mb-1 flex items-baseline justify-between">
        <span
          key={slides[index].id}
          className="text-xs font-bold uppercase tracking-widest text-[var(--ink-muted)]"
        >
          {slides[index].label}
        </span>
        <div className="flex items-center gap-1.5" role="tablist" aria-label="Slides">
          {slides.map((s, i) => (
            <button
              key={s.id}
              type="button"
              role="tab"
              aria-selected={i === index}
              aria-label={s.id}
              onClick={() => setIndex(i)}
              className={`h-1.5 rounded-full transition-all ${
                i === index
                  ? "w-4 bg-[var(--accent)]"
                  : "w-1.5 bg-[color-mix(in_srgb,var(--ink)_25%,transparent)]"
              }`}
            />
          ))}
        </div>
      </div>

      <div
        className="overflow-hidden"
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
      >
        <div
          className={`flex ${reduced ? "" : "transition-transform duration-500 ease-out"}`}
          style={{ transform: `translateX(-${index * 100}%)` }}
        >
          {slides.map((s, i) => (
            <div
              key={s.id}
              className="min-h-[16rem] w-full shrink-0"
              aria-hidden={i !== index}
            >
              {s.content}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
