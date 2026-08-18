"use client";

import { useEffect, useRef, useState } from "react";
import { usePrefersReducedMotion } from "@/lib/hooks/usePaintCanvas";

type RevealProps = {
  children: React.ReactNode;
  className?: string;
  /** Extra delay before the reveal transition starts, in ms (for stagger). */
  delay?: number;
  /** How far the element rises as it reveals, in px. */
  distance?: number;
  as?: "div" | "section" | "li" | "span";
};

/**
 * Fades + rises its children in once they scroll into view (one-shot). Under
 * `prefers-reduced-motion` the children render in their final state with no
 * transform and no observer. Content is always in the DOM (SEO-safe) — only its
 * opacity/transform animates.
 */
export function Reveal({
  children,
  className = "",
  delay = 0,
  distance = 16,
  as = "div",
}: RevealProps) {
  const reduced = usePrefersReducedMotion();
  const ref = useRef<HTMLElement | null>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    if (reduced) return;
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShown(true);
          io.disconnect();
        }
      },
      { threshold: 0.15, rootMargin: "0px 0px -10% 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [reduced]);

  const visible = reduced || shown;
  const Tag = as as "div";

  return (
    <Tag
      ref={ref as React.Ref<HTMLDivElement>}
      className={className}
      style={
        reduced
          ? undefined
          : {
              opacity: visible ? 1 : 0,
              transform: visible ? "none" : `translateY(${distance}px)`,
              transition: "opacity 620ms ease-out, transform 620ms ease-out",
              transitionDelay: `${delay}ms`,
              willChange: "opacity, transform",
            }
      }
    >
      {children}
    </Tag>
  );
}
