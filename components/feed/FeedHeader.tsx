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
  solid,
}: {
  href: string;
  children: ReactNode;
  solid?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border-[1.5px] px-4 py-2 text-[0.84rem] font-medium transition-colors ${
        solid
          ? "border-[var(--ink)] bg-[var(--ink)] text-[var(--bg)] hover:bg-[color-mix(in_srgb,var(--ink)_88%,var(--accent))]"
          : "border-[var(--ink)] bg-[var(--paper)] text-[var(--ink)] hover:bg-[color-mix(in_srgb,var(--ink)_5%,transparent)]"
      }`}
    >
      {children}
    </Link>
  );
}

/**
 * Feed header — a greeting, a one-line summary of what's going on (your next
 * formal + anything needing you), and quick-action chips into "Your formals".
 */
export function FeedHeader({
  firstName,
  nextFormalCollege,
  nextFormalWhen,
  attentionCount,
}: {
  firstName: string;
  nextFormalCollege?: string;
  nextFormalWhen?: string;
  attentionCount: number;
}) {
  const clauses: string[] = [];
  if (nextFormalCollege && nextFormalWhen) {
    clauses.push(
      `You’re going to ${nextFormalCollege} ${nextFormalWhen.toLowerCase()}`,
    );
  }
  if (attentionCount > 0) {
    clauses.push(
      `${attentionCount} thing${attentionCount === 1 ? "" : "s"} need${attentionCount === 1 ? "s" : ""} you`,
    );
  }
  const subline =
    clauses.length > 0
      ? `${clauses.join(" · ")}.`
      : "Here’s what’s happening around Oxford.";

  return (
    <div className="flex flex-col gap-3">
      <div>
        <h1 className="text-[1.5rem] font-semibold leading-tight">
          <span className="font-display font-normal">{greetingWord()},</span>{" "}
          {firstName}
        </h1>
        <p className="mt-0.5 text-[0.92rem] text-[var(--ink-muted)]">{subline}</p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Chip href="/?tab=requests&openList=1" solid>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" className="h-[14px] w-[14px]" aria-hidden>
            <path d="M12 5v14M5 12h14" />
          </svg>
          List a formal
        </Chip>
        <Chip href="/?tab=requests&section=listings">Your formals</Chip>
        <Chip href="/?tab=mine&edit=1">Wishlist</Chip>
      </div>
    </div>
  );
}
