"use client";

import { createPortal } from "react-dom";
import { useEffect, type ReactNode } from "react";
import { useIsClient } from "@/lib/hooks/useIsClient";

type Props = {
  open: boolean;
  onClose: () => void;
  title?: string;
  /** Which edge the panel slides in from. */
  side?: "left" | "right";
  children: ReactNode;
};

export function Drawer({
  open,
  onClose,
  title,
  side = "left",
  children,
}: Props) {
  // The portal target (document.body) only exists in the browser.
  const isClient = useIsClient();
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

  if (!open || !isClient) return null;

  const panelPosition =
    side === "left"
      ? "left-0 border-r-[2.5px]"
      : "right-0 border-l-[2.5px]";

  // Render on <body> so a parent with a transform/filter (e.g. the blurred
  // nav) can't trap this full-screen layer inside its own box.
  return createPortal(
    <div
      className="fixed inset-0 z-[100]"
      role="dialog"
      aria-modal="true"
      aria-label={title ?? "Navigation menu"}
    >
      <div
        className="absolute inset-0 bg-[var(--ink)]/30 backdrop-blur-sm"
        onClick={onClose}
      />
      <aside
        className={`absolute top-0 bottom-0 flex w-[min(18rem,85vw)] flex-col border-[var(--ink)] bg-[var(--bg)] shadow-lg ${panelPosition}`}
      >
        {title ? (
          <div className="shrink-0 border-b-[2px] border-[var(--ink)]/15 px-5 py-4">
            <h2 className="font-display text-2xl uppercase tracking-[0.15em] text-[var(--ink)]">
              {title}
            </h2>
          </div>
        ) : null}
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-5">
          {children}
        </div>
      </aside>
    </div>,
    document.body,
  );
}
