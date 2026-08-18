"use client";

import { useEffect, useState } from "react";

/**
 * True when the interactive paint layer should be skipped in favour of the
 * static form: the user prefers reduced motion, or the primary pointer is
 * coarse (touch). Re-evaluates on media-query change.
 */
export function useReducedOrCoarse(): boolean {
  const [skip, setSkip] = useState(false);
  useEffect(() => {
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const coarse = window.matchMedia("(pointer: coarse)");
    const sync = () => setSkip(motion.matches || coarse.matches);
    sync();
    motion.addEventListener("change", sync);
    coarse.addEventListener("change", sync);
    return () => {
      motion.removeEventListener("change", sync);
      coarse.removeEventListener("change", sync);
    };
  }, []);
  return skip;
}

/**
 * True when the user prefers reduced motion. Unlike {@link useReducedOrCoarse}
 * this ignores pointer type — touch visitors still get scroll-reveal motion.
 */
export function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReduced(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);
  return reduced;
}

/** Keeps a canvas sized to its CSS box × dpr (capped at 2); calls back after each resize. */
export function useCanvasDpr(
  canvasRef: React.RefObject<HTMLCanvasElement | null>,
  onResize?: (
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    dpr: number,
  ) => void,
): void {
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ro = new ResizeObserver(() => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const rect = canvas.getBoundingClientRect();
      canvas.width = Math.round(rect.width * dpr);
      canvas.height = Math.round(rect.height * dpr);
      const ctx = canvas.getContext("2d");
      if (ctx && onResize) onResize(ctx, canvas.width, canvas.height, dpr);
    });
    ro.observe(canvas);
    return () => ro.disconnect();
  }, [canvasRef, onResize]);
}
