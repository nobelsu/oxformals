"use client";

import { useEffect, type ReactNode } from "react";
import { SketchCard } from "./SketchCard";

type Props = {
  open: boolean;
  onClose: () => void;
  title?: string;
  /** Merged onto the inner SketchCard (e.g. max width / scroll). */
  panelClassName?: string;
  /**
   * When false, the body does not scroll and does not clip overflow — use for
   * panels with popovers (e.g. custom dropdowns) that must extend past the card.
   * Default true keeps max-height modals scrollable.
   */
  bodyScrollable?: boolean;
  children: ReactNode;
};

export function Modal({
  open,
  onClose,
  title,
  panelClassName = "",
  bodyScrollable = true,
  children,
}: Props) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto overscroll-contain p-4"
      role="dialog"
      aria-modal="true"
    >
      <div
        className="absolute inset-0 bg-[var(--ink)]/30 backdrop-blur-sm"
        onClick={onClose}
      />
      <SketchCard
        seed={2}
        className={["relative w-full min-w-0 max-w-md overflow-visible p-6", panelClassName]
          .filter(Boolean)
          .join(" ")}
      >
        {title && (
          <h2 className="mb-4 shrink-0 font-display text-3xl uppercase tracking-wide">{title}</h2>
        )}
        <div
          className={
            bodyScrollable
              ? "min-h-0 min-w-0 w-full flex-1 overflow-y-auto"
              : "min-h-min min-w-0 w-full shrink-0 overflow-visible"
          }
        >
          {children}
        </div>
      </SketchCard>
    </div>
  );
}
