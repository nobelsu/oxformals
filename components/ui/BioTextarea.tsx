"use client";

import { MAX_BIO_LENGTH } from "@/convex/bioLimits";
import type { SaveBioResult } from "@/lib/auth/types";

type BioFailure = Extract<SaveBioResult, { ok: false }>["reason"];

/** What to show when saveBio refuses a bio. */
export const BIO_ERRORS: Record<BioFailure, string> = {
  tooLong: `Bios can be up to ${MAX_BIO_LENGTH} characters.`,
  flagged: "That bio can't be posted. Try rewording it.",
  unavailable: "Couldn't check your bio. Try again.",
};

type Props = {
  id?: string;
  value: string;
  onChange: (next: string) => void;
  className?: string;
  disabled?: boolean;
  /** Hide the built-in counter when the caller places <BioCounter> itself. */
  hideCounter?: boolean;
};

/** "n / 150", red once over the limit. */
export function BioCounter({ value }: { value: string }) {
  const length = value.trim().length;
  return (
    <span
      className={`text-xs ${
        length > MAX_BIO_LENGTH
          ? "text-[var(--danger)]"
          : "text-[var(--ink-soft)]"
      }`}
      aria-live="polite"
    >
      {length} / {MAX_BIO_LENGTH}
    </span>
  );
}

/** Free-form bio input with a live "n / 150" counter. */
export function BioTextarea({
  id,
  value,
  onChange,
  className = "",
  disabled,
  hideCounter,
}: Props) {
  return (
    <div className="flex flex-col gap-1">
      <textarea
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={3}
        disabled={disabled}
        placeholder="What you're into, in a line or two."
        className={`resize-none ${className}`}
      />
      {hideCounter ? null : (
        <span className="self-end">
          <BioCounter value={value} />
        </span>
      )}
    </div>
  );
}
