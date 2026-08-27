"use client";

import { useCallback, useEffect } from "react";
import { createPortal } from "react-dom";

type Props = {
  urls: string[];
  index: number;
  onIndexChange: (index: number) => void;
  onClose: () => void;
};

/** Full-screen viewer for a feed item's photos, with keyboard + tap navigation. */
export function FeedImageLightbox({
  urls,
  index,
  onIndexChange,
  onClose,
}: Props) {
  const count = urls.length;
  const go = useCallback(
    (delta: number) => onIndexChange((index + delta + count) % count),
    [index, count, onIndexChange],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowRight") go(1);
      else if (e.key === "ArrowLeft") go(-1);
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [go, onClose]);

  return createPortal(
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Photo viewer"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />

      <button
        type="button"
        onClick={onClose}
        aria-label="Close"
        className="absolute right-4 top-4 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-2xl text-white transition-colors hover:bg-white/20"
      >
        ×
      </button>

      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={urls[index]}
        alt={`Photo ${index + 1} of ${count}`}
        onClick={(e) => e.stopPropagation()}
        className="relative max-h-[90vh] max-w-[92vw] rounded-[12px] object-contain"
      />

      {count > 1 ? (
        <>
          <button
            type="button"
            aria-label="Previous photo"
            onClick={(e) => {
              e.stopPropagation();
              go(-1);
            }}
            className="absolute left-3 z-10 flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-3xl text-white transition-colors hover:bg-white/20"
          >
            ‹
          </button>
          <button
            type="button"
            aria-label="Next photo"
            onClick={(e) => {
              e.stopPropagation();
              go(1);
            }}
            className="absolute right-3 z-10 flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-3xl text-white transition-colors hover:bg-white/20"
          >
            ›
          </button>
          <span className="absolute bottom-5 z-10 rounded-full bg-white/10 px-3 py-1 text-sm text-white">
            {index + 1} / {count}
          </span>
        </>
      ) : null}
    </div>,
    document.body,
  );
}
