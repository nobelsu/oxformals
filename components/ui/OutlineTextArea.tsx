"use client";

import type { TextareaHTMLAttributes, ReactNode } from "react";

type Props = Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, "className"> & {
  label?: string;
  className?: string;
  textareaClassName?: string;
  hint?: ReactNode;
};

const TEXTAREA_CLS =
  "w-full min-w-0 resize-y rounded-lg border-[2px] border-[var(--ink)] bg-[var(--bg)] px-3 py-2 text-sm text-[var(--ink)] placeholder:text-[var(--ink-soft)] focus:outline-none focus:border-[var(--accent-hover)]";

export function OutlineTextArea({
  label,
  className = "",
  textareaClassName = "",
  hint,
  ...rest
}: Props) {
  return (
    <label className={`flex flex-col gap-2 ${className}`.trim()}>
      {label ? (
        <span className="text-sm text-[var(--ink-muted)]">{label}</span>
      ) : null}
      <textarea className={`${TEXTAREA_CLS} ${textareaClassName}`.trim()} {...rest} />
      {hint ? (
        <span className="text-sm text-[var(--ink-soft)]">{hint}</span>
      ) : null}
    </label>
  );
}
