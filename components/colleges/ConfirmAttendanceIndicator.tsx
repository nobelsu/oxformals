"use client";

import { CheckIcon } from "@/components/ui/icons";

type Props = {
  className?: string;
};

/** Cue that a past formal needs attendance confirmation before rating. */
export function ConfirmAttendanceIndicator({ className }: Props) {
  return (
    <span
      aria-hidden
      className={[
        "inline-flex shrink-0 items-center gap-1.5 text-xs font-medium text-[var(--accent-hover)]",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <span
        className="flex h-4 w-4 items-center justify-center rounded-full border-[2px] border-current text-[0.6rem] font-bold leading-none"
        aria-hidden
      >
        <CheckIcon />
      </span>
      <span>Confirm attendance</span>
    </span>
  );
}
