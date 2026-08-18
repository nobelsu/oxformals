"use client";

import { useEffect, useRef } from "react";
import { useReducedOrCoarse } from "@/lib/hooks/usePaintCanvas";

const CONTAINER_ID = "handwrite-formal";

/**
 * The word "formal" written out by hand under the hero headline, using Vara's
 * single-stroke handwriting font (self-hosted JSON, no CDN). It genuinely draws
 * itself pen-style once on mount, in `--accent`.
 *
 * Under reduced motion / coarse pointers it renders nothing — the printed
 * headline already reads "…Oxford formal.", so the accent is pure decoration.
 */
export function HeadlineScript() {
  const skip = useReducedOrCoarse();
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (skip) return;
    const el = ref.current;
    if (!el) return;
    let cancelled = false;
    el.innerHTML = "";

    (async () => {
      const { default: Vara } = await import("vara");
      if (cancelled || !ref.current) return;
      const accent =
        getComputedStyle(document.documentElement)
          .getPropertyValue("--accent")
          .trim() || "#b8524c";
      new Vara(
        `#${CONTAINER_ID}`,
        "/fonts/shadows-into-light.json",
        [
          {
            text: "formal",
            fontSize: 44,
            strokeWidth: 1.5,
            duration: 1400,
            color: accent,
            textAlign: "left",
          },
        ],
        { autoAnimation: true },
      );
    })();

    return () => {
      cancelled = true;
      el.innerHTML = "";
    };
  }, [skip]);

  if (skip) return null;

  return (
    <div
      id={CONTAINER_ID}
      ref={ref}
      aria-hidden
      className="pointer-events-none mt-1 mb-1 min-h-[52px] w-[180px] max-w-full text-[var(--accent)]"
    />
  );
}
