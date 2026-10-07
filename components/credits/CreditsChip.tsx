"use client";

import Link from "next/link";
import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Modal } from "@/components/ui/Modal";

export function SpoonIcon({ className = "h-[14px] w-[14px]" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <ellipse cx="12" cy="7.5" rx="4" ry="5" />
      <path d="M12 12.5V21" />
    </svg>
  );
}

/** "2 credits" chip (just "2" when compact) that opens how credits work. */
export function CreditsChip({ compact = false }: { compact?: boolean }) {
  const credits = useQuery(api.credits.getMyCredits, {});
  const [open, setOpen] = useState(false);
  if (!credits) return null;
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`${credits.balance} spoon${credits.balance === 1 ? "" : "s"}`}
        className={`inline-flex shrink-0 cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-full border-[1.5px] border-[var(--ink)] bg-[var(--accent-wash)] py-2 text-[0.84rem] font-medium text-[var(--accent-wash-ink)] transition-colors hover:bg-[color-mix(in_srgb,var(--accent-wash)_80%,var(--accent))] ${compact ? "px-3" : "px-4"}`}
      >
        <SpoonIcon />
        {compact
          ? credits.balance
          : `${credits.balance} spoon${credits.balance === 1 ? "" : "s"}`}
      </button>
      <CreditsInfoModal open={open} onClose={() => setOpen(false)} credits={credits} />
    </>
  );
}

export function CreditsInfoModal({
  open,
  onClose,
  credits,
}: {
  open: boolean;
  onClose: () => void;
  credits: { balance: number; spending: number; earning: number };
}) {
  return (
    <Modal open={open} onClose={onClose} title="Spoons" panelClassName="max-w-md">
      <div className="flex items-baseline gap-2">
        <span className="font-display text-5xl leading-none">{credits.balance}</span>
        <span className="text-[var(--ink-muted)]">
          spoon{credits.balance === 1 ? "" : "s"} to use
        </span>
      </div>
      {credits.spending > 0 || credits.earning > 0 ? (
        <ul className="mt-3 flex flex-col gap-1 text-sm text-[var(--ink-muted)]">
          {credits.spending > 0 ? (
            <li>
              {credits.spending} held for {credits.spending === 1 ? "a formal" : "formals"} you&apos;re going to
            </li>
          ) : null}
          {credits.earning > 0 ? (
            <li>
              {credits.earning} coming, 24 hours after your formal
            </li>
          ) : null}
        </ul>
      ) : null}

      <ol className="mt-5 flex flex-col gap-3 text-sm">
        {[
          ["Host a guest", "You earn their spoon 24 hours after the formal."],
          ["Use it anywhere", "One spoon, one seat, any college."],
          ["Keep it", "You start with one. They never expire."],
        ].map(([title, body], i) => (
          <li key={title} className="flex gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 border-[var(--ink)] text-xs font-bold">
              {i + 1}
            </span>
            <span>
              <span className="font-bold">{title}.</span>{" "}
              <span className="text-[var(--ink-muted)]">{body}</span>
            </span>
          </li>
        ))}
      </ol>

      <div className="mt-6 flex justify-end">
        <Link
          href="/?openList=1"
          onClick={onClose}
          className="rounded-full bg-[var(--accent)] px-5 py-2 text-sm text-[var(--accent-ink)] hover:bg-[var(--accent-hover)]"
        >
          List a formal
        </Link>
      </div>
    </Modal>
  );
}
