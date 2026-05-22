"use client";

import Link from "next/link";
import { StarRating } from "@/components/colleges/StarRating";
import { SketchCard } from "@/components/ui/SketchCard";
import { COLLEGE_REVIEW_CATEGORIES } from "@/lib/data/collegeReviews";
import type { CollegeReviewPublic } from "@/lib/data/collegeReviews";
import { collegeToSlug } from "@/lib/data/collegeSlug";
import { formatListingDate } from "@/lib/data/format";

type Props = {
  review: CollegeReviewPublic;
  /** On profile pages, show the college reviewed instead of the author. */
  variant?: "default" | "profile";
};

export function CollegeReviewCard({ review, variant = "default" }: Props) {
  return (
    <SketchCard className="p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        {variant === "profile" ? (
          <Link
            href={`/college/${collegeToSlug(review.college)}`}
            className="font-display text-lg uppercase tracking-wide hover:underline"
          >
            {review.college}
          </Link>
        ) : review.author ? (
          <Link
            href={`/profile/${review.author.userId}`}
            className="text-sm hover:underline"
          >
            {review.author.name}
            {review.author.college ? ` · ${review.author.college}` : ""}
          </Link>
        ) : (
          <span className="text-sm text-[var(--ink-soft)]">Anonymous</span>
        )}
        <p className="text-sm text-[var(--ink-muted)]">
          {formatListingDate(review.formalDateTime)}
        </p>
      </div>
      <div className="mt-3 flex flex-col gap-2">
        {COLLEGE_REVIEW_CATEGORIES.map((cat) => (
          <StarRating
            key={cat.key}
            label={cat.label}
            value={review.ratings[cat.key]}
            size="sm"
          />
        ))}
      </div>
      {review.comment ? (
        <p className="mt-3 text-sm italic text-[var(--ink-muted)]">
          &ldquo;{review.comment}&rdquo;
        </p>
      ) : null}
    </SketchCard>
  );
}
