"use client";

import Link from "next/link";
import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import {
  MountainRankIcon,
  MountainSilhouette,
  RankBadge,
  rankMountainVariant,
  rankSummitDivider,
  rankSummitEmphasis,
  rankSummitMuted,
  rankSummitScore,
  rankSummitStar,
  rankSummitSurface,
} from "@/components/colleges/RankMountainArt";
import { formatRatingAverage, StarIcon } from "@/components/colleges/StarRating";
import {
  SketchCard,
  seedFrom,
  sketchCardBlockyHover,
} from "@/components/ui/SketchCard";
import {
  LEADERBOARD_CATEGORIES,
  type CollegeReviewCategory,
  type LeaderboardEntry,
} from "@/lib/data/collegeReviews";
import { collegeToSlug } from "@/lib/data/collegeSlug";

function formatAttendanceSubtitle(
  attendanceCount: number,
  completedFormalCount: number,
  reviewCount: number,
): string {
  const parts: string[] = [];
  if (attendanceCount > 0) {
    parts.push(
      `${attendanceCount} ${attendanceCount === 1 ? "guest" : "guests"} attended`,
    );
  }
  if (completedFormalCount > 0) {
    parts.push(
      `${completedFormalCount} ${completedFormalCount === 1 ? "formal" : "formals"}`,
    );
  }
  if (reviewCount > 0) {
    parts.push(`${reviewCount} ${reviewCount === 1 ? "review" : "reviews"}`);
  }
  if (parts.length === 0) {
    return "No activity yet";
  }
  return parts.join(" · ");
}

function LeaderboardScore({
  entry,
  size,
}: {
  entry: LeaderboardEntry;
  size: "summit" | "ridge" | "foothill" | "compact";
}) {
  const scoreClass =
    size === "summit"
      ? `font-display text-3xl ${rankSummitScore}`
      : size === "ridge"
        ? "font-display text-2xl text-[var(--accent)]"
        : size === "foothill"
          ? "font-display text-xl text-[var(--accent)]"
          : "font-display text-sm text-[var(--accent)]";
  const starClass =
    size === "summit"
      ? "h-5 w-5"
      : size === "ridge"
        ? "h-4 w-4"
        : size === "foothill"
          ? "h-3.5 w-3.5"
          : "h-3.5 w-3.5";
  if (entry.average !== null) {
    const label = `${formatRatingAverage(entry.average)} stars`;
    return (
      <span
        className="inline-flex shrink-0 items-center gap-1"
        aria-label={label}
        title={label}
      >
        <span className={scoreClass}>{formatRatingAverage(entry.average)}</span>
        <StarIcon
          className={`${starClass} ${size === "summit" ? rankSummitStar : ""}`}
        />
      </span>
    );
  }

  return (
    <span
      className={`text-sm ${size === "summit" ? rankSummitMuted : "text-[var(--ink-soft)]"}`}
    >
      —
    </span>
  );
}

const ELEVATION_CLASS: Record<1 | 2 | 3, string> = {
  1: "order-first md:order-2 md:col-span-1 md:pb-10 md:-translate-y-1 md:scale-[1.02]",
  2: "md:order-1 md:col-span-1 md:pb-5",
  3: "md:order-3 md:col-span-1 md:pb-1",
};

function MountainRankCard({ entry }: { entry: LeaderboardEntry }) {
  const rank = entry.rank! as 1 | 2 | 3;
  const isSummit = rank === 1;
  const rankVariant = rankMountainVariant(rank);

  const cardSurface = isSummit
    ? rankSummitSurface
    : rank === 2
      ? "bg-[var(--accent)]/12"
      : "bg-[var(--accent)]/8";

  return (
    <li
      className={`group mountain-rank-item flex flex-col items-stretch ${ELEVATION_CLASS[rank]} ${
        isSummit ? "mountain-rank-item--summit" : ""
      }`}
    >
      <Link
        href={`/college/${collegeToSlug(entry.college)}`}
        className={`relative block outline-none ${sketchCardBlockyHover} ${
          isSummit ? "md:z-10" : ""
        }`}
      >
        <SketchCard
          seed={seedFrom(entry.college)}
          roughness={isSummit ? 1.8 : 2.2}
          className={`relative flex flex-col gap-3 px-5 py-5 ${cardSurface} ${
            isSummit ? "text-[var(--accent)]" : ""
          }`}
        >
          <div
            className={`flex flex-col gap-3 ${isSummit ? "text-[var(--tag-ink)]" : ""}`}
          >
          <div className="flex items-center gap-2">
            <MountainRankIcon
              variant={rankVariant}
              className={`mountain-rank-icon ${isSummit ? `h-11 w-11 ${rankSummitEmphasis}` : rank === 2 ? "h-10 w-10" : ""}`}
            />
            <RankBadge rank={rank} onSummitBg={isSummit} />
            {isSummit ? (
              <span className="ml-auto hidden font-display text-[10px] uppercase tracking-[0.2em] text-[var(--rank-summit-muted)] md:inline">
                Summit
              </span>
            ) : null}
          </div>
          <div className="min-w-0">
            <span
              className={`font-display uppercase tracking-wide group-hover:underline ${
                isSummit
                  ? `text-3xl leading-tight ${rankSummitEmphasis}`
                  : "text-2xl leading-tight"
              }`}
            >
              {entry.college}
            </span>
            <p
              className={`mt-2 text-sm ${isSummit ? rankSummitMuted : "text-[var(--ink-muted)]"}`}
            >
              {formatAttendanceSubtitle(
                entry.attendanceCount,
                entry.completedFormalCount,
                entry.reviewCount,
              )}
            </p>
          </div>
          <div
            className={`border-t pt-3 ${isSummit ? rankSummitDivider : "border-[var(--ink)]/10"}`}
          >
            <LeaderboardScore
              entry={entry}
              size={
                isSummit ? "summit" : rank === 2 ? "ridge" : "foothill"
              }
            />
          </div>
          </div>
        </SketchCard>
      </Link>
    </li>
  );
}

