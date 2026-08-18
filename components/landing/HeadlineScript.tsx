"use client";

import { useEffect, useRef } from "react";
import { useReducedOrCoarse } from "@/lib/hooks/usePaintCanvas";

const CONTAINER_ID = "handwrite-formal";

/**
 * The terminal word of the hero headline — "formal." — written out by hand,
 * inline, so it reads as part of the sentence ("…any Oxford <em>formal.</em>")
 * rather than a caption underneath. Uses Vara's single-stroke handwriting font
 * (self-hosted JSON, no CDN); it genuinely draws itself pen-style once on mount,
 * in `--accent`, as the sentence's accented last beat.
 *
 * Under reduced motion / coarse pointers it renders the plain accent word — no
 * canvas, no animation — so the sentence still completes.
 */
export function HeadlineScript() {
  const skip = useReducedOrCoarse();
  const ref = useRef<HTMLSpanElement | null>(null);

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
            text: "formal.",
            fontSize: 38,
            strokeWidth: 1.6,
            duration: 1300,
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

  if (skip) {
    return <span className="text-[var(--accent)]">formal.</span>;
  }

  return (
    <span
      id={CONTAINER_ID}
      ref={ref}
      aria-label="formal."
      className="inline-block translate-y-[0.18em] align-baseline leading-none text-[var(--accent)]"
    />
  );
}
