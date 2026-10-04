"use client";

import { ShallowLink } from "@/components/ui/ShallowLink";

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

/** Greeting, plus "List a formal" (`?openList=1` opens the form over the feed). */
export function FeedHeader({ firstName }: { firstName: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <h1 className="text-[1.5rem] font-semibold leading-tight">
        <span className="font-display font-normal">{greetingWord()},</span> {firstName}
      </h1>
      <div className="flex shrink-0 items-center gap-2">
        <ShallowLink
          href="/?openList=1"
          scroll={false}
          data-onboarding="list"
          aria-label="List a formal"
          className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border-[1.5px] border-[var(--ink)] bg-[var(--ink)] px-3 py-2 text-[0.84rem] font-medium text-[var(--bg)] transition-colors hover:bg-[color-mix(in_srgb,var(--ink)_88%,var(--accent))] sm:px-4"
        >
          <PlusIcon />
          <span className="hidden sm:inline">List a formal</span>
        </ShallowLink>
      </div>
    </div>
  );
}
