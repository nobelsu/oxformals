"use client";

import type { ReactNode } from "react";

type Props = {
  children: ReactNode;
  onDismiss: () => void;
  dismissLabel: string;
};

/** Profile-style removable pill (interests, group members). */
export function DismissibleChip({ children, onDismiss, dismissLabel }: Props) {
  return (
    <span className="inline-flex max-w-full min-h-9 items-center gap-2 rounded-full border border-[var(--ink)] bg-[var(--paper)] px-3.5 py-1 text-sm text-[var(--ink)]">
      <span className="truncate">{children}</span>
      <button
        type="button"
        onClick={onDismiss}
        className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[var(--ink-muted)] transition-colors hover:bg-[var(--ink)] hover:text-[var(--bg)]"
        aria-label={dismissLabel}
      >
        ×
      </button>
    </span>
  );
}
