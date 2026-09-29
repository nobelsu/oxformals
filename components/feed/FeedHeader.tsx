"use client";

import Link from "next/link";
import { CreditsChip } from "@/components/credits/CreditsChip";

function greetingWord(): string {
  const h = new Date().getHours();
  if (h < 12) return "Morning";
  if (h < 18) return "Afternoon";
  return "Evening";
}

const PlusIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" className="h-[14px] w-[14px]" aria-hidden>
    <path d="M12 5v14M5 12h14" />
  </svg>
);

/** Greeting, plus "List a formal" (and credits on phones, where there's no sidebar). */
export function FeedHeader({ firstName }: { firstName: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <h1 className="text-[1.5rem] font-semibold leading-tight">
        <span className="font-display font-normal">{greetingWord()},</span> {firstName}
      </h1>
      <div className="flex shrink-0 items-center gap-2">
        <span className="lg:hidden">
          <CreditsChip compact />
        </span>
        <Link
          href="/?tab=requests&openList=1"
          data-onboarding="list"
          aria-label="List a formal"
          className="inline-flex items-center gap-1.5 rounded-full border-[1.5px] border-[var(--ink)] bg-[var(--ink)] px-3 py-2 text-[0.84rem] font-medium text-[var(--bg)] transition-colors hover:bg-[color-mix(in_srgb,var(--ink)_88%,var(--accent))] sm:px-4"
        >
          <PlusIcon />
          <span className="hidden sm:inline">List a formal</span>
        </Link>
      </div>
    </div>
  );
}
