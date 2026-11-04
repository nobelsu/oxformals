"use client";

import { useLayoutEffect, type RefObject } from "react";

/**
 * Publishes the nav's live height as `--app-nav-height` on <html>, so things
 * pinned beneath it (sticky day headers, the chat panel) meet its bottom edge
 * exactly. The nav's height differs per variant and shrinks when it collapses
 * on scroll, so a fixed value leaves a gap that content scrolls through.
 *
 * Re-attaches after every render because the nav swaps elements between
 * variants (signed-out, signed-in, legal…) without remounting the component.
 */
export function useNavHeightVar(navRef: RefObject<HTMLElement | null>) {
  useLayoutEffect(() => {
    const nav = navRef.current;
    if (!nav) return;

    const publish = () =>
      document.documentElement.style.setProperty(
        "--app-nav-height",
        `${nav.getBoundingClientRect().height}px`,
      );
    publish();
    const observer = new ResizeObserver(publish);
    observer.observe(nav);
    return () => observer.disconnect();
  });
}
