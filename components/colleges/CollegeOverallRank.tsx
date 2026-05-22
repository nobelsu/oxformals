"use client";

import Link from "next/link";
import {
  PodiumRankBadge,
  PodiumRankIcon,
  podiumRankVariant,
  podiumWinnerEmphasis,
  podiumWinnerSurface,
} from "@/components/colleges/PodiumRankArt";

function ordinal(n: number): string {
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 13) return `${n}th`;
  switch (n % 10) {
    case 1:
      return `${n}st`;
    case 2:
      return `${n}nd`;
    case 3:
      return `${n}rd`;
    default:
      return `${n}th`;
  }
}

type Props = {
  rank: number | null | undefined;
};

export function CollegeOverallRank({ rank }: Props) {
  if (rank === undefined) return null;

  if (rank === null) {
    return (
      <p className="mt-3 text-sm text-[var(--ink-soft)]">
        Not on the league table yet — no reviews or swap activity.
      </p>
    );
  }

  if (rank <= 3) {
    const podiumRank = rank as 1 | 2 | 3;
    const isFirst = rank === 1;

    return (
      <div
        className={`relative mt-4 overflow-hidden rounded-[20px] px-4 py-3 ${
          isFirst
            ? podiumWinnerSurface
            : `border-[2px] ${
                rank === 2
                  ? "border-[var(--ink)] bg-[var(--accent)]/12"
                  : "border-[var(--ink)] bg-[var(--accent)]/8"
              }`
        }`}
      >
        <div className="relative flex flex-wrap items-center gap-3">
          <PodiumRankIcon
            variant={podiumRankVariant(podiumRank)}
            className={isFirst ? podiumWinnerEmphasis : ""}
          />
          <div className="flex min-w-0 flex-1 flex-col gap-0.5 sm:flex-row sm:items-center sm:gap-3">
            <PodiumRankBadge rank={podiumRank} />
            <p className="text-sm text-[var(--ink-muted)]">
              {isFirst
                ? "Top of the overall league table"
                : `${ordinal(rank)} on the overall league table`}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <p className="mt-3 flex flex-wrap items-baseline gap-x-2 gap-y-1">
      <span className="font-display text-2xl text-[var(--accent)]">
        #{rank}
      </span>
      <span className="text-sm text-[var(--ink-muted)]">
        overall ·{" "}
        <Link
          href="/?tab=rankings"
          className="underline underline-offset-2 transition-colors hover:text-[var(--ink)]"
        >
          league table
        </Link>
      </span>
    </p>
  );
}
