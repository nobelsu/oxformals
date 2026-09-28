"use client";

import { MAX_BIO_LENGTH } from "@/convex/bioLimits";
import type { SaveBioResult } from "@/lib/auth/types";

type BioFailure = Extract<SaveBioResult, { ok: false }>["reason"];

/** What to show when saveBio refuses a bio. */
export const BIO_ERRORS: Record<BioFailure, string> = {
  tooLong: `Bios can be up to ${MAX_BIO_LENGTH} characters.`,
  flagged: "That bio can't be posted. Please edit it.",
  unavailable: "Couldn't check your bio. Try again in a moment.",
};

type Props = {
  id?: string;
  value: string;
  onChange: (next: string) => void;
  className?: string;
  disabled?: boolean;
};

/** Free-form bio input with a live "n / 150" counter. */
export function BioTextarea({
  id,
  value,
  onChange,
  className = "",
  disabled,
}: Props) {
  const length = value.trim().length;
  return (
    <div className="flex flex-col gap-1">
      <textarea
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={3}
        disabled={disabled}
        placeholder="A line or two about you: what you study, what you're into, why you love formals."
        className={`resize-none ${className}`}
      />
      <span
        className={`self-end text-xs ${
          length > MAX_BIO_LENGTH
            ? "text-[var(--danger)]"
            : "text-[var(--ink-soft)]"
        }`}
        aria-live="polite"
      >
        {length} / {MAX_BIO_LENGTH}
      </span>
    </div>
  );
}
