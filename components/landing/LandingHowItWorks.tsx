"use client";

import { useEffect, useRef, useState } from "react";
import { usePrefersReducedMotion } from "@/lib/hooks/usePaintCanvas";
import { HandwrittenItsEasy } from "./HandwrittenItsEasy";

const STEPS = [
  {
    title: "List your formal",
    body: "Post a seat at your college — a swap, or a paid guest spot.",
  },
  {
    title: "Request a seat",
    body: "Ask to swap yours for theirs, or just pay.",
  },
  {
    title: "Go somewhere new",
    body: "Meet your host, feast, then rate your visit.",
  },
];

/** Steps plus the closing "it's that easy" beat. */
const FRAMES = STEPS.length + 1;
/** Viewport-heights of scroll granted to each frame — how long it freezes. */
const SCROLL_PER_FRAME = 80;
/** Extra scroll multiplier for the finale frame so the handwriting reveal feels slower. */
const FINALE_SCROLL_MULTIPLIER = 5;

/**
 * Scroll-pinned walkthrough. A tall runway holds a `position: sticky` panel that
 * fills the window and freezes while you scroll; scroll progress steps through
 * the how-it-works cards one at a time and lands on a big "it's that easy."
 *
 * Under reduced motion it degrades to a plain static list — no pin, no
 * scroll-driven state — so nothing hijacks the scroll for those visitors.
 */
export function LandingHowItWorks() {
  const reduced = usePrefersReducedMotion();
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const [active, setActive] = useState(0);
  const [finaleProgress, setFinaleProgress] = useState(0);

  useEffect(() => {
    if (reduced) return;
    const wrap = wrapRef.current;
    if (!wrap) return;
    let raf = 0;
    const update = () => {
      raf = 0;
      const rect = wrap.getBoundingClientRect();
      const range = wrap.offsetHeight - window.innerHeight;
      const scrolled = Math.min(Math.max(-rect.top, 0), Math.max(range, 1));
      const p = range > 0 ? scrolled / range : 0;
      // The total runway is (FRAMES-1) normal slices + 1 stretched finale slice.
      const totalWeight = (FRAMES - 1) + FINALE_SCROLL_MULTIPLIER;
      const normalSlice = 1 / totalWeight;
      const finaleStart = (FRAMES - 1) * normalSlice;
      const frame = p < finaleStart
        ? Math.floor(p / normalSlice)
        : FRAMES - 1;
      setActive(Math.min(FRAMES - 1, frame));
      const fp = Math.min(1, Math.max(0, (p - finaleStart) / (1 - finaleStart)));
      setFinaleProgress(fp);
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [reduced]);

  if (reduced) {
    return (
      <section className="flex min-h-[85svh] flex-col justify-center bg-[var(--bg)] px-4 py-16 text-[var(--ink)] sm:px-6">
        <h2 className="font-display text-3xl uppercase tracking-wide">
          How it works
        </h2>
        <ol className="mt-8 grid gap-4 sm:grid-cols-3">
          {STEPS.map((step, index) => (
            <li key={step.title}>
              <div className="h-full rounded-[14px] border-[2px] border-[var(--ink)] bg-[var(--paper)] p-5">
                <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-[var(--accent-wash)] text-sm font-bold text-[var(--accent-wash-ink)]">
                  {index + 1}
                </span>
                <h3 className="mt-3 text-lg font-bold">{step.title}</h3>
                <p className="mt-1 text-sm leading-relaxed text-[var(--ink-muted)]">
                  {step.body}
                </p>
              </div>
            </li>
          ))}
        </ol>
        <p className="mt-10 text-center font-display text-4xl lowercase text-[var(--accent)]">
          it&rsquo;s that easy.
        </p>
      </section>
    );
  }

  return (
    <section
      ref={wrapRef}
      aria-label="How it works"
      className="relative bg-[var(--bg)] text-[var(--ink)]"
      style={{ height: `${(FRAMES - 1) * SCROLL_PER_FRAME + SCROLL_PER_FRAME * FINALE_SCROLL_MULTIPLIER}svh` }}
    >
      <div className="sticky top-0 flex h-svh flex-col items-center justify-center overflow-hidden px-6">
        <span className="absolute left-1/2 top-[12svh] -translate-x-1/2 font-display text-sm uppercase tracking-[0.2em] text-[color-mix(in_srgb,var(--ink)_55%,var(--bg))]">
          How it works
        </span>

        {/* Stacked frames; the active one fades/rises in, the rest step aside. */}
        <div className="relative flex h-[46svh] w-full max-w-2xl items-center justify-center">
          {STEPS.map((step, index) => {
            const state =
              active === index ? 0 : active > index ? -1 : 1;
            return (
              <div
                key={step.title}
                aria-hidden={active !== index}
                className="absolute inset-0 flex flex-col items-center justify-center text-center transition-[opacity,transform] duration-500 ease-out"
                style={{
                  opacity: state === 0 ? 1 : 0,
                  transform: `translateY(${state * 28}px)`,
                }}
              >
                <span className="font-display text-[clamp(4rem,16vw,10rem)] leading-none text-[var(--accent)]">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <h3 className="mt-4 text-2xl font-bold sm:text-3xl">
                  {step.title}
                </h3>
                <p className="mt-3 max-w-[40ch] text-base leading-relaxed text-[color-mix(in_srgb,var(--ink)_72%,var(--bg))]">
                  {step.body}
                </p>
              </div>
            );
          })}

          {/* Closing beat. */}
          <div
            aria-hidden={active !== FRAMES - 1}
            className="absolute inset-0 flex items-center justify-center text-center transition-[opacity,transform] duration-500 ease-out"
            style={{ opacity: active === FRAMES - 1 ? 1 : 0 }}
          >
            <HandwrittenItsEasy progress={finaleProgress} />
          </div>
        </div>

        {/* Progress ticks. */}
        <div className="absolute bottom-[12svh] left-1/2 flex -translate-x-1/2 gap-2">
          {Array.from({ length: FRAMES }).map((_, i) => (
            <span
              key={i}
              className="h-1.5 rounded-full transition-all duration-300"
              style={{
                width: active === i ? 28 : 8,
                backgroundColor:
                  active >= i
                    ? "var(--accent)"
                    : "color-mix(in srgb, var(--ink) 30%, transparent)",
              }}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
