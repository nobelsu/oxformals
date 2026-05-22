"use client";

import { CollegeLeaderboard } from "@/components/colleges/CollegeLeaderboard";

export function RankingsTab() {
  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="font-display text-4xl uppercase tracking-wide">
          Rankings
        </h1>
        <p className="mt-2 text-[var(--ink-muted)]">
          The unofficial formal league table — scored by guests. May the best
          hall win.
        </p>
      </div>
      <CollegeLeaderboard />
    </div>
  );
}
