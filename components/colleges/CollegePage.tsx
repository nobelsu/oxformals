"use client";

import Link from "next/link";
import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { CollegeOverallRank } from "@/components/colleges/CollegeOverallRank";
import { CollegeReviewCard } from "@/components/colleges/CollegeReviewCard";
import { StarRating } from "@/components/colleges/StarRating";
import { SketchCard } from "@/components/ui/SketchCard";
import {
  COLLEGE_REVIEW_CATEGORIES,
  type CollegeReviewSort,
} from "@/lib/data/collegeReviews";

type Props = {
  college: string;
};

function formatStatsLine(
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
      `${completedFormalCount} completed ${completedFormalCount === 1 ? "formal" : "formals"}`,
    );
  }
  parts.push(`${reviewCount} ${reviewCount === 1 ? "review" : "reviews"}`);
  return parts.join(" · ");
}

export function CollegePage({ college }: Props) {
  const [sort, setSort] = useState<CollegeReviewSort>("top");
  const aggregates = useQuery(api.collegeReviews.getCollegeAggregates, {
    college,
  });
  const reviews = useQuery(api.collegeReviews.listReviewsForCollege, {
    college,
    sort,
    limit: 30,
  });

  const averages = aggregates?.averages;

  return (
    <div className="flex flex-col gap-8">
      <div>
        <Link
          href="/?tab=rankings"
          className="text-sm text-[var(--ink-muted)] transition-colors hover:text-[var(--ink)]"
        >
          ← Rankings
        </Link>
        <h1 className="mt-3 font-display text-4xl uppercase tracking-wide">
          {college}
        </h1>
        {aggregates !== undefined ? (
          <>
            <p className="mt-1 text-[var(--ink-muted)]">
              {formatStatsLine(
                aggregates.attendanceCount,
                aggregates.completedFormalCount,
                aggregates.reviewCount,
              )}
            </p>
            <CollegeOverallRank rank={aggregates.rank} />
          </>
        ) : null}
      </div>

      {averages ? (
        <SketchCard className="p-6">
          <h2 className="font-display text-xl uppercase tracking-wide">
            Average ratings
          </h2>
          <div className="mt-4 flex flex-col gap-3">
            {COLLEGE_REVIEW_CATEGORIES.map((cat) => (
              <StarRating
                key={cat.key}
                label={cat.label}
                value={averages[cat.key]}
                size="sm"
              />
            ))}
          </div>
        </SketchCard>
      ) : aggregates !== undefined ? (
        <SketchCard className="p-6 text-[var(--ink-muted)]">
          No reviews yet. Be the first after attending a formal here.
        </SketchCard>
      ) : null}

      <section>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display text-2xl uppercase tracking-wide">Reviews</h2>
          <div className="flex gap-2">
            {(["top", "recent"] as const).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setSort(s)}
                className={`rounded-full border-[2px] px-3 py-1 text-sm ${
                  sort === s
                    ? "border-[var(--ink)] bg-[var(--ink)] text-[var(--bg)]"
                    : "border-[var(--ink)]"
                }`}
              >
                {s === "top" ? "Top rated" : "Most recent"}
              </button>
            ))}
          </div>
        </div>

        {reviews === undefined ? (
          <p className="mt-4 text-[var(--ink-muted)]">Loading reviews…</p>
        ) : reviews.length === 0 ? (
          <p className="mt-4 text-[var(--ink-muted)]">No reviews yet.</p>
        ) : (
          <div className="mt-4 flex flex-col gap-4">
            {reviews.map((review) => (
              <CollegeReviewCard key={review.id} review={review} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
