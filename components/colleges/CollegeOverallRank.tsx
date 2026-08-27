"use client";

import Link from "next/link";
import {
  MountainRankIcon,
  RankBadge,
  rankMountainVariant,
  rankSummitEmphasis,
  rankSummitMuted,
  rankSummitSurface,
} from "@/components/colleges/RankMountainArt";

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
    const mountainRank = rank as 1 | 2 | 3;
    const isSummit = rank === 1;

    return (
      <div
        className={`relative mt-4 overflow-hidden rounded-[20px] px-4 py-3 ${
          isSummit
            ? `${rankSummitSurface} border-[2px] border-[var(--accent)]`
            : `border-[2px] ${
                rank === 3
                  ? "border-[var(--ink)] bg-[var(--accent)]/8"
                  : "border-[var(--ink)] bg-[var(--accent)]/12"
              }`
        }`}
      >
        <div className="relative flex flex-wrap items-center gap-3">
          <MountainRankIcon
            variant={rankMountainVariant(mountainRank)}
            className={isSummit ? rankSummitEmphasis : ""}
          />
          <div className="flex min-w-0 flex-1 flex-col gap-0.5 sm:flex-row sm:items-center sm:gap-3">
            <RankBadge rank={mountainRank} onSummitBg={isSummit} />
            <p
              className={`text-sm ${isSummit ? rankSummitMuted : "text-[var(--ink-muted)]"}`}
            >
              {isSummit
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
          href="/?tab=colleges"
          className="underline underline-offset-2 transition-colors hover:text-[var(--ink)]"
        >
          all colleges
        </Link>
      </span>
    </p>
  );
}