function mountainGridClass(count: number): string {
  if (count === 1) {
    return "grid-cols-1 mx-auto max-w-sm justify-items-center";
  }
  if (count === 2) {
    return "grid-cols-2 mx-auto max-w-2xl";
  }
  return "grid-cols-3";
}

function sortTopThree(entries: LeaderboardEntry[]): LeaderboardEntry[] {
  const byRank = new Map(entries.map((e) => [e.rank, e]));
  return ([1, 2, 3] as const)
    .map((rank) => byRank.get(rank))
    .filter((e): e is LeaderboardEntry => e !== undefined);
}

function LeaderboardCompactRow({ entry }: { entry: LeaderboardEntry }) {
  return (
    <li className="border-t border-[var(--ink)]/10 first:border-t-0">
      <Link
        href={`/college/${collegeToSlug(entry.college)}`}
        className="group flex items-center gap-3 px-3 py-2.5 outline-none transition-colors hover:bg-[var(--ink)]/5"
      >
        <span className="w-6 shrink-0 self-start pt-0.5 text-center text-sm text-[var(--ink-soft)]">
          {entry.rank ?? "—"}
        </span>
        <div className="min-w-0 flex-1">
          <span className="block truncate font-display text-sm uppercase tracking-wide group-hover:underline">
            {entry.college}
          </span>
          <p className="mt-0.5 truncate text-xs text-[var(--ink-muted)]">
            {formatAttendanceSubtitle(
              entry.attendanceCount,
              entry.completedFormalCount,
              entry.reviewCount,
            )}
          </p>
        </div>
        <LeaderboardScore entry={entry} size="compact" />
      </Link>
    </li>
  );
}

function LeaderboardMountain({ entries }: { entries: LeaderboardEntry[] }) {
  const sortedTopThree = sortTopThree(entries);

  return (
    <section aria-label="Top 3 colleges">
      <div className="md:hidden">
        <SketchCard
          seed={seedFrom("leaderboard-top3")}
          padded={false}
          contentGutter
        >
          <ol className="flex flex-col">
            {sortedTopThree.map((entry) => (
              <LeaderboardCompactRow key={entry.college} entry={entry} />
            ))}
          </ol>
        </SketchCard>
      </div>

      <div className="rankings-mountain relative hidden md:block">
        <ol
          className={`relative z-10 grid items-end gap-4 ${mountainGridClass(entries.length)}`}
        >
          {sortedTopThree.map((entry) => (
            <MountainRankCard key={entry.college} entry={entry} />
          ))}
        </ol>
        <MountainSilhouette />
      </div>
    </section>
  );
}

export function CollegeLeaderboard() {
  const [category, setCategory] = useState<CollegeReviewCategory>("overall");
  const entries = useQuery(api.collegeReviews.getLeaderboard, { category });

  const sorted = entries ?? [];
  const topThree = sorted.filter((e) => e.rank !== null && e.rank <= 3);
  const rest = sorted.filter((e) => e.rank === null || e.rank > 3);
  const compactStart = rest.find((e) => e.rank !== null)?.rank ?? undefined;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap gap-2">
        {LEADERBOARD_CATEGORIES.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setCategory(tab.key)}
            className={`cursor-pointer rounded-full border-[2px] px-4 py-1.5 text-sm transition-colors ${
              category === tab.key
                ? "border-[var(--ink)] bg-[var(--ink)] text-[var(--bg)]"
                : "border-[var(--ink)] text-[var(--ink)] hover:bg-[var(--ink)] hover:text-[var(--bg)]"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {entries === undefined ? (
        <p className="text-[var(--ink-muted)]">Loading rankings…</p>
      ) : (
        <div className="flex flex-col gap-6">
          {topThree.length > 0 ? (
            <LeaderboardMountain entries={topThree} />
          ) : null}

          {rest.length > 0 ? (
            <section aria-label="All colleges">
              {topThree.length > 0 ? (
                <h2 className="mb-2 text-sm uppercase tracking-wide text-[var(--ink-muted)]">
                  All colleges
                </h2>
              ) : null}
              <SketchCard seed={99} padded={false} contentGutter>
                <ol start={compactStart} className="flex flex-col">
                  {rest.map((entry) => (
                    <LeaderboardCompactRow key={entry.college} entry={entry} />
                  ))}
                </ol>
              </SketchCard>
            </section>
          ) : null}
        </div>
      )}
    </div>
  );
}
