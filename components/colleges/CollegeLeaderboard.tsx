"use client";

import Link from "next/link";
import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import {
  PodiumRankBadge,
  PodiumRankIcon,
  PodiumStep,
  podiumRankVariant,
  podiumWinnerEmphasis,
  podiumWinnerScore,
  podiumWinnerSurface,
} from "@/components/colleges/PodiumRankArt";
import { formatRatingAverage } from "@/components/colleges/StarRating";
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
  size: "podium-first" | "podium-other" | "compact";
}) {
  const scoreClass =
    size === "podium-first"
      ? `font-display text-3xl ${podiumWinnerScore}`
      : size === "podium-other"
        ? "font-display text-2xl text-[var(--accent)]"
        : "font-display text-sm text-[var(--accent)]";
  const unitClass =
    size === "compact"
      ? "text-xs text-[var(--ink-soft)]"
      : "text-sm text-[var(--ink-soft)]";

  if (entry.average !== null) {
    return (
      <span className="shrink-0 text-right">
        <span className={scoreClass}>{formatRatingAverage(entry.average)}</span>
        <span className={unitClass}> / 5</span>
      </span>
    );
  }

  return <span className="text-sm text-[var(--ink-soft)]">—</span>;
}

function PodiumCard({
  entry,
  variant,
}: {
  entry: LeaderboardEntry;
  variant: "first" | "other";
}) {
  const rank = entry.rank! as 1 | 2 | 3;
  const isFirst = variant === "first";
  const rankVariant = podiumRankVariant(rank);

  const liOrderClass = isFirst
    ? "order-first md:order-2 md:col-span-1 md:self-end"
    : rank === 2
      ? "md:order-1 md:col-span-1 md:self-end"
      : "md:order-3 md:col-span-1 md:self-end";

  const cardSurface = isFirst
    ? podiumWinnerSurface
    : rank === 2
      ? "bg-[var(--accent)]/12"
      : "bg-[var(--accent)]/8";

  return (
    <li className={`flex flex-col items-stretch ${liOrderClass}`}>
      <Link
        href={`/college/${collegeToSlug(entry.college)}`}
        className={`group relative block outline-none ${sketchCardBlockyHover} ${
          isFirst ? "md:z-10" : ""
        }`}
      >
        <SketchCard
          seed={seedFrom(entry.college)}
          roughness={isFirst ? 1.8 : 2.2}
          className={`relative flex flex-col gap-3 px-5 py-5 ${cardSurface}`}
        >
          <div className="flex items-center gap-2">
            <PodiumRankIcon
              variant={rankVariant}
              className={isFirst ? podiumWinnerEmphasis : ""}
            />
            <PodiumRankBadge rank={rank} />
          </div>
          <div className="min-w-0">
            <span
              className={`font-display uppercase tracking-wide group-hover:underline ${
                isFirst
                  ? `text-3xl leading-tight ${podiumWinnerEmphasis}`
                  : "text-2xl leading-tight"
              }`}
            >
              {entry.college}
            </span>
            <p className="mt-2 text-sm text-[var(--ink-muted)]">
              {formatAttendanceSubtitle(
                entry.attendanceCount,
                entry.completedFormalCount,
                entry.reviewCount,
              )}
            </p>
          </div>
          <div className="border-t border-[var(--ink)]/10 pt-3">
            <LeaderboardScore
              entry={entry}
              size={isFirst ? "podium-first" : "podium-other"}
            />
          </div>
        </SketchCard>
      </Link>
      <PodiumStep rank={rank} college={entry.college} />
    </li>
  );
}

function LeaderboardPodium({ entries }: { entries: LeaderboardEntry[] }) {
  const byRank = new Map(entries.map((e) => [e.rank, e]));

  return (
    <section aria-label="Top 3 colleges">
      <ol className="flex flex-col gap-3 md:grid md:grid-cols-3 md:items-end md:gap-4">
        {[1, 2, 3].map((rank) => {
          const entry = byRank.get(rank);
          if (!entry) return null;
          return (
            <PodiumCard
              key={entry.college}
              entry={entry}
              variant={rank === 1 ? "first" : "other"}
            />
          );
        })}
      </ol>
    </section>
  );
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
            className={`rounded-full border-[2px] px-4 py-1.5 text-sm transition-colors ${
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
            <LeaderboardPodium entries={topThree} />
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
