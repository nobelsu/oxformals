"use client";

import Link from "next/link";
import type { ReactNode } from "react";

function greetingWord(): string {
  const h = new Date().getHours();
  if (h < 12) return "Morning";
  if (h < 18) return "Afternoon";
  return "Evening";
}

function Chip({
  href,
  children,
  badge,
  solid,
}: {
  href: string;
  children: ReactNode;
  badge?: number;
  solid?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border-[1.5px] px-4 py-2 text-[0.86rem] font-medium transition-colors ${
        solid
          ? "border-[var(--ink)] bg-[var(--ink)] text-[var(--bg)] hover:bg-[color-mix(in_srgb,var(--ink)_88%,var(--accent))]"
          : "border-[var(--ink)] bg-[var(--paper)] text-[var(--ink)] hover:bg-[color-mix(in_srgb,var(--ink)_5%,transparent)]"
      }`}
    >
      {children}
      {badge ? (
        <span className="grid h-[18px] min-w-[18px] place-items-center rounded-full bg-[var(--accent)] px-1.5 text-[0.68rem] font-bold text-[var(--accent-ink)]">
          {badge}
        </span>
      ) : null}
    </Link>
  );
}

/**
 * Feed header — a greeting plus quick-action chips that are the entrypoints
 * into "Your formals" (the old Activity hub, now reached from the feed).
 */
export function FeedHeader({
  firstName,
  requestCount,
  rateCount,
}: {
  firstName: string;
  requestCount: number;
  rateCount: number;
}) {
  return (
    <div className="flex flex-col gap-3">
      <p className="text-[1.05rem]">
        <span className="font-semibold">
          {greetingWord()}, {firstName}
        </span>{" "}
        <span className="text-[var(--ink-muted)]">— quick things:</span>
      </p>
      <div className="flex flex-wrap gap-2">
        <Chip href="/?tab=requests&openList=1" solid>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" className="h-[15px] w-[15px]" aria-hidden>
            <path d="M12 5v14M5 12h14" />
          </svg>
          List a formal
        </Chip>
        <Chip href="/?tab=requests&section=overview" badge={requestCount || undefined}>
          Requests
        </Chip>
        <Chip href="/?tab=requests&section=attended" badge={rateCount || undefined}>
          Rate a formal
        </Chip>
        <Chip href="/?tab=requests&section=listings">Your formals</Chip>
      </div>
    </div>
  );
}
