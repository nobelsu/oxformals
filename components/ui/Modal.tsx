"use client";

import { useEffect, type ReactNode } from "react";
import { SketchCard } from "./SketchCard";

type Props = {
  open: boolean;
  onClose: () => void;
  title?: string;
  /** Merged onto the inner SketchCard (e.g. max width / scroll). */
  panelClassName?: string;
  children: ReactNode;
};

export function Modal({
  open,
  onClose,
  title,
  panelClassName = "",
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
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
    >
      <div
        className="absolute inset-0 bg-[var(--ink)]/30 backdrop-blur-sm"
        onClick={onClose}
      />
      <SketchCard
        seed={2}
        className={["relative w-full max-w-md overflow-y-auto p-6", panelClassName]
          .filter(Boolean)
          .join(" ")}
      >
        {title && (
          <h2 className="mb-4 font-display text-3xl uppercase tracking-wide">{title}</h2>
        )}
        {children}
      </SketchCard>
    </div>
  );
}
