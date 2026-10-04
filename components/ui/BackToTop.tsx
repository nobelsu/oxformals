"use client";

import { useEffect, useState } from "react";

/** Round "back to top" button, bottom right, once you've scrolled a screen. */
export function BackToTop() {
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const onScroll = () => setShown(window.scrollY > window.innerHeight);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  return (
    <button
      type="button"
      aria-label="Back to top"
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      className={`fixed bottom-[calc(1.25rem+env(safe-area-inset-bottom))] right-5 z-40 flex h-11 w-11 cursor-pointer items-center justify-center rounded-full border-2 border-[var(--ink)] bg-[var(--paper)] text-[var(--ink)] shadow-[2px_2px_0_var(--ink)] transition-all duration-200 hover:bg-[var(--ink)] hover:text-[var(--bg)] ${
        shown ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-3 opacity-0"
      }`}
    >
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M12 19V5M6 11l6-6 6 6" />
      </svg>
    </button>
  );
}
