"use client";

import Link from "next/link";
import { SketchCard } from "@/components/ui/SketchCard";

export default function NotFound() {
  return (
    <main className="flex flex-1 items-center justify-center px-4 py-16">
      <SketchCard className="max-w-sm text-center" seed={404}>
        <h1 className="text-7xl font-bold tracking-tight text-[var(--ink)]">
          404
        </h1>
        <p className="mt-3 text-lg text-[var(--ink-muted)]">
          This page wandered off&hellip;
        </p>
        <Link
          href="/"
          className="mt-6 inline-block rounded-full border-[2px] border-[var(--ink)] px-6 py-2 text-sm tracking-[0.15em] uppercase text-[var(--ink)] transition-colors hover:bg-[var(--accent)]/30"
        >
          Back to home
        </Link>
      </SketchCard>
    </main>
  );
}
